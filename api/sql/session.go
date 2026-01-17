package database

import (
	"gorm.io/gorm"
	"time"
)

type Session struct {
	ID                string    `gorm:"primaryKey;column:id"`
	Status            string    `gorm:"not null;column:status"` // active, paused, logged_out, pairing
	Name              string    `gorm:"column:name"`
	ProfileURL        string    `gorm:"column:profileUrl"`
	IsBusinessAccount bool      `gorm:"column:isBusinessAccount;default:false"`
	CreatedAt         time.Time `gorm:"column:createdAt;not null;default:CURRENT_TIMESTAMP"`
}

// TableName explicitly sets the table name to match the SQL schema
func (Session) TableName() string {
	return "sessions"
}

// GetAllSessions returns all session records from the database
func GetAllSessions(db *gorm.DB) ([]Session, error) {
	var sessions []Session
	// Order by createdAt desc to see newest sessions first
	err := db.Order("createdAt DESC").Find(&sessions).Error
	return sessions, err
}

// GetSessionByID finds a specific session by its ID (phone)
func GetSessionByID(db *gorm.DB, id string) (*Session, error) {
	var session Session
	err := db.First(&session, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}
