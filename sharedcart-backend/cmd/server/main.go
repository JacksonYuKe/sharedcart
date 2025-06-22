package main

import (
	"log"
	"net/http"

	"github.com/JacksonYuKe/sharedcart-backend/config"
	"github.com/JacksonYuKe/sharedcart-backend/internal/api/routes"
	"github.com/JacksonYuKe/sharedcart-backend/internal/database"
	"github.com/JacksonYuKe/sharedcart-backend/internal/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize database
	if err := database.Initialize(&cfg.Database); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.Migrate(models.GetAllModels()...); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Initialize Gin router
	router := gin.Default()

	// Add CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000",
		"https://dec3irsdiv3r3.cloudfront.net",
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		// Check database health
		dbHealth := "healthy"
		if err := database.Health(); err != nil {
			dbHealth = "unhealthy: " + err.Error()
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      "healthy",
			"message":     "SharedCart API is running",
			"database":    dbHealth,
			"environment": cfg.App.Environment,
		})
	})

	// Setup all routes
	routes.SetupRoutes(router, cfg)

	// Start server
	port := ":" + cfg.Server.Port
	log.Printf("Server starting on port %s in %s mode", port, cfg.App.Environment)
	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
