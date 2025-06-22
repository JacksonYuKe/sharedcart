package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Bill represents a shopping bill
type Bill struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	GroupID     uint            `gorm:"not null" json:"group_id"`
	Group       *Group          `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	Title       string          `gorm:"not null" json:"title"`
	Description string          `json:"description,omitempty"`
	TotalAmount decimal.Decimal `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	PaidByID    uint            `gorm:"not null" json:"paid_by_id"`
	PaidBy      *User           `gorm:"foreignKey:PaidByID" json:"paid_by,omitempty"`
	BillDate    time.Time       `gorm:"not null" json:"bill_date"`
	Status      string          `gorm:"default:'pending'" json:"status"` // pending, finalized, settled
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`

	// Relationships
	Items []BillItem `gorm:"foreignKey:BillID" json:"items,omitempty"`
}

// BillItem represents an item in a bill
type BillItem struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	BillID      uint            `gorm:"not null" json:"bill_id"`
	Bill        *Bill           `gorm:"foreignKey:BillID" json:"bill,omitempty"`
	Name        string          `gorm:"not null" json:"name"`
	Description string          `json:"description,omitempty"`
	Amount      decimal.Decimal `gorm:"type:decimal(10,2);not null" json:"amount"`
	Quantity    int             `gorm:"default:1" json:"quantity"`
	IsShared    bool            `json:"is_shared"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`

	// Relationships
	Owners []User `gorm:"many2many:item_owners;foreignKey:ID;joinForeignKey:ItemID;References:ID;joinReferences:UserID" json:"owners,omitempty"`
}

// ItemOwner represents the join table for items and their owners
type ItemOwner struct {
	ID         uint            `gorm:"primaryKey" json:"id"`
	ItemID     uint            `gorm:"not null" json:"item_id"`
	UserID     uint            `gorm:"not null" json:"user_id"`
	ShareRatio decimal.Decimal `gorm:"type:decimal(5,2);default:1.00" json:"share_ratio"` // For custom split ratios

	// Relationships
	Item *BillItem `gorm:"foreignKey:ItemID;references:ID" json:"item,omitempty"`
	User *User     `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

// TableName specifies the table name for Bill model
func (Bill) TableName() string {
	return "bills"
}

// TableName specifies the table name for BillItem model
func (BillItem) TableName() string {
	return "bill_items"
}

// TableName specifies the table name for ItemOwner model
func (ItemOwner) TableName() string {
	return "item_owners"
}

// BeforeCreate hooks
func (b *Bill) BeforeCreate(tx *gorm.DB) error {
	b.CreatedAt = time.Now()
	b.UpdatedAt = time.Now()
	if b.BillDate.IsZero() {
		b.BillDate = time.Now()
	}
	return nil
}

func (b *Bill) BeforeUpdate(tx *gorm.DB) error {
	b.UpdatedAt = time.Now()
	return nil
}

func (bi *BillItem) BeforeCreate(tx *gorm.DB) error {
	bi.CreatedAt = time.Now()
	bi.UpdatedAt = time.Now()
	return nil
}

func (bi *BillItem) BeforeUpdate(tx *gorm.DB) error {
	bi.UpdatedAt = time.Now()
	return nil
}
