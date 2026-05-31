import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useQueryClient } from 'react-query'
import { X, MessageCircle } from 'lucide-react'
import { useStore } from '../../store'
import { tablesAPI, notifyAPI } from '../../api'

export default function NotifyModal() {
  const qc = useQueryClient()
  const { notifyModal, closeNotifyModal } = useStore()
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (notifyModal) {
      tablesAPI.getAll().then(all => {
        const free = all.filter(t => t.status === 'livre' && t.chairs >= (notifyModal.people || 1))
        setTables(free)
        if (free.length > 0) setSelectedTable(free[0])
      })
    }
  }, [notifyModal])

  const send = async () => {
    if (!selectedTable) { toast.error('Selecione uma mesa'); return }
    setSending(true)
    try {
      await notifyAPI.send({
        customer_name: notifyModal.customerName,
        phone: notifyModal.phone,
        table_number: selectedTable.number,
        queue_id: notifyModal.queueId,
        table_id: selectedTable.id,
      })
      await tablesAPI.updateStatus(selectedTable.id, 'reservada')
      qc.invalidateQueries('tables')
      qc.invalidateQueries('queue')
      toast.success(`WhatsApp enviado para ${notifyModal.customerName.split(' ')[0]}! 📱`)
      closeNotifyModal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const preview = selectedTable
    ? `Olá ${notifyModal?.customerName?.split(' ')[0]}! 🍽️\n\nSua mesa número *${selectedTable.number}* já está disponível.\nFavor dirigir-se à recepção do restaurante.\n\nAguardaremos você por *5 minutos*. 😊`
    : ''

  return (
    <AnimatePresence>
      {notifyModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeNotifyModal()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-bg-2 border border-white/[0.12] rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Enviar notificação</h3>
                <p className="text-sm text-white/40 mt-0.5">{notifyModal.customerName}</p>
              </div>
              <button onClick={closeNotifyModal} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Table selector */}
            <div className="mb-4">
              <p className="text-xs text-white/40 mb-2">Selecionar mesa</p>
              {tables.length === 0 ? (
                <p className="text-sm text-red-400">Nenhuma mesa disponível para {notifyModal.people} pessoa(s)</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {tables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                        ${selectedTable?.id === t.id
                          ? 'bg-accent text-bg-1 border-accent font-medium'
                          : 'bg-bg-3 border-white/[0.07] hover:border-white/[0.2]'
                        }`}
                    >
                      Mesa {t.number} <span className="opacity-60">({t.chairs} lug.)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message preview */}
            {preview && (
              <div className="bg-bg-3 border border-white/[0.07] rounded-xl p-3 mb-4">
                <p className="text-xs text-white/30 mb-2 flex items-center gap-1">
                  <MessageCircle size={11} /> Prévia da mensagem
                </p>
                <pre className="text-xs text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{preview}</pre>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={closeNotifyModal} className="btn-ghost">Cancelar</button>
              <button
                onClick={send}
                disabled={sending || !selectedTable}
                className="flex items-center gap-2 bg-[#25D366] text-white font-medium px-4 py-2 rounded-lg
                           hover:bg-[#1fba57] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.535a.5.5 0 0 0 .613.603l5.798-1.525A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.488-5.218-1.344l-.37-.214-3.874 1.02 1.034-3.77-.234-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                {sending ? 'Enviando...' : 'Enviar WhatsApp'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
