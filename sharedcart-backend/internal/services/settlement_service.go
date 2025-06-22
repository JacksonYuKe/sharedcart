package services

import (
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/JacksonYuKe/sharedcart-backend/internal/database"
	"github.com/JacksonYuKe/sharedcart-backend/internal/models"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// SettlementService handles settlement calculations and operations
type SettlementService struct {
	db           *gorm.DB
	groupService *GroupService
	billService  *BillService
}

// NewSettlementService creates a new settlement service
func NewSettlementService(groupService *GroupService, billService *BillService) *SettlementService {
	return &SettlementService{
		db:           database.DB,
		groupService: groupService,
		billService:  billService,
	}
}

// CalculateSettlementRequest represents settlement calculation input
type CalculateSettlementRequest struct {
	GroupID uint   `json:"group_id" binding:"required"`
	BillIDs []uint `json:"bill_ids" binding:"required,min=1"`
}

// UserBalance represents a user's balance in the settlement
type UserBalance struct {
	UserID   uint            `json:"user_id"`
	UserName string          `json:"user_name"`
	Paid     decimal.Decimal `json:"paid"`    // Total amount paid by user
	Owes     decimal.Decimal `json:"owes"`    // Total amount user owes
	Balance  decimal.Decimal `json:"balance"` // Paid - Owes (positive means user should receive)
}

// Transaction represents a payment from one user to another
type Transaction struct {
	FromUserID   uint            `json:"from_user_id"`
	FromUserName string          `json:"from_user_name"`
	ToUserID     uint            `json:"to_user_id"`
	ToUserName   string          `json:"to_user_name"`
	Amount       decimal.Decimal `json:"amount"`
}

// SettlementResult represents the complete settlement calculation
type SettlementResult struct {
	GroupID      uint            `json:"group_id"`
	BillCount    int             `json:"bill_count"`
	TotalAmount  decimal.Decimal `json:"total_amount"`
	Balances     []UserBalance   `json:"balances"`
	Transactions []Transaction   `json:"transactions"`
}

// CalculateSettlement calculates how to settle bills for a group
func (s *SettlementService) CalculateSettlement(userID uint, req CalculateSettlementRequest) (*SettlementResult, error) {
	// Verify user is member of the group
	if !s.groupService.IsUserMember(req.GroupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	// Get all bills
	var bills []models.Bill
	err := s.db.
		Where("id IN ? AND group_id = ?", req.BillIDs, req.GroupID).
		Preload("PaidBy").
		Preload("Items.Owners").
		Find(&bills).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch bills: %w", err)
	}

	if len(bills) == 0 {
		return nil, errors.New("no bills found")
	}

	// Verify all bills belong to the group
	for _, bill := range bills {
		if bill.GroupID != req.GroupID {
			return nil, fmt.Errorf("bill %d does not belong to group %d", bill.ID, req.GroupID)
		}
	}

	// Get all group members
	members, err := s.groupService.GetGroupMembers(req.GroupID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get group members: %w", err)
	}

	// Initialize balances for all members
	balances := make(map[uint]*UserBalance)
	for _, member := range members {
		balances[member.UserID] = &UserBalance{
			UserID:   member.UserID,
			UserName: member.User.Name,
			Paid:     decimal.Zero,
			Owes:     decimal.Zero,
			Balance:  decimal.Zero,
		}
	}

	// Calculate balances
	totalAmount := decimal.Zero
	for _, bill := range bills {
		// Add to paid amount for the payer
		if balance, exists := balances[bill.PaidByID]; exists {
			balance.Paid = balance.Paid.Add(bill.TotalAmount)
		}
		totalAmount = totalAmount.Add(bill.TotalAmount)

		// Calculate what each person owes for this bill
		s.calculateBillOwes(&bill, balances, members)
	}

	// Calculate final balances (positive = should receive, negative = should pay)
	for _, balance := range balances {
		balance.Balance = balance.Paid.Sub(balance.Owes)
	}

	// Convert map to slice for output
	balanceSlice := make([]UserBalance, 0, len(balances))
	for _, balance := range balances {
		balanceSlice = append(balanceSlice, *balance)
	}

	// Sort by user ID for consistent output
	sort.Slice(balanceSlice, func(i, j int) bool {
		return balanceSlice[i].UserID < balanceSlice[j].UserID
	})

	// Calculate optimal transactions
	transactions := s.optimizeTransactions(balances)

	return &SettlementResult{
		GroupID:      req.GroupID,
		BillCount:    len(bills),
		TotalAmount:  totalAmount,
		Balances:     balanceSlice,
		Transactions: transactions,
	}, nil
}

// calculateBillOwes calculates what each person owes for a specific bill
func (s *SettlementService) calculateBillOwes(bill *models.Bill, balances map[uint]*UserBalance, members []models.GroupMember) {
	// Separate shared and personal items
	var sharedTotal decimal.Decimal
	personalTotals := make(map[uint]decimal.Decimal)

	for _, item := range bill.Items {
		itemTotal := item.Amount.Mul(decimal.NewFromInt(int64(item.Quantity)))

		if item.IsShared {
			sharedTotal = sharedTotal.Add(itemTotal)
		} else {
			// Personal item - divide among owners
			if len(item.Owners) > 0 {
				sharePerOwner := itemTotal.Div(decimal.NewFromInt(int64(len(item.Owners))))
				for _, owner := range item.Owners {
					current := personalTotals[owner.ID]
					personalTotals[owner.ID] = current.Add(sharePerOwner)
				}
			}
		}
	}

	// Divide shared total among all active members
	activeMemberCount := len(members)
	if activeMemberCount > 0 && sharedTotal.GreaterThan(decimal.Zero) {
		sharePerMember := sharedTotal.Div(decimal.NewFromInt(int64(activeMemberCount)))

		// Add shared amount to each member's owes
		for _, member := range members {
			if balance, exists := balances[member.UserID]; exists {
				balance.Owes = balance.Owes.Add(sharePerMember)
			}
		}
	}

	// Add personal amounts to specific users' owes
	for userID, amount := range personalTotals {
		if balance, exists := balances[userID]; exists {
			balance.Owes = balance.Owes.Add(amount)
		}
	}
}

// optimizeTransactions calculates the minimum number of transactions needed
func (s *SettlementService) optimizeTransactions(balances map[uint]*UserBalance) []Transaction {
	// Separate creditors (positive balance) and debtors (negative balance)
	type balanceInfo struct {
		userID   uint
		userName string
		amount   decimal.Decimal
	}

	var creditors []balanceInfo
	var debtors []balanceInfo

	for _, balance := range balances {
		if balance.Balance.GreaterThan(decimal.Zero) {
			creditors = append(creditors, balanceInfo{
				userID:   balance.UserID,
				userName: balance.UserName,
				amount:   balance.Balance,
			})
		} else if balance.Balance.LessThan(decimal.Zero) {
			debtors = append(debtors, balanceInfo{
				userID:   balance.UserID,
				userName: balance.UserName,
				amount:   balance.Balance.Abs(),
			})
		}
	}

	// Sort for consistent results
	sort.Slice(creditors, func(i, j int) bool {
		return creditors[i].amount.GreaterThan(creditors[j].amount)
	})
	sort.Slice(debtors, func(i, j int) bool {
		return debtors[i].amount.GreaterThan(debtors[j].amount)
	})

	var transactions []Transaction

	// Match debtors with creditors
	i, j := 0, 0
	for i < len(debtors) && j < len(creditors) {
		debtor := &debtors[i]
		creditor := &creditors[j]

		// Calculate transaction amount (minimum of what debtor owes and what creditor should receive)
		transactionAmount := debtor.amount
		if creditor.amount.LessThan(debtor.amount) {
			transactionAmount = creditor.amount
		}

		// Skip very small amounts (less than 1 cent)
		if transactionAmount.GreaterThan(decimal.NewFromFloat(0.01)) {
			transactions = append(transactions, Transaction{
				FromUserID:   debtor.userID,
				FromUserName: debtor.userName,
				ToUserID:     creditor.userID,
				ToUserName:   creditor.userName,
				Amount:       transactionAmount,
			})
		}

		// Update remaining amounts
		debtor.amount = debtor.amount.Sub(transactionAmount)
		creditor.amount = creditor.amount.Sub(transactionAmount)

		// Move to next debtor/creditor if current one is settled
		if debtor.amount.LessThanOrEqual(decimal.NewFromFloat(0.01)) {
			i++
		}
		if creditor.amount.LessThanOrEqual(decimal.NewFromFloat(0.01)) {
			j++
		}
	}

	return transactions
}

// CreateSettlement saves a settlement calculation to the database
func (s *SettlementService) CreateSettlement(userID uint, req CalculateSettlementRequest, result *SettlementResult) (*models.Settlement, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create settlement record
	settlement := models.Settlement{
		GroupID:     req.GroupID,
		Title:       fmt.Sprintf("Settlement for %d bills", len(req.BillIDs)),
		Description: fmt.Sprintf("Total amount: %s", result.TotalAmount.String()),
		CreatedByID: userID,
		Status:      "pending",
	}

	if err := tx.Create(&settlement).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create settlement: %w", err)
	}

	// Link bills to settlement
	for _, billID := range req.BillIDs {
		settlementBill := models.SettlementBill{
			SettlementID: settlement.ID,
			BillID:       billID,
		}
		if err := tx.Create(&settlementBill).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to link bill to settlement: %w", err)
		}
	}

	// Create settlement transactions
	for _, trans := range result.Transactions {
		transaction := models.SettlementTransaction{
			SettlementID: settlement.ID,
			FromUserID:   trans.FromUserID,
			ToUserID:     trans.ToUserID,
			Amount:       trans.Amount,
			Status:       "pending",
		}
		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to create transaction: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Load full settlement data
	if err := s.db.Preload("CreatedBy").Preload("Bills").Preload("Transactions.FromUser").Preload("Transactions.ToUser").First(&settlement, settlement.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load settlement data: %w", err)
	}

	return &settlement, nil
}

