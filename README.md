# 🍽️ Restaurant Queue — Sistema de Controle de Fila Inteligente

Sistema completo para gerenciamento de fila de espera em restaurantes com integração WhatsApp em tempo real. Permite controlar mesas, clientes em espera, notificações automáticas e dashboards operacionais.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Go 1.21+, Gin, SQLite, WebSocket (gorilla/websocket), whatsmeow |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, React Query v3, Zustand |
| WhatsApp | whatsmeow (WhatsApp Web multi-device via QR Code) |

---

## Estrutura do Projeto

```
restaurant-queue/
├── backend/
│   ├── main.go                  # Entry point — inicializa DB, WhatsApp, WebSocket, Gin
│   ├── go.mod / go.sum          # Dependências Go
│   ├── database/database.go     # Conexão SQLite, migrations, seed data
│   ├── models/models.go         # Structs: Table, Customer, QueueEntry, WhatsAppMessage, DashboardStats
│   ├── routes/routes.go         # Todos os 21 endpoints REST + WebSocket
│   ├── services/
│   │   ├── queue_service.go     # Lógica de fila: CRUD, status, histórico, relatórios
│   │   └── table_service.go     # Lógica de mesas: CRUD, status, busca por capacidade
│   ├── websocket/hub.go         # Hub WebSocket — broadcast em tempo real
│   └── whatsapp/whatsapp.go     # Conexão WhatsApp, envio de mensagens, templates
├── frontend/
│   ├── index.html
│   ├── vite.config.js           # Vite + proxy para API/WS no backend
│   ├── tailwind.config.js       # Tema customizado (cores bg-1 a bg-4, accent #00d97e)
│   └── src/
│       ├── main.jsx             # Entry point React (Roteia Desktop vs Mobile)
│       ├── App.jsx              # Layout shell Desktop: sidebar, topbar, abas
│       ├── MobileApp.jsx        # Layout shell Mobile: Bottom Navigation (/mobile)
│       ├── api.js               # Cliente Axios — todos os endpoints
│       ├── store.js             # Zustand — estado global
│       ├── index.css            # Estilos globais, tema claro/escuro
│       ├── components/
│       │   ├── dashboard/DashboardStats.jsx  # Grid de 8 cards de métricas
│       │   ├── history/HistoryView.jsx       # Histórico + relatório diário
│       │   ├── queue/
│       │   │   ├── QueuePanel.jsx            # Painel lateral da fila + formulário
│       │   │   └── EditEntryModal.jsx        # Modal editar entrada da fila
│       │   ├── mobile/
│       │   │   ├── MobileQueue.jsx           # Gestão da fila via celular (garçom)
│       │   │   └── MobileTables.jsx          # Busca de mesas e ações via celular
│       │   ├── tables/
│       │   │   ├── TableMap.jsx              # Mapa visual interativo de mesas
│       │   │   ├── TableCrud.jsx             # CRUD de mesas (adicionar/editar/remover)
│       │   │   └── TableEditModal.jsx        # Modal editar mesa
│       │   └── whatsapp/
│       │       ├── NotifyModal.jsx           # Modal notificação WhatsApp
│       │       └── WhatsAppPanel.jsx         # Painel Gerenciador WhatsApp (QR Code + Ações)
│       ├── pages/
│       │   └── SettingsPage.jsx              # Página de configurações
│       └── hooks/
│           └── useWebSocket.js               # Hook WebSocket com reconexão automática
```

---

## 🚀 Setup

### Pré-requisitos

- Go 1.21+
- Node.js 18+
- gcc (para sqlite3: `sudo apt install gcc` no Linux)

### Backend

```bash
cd backend
go mod tidy
go build -o server .
./server
```

Servidor sobe em `http://localhost:8080`.

Na primeira execução, um QR Code aparece no terminal e na aba **WhatsApp** do frontend (ao clicar em Conectar). Escaneie com o WhatsApp: **Configurações → Dispositivos conectados → Conectar dispositivo**. A sessão fica salva em `whatsapp.db`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse pelo navegador em `http://localhost:3000`.
Para a versão móvel (garçons no salão), acesse `http://SEU_IP_NA_REDE:3000/mobile` pelo celular.

---

## 📡 API REST — 21 Endpoints

### Health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (status + WhatsApp) |

