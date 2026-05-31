package services

import (
	"database/sql"
	"restaurant-queue/database"
	"restaurant-queue/models"
	"time"
)

type TableService struct{}

func NewTableService() *TableService {
	return &TableService{}
}

func (s *TableService) GetAll() ([]*models.Table, error) {
	rows, err := database.DB.Query(`
		SELECT id, number, chairs, status, area, notes, created_at, updated_at
		FROM tables ORDER BY number ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []*models.Table
	for rows.Next() {
		t := &models.Table{}
		if err := rows.Scan(&t.ID, &t.Number, &t.Chairs, &t.Status, &t.Area, &t.Notes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}

	// Attach reserved customer info (status = chamado)
	for _, t := range tables {
		var name sql.NullString
		var queueID sql.NullInt64
		var calledAt sql.NullTime
		database.DB.QueryRow(`
			SELECT c.name, q.id, q.called_at
			FROM customers c
			JOIN queue q ON q.customer_id = c.id AND q.status = 'chamado'
			WHERE c.table_id = ? AND c.status = 'chamado'
			LIMIT 1
		`, t.ID).Scan(&name, &queueID, &calledAt)
		if name.Valid {
			n := name.String
			t.CustomerName = &n
		}
		if queueID.Valid {
			qid := int(queueID.Int64)
			t.CustomerQueueID = &qid
		}
		if calledAt.Valid {
			ca := calledAt.Time
			t.AssignedAt = &ca
		}
	}

	// Attach occupied customer info (status = entrou)
	for _, t := range tables {
		var name, phone sql.NullString
		var queueID sql.NullInt64
		var since sql.NullTime
		database.DB.QueryRow(`
			SELECT c.name, c.whatsapp, qo.id, qo.entered_at
			FROM customers c
			JOIN queue qo ON qo.customer_id = c.id AND qo.status = 'entrou'
			WHERE c.table_id = ? AND c.status = 'entrou'
			LIMIT 1
		`, t.ID).Scan(&name, &phone, &queueID, &since)
		if name.Valid {
			n := name.String
			t.OccupiedByName = &n
		}
		if phone.Valid {
			p := phone.String
			t.OccupiedByPhone = &p
		}
		if queueID.Valid {
			qid := int(queueID.Int64)
			t.OccupiedByQueueID = &qid
		}
		if since.Valid {
			s := since.Time
			t.OccupiedSince = &s
		}
	}

	return tables, nil
}

func (s *TableService) Create(number, chairs int, area, notes string) (*models.Table, error) {
	res, err := database.DB.Exec(
		`INSERT INTO tables (number, chairs, area, notes) VALUES (?,?,?,?)`,
		number, chairs, area, notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.Table{
		ID: int(id), Number: number, Chairs: chairs,
		Area: area, Notes: notes, Status: "livre",
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}, nil
}

func (s *TableService) UpdateStatus(id int, status string) error {
	_, err := database.DB.Exec(`UPDATE tables SET status=? WHERE id=?`, status, id)
	return err
}

func (s *TableService) Update(id, number, chairs int, area, notes, status string) error {
	_, err := database.DB.Exec(
		`UPDATE tables SET number=?, chairs=?, area=?, notes=?, status=? WHERE id=?`,
		number, chairs, area, notes, status, id,
	)
	return err
}

func (s *TableService) Delete(id int) error {
	_, err := database.DB.Exec(`DELETE FROM tables WHERE id=?`, id)
	return err
}

func (s *TableService) FindBestForPeople(people int) (*models.Table, error) {
	t := &models.Table{}
	err := database.DB.QueryRow(`
		SELECT id, number, chairs, status, area FROM tables
		WHERE status='livre' AND chairs >= ?
		ORDER BY chairs ASC LIMIT 1
	`, people).Scan(&t.ID, &t.Number, &t.Chairs, &t.Status, &t.Area)
	if err != nil {
		return nil, err
	}
	return t, nil
}