// ConfirmSettlement marks a settlement as confirmed and updates bill statuses
func (s *SettlementService) ConfirmSettlement(settlementID, userID uint) error {
	// Get settlement
	var settlement models.Settlement
	if err := s.db.Preload("Bills").First(&settlement, settlementID).Error; err != nil {
		return errors.New("settlement not found")
	}

	// Verify user has permission (creator or group admin)
	if settlement.CreatedByID != userID && !s.groupService.IsUserAdmin(settlement.GroupID, userID) {
		return errors.New("only settlement creator or group admin can confirm settlement")
	}

	// Check if already confirmed
	if settlement.Status != "pending" {
		return errors.New("settlement is not pending")
	}

	// Start transaction
	tx := s.db.Begin()

	// Update settlement status
	now := time.Now()
	settlement.Status = "confirmed"
	settlement.SettledAt = &now
	if err := tx.Save(&settlement).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update settlement: %w", err)
	}

	// Update all related bills to settled
	var billIDs []uint
	tx.Model(&models.SettlementBill{}).
		Where("settlement_id = ?", settlementID).
		Pluck("bill_id", &billIDs)

	if err := tx.Model(&models.Bill{}).
		Where("id IN ?", billIDs).
		Update("status", "settled").Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update bill statuses: %w", err)
	}

	tx.Commit()
	return nil
}

// GetSettlement retrieves a settlement by ID
func (s *SettlementService) GetSettlement(settlementID, userID uint) (*models.Settlement, error) {
	var settlement models.Settlement
	err := s.db.
		Preload("Group").
		Preload("CreatedBy").
		Preload("Bills.PaidBy").
		Preload("Transactions.FromUser").
		Preload("Transactions.ToUser").
		First(&settlement, settlementID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("settlement not found")
		}
		return nil, fmt.Errorf("failed to get settlement: %w", err)
	}

	// Verify user has access
	if !s.groupService.IsUserMember(settlement.GroupID, userID) {
		return nil, errors.New("user is not authorized to view this settlement")
	}

	return &settlement, nil
}

// GetGroupSettlements retrieves all settlements for a group
func (s *SettlementService) GetGroupSettlements(groupID, userID uint, status string) ([]models.Settlement, error) {
	// Verify user is member
	if !s.groupService.IsUserMember(groupID, userID) {
		return nil, errors.New("user is not a member of this group")
	}

	query := s.db.Where("group_id = ?", groupID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var settlements []models.Settlement
	err := query.
		Order("created_at DESC").
		Preload("CreatedBy").
		Find(&settlements).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get settlements: %w", err)
	}

	return settlements, nil
}
