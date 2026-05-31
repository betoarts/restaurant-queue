import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Settings
  settings: {},
  setSettings: (settings) => set({ settings }),
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.className = theme
    localStorage.setItem('theme', theme)
  },

  // Queue
  queue: [],
  setQueue: (queue) => set({ queue }),
  addToQueue: (entry) => set(s => ({ queue: [...s.queue, entry] })),
  removeFromQueue: (id) => set(s => ({ queue: s.queue.filter(e => e.id !== id) })),
  updateQueueEntry: (id, updates) => set(s => ({
    queue: s.queue.map(e => e.id === id ? { ...e, ...updates } : e)
  })),

  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),
  updateTable: (id, updates) => set(s => ({
    tables: s.tables.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  // Stats
  stats: null,
  setStats: (stats) => set({ stats }),

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // WhatsApp
  waStatus: 'disconnected',
  setWaStatus: (status) => set({ waStatus: status }),
  waQR: '',
  setWaQR: (qr) => set({ waQR: qr }),

  // Notify modal
  notifyModal: null,
  openNotifyModal: (data) => set({ notifyModal: data }),
  closeNotifyModal: () => set({ notifyModal: null }),

  // Edit queue entry modal
  editModal: null,
  openEditModal: (data) => set({ editModal: data }),
  closeEditModal: () => set({ editModal: null }),

  // Table edit modal
  tableEditModal: null,
  openTableEditModal: (data) => set({ tableEditModal: data }),
  closeTableEditModal: () => set({ tableEditModal: null }),
}))
