
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialWorkers, initialTasks, initialTimeLogs } from '../constants';
import { Worker, Task, TimeLog } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Labor: React.FC = () => {
    const [workers, setWorkers] = useLocalStorage<Worker[]>('workers', initialWorkers);
    const [tasks] = useLocalStorage<Task[]>('tasks', initialTasks);
    const [timeLogs, setTimeLogs] = useLocalStorage<TimeLog[]>('timeLogs', initialTimeLogs);
    
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false);
    
    const [currentWorker, setCurrentWorker] = useState<Partial<Worker>>({});
    const [isEditingWorker, setIsEditingWorker] = useState(false);
    const [newTimeLog, setNewTimeLog] = useState<Partial<TimeLog>>({ hours: 8, date: new Date().toISOString().split('T')[0] });

    const productivityData = workers.map(worker => {
        const hoursLogged = timeLogs.filter(log => log.workerId === worker.id).reduce((sum, log) => sum + log.hours, 0);
        return { name: worker.name, horas: hoursLogged };
    });

    const handleSaveWorker = () => {
        if (isEditingWorker) {
            setWorkers(workers.map(w => w.id === currentWorker.id ? currentWorker as Worker : w));
        } else {
            setWorkers([...workers, { ...currentWorker, id: `wrk-${Date.now()}` } as Worker]);
        }
        setIsWorkerModalOpen(false);
    };

    const handleSaveTimeLog = () => {
        if (newTimeLog.taskId && newTimeLog.workerId && newTimeLog.hours) {
            setTimeLogs([...timeLogs, { ...newTimeLog, id: `log-${Date.now()}` } as TimeLog]);
            setIsTimeLogModalOpen(false);
        }
    };

    const totalLaborCost = workers.reduce((total, worker) => {
        const totalHours = timeLogs.filter(log => log.workerId === worker.id).reduce((acc, log) => acc + log.hours, 0);
        const cost = totalHours * worker.hourlyRate;
        return total + cost;
    }, 0);


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Gestión de Mano de Obra</h2>
                <div>
                    <button onClick={() => setIsTimeLogModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mr-2">
                        Registrar Horas
                    </button>
                    <button onClick={() => { setIsEditingWorker(false); setCurrentWorker({}); setIsWorkerModalOpen(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                        Añadir Trabajador
                    </button>
                </div>
            </div>

            <Card className="mb-8">
                <h3 className="text-xl font-semibold text-black mb-4">Trabajadores</h3>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Cargo</th>
                            <th className="p-3">Tarifa por Hora</th>
                            <th className="p-3">Horas Totales</th>
                            <th className="p-3">Costo Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map(worker => {
                            const totalHours = timeLogs.filter(log => log.workerId === worker.id).reduce((acc, log) => acc + log.hours, 0);
                            const totalCost = totalHours * worker.hourlyRate;
                            return (
                                <tr key={worker.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{worker.name}</td>
                                    <td className="p-3">{worker.role}</td>
                                    <td className="p-3">${worker.hourlyRate.toFixed(2)}</td>
                                    <td className="p-3">{totalHours}</td>
                                    <td className="p-3 font-semibold">${totalCost.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gray-100">
                            <td colSpan={4} className="p-3 text-right font-bold text-black">Costo Total de Mano de Obra:</td>
                            <td className="p-3 font-bold text-lg text-black">${totalLaborCost.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </Card>

            <Card title="Productividad del Trabajador (Horas Registradas)">
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={productivityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="horas" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Modal isOpen={isWorkerModalOpen} onClose={() => setIsWorkerModalOpen(false)} title="Añadir/Editar Trabajador">
                <div className="space-y-4">
                    <input type="text" placeholder="Nombre" value={currentWorker.name || ''} onChange={e => setCurrentWorker({...currentWorker, name: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="text" placeholder="Cargo" value={currentWorker.role || ''} onChange={e => setCurrentWorker({...currentWorker, role: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="number" placeholder="Tarifa por Hora" value={currentWorker.hourlyRate || ''} onChange={e => setCurrentWorker({...currentWorker, hourlyRate: parseFloat(e.target.value)})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <button onClick={handleSaveWorker} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Trabajador</button>
                </div>
            </Modal>
            
            <Modal isOpen={isTimeLogModalOpen} onClose={() => setIsTimeLogModalOpen(false)} title="Registrar Horas Trabajadas">
                 <div className="space-y-4">
                    <select value={newTimeLog.workerId || ''} onChange={e => setNewTimeLog({...newTimeLog, workerId: e.target.value})} className="w-full p-2 border rounded bg-white text-black">
                        <option value="">Seleccionar Trabajador</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select value={newTimeLog.taskId || ''} onChange={e => setNewTimeLog({...newTimeLog, taskId: e.target.value})} className="w-full p-2 border rounded bg-white text-black">
                        <option value="">Seleccionar Tarea</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="date" value={newTimeLog.date || ''} onChange={e => setNewTimeLog({...newTimeLog, date: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    <input type="number" placeholder="Horas Trabajadas" value={newTimeLog.hours || ''} onChange={e => setNewTimeLog({...newTimeLog, hours: parseFloat(e.target.value)})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <button onClick={handleSaveTimeLog} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">Registrar Horas</button>
                 </div>
            </Modal>

        </div>
    );
};

export default Labor;