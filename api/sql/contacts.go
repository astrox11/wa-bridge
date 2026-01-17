package database

import (
	"time"
)

// UserContact matches the updated 'session_contacts' table schema
type UserContact struct {
	// Composite Primary Key: SessionID + ContactPn
	SessionID  string    `gorm:"column:sessionId;primaryKey"`
	ContactPn  string    `gorm:"column:contactPn;primaryKey"`
	ContactLid string    `gorm:"column:contactLid"`
	AddedAt    time.Time `gorm:"column:addedAt;autoUpdateTime"`
	CreatedAt  time.Time `gorm:"column:createdAt;autoCreateTime"`
}

// TableName overrides the default GORM table name
func (UserContact) TableName() string {
	return "session_contacts"
}

// ContactResult represents the data structure for API responses
type ContactResult struct {
	ContactPn  string    `json:"contact_pn"`
	ContactLid string    `json:"contact_lid"`
	AddedAt    time.Time `json:"added_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// GetContacts returns all contacts belonging to the sessionId
func GetContacts(sessionID string) ([]ContactResult, error) {
	var contacts []ContactResult

	err := DB.Model(&UserContact{}).
		Select("contactPn, contactLid, addedAt, createdAt").
		Where("sessionId = ?", sessionID).
		Scan(&contacts).Error

	if err != nil {
		return nil, err
	}

	return contacts, nil
}

// SaveContact handles Upsert logic (Create or Update)
func SaveContact(contact *UserContact) error {
	return DB.Save(contact).Error
}
