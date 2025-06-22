package handlers

import (
	"net/http"
	"strconv"

	"github.com/JacksonYuKe/sharedcart-backend/internal/api/middleware"
	"github.com/JacksonYuKe/sharedcart-backend/internal/services"
	"github.com/gin-gonic/gin"
)

// SettlementHandler handles settlement-related endpoints
type SettlementHandler struct {
	settlementService *services.SettlementService
}

// NewSettlementHandler creates a new settlement handler
func NewSettlementHandler(settlementService *services.SettlementService) *SettlementHandler {
	return &SettlementHandler{
		settlementService: settlementService,
	}
}

// CalculateSettlement calculates how to settle bills
func (h *SettlementHandler) CalculateSettlement(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var req services.CalculateSettlementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.settlementService.CalculateSettlement(userID, req)
	if err != nil {
		switch err.Error() {
		case "user is not a member of this group":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case "no bills found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"settlement": result})
}

// CreateSettlement saves a settlement calculation
func (h *SettlementHandler) CreateSettlement(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var req services.CalculateSettlementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// First calculate the settlement
	result, err := h.settlementService.CalculateSettlement(userID, req)
	if err != nil {
		switch err.Error() {
		case "user is not a member of this group":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case "no bills found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Then save it
	settlement, err := h.settlementService.CreateSettlement(userID, req, result)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"settlement":  settlement,
		"calculation": result,
	})
}

// GetSettlement retrieves a specific settlement
func (h *SettlementHandler) GetSettlement(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	settlementID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid settlement ID"})
		return
	}

	settlement, err := h.settlementService.GetSettlement(uint(settlementID), userID)
	if err != nil {
		switch err.Error() {
		case "settlement not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "user is not authorized to view this settlement":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"settlement": settlement})
}

// GetGroupSettlements retrieves all settlements for a group
func (h *SettlementHandler) GetGroupSettlements(c *gin.Context) {
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

	settlements, err := h.settlementService.GetGroupSettlements(uint(groupID), userID, status)
	if err != nil {
		switch err.Error() {
		case "user is not a member of this group":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"settlements": settlements})
}

// ConfirmSettlement marks a settlement as confirmed
func (h *SettlementHandler) ConfirmSettlement(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	settlementID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid settlement ID"})
		return
	}

	err = h.settlementService.ConfirmSettlement(uint(settlementID), userID)
	if err != nil {
		switch err.Error() {
		case "settlement not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "only settlement creator or group admin can confirm settlement",
			"settlement is not pending":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "settlement confirmed successfully"})
}
