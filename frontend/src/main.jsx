import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import MobileApp from './MobileApp'
import './index.css'

const isMobileRoute = window.location.pathname === '/mobile'

ReactDOM.createRoot(document.getElementById('root')).render(
  isMobileRoute ? <MobileApp /> : <App />
)
