
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Material, MaterialOrder, Worker, Task, TimeLog, BudgetCategory, Expense, Photo, Client, Interaction } from '../types';
import { supabase, isConfigured } from '../lib/supabaseClient';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  pin?: string;
  collaboratorIds?: string[];
}

// Helpers for Data Mapping
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

const mapKeysToSnake = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(mapKeysToSnake);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = toSnakeCase(key);
            acc[snakeKey] = mapKeysToSnake(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

const mapKeysToCamel = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(mapKeysToCamel);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = toCamelCase(key);
            acc[camelKey] = mapKeysToCamel(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Helper for ID generation in Offline Mode
const generateId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

interface ProjectData {
    materials: Material[];
    materialOrders: MaterialOrder[];
    workers: Worker[];
    tasks: Task[];
    timeLogs: TimeLog[];
    budgetCategories: BudgetCategory[];
    expenses: Expense[];
    photos: Photo[];
    clients: Client[];
    interactions: Interaction[];
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  switchProject: (id: string) => void;
  createProject: (name: string, pin?: string) => Promise<void>;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  shareProject: (projectId: string, email: string) => Promise<void>; // New function
  isReady: boolean;
  unlockedProjects: Record<string, boolean>;
  unlockProject: (id: string) => void;
  currentUser: User;
  
  // Data Access
  projectData: ProjectData;
  loadingData: boolean;
  
  // Generic CRUD
  addItem: (resource: keyof ProjectData, item: any) => Promise<void>;
  updateItem: (resource: keyof ProjectData, id: string, item: any) => Promise<void>;
  deleteItem: (resource: keyof ProjectData, id: string) => Promise<void>;
  
  // User Management (Global)
  allUsers: User[];
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const TABLE_MAP: Record<keyof ProjectData, string> = {
    materials: 'materials',
    materialOrders: 'material_orders',
    workers: 'workers',
    tasks: 'tasks',
    timeLogs: 'time_logs',
    budgetCategories: 'budget_items',
    expenses: 'expenses',
    photos: 'photos',
    clients: 'clients',
    interactions: 'interactions'
};

const INITIAL_DATA: ProjectData = {
    materials: [],
    materialOrders: [],
    workers: [],
    tasks: [],
    timeLogs: [],
    budgetCategories: [],
    expenses: [],
    photos: [],
    clients: [],
    interactions: []
};

// Storage Keys Constants
const STORAGE_KEYS = {
    PROJECTS: 'constructpro_allProjects',
    USERS: 'constructpro_users',
    DATA_PREFIX: 'constructpro_data_'
};

const formatError = (error: any): string => {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message;
    if (typeof error === 'object') {
        return error.message || JSON.stringify(error);
    }
    return String(error);
};

export const ProjectProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<Record<string, boolean>>({});
  
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_DATA);
  const [loadingData, setLoadingData] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // 1. Initialize Application (Load Projects & Users)
  useEffect(() => {
    const init = async () => {
        // --- OFFLINE / LOCAL STORAGE MODE ---
        if (!isConfigured) {
            console.log("Modo Offline: Cargando datos desde LocalStorage");
            try {
                // Load Projects
                const localProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
                if (localProjects) {
                    setAllProjects(JSON.parse(localProjects));
                }

                // Load Users
                const localUsers = localStorage.getItem(STORAGE_KEYS.USERS);
                if (localUsers) {
                    setAllUsers(JSON.parse(localUsers));
                } else {
                    // Initialize default admin if no users exist locally
                    if (currentUser.email === 'admin@constructpro.com') {
                        setAllUsers([currentUser]);
                        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([currentUser]));
                    }
                }
            } catch (e) {
                console.error("Error loading local data:", e);
            }
            setIsReady(true);
            return;
        }

        // --- SUPABASE MODE ---
        try {
            const { data: projectsData, error: projError } = await supabase.from('projects').select('*');
            if (projError) throw projError;
            if (projectsData) {
                setAllProjects(mapKeysToCamel(projectsData));
            }

            const { data: usersData, error: usersError } = await supabase.from('users').select('*');
            if (usersError) throw usersError;
            if (usersData) {
                setAllUsers(mapKeysToCamel(usersData));
            }
        } catch (err: any) {
            console.error('Initialization error (Supabase):', formatError(err));
            // Fallback to empty state on error to avoid crashing
        } finally {
            setIsReady(true);
        }
    };
    init();
  }, [currentUser]);

  // 2. Determine Active Project
  useEffect(() => {
    if (!isReady) return;
    
    // Filter logic including Shared Projects
    let projectsForCurrentUser = allProjects;
    if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
         projectsForCurrentUser = allProjects.filter(p => 
            p.ownerId === currentUser.id || 
            (p.collaboratorIds && p.collaboratorIds.includes(currentUser.id))
         );
    }
    
    if (projectsForCurrentUser.length > 0 && !activeProjectId) {
        const storedId = localStorage.getItem(`constructpro_lastActive_${currentUser.id}`);
        if (storedId && projectsForCurrentUser.some(p => p.id === storedId)) {
            setActiveProjectId(storedId);
        } else {
            setActiveProjectId(projectsForCurrentUser[0].id);
        }
    } else if (projectsForCurrentUser.length === 0) {
        setActiveProjectId(null);
    }
  }, [isReady, allProjects, currentUser, activeProjectId]);

  // 3. Fetch Data for Active Project
  useEffect(() => {
    if (!activeProjectId) {
        setProjectData(INITIAL_DATA);
        return;
    }

    const fetchProjectData = async () => {
        setLoadingData(true);
        
        // --- OFFLINE MODE ---
        if (!isConfigured) {
            const newData: any = { ...INITIAL_DATA };
            Object.keys(TABLE_MAP).forEach((key) => {
                const storageKey = `${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${key}`;
                const storedItem = localStorage.getItem(storageKey);
                if (storedItem) {
                    try {
                        newData[key] = JSON.parse(storedItem);
                    } catch (e) {
                        console.error(`Error parsing local data for ${key}`, e);
                    }
                }
            });
            setProjectData(newData);
            setLoadingData(false);
            return;
        }

        // --- SUPABASE MODE ---
        try {
            const promises = Object.entries(TABLE_MAP).map(async ([key, table]) => {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('project_id', activeProjectId);
                
                if (error) {
                    console.error(`Error fetching ${table}:`, formatError(error));
                    return [key, []];
                }
                return [key, mapKeysToCamel(data)];
            });

            const results = await Promise.all(promises);
            const newData: any = { ...INITIAL_DATA };
            results.forEach(([key, data]) => {
                newData[key] = data;
            });
            setProjectData(newData);

        } catch (error: any) {
            console.error("Error fetching project data:", formatError(error));
        } finally {
            setLoadingData(false);
        }
    };

    fetchProjectData();
  }, [activeProjectId]);


  // --- ACTIONS ---

  const switchProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, id);
  };

  const createProject = async (name: string, pin?: string) => {
    const newProject: Project = {
        id: isConfigured ? `proj-${Date.now()}` : generateId('proj'),
        name,
        pin,
        ownerId: currentUser.id,
        collaboratorIds: [] // Init with empty collaborators
    };

    // --- OFFLINE MODE ---
    if (!isConfigured) {
        try {
            const updatedProjects = [...allProjects, newProject];
            setAllProjects(updatedProjects);
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
            switchProject(newProject.id);
            return;
        } catch (e) {
            console.error("Error creating project locally:", e);
            throw new Error("No se pudo guardar el proyecto localmente.");
        }
    }

    // --- SUPABASE MODE ---
    try {
        const dbProject = {
            name,
            pin,
            owner_id: currentUser.id,
            collaborator_ids: []
        };
        const { data, error } = await supabase.from('projects').insert(dbProject).select().single();
        
        if (error) throw error;
        
        if (data) {
            const createdProject = mapKeysToCamel(data);
            setAllProjects(prev => [...prev, createdProject]);
            switchProject(createdProject.id);
        }
    } catch (error: any) {
        console.error("Error creating project:", formatError(error));
        throw new Error(error.message || "Failed to create project");
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => {
    // --- OFFLINE MODE ---
    if (!isConfigured) {
        const updatedProjects = allProjects.map(p => p.id === id ? { ...p, ...data } : p);
        setAllProjects(updatedProjects);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
        return;
    }

    // --- SUPABASE MODE ---
    try {
        const dbData = mapKeysToSnake(data);
        const { error } = await supabase.from('projects').update(dbData).eq('id', id);
        if (error) throw error;
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (error: any) {
        console.error("Error updating project:", formatError(error));
        throw error;
    }
  };

  const deleteProject = async (id: string) => {
    // --- OFFLINE MODE ---
    if (!isConfigured) {
        const updatedProjects = allProjects.filter(p => p.id !== id);
        setAllProjects(updatedProjects);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
        
        // Cleanup project data
        Object.keys(TABLE_MAP).forEach(key => {
             localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${id}_${key}`);
        });

        if (activeProjectId === id) {
            setActiveProjectId(null);
        }
        return;
    }

    // --- SUPABASE MODE ---
    try {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        
        setAllProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) {
            setActiveProjectId(null);
        }
    } catch (error: any) {
         console.error("Error deleting project:", formatError(error));
         throw error;
    }
  };

  const shareProject = async (projectId: string, email: string) => {
    const userToShare = allUsers.find(u => u.email === email);
    if (!userToShare) {
        throw new Error("No se encontró ningún usuario con ese correo electrónico.");
    }
    
    if (userToShare.id === currentUser.id) {
         throw new Error("No puedes compartir el proyecto contigo mismo.");
    }

    const projectToShare = allProjects.find(p => p.id === projectId);
    if (!projectToShare) throw new Error("Proyecto no encontrado");

    const currentCollaborators = projectToShare.collaboratorIds || [];
    if (currentCollaborators.includes(userToShare.id)) {
        throw new Error("Este usuario ya es colaborador en este proyecto.");
    }

    const updatedCollaborators = [...currentCollaborators, userToShare.id];
    
    // Use existing update logic which handles local vs supabase
    await updateProject(projectId, { collaboratorIds: updatedCollaborators });
  };

  const unlockProject = (id: string) => {
    setUnlockedProjects(prev => ({...prev, [id]: true}));
  };

  // --- Generic CRUD for Project Data ---

  const addItem = async (resource: keyof ProjectData, item: any) => {
      if (!activeProjectId) return;

      const itemWithId = { ...item, id: item.id || generateId(resource.slice(0, 3)) };

      // --- OFFLINE MODE ---
      if (!isConfigured) {
          setProjectData(prev => {
              const newList = [...prev[resource], itemWithId];
              const newState = { ...prev, [resource]: newList };
              // Persist
              localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`, JSON.stringify(newList));
              return newState;
          });
          return;
      }

      // --- SUPABASE MODE ---
      try {
          let itemWithProject = { ...itemWithId, project_id: activeProjectId };
          
          // Special handling for budgetCategories - map 'name' to 'category' for DB
          if (resource === 'budgetCategories' && itemWithProject.name) {
              itemWithProject = { ...itemWithProject, category: itemWithProject.name };
          }
          
          const dbItem = mapKeysToSnake(itemWithProject);
          
          const { error } = await supabase.from(TABLE_MAP[resource]).insert(dbItem);
          
          if (error) throw error;
          
          setProjectData(prev => ({
              ...prev,
              [resource]: [...prev[resource], itemWithId]
          }));
      } catch (error: any) {
          console.error(`Error adding to ${resource}:`, formatError(error));
          throw error;
      }
  };

  const updateItem = async (resource: keyof ProjectData, id: string, item: any) => {
      // --- OFFLINE MODE ---
      if (!isConfigured) {
           if (!activeProjectId) return;
           setProjectData(prev => {
              const newList = prev[resource].map((i: any) => i.id === id ? { ...i, ...item } : i);
              const newState = { ...prev, [resource]: newList };
              // Persist
              localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`, JSON.stringify(newList));
              return newState;
          });
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const dbItem = mapKeysToSnake(item);
          delete dbItem.project_id; 
          delete dbItem.id; // Usually don't update ID
          
          const { error } = await supabase.from(TABLE_MAP[resource]).update(dbItem).eq('id', id);
          
          if (error) throw error;
          
          setProjectData(prev => ({
              ...prev,
              [resource]: prev[resource].map((i: any) => i.id === id ? { ...i, ...item } : i)
          }));
      } catch (error: any) {
          console.error(`Error updating ${resource}:`, formatError(error));
          throw error;
      }
  };

  const deleteItem = async (resource: keyof ProjectData, id: string) => {
      // --- OFFLINE MODE ---
      if (!isConfigured) {
          if (!activeProjectId) return;
          setProjectData(prev => {
              const newList = prev[resource].filter((i: any) => i.id !== id);
              const newState = { ...prev, [resource]: newList };
              // Persist
              localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`, JSON.stringify(newList));
              return newState;
          });
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const { error } = await supabase.from(TABLE_MAP[resource]).delete().eq('id', id);
          
          if (error) throw error;
          
          setProjectData(prev => ({
              ...prev,
              [resource]: prev[resource].filter((i: any) => i.id !== id)
          }));
      } catch (error: any) {
          console.error(`Error deleting from ${resource}:`, formatError(error));
          throw error;
      }
  };

  // --- User Management ---
  const addUser = async (user: User) => {
      const newUser = { ...user, id: user.id || generateId('user') };

      // --- OFFLINE MODE ---
      if (!isConfigured) {
          const updatedUsers = [...allUsers, newUser];
          setAllUsers(updatedUsers);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const dbUser = mapKeysToSnake(newUser);
          const { error } = await supabase.from('users').insert(dbUser);
          if (error) throw error;
          setAllUsers(prev => [...prev, newUser]);
      } catch (error: any) {
          console.error("Error adding user:", formatError(error));
          throw error;
      }
  };

  const updateUser = async (id: string, user: Partial<User>) => {
      // --- OFFLINE MODE ---
      if (!isConfigured) {
          const updatedUsers = allUsers.map(u => u.id === id ? { ...u, ...user } : u);
          setAllUsers(updatedUsers);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const dbUser = mapKeysToSnake(user);
          const { error } = await supabase.from('users').update(dbUser).eq('id', id);
          if (error) throw error;
          setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
      } catch (error: any) {
          console.error("Error updating user:", formatError(error));
          throw error;
      }
  };

  const deleteUser = async (id: string) => {
      // --- OFFLINE MODE ---
      if (!isConfigured) {
          const updatedUsers = allUsers.filter(u => u.id !== id);
          setAllUsers(updatedUsers);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw error;
          setAllUsers(prev => prev.filter(u => u.id !== id));
      } catch (error: any) {
           console.error("Error deleting user:", formatError(error));
           throw error;
      }
  };

  const activeProject = allProjects.find(p => p.id === activeProjectId) || null;
  
  let visibleProjects = allProjects;
  if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
      visibleProjects = allProjects.filter(p => 
        p.ownerId === currentUser.id || 
        (p.collaboratorIds && p.collaboratorIds.includes(currentUser.id))
      );
  }

  const value = { 
      projects: visibleProjects, 
      activeProjectId, 
      activeProject, 
      switchProject, 
      createProject, 
      updateProject, 
      deleteProject, 
      shareProject,
      isReady, 
      unlockedProjects, 
      unlockProject, 
      currentUser,
      projectData,
      loadingData,
      addItem,
      updateItem,
      deleteItem,
      allUsers,
      addUser,
      updateUser,
      deleteUser
  };

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
