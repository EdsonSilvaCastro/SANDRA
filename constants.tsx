import React from 'react';
import { Material, Worker, Task, Expense, Photo, BudgetCategory, MaterialOrder, TimeLog } from './types';

export const initialMaterials: Material[] = [
    { id: 'mat-1', name: 'Cemento', description: 'Portland Tipo I', quantity: 100, unit: 'sacos', unitCost: 10, criticalStockLevel: 20 },
    { id: 'mat-2', name: 'Arena', description: 'Arena fina de construcción', quantity: 50, unit: 'm³', unitCost: 25, criticalStockLevel: 10 },
    { id: 'mat-3', name: 'Varilla', description: 'Varilla de acero de 1/2 pulgada', quantity: 200, unit: 'piezas', unitCost: 5, criticalStockLevel: 50 },
];

export const initialWorkers: Worker[] = [
    { id: 'wor-1', name: 'Juan Pérez', role: 'Capataz', hourlyRate: 35 },
    { id: 'wor-2', name: 'María García', role: 'Electricista', hourlyRate: 45 },
    { id: 'wor-3', name: 'Pedro González', role: 'Plomero', hourlyRate: 42 },
];

export const initialTasks: Task[] = [
    { id: 'tsk-1', name: 'Vaciado de Cimientos', description: 'Vaciar concreto para los cimientos principales', assignedWorkerId: 'wor-1', startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'En Progreso', totalVolume: 100, completedVolume: 40, volumeUnit: 'm³' },
    { id: 'tsk-2', name: 'Cableado Eléctrico', description: 'Instalar líneas eléctricas principales', assignedWorkerId: 'wor-2', startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'No Iniciado', totalVolume: 500, completedVolume: 0, volumeUnit: 'm' },
];

export const initialTimeLogs: TimeLog[] = [
    { id: 'log-1', taskId: 'tsk-1', workerId: 'wor-1', hours: 8, date: new Date().toISOString().split('T')[0] }
];

export const initialBudgetCategories: BudgetCategory[] = [
    { id: 'cat-1', name: 'Materiales', allocated: 20000 },
    { id: 'cat-2', name: 'Mano de Obra', allocated: 30000 },
    { id: 'cat-3', name: 'Permisos', allocated: 5000 },
];

export const initialExpenses: Expense[] = [
    { id: 'exp-1', description: 'Compra inicial de cemento', amount: 1000, categoryId: 'cat-1', date: new Date().toISOString().split('T')[0] },
    { id: 'exp-2', description: 'Permiso de construcción municipal', amount: 2500, categoryId: 'cat-3', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
];

export const initialPhotos: Photo[] = [];

export const initialMaterialOrders: MaterialOrder[] = [
    { id: 'ord-1', materialId: 'mat-1', quantity: 50, orderDate: new Date().toISOString().split('T')[0], status: 'Enviado' }
];


// FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
export const ICONS: { [key: string]: React.ReactElement } = {
  'Panel': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  'Materiales': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>,
  'Mano de Obra': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  'Presupuesto': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  'Cronograma': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  'Bitácora de Fotos': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  'Reportes': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
};