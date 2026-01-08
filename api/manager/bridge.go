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

func (sm *SessionManager) monitorLogs(w *Worker, reader io.ReadCloser) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()

		if after, ok := strings.CutPrefix(line, "[GO_DATA]"); ok {
			var msg GoData
			if err := json.Unmarshal([]byte(after), &msg); err == nil {
				sm.handleTaggedData(w, msg)
			}
		} else {
			fmt.Printf("[%s] %s\n", w.Phone, line)
		}
	}
}

func (sm *SessionManager) handleTaggedData(w *Worker, data GoData) {
	w.mu.Lock()
	defer w.mu.Unlock()

	switch data.Tag {
	case "PAIRING_CODE":
		w.PairingCode = fmt.Sprintf("%v", data.Payload["code"])
	case "CONNECTION_UPDATE":
		w.Status = fmt.Sprintf("%v", data.Payload["status"])
	}
}
