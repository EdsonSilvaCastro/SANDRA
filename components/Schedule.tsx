
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialTasks, initialWorkers } from '../constants';
import { Task, Worker } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ProgressBar from './ui/ProgressBar';

const Schedule: React.FC = () => {
    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', initialTasks);
    const [workers] = useLocalStorage<Worker[]>('workers', initialWorkers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenModal = (task?: Task) => {
        if (task) {
            setCurrentTask(task);
            setIsEditing(true);
        } else {
            setCurrentTask({ status: 'No Iniciado', startDate: new Date().toISOString().split('T')[0] });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        const taskToSave: Partial<Task> = { ...currentTask };

        // Si la tarea se marca como completada y no tiene fecha de finalización
        if (taskToSave.status === 'Completado' && !taskToSave.completionDate) {
            taskToSave.completionDate = new Date().toISOString().split('T')[0];
        }

        // Si el estado cambia de "Completado" a otro, se borra la fecha de finalización
        if (taskToSave.status !== 'Completado' && taskToSave.completionDate) {
            taskToSave.completionDate = undefined;
        }

        if (isEditing) {
            setTasks(tasks.map(t => t.id === taskToSave.id ? taskToSave as Task : t));
        } else {
            setTasks([...tasks, { ...taskToSave, id: `tsk-${Date.now()}` } as Task]);
        }
        setIsModalOpen(false);
    };

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'Completado': return 'bg-green-500';
            case 'En Progreso': return 'bg-blue-500';
            case 'Retrasado': return 'bg-red-500';
            case 'No Iniciado': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };
    
    const getTaskProgress = (task: Task) => {
        if (task.status === 'Completado') return 100;
        if (task.status === 'No Iniciado') return 0;
        const totalDuration = new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
        const elapsedDuration = new Date().getTime() - new Date(task.startDate).getTime();
        if (totalDuration <= 0 || elapsedDuration <= 0) return 0;
        return Math.min(100, (elapsedDuration / totalDuration) * 100);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Cronograma del Proyecto</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    Añadir Tarea
                </button>
            </div>
            
            <Card>
                <div className="space-y-4">
                    {tasks.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => (
                        <div key={task.id} className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
                           <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-black">{task.name}</h4>
                                    <p className="text-sm text-black">{task.description}</p>
                                    <p className="text-xs text-black mt-1">
                                        Asignado a: {workers.find(w => w.id === task.assignedWorkerId)?.name || 'Sin asignar'}
                                    </p>
                                    {task.status === 'Completado' && task.completionDate && (
                                        <p className="text-xs text-green-600 font-semibold mt-1">
                                            Completado el: {new Date(task.completionDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                     <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${getStatusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                    <p className="text-sm text-black mt-1">{new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}</p>
                                     <button onClick={() => handleOpenModal(task)} className="text-sm text-black hover:text-gray-600 mt-1">Editar</button>
                                </div>
                           </div>
                           <div className="mt-3">
                                <ProgressBar value={getTaskProgress(task)} color={task.status === 'Retrasado' ? 'red' : task.status === 'Completado' ? 'green' : 'blue'} />
                           </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Tarea' : 'Añadir Nueva Tarea'}>
                <div className="space-y-4">
                    <input type="text" placeholder="Nombre de la Tarea" value={currentTask.name || ''} onChange={e => setCurrentTask({...currentTask, name: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="text" placeholder="Descripción" value={currentTask.description || ''} onChange={e => setCurrentTask({...currentTask, description: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <label className="text-black block text-sm font-medium">Fecha de Inicio</label>
                    <input type="date" value={currentTask.startDate || ''} onChange={e => setCurrentTask({...currentTask, startDate: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    <label className="text-black block text-sm font-medium">Fecha de Fin</label>
                    <input type="date" value={currentTask.endDate || ''} onChange={e => setCurrentTask({...currentTask, endDate: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    <select value={currentTask.assignedWorkerId || ''} onChange={e => setCurrentTask({...currentTask, assignedWorkerId: e.target.value})} className="w-full p-2 border rounded bg-white text-black">
                        <option value="">Asignar Trabajador</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select value={currentTask.status || ''} onChange={e => setCurrentTask({...currentTask, status: e.target.value as Task['status']})} className="w-full p-2 border rounded bg-white text-black">
                        <option>No Iniciado</option>
                        <option>En Progreso</option>
                        <option>Completado</option>
                        <option>Retrasado</option>
                    </select>
                    <button onClick={handleSave} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Tarea</button>
                </div>
            </Modal>
        </div>
    );
};

export default Schedule;