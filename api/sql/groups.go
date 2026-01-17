package database

import (
	"time"
)

// GroupMetadata matches the 'session_groups' table
type GroupMetadata struct {
	GroupID   string    `gorm:"column:groupId;primaryKey"` // Added as Primary Key
	SessionID string    `gorm:"column:sessionId;index"`
	GroupInfo string    `gorm:"column:groupInfo"`
	UpdatedAt time.Time `gorm:"column:updatedAt;autoUpdateTime"` // Added
	CreatedAt time.Time `gorm:"column:createdAt;autoCreateTime"` // Keeps original timestamp
}

// TableName overrides the default GORM table name
func (GroupMetadata) TableName() string {
	return "session_groups"
}

type GroupMetaDataResult struct {
	GroupID   string    `json:"group_id" gorm:"column:groupId"`
	GroupInfo string    `json:"group_info" gorm:"column:groupInfo"`
	UpdatedAt time.Time `json:"updated_at" gorm:"column:updatedAt"`
	CreatedAt time.Time `json:"created_at" gorm:"column:createdAt"`
}

// GetGroupsBySession returns all groups associated with a sessionId
func GetGroupsBySession(sessionID string) ([]GroupMetaDataResult, error) {
	var results []GroupMetaDataResult

	// Updated to include groupId and updatedAt
	err := DB.Model(&GroupMetadata{}).
		Select("groupId, groupInfo, updatedAt, createdAt").
		Where("sessionId = ?", sessionID).
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	return results, nil
}

// SaveGroup handles the "Upsert" logic (Create or Update)
// This matches the 'set' logic in your TypeScript manager
func SaveGroup(group *GroupMetadata) error {
	return DB.Save(group).Error
}

func GetAllGroupsMap(sessionID string) ([]GroupMetaDataResult, error) {
	return GetGroupsBySession(sessionID)
}
