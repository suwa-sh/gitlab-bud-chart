import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PBLViewer } from './components/PBLViewer/PBLViewer'
import './App.css'

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pbl-viewer" element={<PBLViewer />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App