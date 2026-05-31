import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useStore } from '../store'

export function useWebSocket() {
  const ws = useRef(null)
  const { setQueue, updateTable, setStats, updateQueueEntry, setWaStatus, setWaQR } = useStore()

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    const connect = () => {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data)
          handleEvent(type, payload)
        } catch (e) {
          console.error('WS parse error', e)
        }
      }

      ws.current.onclose = () => {
        console.log('WS disconnected, reconnecting...')
        setTimeout(connect, 3000)
      }

      ws.current.onerror = (err) => {
        console.error('WS error:', err)
      }
    }

    connect()
    return () => ws.current?.close()
  }, [])

  const handleEvent = (type, payload) => {
    switch (type) {
      case 'queue_updated':
        // Refetch queue
        import('../api').then(({ queueAPI }) => queueAPI.getAll().then(setQueue))
        break

      case 'queue_status_changed':
        updateQueueEntry(payload.id, { status: payload.status })
        break

      case 'table_updated':
        import('../api').then(({ tablesAPI }) => tablesAPI.getAll().then(t => {
          import('../store').then(({ useStore }) => useStore.getState().setTables(t))
        }))
        break

      case 'notification_sent':
        toast.success(`WhatsApp enviado para ${payload.customer}! 📱`)
        break

      case 'suggest_call':
        toast(`Mesa liberada! Próximo: ${payload.queue_entry?.customer?.name}`, {
          icon: '🍽️',
          duration: 6000,
        })
        break

      case 'whatsapp_status':
        setWaStatus(payload.status)
        setWaQR(payload.qr || '')
        break

      default:
        break
    }
  }
}
