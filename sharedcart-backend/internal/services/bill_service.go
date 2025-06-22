package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/JacksonYuKe/sharedcart-backend/internal/database"
	"github.com/JacksonYuKe/sharedcart-backend/internal/models"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// BillService handles bill-related operations
type BillService struct {
	db           *gorm.DB
	groupService *GroupService
}

// NewBillService creates a new bill service
func NewBillService(groupService *GroupService) *BillService {
	return &BillService{
		db:           database.DB,
		groupService: groupService,
	}
}

// CreateBillRequest represents bill creation input
type CreateBillRequest struct {
	GroupID     uint                    `json:"group_id" binding:"required"`
	Title       string                  `json:"title" binding:"required,min=2,max=100"`
	Description string                  `json:"description" binding:"max=500"`
	TotalAmount decimal.Decimal         `json:"total_amount" binding:"required"`
	BillDate    time.Time               `json:"bill_date"`
	Items       []CreateBillItemRequest `json:"items"`
}

// CreateBillItemRequest represents bill item input
type CreateBillItemRequest struct {
	Name        string          `json:"name" binding:"required"`
	Description string          `json:"description"`
	Amount      decimal.Decimal `json:"amount" binding:"required"`
	Quantity    int             `json:"quantity"`
	IsShared    bool            `json:"is_shared"`
	OwnerIDs    []uint          `json:"owner_ids"` // Required if IsShared is false
}

// UpdateBillRequest represents bill update input
type UpdateBillRequest struct {
	Title       string          `json:"title" binding:"required,min=2,max=100"`
	Description string          `json:"description" binding:"max=500"`
	TotalAmount decimal.Decimal `json:"total_amount" binding:"required"`
	BillDate    time.Time       `json:"bill_date"`
}

// CreateBill creates a new bill with items
func (s *BillService) CreateBill(userID uint, req CreateBillRequest) (*models.Bill, error) {
	// Verify user is member of the group
	if !s.groupService.IsUserMember(req.GroupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	// Validate bill date
	if req.BillDate.IsZero() {
		req.BillDate = time.Now()
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create bill
	bill := models.Bill{
		GroupID:     req.GroupID,
		Title:       req.Title,
		Description: req.Description,
		TotalAmount: req.TotalAmount,
		PaidByID:    userID,
		BillDate:    req.BillDate,
		Status:      "pending",
	}

	if err := tx.Create(&bill).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create bill: %w", err)
	}

	// Create bill items
	var itemsTotal decimal.Decimal
	for _, itemReq := range req.Items {
		// Set default quantity
		if itemReq.Quantity == 0 {
			itemReq.Quantity = 1
		}

		// Debug logging
		fmt.Printf("DEBUG: Creating item '%s' - IsShared from request: %t\n", itemReq.Name, itemReq.IsShared)

		item := models.BillItem{
			BillID:      bill.ID,
			Name:        itemReq.Name,
			Description: itemReq.Description,
			Amount:      itemReq.Amount,
			Quantity:    itemReq.Quantity,
			IsShared:    itemReq.IsShared,
		}

		fmt.Printf("DEBUG: Item struct created - IsShared: %t\n", item.IsShared)

		// Create the item first using Select to ensure all fields are saved
		if err := tx.Select("bill_id", "name", "description", "amount", "quantity", "is_shared").Create(&item).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to create item %s: %w", itemReq.Name, err)
		}

		// Add item owners for personal items
		if !itemReq.IsShared && len(itemReq.OwnerIDs) > 0 {
			for _, ownerID := range itemReq.OwnerIDs {
				// Verify owner is a group member
				if !s.groupService.IsUserMember(req.GroupID, ownerID) {
					tx.Rollback()
					return nil, fmt.Errorf("user %d is not a member of the group", ownerID)
				}

				owner := models.ItemOwner{
					ItemID:     item.ID,
					UserID:     ownerID,
					ShareRatio: decimal.NewFromInt(1), // Equal share by default
				}

				if err := tx.Create(&owner).Error; err != nil {
					tx.Rollback()
					return nil, fmt.Errorf("failed to add item owner: %w", err)
				}
			}
		}

		// Calculate total
		itemsTotal = itemsTotal.Add(itemReq.Amount.Mul(decimal.NewFromInt(int64(itemReq.Quantity))))
	}

	// Validate total amount matches items total (with small tolerance for rounding)
	if !req.TotalAmount.Sub(itemsTotal).Abs().LessThan(decimal.NewFromFloat(0.01)) {
		tx.Rollback()
		return nil, fmt.Errorf("total amount (%s) doesn't match sum of items (%s)", req.TotalAmount, itemsTotal)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Load full bill data
	if err := s.db.Preload("Group").Preload("PaidBy").Preload("Items").Preload("Items.Owners").First(&bill, bill.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load bill data: %w", err)
	}

	return &bill, nil
}

// GetBills retrieves bills for a group
func (s *BillService) GetBills(userID uint, groupID uint, status string) ([]models.Bill, error) {
	// Verify user is member of the group
	if !s.groupService.IsUserMember(groupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	query := s.db.Where("group_id = ?", groupID)

	// Filter by status if provided
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var bills []models.Bill
	err := query.
		Order("bill_date DESC").
		Preload("PaidBy").
		Preload("Items").
		Find(&bills).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get bills: %w", err)
	}

	return bills, nil
}

// GetBillByID retrieves a specific bill
func (s *BillService) GetBillByID(billID, userID uint) (*models.Bill, error) {
	var bill models.Bill
	err := s.db.
		Preload("Group").
		Preload("PaidBy").
		Preload("Items").
		Preload("Items.Owners").
		First(&bill, billID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("bill not found")
		}
		return nil, fmt.Errorf("failed to get bill: %w", err)
	}

	// Verify user has access to this bill
	if !s.groupService.IsUserMember(bill.GroupID, userID) {
		return nil, errors.New("user is not authorized to view this bill")
	}

	return &bill, nil
}

