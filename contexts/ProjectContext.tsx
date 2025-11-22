
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  pin?: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  switchProject: (id: string) => void;
  createProject: (name: string, pin?: string) => void;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => void;
  deleteProject: (id: string) => void;
  isReady: boolean;
  unlockedProjects: Record<string, boolean>;
  unlockProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DATA_KEYS = ['materials', 'materialOrders', 'workers', 'tasks', 'timeLogs', 'budgetCategories', 'expenses', 'photos', 'clients', 'interactions', 'cms_entries'];

const getInitialProjectData = () => ({
    materials: [],
    materialOrders: [],
    workers: [],
    tasks: [],
    timeLogs: [],
    budgetCategories: [],
    expenses: [],
    photos: [],
    clients: [],
    interactions: [],
    cms_entries: [],
});


export const ProjectProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<Record<string, boolean>>({});


  useEffect(() => {
    try {
      const metaRaw = localStorage.getItem('constructpro_meta');
      let meta = metaRaw ? JSON.parse(metaRaw) : { projects: [] };

      const allStoredProjects = meta.projects || [];
      setAllProjects(allStoredProjects);

      const projectsForCurrentUser = allStoredProjects.filter((p: Project) => p.ownerId === currentUser.id);
      setUserProjects(projectsForCurrentUser);
      
      const lastActiveIdForUser = localStorage.getItem(`constructpro_lastActive_${currentUser.id}`);

      if (projectsForCurrentUser.length > 0) {
        if (lastActiveIdForUser && projectsForCurrentUser.some(p => p.id === lastActiveIdForUser)) {
          setActiveProjectId(lastActiveIdForUser);
        } else {
          setActiveProjectId(projectsForCurrentUser[0].id);
        }
      } else {
        setActiveProjectId(null);
      }

    } catch (error) {
        console.error("Failed to initialize projects:", error);
        // Fallback logic could be added here if needed
    } finally {
        setIsReady(true);
    }
  }, [currentUser.id]);

  const updateMeta = (newAllProjects: Project[], newActiveId: string | null) => {
    const newMeta = { projects: newAllProjects };
    localStorage.setItem('constructpro_meta', JSON.stringify(newMeta));
    setAllProjects(newAllProjects);
    
    // Recalculate user-specific projects
    const projectsForCurrentUser = newAllProjects.filter(p => p.ownerId === currentUser.id);
    setUserProjects(projectsForCurrentUser);

    if (newActiveId && projectsForCurrentUser.some(p => p.id === newActiveId)) {
        setActiveProjectId(newActiveId);
        localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, newActiveId);
    } else if (projectsForCurrentUser.length > 0) {
        const firstId = projectsForCurrentUser[0].id;
        setActiveProjectId(firstId);
        localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, firstId);
    } else {
        setActiveProjectId(null);
        localStorage.removeItem(`constructpro_lastActive_${currentUser.id}`);
    }
  };

  const switchProject = (id: string) => {
    if (userProjects.some(p => p.id === id)) {
      setActiveProjectId(id);
      localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, id);
    }
  };

  const createProject = (name: string, pin?: string) => {
    const newId = `proj-${Date.now()}`;
    const newProject: Project = { id: newId, name, ownerId: currentUser.id, pin: pin || undefined };
    const newAllProjects = [...allProjects, newProject];
    
    const initialData = getInitialProjectData();
     Object.entries(initialData).forEach(([key, value]) => {
        localStorage.setItem(`constructpro_project_${newId}_${key}`, JSON.stringify(value));
    });

    updateMeta(newAllProjects, newId);
  };

  const updateProject = (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => {
      const newAllProjects = allProjects.map(p => p.id === id ? { ...p, ...data } : p);
      updateMeta(newAllProjects, activeProjectId);
  };

  const deleteProject = (id: string) => {
    const projectToDelete = userProjects.find(p => p.id === id);
    if (!projectToDelete) {
        return;
    }
    // Confirmación eliminada de aquí para manejarla en la UI
    
    DATA_KEYS.forEach(key => {
        localStorage.removeItem(`constructpro_project_${id}_${key}`);
    });
    
    const remainingAllProjects = allProjects.filter(p => p.id !== id);
    const newActiveId = id === activeProjectId ? (userProjects.filter(p => p.id !== id)[0]?.id ?? null) : activeProjectId;
    
    setUnlockedProjects(prev => {
        const newUnlocked = { ...prev };
        delete newUnlocked[id];
        return newUnlocked;
    });

    updateMeta(remainingAllProjects, newActiveId);
  };

  const unlockProject = (id: string) => {
    setUnlockedProjects(prev => ({...prev, [id]: true}));
  };
  
  const activeProject = userProjects.find(p => p.id === activeProjectId) || null;

  const value = { projects: userProjects, activeProjectId, activeProject, switchProject, createProject, updateProject, deleteProject, isReady, unlockedProjects, unlockProject };

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
