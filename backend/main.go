package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"restaurant-queue/database"
	"restaurant-queue/routes"
	"restaurant-queue/websocket"
	"restaurant-queue/whatsapp"
)

func main() {
	// Initialize database
	if err := database.Init(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize WhatsApp service
	waService := whatsapp.NewService()
	go waService.Start()

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Setup Gin
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Register all routes
	routes.Register(r, hub, waService)

	// WebSocket endpoint
	r.GET("/ws", func(c *gin.Context) {
		websocket.ServeWS(hub, c.Writer, c.Request)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🍽️  Restaurant Queue API running on :%s", port)
	r.Run(":" + port)
}
