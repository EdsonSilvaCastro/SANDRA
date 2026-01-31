
import React, { useState, useMemo } from 'react';
import { Worker, Task, TimeLog } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Labor: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const workers = projectData.workers;
    const tasks = projectData.tasks;
    
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [currentWorker, setCurrentWorker] = useState<Partial<Worker>>({});
    const [isEditingWorker, setIsEditingWorker] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');

    // Cálculo de ganancias por destajo por trabajador
    const workerEarnings = useMemo(() => {
        return workers.map(worker => {
            const assignedTasks = tasks.filter(t => t.assignedWorkerId === worker.id);
            const totalEarned = assignedTasks.reduce((sum, task) => {
                const progress = (task.totalVolume && task.totalVolume > 0) 
                    ? (task.completedVolume || 0) / task.totalVolume 
                    : (task.status === 'Completado' ? 1 : 0);
                return sum + ((task.totalValue || 0) * progress);
            }, 0);

            const pendingValue = assignedTasks.reduce((sum, task) => {
                const progress = (task.totalVolume && task.totalVolume > 0) 
                    ? (task.completedVolume || 0) / task.totalVolume 
                    : (task.status === 'Completado' ? 1 : 0);
                return sum + ((task.totalValue || 0) * (1 - progress));
            }, 0);

            return {
                ...worker,
                totalEarned,
                pendingValue,
                taskCount: assignedTasks.length
            };
        });
    }, [workers, tasks]);

    const productivityData = workerEarnings.map(w => ({
        name: w.name,
        producido: w.totalEarned
    }));

    const handleOpenWorkerModal = (worker?: Worker) => {
        if (!canEdit) return;
        setValidationError('');
        if (worker) {
            setCurrentWorker(worker);
            setIsEditingWorker(true);
        } else {
            setCurrentWorker({ name: '', role: '' });
            setIsEditingWorker(false);
        }
        setIsWorkerModalOpen(true);
    };

    const handleSaveWorker = async () => {
        if (!canEdit) return;
        if (!currentWorker.name || !currentWorker.role) {
            setValidationError('Por favor, complete el nombre y el cargo.');
            return;
        }

        if (isEditingWorker && currentWorker.id) {
            await updateItem('workers', currentWorker.id, currentWorker);
        } else {
            await addItem('workers', { ...currentWorker, id: `wrk-${Date.now()}` });
        }
        setIsWorkerModalOpen(false);
        setValidationError('');
    };
    
    const handleDeleteWorkerClick = (workerId: string) => {
        if (!canEdit) return;
        const workerToDelete = workers.find(w => w.id === workerId);
        if (!workerToDelete) return;

        const isAssignedToTask = tasks.some(task => task.assignedWorkerId === workerId);
        if (isAssignedToTask) {
            alert(`No se puede eliminar a "${workerToDelete.name}" porque tiene tareas de destajo asignadas. Reasigne las tareas primero.`);
            return;
        }
        setDeleteConfirmation({ isOpen: true, id: workerId, name: workerToDelete.name });
    };

    const confirmDeleteWorker = async () => {
        if (!canEdit) return;
        if (deleteConfirmation.id) {
            await deleteItem('workers', deleteConfirmation.id);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    const totalProjectLaborCost = workerEarnings.reduce((acc, w) => acc + w.totalEarned, 0);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-semibold text-black">Mano de Obra (Destajo)</h2>
                    <p className="text-sm text-gray-500">Cálculo de nómina basado en avance de obra</p>
                </div>
                <div>
                    {canEdit && (
                        <button onClick={() => handleOpenWorkerModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                            Añadir Trabajador
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card>
                    <p className="text-xs font-bold text-gray-500 uppercase">Total Pagable (Ejecutado)</p>
                    <p className="text-3xl font-bold text-green-600">${totalProjectLaborCost.toLocaleString()}</p>
                </Card>
                <Card>
                    <p className="text-xs font-bold text-gray-500 uppercase">Trabajadores Activos</p>
                    <p className="text-3xl font-bold text-black">{workers.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-bold text-gray-500 uppercase">Promedio por Trabajador</p>
                    <p className="text-3xl font-bold text-blue-600">
                        ${workers.length > 0 ? (totalProjectLaborCost / workers.length).toLocaleString() : 0}
                    </p>
                </Card>
            </div>

            <Card className="mb-8">
                <h3 className="text-xl font-semibold text-black mb-4">Planilla de Destajistas</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Especialidad/Cargo</th>
                                <th className="p-3 text-center">Tareas</th>
                                <th className="p-3 text-right">Por Cobrar (Pendiente)</th>
                                <th className="p-3 text-right">Producido (Ejecutado)</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workerEarnings.map(worker => (
                                <tr key={worker.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{worker.name}</td>
                                    <td className="p-3">{worker.role}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{worker.taskCount}</span>
                                    </td>
                                    <td className="p-3 text-right text-gray-500">${worker.pendingValue.toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold text-green-700">${worker.totalEarned.toLocaleString()}</td>
                                    <td className="p-3 text-center whitespace-nowrap">
                                        {canEdit ? (
                                            <>
                                                <button onClick={() => handleOpenWorkerModal(worker)} className="text-black hover:text-gray-600 font-medium text-sm">Editar</button>
                                                <button onClick={() => handleDeleteWorkerClick(worker.id)} className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm">Eliminar</button>
                                            </>
                                        ) : <span className="text-gray-400 text-sm">Solo lectura</span>}
                                    </td>
                                </tr>
                            ))}
                            {workerEarnings.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">No hay trabajadores registrados.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-100">
                                <td colSpan={4} className="p-3 text-right font-bold text-black uppercase text-xs">Total Producido en Obra:</td>
                                <td className="p-3 text-right font-bold text-lg text-green-700">${totalProjectLaborCost.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Productividad por Destajo ($ Producido)">
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={productivityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                <Legend />
                                <Bar dataKey="producido" name="Monto Ejecutado ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card title="Información del Sistema">
                    <div className="space-y-4 text-sm text-gray-600">
                        <p className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Este proyecto utiliza un sistema de <strong>pago por destajo</strong>. Los ingresos de los trabajadores se calculan automáticamente basándose en el volumen de obra ejecutado en las tareas que tienen asignadas en la sección de Planificación.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span>Para que un trabajador vea reflejadas sus ganancias, asegúrese de asignar un <strong>Costo Total</strong> y actualizar el <strong>Volumen Ejecutado</strong> en sus respectivas tareas.</span>
                        </p>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isWorkerModalOpen} onClose={() => setIsWorkerModalOpen(false)} title={isEditingWorker ? 'Editar Destajista' : 'Añadir Nuevo Destajista'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                        <input type="text" placeholder="Ej. Juan Pérez" value={currentWorker.name || ''} onChange={e => {setCurrentWorker({...currentWorker, name: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Especialidad / Cargo</label>
                        <input type="text" placeholder="Ej. Albañil, Maestro de Obra, Yesero" value={currentWorker.role || ''} onChange={e => {setCurrentWorker({...currentWorker, role: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black" />
                    </div>
                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 italic border border-blue-100">
                        Nota: En este sistema, la tarifa se define por tarea en la sección de Planificación, no por trabajador.
                    </div>
                    {validationError && <p className="text-red-600 text-sm font-bold">{validationError}</p>}
                    <button onClick={handleSaveWorker} className="w-full py-3 bg-primary-600 text-white rounded-md font-bold hover:bg-primary-700 shadow-lg">
                        {isEditingWorker ? 'Actualizar Trabajador' : 'Añadir a la Obra'}
                    </button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteWorker}
                title="Eliminar Trabajador"
                message={`¿Estás seguro de que quieres eliminar a "${deleteConfirmation.name}"? Se perderá su historial de asignaciones en este panel.`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Labor;
