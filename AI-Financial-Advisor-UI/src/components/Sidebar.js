import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { Home, PieChart, BarChart2, User, LogOut, Target, Cpu, TrendingUp } from 'lucide-react';
import { AuthContext } from '../AuthContext';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    alert('Déconnexion réussie');
    logout();
    localStorage.removeItem('userDetails');
    localStorage.setItem('isAuthenticated', 'false');
    navigate('/');
  };

  return (
    <aside className="sidebar-glass">
      <div>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="sidebar-logo-text">AI Advisor</span>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem to="/advisor" icon={<Home className="w-5 h-5 mr-3" />} label="Advisor" />
          <SidebarItem to="/simulation" icon={<Cpu className="w-5 h-5 mr-3 text-sky-400" />} label="Simulateur IA" />
          <SidebarItem to="/portfolio" icon={<PieChart className="w-5 h-5 mr-3" />} label="Portefeuille" />
          <SidebarItem to="/dashboard" icon={<BarChart2 className="w-5 h-5 mr-3" />} label="Tableau de bord" />
          <SidebarItem to="/account" icon={<User className="w-5 h-5 mr-3" />} label="Mon Compte" />
          <SidebarItem to="/invest-brain-tester" icon={<Target className="w-5 h-5 mr-3" />} label="Brain Tester" />
        </nav>
      </div>

      <button onClick={handleLogout} className="logout-glass-button">
        <LogOut className="w-5 h-5" />
        <span>Déconnexion</span>
      </button>
    </aside>
  );
};

const SidebarItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive ? 'active' : ''}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

export default Sidebar;
