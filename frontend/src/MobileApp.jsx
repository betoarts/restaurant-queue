import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { Users, Table2 } from 'lucide-react'
import { useStore } from './store'
import { settingsAPI } from './api'
import { useWebSocket } from './hooks/useWebSocket'
import MobileQueue from './components/mobile/MobileQueue'
import MobileTables from './components/mobile/MobileTables'
import NotifyModal from './components/whatsapp/NotifyModal'
import FullscreenButton from './components/FullscreenButton'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } })

function MobileInner() {
  const [activeTab, setActiveTab] = useState('queue')
  const { setTheme, settings, setSettings } = useStore()
  useWebSocket()

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
  }, [])

  useEffect(() => {
    settingsAPI.getAll().then(d => {
      setSettings(d)
      if (d.theme) setTheme(d.theme)
    }).catch(() => {})
  }, [])

  const restaurantName = settings?.restaurant_name || 'Restaurante'

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-1 text-white pb-[60px]">
      {/* Mobile Topbar */}
      <div className="h-14 border-b border-white/[0.07] bg-bg-2 flex items-center justify-center px-4 shrink-0 shadow-sm z-10 relative">
        <span className="font-bold text-lg text-accent">{restaurantName}</span>
        <div className="absolute right-4">
          <FullscreenButton className="p-2 text-white/50 hover:text-white transition-colors" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'queue' ? <MobileQueue /> : <MobileTables />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-bg-2 border-t border-white/[0.07] flex items-center justify-around z-20 pb-safe">
        <button 
          onClick={() => setActiveTab('queue')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'queue' ? 'text-accent' : 'text-white/40'}`}
        >
          <Users size={22} />
          <span className="text-[10px] font-medium">Fila</span>
        </button>
        <button 
          onClick={() => setActiveTab('tables')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'tables' ? 'text-accent' : 'text-white/40'}`}
        >
          <Table2 size={22} />
          <span className="text-[10px] font-medium">Mesas</span>
        </button>
      </div>

      <NotifyModal />
    </div>
  )
}

export default function MobileApp() {
  return (
    <QueryClientProvider client={qc}>
      <MobileInner />
      <Toaster position="top-center" toastOptions={{
        style: { background: '#17171e', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: '13px' },
        success: { iconTheme: { primary: '#00d97e', secondary: '#0f0f13' } }
      }} />
    </QueryClientProvider>
  )
}
