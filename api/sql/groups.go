package database

import (
	"time"
)

// GroupMetadata matches the 'session_groups' table schema.
// PrimaryKey on GroupID ensures that a group is unique across the system.
// Index on SessionID allows for fast lookups of all groups belonging to a user/session.
type GroupMetadata struct {
	GroupID   string    `gorm:"column:groupId;primaryKey"`
	SessionID string    `gorm:"column:sessionId;index"`
	GroupInfo string    `gorm:"column:groupInfo"`
	UpdatedAt time.Time `gorm:"column:updatedAt;autoUpdateTime"`
	CreatedAt time.Time `gorm:"column:createdAt;autoCreateTime"`
}

// TableName overrides the default GORM table name to match your SQL migration.
func (GroupMetadata) TableName() string {
	return "session_groups"
}

// GroupMetaDataResult is the DTO (Data Transfer Object) used for JSON responses.
type GroupMetaDataResult struct {
	GroupID   string    `json:"group_id" gorm:"column:groupId"`
	GroupInfo string    `json:"group_info" gorm:"column:groupInfo"`
	UpdatedAt time.Time `json:"updated_at" gorm:"column:updatedAt"`
	CreatedAt time.Time `json:"created_at" gorm:"column:createdAt"`
}

// SaveGroup handles the "Upsert" logic.
// If GroupID exists, GORM performs an UPDATE on GroupInfo, SessionID, and UpdatedAt.
// If GroupID does not exist, it performs an INSERT and sets CreatedAt.
func SaveGroup(group *GroupMetadata) error {
	return DB.Save(group).Error
}

// GetGroupsBySession retrieves all groups associated with a specific sessionId.
func GetGroupsBySession(sessionID string) ([]GroupMetaDataResult, error) {
	var results []GroupMetaDataResult

	// Using Model(&GroupMetadata{}) ensures GORM uses the correct table and column mappings.
	err := DB.Model(&GroupMetadata{}).
		Select("groupId, groupInfo, updatedAt, createdAt").
		Where("sessionId = ?", sessionID).
		Scan(&results).Error // Scan is more efficient than Find for custom result structs.

	if err != nil {
		return nil, err
	}

	return results, nil
}

// GetAllGroupsMap is an alias for GetGroupsBySession to match your existing app logic.
func GetAllGroupsMap(sessionID string) ([]GroupMetaDataResult, error) {
	return GetGroupsBySession(sessionID)
}

// DeleteGroup removes a group by its unique GroupID.
func DeleteGroup(groupID string) error {
	return DB.Where("groupId = ?", groupID).Delete(&GroupMetadata{}).Error
}
