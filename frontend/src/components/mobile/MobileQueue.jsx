import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, CheckCircle, Clock, Users, Plus } from 'lucide-react'
import { queueAPI, tablesAPI } from '../../api'
import { useStore } from '../../store'

export default function MobileQueue() {
  const qc = useQueryClient()
  const { openNotifyModal, settings } = useStore()
  const preferences = (() => { try { return JSON.parse(settings.preferences || '["Interna","Externa","VIP","Varanda"]') } catch { return ['Interna','Externa','VIP','Varanda'] } })()
  
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', whatsapp: '', people: '', preference: '' })
  const [submitting, setSubmitting] = useState(false)

  const { data: queue = [], isLoading } = useQuery('queue', queueAPI.getAll)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name || !form.whatsapp || !form.people) {
      toast.error('Preencha nome, WhatsApp e pessoas')
      return
    }
    setSubmitting(true)
    try {
      await queueAPI.add({ ...form, people: parseInt(form.people) })
      setForm({ name: '', whatsapp: '', people: '', preference: '' })
      setFormOpen(false)
      qc.invalidateQueries('queue')
      toast.success('Adicionado à fila!')
    } catch (err) {
      toast.error('Erro ao adicionar')
    } finally {
      setSubmitting(false)
    }
  }

  const active = (queue || []).filter(e => ['aguardando', 'chamado'].includes(e.status))

  return (
    <div className="flex flex-col h-full bg-bg-1">
      {/* Floating Add Button */}
      {!formOpen && (
        <button 
          onClick={() => setFormOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-accent text-bg-1 rounded-full shadow-lg flex items-center justify-center z-10 active:bg-accent-dark transition-colors"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Add Form Overlay */}
      {formOpen && (
        <div className="absolute inset-0 z-20 bg-bg-1 overflow-y-auto p-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Novo Cliente</h2>
            <button onClick={() => setFormOpen(false)} className="text-white/50 p-2 font-bold text-xl active:text-white">✕</button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4 flex-1">
            <input className="input w-full p-4 text-base" placeholder="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input w-full p-4 text-base" type="tel" placeholder="WhatsApp *" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input p-4 text-base" type="number" placeholder="Pessoas *" min="1" max="20" value={form.people} onChange={e => setForm(f => ({ ...f, people: e.target.value }))} />
              <select className="input p-4 text-base" value={form.preference} onChange={e => setForm(f => ({ ...f, preference: e.target.value }))}>
                <option value="">Qualquer área</option>
                {preferences.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-accent text-bg-1 p-4 rounded-xl font-bold text-lg mt-6 shadow-lg shadow-accent/20 active:opacity-80" disabled={submitting}>
              {submitting ? 'Adicionando...' : 'Adicionar à Fila'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        {isLoading && <p className="text-center text-white/40 mt-10">Carregando...</p>}
        {active.length === 0 && !isLoading && (
          <div className="text-center mt-20 text-white/30">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Fila vazia!</p>
          </div>
        )}
        {active.map((entry, i) => (
          <div key={entry.id} className="bg-bg-2 border border-white/[0.05] rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">{i+1}</span>
                  <span className="font-bold text-lg">{entry.customer?.name}</span>
                </div>
                <div className="text-white/50 text-xs flex items-center gap-3 mt-1.5 ml-8">
                  <span className="flex items-center gap-1"><Users size={12}/> {entry.customer?.people}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR })}</span>
                </div>
              </div>
              {entry.status === 'chamado' && <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider">Chamado</span>}
            </div>

            <div className="flex gap-2 mt-1">
              <button 
                onClick={() => openNotifyModal({
                  queueId: entry.id,
                  customerName: entry.customer?.name,
                  phone: entry.customer?.whatsapp,
                  people: entry.customer?.people,
                })}
                className="flex-1 bg-bg-3 border border-white/[0.07] text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-bg-4"
              >
                <Bell size={16} /> Notificar
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
                  className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-emerald-500/20"
                >
                  <CheckCircle size={16} /> Entrou
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
