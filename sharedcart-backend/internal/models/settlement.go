package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Settlement represents a settlement calculation for a group
type Settlement struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	GroupID     uint           `gorm:"not null" json:"group_id"`
	Group       *Group         `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description,omitempty"`
	CreatedByID uint           `gorm:"not null" json:"created_by_id"`
	CreatedBy   *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	Status      string         `gorm:"default:'pending'" json:"status"` // pending, confirmed, completed
	SettledAt   *time.Time     `json:"settled_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Bills        []Bill                  `gorm:"many2many:settlement_bills;" json:"bills,omitempty"`
	Transactions []SettlementTransaction `gorm:"foreignKey:SettlementID" json:"transactions,omitempty"`
}

// SettlementBill represents the join table for settlements and bills
type SettlementBill struct {
	ID           uint `gorm:"primaryKey" json:"id"`
	SettlementID uint `gorm:"not null" json:"settlement_id"`
	BillID       uint `gorm:"not null" json:"bill_id"`

	// Relationships
	Settlement *Settlement `gorm:"foreignKey:SettlementID" json:"settlement,omitempty"`
	Bill       *Bill       `gorm:"foreignKey:BillID" json:"bill,omitempty"`
}

// SettlementTransaction represents a payment transaction in a settlement
type SettlementTransaction struct {
	ID           uint            `gorm:"primaryKey" json:"id"`
	SettlementID uint            `gorm:"not null" json:"settlement_id"`
	Settlement   *Settlement     `gorm:"foreignKey:SettlementID" json:"settlement,omitempty"`
	FromUserID   uint            `gorm:"not null" json:"from_user_id"`
	FromUser     *User           `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUserID     uint            `gorm:"not null" json:"to_user_id"`
	ToUser       *User           `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Amount       decimal.Decimal `gorm:"type:decimal(10,2);not null" json:"amount"`
	Status       string          `gorm:"default:'pending'" json:"status"` // pending, paid
	PaidAt       *time.Time      `json:"paid_at,omitempty"`
	Notes        string          `json:"notes,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// TableName specifies the table name for Settlement model
func (Settlement) TableName() string {
	return "settlements"
}

// TableName specifies the table name for SettlementBill model
func (SettlementBill) TableName() string {
	return "settlement_bills"
}

// TableName specifies the table name for SettlementTransaction model
func (SettlementTransaction) TableName() string {
	return "settlement_transactions"
}

// BeforeCreate hooks
func (s *Settlement) BeforeCreate(tx *gorm.DB) error {
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Settlement) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = time.Now()
	return nil
}

func (st *SettlementTransaction) BeforeCreate(tx *gorm.DB) error {
	st.CreatedAt = time.Now()
	st.UpdatedAt = time.Now()
	return nil
}

func (st *SettlementTransaction) BeforeUpdate(tx *gorm.DB) error {
	st.UpdatedAt = time.Now()
	return nil
}
