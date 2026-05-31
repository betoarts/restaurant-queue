import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { LayoutDashboard, Users, Table2, MessageCircle, Settings, BarChart3 } from 'lucide-react'
import { useStore } from './store'
import { waAPI, settingsAPI } from './api'
import { useWebSocket } from './hooks/useWebSocket'
import DashboardStats from './components/dashboard/DashboardStats'
import TableMap from './components/tables/TableMap'
import QueuePanel from './components/queue/QueuePanel'
import QueueListView from './components/queue/QueueListView'
import NotifyModal from './components/whatsapp/NotifyModal'
import WhatsAppPanel from './components/whatsapp/WhatsAppPanel'
import TableCrud from './components/tables/TableCrud'
import TableEditModal from './components/tables/TableEditModal'
import HistoryView from './components/history/HistoryView'
import SettingsPage from './pages/SettingsPage'
import FullscreenButton from './components/FullscreenButton'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } })

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="font-mono text-xs text-white/30">{time.toLocaleTimeString('pt-BR')}</span>
}

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'queue', icon: Users, label: 'Fila' },
  { id: 'tables', icon: Table2, label: 'Mesas' },
  { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { id: 'history', icon: BarChart3, label: 'Historico' },
  { id: 'settings', icon: Settings, label: 'Configuracoes' },
]

function Inner() {
  const { activeTab, setActiveTab, waStatus, setWaStatus, settings, setSettings, theme, setTheme } = useStore()
  useWebSocket()

  // Load theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
  }, [])

  // Load settings
  useEffect(() => {
    settingsAPI.getAll().then(d => {
      setSettings(d)
      if (d.theme && d.theme !== theme) setTheme(d.theme)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    waAPI.status().then(d => setWaStatus(d.status)).catch(() => setWaStatus('disconnected'))
    const t = setInterval(() => {
      waAPI.status().then(d => setWaStatus(d.status)).catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [])

  const waColor = waStatus === 'connected' ? 'bg-emerald-400' : waStatus === 'connecting' ? 'bg-amber-400' : 'bg-red-400'
  const waLabel = waStatus === 'connected' ? 'WhatsApp conectado' : waStatus === 'connecting' ? 'Conectando...' : 'Desconectado'
  const restaurantName = settings.restaurant_name || 'Restaurante'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav className="nav-sidebar flex flex-col items-center py-4 gap-1">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center mb-4">
          <span className="text-bg-1 text-xs font-bold">{restaurantName.substring(0, 3).toUpperCase()}</span>
        </div>
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
              ${activeTab === id
                ? 'bg-accent/10 text-accent'
                : 'text-white/25 hover:text-white/60 hover:bg-bg-3'
              }`}
          >
            <Icon size={17} />
          </button>
        ))}
      </nav>

      {/* Main */}
      <div className="flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="topbar h-12 border-b flex items-center px-4 gap-3 flex-shrink-0">
          <span className="text-sm font-medium flex-1">{restaurantName}</span>
          
          <a href="/mobile" target="_blank" className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 rounded-full text-xs hover:bg-accent/20 transition-all font-semibold">
            📱 Versão Mobile
          </a>

          <button className="flex items-center gap-2 bg-bg-3 border border-white/[0.07] px-3 py-1.5 rounded-full text-xs hover:border-white/[0.15] transition-all">
            <div className={`w-1.5 h-1.5 rounded-full ${waColor} animate-pulse`} />
            <span>{waLabel}</span>
          </button>
          <FullscreenButton className="w-8 h-8 rounded-full bg-bg-3 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center border border-white/[0.07] transition-all" />
          <Clock />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(activeTab === 'dashboard' || activeTab === 'queue' || activeTab === 'tables') && (
              <DashboardStats />
            )}
            {activeTab === 'queue' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Fila Detalhada</span>
                </div>
                <QueueListView />
              </div>
            )}
            {(activeTab === 'dashboard' || activeTab === 'tables') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Mapa de Mesas</span>
                  <span className="text-xs text-white/20">Clique para alterar status</span>
                </div>
                <TableMap />
              </div>
            )}
            {activeTab === 'whatsapp' && <WhatsAppPanel />}
            {activeTab === 'history' && <HistoryView />}
            {activeTab === 'tables' && <TableCrud />}
            {activeTab === 'settings' && <SettingsPage />}
          </div>

          {/* Right queue panel */}
          <div className="w-80 panel-right border-l flex-shrink-0 overflow-hidden flex flex-col">
            <QueuePanel />
          </div>
        </div>
      </div>

      <NotifyModal />
      <TableEditModal />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Inner />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#17171e', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: '13px' },
          success: { iconTheme: { primary: '#00d97e', secondary: '#0f0f13' } },
        }}
      />
    </QueryClientProvider>
  )
}
