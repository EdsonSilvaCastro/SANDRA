
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

  // Helper para obtener el valor ejecutado de una tarea (Mano de Obra Producida)
  const getProducedValue = (task: Task): number => {
    return (task.completedVolume || 0) * (task.unitPrice || 0);
  };

  const totalProducedLabor = tasks.reduce((acc, task) => acc + getProducedValue(task), 0);
  const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0);
  
  // El gasto total ahora incluye los gastos directos registrados + los destajos producidos
  const manualExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalSpent = manualExpenses + totalProducedLabor;
  
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Cálculo de progreso del proyecto (Basado en volumen de obra producida vs programada)
  const totalPlannedValue = tasks.reduce((acc, task) => acc + ((task.totalVolume || 0) * (task.unitPrice || 0)), 0);
  const projectProgress = totalPlannedValue > 0 ? (totalProducedLabor / totalPlannedValue) * 100 : 0;

  const lowStockItems = materials.filter(m => m.quantity <= m.criticalStockLevel);

  const budgetChartData = budgetCategories.map(cat => {
    const isLabor = cat.name.toLowerCase().includes('mano de obra');
    const manualSpent = expenses.filter(exp => exp.categoryId === cat.id).reduce((sum, exp) => sum + exp.amount, 0);
    const spent = isLabor ? manualSpent + totalProducedLabor : manualSpent;
    return { name: cat.name, Asignado: cat.allocated, Gastado: spent };
  });

  const upcomingTasks = [...tasks]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);
    
  const TASK_STATUS_COLORS: { [key: string]: string } = {
      'No Iniciado': '#94a3b8',
      'En Progreso': '#3b82f6',
      'Retrasado': '#ef4444',
      'Completado': '#22c55e',
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-black tracking-tight">Panel de Control</h2>
            <p className="text-sm text-gray-500">Resumen financiero y operativo en tiempo real</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-l-4 border-l-primary-600">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Presupuesto Total</p>
          <p className="text-2xl font-black text-black">${totalBudget.toLocaleString()}</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-blue-600">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inversión Ejecutada</p>
          <p className="text-2xl font-black text-blue-600">${totalSpent.toLocaleString()}</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-green-600">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mano de Obra (Destajos)</p>
          <p className="text-2xl font-black text-green-600">${totalProducedLabor.toLocaleString()}</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-600">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Material Crítico</p>
          <p className="text-2xl font-black text-orange-600">{lowStockItems.length} SKUs</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Ejecución Presupuestaria por Partida">
           <div className="mb-6">
             <div className="flex justify-between mb-2">
                <span className="text-xs font-black text-black uppercase">Consumo Global</span>
                <span className="text-xs font-black text-black">{budgetProgress.toFixed(1)}%</span>
            </div>
            <ProgressBar value={budgetProgress} color={budgetProgress > 100 ? 'red' : budgetProgress > 85 ? 'yellow' : 'blue'} />
           </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={budgetChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 'bold', paddingTop: 20}} />
                <Bar dataKey="Asignado" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Próximos Hitos">
           <div className="mb-6">
             <div className="flex justify-between mb-2">
                <span className="text-xs font-black text-black uppercase">Avance de Obra</span>
                <span className="text-xs font-black text-black">{projectProgress.toFixed(1)}%</span>
            </div>
            <ProgressBar value={projectProgress} color="green" />
           </div>
          <ul className="space-y-4">
            {upcomingTasks.map(task => (
              <li key={task.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm text-black truncate pr-2">{task.name}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full text-white ${TASK_STATUS_COLORS[task.status] || 'bg-gray-400'}`}>
                        {task.status}
                    </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                    <span>${getProducedValue(task).toLocaleString()} EJEC.</span>
                    <span>VENCE: {new Date(task.endDate).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
             {upcomingTasks.length === 0 && (
                <p className="text-center text-gray-500 py-10 font-medium">No hay tareas programadas.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