### Dashboard

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/stats` | Estatísticas do dashboard |

### Fila (Queue)

| Método | Rota | Body | Descrição |
|--------|------|------|-----------|
| GET | `/api/queue` | — | Listar fila ativa (aguardando + chamado) |
| POST | `/api/queue` | `name`, `whatsapp`, `people`, `preference?`, `notes?` | Adicionar cliente à fila |
| PUT | `/api/queue/:id` | `name`, `whatsapp`, `people`, `preference?`, `notes?` | Editar entrada da fila |
| PATCH | `/api/queue/:id/status` | `status` | Atualizar status (entrou/cancelado/nao_respondeu) |
| DELETE | `/api/queue/:id` | — | Remover da fila (status → cancelado) |

### Histórico e Relatórios

| Método | Rota | Query | Descrição |
|--------|------|-------|-----------|
| GET | `/api/queue/history` | `from?`, `to?` | Entradas concluídas/canceladas |
| GET | `/api/reports/daily` | `date` (obrigatório) | Relatório diário agregado |

### Mesas (Tables)

| Método | Rota | Body | Descrição |
|--------|------|------|-----------|
| GET | `/api/tables` | — | Listar mesas (com cliente vinculado se houver) |
| POST | `/api/tables` | `number`, `chairs`, `area`, `notes?` | Criar mesa |
| PUT | `/api/tables/:id` | `number`, `chairs`, `area`, `notes?`, `status?` | Editar mesa |
| PATCH | `/api/tables/:id/status` | `status` | Alterar status (livre/ocupada/reservada/limpeza) |
| DELETE | `/api/tables/:id` | — | Remover mesa |

### Notificações

| Método | Rota | Body | Descrição |
|--------|------|------|-----------|
| POST | `/api/notify` | `customer_name`, `phone`, `table_number`, `queue_id?`, `table_id?` | Enviar notificação WhatsApp + vincular cliente à mesa |
| POST | `/api/send-message` | `phone`, `message` | Enviar mensagem WhatsApp customizada |

### WhatsApp

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/whatsapp/status` | Status da conexão |
| GET | `/api/whatsapp/qr` | QR Code atual (`qr` + `status`) |
| POST | `/api/whatsapp/connect` | Conectar WhatsApp / Gerar QR Code |
| POST | `/api/whatsapp/disconnect` | Desconectar temporariamente o WhatsApp |
| POST | `/api/whatsapp/logout` | Desvincular/Desparear dispositivo |

### Configurações

| Método | Rota | Body | Descrição |
|--------|------|------|-----------|
| GET | `/api/settings` | — | Retorna todas configs (chave-valor) |
| PUT | `/api/settings` | `{key: value, ...}` | Atualiza configs (upsert) |

---

## 📨 Eventos WebSocket

Conexão em `/ws`. Eventos enviados pelo servidor:

| Tipo | Payload | Gatilho |
|------|---------|---------|
| `queue_updated` | `entry` ou `{removed: id}` ou `{updated: id}` | Fila alterada |
| `queue_status_changed` | `{id, status}` | Status de entrada mudou |
| `table_updated` | `table` ou `{id, status}` ou `{deleted: id}` | Mesa alterada |
| `notification_sent` | `{customer, table}` | WhatsApp enviado |
| `suggest_call` | `{queue_entry, table_id}` | Mesa liberada → sugestão de próximo cliente |
| `whatsapp_status` | `{status, qr}` | Mudança no status de conexão do WhatsApp ou novo QR Code gerado |

---

## 🗄️ Banco de Dados

SQLite local (`restaurant.db`). 6 tabelas:

### `tables`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INTEGER PK | — |
| number | INTEGER UNIQUE | Número da mesa |
| chairs | INTEGER (default 4) | Quantidade de cadeiras |
| status | TEXT | `livre` / `ocupada` / `reservada` / `limpeza` |
| area | TEXT | Área da mesa (Dinâmica, configurável no painel) |
| notes | TEXT | Observações |
| created_at / updated_at | DATETIME | Timestamps |

### `customers`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INTEGER PK | — |
| name | TEXT | Nome do cliente |
| whatsapp | TEXT | Número WhatsApp |
| people | INTEGER | Quantidade de pessoas |
| preference | TEXT | Preferência de área |
| notes | TEXT | Observações |
| status | TEXT | `aguardando` / `chamado` / `entrou` / `cancelado` / `nao_respondeu` |
| table_id | INTEGER FK | Mesa vinculada |
| created_at / updated_at | DATETIME | Timestamps |

### `queue`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INTEGER PK | — |
| customer_id | INTEGER FK | Referência ao cliente |
| position | INTEGER | Posição na fila |
| status | TEXT | Igual customers.status |
| called_at | DATETIME | Momento da notificação |
| entered_at | DATETIME | Momento que entrou na mesa |
| created_at | DATETIME | Timestamp |

