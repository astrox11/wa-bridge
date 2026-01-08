package manager

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
)

type SessionManager struct {
	Workers map[string]*Worker
	mu      sync.Mutex
}

func NewSessionManager() *SessionManager {
	return &SessionManager{
		Workers: make(map[string]*Worker),
	}
}

func (sm *SessionManager) GetWorker(phone string) (*Worker, bool) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	w, ok := sm.Workers[phone]
	return w, ok
}

func (sm *SessionManager) StartInstance(phone string, status string) error {
	sm.mu.Lock()

	w, exists := sm.Workers[phone]
	if exists && w.IsRunning {
		sm.mu.Unlock()
		return fmt.Errorf("instance for %s is already running", phone)
	}

	if !exists {
		w = &Worker{
			Phone:  phone,
			Status: status,
		}
		sm.Workers[phone] = w
	}
	sm.mu.Unlock()

	go sm.supervisor(w)

	return nil
}

func (sm *SessionManager) TogglePause(phone string, pause bool) error {
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	sm.mu.Unlock()

	if !ok {
		return fmt.Errorf("instance not found")
	}

	w.mu.Lock()
	if pause {
		w.Status = "paused"
		if w.Process != nil && w.Process.Process != nil {
			w.Process.Process.Kill()
		}
	} else {
		w.Status = "starting"
	}
	w.mu.Unlock()

	sm.SaveState()
	return nil
}

func (sm *SessionManager) SaveState() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	file, _ := os.Create("sessions.txt")
	defer file.Close()

	for phone, w := range sm.Workers {
		w.mu.RLock()
		fmt.Fprintf(file, "%s:%s\n", phone, w.Status)
		w.mu.RUnlock()
	}
}

func (sm *SessionManager) LoadFromDisk() {
	file, err := os.Open("sessions.txt")
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		parts := strings.Split(scanner.Text(), ":")
		if len(parts) == 2 {
			phone, status := parts[0], parts[1]
			// Auto-restart if it wasn't paused or logged out
			if status != "paused" && status != "logged_out" {
				sm.StartInstance(phone, "starting")
			} else {
				// Still put it in memory so the UI sees it as paused
				sm.mu.Lock()
				sm.Workers[phone] = &Worker{Phone: phone, Status: status, IsRunning: false}
				sm.mu.Unlock()
			}
		}
	}
}
