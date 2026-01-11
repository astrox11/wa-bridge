package database

import (
	"gorm.io/gorm"
	"time"
)

type Session struct {
	Phone     string `gorm:"uniqueIndex;not null"`
	Status    string `gorm:"default:'starting'"` // active, paused, logged_out
	CreatedAt time.Time
	UpdatedAt time.Time
}

func GetAllSessions(db *gorm.DB) ([]Session, error) {
	var sessions []Session
	err := db.Find(&sessions).Error
	return sessions, err
}
