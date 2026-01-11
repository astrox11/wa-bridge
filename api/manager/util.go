package manager

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

type GoData struct {
	Tag     string         `json:"tag"`
	Payload map[string]any `json:"payload"`
}

func (sm *SessionManager) ExtractStreams(w *Worker, reader io.ReadCloser) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()

		if after, ok := strings.CutPrefix(line, "[GO_DATA]"); ok {
			var msg GoData
			if err := json.Unmarshal([]byte(after), &msg); err == nil {
				sm.EventStreamData(w, msg)
			}
		} else {
			fmt.Printf("[%s] %s\n", w.Phone, line)
		}
	}
}

func (sm *SessionManager) EventStreamData(w *Worker, data GoData) {
	w.mu.Lock()
	switch data.Tag {
	case "PAIRING_CODE":
		w.PairingCode = fmt.Sprintf("%v", data.Payload["code"])
	case "CONNECTION_UPDATE":
		newStatus := fmt.Sprintf("%v", data.Payload["status"])
		switch newStatus {
		case "connected":
			w.Status = "active"
			w.PairingCode = ""
		case "logged_out":
			w.Status = "logged_out"
		case "qr_code":
			// we are not handling qr codes currently
		default:
			w.Status = newStatus
		}
	}
	w.mu.Unlock()

	sm.SaveState(w)
}
