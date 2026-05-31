import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Clock, Bell, Trash2, MapPin, CheckCircle, Pencil } from 'lucide-react'
import { queueAPI, tablesAPI } from '../../api'
import { useStore } from '../../store'
import EditEntryModal from './EditEntryModal'

const STATUS_COLORS = {
  aguardando: 'bg-purple-500/10 text-purple-300',
  chamado: 'bg-amber-500/10 text-amber-300',
  entrou: 'bg-accent/10 text-accent',
  cancelado: 'bg-red-500/10 text-red-400',
  nao_respondeu: 'bg-gray-500/10 text-gray-400',
}

const STATUS_LABELS = {
  aguardando: 'Aguardando',
  chamado: 'Chamado',
  entrou: 'Entrou',
  cancelado: 'Cancelado',
  nao_respondeu: 'Não respondeu',
}

export default function QueuePanel() {
  const qc = useQueryClient()
  const { openNotifyModal, openEditModal, settings } = useStore()
  const preferences = (() => { try { return JSON.parse(settings.preferences || '["Interna","Externa","VIP","Varanda"]') } catch { return ['Interna','Externa','VIP','Varanda'] } })()
  const [form, setForm] = useState({ name: '', whatsapp: '', people: '', preference: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const { data: queue = [], isLoading } = useQuery('queue', queueAPI.getAll, {
    refetchInterval: 15000,
  })

  const removeMut = useMutation(queueAPI.remove, {
    onSuccess: () => { qc.invalidateQueries('queue'); toast.success('Removido da fila') },
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name || !form.whatsapp || !form.people) {
      toast.error('Preencha nome, WhatsApp e número de pessoas')
      return
    }
    setSubmitting(true)
    try {
      await queueAPI.add({ ...form, people: parseInt(form.people) })
      setForm({ name: '', whatsapp: '', people: '', preference: '', notes: '' })
      qc.invalidateQueries('queue')
      toast.success('Adicionado à fila! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar')
    } finally {
      setSubmitting(false)
    }
  }

  const active = queue.filter(e => ['aguardando', 'chamado'].includes(e.status))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
        <span className="text-sm font-medium">Fila de espera</span>
        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
          {active.filter(e => e.status === 'aguardando').length} aguardando
        </span>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && (
          <div className="text-center text-white/30 text-sm py-8">Carregando...</div>
        )}
        <AnimatePresence>
          {active.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`rounded-xl p-2.5 border cursor-pointer transition-all group
                ${entry.status === 'chamado'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-bg-3 border-white/[0.07] hover:bg-bg-4 hover:border-white/[0.12]'
                }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Position */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0
                  ${i === 0 ? 'bg-accent/15 text-accent' : 'bg-bg-1 text-white/40'}`}>
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{entry.customer?.name}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[11px] text-white/40 flex items-center gap-1">
                      <Users size={10} />{entry.customer?.people}
                    </span>
                    <span className="text-[11px] text-white/40 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: false })}
                    </span>
                    {entry.customer?.preference && (
                      <span className="text-[11px] text-white/40 flex items-center gap-1">
                        <MapPin size={10} />{entry.customer.preference}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`status-badge ${STATUS_COLORS[entry.status]} flex-shrink-0`}>
                  {STATUS_LABELS[entry.status]}
                </span>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal({
                      id: entry.id,
                      customer: entry.customer,
                    })}
                    className="w-6 h-6 rounded-lg border border-white/[0.07] bg-none flex items-center justify-center
                               hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400 text-white/40 transition-all"
                    title="Editar"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => openNotifyModal({
                      queueId: entry.id,
                      customerName: entry.customer?.name,
                      phone: entry.customer?.whatsapp,
                      people: entry.customer?.people,
                    })}
                    className="w-6 h-6 rounded-lg border border-white/[0.07] bg-none flex items-center justify-center
                               hover:bg-accent/10 hover:border-accent hover:text-accent text-white/40 transition-all"
                    title="Notificar via WhatsApp"
                  >
                    <Bell size={11} />
                  </button>
                  {entry.status === 'chamado' && (
                    <button
                      onClick={async () => {
                        try {
                          const promises = [queueAPI.updateStatus(entry.id, 'entrou')]
                          if (entry.customer?.table_id) {
                            promises.push(tablesAPI.updateStatus(entry.customer.table_id, 'ocupada'))
                          }
                          await Promise.all(promises)
                          qc.invalidateQueries('queue')
                          qc.invalidateQueries('tables')
                          qc.invalidateQueries('stats')
                          toast.success('Cliente entrou!')
                        } catch (err) {
                          toast.error('Erro ao marcar entrada')
                        }
                      }}
                      className="w-6 h-6 rounded-lg border border-white/[0.07] flex items-center justify-center
                                 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400 text-white/40 transition-all"
                      title="Marcar como entrou"
                    >
                      <CheckCircle size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => removeMut.mutate(entry.id)}
                    className="w-6 h-6 rounded-lg border border-white/[0.07] flex items-center justify-center
                               hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-white/40 transition-all"
                    title="Remover da fila"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isLoading && active.length === 0 && (
          <div className="text-center py-10">
            <div className="text-2xl mb-2">🎉</div>
            <div className="text-sm text-white/30">Fila vazia!</div>
          </div>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="p-3 border-t border-white/[0.07] space-y-2">
        <p className="text-xs text-white/40 font-medium">+ Adicionar à fila</p>
        <input
          className="input w-full"
          placeholder="Nome do cliente *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            placeholder="WhatsApp *"
            value={form.whatsapp}
            onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="Pessoas *"
            min="1"
            max="20"
            value={form.people}
            onChange={e => setForm(f => ({ ...f, people: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={form.preference}
            onChange={e => setForm(f => ({ ...f, preference: e.target.value }))}
          >
            <option value="">Preferência</option>
            {preferences.map(p => <option key={p}>{p}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>
      <EditEntryModal />
    </div>
  )
}
