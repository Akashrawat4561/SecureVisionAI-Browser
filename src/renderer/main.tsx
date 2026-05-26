import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@securevision/ui/src/styles/globals.css' // Import shared premium styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
