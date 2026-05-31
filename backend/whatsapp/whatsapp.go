package whatsapp

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/mdp/qrterminal"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/events"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	_ "github.com/mattn/go-sqlite3"
	"google.golang.org/protobuf/proto"
	"restaurant-queue/database"
)

type Service struct {
	client         *whatsmeow.Client
	Status         string // connected, disconnected, connecting
	QRChan         chan string
	CurrentQR      string
	OnStatusChange func(status string, qr string)
}

func NewService() *Service {
	return &Service{
		Status: "disconnected",
		QRChan: make(chan string, 1),
	}
}

func (s *Service) updateStatus(status string, qr string) {
	s.Status = status
	s.CurrentQR = qr
	if s.OnStatusChange != nil {
		s.OnStatusChange(status, qr)
	}
}

func (s *Service) Start() {
	s.updateStatus("connecting", "")
	dbLog := waLog.Stdout("Database", "DEBUG", true)

	container, err := sqlstore.New(context.Background(), "sqlite3", "file:whatsapp.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Printf("WA DB error: %v", err)
		s.updateStatus("disconnected", "")
		return
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Printf("WA device error: %v", err)
		s.updateStatus("disconnected", "")
		return
	}

	clientLog := waLog.Stdout("Client", "INFO", true)
	s.client = whatsmeow.NewClient(deviceStore, clientLog)
	s.client.AddEventHandler(s.handleWhatsAppEvent)

	if s.client.Store.ID == nil {
		// New login — show QR code
		qrChan, _ := s.client.GetQRChannel(context.Background())
		if err := s.client.Connect(); err != nil {
			log.Printf("WA connect error: %v", err)
			s.updateStatus("disconnected", "")
			return
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				s.CurrentQR = evt.Code
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				// Also send code to channel for API endpoint
				select {
				case s.QRChan <- evt.Code:
				default:
				}
				s.updateStatus("connecting", evt.Code)
			} else if evt.Event == "success" {
				s.updateStatus("connected", "")
				log.Println("✅ WhatsApp connected!")
			}
		}
	} else {
		// Already have session, reconnect
		if err := s.client.Connect(); err != nil {
			log.Printf("WA reconnect error: %v", err)
			s.updateStatus("disconnected", "")
			return
		}
		s.updateStatus("connected", "")
		log.Println("✅ WhatsApp reconnected!")
	}

	// Store session status
	database.DB.Exec(`
		INSERT INTO whatsapp_sessions (status, connected_at)
		VALUES (?, CURRENT_TIMESTAMP)
	`, s.Status)
}

func (s *Service) SendMessage(phone, message string, customerID int) error {
	if s.client == nil || !s.client.IsConnected() {
		s.logMessage(phone, message, customerID, "failed")
		return fmt.Errorf("WhatsApp not connected")
	}

	// Format phone: remove non-digits
	formatted := ""
	for _, c := range phone {
		if c >= '0' && c <= '9' {
			formatted += string(c)
		}
	}
	// Add Brazil country code if needed (DDD + number)
	if len(formatted) == 10 || len(formatted) == 11 {
		formatted = "55" + formatted
	}

	var jid types.JID
	// Use IsOnWhatsApp to resolve the correct JID (handles the 9-digit issue in Brazil automatically)
	resp, err := s.client.IsOnWhatsApp(context.Background(), []string{"+" + formatted})
	if err == nil && len(resp) > 0 && resp[0].IsIn {
		jid = resp[0].JID
	} else {
		// Fallback
		parsedJid, err := types.ParseJID(formatted + "@s.whatsapp.net")
		if err != nil {
			s.logMessage(phone, message, customerID, "failed")
			return fmt.Errorf("invalid phone: %v", err)
		}
		jid = parsedJid
	}

	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	_, err = s.client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		s.logMessage(phone, message, customerID, "failed")
		return err
	}

	s.logMessage(phone, message, customerID, "sent")
	return nil
}

func (s *Service) logMessage(phone, message string, customerID int, status string) {
	now := time.Now()
	var err error
	if customerID > 0 {
		_, err = database.DB.Exec(
			`INSERT INTO whatsapp_messages (customer_id, phone, message, status, sent_at) VALUES (?, ?, ?, ?, ?)`,
			customerID, phone, message, status, now,
		)
	} else {
		_, err = database.DB.Exec(
			`INSERT INTO whatsapp_messages (phone, message, status, sent_at) VALUES (?, ?, ?, ?)`,
			phone, message, status, now,
		)
	}
	if err != nil {
		log.Printf("Failed to log WhatsApp message: %v", err)
	}
}

