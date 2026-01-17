package database

import (
	"time"
)

// GroupMetadata matches the 'session_groups' table
type GroupMetadata struct {
	SessionID string    `gorm:"column:sessionId"`
	GroupInfo string    `gorm:"column:groupInfo"` // Contains the metadata/ID
	CreatedAt time.Time `gorm:"column:createdAt;default:CURRENT_TIMESTAMP"`
}

// TableName overrides the default GORM table name
func (GroupMetadata) TableName() string {
	return "session_groups"
}

type GroupMetaDataResult struct {
	GroupInfo string    `json:"group_info" gorm:"column:groupInfo"`
	CreatedAt time.Time `json:"created_at" gorm:"column:createdAt"`
}

// GetGroupsBySession returns all groups associated with a sessionId
// Note: Since the schema doesn't have a separate ID column,
// filtering by a specific Group ID usually happens in the application logic
// by parsing the GroupInfo JSON.
func GetGroupsBySession(sessionID string) ([]GroupMetaDataResult, error) {
	var results []GroupMetaDataResult

	err := DB.Model(&GroupMetadata{}).
		Select("groupInfo, createdAt").
		Where("sessionId = ?", sessionID).
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	return results, nil
}

// GetAllGroups as a map
// Since there is no explicit 'id' column in the schema provided,
// this assumes you want to return the list of groups.
func GetAllGroupsMap(sessionID string) ([]GroupMetaDataResult, error) {
	return GetGroupsBySession(sessionID)
}
