import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PBLViewer } from './components/PBLViewer/PBLViewer'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="nav-tabs">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => isActive ? "nav-tab active" : "nav-tab"}
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/pbl-viewer" 
            className={({ isActive }) => isActive ? "nav-tab active" : "nav-tab"}
          >
            PBL Viewer
          </NavLink>
        </nav>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pbl-viewer" element={<PBLViewer />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App