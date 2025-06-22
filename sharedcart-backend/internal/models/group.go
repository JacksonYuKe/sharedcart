package models

import (
	"time"

	"gorm.io/gorm"
)

// Group represents a group of users who share expenses
type Group struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description,omitempty"`
	CreatedByID uint           `gorm:"not null" json:"created_by_id"`
	CreatedBy   *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	// Note: Using GroupMembers instead of Members for proper role-based access
	GroupMembers []GroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
	Bills        []Bill        `gorm:"foreignKey:GroupID" json:"bills,omitempty"`
}

// GroupMember represents the join table for users and groups with additional fields
type GroupMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	GroupID   uint      `gorm:"not null" json:"group_id"`
	Role      string    `gorm:"default:'member'" json:"role"` // 'admin' or 'member'
	JoinedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"joined_at"`
	InvitedBy uint      `json:"invited_by,omitempty"`

	// Relationships
	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Group *Group `gorm:"foreignKey:GroupID" json:"group,omitempty"`
}

// TableName specifies the table name for Group model
func (Group) TableName() string {
	return "groups"
}

// TableName specifies the table name for GroupMember model
func (GroupMember) TableName() string {
	return "group_members"
}

// BeforeCreate hook for Group
func (g *Group) BeforeCreate(tx *gorm.DB) error {
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()
	return nil
}

// BeforeUpdate hook for Group
func (g *Group) BeforeUpdate(tx *gorm.DB) error {
	g.UpdatedAt = time.Now()
	return nil
}