// UpdateBill updates bill information
func (s *BillService) UpdateBill(billID, userID uint, req UpdateBillRequest) (*models.Bill, error) {
	// Get existing bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return nil, err
	}

	// Only allow update if bill is pending
	if bill.Status != "pending" {
		return nil, errors.New("cannot update finalized or settled bill")
	}

	// Only bill creator or group admin can update
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return nil, errors.New("only bill creator or group admin can update the bill")
	}

	// Update fields
	bill.Title = req.Title
	bill.Description = req.Description
	bill.TotalAmount = req.TotalAmount
	bill.BillDate = req.BillDate

	if err := s.db.Save(&bill).Error; err != nil {
		return nil, fmt.Errorf("failed to update bill: %w", err)
	}

	return bill, nil
}

// DeleteBill soft deletes a bill
func (s *BillService) DeleteBill(billID, userID uint) error {
	// Get bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return err
	}

	// Only allow delete if bill is pending
	if bill.Status != "pending" {
		return errors.New("cannot delete finalized or settled bill")
	}

	// Only bill creator or group admin can delete
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return errors.New("only bill creator or group admin can delete the bill")
	}

	// Soft delete
	if err := s.db.Delete(&bill).Error; err != nil {
		return fmt.Errorf("failed to delete bill: %w", err)
	}

	return nil
}

// AddBillItem adds an item to an existing bill
func (s *BillService) AddBillItem(billID, userID uint, req CreateBillItemRequest) (*models.BillItem, error) {
	// Get bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return nil, err
	}

	// Only allow if bill is pending
	if bill.Status != "pending" {
		return nil, errors.New("cannot add items to finalized or settled bill")
	}

	// Only bill creator or group admin can add items
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return nil, errors.New("only bill creator or group admin can add items")
	}

	// Start transaction
	tx := s.db.Begin()

	// Create item
	if req.Quantity == 0 {
		req.Quantity = 1
	}

	item := models.BillItem{
		BillID:      billID,
		Name:        req.Name,
		Description: req.Description,
		Amount:      req.Amount,
		Quantity:    req.Quantity,
		IsShared:    req.IsShared,
	}

	if err := tx.Create(&item).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create item: %w", err)
	}

	// Add owners for personal items
	if !req.IsShared && len(req.OwnerIDs) > 0 {
		for _, ownerID := range req.OwnerIDs {
			if !s.groupService.IsUserMember(bill.GroupID, ownerID) {
				tx.Rollback()
				return nil, fmt.Errorf("user %d is not a member of the group", ownerID)
			}

			owner := models.ItemOwner{
				ItemID:     item.ID,
				UserID:     ownerID,
				ShareRatio: decimal.NewFromInt(1),
			}

			if err := tx.Create(&owner).Error; err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("failed to add item owner: %w", err)
			}
		}
	}

	// Update bill total
	itemTotal := req.Amount.Mul(decimal.NewFromInt(int64(req.Quantity)))
	bill.TotalAmount = bill.TotalAmount.Add(itemTotal)

	if err := tx.Save(&bill).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update bill total: %w", err)
	}

	tx.Commit()

	// Load owners
	s.db.Preload("Owners").First(&item, item.ID)

	return &item, nil
}

