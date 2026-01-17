package database

import (
	"time"
)

// UserSettings matches the session_configurations table logic.
// Note: Since your SQL schema is Key-Value based, this struct represents
// how you might structure the data in memory or if you decide to pivot the table.
type UserSettings struct {
	SessionID   string    `gorm:"primaryKey;column:sessionId"`
	ConfigKey   string    `gorm:"primaryKey;column:configKey"`
	ConfigValue string    `gorm:"column:configValue"`
	CreatedAt   time.Time `gorm:"column:createdAt;autoCreateTime"`
}

// TableName matches the SQL schema you provided earlier
func (UserSettings) TableName() string {
	return "session_configurations"
}

// GetUserSettings fetches a specific configuration value for a session
func GetUserConfig(sessionID string, key string) (string, error) {
	var config UserSettings
	err := DB.Where("sessionId = ? AND configKey = ?", sessionID, key).First(&config).Error
	if err != nil {
		return "", err
	}
	return config.ConfigValue, nil
}

// SetUserConfig updates or creates a configuration entry (Upsert)
func SetUserConfig(sessionID string, key string, value string) error {
	config := UserSettings{
		SessionID:   sessionID,
		ConfigKey:   key,
		ConfigValue: value,
	}

	// Uses GORM's Save to handle creation or updates
	return DB.Save(&config).Error
}

// UpdateUserSetting maintains your existing API signature but maps to the new schema
func UpdateUserSetting(sessionID string, key string, value string) error {
	return SetUserConfig(sessionID, key, value)
}

// GetAllSettingsForSession retrieves all config rows for a specific session
func GetAllSettingsForSession(sessionID string) ([]UserSettings, error) {
	var settings []UserSettings
	err := DB.Where("sessionId = ?", sessionID).Find(&settings).Error
	return settings, err
}