func (s *Service) GetStatus() string {
	if s.client == nil {
		return "disconnected"
	}
	if s.client.IsConnected() && s.client.Store.ID != nil {
		return "connected"
	}
	return s.Status
}

func (s *Service) Disconnect() {
	if s.client != nil {
		s.client.Disconnect()
		s.updateStatus("disconnected", "")
	}
}

func (s *Service) Logout() error {
	if s.client != nil {
		err := s.client.Logout()
		s.updateStatus("disconnected", "")
		return err
	}
	return nil
}

func (s *Service) Connect() error {
	if s.client == nil {
		go s.Start()
		return nil
	}
	if s.client.IsConnected() && s.client.Store.ID != nil {
		return nil
	}

	s.updateStatus("connecting", "")

	if s.client.Store.ID == nil {
		go func() {
			qrChan, err := s.client.GetQRChannel(context.Background())
			if err != nil {
				log.Printf("Failed to get QR channel: %v", err)
				s.updateStatus("disconnected", "")
				return
			}
			if err := s.client.Connect(); err != nil {
				log.Printf("WA connect error: %v", err)
				s.updateStatus("disconnected", "")
				return
			}
			for evt := range qrChan {
				if evt.Event == "code" {
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
					select {
					case s.QRChan <- evt.Code:
					default:
					}
					s.updateStatus("connecting", evt.Code)
				} else if evt.Event == "success" {
					s.updateStatus("connected", "")
					log.Println("✅ WhatsApp connected!")
				}
			}
		}()
	} else {
		go func() {
			if err := s.client.Connect(); err != nil {
				log.Printf("WA reconnect error: %v", err)
				s.updateStatus("disconnected", "")
				return
			}
			s.updateStatus("connected", "")
			log.Println("✅ WhatsApp reconnected!")
		}()
	}
	return nil
}

func (s *Service) handleWhatsAppEvent(evt interface{}) {
	switch evt.(type) {
	case *events.Connected:
		if s.client.Store.ID != nil {
			s.updateStatus("connected", "")
		}
	case *events.Disconnected:
		s.updateStatus("disconnected", "")
	case *events.LoggedOut:
		s.updateStatus("disconnected", "")
	}
}

// Removed formatPhone function

func getSetting(key string) string {
	var val string
	database.DB.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&val)
	return val
}

func applyTemplate(tmpl string, vars map[string]string) string {
	result := tmpl
	for k, v := range vars {
		result = strings.ReplaceAll(result, "{"+k+"}", v)
	}
	return result
}

func firstName(fullName string) string {
	for i, c := range fullName {
		if c == ' ' {
			return fullName[:i]
		}
	}
	return fullName
}

// BuildNotificationMessage creates the WhatsApp message text
func BuildNotificationMessage(customerName string, tableNum int) string {
	tmpl := getSetting("msg_notification")
	if tmpl == "" {
		return fmt.Sprintf("Olá %s! 🍽️\n\nSua mesa número *%d* já está disponível.\nFavor dirigir-se à recepção do restaurante.\n\nAguardaremos você por *5 minutos*. 😊", firstName(customerName), tableNum)
	}
	return applyTemplate(tmpl, map[string]string{
		"nome":  firstName(customerName),
		"mesa":  fmt.Sprintf("%d", tableNum),
	})
}

// BuildConfirmationMessage creates the queue confirmation message
func BuildConfirmationMessage(customerName string, position int) string {
	tmpl := getSetting("msg_confirmation")
	if tmpl == "" {
		return fmt.Sprintf("Olá %s! Você foi adicionado(a) à fila de espera.\n\n📍 Posição atual: *%dº*\n\nAssim que sua mesa estiver disponível, você receberá uma mensagem aqui. Obrigado pela paciência! 🙏", firstName(customerName), position)
	}
	return applyTemplate(tmpl, map[string]string{
		"nome":     firstName(customerName),
		"posicao":  fmt.Sprintf("%d", position),
	})
}

// BuildOrderReadyMessage creates the "order ready" WhatsApp message
func BuildOrderReadyMessage(customerName string, tableNum int) string {
	tmpl := getSetting("msg_order_ready")
	if tmpl == "" {
		return fmt.Sprintf("Olá %s! 🍽️\n\nSeu pedido na mesa *%d* está pronto!\nDirija-se ao balcão para retirar.\n\nBom apetite! 😋", firstName(customerName), tableNum)
	}
	return applyTemplate(tmpl, map[string]string{
		"nome": firstName(customerName),
		"mesa": fmt.Sprintf("%d", tableNum),
	})
}
