import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import Header from './components/Header.jsx'
import Footer from "./components/Footer.jsx"
import Analytics from './pages/Analytics.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  </React.StrictMode>,
)
