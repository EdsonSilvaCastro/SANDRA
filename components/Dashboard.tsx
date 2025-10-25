
import React from 'react';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialBudgetCategories, initialExpenses, initialTasks, initialMaterials } from '../constants';
import { BudgetCategory, Expense, Task, Material } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [tasks] = useLocalStorage<Task[]>('tasks', initialTasks);
  const [materials] = useLocalStorage<Material[]>('materials', initialMaterials);
  const [budgetCategories] = useLocalStorage<BudgetCategory[]>('budgetCategories', initialBudgetCategories);
  const [expenses] = useLocalStorage<Expense[]>('expenses', initialExpenses);

  const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0);
  const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const totalProjectVolume = tasks.reduce((acc, task) => acc + (task.totalVolume || 0), 0);
  const completedProjectVolume = tasks.reduce((acc, task) => acc + (task.completedVolume || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'Completado').length;
  
  const projectProgress = totalProjectVolume > 0 
      ? (completedProjectVolume / totalProjectVolume) * 100 
      : tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  
  const lowStockItems = materials.filter(m => m.quantity <= m.criticalStockLevel);

  const budgetChartData = budgetCategories.map(cat => {
    const spent = expenses.filter(exp => exp.categoryId === cat.id).reduce((sum, exp) => sum + exp.amount, 0);
    return { name: cat.name, Asignado: cat.allocated, Gastado: spent };
  });
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  return (
    <div>
      <h2 className="text-3xl font-semibold text-black mb-6">Panel del Proyecto</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <h4 className="font-medium text-black">Presupuesto Total</h4>
          <p className="text-3xl font-bold text-black">${totalBudget.toLocaleString()}</p>
        </Card>
        <Card>
          <h4 className="font-medium text-black">Monto Gastado</h4>
          <p className="text-3xl font-bold text-black">${totalSpent.toLocaleString()}</p>
        </Card>
        <Card>
          <h4 className="font-medium text-black">Progreso del Proyecto</h4>
          <p className="text-3xl font-bold text-black">{projectProgress.toFixed(0)}%</p>
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
                <span className="text-base font-medium text-black">Progreso del Presupuesto</span>
                <span className="text-sm font-medium text-black">{budgetProgress.toFixed(1)}%</span>
            </div>
            <ProgressBar value={budgetProgress} color={budgetProgress > 90 ? 'red' : budgetProgress > 75 ? 'yellow' : 'blue'} />
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
            {tasks.filter(t => t.status !== 'Completado').slice(0, 5).map(task => (
              <li key={task.id} className="p-3 bg-gray-50 rounded-md">
                <p className="font-semibold text-black">{task.name}</p>
                <p className="text-sm text-black">Vence: {new Date(task.endDate).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;