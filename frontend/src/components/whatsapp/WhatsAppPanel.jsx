import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { waAPI, messageAPI } from '../../api'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Send, 
  LogOut, 
  Unlink, 
  HelpCircle, 
  CheckCircle,
  ExternalLink,
  Info
} from 'lucide-react'

export default function WhatsAppPanel() {
  const { waStatus, setWaStatus, waQR, setWaQR } = useStore()
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste de conexão do sistema de fila. 🍽️')
  const [sendingTest, setSendingTest] = useState(false)

  // Load initial status and QR code
  useEffect(() => {
    setLoading(true)
    waAPI.qr()
      .then(d => {
        setWaStatus(d.status)
        setWaQR(d.qr || '')
      })
      .catch(() => {
        toast.error('Erro ao buscar status do WhatsApp')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Generate QR Code data URL when waQR changes
  useEffect(() => {
    if (waQR) {
      QRCode.toDataURL(waQR, { 
        width: 220, 
        margin: 1, 
        color: { 
          dark: '#0f0f13', // Near black for perfect scanning contrast
          light: '#ffffff' 
        } 
      })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [waQR])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await waAPI.connect()
      toast.success('Iniciando conexão...')
    } catch (err) {
      toast.error('Erro ao iniciar conexão: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await waAPI.disconnect()
      toast.success('WhatsApp desconectado!')
    } catch (err) {
      toast.error('Erro ao desconectar: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desvincular este dispositivo? Será necessário escanear o QR Code novamente para conectar.')) {
      return
    }
    setLoading(true)
    try {
      await waAPI.logout()
      toast.success('Dispositivo desvinculado com sucesso!')
    } catch (err) {
      toast.error('Erro ao desvincular: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async (e) => {
    e.preventDefault()
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error('Preencha todos os campos do teste')
      return
    }
    setSendingTest(true)
    try {
      await messageAPI.send({
        phone: testPhone,
        message: testMessage
      })
      toast.success('Mensagem de teste enviada com sucesso!')
    } catch (err) {
      toast.error('Erro ao enviar mensagem: ' + (err.response?.data?.error || err.message))
    } finally {
      setSendingTest(false)
    }
  }

  // Visual status indicators
  const statusColor = waStatus === 'connected' 
    ? 'bg-emerald-400' 
    : waStatus === 'connecting' 
      ? 'bg-amber-400' 
      : 'bg-red-400'

  const statusLabel = waStatus === 'connected' 
    ? 'Conectado' 
    : waStatus === 'connecting' 
      ? 'Conectando...' 
      : 'Desconectado'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
      
      {/* Connection management card */}
      <div className="card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <MessageSquare size={20} className="text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Status do WhatsApp</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${statusColor} ${waStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                  <span className="text-sm text-white/40">{statusLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected state view */}
          {waStatus === 'connected' && (
            <div className="space-y-4 my-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                  <div className="relative w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Wifi size={24} className="text-emerald-400" />
                  </div>
                </div>
                <p className="text-emerald-400 font-semibold text-base">WhatsApp Ativo e Conectado!</p>
                <p className="text-xs text-white/40 mt-1.5 max-w-xs mx-auto">
                  O sistema está pronto para enviar mensagens automáticas de confirmação, chamada e pedido pronto.
                </p>
              </div>
            </div>
          )}

          {/* Connecting state view with QR Code */}
          {waStatus === 'connecting' && (
            <div className="space-y-4 my-4">
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-48 h-48 block" />
                  </div>
                  <div className="bg-bg-3 border border-white/[0.07] rounded-xl p-4 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-accent" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Como Conectar</span>
                    </div>
                    <ol className="text-xs text-white/40 space-y-1.5 pl-4 list-decimal leading-relaxed">
                      <li>Abra o <strong>WhatsApp</strong> no seu celular.</li>
                      <li>Toque em <strong>Mais opções</strong> (três pontos) ou <strong>Configurações</strong>.</li>
                      <li>Selecione <strong>Dispositivos conectados</strong> e toque em <strong>Conectar dispositivo</strong>.</li>
                      <li>Aponte a câmera para este QR Code para concluir a conexão.</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw size={28} className="text-amber-400 animate-spin" />
                  <p className="text-sm text-white/40">Aguardando geração do QR Code...</p>
                  <p className="text-xs text-white/20 text-center max-w-[240px]">
                    Isso pode levar alguns segundos enquanto nos comunicamos com os servidores do WhatsApp.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Disconnected state view */}
          {waStatus === 'disconnected' && (
            <div className="space-y-4 my-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                  <WifiOff size={24} className="text-red-400" />
                </div>
                <p className="text-red-400 font-semibold text-base">WhatsApp Desconectado</p>
                <p className="text-xs text-white/40 mt-1.5 max-w-xs mx-auto">
                  Nenhuma mensagem será enviada aos clientes da fila de espera enquanto o WhatsApp estiver desconectado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons / Controls footer */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-wrap gap-2 justify-end">
          {waStatus === 'disconnected' && (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform active:scale-[0.99]"
            >
              {loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Wifi size={14} />
              )}
              Conectar WhatsApp
            </button>
          )}

          {waStatus === 'connecting' && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="btn-ghost w-full sm:w-auto text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center gap-2"
            >
              Cancelar Conexão
            </button>
          )}

          {waStatus === 'connected' && (
            <>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="btn-ghost w-full sm:w-auto text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <WifiOff size={14} />}
                Desconectar
              </button>
              
              <button
                onClick={handleLogout}
                disabled={loading}
                className="btn-ghost w-full sm:w-auto text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                Desvincular WhatsApp
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manual message sender panel */}
      <div className="space-y-6 flex flex-col">
        {/* Test Message Card */}
        <div className="card p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Send size={18} className="text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Enviar Mensagem de Teste</h2>
                <p className="text-xs text-white/40 mt-0.5">Valide a conexão enviando uma mensagem manual</p>
              </div>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Número de WhatsApp (com DDD)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: 11999999999"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={waStatus !== 'connected' || sendingTest}
                />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-1.5">Mensagem</label>
                <textarea
                  className="input w-full h-24 resize-none leading-relaxed text-xs"
                  placeholder="Digite sua mensagem de teste..."
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  disabled={waStatus !== 'connected' || sendingTest}
                />
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.05]">
            <button
              onClick={handleSendTest}
              disabled={waStatus !== 'connected' || sendingTest || !testPhone.trim() || !testMessage.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
            >
              {sendingTest ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Enviar Mensagem
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-bg-2 border border-white/[0.07] rounded-xl p-4 flex gap-3">
          <HelpCircle size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white/70">Sobre os Envios Automáticos</h4>
            <p className="text-[11px] text-white/40 leading-relaxed">
              As mensagens de chamada da fila utilizam templates customizáveis que podem ser configurados na aba 
              <strong> Configurações</strong>. Certifique-se de manter o celular conectado à internet e o WhatsApp ativo para evitar falhas nos envios.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
