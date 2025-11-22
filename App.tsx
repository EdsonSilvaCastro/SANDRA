
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import Labor from './components/Labor';
import Budget from './components/Budget';
import Planning from './components/Planning';
import PhotoLog from './components/PhotoLog';
import Reports from './components/Reports';
import CRM from './components/CRM';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import ProjectHeader from './components/ProjectHeader';
import LoginScreen from './components/LoginScreen';
import CMS from './components/CMS';
import AuthScreen from './components/AuthScreen';
import { User } from './types';
import useLocalStorage from './hooks/useLocalStorage';

export type View = 'Panel' | 'Materiales' | 'Mano de Obra' | 'Presupuesto' | 'Planificación' | 'Bitácora de Fotos' | 'Reportes' | 'CRM / Clientes' | 'CMS';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Intenta cargar el usuario actual desde sessionStorage al iniciar
    useEffect(() => {
        const storedUser = sessionStorage.getItem('constructpro_currentUser');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('constructpro_currentUser', JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('constructpro_currentUser');
    };

    if (!currentUser) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    return (
        <ProjectProvider currentUser={currentUser}>
            <AppContent onLogout={handleLogout} currentUser={currentUser}/>
        </ProjectProvider>
    );
};


interface AppContentProps {
    onLogout: () => void;
    currentUser: User;
}

const AppContent: React.FC<AppContentProps> = ({ onLogout, currentUser }) => {
  const { activeProject, unlockedProjects, unlockProject, isReady, projects } = useProject();
  const [currentView, setCurrentView] = useState<View>('Panel');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  
  // Si no hay proyectos para el usuario, renderiza un estado especial
  if (isReady && projects.length === 0) {
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <ProjectHeader onLogout={onLogout} currentUser={currentUser} isManageModalOpen={isManageModalOpen} setIsManageModalOpen={setIsManageModalOpen} />
                <main className="flex-1 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h5m-5 4h5" /></svg>
                        <h2 className="mt-4 text-3xl font-bold text-black">Bienvenido, {currentUser.name}.</h2>
                        <p className="mt-2 text-lg text-black">Parece que es tu primera vez aquí. No tienes proyectos todavía.</p>
                        <p className="mt-1 text-black">¡Crea uno para empezar a gestionar tu obra!</p>
                        <button 
                            onClick={() => setIsManageModalOpen(true)}
                            className="mt-6 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-colors text-lg"
                        >
                            Crear tu Primer Proyecto
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
  }

  if (!isReady || !activeProject) {
     return <div className="flex h-screen w-full items-center justify-center bg-gray-100"><p className="text-lg font-semibold text-black">Cargando Proyectos...</p></div>;
  }

  const isLocked = !!activeProject.pin && !unlockedProjects[activeProject.id];
  
  const handleUnlock = () => {
    if (activeProject) {
      unlockProject(activeProject.id);
    }
  };

  if (isLocked) {
    return <LoginScreen project={activeProject} onUnlock={handleUnlock} />;
  }

  const renderView = () => {
    const isAdmin = currentUser.role === 'admin' || currentUser.email === 'admin@constructpro.com';

    switch (currentView) {
      case 'Panel':
        return <Dashboard />;
      case 'Materiales':
        return <Materials />;
      case 'Mano de Obra':
        return <Labor />;
      case 'Presupuesto':
        return <Budget />;
      case 'Planificación':
        return <Planning />;
      case 'Bitácora de Fotos':
        return <PhotoLog />;
      case 'Reportes':
        return <Reports />;
      case 'CRM / Clientes':
        return isAdmin ? <CRM /> : <Dashboard />;
      case 'CMS':
        return <CMS />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans print:block print:h-auto">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:block">
        <ProjectHeader onLogout={onLogout} currentUser={currentUser} isManageModalOpen={isManageModalOpen} setIsManageModalOpen={setIsManageModalOpen}/>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 print:overflow-visible print:block">
          <div className="container mx-auto px-6 py-8">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};


export default App;
