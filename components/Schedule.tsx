
import React, { useState, useRef } from 'react';
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
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

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

        if (taskToSave.status === 'Completado' && !taskToSave.completionDate) {
            taskToSave.completionDate = new Date().toISOString().split('T')[0];
        }

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

    const handleJsonImportClick = () => {
        jsonFileInputRef.current?.click();
    };

    const handleJsonFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("El archivo no es un texto válido.");
                const importedTasks = JSON.parse(text) as Task[];

                if (!Array.isArray(importedTasks) || (importedTasks.length > 0 && !importedTasks[0].id)) {
                    throw new Error("El formato del archivo JSON no es válido.");
                }
                
                const existingIds = new Set(tasks.map(t => t.id));
                const newTasks = importedTasks.filter(t => !existingIds.has(t.id));

                if(newTasks.length > 0) {
                    setTasks(prevTasks => [...prevTasks, ...newTasks]);
                    alert(`${newTasks.length} tareas nuevas importadas con éxito desde JSON.`);
                } else {
                     alert('No se importaron tareas nuevas desde JSON. Es posible que todas las tareas del archivo ya existan en el proyecto.');
                }

            } catch (error) {
                console.error("Error al importar el archivo JSON:", error);
                alert("Error al importar el archivo. Asegúrese de que sea un archivo JSON de catálogo de tareas válido.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleCsvFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let text = e.target?.result as string;
                if (!text) {
                    throw new Error("El archivo está vacío.");
                }
    
                // Remove Byte Order Mark (BOM) if present
                if (text.charCodeAt(0) === 0xFEFF) {
                    text = text.slice(1);
                }
    
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length === 0) throw new Error("El archivo CSV está vacío o no contiene datos.");
    
                const headerLine = lines[0];
                
                // Auto-detect delimiter
                const commaCount = (headerLine.match(/,/g) || []).length;
                const semicolonCount = (headerLine.match(/;/g) || []).length;
                const delimiter = semicolonCount > commaCount ? ';' : ',';
    
                const headers = headerLine.split(delimiter).map(h => h.replace(/"/g, '').trim());
                const lowerCaseHeaders = headers.map(h => h.toLowerCase());
    
                const requiredHeaders = ['name', 'startdate', 'enddate'];
                const missingHeaders = requiredHeaders.filter(rh => !lowerCaseHeaders.includes(rh));
                
                if (missingHeaders.length > 0) {
                    const userFriendlyMissing = missingHeaders.map(h => {
                        if (h === 'startdate') return 'startDate';
                        if (h === 'enddate') return 'endDate';
                        return h;
                    });
                    throw new Error(`El archivo CSV debe contener las siguientes columnas: name, startDate, endDate. Columnas faltantes: ${userFriendlyMissing.join(', ')}`);
                }
                
                // Get column indices
                const nameIndex = lowerCaseHeaders.indexOf('name');
                const startDateIndex = lowerCaseHeaders.indexOf('startdate');
                const endDateIndex = lowerCaseHeaders.indexOf('enddate');
                const descriptionIndex = lowerCaseHeaders.indexOf('description');
                const statusIndex = lowerCaseHeaders.indexOf('status');
                const assignedWorkerIdIndex = lowerCaseHeaders.indexOf('assignedworkerid');
    
    
                const newTasks: Task[] = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i]) continue;
    
                    const data = lines[i].split(delimiter).map(d => d.replace(/"/g, '').trim());
                    
                    const name = data[nameIndex];
                    const startDate = data[startDateIndex];
                    const endDate = data[endDateIndex];
    
                    if (!name || !startDate || !endDate) {
                        console.warn(`Saltando fila ${i+1} por datos incompletos.`);
                        continue;
                    }
                    
                    if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
                        console.warn(`Saltando fila ${i+1} por formato de fecha inválido.`);
                        continue;
                    }
    
                    const statusValue = statusIndex > -1 ? data[statusIndex] : 'No Iniciado';
    
                    const newTask: Task = {
                        id: `tsk-${Date.now()}-${i}`,
                        name: name,
                        description: descriptionIndex > -1 ? data[descriptionIndex] || '' : '',
                        startDate: new Date(startDate).toISOString().split('T')[0],
                        endDate: new Date(endDate).toISOString().split('T')[0],
                        status: (['No Iniciado', 'En Progreso', 'Completado', 'Retrasado'].includes(statusValue) ? statusValue : 'No Iniciado') as Task['status'],
                        assignedWorkerId: assignedWorkerIdIndex > -1 ? data[assignedWorkerIdIndex] || undefined : undefined,
                    };
                    newTasks.push(newTask);
                }
    
                if (newTasks.length > 0) {
                    setTasks(prev => [...prev, ...newTasks]);
                    alert(`${newTasks.length} tareas nuevas importadas con éxito desde CSV.`);
                    setIsCsvModalOpen(false);
                } else {
                    alert("No se encontraron tareas válidas para importar en el archivo CSV. Verifique el formato del archivo y los datos.");
                }
    
            } catch (error) {
                 console.error("Error al importar el archivo CSV:", error);
                 alert(`Error al procesar el archivo CSV: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExportToJson = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(tasks, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "catalogo_tareas.json";
        link.click();
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
                <div className="flex flex-wrap gap-2">
                    <input
                        type="file"
                        accept=".json"
                        ref={jsonFileInputRef}
                        onChange={handleJsonFileImport}
                        style={{ display: 'none' }}
                    />
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                        Añadir Tarea
                    </button>
                    <button onClick={handleJsonImportClick} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                        Importar JSON
                    </button>
                    <button onClick={() => setIsCsvModalOpen(true)} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
                        Importar CSV
                    </button>
                    <button onClick={() => setIsCatalogModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                        Exportar Catálogo
                    </button>
                </div>
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

            <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="Importar Tareas desde CSV">
                <div className="space-y-4 text-sm text-black">
                    <p>Para importar tareas, sube un archivo CSV con las siguientes columnas en la primera fila:</p>
                    <ul className="list-disc list-inside bg-gray-50 p-3 rounded">
                        <li><span className="font-semibold">name</span> (Obligatorio): Nombre de la tarea.</li>
                        <li><span className="font-semibold">startDate</span> (Obligatorio): Fecha de inicio en formato AAAA-MM-DD.</li>
                        <li><span className="font-semibold">endDate</span> (Obligatorio): Fecha de fin en formato AAAA-MM-DD.</li>
                        <li><span className="font-semibold">description</span> (Opcional): Descripción de la tarea.</li>
                        <li><span className="font-semibold">status</span> (Opcional): No Iniciado, En Progreso, Completado, Retrasado.</li>
                        <li><span className="font-semibold">assignedWorkerId</span> (Opcional): El ID del trabajador asignado.</li>
                    </ul>
                    <p>Puedes crear este archivo en Excel, Google Sheets o un editor de texto y guardarlo como ".csv".</p>
                    <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                        <p>name,description,startDate,endDate,status</p>
                        <p>"Vaciado de Cimientos","Vaciar concreto",2024-08-01,2024-08-05,"En Progreso"</p>
                        <p>"Cableado Eléctrico","Instalar líneas principales",2024-08-06,2024-08-10,"No Iniciado"</p>
                    </div>
                     <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleCsvFileImport}
                        className="w-full p-2 border rounded bg-white text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" 
                    />
                </div>
            </Modal>

            <Modal isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} title="Catálogo de Tareas del Proyecto">
                <div className="printable-area">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-black">Catálogo de Tareas</h2>
                        <p className="text-sm text-black">Generado el: {new Date().toLocaleString()}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Tarea</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2">Asignado a</th>
                                    <th className="p-2">Fechas</th>
                                    <th className="p-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => (
                                    <tr key={task.id} className="border-b">
                                        <td className="p-2 font-medium">{task.name}</td>
                                        <td className="p-2 whitespace-pre-wrap">{task.description}</td>
                                        <td className="p-2">{workers.find(w => w.id === task.assignedWorkerId)?.name || 'N/A'}</td>
                                        <td className="p-2">
                                            <div>Inicio: {new Date(task.startDate).toLocaleDateString()}</div>
                                            <div>Fin: {new Date(task.endDate).toLocaleDateString()}</div>
                                            {task.completionDate && <div className="text-xs text-green-700 font-medium">Completado: {new Date(task.completionDate).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="p-2">
                                           <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 no-print">
                    <button onClick={handleExportToJson} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                        Exportar a JSON
                    </button>
                    <button onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300">Cerrar</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Imprimir / Exportar</button>
                </div>
            </Modal>
        </div>
    );
};

export default Schedule;
