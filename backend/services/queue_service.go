package services

import (
	"database/sql"
	"fmt"
	"time"

	"restaurant-queue/database"
	"restaurant-queue/models"
)

type QueueService struct{}

func NewQueueService() *QueueService {
	return &QueueService{}
}

// GetQueue returns all active queue entries ordered by position
func (s *QueueService) GetQueue() ([]*models.QueueEntry, error) {
	rows, err := database.DB.Query(`
		SELECT q.id, q.customer_id, q.position, q.status, q.called_at, q.entered_at, q.created_at,
		       c.name, c.whatsapp, c.people, c.preference, c.notes, c.status as c_status, c.table_id
		FROM queue q
		JOIN customers c ON q.customer_id = c.id
		WHERE q.status IN ('aguardando','chamado')
		ORDER BY q.position ASC, q.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.QueueEntry
	for rows.Next() {
		e := &models.QueueEntry{Customer: &models.Customer{}}
		err := rows.Scan(
			&e.ID, &e.CustomerID, &e.Position, &e.Status, &e.CalledAt, &e.EnteredAt, &e.CreatedAt,
			&e.Customer.Name, &e.Customer.WhatsApp, &e.Customer.People,
			&e.Customer.Preference, &e.Customer.Notes, &e.Customer.Status, &e.Customer.TableID,
		)
		if err != nil {
			return nil, err
		}
		e.Customer.ID = e.CustomerID
		e.WaitMinutes = int(time.Since(e.CreatedAt).Minutes())
		entries = append(entries, e)
	}
	return entries, nil
}

// AddToQueue creates a customer and adds them to the queue
func (s *QueueService) AddToQueue(name, whatsapp string, people int, preference, notes string) (*models.QueueEntry, error) {
	tx, err := database.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Create customer
	res, err := tx.Exec(
		`INSERT INTO customers (name, whatsapp, people, preference, notes) VALUES (?,?,?,?,?)`,
		name, whatsapp, people, preference, notes,
	)
	if err != nil {
		return nil, err
	}
	customerID, _ := res.LastInsertId()

	// Get next position
	var maxPos sql.NullInt64
	tx.QueryRow(`SELECT MAX(position) FROM queue WHERE status IN ('aguardando','chamado')`).Scan(&maxPos)
	position := 1
	if maxPos.Valid {
		position = int(maxPos.Int64) + 1
	}

	// Add to queue
	res, err = tx.Exec(
		`INSERT INTO queue (customer_id, position, status) VALUES (?,?,?)`,
		customerID, position, "aguardando",
	)
	if err != nil {
		return nil, err
	}
	queueID, _ := res.LastInsertId()

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &models.QueueEntry{
		ID:         int(queueID),
		CustomerID: int(customerID),
		Position:   position,
		Status:     "aguardando",
		CreatedAt:  time.Now(),
		Customer: &models.Customer{
			ID: int(customerID), Name: name, WhatsApp: whatsapp,
			People: people, Preference: preference, Notes: notes,
		},
	}, nil
}

// CallNext finds the best match for an available table and marks them as called
func (s *QueueService) CallNext(tableID int) (*models.QueueEntry, error) {
	// Get table chairs count
	var chairs int
	err := database.DB.QueryRow(`SELECT chairs FROM tables WHERE id = ?`, tableID).Scan(&chairs)
	if err != nil {
		return nil, fmt.Errorf("table not found")
	}

	// Find best matching customer
	row := database.DB.QueryRow(`
		SELECT q.id, q.customer_id, q.position, c.name, c.whatsapp, c.people
		FROM queue q
		JOIN customers c ON q.customer_id = c.id
		WHERE q.status = 'aguardando' AND c.people <= ?
		ORDER BY q.position ASC
		LIMIT 1
	`, chairs)

	var e models.QueueEntry
	var c models.Customer
	err = row.Scan(&e.ID, &e.CustomerID, &e.Position, &c.Name, &c.WhatsApp, &c.People)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no suitable customer in queue")
	}
	if err != nil {
		return nil, err
	}

	now := time.Now()
	database.DB.Exec(`UPDATE queue SET status='chamado', called_at=? WHERE id=?`, now, e.ID)
	database.DB.Exec(`UPDATE customers SET status='chamado' WHERE id=?`, e.CustomerID)

	e.Status = "chamado"
	e.CalledAt = &now
	e.Customer = &c
	e.Customer.ID = e.CustomerID
	return &e, nil
}

// UpdateStatus updates a queue entry status
func (s *QueueService) UpdateStatus(queueID int, status string) error {
	now := time.Now()
	var err error

	switch status {
	case "chamado":
		_, err = database.DB.Exec(
			`UPDATE queue SET status=?, called_at=? WHERE id=?`, status, now, queueID)
	case "entrou":
		_, err = database.DB.Exec(
			`UPDATE queue SET status=?, entered_at=? WHERE id=?`, status, now, queueID)
		if err == nil {
			database.DB.Exec(`
				UPDATE customers SET status=?
				WHERE id = (SELECT customer_id FROM queue WHERE id=?)
			`, status, queueID)
		}
	case "cancelado", "nao_respondeu":
		_, err = database.DB.Exec(`UPDATE queue SET status=? WHERE id=?`, status, queueID)
		if err == nil {
			database.DB.Exec(`
				UPDATE customers SET status=?, table_id=NULL
				WHERE id = (SELECT customer_id FROM queue WHERE id=?)
			`, status, queueID)
		}
		s.reorderQueue()
	default:
		_, err = database.DB.Exec(`UPDATE queue SET status=? WHERE id=?`, status, queueID)
	}

	return err
}

// RemoveFromQueue removes a customer from the active queue
func (s *QueueService) RemoveFromQueue(queueID int) error {
	_, err := database.DB.Exec(`UPDATE queue SET status='cancelado' WHERE id=?`, queueID)
	if err != nil {
		return err
	}
	database.DB.Exec(`
		UPDATE customers SET status='cancelado'
		WHERE id = (SELECT customer_id FROM queue WHERE id=?)
	`, queueID)
	return s.reorderQueue()
}

func (s *QueueService) reorderQueue() error {
	rows, err := database.DB.Query(`
		SELECT id FROM queue WHERE status IN ('aguardando','chamado')
		ORDER BY position ASC, created_at ASC
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	pos := 1
	for rows.Next() {
		var id int
		rows.Scan(&id)
		database.DB.Exec(`UPDATE queue SET position=? WHERE id=?`, pos, id)
		pos++
	}
	return nil
}

// GetStats returns dashboard statistics
func (s *QueueService) GetStats() (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	database.DB.QueryRow(`SELECT COUNT(*) FROM queue WHERE status='aguardando'`).Scan(&stats.TotalWaiting)
	database.DB.QueryRow(`SELECT COUNT(*) FROM queue WHERE status='chamado'`).Scan(&stats.TotalCalled)
	database.DB.QueryRow(`SELECT COUNT(*) FROM tables WHERE status='ocupada'`).Scan(&stats.TablesOccupied)
	database.DB.QueryRow(`SELECT COUNT(*) FROM tables WHERE status='livre'`).Scan(&stats.TablesFree)
	database.DB.QueryRow(`SELECT COUNT(*) FROM tables WHERE status='reservada'`).Scan(&stats.TablesReserved)
	database.DB.QueryRow(`SELECT COUNT(*) FROM tables WHERE status='limpeza'`).Scan(&stats.TablesCleaning)
	database.DB.QueryRow(`
		SELECT COALESCE(AVG((JULIANDAY(CURRENT_TIMESTAMP)-JULIANDAY(created_at))*1440),0)
		FROM queue WHERE status='aguardando'
	`).Scan(&stats.AvgWaitMinutes)
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM queue WHERE status='entrou' AND DATE(created_at)=DATE('now')
	`).Scan(&stats.AttendedToday)

	return stats, nil
}

// UpdateQueueEntry edits editable fields of a queue entry's linked customer
func (s *QueueService) UpdateQueueEntry(id int, name, whatsapp string, people int, preference, notes string) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var customerID int
	err = tx.QueryRow(`SELECT customer_id FROM queue WHERE id = ?`, id).Scan(&customerID)
	if err != nil {
		return fmt.Errorf("queue entry not found")
	}

	_, err = tx.Exec(
		`UPDATE customers SET name=?, whatsapp=?, people=?, preference=?, notes=? WHERE id=?`,
		name, whatsapp, people, preference, notes, customerID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetHistory returns completed/cancelled queue entries, optionally filtered by date range
func (s *QueueService) GetHistory(dateFrom, dateTo string) ([]*models.QueueEntry, error) {
	query := `
		SELECT q.id, q.customer_id, q.position, q.status, q.called_at, q.entered_at, q.left_at, q.created_at,
		       c.name, c.whatsapp, c.people, c.preference, c.notes, c.status as c_status, c.table_id, t.number
		FROM queue q
		JOIN customers c ON q.customer_id = c.id
		LEFT JOIN tables t ON c.table_id = t.id
		WHERE q.status IN ('entrou','cancelado','nao_respondeu')
	`
	args := []interface{}{}
	if dateFrom != "" {
		query += " AND DATE(q.created_at) >= ?"
		args = append(args, dateFrom)
	}
	if dateTo != "" {
		query += " AND DATE(q.created_at) <= ?"
		args = append(args, dateTo)
	}
	query += " ORDER BY q.created_at DESC LIMIT 100"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.QueueEntry
	for rows.Next() {
		e := &models.QueueEntry{Customer: &models.Customer{}}
		err := rows.Scan(
			&e.ID, &e.CustomerID, &e.Position, &e.Status, &e.CalledAt, &e.EnteredAt, &e.LeftAt, &e.CreatedAt,
			&e.Customer.Name, &e.Customer.WhatsApp, &e.Customer.People,
			&e.Customer.Preference, &e.Customer.Notes, &e.Customer.Status, &e.Customer.TableID, &e.Customer.TableNumber,
		)
		if err != nil {
			return nil, err
		}
		e.Customer.ID = e.CustomerID
		if e.EnteredAt != nil {
			e.WaitMinutes = int(e.EnteredAt.Sub(e.CreatedAt).Minutes())
			if e.LeftAt != nil {
				e.StayMinutes = int(e.LeftAt.Sub(*e.EnteredAt).Minutes())
			}
		} else if e.CalledAt != nil {
			e.WaitMinutes = int(e.CalledAt.Sub(e.CreatedAt).Minutes())
		} else {
			e.WaitMinutes = 0
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// GetDailyReport returns aggregated stats for a given date
func (s *QueueService) GetDailyReport(date string) (map[string]interface{}, error) {
	report := map[string]interface{}{}

	var totalEntered int
	database.DB.QueryRow(
		`SELECT COUNT(*) FROM queue WHERE status='entrou' AND DATE(created_at)=?`, date,
	).Scan(&totalEntered)

	var totalCancelled int
	database.DB.QueryRow(
		`SELECT COUNT(*) FROM queue WHERE status='cancelado' AND DATE(created_at)=?`, date,
	).Scan(&totalCancelled)

	var totalNoResponse int
	database.DB.QueryRow(
		`SELECT COUNT(*) FROM queue WHERE status='nao_respondeu' AND DATE(created_at)=?`, date,
	).Scan(&totalNoResponse)

	var avgWait float64
	database.DB.QueryRow(`
		SELECT COALESCE(AVG((JULIANDAY(entered_at)-JULIANDAY(created_at))*1440), 0)
		FROM queue WHERE status='entrou' AND DATE(created_at)=? AND entered_at IS NOT NULL
	`, date).Scan(&avgWait)

	var totalAdded int
	database.DB.QueryRow(
		`SELECT COUNT(*) FROM queue WHERE DATE(created_at)=?`, date,
	).Scan(&totalAdded)

	report["total_entered"] = totalEntered
	report["total_cancelled"] = totalCancelled
	report["total_no_response"] = totalNoResponse
	report["avg_wait_minutes"] = avgWait
	report["total_added"] = totalAdded

	return report, nil
}
