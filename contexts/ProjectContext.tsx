
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
  shareProject: (projectId: string, email: string) => Promise<void>;
  isReady: boolean;
  unlockedProjects: Record<string, boolean>;
  unlockProject: (id: string) => void;
  currentUser: User;
  projectData: ProjectData;
  loadingData: boolean;
  addItem: (resource: keyof ProjectData, item: any) => Promise<void>;
  updateItem: (resource: keyof ProjectData, id: string, item: any) => Promise<void>;
  deleteItem: (resource: keyof ProjectData, id: string) => Promise<void>;
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

const STORAGE_KEYS = {
    PROJECTS: 'constructpro_allProjects',
    USERS: 'constructpro_users',
    DATA_PREFIX: 'constructpro_data_'
};

export const ProjectProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<Record<string, boolean>>({});
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_DATA);
  const [loadingData, setLoadingData] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const init = async () => {
        if (!isConfigured) {
            try {
                const localProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
                if (localProjects) setAllProjects(JSON.parse(localProjects));
                const localUsers = localStorage.getItem(STORAGE_KEYS.USERS);
                if (localUsers) {
                    setAllUsers(JSON.parse(localUsers));
                } else if (currentUser.email === 'admin@constructpro.com') {
                    setAllUsers([currentUser]);
                    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([currentUser]));
                }
            } catch (e) { console.error("Error loading local data:", e); }
            setIsReady(true);
            return;
        }
        try {
            const { data: projectsData } = await supabase.from('projects').select('*');
            if (projectsData) setAllProjects(mapKeysToCamel(projectsData));
            const { data: usersData } = await supabase.from('users').select('*');
            if (usersData) setAllUsers(mapKeysToCamel(usersData));
        } catch (err) { console.error('Initialization error (Supabase):', err); }
        finally { setIsReady(true); }
    };
    init();
  }, [currentUser]);

  useEffect(() => {
    if (!isReady) return;
    let projectsForCurrentUser = allProjects;
    if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
         projectsForCurrentUser = allProjects.filter(p => p.ownerId === currentUser.id || (p.collaboratorIds && p.collaboratorIds.includes(currentUser.id)));
    }
    if (projectsForCurrentUser.length > 0 && !activeProjectId) {
        const storedId = localStorage.getItem(`constructpro_lastActive_${currentUser.id}`);
        if (storedId && projectsForCurrentUser.some(p => p.id === storedId)) setActiveProjectId(storedId);
        else setActiveProjectId(projectsForCurrentUser[0].id);
    } else if (projectsForCurrentUser.length === 0) setActiveProjectId(null);
  }, [isReady, allProjects, currentUser, activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
        setProjectData(INITIAL_DATA);
        return;
    }
    const fetchProjectData = async () => {
        setLoadingData(true);
        if (!isConfigured) {
            const newData: any = { ...INITIAL_DATA };
            Object.keys(TABLE_MAP).forEach((key) => {
                const storageKey = `${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${key}`;
                const storedItem = localStorage.getItem(storageKey);
                if (storedItem) {
                    try { newData[key] = JSON.parse(storedItem); } catch (e) { console.error(`Error parsing local data for ${key}`, e); }
                }
            });
            setProjectData(newData);
            setLoadingData(false);
            return;
        }
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
                let mapped = mapKeysToCamel(data);
                // 'assigned_to' in DB maps to 'assignedTo' via camelCase, but the app uses 'assignedWorkerId'
                if (key === 'tasks') {
                    mapped = mapped.map((t: any) => {
                        if ('assignedTo' in t) {
                            const { assignedTo, ...rest } = t;
                            return { ...rest, assignedWorkerId: assignedTo };
                        }
                        return t;
                    });
                }
                return [key, mapped];
            });
            const results = await Promise.all(promises);
            const newData: any = { ...INITIAL_DATA };
            results.forEach(([key, data]) => { newData[key] = data; });
            setProjectData(newData);
        } catch (error) { console.error("Error fetching project data:", error); }
        finally { setLoadingData(false); }
    };
    fetchProjectData();
  }, [activeProjectId]);

  const switchProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, id);
  };

  const createProject = async (name: string, pin?: string) => {
    const newProject: Project = { id: isConfigured ? `proj-${Date.now()}` : generateId('proj'), name, pin, ownerId: currentUser.id, collaboratorIds: [] };
    if (!isConfigured) {
        setAllProjects(prev => {
            const updatedProjects = [...prev, newProject];
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
            return updatedProjects;
        });
        switchProject(newProject.id);
        return;
    }
    const { data, error } = await supabase.from('projects').insert({ name, pin, owner_id: currentUser.id, collaborator_ids: [] }).select().single();
    if (error) throw error;
    if (data) {
        const createdProject = mapKeysToCamel(data);
        setAllProjects(prev => [...prev, createdProject]);
        switchProject(createdProject.id);
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => {
    if (!isConfigured) {
        setAllProjects(prev => {
            const updatedProjects = prev.map(p => p.id === id ? { ...p, ...data } : p);
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
            return updatedProjects;
        });
        return;
    }
    const { error } = await supabase.from('projects').update(mapKeysToSnake(data)).eq('id', id);
    if (error) throw error;
    setAllProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteProject = async (id: string) => {
    if (!isConfigured) {
        setAllProjects(prev => {
            const updated = prev.filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
            return updated;
        });
        Object.keys(TABLE_MAP).forEach(key => localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${id}_${key}`));
        if (activeProjectId === id) setActiveProjectId(null);
        return;
    }
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setAllProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  const shareProject = async (projectId: string, email: string) => {
    const userToShare = allUsers.find(u => u.email === email);
    if (!userToShare) throw new Error("No se encontró ningún usuario con ese correo.");
    const projectToShare = allProjects.find(p => p.id === projectId);
    if (!projectToShare) throw new Error("Proyecto no encontrado");
    const currentCollaborators = projectToShare.collaboratorIds || [];
    if (currentCollaborators.includes(userToShare.id)) throw new Error("El usuario ya es colaborador.");
    await updateProject(projectId, { collaboratorIds: [...currentCollaborators, userToShare.id] });
  };

  const unlockProject = (id: string) => setUnlockedProjects(prev => ({...prev, [id]: true}));

  const addItem = async (resource: keyof ProjectData, item: any) => {
      if (!activeProjectId) return;
      const itemWithId = { ...item, id: item.id || generateId(resource.slice(0, 3)) };
      
      if (!isConfigured) {
          try {
              const storageKey = `${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`;
              const currentListJson = localStorage.getItem(storageKey);
              const currentList = currentListJson ? JSON.parse(currentListJson) : [];
              const newList = [...currentList, itemWithId];
              
              localStorage.setItem(storageKey, JSON.stringify(newList));
              setProjectData(prev => ({ ...prev, [resource]: newList }));
          } catch (e: any) {
              if (e.name === 'QuotaExceededError') {
                  throw new Error("Memoria llena. Intenta borrar fotos antiguas o comprimir más las nuevas.");
              }
              throw e;
          }
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

          // The DB column is 'assigned_to' but camelCase mapping produces 'assigned_worker_id'
          if (resource === 'tasks' && 'assigned_worker_id' in dbItem) {
              dbItem.assigned_to = dbItem.assigned_worker_id;
              delete dbItem.assigned_worker_id;
          }

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
      if (!isConfigured) {
          if (!activeProjectId) return;
          const storageKey = `${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`;
          const currentListJson = localStorage.getItem(storageKey);
          const currentList = currentListJson ? JSON.parse(currentListJson) : [];
          const newList = currentList.map((i: any) => i.id === id ? { ...i, ...item } : i);
          localStorage.setItem(storageKey, JSON.stringify(newList));
          setProjectData(prev => ({ ...prev, [resource]: newList }));
          return;
      }

      // --- SUPABASE MODE ---
      try {
          const dbItem = mapKeysToSnake(item);
          delete dbItem.project_id;
          delete dbItem.id;

          if (resource === 'tasks' && 'assigned_worker_id' in dbItem) {
              dbItem.assigned_to = dbItem.assigned_worker_id;
              delete dbItem.assigned_worker_id;
          }

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
      if (!isConfigured) {
          if (!activeProjectId) return;
          const storageKey = `${STORAGE_KEYS.DATA_PREFIX}${activeProjectId}_${resource}`;
          const currentListJson = localStorage.getItem(storageKey);
          const currentList = currentListJson ? JSON.parse(currentListJson) : [];
          const newList = currentList.filter((i: any) => i.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(newList));
          setProjectData(prev => ({ ...prev, [resource]: newList }));
          return;
      }
      const { error } = await supabase.from(TABLE_MAP[resource]).delete().eq('id', id);
      if (error) throw error;
      setProjectData(prev => ({ ...prev, [resource]: prev[resource].filter((i: any) => i.id !== id) }));
  };

  const addUser = async (user: User) => {
      const newUser = { ...user, id: user.id || generateId('user') };
      if (!isConfigured) {
          setAllUsers(prev => {
              const updatedUsers = [...prev, newUser];
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
              return updatedUsers;
          });
          return;
      }
      const { error } = await supabase.from('users').insert(mapKeysToSnake(newUser));
      if (error) throw error;
      setAllUsers(prev => [...prev, newUser]);
  };

  const updateUser = async (id: string, user: Partial<User>) => {
      if (!isConfigured) {
          setAllUsers(prev => {
              const updatedUsers = prev.map(u => u.id === id ? { ...u, ...user } : u);
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
              return updatedUsers;
          });
          return;
      }
      const { error } = await supabase.from('users').update(mapKeysToSnake(user)).eq('id', id);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
  };

  const deleteUser = async (id: string) => {
      if (!isConfigured) {
          setAllUsers(prev => {
              const updatedUsers = prev.filter(u => u.id !== id);
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
              return updatedUsers;
          });
          return;
      }
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setAllUsers(prev => prev.filter(u => u.id !== id));
  };

  const activeProject = allProjects.find(p => p.id === activeProjectId) || null;
  let visibleProjects = allProjects;
  if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
      visibleProjects = allProjects.filter(p => p.ownerId === currentUser.id || (p.collaboratorIds && p.collaboratorIds.includes(currentUser.id)));
  }

  const value = { projects: visibleProjects, activeProjectId, activeProject, switchProject, createProject, updateProject, deleteProject, shareProject, isReady, unlockedProjects, unlockProject, currentUser, projectData, loadingData, addItem, updateItem, deleteItem, allUsers, addUser, updateUser, deleteUser };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
