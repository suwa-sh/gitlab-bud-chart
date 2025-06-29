import React from 'react'
import { NavLink } from 'react-router-dom'

export const Navigation: React.FC = () => {
  return (
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
  )
}