package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"whatsaly/api/go/datastore"
	"whatsaly/api/go/websocket"
)

type Handlers struct {
	store      *datastore.Store
	hub        *websocket.Hub
	bunBackend string
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func NewHandlers(store *datastore.Store, hub *websocket.Hub, bunBackend string) *Handlers {
	return &Handlers{
		store:      store,
		hub:        hub,
		bunBackend: bunBackend,
	}
}

func (h *Handlers) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *Handlers) callService(action string, params map[string]interface{}) (interface{}, error) {
	payload := map[string]interface{}{
		"action": action,
		"params": params,
	}
	body, _ := json.Marshal(payload)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(h.bunBackend+"/api/action", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	
	if !result.Success {
		return nil, &ServiceError{Message: result.Error}
	}
	
	return result.Data, nil
}

type ServiceError struct {
	Message string
}

func (e *ServiceError) Error() string {
	return e.Message
}

func (h *Handlers) HandleGetSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	sessions := h.store.GetAllSessions()
	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: sessions})
}

func (h *Handlers) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/sessions/")
	id = strings.Split(id, "/")[0]

	session := h.store.GetSession(id)
	if session == nil {
		h.writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Error: "Session not found"})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: session})
}

func (h *Handlers) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	var req struct {
		PhoneNumber string `json:"phoneNumber"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid request body"})
		return
	}

	result, err := h.callService("createSession", map[string]interface{}{"phoneNumber": req.PhoneNumber})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleDeleteSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/sessions/")

	result, err := h.callService("deleteSession", map[string]interface{}{"id": id})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.store.DeleteSession(id)
	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandlePauseSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/sessions/")
	id := strings.TrimSuffix(path, "/pause")

	result, err := h.callService("pauseSession", map[string]interface{}{"id": id})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleResumeSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/sessions/")
	id := strings.TrimSuffix(path, "/resume")

	result, err := h.callService("resumeSession", map[string]interface{}{"id": id})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	stats := h.store.GetOverallStats()
	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: stats})
}

func (h *Handlers) HandleGetFullStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	sessions := h.store.GetAllSessions()
	stats := h.store.GetOverallStats()

	sessionData := make([]map[string]interface{}, 0, len(sessions))
	for _, s := range sessions {
		sessionStats := h.store.GetSessionStats(s.ID)
		data := map[string]interface{}{
			"id":           s.ID,
			"phone_number": s.PhoneNumber,
			"status":       s.Status,
			"user_info":    s.UserInfo,
			"created_at":   s.CreatedAt,
		}
		if sessionStats != nil {
			data["stats"] = sessionStats
		}
		sessionData = append(sessionData, data)
	}

	result := map[string]interface{}{
		"totalSessions":  stats.TotalSessions,
		"activeSessions": stats.ActiveSessions,
		"totalMessages":  stats.TotalMessages,
		"sessions":       sessionData,
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/sessions/")
	id := strings.TrimSuffix(path, "/settings")

	settings := h.store.GetActivitySettings(id)
	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: settings})
}

func (h *Handlers) HandleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/sessions/")
	id := strings.TrimSuffix(path, "/settings")

	var updates map[string]bool
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid request body"})
		return
	}

	settings := h.store.UpdateActivitySettings(id, updates)
	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: settings})
}

func (h *Handlers) HandleBunPushSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	var session datastore.Session
	if err := json.NewDecoder(r.Body).Decode(&session); err != nil {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid request body"})
		return
	}

	h.store.SetSession(&session)

	h.broadcastStats()

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *Handlers) HandleBunPushStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	var payload struct {
		Overall  *datastore.OverallStats           `json:"overall"`
		Sessions []map[string]interface{}          `json:"sessions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid request body"})
		return
	}

	if payload.Overall != nil {
		h.store.SetOverallStats(payload.Overall)
	}

	for _, s := range payload.Sessions {
		session := &datastore.Session{
			ID:          getString(s, "id"),
			PhoneNumber: getString(s, "phone_number"),
			Status:      datastore.SessionStatus(getString(s, "status")),
		}

		if ui, ok := s["user_info"].(map[string]interface{}); ok {
			session.UserInfo = &datastore.UserInfo{
				Name: getString(ui, "name"),
			}
		}

		if createdAt, ok := s["created_at"].(string); ok {
			if t, err := time.Parse(time.RFC3339, createdAt); err == nil {
				session.CreatedAt = t
			}
		}

		h.store.SetSession(session)

		if stats, ok := s["stats"].(map[string]interface{}); ok {
			sessionStats := &datastore.SessionStats{
				MessagesReceived: getInt(stats, "messagesReceived"),
				MessagesSent:     getInt(stats, "messagesSent"),
			}
			h.store.SetSessionStats(session.ID, sessionStats)
		}
	}

	h.broadcastStats()

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *Handlers) broadcastStats() {
	sessions := h.store.GetAllSessions()
	stats := h.store.GetOverallStats()

	sessionData := make([]map[string]interface{}, 0, len(sessions))
	for _, s := range sessions {
		sessionStats := h.store.GetSessionStats(s.ID)
		data := map[string]interface{}{
			"id":           s.ID,
			"phone_number": s.PhoneNumber,
			"status":       s.Status,
			"user_info":    s.UserInfo,
			"created_at":   s.CreatedAt,
		}
		if sessionStats != nil {
			data["stats"] = sessionStats
		}
		sessionData = append(sessionData, data)
	}

	message := map[string]interface{}{
		"type": "stats",
		"data": map[string]interface{}{
			"totalSessions":  stats.TotalSessions,
			"activeSessions": stats.ActiveSessions,
			"totalMessages":  stats.TotalMessages,
			"sessions":       sessionData,
		},
	}

	h.hub.Broadcast(message)
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return 0
}

func (h *Handlers) HandleGetGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := r.URL.Path
	id := strings.TrimPrefix(path, "/api/sessions/")
	id = strings.TrimSuffix(id, "/groups")

	result, err := h.callService("getGroups", map[string]interface{}{"sessionId": id})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleGetGroupMetadata(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := r.URL.Path
	parts := strings.Split(strings.TrimPrefix(path, "/api/sessions/"), "/")
	if len(parts) < 3 {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid path"})
		return
	}
	sessionId := parts[0]
	groupId := parts[2]

	result, err := h.callService("getGroupMetadata", map[string]interface{}{"sessionId": sessionId, "groupId": groupId})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleGroupAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := r.URL.Path
	parts := strings.Split(strings.TrimPrefix(path, "/api/sessions/"), "/")
	if len(parts) < 3 {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid path"})
		return
	}
	sessionId := parts[0]
	groupId := parts[2]

	var actionReq struct {
		Action string                 `json:"action"`
		Params map[string]interface{} `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&actionReq); err != nil {
		h.writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid request body"})
		return
	}

	result, err := h.callService("executeGroupAction", map[string]interface{}{
		"sessionId": sessionId,
		"groupId":   groupId,
		"action":    actionReq.Action,
		"params":    actionReq.Params,
	})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (h *Handlers) HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Error: "Method not allowed"})
		return
	}

	path := r.URL.Path
	id := strings.TrimPrefix(path, "/api/sessions/")
	id = strings.TrimSuffix(id, "/messages")

	result, err := h.callService("getMessages", map[string]interface{}{"sessionId": id, "limit": 100, "offset": 0})
	if err != nil {
		h.writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Error: err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}
