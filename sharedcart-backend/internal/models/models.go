package models

// GetAllModels returns all models for migration
func GetAllModels() []interface{} {
	return []interface{}{
		&User{},
		&Group{},
		&GroupMember{},
		&Bill{},
		&BillItem{},
		&ItemOwner{},
		&Settlement{},
		&SettlementBill{},
		&SettlementTransaction{},
	}
}
