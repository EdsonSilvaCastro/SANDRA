
import React from 'react';
import { View } from '../App';
import { ICONS } from '../constants';
import { User } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, currentUser }) => {
  const allNavItems: View[] = ['Panel', 'Materiales', 'Mano de Obra', 'Presupuesto', 'Planificación', 'Bitácora de Fotos', 'CRM / Clientes', 'Reportes', 'Usuarios'];

  // Check if user is admin (by role or by email for backward compatibility)
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'admin@constructpro.com';

  const navItems = allNavItems.filter(item => {
      if (item === 'CRM / Clientes') return isAdmin;
      if (item === 'Usuarios') return isAdmin;
      return true;
  });

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg no-print">
      <div className="flex items-center justify-center h-20 border-b">
        <h1 className="text-2xl font-bold text-black">ConstructPro</h1>
      </div>
      <nav className="flex-1 px-2 py-4">
        {navItems.map((item) => (
          <a
            key={item}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentView(item);
            }}
            className={`flex items-center px-4 py-2 mt-2 text-black rounded-md hover:bg-primary-100 transition-colors duration-200 ${
              currentView === item ? 'bg-primary-100' : ''
            }`}
          >
            {ICONS[item]}
            <span className="mx-4 font-medium">{item}</span>
          </a>
        ))}
      </nav>
      <div className="p-4 border-t">
          <div className="text-xs text-gray-500 text-center">
              Rol: {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'user' ? 'Editor' : 'Visualizador'}
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
