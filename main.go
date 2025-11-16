package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/fsnotify/fsnotify"
)

const (
	srcDir          = "./src"
	buildTargetDir  = "./src"
	debounceDelay   = 200 * time.Millisecond
	flushDelay      = 100 * time.Millisecond
	gracefulTimeout = 5 * time.Second
	restartCode     = 42
	shutdownCode    = 99
)

type stdinRouter struct {
	mu sync.Mutex
	w  io.WriteCloser
}

func (s *stdinRouter) swap(w io.WriteCloser) {
	s.mu.Lock()
	if s.w != nil {
		s.w.Close()
	}
	s.w = w
	s.mu.Unlock()
}

func (s *stdinRouter) close() {
	s.mu.Lock()
	if s.w != nil {
		s.w.Close()
	}
	s.w = nil
	s.mu.Unlock()
}

func (s *stdinRouter) write(b []byte) {
	s.mu.Lock()
	w := s.w
	s.mu.Unlock()
	if w != nil {
		_, _ = w.Write(b)
	}
}

func buildToTemp() (string, string, error) {
	tmp, err := os.CreateTemp("", "hotrun-*")
	if err != nil {
		return "", "", err
	}
	tmpPath := tmp.Name()
	_ = tmp.Close()
	cmd := exec.Command("go", "build", "-o", tmpPath, buildTargetDir)
	out, err := cmd.CombinedOutput()
	if err != nil {
		_ = os.Remove(tmpPath)
		return "", string(out), err
	}
	return tmpPath, string(out), nil
}

func startBinary(binPath string) (*exec.Cmd, io.WriteCloser, chan error, error) {
	cmd := exec.Command(binPath)
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, nil, nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, nil, nil, err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, nil, nil, err
	}

	if err := cmd.Start(); err != nil {
		_ = stdin.Close()
		return nil, nil, nil, err
	}

	go func() {
		sc := bufio.NewScanner(stdout)
		for sc.Scan() {
			fmt.Println(sc.Text())
		}
	}()
	go func() {
		sc := bufio.NewScanner(stderr)
		for sc.Scan() {
			fmt.Println(sc.Text())
		}
	}()

	exit := make(chan error, 1)
	go func() { exit <- cmd.Wait() }()

	return cmd, stdin, exit, nil
}

func stopChild(cmd *exec.Cmd) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	if pgid, err := syscall.Getpgid(cmd.Process.Pid); err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGINT)
	} else {
		_ = cmd.Process.Signal(syscall.SIGINT)
	}

	done := make(chan struct{})
	go func() { cmd.Wait(); close(done) }()

	select {
	case <-done:
	case <-time.After(gracefulTimeout):
		if pgid, err := syscall.Getpgid(cmd.Process.Pid); err == nil {
			_ = syscall.Kill(-pgid, syscall.SIGKILL)
		} else {
			_ = cmd.Process.Kill()
		}
	}
}

func watchDir(root string) (<-chan struct{}, func(), error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, nil, err
	}
	_ = filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err == nil && info.IsDir() {
			_ = w.Add(p)
		}
		return nil
	})
	out := make(chan struct{}, 1)
	quit := make(chan struct{})
	go func() {
		var pending bool
		var t *time.Timer
		reset := func() {
			if t == nil {
				t = time.NewTimer(debounceDelay)
			} else {
				if !t.Stop() {
					<-t.C
				}
				t.Reset(debounceDelay)
			}
		}
		for {
			select {
			case <-quit:
				_ = w.Close()
				return
			case e := <-w.Events:
				if filepath.Ext(e.Name) == ".go" || filepath.Base(e.Name) == "go.mod" || filepath.Base(e.Name) == "go.sum" {
					pending = true
					reset()
				}
				if e.Op&fsnotify.Create == fsnotify.Create {
					if info, err := os.Stat(e.Name); err == nil && info.IsDir() {
						_ = w.Add(e.Name)
					}
				}
			case <-func() <-chan time.Time {
				if t != nil {
					return t.C
				}
				x := make(chan time.Time)
				return x
			}():
				if pending {
					select {
					case out <- struct{}{}:
					default:
					}
					pending = false
				}
			}
		}
	}()
	return out, func() { close(quit) }, nil
}

func exitCodeFromErr(err error) int {
	if err == nil {
		return 0
	}
	if ee, ok := err.(*exec.ExitError); ok {
		if status, ok := ee.Sys().(syscall.WaitStatus); ok {
			return status.ExitStatus()
		}
		return ee.ExitCode()
	}
	return 1
}

func main() {
	events, stopWatch, err := watchDir(srcDir)
	if err != nil {
		fmt.Fprintln(os.Stderr, "watch error:", err)
		return
	}
	defer stopWatch()

	sigch := make(chan os.Signal, 1)
	signal.Notify(sigch, syscall.SIGINT, syscall.SIGTERM)

	rawIn := make(chan []byte, 256)
	go func() {
		r := bufio.NewReader(os.Stdin)
		for {
			b := make([]byte, 1024)
			n, err := r.Read(b)
			if n > 0 {
				c := make([]byte, n)
				copy(c, b[:n])
				rawIn <- c
			}
			if err != nil {
				close(rawIn)
				return
			}
		}
	}()

	bufIn := make(chan []byte, 256)
	go func() {
		var buf bytes.Buffer
		t := time.NewTicker(flushDelay)
		defer t.Stop()
		for {
			select {
			case b, ok := <-rawIn:
				if !ok {
					if buf.Len() > 0 {
						x := make([]byte, buf.Len())
						copy(x, buf.Bytes())
						bufIn <- x
					}
					close(bufIn)
					return
				}
				buf.Write(b)
			case <-t.C:
				if buf.Len() > 0 {
					x := make([]byte, buf.Len())
					copy(x, buf.Bytes())
					bufIn <- x
					buf.Reset()
				}
			}
		}
	}()

	var child *exec.Cmd
	var exit chan error
	var binPath string
	router := &stdinRouter{}

	cleanAndStart := func() {
		if binPath != "" {
			_ = os.Remove(binPath)
			binPath = ""
		}
		tmp, buildOut, err := buildToTemp()
		if err != nil {
			fmt.Fprintln(os.Stderr, "build failed (waiting):")
			fmt.Fprintln(os.Stderr, buildOut)
			return
		}
		binPath = tmp
		cmd, w, ex, err := startBinary(binPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, "start binary failed:", err)
			_ = os.Remove(binPath)
			binPath = ""
			return
		}
		child = cmd
		exit = ex
		router.swap(w)
	}

	cleanAndStart()

	go func() {
		for b := range bufIn {
			router.write(b)
		}
	}()

	for {
		select {
		case <-events:
			cleanAndStart()
		case err := <-exit:
			router.close()
			code := exitCodeFromErr(err)
			child = nil
			exit = nil
			if code == restartCode {
				cleanAndStart()
				continue
			}
			if code == shutdownCode {
				if binPath != "" {
					_ = os.Remove(binPath)
				}
				os.Exit(0)
			}
			if binPath != "" {
				_ = os.Remove(binPath)
			}
			// non-control exit: stop manager (you can change to restart on crash)
			os.Exit(0)
		case s := <-sigch:
			_ = s
			router.close()
			stopChild(child)
			if binPath != "" {
				_ = os.Remove(binPath)
			}
			return
		}
	}
}
