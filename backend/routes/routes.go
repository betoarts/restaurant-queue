package routes

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"restaurant-queue/database"
	"restaurant-queue/models"
	"restaurant-queue/services"
	"restaurant-queue/websocket"
	"restaurant-queue/whatsapp"
)

func Register(r *gin.Engine, hub *websocket.Hub, wa *whatsapp.Service) {
	qSvc := services.NewQueueService()
	tSvc := services.NewTableService()

	api := r.Group("/api")

	// ── Dashboard ──────────────────────────────────────────────
	api.GET("/stats", func(c *gin.Context) {
		stats, err := qSvc.GetStats()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		stats.WhatsAppStatus = wa.GetStatus()
		c.JSON(200, stats)
	})

	// ── Queue ──────────────────────────────────────────────────
	api.GET("/queue", func(c *gin.Context) {
		entries, err := qSvc.GetQueue()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		if entries == nil {
			entries = []*models.QueueEntry{}
		}
		c.JSON(200, entries)
	})

	api.POST("/queue", func(c *gin.Context) {
		var body struct {
			Name       string `json:"name" binding:"required"`
			WhatsApp   string `json:"whatsapp" binding:"required"`
			People     int    `json:"people" binding:"required,min=1"`
			Preference string `json:"preference"`
			Notes      string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		entry, err := qSvc.AddToQueue(body.Name, body.WhatsApp, body.People, body.Preference, body.Notes)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// Send confirmation WhatsApp
		if wa.GetStatus() == "connected" {
			msg := whatsapp.BuildConfirmationMessage(body.Name, entry.Position)
			go wa.SendMessage(body.WhatsApp, msg, entry.CustomerID)
		}

		hub.Broadcast("queue_updated", entry)
		c.JSON(201, entry)
	})

	api.PATCH("/queue/:id/status", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var body struct {
			Status string `json:"status" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if err := qSvc.UpdateStatus(id, body.Status); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		hub.Broadcast("queue_status_changed", gin.H{"id": id, "status": body.Status})
		c.JSON(200, gin.H{"ok": true})
	})

	api.DELETE("/queue/:id", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		if err := qSvc.RemoveFromQueue(id); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		hub.Broadcast("queue_updated", gin.H{"removed": id})
		c.JSON(200, gin.H{"ok": true})
	})

	api.PUT("/queue/:id", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var body struct {
			Name       string `json:"name" binding:"required"`
			WhatsApp   string `json:"whatsapp" binding:"required"`
			People     int    `json:"people" binding:"required,min=1"`
			Preference string `json:"preference"`
			Notes      string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if err := qSvc.UpdateQueueEntry(id, body.Name, body.WhatsApp, body.People, body.Preference, body.Notes); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		hub.Broadcast("queue_updated", gin.H{"updated": id})
		c.JSON(200, gin.H{"ok": true})
	})

	// ── History ────────────────────────────────────────────────
	api.GET("/queue/history", func(c *gin.Context) {
		dateFrom := c.Query("from")
		dateTo := c.Query("to")
		entries, err := qSvc.GetHistory(dateFrom, dateTo)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		if entries == nil {
			entries = []*models.QueueEntry{}
		}
		c.JSON(200, entries)
	})

	api.GET("/reports/daily", func(c *gin.Context) {
		date := c.Query("date")
		if date == "" {
			c.JSON(400, gin.H{"error": "date query parameter is required"})
			return
		}
		report, err := qSvc.GetDailyReport(date)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, report)
	})

	// ── Tables ──────────────────────────────────────────────────
	api.GET("/tables", func(c *gin.Context) {
		tables, err := tSvc.GetAll()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, tables)
	})

	api.POST("/tables", func(c *gin.Context) {
		var body struct {
			Number int    `json:"number" binding:"required"`
			Chairs int    `json:"chairs" binding:"required,min=1"`
			Area   string `json:"area" binding:"required"`
			Notes  string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		t, err := tSvc.Create(body.Number, body.Chairs, body.Area, body.Notes)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		hub.Broadcast("table_updated", t)
		c.JSON(201, t)
	})

	api.PATCH("/tables/:id/status", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var body struct {
			Status string `json:"status" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if err := tSvc.UpdateStatus(id, body.Status); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// When table leaves "ocupada" or "reservada", record left_at and unlink any customers
		if body.Status == "limpeza" || body.Status == "livre" {
			database.DB.Exec(`UPDATE queue SET left_at = CURRENT_TIMESTAMP WHERE status = 'entrou' AND left_at IS NULL AND customer_id IN (SELECT id FROM customers WHERE table_id=?)`, id)
			database.DB.Exec(`UPDATE customers SET table_id=NULL WHERE table_id=?`, id)
		}

		// If table becomes free, auto-suggest next client
		if body.Status == "livre" {
			next, err := qSvc.CallNext(id)
			if err == nil && next != nil {
				hub.Broadcast("suggest_call", gin.H{
					"queue_entry": next,
					"table_id":   id,
				})
			}
		}

		hub.Broadcast("table_updated", gin.H{"id": id, "status": body.Status})
		c.JSON(200, gin.H{"ok": true})
	})

	api.DELETE("/tables/:id", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		if err := tSvc.Delete(id); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		hub.Broadcast("table_updated", gin.H{"deleted": id})
		c.JSON(200, gin.H{"ok": true})
	})

	api.PUT("/tables/:id", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var body struct {
			Number int    `json:"number" binding:"required"`
			Chairs int    `json:"chairs" binding:"required,min=1"`
			Area   string `json:"area" binding:"required"`
			Notes  string `json:"notes"`
			Status string `json:"status"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if body.Status == "" {
			body.Status = "livre"
		}
		if err := tSvc.Update(id, body.Number, body.Chairs, body.Area, body.Notes, body.Status); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		hub.Broadcast("table_updated", gin.H{"id": id})
		c.JSON(200, gin.H{"ok": true})
	})

	// ── Notifications ──────────────────────────────────────────
	api.POST("/notify", func(c *gin.Context) {
		var body struct {
			CustomerName string `json:"customer_name" binding:"required"`
			Phone        string `json:"phone" binding:"required"`
			TableNumber  int    `json:"table_number" binding:"required"`
			QueueID      int    `json:"queue_id"`
			TableID      int    `json:"table_id"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if wa.GetStatus() != "connected" {
			c.JSON(503, gin.H{"error": "WhatsApp not connected"})
			return
		}

		msg := whatsapp.BuildNotificationMessage(body.CustomerName, body.TableNumber)
		if err := wa.SendMessage(body.Phone, msg, 0); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// Update queue entry to "chamado" and link customer to table
		if body.QueueID > 0 && body.TableID > 0 {
			qSvc.UpdateStatus(body.QueueID, "chamado")
			// Clear previous customer assignment for this table
			database.DB.Exec(
				`UPDATE customers SET table_id=NULL WHERE table_id=? AND id != (SELECT customer_id FROM queue WHERE id=?)`,
				body.TableID, body.QueueID,
			)
			database.DB.Exec(
				`UPDATE customers SET table_id=?, status='chamado' WHERE id=(SELECT customer_id FROM queue WHERE id=?)`,
				body.TableID, body.QueueID,
			)
		} else if body.QueueID > 0 {
			qSvc.UpdateStatus(body.QueueID, "chamado")
		}

		hub.Broadcast("notification_sent", gin.H{
			"customer": body.CustomerName,
			"table":    body.TableNumber,
		})
		c.JSON(200, gin.H{"ok": true, "message": msg})
	})

	// ── WhatsApp ───────────────────────────────────────────────
	api.GET("/whatsapp/status", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": wa.GetStatus()})
	})

	api.POST("/whatsapp/disconnect", func(c *gin.Context) {
		wa.Disconnect()
		c.JSON(200, gin.H{"ok": true})
	})

	api.POST("/send-message", func(c *gin.Context) {
		var body struct {
			Phone   string `json:"phone" binding:"required"`
			Message string `json:"message" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if wa.GetStatus() != "connected" {
			c.JSON(503, gin.H{"error": "WhatsApp not connected"})
			return
		}
		if err := wa.SendMessage(body.Phone, body.Message, 0); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"ok": true})
	})

	api.GET("/whatsapp/qr", func(c *gin.Context) {
		c.JSON(200, gin.H{"qr": wa.CurrentQR, "status": wa.GetStatus()})
	})

	// ── Settings ────────────────────────────────────────────────
	api.GET("/settings", func(c *gin.Context) {
		rows, err := database.DB.Query(`SELECT key, value FROM settings`)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		settings := map[string]string{}
		for rows.Next() {
			var k, v string
			rows.Scan(&k, &v)
			settings[k] = v
		}
		c.JSON(200, settings)
	})

	api.PUT("/settings", func(c *gin.Context) {
		var body map[string]string
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		for k, v := range body {
			database.DB.Exec(
				`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
				 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
				k, v,
			)
		}
		// Return updated settings
		rows, err := database.DB.Query(`SELECT key, value FROM settings`)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		settings := map[string]string{}
		for rows.Next() {
			var k, v string
			rows.Scan(&k, &v)
			settings[k] = v
		}
		c.JSON(200, settings)
	})

	// ── System Export/Import ─────────────────────────────────────
	api.GET("/system/export", func(c *gin.Context) {
		settings := make(map[string]string)
		rows, err := database.DB.Query("SELECT key, value FROM settings")
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var k, v string
				if rows.Scan(&k, &v) == nil {
					settings[k] = v
				}
			}
		}
		tables, _ := tSvc.GetAll()
		c.JSON(200, gin.H{
			"settings": settings,
			"tables":   tables,
		})
	})

	api.POST("/system/import", func(c *gin.Context) {
		var body struct {
			Settings map[string]string `json:"settings"`
			Tables   []*models.Table   `json:"tables"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		tx, err := database.DB.Begin()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if body.Settings != nil {
			for k, v := range body.Settings {
				tx.Exec(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`, k, v)
			}
		}

		if body.Tables != nil {
			for _, t := range body.Tables {
				var existingID int
				err := tx.QueryRow(`SELECT id FROM tables WHERE number=?`, t.Number).Scan(&existingID)
				if err == sql.ErrNoRows {
					tx.Exec(`INSERT INTO tables (number, chairs, area, notes, status) VALUES (?, ?, ?, ?, 'livre')`,
						t.Number, t.Chairs, t.Area, t.Notes)
				} else {
					tx.Exec(`UPDATE tables SET chairs=?, area=?, notes=? WHERE id=?`,
						t.Chairs, t.Area, t.Notes, existingID)
				}
			}
		}

		if err := tx.Commit(); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		hub.Broadcast("table_updated", nil)
		c.JSON(200, gin.H{"ok": true})
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "whatsapp": wa.GetStatus()})
	})
}
