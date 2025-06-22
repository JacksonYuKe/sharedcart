package services

import (
	"errors"
	"fmt"

	"github.com/JacksonYuKe/sharedcart-backend/internal/database"
	"github.com/JacksonYuKe/sharedcart-backend/internal/models"
	"gorm.io/gorm"
)

// GroupService handles group-related operations
type GroupService struct {
	db *gorm.DB
}

// NewGroupService creates a new group service
func NewGroupService() *GroupService {
	return &GroupService{
		db: database.DB,
	}
}

// CreateGroupRequest represents group creation input
type CreateGroupRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description" binding:"max=500"`
}

// AddMemberRequest represents member addition input
type AddMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// UpdateMemberRoleRequest represents role update input
type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=admin member"`
}

// CreateGroup creates a new group with the creator as admin
func (s *GroupService) CreateGroup(userID uint, req CreateGroupRequest) (*models.Group, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create the group
	group := models.Group{
		Name:        req.Name,
		Description: req.Description,
		CreatedByID: userID,
		IsActive:    true,
	}

	if err := tx.Create(&group).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	// Add creator as admin member
	member := models.GroupMember{
		UserID:  userID,
		GroupID: group.ID,
		Role:    "admin",
	}

	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to add creator as member: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Load creator data
	if err := s.db.Preload("CreatedBy").First(&group, group.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load group data: %w", err)
	}

	return &group, nil
}

// GetUserGroups retrieves all groups for a user
func (s *GroupService) GetUserGroups(userID uint) ([]models.Group, error) {
	var groups []models.Group

	err := s.db.
		Joins("JOIN group_members ON group_members.group_id = groups.id").
		Where("group_members.user_id = ? AND groups.deleted_at IS NULL AND groups.is_active = ?", userID, true).
		Preload("CreatedBy").
		Find(&groups).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get user groups: %w", err)
	}

	// Load members for each group with role information
	for i := range groups {
		var members []models.GroupMember
		err := s.db.
			Where("group_id = ?", groups[i].ID).
			Preload("User").
			Find(&members).Error

		if err != nil {
			return nil, fmt.Errorf("failed to load group members: %w", err)
		}

		// Add members to the group with proper role information
		groups[i].GroupMembers = members
	}

	return groups, nil
}

// GetGroupByID retrieves a group by ID with member validation
func (s *GroupService) GetGroupByID(groupID, userID uint) (*models.Group, error) {
	// Check if user is a member
	if !s.IsUserMember(groupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	var group models.Group
	err := s.db.
		Preload("CreatedBy").
		First(&group, groupID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("group not found")
		}
		return nil, fmt.Errorf("failed to get group: %w", err)
	}

	// Load members with role information
	var members []models.GroupMember
	err = s.db.
		Where("group_id = ?", groupID).
		Preload("User").
		Find(&members).Error

	if err != nil {
		return nil, fmt.Errorf("failed to load group members: %w", err)
	}

	group.GroupMembers = members

	return &group, nil
}

// UpdateGroup updates group information
func (s *GroupService) UpdateGroup(groupID, userID uint, req CreateGroupRequest) (*models.Group, error) {
	// Check if user is admin
	if !s.IsUserAdmin(groupID, userID) {
		return nil, errors.New("only group admins can update group information")
	}

	var group models.Group
	if err := s.db.First(&group, groupID).Error; err != nil {
		return nil, errors.New("group not found")
	}

	// Update fields
	group.Name = req.Name
	group.Description = req.Description

	if err := s.db.Save(&group).Error; err != nil {
		return nil, fmt.Errorf("failed to update group: %w", err)
	}

	return &group, nil
}

// AddMember adds a new member to the group
func (s *GroupService) AddMember(groupID, inviterID uint, req AddMemberRequest) error {
	// Check if inviter is admin
	if !s.IsUserAdmin(groupID, inviterID) {
		return errors.New("only group admins can add members")
	}

	// Find user by email
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found with this email")
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Check if already a member
	if s.IsUserMember(groupID, user.ID) {
		return errors.New("user is already a member of this group")
	}

	// Add as member
	member := models.GroupMember{
		UserID:    user.ID,
		GroupID:   groupID,
		Role:      "member",
		InvitedBy: inviterID,
	}

	if err := s.db.Create(&member).Error; err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	return nil
}

// RemoveMember removes a member from the group
func (s *GroupService) RemoveMember(groupID, userID, targetUserID uint) error {
	// Check if user is admin
	if !s.IsUserAdmin(groupID, userID) {
		return errors.New("only group admins can remove members")
	}

	// Prevent removing the last admin
	if targetUserID == userID {
		adminCount := s.CountGroupAdmins(groupID)
		if adminCount <= 1 {
			return errors.New("cannot remove the last admin from group")
		}
	}

	// Remove member
	result := s.db.
		Where("group_id = ? AND user_id = ?", groupID, targetUserID).
		Delete(&models.GroupMember{})

	if result.Error != nil {
		return fmt.Errorf("failed to remove member: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("member not found in group")
	}

	return nil
}

// UpdateMemberRole updates a member's role in the group
func (s *GroupService) UpdateMemberRole(groupID, userID, targetUserID uint, req UpdateMemberRoleRequest) error {
	// Check if user is admin
	if !s.IsUserAdmin(groupID, userID) {
		return errors.New("only group admins can update member roles")
	}

	// Prevent removing the last admin
	if req.Role == "member" && targetUserID == userID {
		adminCount := s.CountGroupAdmins(groupID)
		if adminCount <= 1 {
			return errors.New("cannot demote the last admin")
		}
	}

	// Update role
	result := s.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, targetUserID).
		Update("role", req.Role)

	if result.Error != nil {
		return fmt.Errorf("failed to update member role: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("member not found in group")
	}

	return nil
}

// GetGroupMembers retrieves all members of a group
func (s *GroupService) GetGroupMembers(groupID, userID uint) ([]models.GroupMember, error) {
	// Check if user is a member
	if !s.IsUserMember(groupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	var members []models.GroupMember
	err := s.db.
		Where("group_id = ?", groupID).
		Preload("User").
		Find(&members).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get group members: %w", err)
	}

	return members, nil
}

// Helper methods

// IsUserMember checks if a user is a member of a group
func (s *GroupService) IsUserMember(groupID, userID uint) bool {
	var count int64
	s.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, userID).
		Count(&count)
	return count > 0
}

// IsUserAdmin checks if a user is an admin of a group
func (s *GroupService) IsUserAdmin(groupID, userID uint) bool {
	var member models.GroupMember
	err := s.db.
		Where("group_id = ? AND user_id = ? AND role = ?", groupID, userID, "admin").
		First(&member).Error
	return err == nil
}

// CountGroupAdmins counts the number of admins in a group
func (s *GroupService) CountGroupAdmins(groupID uint) int64 {
	var count int64
	s.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND role = ?", groupID, "admin").
		Count(&count)
	return count
}

// DeleteGroup soft deletes a group
func (s *GroupService) DeleteGroup(groupID, userID uint) error {
	// Check if user is admin
	if !s.IsUserAdmin(groupID, userID) {
		return errors.New("only group admins can delete the group")
	}

	// Soft delete the group
	if err := s.db.Delete(&models.Group{}, groupID).Error; err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}

	return nil
}