// UpdateBillItem updates an existing bill item
func (s *BillService) UpdateBillItem(billID, itemID, userID uint, req CreateBillItemRequest) (*models.BillItem, error) {
	// Get bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return nil, err
	}

	// Only allow if bill is pending
	if bill.Status != "pending" {
		return nil, errors.New("cannot update items in finalized or settled bill")
	}

	// Only bill creator or group admin can update items
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return nil, errors.New("only bill creator or group admin can update items")
	}

	// Get existing item
	var item models.BillItem
	if err := s.db.Where("id = ? AND bill_id = ?", itemID, billID).First(&item).Error; err != nil {
		return nil, errors.New("item not found")
	}

	// Calculate the difference in total
	oldTotal := item.Amount.Mul(decimal.NewFromInt(int64(item.Quantity)))
	newTotal := req.Amount.Mul(decimal.NewFromInt(int64(req.Quantity)))
	difference := newTotal.Sub(oldTotal)

	// Start transaction
	tx := s.db.Begin()

	// Update item
	item.Name = req.Name
	item.Description = req.Description
	item.Amount = req.Amount
	item.Quantity = req.Quantity
	item.IsShared = req.IsShared

	if err := tx.Save(&item).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	// Update owners
	tx.Where("item_id = ?", item.ID).Delete(&models.ItemOwner{})

	if !req.IsShared && len(req.OwnerIDs) > 0 {
		for _, ownerID := range req.OwnerIDs {
			if !s.groupService.IsUserMember(bill.GroupID, ownerID) {
				tx.Rollback()
				return nil, fmt.Errorf("user %d is not a member of the group", ownerID)
			}

			owner := models.ItemOwner{
				ItemID:     item.ID,
				UserID:     ownerID,
				ShareRatio: decimal.NewFromInt(1),
			}

			if err := tx.Create(&owner).Error; err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("failed to add item owner: %w", err)
			}
		}
	}

	// Update bill total
	bill.TotalAmount = bill.TotalAmount.Add(difference)
	if err := tx.Save(&bill).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update bill total: %w", err)
	}

	tx.Commit()

	// Load owners
	s.db.Preload("Owners.User").First(&item, item.ID)

	return &item, nil
}

// DeleteBillItem deletes an item from a bill
func (s *BillService) DeleteBillItem(billID, itemID, userID uint) error {
	// Get bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return err
	}

	// Only allow if bill is pending
	if bill.Status != "pending" {
		return errors.New("cannot delete items from finalized or settled bill")
	}

	// Only bill creator or group admin can delete items
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return errors.New("only bill creator or group admin can delete items")
	}

	// Get item
	var item models.BillItem
	if err := s.db.Where("id = ? AND bill_id = ?", itemID, billID).First(&item).Error; err != nil {
		return errors.New("item not found")
	}

	// Start transaction
	tx := s.db.Begin()

	// Delete item owners first
	tx.Where("item_id = ?", itemID).Delete(&models.ItemOwner{})

	// Delete item
	if err := tx.Delete(&item).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete item: %w", err)
	}

	// Update bill total
	itemTotal := item.Amount.Mul(decimal.NewFromInt(int64(item.Quantity)))
	bill.TotalAmount = bill.TotalAmount.Sub(itemTotal)

	if err := tx.Save(&bill).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update bill total: %w", err)
	}

	tx.Commit()

	return nil
}

// FinalizeBill marks a bill as finalized (ready for settlement)
func (s *BillService) FinalizeBill(billID, userID uint) error {
	// Get bill
	bill, err := s.GetBillByID(billID, userID)
	if err != nil {
		return err
	}

	// Only bill creator or group admin can finalize
	if bill.PaidByID != userID && !s.groupService.IsUserAdmin(bill.GroupID, userID) {
		return errors.New("only bill creator or group admin can finalize the bill")
	}

	// Check if bill has items
	if len(bill.Items) == 0 {
		return errors.New("cannot finalize bill without items")
	}

	// Update status
	bill.Status = "finalized"
	if err := s.db.Save(&bill).Error; err != nil {
		return fmt.Errorf("failed to finalize bill: %w", err)
	}

	return nil
}
