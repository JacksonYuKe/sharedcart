package routes

import (
	"github.com/JacksonYuKe/sharedcart-backend/config"
	"github.com/JacksonYuKe/sharedcart-backend/internal/api/handlers"
	"github.com/JacksonYuKe/sharedcart-backend/internal/api/middleware"
	"github.com/JacksonYuKe/sharedcart-backend/internal/services"
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine, cfg *config.Config) {
	// Initialize services
	authService := services.NewAuthService(&cfg.JWT)
	groupService := services.NewGroupService()
	billService := services.NewBillService(groupService)
	settlementService := services.NewSettlementService(groupService, billService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	groupHandler := handlers.NewGroupHandler(groupService)
	billHandler := handlers.NewBillHandler(billService)
	settlementHandler := handlers.NewSettlementHandler(settlementService)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes (no authentication required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// Protected routes (authentication required)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(&cfg.JWT))
		{
			// User routes
			protected.GET("/profile", authHandler.GetProfile)

			// Group routes
			groups := protected.Group("/groups")
			{
				groups.POST("", groupHandler.CreateGroup)
				groups.GET("", groupHandler.GetGroups)
				groups.GET("/:id", groupHandler.GetGroup)
				groups.PUT("/:id", groupHandler.UpdateGroup)
				groups.DELETE("/:id", groupHandler.DeleteGroup)

				// Group member routes
				groups.GET("/:id/members", groupHandler.GetGroupMembers)
				groups.POST("/:id/members", groupHandler.AddMember)
				groups.DELETE("/:id/members/:userId", groupHandler.RemoveMember)
				groups.PUT("/:id/members/:userId/role", groupHandler.UpdateMemberRole)
			}

			// Bill routes
			bills := protected.Group("/bills")
			{
				bills.POST("", billHandler.CreateBill)
				bills.GET("", billHandler.GetBills) // ?group_id=1&status=pending
				bills.GET("/:id", billHandler.GetBill)
				bills.PUT("/:id", billHandler.UpdateBill)
				bills.DELETE("/:id", billHandler.DeleteBill)
				bills.POST("/:id/finalize", billHandler.FinalizeBill)

				// Bill item routes
				bills.POST("/:id/items", billHandler.AddBillItem)
				bills.PUT("/:id/items/:itemId", billHandler.UpdateBillItem)
				bills.DELETE("/:id/items/:itemId", billHandler.DeleteBillItem)
			}

			// Settlement routes
			settlements := protected.Group("/settlements")
			{
				settlements.POST("/calculate", settlementHandler.CalculateSettlement)
				settlements.POST("", settlementHandler.CreateSettlement)
				settlements.GET("", settlementHandler.GetGroupSettlements) // ?group_id=1&status=pending
				settlements.GET("/:id", settlementHandler.GetSettlement)
				settlements.POST("/:id/confirm", settlementHandler.ConfirmSettlement)
			}
		}
	}
}
