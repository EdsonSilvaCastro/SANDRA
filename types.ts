
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