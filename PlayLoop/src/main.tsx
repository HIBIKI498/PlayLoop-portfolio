// PlayLoop/src/main.tsx (修正なしでOK)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/App.css' // または './css/App.css'
import App from './App.tsx'
import { isFirebaseConfigured } from './firebase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFirebaseConfigured ? <App /> : (
      <main style={{ maxWidth: 720, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
        <h1>PlayLoop</h1>
        <p>このデモは準備中です。</p>
        <p>開発環境の設定手順はリポジトリのREADMEをご覧ください。</p>
      </main>
    )} 
  </StrictMode>,
)