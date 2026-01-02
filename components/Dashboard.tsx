
import React from 'react';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import { useProject } from '../contexts/ProjectContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Task } from '../types';

const Dashboard: React.FC = () => {
  const { projectData } = useProject();
  
  const tasks = projectData.tasks;
  const materials = projectData.materials;
  const budgetCategories = projectData.budgetCategories;
  const expenses = projectData.expenses;

  // Helper para obtener el progreso de una tarea individual (0 a 1)
  const getTaskProgressFactor = (task: Task): number => {
    if (task.totalVolume && task.totalVolume > 0) {
      return Math.min(1, (task.completedVolume || 0) / task.totalVolume);
    }
    if (task.status === 'Completado') return 1;
    if (task.status === 'En Progreso') return 0.1; // Valor base si está en progreso pero sin volumen definido
    return 0;
  };

  const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0);
  const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Cálculo de Progreso del Proyecto Ponderado
  // Si las tareas tienen valor monetario, usamos Valor Ganado (Earned Value)
  // Si no, usamos el promedio simple de los porcentajes de cada tarea.
  const tasksWithTotalValue = tasks.filter(t => (t.totalValue || 0) > 0);
  const totalProjectValue = tasks.reduce((acc, task) => acc + (task.totalValue || 0), 0);

  let projectProgress = 0;
  if (tasks.length > 0) {
    if (totalProjectValue > 0) {
      // Ponderación por Valor Económico (Más preciso para construcción)
      const earnedValue = tasks.reduce((acc, task) => {
        return acc + ((task.totalValue || 0) * getTaskProgressFactor(task));
      }, 0);
      projectProgress = (earnedValue / totalProjectValue) * 100;
    } else {
      // Ponderación Equitativa (Promedio simple de avances)
      const sumProgress = tasks.reduce((acc, task) => acc + getTaskProgressFactor(task), 0);
      projectProgress = (sumProgress / tasks.length) * 100;
    }
  }

  const executedWorkValue = tasks.reduce((acc, task) => {
    return acc + ((task.totalValue || 0) * getTaskProgressFactor(task));
  }, 0);

  const lowStockItems = materials.filter(m => m.quantity <= m.criticalStockLevel);

  const budgetChartData = budgetCategories.map(cat => {
    const spent = expenses.filter(exp => exp.categoryId === cat.id).reduce((sum, exp) => sum + exp.amount, 0);
    return { name: cat.name, Asignado: cat.allocated, Gastado: spent };
  });

  const upcomingTasks = [...tasks]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);
    
  const taskStatusCounts = upcomingTasks.reduce((acc, task) => {
    const status = task.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const taskStatusChartData = [
      { name: 'No Iniciado', Tareas: taskStatusCounts['No Iniciado'] || 0 },
      { name: 'En Progreso', Tareas: taskStatusCounts['En Progreso'] || 0 },
      { name: 'Retrasado', Tareas: taskStatusCounts['Retrasado'] || 0 },
      { name: 'Completado', Tareas: taskStatusCounts['Completado'] || 0 },
  ].filter(item => item.Tareas > 0);

  const TASK_STATUS_COLORS: { [key: string]: string } = {
      'No Iniciado': '#a1a1aa',
      'En Progreso': '#3b82f6',
      'Retrasado': '#ef4444',
      'Completado': '#22c55e',
  };
  
  return (
    <div>
      <h2 className="text-3xl font-semibold text-black mb-6">Panel del Proyecto</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <h4 className="font-medium text-black">Presupuesto Total</h4>
          <p className="text-3xl font-bold text-black">${totalBudget.toLocaleString()}</p>
        </Card>
        <Card>
          <h4 className="font-medium text-black">Monto Gastado</h4>
          <p className="text-3xl font-bold text-black">${totalSpent.toLocaleString()}</p>
        </Card>
        <Card>
          <h4 className="font-medium text-black">Valor del Trabajo Ejecutado</h4>
          <p className="text-3xl font-bold text-black">${executedWorkValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </Card>
        <Card>
          <h4 className="font-medium text-black">Progreso del Proyecto</h4>
          <p className="text-3xl font-bold text-black">{projectProgress.toFixed(1)}%</p>
          <ProgressBar value={projectProgress} color="green" className="mt-2" />
        </Card>
        <Card>
          <h4 className="font-medium text-black">Artículos con Stock Bajo</h4>
          <p className="text-3xl font-bold text-black">{lowStockItems.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Resumen del Presupuesto">
           <div className="mb-4">
             <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-black">Ejecución Presupuestaria</span>
                <span className="text-sm font-medium text-black">{budgetProgress.toFixed(1)}%</span>
            </div>
            <ProgressBar value={budgetProgress} color={budgetProgress > 100 ? 'red' : budgetProgress > 85 ? 'yellow' : 'blue'} />
           </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={budgetChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Asignado" fill="#8884d8" />
                <Bar dataKey="Gastado" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Próximas Tareas">
          <ul className="space-y-3">
            {upcomingTasks.map(task => (
              <li key={task.id} className="p-3 bg-gray-50 rounded-md">
                <p className="font-semibold text-black">{task.name}</p>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-black">Vence: {new Date(task.endDate).toLocaleDateString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${TASK_STATUS_COLORS[task.status] || 'bg-gray-400'}`}>
                        {task.status}
                    </span>
                </div>
              </li>
            ))}
             {upcomingTasks.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay tareas próximas.</p>
            )}
          </ul>
           {taskStatusChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ width: '100%', height: 150 }}>
                <h5 className="text-sm font-semibold text-black mb-2 text-center">Estado de las Próximas 5 Tareas</h5>
                <ResponsiveContainer>
                    <BarChart data={taskStatusChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{fill: '#fafafa'}} />
                        <Bar dataKey="Tareas" barSize={20}>
                            {taskStatusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={TASK_STATUS_COLORS[entry.name]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
