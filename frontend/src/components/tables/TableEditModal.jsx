import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useQueryClient } from 'react-query'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { tablesAPI } from '../../api'

export default function TableEditModal() {
  const qc = useQueryClient()
  const { tableEditModal, closeTableEditModal, settings } = useStore()
  const preferences = (() => { try { return JSON.parse(settings.preferences || '["Interna","Externa","VIP","Varanda"]') } catch { return ['Interna','Externa','VIP','Varanda'] } })()
  const [form, setForm] = useState({ number: '', chairs: '4', area: preferences[0] || 'Interna', notes: '', status: 'livre' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (tableEditModal) {
      setForm({
        number: String(tableEditModal.number || ''),
        chairs: String(tableEditModal.chairs || 4),
        area: tableEditModal.area || preferences[0],
        notes: tableEditModal.notes || '',
        status: tableEditModal.status || 'livre',
      })
    }
  }, [tableEditModal])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.number || !form.chairs) {
      toast.error('Preencha numero e quantidade de cadeiras')
      return
    }
    setSaving(true)
    try {
      await tablesAPI.update(tableEditModal.id, {
        number: parseInt(form.number),
        chairs: parseInt(form.chairs),
        area: form.area,
        notes: form.notes,
        status: form.status,
      })
      qc.invalidateQueries('tables')
      qc.invalidateQueries('stats')
      toast.success('Mesa atualizada!')
      closeTableEditModal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {tableEditModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeTableEditModal()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-bg-2 border border-white/[0.12] rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Editar Mesa {tableEditModal.number}</h3>
                <p className="text-sm text-white/40 mt-0.5">{tableEditModal.area} — {tableEditModal.chairs} lugares</p>
              </div>
              <button onClick={closeTableEditModal} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Numero</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={form.number}
                    onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Cadeiras</label>
                  <input
                    className="input w-full"
                    type="number"
                    min="1"
                    max="20"
                    value={form.chairs}
                    onChange={e => setForm(f => ({ ...f, chairs: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Area</label>
                <select
                  className="input w-full"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                >
                  {preferences.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Status</label>
                <select
                  className="input w-full"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="livre">Livre</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="reservada">Reservada</option>
                  <option value="limpeza">Limpeza</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Observacoes</label>
                <input
                  className="input w-full"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={closeTableEditModal} className="btn-ghost">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
