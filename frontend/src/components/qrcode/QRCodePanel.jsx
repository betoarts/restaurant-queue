import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { QrCode, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'
import { waAPI } from '../../api'

export default function QRCodePanel() {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const { data } = useQuery('qr', waAPI.qr, { refetchInterval: 3000 })

  useEffect(() => {
    if (data?.qr) {
      QRCode.toDataURL(data.qr, { width: 220, margin: 1, color: { dark: '#00d97e', light: '#0f0f13' } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [data?.qr])

  const status = data?.status || 'disconnected'
  const statusColor = status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-red-400'
  const statusLabel = status === 'connected' ? 'Conectado' : status === 'connecting' ? 'Aguardando QR Code...' : 'Desconectado'

  return (
    <div className="card p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <QrCode size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Conexao WhatsApp</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
            <span className="text-sm text-white/40">{statusLabel}</span>
          </div>
        </div>
      </div>

      {status === 'connecting' && qrDataUrl && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl flex items-center justify-center">
            <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-55 h-55" />
          </div>
          <div className="bg-bg-3 border border-white/[0.07] rounded-xl p-4">
            <p className="text-sm text-white/60 mb-3">Para conectar:</p>
            <ol className="text-sm text-white/40 space-y-2 pl-4 list-decimal">
              <li>Abra o WhatsApp no celular</li>
              <li>Va em <strong>Configuracoes → Dispositivos conectados → Conectar dispositivo</strong></li>
              <li>Escaneie o QR Code acima</li>
            </ol>
          </div>
        </div>
      )}

      {status === 'connecting' && !qrDataUrl && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <RefreshCw size={32} className="text-amber-400 animate-spin" />
          <p className="text-sm text-white/40">Aguardando geracao do QR Code...</p>
          <p className="text-xs text-white/25">Inicie o servidor Go para conectar o WhatsApp</p>
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
            <Wifi size={32} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-emerald-400 font-medium">WhatsApp conectado!</p>
            <p className="text-sm text-white/40 mt-1">Pronto para enviar e receber mensagens.</p>
          </div>
        </div>
      )}

      {status === 'disconnected' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <WifiOff size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium">WhatsApp desconectado</p>
          <p className="text-sm text-white/40 mt-1">
            Inicie o servidor Go para conectar. O QR Code aparecera aqui automaticamente.
          </p>
        </div>
      )}
    </div>
  )
}
