package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init() error {
	var err error
	DB, err = sql.Open("sqlite3", "./restaurant.db?_foreign_keys=on")
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	return migrate()
}

func migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tables (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			number INTEGER NOT NULL UNIQUE,
			chairs INTEGER NOT NULL DEFAULT 4,
			status TEXT NOT NULL DEFAULT 'livre' CHECK(status IN ('livre','ocupada','reservada','limpeza')),
			area TEXT NOT NULL DEFAULT 'Interna',
			notes TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS customers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			whatsapp TEXT NOT NULL,
			people INTEGER NOT NULL DEFAULT 1,
			preference TEXT DEFAULT '',
			notes TEXT DEFAULT '',
			status TEXT NOT NULL DEFAULT 'aguardando' CHECK(status IN ('aguardando','chamado','entrou','cancelado','nao_respondeu')),
			table_id INTEGER REFERENCES tables(id),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS queue (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
			position INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'aguardando' CHECK(status IN ('aguardando','chamado','entrou','cancelado','nao_respondeu')),
			called_at DATETIME,
			entered_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS whatsapp_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id INTEGER REFERENCES customers(id),
			phone TEXT NOT NULL,
			message TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
			sent_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS whatsapp_sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_data TEXT,
			status TEXT NOT NULL DEFAULT 'disconnected',
			connected_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TRIGGER IF NOT EXISTS update_tables_timestamp
			AFTER UPDATE ON tables
			BEGIN UPDATE tables SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,

		`CREATE TRIGGER IF NOT EXISTS update_customers_timestamp
			AFTER UPDATE ON customers
			BEGIN UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,

		// Settings key-value store
		`CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Seed default settings
		`INSERT OR IGNORE INTO settings (key, value) VALUES
			('restaurant_name', 'Restaurante Bella Vista'),
			('theme', 'dark'),
			('msg_confirmation', 'Olá {nome}! Você foi adicionado(a) à fila de espera.📍 Posição atual: *{posicao}º* Assim que sua mesa estiver disponível, você receberá uma mensagem aqui. Obrigado pela paciência! 🙏'),
			('msg_notification', 'Olá {nome}! 🍽️ Sua mesa número *{mesa}* já está disponível. Favor dirigir-se à recepção do restaurante. Aguardaremos você por *5 minutos*. 😊'),
			('msg_order_ready', 'Olá {nome}! 🍽️ Seu pedido na mesa *{mesa}* está pronto! Dirija-se ao balcão para retirar. Bom apetite! 😋'),
			('preferences', '["Interna","Externa","VIP","Varanda"]')
		`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			log.Printf("Migration error: %s\nQuery: %s", err, q)
			return err
		}
	}

	// Adição de nova coluna segura
	DB.Exec(`ALTER TABLE queue ADD COLUMN left_at DATETIME`)

	log.Println("✅ Database migrations completed")
	return nil
}
