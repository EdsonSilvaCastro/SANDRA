
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Material, MaterialOrder, Worker, Task, TimeLog, BudgetCategory, Expense, Photo, Client, Interaction } from '../types';
import { supabase } from '../lib/supabaseClient';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  pin?: string;
}

// Define a mapping for JS keys to DB keys
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
    budgetCategories: 'budget_categories',
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

export const ProjectProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [unlockedProjects, setUnlockedProjects] = useState<Record<string, boolean>>({});
  
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_DATA);
  const [loadingData, setLoadingData] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // 1. Load Projects and Users on mount
  useEffect(() => {
    const init = async () => {
        try {
            // Fetch Projects
            const { data: projectsData, error: projError } = await supabase.from('projects').select('*');
            if (projError) console.error('Error fetching projects:', projError);
            
            if (projectsData) {
                setAllProjects(mapKeysToCamel(projectsData));
            }

            // Fetch Users
            const { data: usersData, error: usersError } = await supabase.from('users').select('*');
            if (usersError) console.error('Error fetching users:', usersError);
            if (usersData) {
                setAllUsers(mapKeysToCamel(usersData));
            }
            
            setIsReady(true);
        } catch (err) {
            console.error(err);
            setIsReady(true);
        }
    };
    init();
  }, []);

  // 2. Handle Active Project Selection Logic
  useEffect(() => {
    if (!isReady) return;
    
    let projectsForCurrentUser = allProjects;
    if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
         projectsForCurrentUser = allProjects.filter(p => p.ownerId === currentUser.id);
    }
    
    if (projectsForCurrentUser.length > 0 && !activeProjectId) {
        // Try to restore from local storage for UX, but validate against list
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

  // 3. Fetch Project Data when activeProjectId changes
  useEffect(() => {
    if (!activeProjectId) {
        setProjectData(INITIAL_DATA);
        return;
    }

    const fetchProjectData = async () => {
        setLoadingData(true);
        try {
            const promises = Object.entries(TABLE_MAP).map(async ([key, table]) => {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('project_id', activeProjectId);
                
                if (error) {
                    console.error(`Error fetching ${table}:`, error);
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

        } catch (error) {
            console.error("Error fetching project data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    fetchProjectData();
  }, [activeProjectId]);


  const switchProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem(`constructpro_lastActive_${currentUser.id}`, id);
  };

  const createProject = async (name: string, pin?: string) => {
    const newProject = {
        id: `proj-${Date.now()}`,
        name,
        pin,
        owner_id: currentUser.id
    };

    const { error } = await supabase.from('projects').insert(newProject);
    
    if (!error) {
        const createdProject = mapKeysToCamel(newProject);
        setAllProjects(prev => [...prev, createdProject]);
        switchProject(createdProject.id);
    } else {
        console.error("Error creating project:", error);
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'ownerId'>>) => {
    const dbData = mapKeysToSnake(data);
    const { error } = await supabase.from('projects').update(dbData).eq('id', id);

    if (!error) {
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } else {
        console.error("Error updating project:", error);
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    
    if (!error) {
        setAllProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) {
            setActiveProjectId(null);
        }
    } else {
         console.error("Error deleting project:", error);
    }
  };

  const unlockProject = (id: string) => {
    setUnlockedProjects(prev => ({...prev, [id]: true}));
  };

  // --- Generic CRUD for Project Data ---

  const addItem = async (resource: keyof ProjectData, item: any) => {
      if (!activeProjectId) return;
      const itemWithProject = { ...item, project_id: activeProjectId };
      const dbItem = mapKeysToSnake(itemWithProject);
      
      const { error } = await supabase.from(TABLE_MAP[resource]).insert(dbItem);
      
      if (!error) {
          setProjectData(prev => ({
              ...prev,
              [resource]: [...prev[resource], item]
          }));
      } else {
          console.error(`Error adding to ${resource}:`, error);
          alert(`Error al guardar: ${error.message}`);
      }
  };

  const updateItem = async (resource: keyof ProjectData, id: string, item: any) => {
      const dbItem = mapKeysToSnake(item);
      // Avoid updating project_id just in case, though it shouldn't change
      delete dbItem.project_id; 
      
      const { error } = await supabase.from(TABLE_MAP[resource]).update(dbItem).eq('id', id);
      
      if (!error) {
          setProjectData(prev => ({
              ...prev,
              [resource]: prev[resource].map((i: any) => i.id === id ? { ...i, ...item } : i)
          }));
      } else {
          console.error(`Error updating ${resource}:`, error);
          alert(`Error al actualizar: ${error.message}`);
      }
  };

  const deleteItem = async (resource: keyof ProjectData, id: string) => {
      const { error } = await supabase.from(TABLE_MAP[resource]).delete().eq('id', id);
      
      if (!error) {
          setProjectData(prev => ({
              ...prev,
              [resource]: prev[resource].filter((i: any) => i.id !== id)
          }));
      } else {
          console.error(`Error deleting from ${resource}:`, error);
          alert(`Error al eliminar: ${error.message}`);
      }
  };

  // --- User Management ---
  const addUser = async (user: User) => {
      const dbUser = mapKeysToSnake(user);
      const { error } = await supabase.from('users').insert(dbUser);
      if (!error) {
          setAllUsers(prev => [...prev, user]);
      } else {
          console.error("Error adding user:", error);
          throw error;
      }
  };

  const updateUser = async (id: string, user: Partial<User>) => {
      const dbUser = mapKeysToSnake(user);
      const { error } = await supabase.from('users').update(dbUser).eq('id', id);
      if (!error) {
          setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
      } else {
          console.error("Error updating user:", error);
      }
  };

  const deleteUser = async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) {
          setAllUsers(prev => prev.filter(u => u.id !== id));
      } else {
           console.error("Error deleting user:", error);
      }
  };

  const activeProject = allProjects.find(p => p.id === activeProjectId) || null;
  
  // Filter projects based on role logic for the "projects" prop exposed to consumers
  let visibleProjects = allProjects;
  if (currentUser.role !== 'admin' && currentUser.role !== 'viewer') {
      visibleProjects = allProjects.filter(p => p.ownerId === currentUser.id);
  }

  const value = { 
      projects: visibleProjects, 
      activeProjectId, 
      activeProject, 
      switchProject, 
      createProject, 
      updateProject, 
      deleteProject, 
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
