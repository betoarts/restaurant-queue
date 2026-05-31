import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useQueryClient } from 'react-query'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { queueAPI } from '../../api'

export default function EditEntryModal() {
  const qc = useQueryClient()
  const { editModal, closeEditModal, settings } = useStore()
  const preferences = (() => { try { return JSON.parse(settings.preferences || '["Interna","Externa","VIP","Varanda"]') } catch { return ['Interna','Externa','VIP','Varanda'] } })()
  const [form, setForm] = useState({ name: '', whatsapp: '', people: '', preference: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editModal?.customer) {
      setForm({
        name: editModal.customer.name || '',
        whatsapp: editModal.customer.whatsapp || '',
        people: String(editModal.customer.people || ''),
        preference: editModal.customer.preference || '',
        notes: editModal.customer.notes || '',
      })
    }
  }, [editModal])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.whatsapp || !form.people) {
      toast.error('Preencha nome, WhatsApp e numero de pessoas')
      return
    }
    setSaving(true)
    try {
      await queueAPI.update(editModal.id, { ...form, people: parseInt(form.people) })
      qc.invalidateQueries('queue')
      toast.success('Entrada atualizada!')
      closeEditModal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {editModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeEditModal()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-bg-2 border border-white/[0.12] rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Editar entrada</h3>
                <p className="text-sm text-white/40 mt-0.5">{editModal.customer?.name}</p>
              </div>
              <button onClick={closeEditModal} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <input
                className="input w-full"
                placeholder="Nome do cliente *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
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
              <select
                className="input w-full"
                value={form.preference}
                onChange={e => setForm(f => ({ ...f, preference: e.target.value }))}
              >
                <option value="">Preferencia de area</option>
                {preferences.map(p => <option key={p}>{p}</option>)}
              </select>
              <input
                className="input w-full"
                placeholder="Observacoes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={closeEditModal} className="btn-ghost">Cancelar</button>
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
