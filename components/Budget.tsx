
import React, { useState, useMemo } from 'react';
import { BudgetCategory, Expense, Task } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
import ExcelImportModal from './ui/ExcelImportModal';
import { useProject } from '../contexts/ProjectContext';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// FIX: Import format from date-fns to resolve "Cannot find name 'format'" error.
import { format } from 'date-fns';

const Budget: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const { budgetCategories, expenses, tasks } = projectData;
    
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});
    const [isEditingExpense, setIsEditingExpense] = useState(false);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<BudgetCategory>>({});
    const [isEditingCategory, setIsEditingCategory] = useState(false);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');

    // CÁLCULO DINÁMICO DE DESTAJOS (Mano de Obra Producida)
    const totalProducedLabor = useMemo(() => {
        return tasks.reduce((sum, task) => {
            return sum + ((task.completedVolume || 0) * (task.unitPrice || 0));
        }, 0);
    }, [tasks]);

    // Función para obtener el gasto real de una categoría (Gasto manual + Destajo si es Mano de Obra)
    const getCategorySpent = (category: BudgetCategory) => {
        const manualSpent = expenses.filter(e => e.categoryId === category.id).reduce((sum, e) => sum + e.amount, 0);
        // Si la categoría es "Mano de Obra" (detectado por nombre), sumamos lo producido en planificación
        if (category.name.toLowerCase().includes('mano de obra') || category.name.toLowerCase().includes('labor')) {
            return manualSpent + totalProducedLabor;
        }
        return manualSpent;
    };

    const totalAllocated = useMemo(() => budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0), [budgetCategories]);
    const totalSpent = useMemo(() => budgetCategories.reduce((acc, cat) => acc + getCategorySpent(cat), 0), [budgetCategories, expenses, totalProducedLabor]);
    
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    const expenseChartData = budgetCategories.map(cat => ({
        name: cat.name,
        value: getCategorySpent(cat)
    })).filter(d => d.value > 0);

    const handleOpenExpenseModal = (expense?: Expense) => {
        if (!canEdit) return;
        setValidationError('');
        if (expense) {
            setCurrentExpense({ ...expense });
            setIsEditingExpense(true);
        } else {
            setCurrentExpense({ date: new Date().toISOString().split('T')[0] });
            setIsEditingExpense(false);
        }
        setIsExpenseModalOpen(true);
    };

    // FIX: Define handleOpenCategoryModal to resolve "Cannot find name 'handleOpenCategoryModal'" error.
    const handleOpenCategoryModal = (category?: BudgetCategory) => {
        if (!canEdit) return;
        setValidationError('');
        if (category) {
            setCurrentCategory({ ...category });
            setIsEditingCategory(true);
        } else {
            setCurrentCategory({});
            setIsEditingCategory(false);
        }
        setIsCategoryModalOpen(true);
    };

    const handleSaveExpense = async () => {
        if (!canEdit) return;
        if (!currentExpense.description || currentExpense.amount === undefined || !currentExpense.categoryId || !currentExpense.date) {
            setValidationError('Por favor, complete todos los campos.');
            return;
        }

        const expenseData = {
            description: currentExpense.description,
            amount: Number(currentExpense.amount),
            categoryId: currentExpense.categoryId,
            date: currentExpense.date
        };

        if (isEditingExpense && currentExpense.id) {
            await updateItem('expenses', currentExpense.id, expenseData);
        } else {
            await addItem('expenses', { ...expenseData, id: `exp-${Date.now()}` });
        }
        setIsExpenseModalOpen(false);
    };
    
    const handleSaveCategory = async () => {
        if (!canEdit) return;
        if (!currentCategory.name || currentCategory.allocated === undefined) {
            setValidationError('Nombre y Monto son obligatorios.');
            return;
        }
        
        const categoryData = { name: currentCategory.name, allocated: Number(currentCategory.allocated) };

        if (isEditingCategory && currentCategory.id) {
            await updateItem('budgetCategories', currentCategory.id, categoryData);
        } else {
            await addItem('budgetCategories', { ...categoryData, id: `cat-${Date.now()}` });
        }
        setIsCategoryModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-black">Presupuesto Maestro</h2>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border text-black rounded-lg hover:bg-gray-50 font-bold text-sm shadow-sm transition-all">Importar Excel</button>
                        <button onClick={() => handleOpenExpenseModal()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-sm shadow-md transition-all">Añadir Gasto Directo</button>
                    </div>
                )}
            </div>
            
            <Card className="bg-slate-900 border-none text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Presupuesto Global</p>
                        <p className="text-4xl font-black">${totalAllocated.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Ejecutado (Gastos + Destajos)</p>
                        <p className="text-4xl font-black text-blue-400">${totalSpent.toLocaleString()}</p>
                        <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase">
                            Incluye ${totalProducedLabor.toLocaleString()} en destajos de obra
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Disponible</p>
                        <p className={`text-4xl font-black ${(totalAllocated - totalSpent) < 0 ? 'text-red-500' : 'text-green-400'}`}>
                            ${(totalAllocated - totalSpent).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="mt-6">
                    <ProgressBar value={(totalSpent / totalAllocated) * 100} color={(totalSpent / totalAllocated) > 0.9 ? 'red' : 'blue'} className="h-3 bg-slate-800" />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Desglose por Categorías">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {budgetCategories.map(cat => {
                                const spent = getCategorySpent(cat);
                                const isLabor = cat.name.toLowerCase().includes('mano de obra');
                                const progress = (spent / cat.allocated) * 100;
                                
                                return (
                                    <div key={cat.id} className="p-4 border rounded-xl hover:shadow-md transition-shadow cursor-pointer group" onClick={() => handleOpenCategoryModal(cat)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-black group-hover:text-primary-600 transition-colors">
                                                {cat.name}
                                                {isLabor && <span className="ml-2 text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black uppercase">Auto-Destajo</span>}
                                            </h4>
                                            <span className="text-[10px] font-black text-gray-400 uppercase">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Asignado</p>
                                                <p className="text-sm font-bold text-black">${cat.allocated.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Consumido</p>
                                                <p className={`text-sm font-bold ${progress > 100 ? 'text-red-600' : 'text-primary-600'}`}>${spent.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <ProgressBar value={progress} color={progress > 100 ? 'red' : 'blue'} />
                                    </div>
                                );
                            })}
                            {canEdit && (
                                <button onClick={() => setIsCategoryModalOpen(true)} className="border-2 border-dashed rounded-xl p-4 text-gray-400 font-bold text-sm hover:bg-gray-50 hover:border-primary-400 transition-all">
                                    + Nueva Categoría Presupuestaria
                                </button>
                            )}
                        </div>
                    </Card>

                    <Card title="Últimos Gastos Directos" className="mt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-black">
                                <thead>
                                    <tr className="border-b bg-gray-50 font-black uppercase text-[10px] text-gray-500">
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Descripción</th>
                                        <th className="p-3">Categoría</th>
                                        <th className="p-3 text-right">Monto</th>
                                        {canEdit && <th className="p-3 text-center">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                        <tr key={exp.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">{format(new Date(exp.date), 'dd/MM/yyyy')}</td>
                                            <td className="p-3 font-medium">{exp.description}</td>
                                            <td className="p-3">{budgetCategories.find(c => c.id === exp.categoryId)?.name}</td>
                                            <td className="p-3 text-right font-bold text-primary-700">${exp.amount.toLocaleString()}</td>
                                            {canEdit && (
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleOpenExpenseModal(exp)} className="text-gray-400 hover:text-primary-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                        <button onClick={() => { setDeleteConfirmation({isOpen: true, id: exp.id, name: exp.description}); }} className="text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Gasto por Partida">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Resumen de Mano de Obra (Destajos)">
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-800 uppercase mb-1">Monto Producido en Campo</p>
                                <p className="text-2xl font-black text-blue-900">${totalProducedLabor.toLocaleString()}</p>
                                <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase">Este monto se descuenta automáticamente del presupuesto de "Mano de Obra"</p>
                            </div>
                            <div className="space-y-2">
                                {tasks.filter(t => (t.completedVolume || 0) > 0).slice(0, 5).map(task => (
                                    <div key={task.id} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600 truncate mr-2 font-medium">{task.name}</span>
                                        <span className="font-bold text-black">${((task.completedVolume || 0) * (task.unitPrice || 0)).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modales de Edición */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title={isEditingExpense ? 'Editar Gasto Directo' : 'Registrar Nuevo Gasto Directo'}>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Descripción</label>
                        <input type="text" value={currentExpense.description || ''} onChange={e => setCurrentExpense({...currentExpense, description: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Monto ($)</label>
                            <input type="number" value={currentExpense.amount || ''} onChange={e => setCurrentExpense({...currentExpense, amount: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Categoría</label>
                            <select value={currentExpense.categoryId || ''} onChange={e => setCurrentExpense({...currentExpense, categoryId: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-bold">
                                <option value="">Seleccionar...</option>
                                {budgetCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha</label>
                        <input type="date" value={currentExpense.date || ''} onChange={e => setCurrentExpense({...currentExpense, date: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                    </div>
                    <button onClick={handleSaveExpense} className="w-full py-4 bg-primary-600 text-white rounded-xl font-black shadow-lg hover:bg-primary-700 transition-all uppercase tracking-wider">Guardar Gasto</button>
                </div>
            </Modal>

            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={isEditingCategory ? 'Editar Categoría' : 'Nueva Categoría Presupuestaria'}>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre de la Categoría</label>
                        <input type="text" value={currentCategory.name || ''} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Presupuesto Asignado ($)</label>
                        <input type="number" value={currentCategory.allocated || ''} onChange={e => setCurrentCategory({...currentCategory, allocated: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                    </div>
                    <button onClick={handleSaveCategory} className="w-full py-4 bg-primary-600 text-white rounded-xl font-black shadow-lg hover:bg-primary-700 transition-all uppercase tracking-wider">Guardar Categoría</button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={async () => { if (deleteConfirmation.id) await deleteItem('expenses', deleteConfirmation.id); }}
                title="Eliminar Gasto"
                message={`¿Eliminar el gasto "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Budget;
