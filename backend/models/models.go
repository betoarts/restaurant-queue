package models

import "time"

type Table struct {
	ID              int        `json:"id"`
	Number          int        `json:"number"`
	Chairs          int        `json:"chairs"`
	Status          string     `json:"status"` // livre, ocupada, reservada, limpeza
	Area            string     `json:"area"`   // Interna, Externa, VIP, Varanda
	Notes           string     `json:"notes"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	CustomerName    *string    `json:"customer_name,omitempty"`
	CustomerQueueID *int       `json:"customer_queue_id,omitempty"`
	AssignedAt      *time.Time `json:"assigned_at,omitempty"`
	OccupiedByName    *string    `json:"occupied_by,omitempty"`
	OccupiedByPhone   *string    `json:"occupied_phone,omitempty"`
	OccupiedByQueueID *int       `json:"occupied_queue_id,omitempty"`
	OccupiedSince     *time.Time `json:"occupied_since,omitempty"`
}

type Customer struct {
	ID         int        `json:"id"`
	Name       string     `json:"name"`
	WhatsApp   string     `json:"whatsapp"`
	People     int        `json:"people"`
	Preference string     `json:"preference"`
	Notes      string     `json:"notes"`
	Status     string     `json:"status"` // aguardando, chamado, entrou, cancelado, nao_respondeu
	TableID    *int       `json:"table_id,omitempty"`
	TableNumber *int      `json:"table_number,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type QueueEntry struct {
	ID         int        `json:"id"`
	CustomerID int        `json:"customer_id"`
	Customer   *Customer  `json:"customer,omitempty"`
	Position   int        `json:"position"`
	Status     string     `json:"status"`
	CalledAt   *time.Time `json:"called_at,omitempty"`
	EnteredAt  *time.Time `json:"entered_at,omitempty"`
	LeftAt     *time.Time `json:"left_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	WaitMinutes int       `json:"wait_minutes"`
	StayMinutes int       `json:"stay_minutes"`
}

type WhatsAppMessage struct {
	ID         int        `json:"id"`
	CustomerID *int       `json:"customer_id,omitempty"`
	Phone      string     `json:"phone"`
	Message    string     `json:"message"`
	Status     string     `json:"status"` // pending, sent, failed
	SentAt     *time.Time `json:"sent_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type DashboardStats struct {
	TotalWaiting    int     `json:"total_waiting"`
	TotalCalled     int     `json:"total_called"`
	TablesOccupied  int     `json:"tables_occupied"`
	TablesFree      int     `json:"tables_free"`
	TablesReserved  int     `json:"tables_reserved"`
	TablesCleaning  int     `json:"tables_cleaning"`
	AvgWaitMinutes  float64 `json:"avg_wait_minutes"`
	AttendedToday   int     `json:"attended_today"`
	WhatsAppStatus  string  `json:"whatsapp_status"`
}
