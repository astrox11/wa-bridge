package manager

import (
	"api/sql"
	"fmt"
	"os/exec"
	"sync"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

type SessionManager struct {
	Workers map[string]*Worker
	mu      sync.Mutex
}

func CreateSession() *SessionManager {
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

func (sm *SessionManager) PauseInstance(phone string, pause bool) error {
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

	sm.SaveState(w)
	return nil
}

func (sm *SessionManager) SaveState(w *Worker) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	err := database.DB.Where(database.Session{ID: w.Phone}).
		Assign(database.Session{
			Status: w.Status,
		}).
		FirstOrCreate(&database.Session{}).Error

	if err != nil {
		fmt.Printf("Error saving state to DB: %v\n", err)
	}
}

func (sm *SessionManager) ResetSession(phone string) error {
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	sm.mu.Unlock()

	if ok && w.Process != nil && w.Process.Process != nil {
		w.Process.Process.Kill()
	}

	cmd := exec.Command("redis-cli", "DEL", fmt.Sprintf("sessions:%s", phone))
	return cmd.Run()
}

// ClearSession removes all user data associated with a phone number from all database tables and Redis
func (sm *SessionManager) ClearSession(phone string) error {
	// Kill the process if it's running
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	if ok {
		if w.Process != nil && w.Process.Process != nil {
			w.Process.Process.Kill()
		}
		// Remove from workers map
		delete(sm.Workers, phone)
	}
	sm.mu.Unlock()

	// Clear from Go-managed tables (sessions and user_settings)
	// Delete from sessions table
	if err := database.DB.Where("phone = ?", phone).Delete(&database.Session{}).Error; err != nil {
		fmt.Printf("Error deleting from sessions table: %v\n", err)
	}

	// Delete from user_settings table
	if err := database.DB.Where("user = ?", phone).Delete(&database.UserSettings{}).Error; err != nil {
		fmt.Printf("Error deleting from user_settings table: %v\n", err)
	}

	// Clear from shared SQLite tables (user_contacts, user_messages, group_metadata, auth_data)
	// These are managed by the TypeScript/Bun side but we can access the same SQLite database
	db := database.DB

	// Delete from user_contacts table
	if err := db.Exec("DELETE FROM user_contacts WHERE session_phone = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from user_contacts table: %v\n", err)
	}

	// Delete from user_messages table
	if err := db.Exec("DELETE FROM user_messages WHERE session_phone = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from user_messages table: %v\n", err)
	}

	// Delete from group_metadata table
	if err := db.Exec("DELETE FROM group_metadata WHERE session_phone = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from group_metadata table: %v\n", err)
	}

	// Delete from auth_data table using LIKE pattern to match session:{phone}:*
	if err := db.Exec("DELETE FROM auth_data WHERE id LIKE ?", fmt.Sprintf("session:%s:%%", phone)).Error; err != nil {
		fmt.Printf("Error deleting from auth_data table: %v\n", err)
	}

	if err := db.Exec("DELETE FROM session WHERE phone = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from session table: %v\n", err)
	}

	// Flush Redis data using KEYS pattern and delete matching keys
	// We use redis-cli with --scan to safely handle large key sets
	pattern := fmt.Sprintf("session:%s:*", phone)
	cmd := exec.Command("bash", "-c", fmt.Sprintf("redis-cli --scan --pattern '%s' | xargs -r redis-cli DEL", pattern))
	if err := cmd.Run(); err != nil {
		fmt.Printf("Error flushing Redis data: %v\n", err)
		return err
	}
	return nil
}

func (sm *SessionManager) SyncSessionState() {
	var sessions []database.Session
	// Load everything that isn't logged out
	database.DB.Where("status != ?", "logged_out").Find(&sessions)

	for _, s := range sessions {
		if s.Status != "paused" {
			// Auto-start active sessions
			sm.StartInstance(s.ID, "starting")
		} else {
			// Keep paused sessions in memory
			sm.mu.Lock()
			sm.Workers[s.ID] = &Worker{
				Phone:  s.ID,
				Status: "paused",
			}
			sm.mu.Unlock()
		}
	}
}

type SystemStats struct {
	CPU    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
	Disk   float64 `json:"disk"`
}

// GetSystemStats collects all stats once
func GetSystemStats() SystemStats {
	c, _ := cpu.Percent(0, false)
	m, _ := mem.VirtualMemory()
	d, _ := disk.Usage("C:\\") // Use "/" for Linux

	var cpuVal float64
	if len(c) > 0 {
		cpuVal = c[0]
	}

	return SystemStats{
		CPU:    cpuVal,
		Memory: m.UsedPercent,
		Disk:   d.UsedPercent,
	}
}
