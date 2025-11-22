
export interface Material {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  criticalStockLevel: number;
  location?: string;
}

export interface MaterialOrder {
  id: string;
  materialId: string;
  quantity: number;
  orderDate: string;
  status: 'Pendiente' | 'Enviado' | 'Entregado' | 'Cancelado';
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignedWorkerId?: string;
  startDate: string;
  endDate: string;
  status: 'No Iniciado' | 'En Progreso' | 'Completado' | 'Retrasado';
  completionDate?: string;
  totalVolume?: number;
  completedVolume?: number;
  volumeUnit?: string;
  photoIds?: string[];
  dependsOn?: string[];
  totalValue?: number;
}

export interface TimeLog {
  id: string;
  taskId: string;
  workerId: string;
  hours: number;
  date: string;
}

export interface BudgetCategory {
    id: string;
    name: string;
    allocated: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  date: string;
}

export interface Photo {
  id: string;
  url: string; // base64
  description: string;
  tags: string[];
  uploadDate: string;
}

export interface Client {
  id: string;
  name: string;
  type: 'Empresa' | 'Individual';
  status: 'Activo' | 'Inactivo' | 'Potencial';
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  address: string;
  notes: string;
}

export interface Interaction {
  id: string;
  clientId: string;
  date: string;
  type: 'Llamada' | 'Correo Electrónico' | 'Reunión' | 'Otro';
  summary: string;
  followUpDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role?: 'admin' | 'user' | 'viewer'; // Added 'viewer'
}

export interface ContentEntry {
  id: string;
  title: string;
  content: string;
  author: string;
  status: 'Borrador' | 'Publicado';
  createdAt: string;
  updatedAt: string;
  tags: string[];
}
