import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { Trash2, Pencil, Plus } from 'lucide-react'
import { tablesAPI } from '../../api'
import { useStore } from '../../store'

const STATUS_CONFIG = {
  livre:     { dot: 'bg-emerald-400', label: 'Livre', color: 'text-emerald-400' },
  ocupada:   { dot: 'bg-red-400', label: 'Ocupada', color: 'text-red-400' },
  reservada: { dot: 'bg-amber-400', label: 'Reservada', color: 'text-amber-400' },
  limpeza:   { dot: 'bg-blue-400', label: 'Limpeza', color: 'text-blue-400' },
}

export default function TableCrud() {
  const qc = useQueryClient()
  const { openTableEditModal, settings } = useStore()
  const preferences = (() => { try { return JSON.parse(settings.preferences || '["Interna","Externa","VIP","Varanda"]') } catch { return ['Interna','Externa','VIP','Varanda'] } })()
  const [form, setForm] = useState({ number: '', chairs: '4', area: preferences[0] || 'Interna', notes: '' })
  const [adding, setAdding] = useState(false)

  const { data: tables = [] } = useQuery('tables', tablesAPI.getAll, { refetchInterval: 10000 })

  const deleteMut = useMutation(tablesAPI.delete, {
    onSuccess: () => { qc.invalidateQueries('tables'); qc.invalidateQueries('stats'); toast.success('Mesa removida') },
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.number) { toast.error('Informe o numero da mesa'); return }
    setAdding(true)
    try {
      await tablesAPI.create({
        number: parseInt(form.number),
        chairs: parseInt(form.chairs),
        area: form.area,
        notes: form.notes,
      })
      setForm({ number: '', chairs: '4', area: preferences[0] || 'Interna', notes: '' })
      qc.invalidateQueries('tables')
      qc.invalidateQueries('stats')
      toast.success('Mesa adicionada!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar mesa')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      <form onSubmit={handleCreate} className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={14} className="text-accent" />
          <span className="text-sm font-medium">Adicionar Mesa</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input
            className="input"
            type="number"
            placeholder="Numero *"
            value={form.number}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="Cadeiras"
            min="1"
            max="20"
            value={form.chairs}
            onChange={e => setForm(f => ({ ...f, chairs: e.target.value }))}
          />
          <select
            className="input"
            value={form.area}
            onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
          >
            {preferences.map(p => <option key={p}>{p}</option>)}
          </select>
          <button type="submit" className="btn-primary text-xs" disabled={adding}>
            {adding ? '...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {/* Table list */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/30 font-medium uppercase tracking-wider">
          Gerenciar Mesas ({tables.length})
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tables.map(t => {
          const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.livre
          return (
            <div key={t.id} className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">Mesa {t.number}</div>
                  <div className="text-xs text-white/40">
                    {t.chairs} lug. · {t.area} · <span className={cfg.color}>{cfg.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openTableEditModal(t)}
                  className="w-6 h-6 rounded-lg border border-white/[0.07] flex items-center justify-center
                             hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400 text-white/40 transition-all"
                  title="Editar mesa"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => deleteMut.mutate(t.id)}
                  className="w-6 h-6 rounded-lg border border-white/[0.07] flex items-center justify-center
                             hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-white/40 transition-all"
                  title="Remover mesa"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-8 text-sm text-white/30">Nenhuma mesa cadastrada</div>
      )}
    </div>
  )
}
