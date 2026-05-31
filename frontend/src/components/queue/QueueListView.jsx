import { useQuery } from 'react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { queueAPI, tablesAPI } from '../../api'

const STATUS_LABELS = {
  aguardando: 'Aguardando chegada',
  chamado: 'Aviso de chamado enviado',
  entrou: 'Entrou',
  cancelado: 'Cancelado',
  nao_respondeu: 'Não respondeu',
}

const STATUS_COLORS = {
  aguardando: 'text-purple-400 bg-purple-400/10',
  chamado: 'text-amber-400 bg-amber-400/10',
  entrou: 'text-emerald-400 bg-emerald-400/10',
  cancelado: 'text-red-400 bg-red-400/10',
  nao_respondeu: 'text-gray-400 bg-gray-400/10',
}

export default function QueueListView() {
  const { data: queue = [], isLoading } = useQuery('queue', queueAPI.getAll)
  const { data: tables = [] } = useQuery('tables', tablesAPI.getAll)

  if (isLoading) return <div className="text-white/40 text-sm">Carregando fila...</div>

  // A API /api/queue já retorna apenas 'aguardando' e 'chamado' por padrão,
  // mas garantimos a filtragem para manter a mesma lógica do painel.
  const active = (queue || []).filter(e => ['aguardando', 'chamado'].includes(e.status))

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.02] border-b border-white/[0.05] text-white/40 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 font-medium">Posição</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium text-center">Pessoas</th>
            <th className="px-4 py-3 font-medium">Tempo de Espera</th>
            <th className="px-4 py-3 font-medium">Mesa Vinculada</th>
            <th className="px-4 py-3 font-medium">Status / Aviso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {active.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-4 py-12 text-center text-white/30">
                Nenhum cliente na fila no momento.
              </td>
            </tr>
          ) : (
            active.map((entry, i) => {
              let tableName = '-'
              if (entry.customer?.table_id) {
                const t = tables.find(x => x.id === entry.customer.table_id)
                if (t) tableName = `Mesa ${t.number}`
              } else {
                const t = tables.find(x => x.customer_queue_id === entry.id || x.occupied_queue_id === entry.id)
                if (t) tableName = `Mesa ${t.number}`
              }

              return (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-4">
                    <div className="w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium">{entry.customer?.name}</td>
                  <td className="px-4 py-4 text-white/60 text-center">{entry.customer?.people}</td>
                  <td className="px-4 py-4 text-white/60">
                    {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: false })}
                  </td>
                  <td className="px-4 py-4 text-white/60">{tableName}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${STATUS_COLORS[entry.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      {STATUS_LABELS[entry.status] || entry.status}
                    </span>
                    {entry.called_at && (
                      <div className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1">
                        Chamado há {formatDistanceToNow(new Date(entry.called_at), { locale: ptBR, addSuffix: false })}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
