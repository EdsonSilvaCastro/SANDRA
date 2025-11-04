import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { initialMaterials, initialWorkers, initialTasks, initialTimeLogs, initialBudgetCategories, initialExpenses, initialPhotos, initialMaterialOrders, initialClients, initialInteractions } from '../constants';

export interface Project {
  id: string;
  name: string;
  pin?: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  switchProject: (id: string) => void;
  createProject: (name: string, pin?: string) => void;
  updateProject: (id: string, data: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (id: string) => void;
  isReady: boolean;
  unlockedProjects: Record<string, boolean>;
  unlockProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DATA_KEYS = ['materials', 'materialOrders', 'workers', 'tasks', 'timeLogs', 'budgetCategories', 'expenses', 'photos', 'clients', 'interactions'];

const getInitialProjectData = () => ({
    materials: initialMaterials,
    materialOrders: initialMaterialOrders,
    workers: initialWorkers,
    tasks: initialTasks,
    timeLogs: initialTimeLogs,
    budgetCategories: initialBudgetCategories,
    expenses: initialExpenses,
    photos: initialPhotos,
    clients: initialClients,
    interactions: initialInteractions,
});


export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<Record<string, boolean>>({});


  useEffect(() => {
    try {
      const metaRaw = localStorage.getItem('constructpro_meta');
      let meta = metaRaw ? JSON.parse(metaRaw) : null;

      if (!meta && localStorage.getItem('constructpro_project_proj-legacy_materials')) {
        console.log('Migrating old data to new project structure...');
        const defaultProjectId = `proj-${Date.now()}`;
        const defaultProject: Project = { id: defaultProjectId, name: 'Proyecto Principal' };

        DATA_KEYS.forEach(key => {
          const oldDataKey = `constructpro_project_proj-legacy_${key}`;
          const oldData = localStorage.getItem(oldDataKey);
          if (oldData) {
            localStorage.setItem(`constructpro_project_${defaultProjectId}_${key}`, oldData);
            localStorage.removeItem(oldDataKey);
          }
        });

        meta = {
          projects: [defaultProject],
          activeProjectId: defaultProjectId,
        };
        localStorage.setItem('constructpro_meta', JSON.stringify(meta));
      }

      if (meta && meta.projects && meta.projects.length > 0) {
        setProjects(meta.projects);
        setActiveProjectId(meta.activeProjectId || meta.projects[0].id);
      } else {
        const firstProjectId = `proj-${Date.now()}`;
        const firstProject = { id: firstProjectId, name: 'Mi Primer Proyecto' };
        const initialData = getInitialProjectData();
        Object.entries(initialData).forEach(([key, value]) => {
            localStorage.setItem(`constructpro_project_${firstProjectId}_${key}`, JSON.stringify(value));
        });

        meta = {
            projects: [firstProject],
            activeProjectId: firstProjectId,
        };
        localStorage.setItem('constructpro_meta', JSON.stringify(meta));
        setProjects(meta.projects);
        setActiveProjectId(meta.activeProjectId);
      }
    } catch (error) {
        console.error("Failed to initialize projects:", error);
        localStorage.removeItem('constructpro_meta');
        const firstProjectId = `proj-fallback-${Date.now()}`;
        const firstProject = { id: firstProjectId, name: 'Proyecto de Respaldo' };
        const meta = { projects: [firstProject], activeProjectId: firstProjectId };
        localStorage.setItem('constructpro_meta', JSON.stringify(meta));
        setProjects(meta.projects);
        setActiveProjectId(meta.activeProjectId);
    } finally {
        setIsReady(true);
    }
  }, []);

  const updateMeta = (newProjects: Project[], newActiveId: string | null) => {
    const newMeta = { projects: newProjects, activeProjectId: newActiveId };
    setProjects(newProjects);
    setActiveProjectId(newActiveId);
    localStorage.setItem('constructpro_meta', JSON.stringify(newMeta));
  };

  const switchProject = (id: string) => {
    if (projects.some(p => p.id === id)) {
      updateMeta(projects, id);
    }
  };

  const createProject = (name: string, pin?: string) => {
    const newId = `proj-${Date.now()}`;
    const newProject: Project = { id: newId, name, pin: pin || undefined };
    const newProjects = [...projects, newProject];
    
    const initialData = getInitialProjectData();
     Object.entries(initialData).forEach(([key, value]) => {
        localStorage.setItem(`constructpro_project_${newId}_${key}`, JSON.stringify(value));
    });

    updateMeta(newProjects, newId);
  };

  const updateProject = (id: string, data: Partial<Omit<Project, 'id'>>) => {
      const newProjects = projects.map(p => p.id === id ? { ...p, ...data } : p);
      updateMeta(newProjects, activeProjectId);
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
        alert("No se puede eliminar el único proyecto existente.");
        return;
    }
    const projectToDelete = projects.find(p => p.id === id);
    if (!projectToDelete || !window.confirm(`¿Estás seguro de que quieres eliminar el proyecto "${projectToDelete.name}"? Esta acción es irreversible y borrará todos sus datos.`)) {
        return;
    }

    DATA_KEYS.forEach(key => {
        localStorage.removeItem(`constructpro_project_${id}_${key}`);
    });
    
    const remainingProjects = projects.filter(p => p.id !== id);
    const newActiveId = id === activeProjectId ? (remainingProjects[0]?.id ?? null) : activeProjectId;
    
    setUnlockedProjects(prev => {
        const newUnlocked = { ...prev };
        delete newUnlocked[id];
        return newUnlocked;
    });

    updateMeta(remainingProjects, newActiveId);
  };

  const unlockProject = (id: string) => {
    setUnlockedProjects(prev => ({...prev, [id]: true}));
  };
  
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const value = { projects, activeProjectId, activeProject, switchProject, createProject, updateProject, deleteProject, isReady, unlockedProjects, unlockProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
