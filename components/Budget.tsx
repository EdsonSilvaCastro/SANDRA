
import React, { useState } from 'react';
import { BudgetCategory, Expense } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
import ExcelImportModal from './ui/ExcelImportModal';
import { useProject } from '../contexts/ProjectContext';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Budget: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const budgetCategories = projectData.budgetCategories;
    const expenses = projectData.expenses;
    
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});
    const [isEditingExpense, setIsEditingExpense] = useState(false);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<BudgetCategory>>({});
    const [isEditingCategory, setIsEditingCategory] = useState(false);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');


    const totalAllocatedFromCategories = budgetCategories.reduce((acc, cat) => acc + cat.allocated, 0);
    const displayTotalBudget = totalAllocatedFromCategories;
    const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const expenseChartData = budgetCategories.map(cat => ({
        name: cat.name,
        value: expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0)
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

    const handleCloseExpenseModal = () => {
        setIsExpenseModalOpen(false);
        setCurrentExpense({});
        setIsEditingExpense(false);
        setValidationError('');
    };

    const handleSaveExpense = async () => {
        if (!canEdit) return;
        if (!currentExpense.description || currentExpense.amount === undefined || !currentExpense.categoryId || !currentExpense.date) {
            setValidationError('Por favor, complete todos los campos (Descripción, Monto, Categoría, Fecha).');
            return;
        }

        try {
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
            handleCloseExpenseModal();
        } catch (error) {
            console.error("Error saving expense:", error);
            setValidationError("Error al guardar el gasto. Intente nuevamente.");
        }
    };
    
    const handleDeleteExpenseClick = (expenseId: string) => {
        if (!canEdit) return;
        const expenseToDelete = expenses.find(e => e.id === expenseId);
        if (expenseToDelete) {
            setDeleteConfirmation({ isOpen: true, id: expenseId, name: expenseToDelete.description });
        }
    };

    const confirmDeleteExpense = async () => {
        if (!canEdit) return;
        if (deleteConfirmation.id) {
            await deleteItem('expenses', deleteConfirmation.id);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };
    
    // Handlers for category modal
    const handleOpenCategoryModal = (category?: BudgetCategory) => {
        if (!canEdit) return;
        setValidationError('');
        if (category) {
            setCurrentCategory({ ...category });
            setIsEditingCategory(true);
        } else {
            setCurrentCategory({ name: '', allocated: 0 });
            setIsEditingCategory(false);
        }
        setIsCategoryModalOpen(true);
    };

    const handleCloseCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setCurrentCategory({});
        setValidationError('');
    };

    const handleSaveCategory = async () => {
        if (!canEdit) return;
        if (!currentCategory.name || currentCategory.allocated === undefined || currentCategory.allocated < 0) {
            setValidationError('Por favor, ingrese un nombre y un monto válido.');
            return;
        }
        
        try {
            const categoryData = {
                name: currentCategory.name,
                allocated: Number(currentCategory.allocated)
            };

            if (isEditingCategory && currentCategory.id) {
                await updateItem('budgetCategories', currentCategory.id, categoryData);
            } else {
                await addItem('budgetCategories', { ...categoryData, id: `cat-${Date.now()}` });
            }
            handleCloseCategoryModal();
        } catch (error) {
            console.error("Error saving category:", error);
            setValidationError("Error al guardar la categoría. Intente nuevamente.");
        }
    };

    // Excel Import Logic for Expenses
    const handleImportExpenses = async (data: any[]) => {
        let count = 0;
        let skippedCount = 0;
        
        for (const row of data) {
            // Match category by name (case insensitive)
            const categoryName = row['Categoría'];
            const category = budgetCategories.find(c => 
                c.name.trim().toLowerCase() === categoryName?.toString().trim().toLowerCase()
            );
            
            if (!category) {
                skippedCount++;
                continue; 
            }

            const parseDate = (val: any) => {
                if (!val) return new Date().toISOString().split('T')[0];
                if (typeof val === 'number') {
                    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
                    return date.toISOString().split('T')[0];
                }
                try {
                    const date = new Date(val);
                    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
                } catch(e) {}
                return new Date().toISOString().split('T')[0];
            };

            const newExpense = {
                description: row['Descripción'] || 'Sin descripción',
                amount: Number(row['Monto']) || 0,
                categoryId: category.id,
                date: parseDate(row['Fecha']),
                id: `exp-imp-${Date.now()}-${count}`
            };

            if (newExpense.description && !isNaN(newExpense.amount)) {
                await addItem('expenses', newExpense);
                count++;
            }
        }
        
        if (skippedCount > 0) {
            alert(`${count} gastos importados. ${skippedCount} filas fueron omitidas porque la categoría no existe en el proyecto. Asegúrese de crear las categorías primero.`);
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Control de Presupuesto</h2>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Importar Excel
                        </button>
                        <button onClick={() => handleOpenExpenseModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                            Añadir Gasto
                        </button>
                    </div>
                )}
            </div>
            
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                    <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <p className="text-black">Presupuesto Total (Suma de Categorías)</p>
                        </div>
                        <p className="text-4xl font-bold text-black">${displayTotalBudget.toLocaleString()}</p>
                    </div>
                     <div className="mb-4 md:mb-0">
                        <p className="text-black">Total Gastado</p>
                        <p className="text-4xl font-bold text-black">${totalSpent.toLocaleString()}</p>
                    </div>
                     <div>
                        <p className="text-black">Restante</p>
                        <p className={`text-4xl font-bold ${(displayTotalBudget - totalSpent) < 0 ? 'text-red-600' : 'text-black'}`}>${(displayTotalBudget - totalSpent).toLocaleString()}</p>
                    </div>
                </div>
                 <div className="mt-4">
                    <ProgressBar value={displayTotalBudget > 0 ? (totalSpent / displayTotalBudget) * 100 : 0} color={ displayTotalBudget > 0 && (totalSpent/displayTotalBudget) > 0.9 ? 'red' : displayTotalBudget > 0 && (totalSpent/displayTotalBudget) > 0.75 ? 'yellow' : 'blue'} />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Registro de Gastos">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Descripción</th>
                                        <th className="p-3">Categoría</th>
                                        <th className="p-3 text-right">Monto</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                        <tr key={exp.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-sm text-black">{new Date(exp.date).toLocaleDateString()}</td>
                                            <td className="p-3 font-medium">{exp.description}</td>
                                            <td className="p-3">{budgetCategories.find(c => c.id === exp.categoryId)?.name}</td>
                                            <td className="p-3 text-right font-semibold">${exp.amount.toFixed(2)}</td>
                                            <td className="p-3 text-center whitespace-nowrap">
                                                {canEdit ? (
                                                    <>
                                                        <button onClick={() => handleOpenExpenseModal(exp)} className="text-black hover:text-gray-600 font-medium text-sm">Editar</button>
                                                        <button onClick={() => handleDeleteExpenseClick(exp.id)} className="ml-3 text-red-600 hover:text-red-800 font-medium text-sm">Eliminar</button>
                                                    </>
                                                ) : <span className="text-gray-400 text-sm">Solo lectura</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-gray-500">No hay gastos registrados.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card title="Gasto por Categoría">
                        <div style={{ width: '100%', height: 300 }}>
                           <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                        {expenseChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                    <Card title="Resumen de Categorías">
                        <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto pr-1">
                            {budgetCategories.map(cat => {
                                const spent = expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0);
                                const progress = cat.allocated > 0 ? (spent / cat.allocated) * 100 : 0;
                                const isOverBudget = progress > 100;
                                return (
                                    <div key={cat.id} className={`p-3 rounded-lg ${isOverBudget ? 'bg-red-50' : 'bg-gray-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-black">{cat.name}</span>
                                            {isOverBudget && <span className="text-xs font-bold text-red-600">EXCEDIDO</span>}
                                            {canEdit && (
                                                <button onClick={() => handleOpenCategoryModal(cat)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">EDITAR</button>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm mt-2">
                                            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-black'}`}>${spent.toLocaleString()}</span>
                                            <span className="text-gray-500">/ ${cat.allocated.toLocaleString()}</span>
                                        </div>
                                        <ProgressBar 
                                            value={progress} 
                                            color={isOverBudget ? 'red' : progress > 85 ? 'yellow' : 'blue'} 
                                            className="mt-1" 
                                        />
                                    </div>
                                )
                            })}
                            {budgetCategories.length === 0 && (
                                <p className="text-center text-gray-500 text-sm py-2">No hay categorías definidas.</p>
                            )}
                        </div>
                        {canEdit && (
                            <button onClick={() => handleOpenCategoryModal()} className="w-full py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors font-medium">
                                Añadir Categoría
                            </button>
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={isExpenseModalOpen} onClose={handleCloseExpenseModal} title={isEditingExpense ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}>
                <div className="space-y-4">
                    <input type="text" placeholder="Descripción" value={currentExpense.description || ''} onChange={e => {setCurrentExpense({...currentExpense, description: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="number" placeholder="Monto" value={currentExpense.amount ?? ''} onChange={e => {setCurrentExpense({...currentExpense, amount: parseFloat(e.target.value) || 0}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <select value={currentExpense.categoryId || ''} onChange={e => {setCurrentExpense({...currentExpense, categoryId: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black">
                        <option value="">Seleccionar Categoría</option>
                        {budgetCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <input type="date" value={currentExpense.date || ''} onChange={e => {setCurrentExpense({...currentExpense, date: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black" />
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveExpense} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Gasto</button>
                </div>
            </Modal>
            
            <Modal isOpen={isCategoryModalOpen} onClose={handleCloseCategoryModal} title={isEditingCategory ? 'Editar Categoría' : 'Añadir Nueva Categoría'}>
                <div className="space-y-4">
                    <input type="text" placeholder="Nombre de la Categoría" value={currentCategory.name || ''} onChange={e => {setCurrentCategory({...currentCategory, name: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="number" placeholder="Monto Asignado" value={currentCategory.allocated ?? ''} onChange={e => {setCurrentCategory({...currentCategory, allocated: parseFloat(e.target.value) || 0}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveCategory} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar</button>
                </div>
            </Modal>

            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportExpenses}
                title="Importar Gastos desde Excel"
                expectedColumns={['Fecha', 'Descripción', 'Monto', 'Categoría']}
                templateFileName="plantilla_gastos.xlsx"
            />

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteExpense}
                title="Eliminar Gasto"
                message={`¿Estás seguro de que quieres eliminar el gasto "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Budget;
