import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { Home, PieChart, BarChart2, User, LogOut, Target, Cpu } from 'lucide-react';
import { AuthContext } from '../AuthContext';

const Sidebar = () => {

    const { logout } = useContext(AuthContext); // Access logout function
    const navigate = useNavigate();

    const handleLogout = async () => {
        alert('Logged out successfully'); // Clear user details and set isAuthenticated to false
        logout(); // Update authentication state
        localStorage.removeItem('userDetails'); // Clear cached user details
        localStorage.setItem('isAuthenticated', 'false'); // Update isAuthenticated to false
        navigate('/');
    };

    return (
        <div className="sidebar h-screen w-64 bg-[#1f2a37] text-white flex flex-col">

            <nav className="flex-1 space-y-2">
                <SidebarItem to="/advisor" icon={<Home className="w-6 h-6" />} label="Advisor" />
                <SidebarItem to="/simulation" icon={<Cpu className="w-6 h-6" />} label="Simulateur IA" />
                <SidebarItem to="/portfolio" icon={<PieChart className="w-6 h-6" />} label="Portfolio" />
                <SidebarItem to="/dashboard" icon={<BarChart2 className="w-6 h-6" />} label="Dashboard" />
                <SidebarItem to="/account" icon={<User className="w-6 h-6" />} label="Account" />
                <SidebarItem to="/invest-brain-tester" icon={<Target className="w-6 h-6" />} label="Invest Brain Tester" />
            </nav>

            <button onClick={handleLogout} className="logout-button">
                <LogOut className="logout-icon" />
                Logout
            </button>

        </div>
    );
};

const SidebarItem = ({ to, icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center p-4 hover:bg-[#2a3140] transition-colors ${isActive ? 'bg-[#2a3140] text-[#4ac1e0]' : ''
                }`
            }
        >
            {icon}
            <span className="ml-4">{label}</span>
        </NavLink>
    );
};

export default Sidebar;
