import { useQuery } from 'react-query'
import { statsAPI } from '../../api'
import { Users, Table2, Clock, CheckCircle } from 'lucide-react'

export const StatCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="card p-4">
    <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-semibold leading-none ${color}`}>{value}</p>
    {sub && <p className="text-[11px] text-white/30 mt-1.5">{sub}</p>}
  </div>
)

export default function DashboardStats() {
  const { data: stats } = useQuery('stats', statsAPI.get, { refetchInterval: 10000 })

  if (!stats) return null

  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard
        label="Aguardando"
        value={stats.total_waiting}
        sub="na fila agora"
        color="text-emerald-400"
      />
      <StatCard
        label="Mesas livres"
        value={stats.tables_free}
        sub={`de ${stats.tables_free + stats.tables_occupied + stats.tables_reserved + stats.tables_cleaning} mesas`}
        color="text-emerald-400"
      />
      <StatCard
        label="Ocupadas"
        value={stats.tables_occupied}
        sub="mesas em uso"
        color="text-red-400"
      />
      <StatCard
        label="Espera média"
        value={`${Math.round(stats.avg_wait_minutes)}min`}
        sub="tempo médio hoje"
        color="text-amber-400"
      />
      <StatCard
        label="Chamados"
        value={stats.total_called}
        sub="aguardando chegada"
        color="text-amber-300"
      />
      <StatCard
        label="Atendidos hoje"
        value={stats.attended_today}
        sub="clientes servidos"
        color="text-emerald-400"
      />
      <StatCard
        label="Reservadas"
        value={stats.tables_reserved}
        sub="mesas reservadas"
        color="text-amber-400"
      />
      <StatCard
        label="Em limpeza"
        value={stats.tables_cleaning}
        sub="em preparo"
        color="text-blue-400"
      />
    </div>
  )
}
