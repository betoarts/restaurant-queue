import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Utensils, DoorOpen } from 'lucide-react'
import { tablesAPI, queueAPI, messageAPI } from '../../api'
import { useStore } from '../../store'

const STATUS_CONFIG = {
  livre:     { color: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400', dot: 'bg-emerald-400', label: 'Livre' },
  ocupada:   { color: 'border-red-500/25 bg-red-500/6 text-red-400', dot: 'bg-red-400', label: 'Ocupada' },
  reservada: { color: 'border-amber-500/25 bg-amber-500/5 text-amber-400', dot: 'bg-amber-400', label: 'Reservada' },
  limpeza:   { color: 'border-blue-500/25 bg-blue-500/5 text-blue-400', dot: 'bg-blue-400', label: 'Limpeza' },
}

const CYCLE = { livre: 'ocupada', ocupada: 'limpeza', limpeza: 'livre', reservada: 'livre' }

function ElapsedTimer({ since }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(i)
  }, [])
  const segundos = Math.floor((Date.now() - new Date(since).getTime()) / 1000)
  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  return (
    <span className="text-[10px] text-amber-400/70 font-mono tabular-nums">
      {min}:{sec.toString().padStart(2, '0')}
    </span>
  )
}

export default function TableMap() {
  const qc = useQueryClient()
  const { openNotifyModal } = useStore()

  const { data: tables = [] } = useQuery('tables', tablesAPI.getAll, { refetchInterval: 10000 })

  const statusMut = useMutation(({ id, status }) => tablesAPI.updateStatus(id, status), {
    onSuccess: (_, vars) => {
      qc.invalidateQueries('tables')
      qc.invalidateQueries('stats')
      toast.success(`Mesa atualizada: ${vars.status}`)
    },
  })

  const handleConfirmEntry = async (table) => {
    try {
      await Promise.all([
        queueAPI.updateStatus(table.customer_queue_id, 'entrou'),
        tablesAPI.updateStatus(table.id, 'ocupada'),
      ])
      qc.invalidateQueries('tables')
      qc.invalidateQueries('queue')
      qc.invalidateQueries('stats')
      toast.success(`${table.customer_name} entrou na mesa ${table.number}!`)
    } catch (err) {
      toast.error('Erro ao confirmar entrada')
    }
  }

  const handleOrderReady = async (table) => {
    try {
      const name = (table.occupied_by || '').split(' ')[0]
      const msg = `Olá ${name}! 🍽️\n\nSeu pedido na mesa *${table.number}* está pronto!\nDirija-se ao balcão para retirar.\n\nBom apetite! 😋`
      await messageAPI.send({ phone: table.occupied_phone, message: msg })
      toast.success(`Mensagem enviada para ${name}!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar mensagem')
    }
  }

  const handleVacate = async (table) => {
    try {
      await tablesAPI.updateStatus(table.id, 'limpeza')
      qc.invalidateQueries('tables')
      qc.invalidateQueries('stats')
      toast.success(`Mesa ${table.number} desocupada`)
    } catch (err) {
      toast.error('Erro ao desocupar mesa')
    }
  }

  const byArea = (tables || []).reduce((acc, t) => {
    const a = t.area || 'Interna'
    if (!acc[a]) acc[a] = []
    acc[a].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-white/40">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Areas */}
      {Object.entries(byArea).map(([area, areaTable]) => (
        <div key={area}>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 font-medium">{area}</p>
          <div className="grid grid-cols-5 gap-2">
            {areaTable.map(t => {
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.livre
              const hasReservedCustomer = t.status === 'reservada' && t.customer_name
              const hasOccupiedCustomer = t.status === 'ocupada' && t.occupied_by

              // Occupied table with customer: name + action buttons
              if (hasOccupiedCustomer) {
                return (
                  <div
                    key={t.id}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 relative ${cfg.color}`}
                    title={`${t.occupied_by} — ocupando ha ${t.occupied_since ? Math.floor((Date.now() - new Date(t.occupied_since).getTime()) / 60000) : '?'}min`}
                  >
                    <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className="absolute top-1.5 left-2 text-[11px] font-bold opacity-60">{t.number}</span>
                    <span className="text-xs font-semibold leading-tight truncate max-w-[80%]">{t.occupied_by.split(' ')[0]}</span>
                    {t.occupied_since && <ElapsedTimer since={t.occupied_since} />}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOrderReady(t) }}
                        className="w-10 h-10 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center
                                   hover:bg-accent/20 transition-colors text-accent"
                        title="Pedido Pronto"
                      >
                        <Utensils size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVacate(t) }}
                        className="w-10 h-10 rounded-md bg-bg-3 border border-white/[0.07] flex items-center justify-center
                                   hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-white/40 transition-all"
                        title="Desocupar"
                      >
                        <DoorOpen size={18} />
                      </button>
                    </div>
                  </div>
                )
              }

              // Reserved table with customer: name + timer + confirm
              if (hasReservedCustomer) {
                return (
                  <motion.button
                    key={t.id}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleConfirmEntry(t)}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 relative
                      transition-all cursor-pointer ${cfg.color}`}
                    title={`${t.customer_name} — aguardando ha ${t.assigned_at ? Math.floor((Date.now() - new Date(t.assigned_at).getTime()) / 60000) : '?'}min — clique para confirmar`}
                  >
                    <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className="absolute top-1.5 left-2 text-[11px] font-bold opacity-60">{t.number}</span>
                    <span className="text-xs font-semibold leading-tight truncate max-w-[90%]">{t.customer_name.split(' ')[0]}</span>
                    {t.assigned_at && <ElapsedTimer since={t.assigned_at} />}
                    <span className="text-[9px] opacity-40">toque para confirmar</span>
                  </motion.button>
                )
              }

              // Normal table: cycle status on click
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => statusMut.mutate({ id: t.id, status: CYCLE[t.status] || 'livre' })}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 relative
                    transition-all cursor-pointer ${cfg.color}`}
                  title={`Mesa ${t.number} — ${t.chairs} lugares — ${cfg.label}`}
                >
                  <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <span className="text-base font-semibold leading-none">{t.number}</span>
                  <span className="text-[10px] opacity-50">{t.chairs} lug.</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
