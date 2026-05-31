import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { Search, Utensils, DoorOpen } from 'lucide-react'
import { tablesAPI, queueAPI, messageAPI } from '../../api'

const CYCLE = { livre: 'ocupada', ocupada: 'limpeza', limpeza: 'livre', reservada: 'livre' }

const STATUS_UI = {
  livre: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', label: 'Livre' },
  ocupada: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Ocupada' },
  reservada: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', label: 'Reservada' },
  limpeza: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Limpeza' },
}

export default function MobileTables() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: tables = [], isLoading } = useQuery('tables', tablesAPI.getAll)

  const statusMut = useMutation(({ id, status }) => tablesAPI.updateStatus(id, status), {
    onSuccess: () => {
      qc.invalidateQueries('tables')
      qc.invalidateQueries('stats')
    },
  })

  const handleOrderReady = async (table) => {
    try {
      const name = (table.occupied_by || '').split(' ')[0]
      const msg = `Olá ${name}! 🍽️\n\nSeu pedido na mesa *${table.number}* está pronto!\nDirija-se ao balcão para retirar.\n\nBom apetite! 😋`
      await messageAPI.send({ phone: table.occupied_phone, message: msg })
      toast.success('Pedido pronto notificado!')
    } catch (err) {
      toast.error('Erro ao notificar')
    }
  }

  const handleVacate = async (table) => {
    try {
      await tablesAPI.updateStatus(table.id, 'limpeza')
      qc.invalidateQueries('tables')
      toast.success(`Mesa ${table.number} desocupada`)
    } catch (err) {
      toast.error('Erro ao desocupar')
    }
  }

  const handleConfirmEntry = async (table) => {
    try {
      await Promise.all([
        queueAPI.updateStatus(table.customer_queue_id, 'entrou'),
        tablesAPI.updateStatus(table.id, 'ocupada'),
      ])
      qc.invalidateQueries('tables')
      qc.invalidateQueries('queue')
      toast.success(`${table.customer_name} entrou!`)
    } catch (err) {
      toast.error('Erro ao confirmar')
    }
  }

  const filtered = (tables || []).filter(t => t.number.toString().includes(search))

  return (
    <div className="flex flex-col h-full bg-bg-1">
      <div className="p-4 border-b border-white/[0.05] bg-bg-2">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="number"
            placeholder="Buscar número da mesa..."
            className="w-full bg-bg-3 border border-white/[0.1] rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-accent/50 text-base"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        {filtered.map(t => {
          const ui = STATUS_UI[t.status] || STATUS_UI.livre
          const hasOccupiedCustomer = t.status === 'ocupada' && t.occupied_by
          const hasReservedCustomer = t.status === 'reservada' && t.customer_name
          
          return (
            <div key={t.id} className="bg-bg-2 border border-white/[0.05] rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-lg font-bold ${ui.color}`}>
                    {t.number}
                  </div>
                  <div>
                    <span className="font-medium text-white block">{ui.label}</span>
                    <span className="text-white/40 text-xs block">{t.chairs} lugares • {t.area}</span>
                  </div>
                </div>
                
                {t.status !== 'ocupada' && t.status !== 'reservada' && (
                  <button 
                    onClick={() => statusMut.mutate({ id: t.id, status: CYCLE[t.status] || 'livre' })}
                    className="px-4 py-2 bg-bg-3 border border-white/[0.1] rounded-lg text-sm font-medium active:bg-bg-4 transition-colors"
                  >
                    Mudar
                  </button>
                )}
              </div>

              {hasOccupiedCustomer && (
                <div className="pt-3 border-t border-white/[0.05]">
                  <p className="text-sm text-white/70 mb-3"><span className="font-semibold text-white">{t.occupied_by}</span> está ocupando a mesa</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOrderReady(t)}
                      className="flex-1 bg-accent/10 border border-accent/20 text-accent py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-accent/20"
                    >
                      <Utensils size={16} /> Pedido Pronto
                    </button>
                    <button 
                      onClick={() => handleVacate(t)}
                      className="flex-1 bg-bg-3 border border-white/[0.07] text-white/70 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-bg-4"
                    >
                      <DoorOpen size={16} /> Desocupar
                    </button>
                  </div>
                </div>
              )}

              {hasReservedCustomer && (
                <div className="pt-3 border-t border-white/[0.05]">
                  <p className="text-sm text-amber-400/80 mb-3"><span className="font-semibold text-amber-400">{t.customer_name}</span> (Aguardando)</p>
                  <button 
                    onClick={() => handleConfirmEntry(t)}
                    className="w-full bg-accent text-bg-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-accent-dark shadow-sm shadow-accent/20"
                  >
                    Confirmar Entrada na Mesa
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && !isLoading && (
          <p className="text-center text-white/40 mt-10">Mesa não encontrada</p>
        )}
      </div>
    </div>
  )
}