### `whatsapp_messages`
Log de todas as mensagens enviadas (com status `sent` ou `failed`).

### `whatsapp_sessions`
Registro de sessões do WhatsApp.

### `settings`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| key | TEXT PK | Chave da configuração |
| value | TEXT | Valor |
| updated_at | DATETIME | Última atualização |

**Chaves padrão**: `restaurant_name`, `theme`, `msg_confirmation`, `msg_notification`, `msg_order_ready`, `preferences`.

---

## 🔄 Fluxo Principal

```
1. Cliente chega ao restaurante
2. Recepcionista adiciona na fila (nome, WhatsApp, nº pessoas, preferência)
3. Confirmação automática via WhatsApp com posição na fila
4. Mesa é liberada → sistema sugere próximo cliente compatível
5. Garçom clica "Notificar" → cliente recebe WhatsApp com nº da mesa
6. Mesa aparece como "Reservada" com nome do cliente + timer
7. Cliente chega → clique na mesa confirma entrada → mesa fica "Ocupada"
8. Mesa ocupada mostra nome do cliente + timer de permanência
9. Botão "Pedido Pronto" na mesa → envia WhatsApp avisando
10. Botão "Desocupar" → mesa vai para "Limpeza" → próximo clique → "Livre"
```

### Máquina de estados da mesa

```
Livre → Ocupada → Limpeza → Livre
  ↑        ↑                   
  │        └── Confirmar entrada (via notificação ou app mobile)
  └── Reservada (após notificar cliente da fila)
```

### Operação Mobile (Salão)
Para facilitar o fluxo, a aplicação possui uma **Versão Mobile Dedicada** (`/mobile`) acessível via rede local. 
Ela substitui o mapa complexo por botões de ações rápidas ("Pedido Pronto", "Desocupar" e "Buscar por Número"), permitindo que a equipe cadastre pessoas na fila e altere status das mesas diretamente na mesa do cliente.

### Máquina de estados do cliente na fila

```
Aguardando → Chamado (notificação enviada) → Entrou (confirmado na mesa)
              ↘ Cancelado / Não Respondeu
```

---

## ⚙️ Página de Configurações

Acessível pela aba **Configurações** (ícone ⚙):

| Seção | Descrição |
|-------|-----------|
| **Restaurante** | Nome exibido na topbar e logo |
| **Aparência** | Tema Escuro / Claro (persiste no banco e localStorage) |
| **Templates** | 3 mensagens editáveis com variáveis `{nome}`, `{mesa}`, `{posicao}` |
| **Preferências** | Lista de áreas customizável (adicionar/remover) |

As preferências de área são usadas em todos os selects do sistema (cadastro de cliente, edição, CRUD de mesas).

---

## 📊 Dashboard

Métricas em tempo real (atualização a cada 10s):

- Clientes aguardando / chamados / atendidos hoje
- Mesas livres / ocupadas / reservadas / em limpeza
- Tempo médio de espera

---

## 🎨 Temas

Tema escuro (padrão) e claro. Alternância via Configurações ou direto no store Zustand. Cores definidas em `tailwind.config.js` e variáveis CSS em `index.css`.

---

## 🔧 Variáveis de Ambiente

```env
PORT=8080          # porta do servidor (padrão: 8080)
GIN_MODE=release   # produção (suprime debug logs)
```

---

## 🏗️ Arquitetura

```
┌─────────────┐     HTTP/WS      ┌─────────────┐
│   Frontend  │ ◄──────────────► │   Backend    │
│  React/Vite │   localhost:8080 │   Go/Gin     │
│  :3000      │                  │   :8080      │
└─────────────┘                  └──────┬──────┘
                                        │
                          ┌─────────────┼─────────────┐
                          │             │             │
                     ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
                     │ SQLite  │  │  WebSocket│ │WhatsApp │
                     │ (local) │  │   Hub    │  │ (whats- │
                     │         │  │ real-time │  │  meow)  │
                     └─────────┘  └──────────┘  └─────────┘
```

- **Backend**: Gin com handlers inline (sem controllers separados). Serviços injetados via `routes.Register()`.
- **Frontend**: SPA sem router — navegação por abas controladas via Zustand `activeTab`. Dados via React Query com refetch automático. Atualizações em tempo real via WebSocket.
- **WhatsApp**: Conexão multi-device via whatsmeow. QR Code exposto em endpoint HTTP. Mensagens persistidas na tabela `whatsapp_messages`.
