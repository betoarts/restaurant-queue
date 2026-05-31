import { useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Clock, CheckCircle, XCircle, PhoneOff, Calendar, Download, Eye, X } from 'lucide-react'
import { historyAPI } from '../../api'
import { StatCard } from '../dashboard/DashboardStats'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_ICONS = {
  entrou: CheckCircle,
  cancelado: XCircle,
  nao_respondeu: PhoneOff,
}

const STATUS_COLORS = {
  entrou: 'bg-emerald-500/10 text-emerald-300',
  cancelado: 'bg-red-500/10 text-red-400',
  nao_respondeu: 'bg-gray-500/10 text-gray-400',
}

const STATUS_LABELS = {
  entrou: 'Entrou',
  cancelado: 'Cancelado',
  nao_respondeu: 'Nao respondeu',
}

export default function HistoryView() {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [reportDate, setReportDate] = useState(today)
  const [selectedEntry, setSelectedEntry] = useState(null)

  const { data: history = [], isLoading } = useQuery(
    ['history', dateFrom, dateTo],
    () => historyAPI.getHistory({ from: dateFrom, to: dateTo }),
    { refetchInterval: 30000 }
  )

  const { data: report } = useQuery(
    ['dailyReport', reportDate],
    () => historyAPI.getDailyReport({ date: reportDate }),
    { enabled: !!reportDate }
  )

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Relatório de Atendimentos - Restaurant Queue', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Período: ${dateFrom.split('-').reverse().join('/')} a ${dateTo.split('-').reverse().join('/')}`, 14, 30)

    let startY = 40

    if (reportDate === dateTo && report) {
      doc.setFontSize(10)
      doc.text(`Resumo Diário (${reportDate.split('-').reverse().join('/')}):`, 14, 40)
      doc.text(`Adicionados: ${report.total_added} | Atendidos: ${report.total_entered} | Cancelados: ${report.total_cancelled} | Sem resposta: ${report.total_no_response}`, 14, 46)
      doc.text(`Tempo Médio de Espera (efetivo): ${Math.round(report.avg_wait_minutes)} minutos`, 14, 52)
      startY = 60
    }

    const tableData = history.map(entry => {
      const waitTime = entry.wait_minutes > 0 ? `${entry.wait_minutes} min` : '-'
      const stayTime = entry.stay_minutes > 0 ? `${entry.stay_minutes} min` : '-'
      const table = entry.customer?.table_number ? `Mesa ${entry.customer.table_number}` : '-'
      const date = new Date(entry.created_at)
      const leftDate = entry.left_at ? format(new Date(entry.left_at), 'HH:mm') : '-'
      return [
        format(date, 'dd/MM/yyyy HH:mm'),
        entry.customer?.name || '-',
        table,
        waitTime,
        leftDate,
        stayTime,
        STATUS_LABELS[entry.status] || entry.status
      ]
    })

    autoTable(doc, {
      startY: startY,
      head: [['Data / Hora', 'Cliente', 'Mesa', 'Espera', 'Saída', 'Tempo Mesa', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 217, 126] }
    })

    doc.save(`relatorio-fila-${dateFrom}-a-${dateTo}.pdf`)
  }

  return (
    <div className="space-y-4 relative">
      {/* Report section */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-accent" />
          <span className="text-sm font-medium">Relatório Diário</span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input
            className="input"
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
          />
        </div>
        {report && (
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Adicionados" value={report.total_added || 0} sub="na fila" color="text-white" />
            <StatCard label="Atendidos" value={report.total_entered || 0} sub="entraram" color="text-emerald-400" />
            <StatCard label="Cancelados" value={report.total_cancelled || 0} sub="desistiram" color="text-red-400" />
            <StatCard label="Sem resposta" value={report.total_no_response || 0} sub="nao atenderam" color="text-gray-400" />
            <StatCard label="Espera media" value={report.avg_wait_minutes ? `${Math.round(report.avg_wait_minutes)}min` : '0min'} sub="efetiva" color="text-amber-400" />
          </div>
        )}
      </div>

      {/* History list */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-accent" />
            <span className="text-sm font-medium">Histórico de Atendimentos</span>
          </div>
          
          <button 
            onClick={exportPDF} 
            disabled={history.length === 0} 
            className="btn-primary flex items-center gap-2 text-xs py-1.5 disabled:opacity-50"
          >
            <Download size={14} /> Exportar PDF
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-white/20 text-sm">ate</span>
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="text-center text-white/30 text-sm py-8">Carregando...</div>
        )}

        {!isLoading && history.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm text-white/30">Nenhum registro encontrado</div>
          </div>
        )}

        {!isLoading && history.length > 0 && (
          <div className="space-y-1.5">
            {history.map(entry => {
              const StatusIcon = STATUS_ICONS[entry.status]
              const statusColor = STATUS_COLORS[entry.status] || STATUS_COLORS.entrou
              const statusLabel = STATUS_LABELS[entry.status] || entry.status
              return (
                <div key={entry.id} className="bg-bg-3 border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:bg-bg-4 transition-colors">
                  {StatusIcon && <StatusIcon size={16} className={`${statusColor} p-1 w-8 h-8 rounded-full bg-opacity-20 flex-shrink-0`} />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{entry.customer?.name}</span>
                      <span className="text-xs text-white/40">{format(new Date(entry.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex gap-4 mt-0.5">
                      <span className="text-xs text-white/50 flex items-center gap-1">
                        <Users size={12} /> {entry.customer?.people}
                      </span>
                      {entry.customer?.table_number && (
                        <span className="text-xs text-accent flex items-center gap-1 font-medium">
                          Mesa {entry.customer.table_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedEntry(entry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-white/70"
                  >
                    <Eye size={12} /> Detalhes
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <div 
            className="bg-bg-2 border border-white/[0.1] rounded-2xl w-full max-w-md p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedEntry(null)} 
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-1">{selectedEntry.customer?.name}</h3>
            <div className="flex items-center gap-2 mb-6">
              <span className={`status-badge ${STATUS_COLORS[selectedEntry.status] || STATUS_COLORS.entrou}`}>
                {STATUS_LABELS[selectedEntry.status] || selectedEntry.status}
              </span>
              <span className="text-sm text-white/50">{selectedEntry.customer?.whatsapp}</span>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              
              {/* Entrou na Fila */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-bg-2 bg-white/20 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-white/5 bg-bg-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Entrou na Fila</span>
                    <span className="text-xs text-white/40">{format(new Date(selectedEntry.created_at), 'HH:mm')}</span>
                  </div>
                  <div className="text-xs text-white/50">
                    {selectedEntry.customer?.people} pessoas • {selectedEntry.customer?.preference || 'Qualquer área'}
                  </div>
                </div>
              </div>

              {/* Chamado */}
              {selectedEntry.called_at && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-bg-2 bg-amber-400/40 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-amber-400/10 bg-amber-400/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-amber-200">Notificado (WhatsApp)</span>
                      <span className="text-xs text-amber-200/50">{format(new Date(selectedEntry.called_at), 'HH:mm')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Entrou na Mesa */}
              {selectedEntry.entered_at && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-bg-2 bg-emerald-400/40 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-emerald-400/10 bg-emerald-400/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-emerald-200">Sentou na Mesa</span>
                      <span className="text-xs text-emerald-200/50">{format(new Date(selectedEntry.entered_at), 'HH:mm')}</span>
                    </div>
                    <div className="text-xs text-emerald-200/70 font-medium">
                      Mesa {selectedEntry.customer?.table_number} • Esperou {selectedEntry.wait_minutes} min
                    </div>
                  </div>
                </div>
              )}

              {/* Saiu da Mesa */}
              {selectedEntry.left_at && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-bg-2 bg-red-400/40 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-red-400/10 bg-red-400/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-red-200">Desocupou a Mesa</span>
                      <span className="text-xs text-red-200/50">{format(new Date(selectedEntry.left_at), 'HH:mm')}</span>
                    </div>
                    <div className="text-xs text-red-200/70 font-medium">
                      Permaneceu {selectedEntry.stay_minutes} min consumindo
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
