package database

import (
	"time"
)

// UserContact matches the 'session_contacts' table schema
type UserContact struct {
	SessionID   string    `gorm:"column:sessionId;primaryKey"`
	ContactInfo string    `gorm:"column:contactInfo"`
	AddedAt     time.Time `gorm:"column:addedAt;default:CURRENT_TIMESTAMP"`
	CreatedAt   time.Time `gorm:"column:createdAt;default:CURRENT_TIMESTAMP"`
}

// ContactResult represents the specific data you want to retrieve
type ContactResult struct {
	ContactInfo string `json:"contact_info"`
}

// TableName overrides the default GORM table name to match your SQL schema
func (UserContact) TableName() string {
	return "session_contacts"
}

// GetContacts returns all contact info belonging to the sessionId
func GetContacts(sessionID string) ([]ContactResult, error) {
	var contacts []ContactResult

	// Using the TableName or Model to ensure it hits 'session_contacts'
	err := DB.Model(&UserContact{}).
		Select("contactInfo").
		Where("sessionId = ?", sessionID).
		Scan(&contacts).Error

	if err != nil {
		return nil, err
	}

	return contacts, nil
}
