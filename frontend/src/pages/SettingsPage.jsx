import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { Store, Palette, MessageSquare, List, Plus, Trash2, Download, Upload, HardDrive } from 'lucide-react'
import { settingsAPI, systemAPI } from '../api'
import { useStore } from '../store'

export default function SettingsPage() {
  const { settings, setSettings, theme, setTheme } = useStore()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState([])
  const [newPref, setNewPref] = useState('')

  const { data } = useQuery('settings', settingsAPI.getAll, {
    onSuccess: (d) => {
      setSettings(d)
      setForm(d)
      try { setPrefs(JSON.parse(d.preferences || '[]')) } catch { setPrefs([]) }
      if (d.theme && d.theme !== theme) setTheme(d.theme)
    }
  })

  const save = async (updates) => {
    setSaving(true)
    try {
      const merged = { ...form, ...updates }
      if (updates.preferences !== undefined) {
        merged.preferences = JSON.stringify(updates.preferences)
      }
      const result = await settingsAPI.update(merged)
      setSettings(result)
      setForm(result)
      if (result.theme && result.theme !== theme) setTheme(result.theme)
      toast.success('Configurações salvas!')
    } catch (err) {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const updatePrefs = (newPrefs) => {
    setPrefs(newPrefs)
    save({ preferences: newPrefs })
  }

  const addPref = () => {
    if (!newPref.trim()) return
    if (prefs.includes(newPref.trim())) { toast.error('Já existe'); return }
    updatePrefs([...prefs, newPref.trim()])
    setNewPref('')
  }

  const removePref = (i) => updatePrefs(prefs.filter((_, idx) => idx !== i))

  const handleExport = async () => {
    try {
      const data = await systemAPI.exportConfig()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `restaurant-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup exportado com sucesso!')
    } catch (err) {
      toast.error('Erro ao exportar backup')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.settings || !data.tables) {
          throw new Error('Arquivo de backup inválido')
        }
        await systemAPI.importConfig(data)
        toast.success('Backup restaurado com sucesso! Recarregando...')
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        toast.error('Erro ao importar arquivo: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = null // reset input
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Restaurant name */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Store size={14} className="text-accent" />
          <span className="text-sm font-medium">Restaurante</span>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={form.restaurant_name || ''}
            onChange={e => setForm(f => ({ ...f, restaurant_name: e.target.value }))}
            onBlur={() => save({ restaurant_name: form.restaurant_name })}
          />
        </div>
      </div>

      {/* Theme toggle */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={14} className="text-accent" />
          <span className="text-sm font-medium">Aparência</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTheme('dark'); save({ theme: 'dark' }) }}
            className={`px-4 py-2 rounded-lg text-sm transition-all border
              ${theme === 'dark'
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-bg-3 border-white/[0.07] hover:border-white/[0.15]'
              }`}
          >
            Escuro
          </button>
          <button
            onClick={() => { setTheme('light'); save({ theme: 'light' }) }}
            className={`px-4 py-2 rounded-lg text-sm transition-all border
              ${theme === 'light'
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-bg-3 border-white/[0.07] hover:border-white/[0.15]'
              }`}
          >
            Claro
          </button>
        </div>
      </div>

      {/* Message templates */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} className="text-accent" />
          <span className="text-sm font-medium">Templates de Mensagens</span>
        </div>
        <p className="text-xs text-white/30 mb-3">
          Variáveis: {'{nome}'} (primeiro nome), {'{mesa}'} (número da mesa), {'{posicao}'} (posição na fila)
        </p>

        <div className="space-y-3">
          {[
            { key: 'msg_confirmation', label: 'Confirmação de fila' },
            { key: 'msg_notification', label: 'Notificação de mesa' },
            { key: 'msg_order_ready', label: 'Pedido pronto' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-white/40 mb-1 block">{label}</label>
              <textarea
                className="input w-full h-20 resize-y text-xs leading-relaxed"
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                onBlur={() => save({ [key]: form[key] })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <List size={14} className="text-accent" />
          <span className="text-sm font-medium">Preferências de Área</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            className="input flex-1"
            placeholder="Nova área..."
            value={newPref}
            onChange={e => setNewPref(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPref())}
          />
          <button onClick={addPref} className="btn-primary flex items-center gap-1 text-xs">
            <Plus size={12} /> Adicionar
          </button>
        </div>
        <div className="space-y-1">
          {prefs.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-bg-3 border border-white/[0.07] rounded-lg px-3 py-2">
              <span className="text-sm">{p}</span>
              <button
                onClick={() => removePref(i)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive size={14} className="text-accent" />
          <span className="text-sm font-medium">Backup & Restauração</span>
        </div>
        <p className="text-xs text-white/30 mb-4">
          Exporte suas configurações e layout de mesas para um arquivo, ou importe um arquivo existente.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-xs">
            <Download size={14} /> Exportar Backup
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-bg-3 border border-white/[0.07] hover:border-white/20 hover:bg-white/5 rounded-xl text-xs font-medium cursor-pointer transition-all">
            <Upload size={14} /> Importar Backup
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
