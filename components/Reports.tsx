
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialMaterials, initialMaterialOrders, initialWorkers, initialTasks, initialTimeLogs, initialBudgetCategories, initialExpenses } from '../constants';
import { Material, MaterialOrder, Worker, Task, TimeLog, BudgetCategory, Expense } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const Reports: React.FC = () => {
    const [reportType, setReportType] = useState<string | null>(null);

    // Cargar todos los datos necesarios desde el almacenamiento local
    const [materials] = useLocalStorage<Material[]>('materials', initialMaterials);
    const [orders] = useLocalStorage<MaterialOrder[]>('materialOrders', initialMaterialOrders);
    const [workers] = useLocalStorage<Worker[]>('workers', initialWorkers);
    const [tasks] = useLocalStorage<Task[]>('tasks', initialTasks);
    const [timeLogs] = useLocalStorage<TimeLog[]>('timeLogs', initialTimeLogs);
    const [budgetCategories] = useLocalStorage<BudgetCategory[]>('budgetCategories', initialBudgetCategories);
    const [expenses] = useLocalStorage<Expense[]>('expenses', initialExpenses);

    const generateReportHeader = (title: string) => (
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-black">ConstructPro Gerente</h2>
            <h3 className="text-xl font-semibold text-black">{title}</h3>
            <p className="text-sm text-black">Generado el: {new Date().toLocaleString()}</p>
        </div>
    );

    const renderBudgetReport = () => {
        const totalAllocated = budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0);
        const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        return (
            <div>
                {generateReportHeader("Reporte de Presupuesto")}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-sm text-black">Total Asignado</p>
                        <p className="text-2xl font-bold">${totalAllocated.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg">
                        <p className="text-sm text-black">Total Gastado</p>
                        <p className="text-2xl font-bold text-black">${totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-green-100 rounded-lg">
                        <p className="text-sm text-black">Restante</p>
                        <p className="text-2xl font-bold text-black">${(totalAllocated - totalSpent).toLocaleString()}</p>
                    </div>
                </div>
                <h4 className="text-lg font-semibold mb-2">Gastos por Categoría</h4>
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="p-2">Categoría</th><th className="p-2">Asignado</th><th className="p-2">Gastado</th><th className="p-2">Restante</th></tr></thead>
                    <tbody>
                        {budgetCategories.map(cat => {
                            const spent = expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0);
                            return (<tr key={cat.id} className="border-b"><td className="p-2">{cat.name}</td><td className="p-2">${cat.allocated.toLocaleString()}</td><td className="p-2">${spent.toLocaleString()}</td><td className="p-2">${(cat.allocated - spent).toLocaleString()}</td></tr>);
                        })}
                    </tbody>
                </table>
            </div>
        );
    };
    
    const renderMaterialsReport = () => {
        return (
            <div>
                {generateReportHeader("Reporte de Materiales")}
                <h4 className="text-lg font-semibold mb-2">Resumen de Inventario</h4>
                <table className="w-full text-left text-sm mb-6">
                    <thead><tr className="border-b bg-gray-50"><th className="p-2">Material</th><th className="p-2">Cantidad Actual</th><th className="p-2">Nivel Crítico</th><th className="p-2">Estado</th></tr></thead>
                    <tbody>
                        {materials.map(mat => (
                            <tr key={mat.id} className="border-b">
                                <td className="p-2">{mat.name}</td>
                                <td className="p-2">{mat.quantity} {mat.unit}</td>
                                <td className="p-2">{mat.criticalStockLevel} {mat.unit}</td>
                                <td className="p-2">
                                    {mat.quantity <= mat.criticalStockLevel ? 
                                        (<span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">Bajo Stock</span>) :
                                        (<span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">En Stock</span>)
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <h4 className="text-lg font-semibold mb-2">Pedidos Recientes</h4>
                 <table className="w-full text-left text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="p-2">Material</th><th className="p-2">Cantidad</th><th className="p-2">Fecha</th><th className="p-2">Estado</th></tr></thead>
                    <tbody>
                        {orders.map(order => {
                            const material = materials.find(m => m.id === order.materialId);
                            return (<tr key={order.id} className="border-b"><td className="p-2">{material?.name}</td><td className="p-2">{order.quantity}</td><td className="p-2">{new Date(order.orderDate).toLocaleDateString()}</td><td className="p-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    order.status === 'Entregado' ? 'bg-green-500 text-white' :
                                    order.status === 'Enviado' ? 'bg-blue-500 text-white' :
                                    order.status === 'Pendiente' ? 'bg-yellow-400 text-black' :
                                    order.status === 'Cancelado' ? 'bg-gray-500 text-white' : ''
                                }`}>
                                    {order.status}
                                </span>
                            </td></tr>)
                        })}
                    </tbody>
                 </table>
            </div>
        );
    };

    const renderLaborReport = () => {
         return (
            <div>
                {generateReportHeader("Reporte de Mano de Obra")}
                <h4 className="text-lg font-semibold mb-2">Resumen de Costos por Trabajador</h4>
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="p-2">Trabajador</th><th className="p-2">Cargo</th><th className="p-2">Horas Totales</th><th className="p-2">Costo Total</th></tr></thead>
                    <tbody>
                        {workers.map(worker => {
                            const totalHours = timeLogs.filter(log => log.workerId === worker.id).reduce((acc, log) => acc + log.hours, 0);
                            const totalCost = totalHours * worker.hourlyRate;
                            return (
                                <tr key={worker.id} className="border-b">
                                    <td className="p-2">{worker.name}</td>
                                    <td className="p-2">{worker.role}</td>
                                    <td className="p-2">{totalHours}</td>
                                    <td className="p-2 font-bold">${totalCost.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
         )
    };
    
    const renderProgressReport = () => {
        const tasksByStatus = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<Task['status'], number>);
        
        const getTaskProgress = (task: Task) => {
            if (task.status === 'Completado') return 100;
            if (task.status === 'No Iniciado') return 0;
            const totalDuration = new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
            if (totalDuration <= 0) return 0;
            const elapsedDuration = new Date().getTime() - new Date(task.startDate).getTime();
            if (elapsedDuration <= 0) return 0;
            return Math.min(100, (elapsedDuration / totalDuration) * 100);
        };
    
        const sortedTasks = [...tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        if (tasks.length === 0) {
            return (
                <div>
                    {generateReportHeader("Reporte de Progreso del Proyecto")}
                    <p>No hay tareas para mostrar.</p>
                </div>
            );
        }

        const projectStartDate = Math.min(...sortedTasks.map(t => new Date(t.startDate).getTime()));
    
        const chartData = sortedTasks.map(task => {
            const start = new Date(task.startDate).getTime();
            const end = new Date(task.endDate).getTime();
            const duration = end - start > 0 ? end - start : 0;
    
            const progress = getTaskProgress(task);
            const completed = duration * (progress / 100);
            const remaining = duration - completed;
    
            return {
                name: task.name,
                offset: start - projectStartDate,
                completed: completed,
                remaining: remaining,
                startDate: new Date(start).toLocaleDateString(),
                endDate: new Date(end).toLocaleDateString(),
                status: task.status
            };
        });
    
        const domainEnd = Math.max(...sortedTasks.map(t => new Date(t.endDate).getTime())) - projectStartDate;
    
        const tickFormatter = (tick: number) => {
          const date = new Date(projectStartDate + tick);
          return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        };
    
        const CustomTooltip = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                    <div className="bg-white p-2 border shadow-lg rounded text-sm text-black">
                        <p className="font-bold">{label}</p>
                        <p>Inicio: {data.startDate}</p>
                        <p>Fin: {data.endDate}</p>
                        <p>Estado: {data.status}</p>
                    </div>
                );
            }
            return null;
        };

        return (
            <div>
                 {generateReportHeader("Reporte de Progreso del Proyecto")}
                 <div className="grid grid-cols-4 gap-4 mb-6 text-center">
                    <div className="p-2 bg-gray-100 rounded-lg"><p className="text-sm">No Iniciadas</p><p className="text-xl font-bold">{tasksByStatus['No Iniciado'] || 0}</p></div>
                    <div className="p-2 bg-blue-100 rounded-lg"><p className="text-sm">En Progreso</p><p className="text-xl font-bold">{tasksByStatus['En Progreso'] || 0}</p></div>
                    <div className="p-2 bg-green-100 rounded-lg"><p className="text-sm">Completadas</p><p className="text-xl font-bold">{tasksByStatus['Completado'] || 0}</p></div>
                    <div className="p-2 bg-red-100 rounded-lg"><p className="text-sm">Retrasadas</p><p className="text-xl font-bold">{tasksByStatus['Retrasado'] || 0}</p></div>
                 </div>
                 <h4 className="text-lg font-semibold my-4">Cronograma de Tareas</h4>
                 <div style={{ width: '100%', height: 35 * sortedTasks.length + 60, minHeight: 250 }}>
                     <ResponsiveContainer>
                         <BarChart
                             layout="vertical"
                             data={chartData}
                             margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                             barCategoryGap="35%"
                         >
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" domain={[0, 'auto']} tickFormatter={tickFormatter} />
                             <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#000' }} />
                             <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(240, 240, 240, 0.5)'}} />
                             <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}}/>
                             <Bar dataKey="offset" stackId="a" fill="transparent" name="Periodo de Espera" />
                             <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Progreso" />
                             <Bar dataKey="remaining" stackId="a" fill="#d1d5db" name="Restante" />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
            </div>
        )
    };

    const getReportContent = () => {
        switch (reportType) {
            case 'budget': return renderBudgetReport();
            case 'materials': return renderMaterialsReport();
            case 'labor': return renderLaborReport();
            case 'progress': return renderProgressReport();
            default: return null;
        }
    };
    
    const getReportTitle = () => {
        switch (reportType) {
            case 'budget': return "Reporte de Presupuesto";
            case 'materials': return "Reporte de Materiales";
            case 'labor': return "Reporte de Mano de Obra";
            case 'progress': return "Reporte de Progreso";
            default: return "Reporte";
        }
    };

    const reportOptions = [
        { key: 'budget', title: 'Reporte de Presupuesto', description: 'Resumen de gastos, asignaciones y presupuesto restante.' },
        { key: 'materials', title: 'Reporte de Materiales', description: 'Estado del inventario, artículos con stock bajo y pedidos.' },
        { key: 'labor', title: 'Reporte de Mano de Obra', description: 'Horas trabajadas y costos laborales por trabajador.' },
        { key: 'progress', title: 'Reporte de Progreso', description: 'Estado de las tareas, cronograma y progreso general.' },
    ];
    
    return (
        <div>
            <h2 className="text-3xl font-semibold text-black mb-6">Generación de Reportes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportOptions.map(opt => (
                    <Card key={opt.key}>
                        <h3 className="text-xl font-semibold text-black mb-2">{opt.title}</h3>
                        <p className="text-black mb-4">{opt.description}</p>
                        <button 
                            onClick={() => setReportType(opt.key)} 
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors w-full sm:w-auto"
                        >
                            Generar Reporte
                        </button>
                    </Card>
                ))}
            </div>

            <Modal isOpen={!!reportType} onClose={() => setReportType(null)} title={getReportTitle()}>
                <div className="printable-area">
                    {getReportContent()}
                </div>
                <div className="mt-6 flex justify-end gap-3 no-print">
                    <button onClick={() => setReportType(null)} className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300">Cerrar</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Imprimir</button>
                </div>
            </Modal>
        </div>
    );
};

export default Reports;
