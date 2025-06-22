package handlers

import (
	"net/http"
	"strconv"

	"github.com/JacksonYuKe/sharedcart-backend/internal/api/middleware"
	"github.com/JacksonYuKe/sharedcart-backend/internal/services"
	"github.com/gin-gonic/gin"
)

// BillHandler handles bill-related endpoints
type BillHandler struct {
	billService *services.BillService
}

// NewBillHandler creates a new bill handler
func NewBillHandler(billService *services.BillService) *BillHandler {
	return &BillHandler{
		billService: billService,
	}
}

// CreateBill handles bill creation
func (h *BillHandler) CreateBill(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var req services.CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bill, err := h.billService.CreateBill(userID, req)
	if err != nil {
		switch err.Error() {
		case "user is not a member of this group":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"bill": bill})
}

// GetBills retrieves bills for a group
func (h *BillHandler) GetBills(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Parse group ID from query params
	groupIDStr := c.Query("group_id")
	if groupIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group_id is required"})
		return
	}

	groupID, err := strconv.ParseUint(groupIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group_id"})
		return
	}

	// Optional status filter
	status := c.Query("status")

	bills, err := h.billService.GetBills(userID, uint(groupID), status)
	if err != nil {
		switch err.Error() {
		case "user is not a member of this group":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"bills": bills})
}

// GetBill retrieves a specific bill
func (h *BillHandler) GetBill(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	bill, err := h.billService.GetBillByID(uint(billID), userID)
	if err != nil {
		switch err.Error() {
		case "bill not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "user is not authorized to view this bill":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"bill": bill})
}

// UpdateBill updates bill information
func (h *BillHandler) UpdateBill(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	var req services.UpdateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bill, err := h.billService.UpdateBill(uint(billID), userID, req)
	if err != nil {
		switch err.Error() {
		case "bill not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "cannot update finalized or settled bill",
			"only bill creator or group admin can update the bill":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"bill": bill})
}

// DeleteBill deletes a bill
func (h *BillHandler) DeleteBill(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	err = h.billService.DeleteBill(uint(billID), userID)
	if err != nil {
		switch err.Error() {
		case "bill not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "cannot delete finalized or settled bill",
			"only bill creator or group admin can delete the bill":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "bill deleted successfully"})
}

// AddBillItem adds an item to a bill
func (h *BillHandler) AddBillItem(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	var req services.CreateBillItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.billService.AddBillItem(uint(billID), userID, req)
	if err != nil {
		switch err.Error() {
		case "bill not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "cannot add items to finalized or settled bill",
			"only bill creator or group admin can add items":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"item": item})
}

// UpdateBillItem updates a bill item
func (h *BillHandler) UpdateBillItem(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req services.CreateBillItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.billService.UpdateBillItem(uint(billID), uint(itemID), userID, req)
	if err != nil {
		switch err.Error() {
		case "bill not found", "item not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "cannot update items in finalized or settled bill",
			"only bill creator or group admin can update items":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"item": item})
}

// DeleteBillItem deletes a bill item
func (h *BillHandler) DeleteBillItem(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	err = h.billService.DeleteBillItem(uint(billID), uint(itemID), userID)
	if err != nil {
		switch err.Error() {
		case "bill not found", "item not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "cannot delete items from finalized or settled bill",
			"only bill creator or group admin can delete items":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "item deleted successfully"})
}

// FinalizeBill marks a bill as finalized
func (h *BillHandler) FinalizeBill(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	billID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bill ID"})
		return
	}

	err = h.billService.FinalizeBill(uint(billID), userID)
	if err != nil {
		switch err.Error() {
		case "bill not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "only bill creator or group admin can finalize the bill",
			"cannot finalize bill without items":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "bill finalized successfully"})
}
