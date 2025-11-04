import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import Labor from './components/Labor';
import Budget from './components/Budget';
import Schedule from './components/Schedule';
import PhotoLog from './components/PhotoLog';
import Reports from './components/Reports';
import CRM from './components/CRM';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import ProjectHeader from './components/ProjectHeader';
import LoginScreen from './components/LoginScreen';

export type View = 'Panel' | 'Materiales' | 'Mano de Obra' | 'Presupuesto' | 'Cronograma' | 'Bitácora de Fotos' | 'Reportes' | 'CRM / Clientes';

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

const AppContent: React.FC = () => {
  const { activeProject, unlockedProjects, unlockProject, isReady } = useProject();
  const [currentView, setCurrentView] = useState<View>('Panel');
  
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
    switch (currentView) {
      case 'Panel':
        return <Dashboard />;
      case 'Materiales':
        return <Materials />;
      case 'Mano de Obra':
        return <Labor />;
      case 'Presupuesto':
        return <Budget />;
      case 'Cronograma':
        return <Schedule />;
      case 'Bitácora de Fotos':
        return <PhotoLog />;
      case 'Reportes':
        return <Reports />;
      case 'CRM / Clientes':
        return <CRM />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans print:block print:h-auto">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:block">
        <ProjectHeader />
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
