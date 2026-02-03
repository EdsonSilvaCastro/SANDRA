
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Task, Worker, Photo, Material, TaskMaterial } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
import ExcelImportModal from './ui/ExcelImportModal';
import { useProject } from '../contexts/ProjectContext';
import { addDays, format, differenceInDays, startOfWeek, addWeeks, addMonths, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TimeScale = 'day' | 'week' | 'month';
type TaskModalTab = 'general' | 'labor' | 'materials';
type MainViewTab = 'cronograma' | 'destajos' | 'materiales';

const GanttChart: React.FC<{ 
    tasks: Task[]; 
    onUpdateTask: (task: Task) => void;
    canEdit: boolean;
}> = ({ tasks, onUpdateTask, canEdit }) => {
    const ganttContainerRef = useRef<HTMLDivElement>(null);
    const [timeScale, setTimeScale] = useState<TimeScale>('day');
    const [isDownloading, setIsDownloading] = useState(false);
    
    const [dragInfo, setDragInfo] = useState<{
        task: Task;
        action: 'move' | 'resize-end' | 'resize-start';
        initialMouseX: number;
        initialStartDate: Date;
        initialEndDate: Date;
    } | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

    const sortedTasks = useMemo(() => [...tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [tasks]);

    const { overallStartDate, overallEndDate } = useMemo(() => {
        if (sortedTasks.length === 0) {
            const now = new Date();
            return { overallStartDate: startOfWeek(now), overallEndDate: endOfWeek(addWeeks(now, 4)) };
        }
        const startDates = sortedTasks.map(t => new Date(t.startDate).getTime());
        const endDates = sortedTasks.map(t => new Date(t.endDate).getTime());
        const minTime = Math.min(...startDates);
        const maxTime = Math.max(...endDates);
        return { overallStartDate: startOfWeek(new Date(minTime)), overallEndDate: endOfWeek(new Date(maxTime)) };
    }, [sortedTasks]);

    const columnWidth = useMemo(() => {
        switch (timeScale) {
            case 'day': return 40;
            case 'week': return 100;
            case 'month': return 200;
        }
    }, [timeScale]);

    const gridDates = useMemo(() => {
        const dates = [];
        let currentDate = overallStartDate;
        while (currentDate <= overallEndDate) {
            dates.push(currentDate);
            switch (timeScale) {
                case 'day': currentDate = addDays(currentDate, 1); break;
                case 'week': currentDate = addWeeks(currentDate, 1); break;
                case 'month': currentDate = addMonths(currentDate, 1); break;
            }
        }
        return dates;
    }, [overallStartDate, overallEndDate, timeScale]);
    
    const dateToPixel = useCallback((date: Date) => {
        let units = 0;
        switch (timeScale) {
            case 'day': units = differenceInDays(date, overallStartDate); break;
            case 'week': units = differenceInDays(date, overallStartDate) / 7; break;
            case 'month': units = differenceInDays(date, overallStartDate) / 30.44; break;
        }
        return units * columnWidth;
    }, [overallStartDate, timeScale, columnWidth]);

    const handleDownload = async () => {
        const element = document.getElementById('gantt-chart-view');
        if (!element) return;
        setIsDownloading(true);
        try {
            const canvas = await (window as any).html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'cronograma_proyecto.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error al descargar la gráfica:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, task: Task, action: 'move' | 'resize-end' | 'resize-start') => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = action === 'move' ? 'move' : 'ew-resize';
        setDragInfo({
            task,
            action,
            initialMouseX: e.clientX,
            initialStartDate: new Date(task.startDate),
            initialEndDate: new Date(task.endDate),
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragInfo) return;
        const deltaX = e.clientX - dragInfo.initialMouseX;
        let newStartDate = new Date(dragInfo.initialStartDate);
        let newEndDate = new Date(dragInfo.initialEndDate);
        const dayFactor = columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44);

        if (dragInfo.action === 'move') {
            const daysChanged = deltaX / dayFactor;
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-end') {
            const daysChanged = deltaX / dayFactor;
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
            if (newEndDate < newStartDate) newEndDate = newStartDate;
        } else if (dragInfo.action === 'resize-start') {
            const daysChanged = deltaX / dayFactor;
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            if (newStartDate > newEndDate) newStartDate = newEndDate;
        }
        
        setTooltip({
            x: e.clientX + 15,
            y: e.clientY,
            text: `${newStartDate.toLocaleDateString('es-ES')} - ${newEndDate.toLocaleDateString('es-ES')}`
        });

        const taskBar = ganttContainerRef.current?.querySelector(`[data-bar-id="${dragInfo.task.id}"]`) as HTMLElement;
        if (taskBar) {
            taskBar.style.left = `${dateToPixel(newStartDate)}px`;
            taskBar.style.width = `${dateToPixel(newEndDate) - dateToPixel(newStartDate)}px`;
        }
    }, [dragInfo, dateToPixel, columnWidth, timeScale]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!dragInfo) return;
        document.body.style.cursor = 'default';
        const deltaX = e.clientX - dragInfo.initialMouseX;
        let newStartDate = new Date(dragInfo.initialStartDate);
        let newEndDate = new Date(dragInfo.initialEndDate);
        const dayFactor = columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44);
        const daysChanged = deltaX / dayFactor;

        if (dragInfo.action === 'move') {
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-end') {
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-start') {
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
        }

        const updatedTask = { 
            ...dragInfo.task, 
            startDate: format(newStartDate, 'yyyy-MM-dd'), 
            endDate: format(newEndDate, 'yyyy-MM-dd') 
        };

        onUpdateTask(updatedTask);
        setDragInfo(null);
        setTooltip(null);
    }, [dragInfo, onUpdateTask, columnWidth, timeScale]);

    useEffect(() => {
        if (dragInfo) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragInfo, handleMouseMove, handleMouseUp]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">Diagrama de Gantt</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={handleDownload} disabled={isDownloading} className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors">
                        {isDownloading ? '...' : 'Descargar'}
                    </button>
                    <div className="flex gap-1 p-1 bg-gray-200 rounded-md">
                        {(['day', 'week', 'month'] as TimeScale[]).map(scale => (
                            <button key={scale} onClick={() => setTimeScale(scale)} className={`px-3 py-1 text-sm rounded-md ${timeScale === scale ? 'bg-white text-primary-600 shadow' : 'bg-transparent text-black'}`}>
                                {scale === 'day' ? 'Día' : scale === 'week' ? 'Semana' : 'Mes'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div id="gantt-chart-view" className="overflow-x-auto border rounded-lg bg-white" ref={ganttContainerRef}>
                <div className="relative" style={{ width: gridDates.length * columnWidth + 150 }}>
                    <div className="flex sticky top-0 z-20 bg-gray-50">
                        <div className="w-[150px] flex-shrink-0 border-r border-b p-2 font-semibold text-sm text-black sticky left-0 bg-gray-50">Tarea</div>
                        {gridDates.map((date, i) => (
                            <div key={i} className="border-r border-b text-center text-xs p-1 flex-shrink-0" style={{ width: columnWidth }}>
                                {timeScale === 'day' ? <>{date.getDate()}<br/><span className="text-gray-400">{date.toLocaleDateString('es', {month:'short'})}</span></> : format(date, 'w')}
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        {sortedTasks.map((task, index) => (
                             <div key={task.id} className="flex items-center border-b" style={{ height: 40 }}>
                                <div className="w-[150px] flex-shrink-0 p-2 text-sm font-medium truncate text-black sticky left-0 bg-white border-r z-10 h-full flex items-center">
                                    {task.name}
                                </div>
                             </div>
                        ))}
                        {sortedTasks.map((task, index) => {
                            const startPixel = dateToPixel(new Date(task.startDate));
                            const endPixel = dateToPixel(new Date(task.endDate));
                            let width = Math.max(0, endPixel - startPixel + (timeScale === 'day' ? columnWidth : 0));
                            const progress = (task.totalVolume && task.totalVolume > 0) ? Math.min(100, (task.completedVolume || 0) / task.totalVolume * 100) : (task.status === 'Completado' ? 100 : 0);
                            
                            return (
                                <div key={task.id} data-bar-id={task.id} className="absolute h-8 top-0 rounded-md group flex items-center cursor-pointer" style={{ top: index * 40 + 6, left: 150 + startPixel, width }} onMouseDown={(e) => handleMouseDown(e, task, 'move')}>
                                    <div className="absolute left-0 top-0 h-full w-full rounded-md bg-gray-200 border border-gray-300"></div>
                                    <div className={`absolute left-0 top-0 h-full rounded-l-md ${progress >= 100 ? 'rounded-r-md' : ''} ${task.status === 'Completado' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                    <span className="relative text-[10px] px-1 truncate z-10 pointer-events-none font-bold text-gray-800">{task.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {tooltip && <div className="fixed p-2 bg-black text-white text-xs rounded-md pointer-events-none z-50" style={{ top: tooltip.y, left: tooltip.x, transform: 'translateY(-100%)' }}>{tooltip.text}</div>}
        </Card>
    );
};

const Planning: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const tasks = projectData.tasks;
    const workers = projectData.workers;
    const materials = projectData.materials;
    const photos = projectData.photos;
    
    const [mainViewTab, setMainViewTab] = useState<MainViewTab>('cronograma');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TaskModalTab>('general');
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
    const [isEditing, setIsEditing] = useState(false);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');
    const [listFilter, setListFilter] = useState<'all' | 'base' | 'extraordinary'>('all');

    const filteredTasksByTab = useMemo(() => {
        let baseTasks = tasks;
        if (listFilter === 'base') baseTasks = tasks.filter(t => !t.isExtraordinary);
        if (listFilter === 'extraordinary') baseTasks = tasks.filter(t => t.isExtraordinary);
        return baseTasks;
    }, [tasks, listFilter]);

    const handleOpenModal = (task?: Task, forceExtraordinary: boolean = false) => {
        if (!canEdit) return;
        setValidationError('');
        setActiveTab('general');
        if (task) {
            setCurrentTask({ 
                ...task, 
                photoIds: task.photoIds || [], 
                dependsOn: task.dependsOn || [],
                materialAssignments: task.materialAssignments || []
            });
            setIsEditing(true);
        } else {
            setCurrentTask({ 
                status: 'No Iniciado', 
                startDate: new Date().toISOString().split('T')[0], 
                photoIds: [], 
                dependsOn: [],
                materialAssignments: [],
                totalVolume: 0,
                unitPrice: 0,
                totalValue: 0,
                isExtraordinary: forceExtraordinary
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!canEdit) return;
        if (!currentTask.name || !currentTask.startDate || !currentTask.endDate) {
            setValidationError('Nombre de tarea y fechas son obligatorios.');
            return;
        }

        const taskToSave: Partial<Task> = { ...currentTask };
        taskToSave.totalValue = (taskToSave.totalVolume || 0) * (taskToSave.unitPrice || 0);
    
        if (isEditing && taskToSave.id) {
            await updateItem('tasks', taskToSave.id, taskToSave);
        } else {
            await addItem('tasks', { ...taskToSave, id: `tsk-${Date.now()}` });
        }
        setIsModalOpen(false);
    };

    const handleAddMaterial = (materialId: string) => {
        if (!materialId) return;
        const assignments = [...(currentTask.materialAssignments || [])];
        if (!assignments.find(a => a.materialId === materialId)) {
            assignments.push({ materialId, quantity: 1 });
            setCurrentTask(prev => ({ ...prev, materialAssignments: assignments }));
        }
    };

    const handleUpdateMaterialQty = (materialId: string, qty: number) => {
        const assignments = (currentTask.materialAssignments || []).map(a => 
            a.materialId === materialId ? { ...a, quantity: qty } : a
        );
        setCurrentTask(prev => ({ ...prev, materialAssignments: assignments }));
    };

    const handleRemoveMaterial = (materialId: string) => {
        const assignments = (currentTask.materialAssignments || []).filter(a => a.materialId !== materialId);
        setCurrentTask(prev => ({ ...prev, materialAssignments: assignments }));
    };

    const handleImportTasks = async (data: any[]) => {
        let count = 0;
        for (const row of data) {
            const newTask: Partial<Task> = {
                name: row['Nombre'],
                description: row['Descripción'] || '',
                startDate: row['Fecha Inicio'],
                endDate: row['Fecha Fin'],
                status: row['Estado'] || 'No Iniciado',
                totalVolume: Number(row['Volumen Total']) || 0,
                unitPrice: Number(row['Precio Unitario']) || 0,
                isExtraordinary: row['Extraordinario']?.toString().toLowerCase() === 'si'
            };
            if (newTask.name) {
                await addItem('tasks', { ...newTask, id: `tsk-imp-${Date.now()}-${count}` });
                count++;
            }
        }
    };

    const renderLaborControl = () => (
        <Card className="mt-4">
            <h3 className="text-xl font-bold text-black mb-4">Panel Consolidado de Destajos</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3">Actividad</th>
                            <th className="p-3">Trabajador</th>
                            <th className="p-3 text-center">Volumen Total</th>
                            <th className="p-3 text-center">Ejecutado</th>
                            <th className="p-3 text-right">Precio Unit.</th>
                            <th className="p-3 text-right">Valor Ejecutado</th>
                            <th className="p-3 text-right">Valor Pendiente</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasksByTab.map(task => {
                            const worker = workers.find(w => w.id === task.assignedWorkerId);
                            const totalVal = (task.totalVolume || 0) * (task.unitPrice || 0);
                            const execVal = (task.completedVolume || 0) * (task.unitPrice || 0);
                            const pendVal = totalVal - execVal;
                            
                            return (
                                <tr key={task.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="p-3 font-semibold">{task.name}</td>
                                    <td className="p-3">{worker?.name || '---'}</td>
                                    <td className="p-3 text-center">{task.totalVolume || 0} {task.volumeUnit}</td>
                                    <td className="p-3 text-center font-bold text-blue-600">{task.completedVolume || 0} {task.volumeUnit}</td>
                                    <td className="p-3 text-right">${(task.unitPrice || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-black text-green-700">${execVal.toLocaleString()}</td>
                                    <td className="p-3 text-right text-gray-400">${pendVal.toLocaleString()}</td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleOpenModal(task)} className="text-primary-600 hover:underline">Gestionar</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderMaterialControl = () => (
        <Card className="mt-4">
            <h3 className="text-xl font-bold text-black mb-4">Insumos Requeridos por Planificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasksByTab.filter(t => t.materialAssignments && t.materialAssignments.length > 0).map(task => (
                    <div key={task.id} className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-bold border-b pb-2 mb-3 text-primary-800">{task.name}</h4>
                        <ul className="space-y-2">
                            {task.materialAssignments?.map(assignment => {
                                const mat = materials.find(m => m.id === assignment.materialId);
                                const isShort = mat && mat.quantity < assignment.quantity;
                                return (
                                    <li key={assignment.materialId} className="flex justify-between text-sm items-center">
                                        <span className="text-gray-700">{mat?.name || '---'}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${isShort ? 'text-red-600' : 'text-black'}`}>
                                                {assignment.quantity} {mat?.unit}
                                            </span>
                                            {isShort && <span title="Stock insuficiente en inventario" className="text-red-500">⚠️</span>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
                {filteredTasksByTab.every(t => !t.materialAssignments || t.materialAssignments.length === 0) && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        No hay materiales asignados a las tareas actuales.
                    </div>
                )}
            </div>
        </Card>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-semibold text-black">Planificación Estratégica</h2>
                    <p className="text-sm text-gray-500">Control maestro de obra, destajos y suministros por actividad</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Importar</button>
                            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm">Nueva Tarea</button>
                            <button onClick={() => handleOpenModal(undefined, true)} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-bold">Extraordinario</button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex gap-4 border-b border-gray-200 mb-6 bg-white p-2 rounded-t-lg no-print">
                <button 
                    onClick={() => setMainViewTab('cronograma')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold transition-all ${mainViewTab === 'cronograma' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Cronograma
                </button>
                <button 
                    onClick={() => setMainViewTab('destajos')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold transition-all ${mainViewTab === 'destajos' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Control de Destajos
                </button>
                <button 
                    onClick={() => setMainViewTab('materiales')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold transition-all ${mainViewTab === 'materiales' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    Materiales Planificados
                </button>
            </div>

            {mainViewTab === 'cronograma' && (
                <>
                    <GanttChart tasks={tasks} onUpdateTask={(t) => updateItem('tasks', t.id, t)} canEdit={canEdit} />

                    <div className="flex border-b border-gray-200 my-6 no-print overflow-x-auto">
                        <button onClick={() => setListFilter('all')} className={`px-6 py-3 font-medium text-sm border-b-2 ${listFilter === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Todas</button>
                        <button onClick={() => setListFilter('base')} className={`px-6 py-3 font-medium text-sm border-b-2 ${listFilter === 'base' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Cronograma Base</button>
                        <button onClick={() => setListFilter('extraordinary')} className={`px-6 py-3 font-medium text-sm border-b-2 ${listFilter === 'extraordinary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}>Extraordinarios</button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredTasksByTab.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => {
                            const progress = (task.totalVolume && task.totalVolume > 0) ? Math.min(100, (task.completedVolume || 0) / task.totalVolume * 100) : (task.status === 'Completado' ? 100 : 0);
                            const worker = workers.find(w => w.id === task.assignedWorkerId);
                            const matCount = task.materialAssignments?.length || 0;

                            return (
                                <Card key={task.id} className={`${task.isExtraordinary ? 'border-l-4 border-orange-500' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg text-black">{task.name}</h4>
                                                <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${task.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{task.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-1 mb-2">{task.description}</p>
                                            
                                            <div className="flex flex-wrap gap-4 text-xs">
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    {worker?.name || 'Sin trabajador'}
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                                    {matCount} materiales vinculados
                                                </div>
                                                <div className="font-bold text-primary-600">
                                                    ${((task.totalValue || 0) * (progress / 100)).toLocaleString()} / ${ (task.totalValue || 0).toLocaleString() } Producido
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <button onClick={() => handleOpenModal(task)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-4">
                                        <div className="flex-grow"><ProgressBar value={progress} color={task.status === 'Completado' ? 'green' : 'blue'} /></div>
                                        <span className="text-xs font-bold text-black">{progress.toFixed(0)}%</span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {mainViewTab === 'destajos' && renderLaborControl()}
            {mainViewTab === 'materiales' && renderMaterialControl()}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${isEditing ? 'Editar' : 'Nueva'} Tarea ${currentTask.isExtraordinary ? '(Extraordinaria)' : ''}`}>
                <div className="space-y-6 max-h-[85vh] overflow-y-auto">
                    <div className="flex gap-2 border-b bg-gray-50 -mx-6 px-6 no-print">
                        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'general' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}>General</button>
                        <button onClick={() => setActiveTab('labor')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'labor' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}>Mano de Obra</button>
                        <button onClick={() => setActiveTab('materials')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'materials' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}>Materiales</button>
                    </div>

                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <input type="text" placeholder="Nombre de la Tarea" value={currentTask.name || ''} onChange={e => setCurrentTask({...currentTask, name: e.target.value})} className="w-full p-2 border rounded bg-white text-black font-bold" />
                            <textarea placeholder="Descripción detallada" value={currentTask.description || ''} onChange={e => setCurrentTask({...currentTask, description: e.target.value})} className="w-full p-2 border rounded bg-white text-black" rows={3}></textarea>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Inicio</label>
                                    <input type="date" value={currentTask.startDate || ''} onChange={e => setCurrentTask({...currentTask, startDate: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fin Estimado</label>
                                    <input type="date" value={currentTask.endDate || ''} onChange={e => setCurrentTask({...currentTask, endDate: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Estado de Obra</label>
                                <select value={currentTask.status || 'No Iniciado'} onChange={e => setCurrentTask({...currentTask, status: e.target.value as Task['status']})} className="w-full p-2 border rounded bg-white text-black">
                                    <option>No Iniciado</option>
                                    <option>En Progreso</option>
                                    <option>Completado</option>
                                    <option>Retrasado</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'labor' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <h5 className="text-sm font-bold text-blue-800 mb-2">Cálculo de Destajo</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">Responsable</label>
                                        <select value={currentTask.assignedWorkerId || ''} onChange={e => setCurrentTask({...currentTask, assignedWorkerId: e.target.value})} className="w-full p-2 border rounded bg-white text-black">
                                            <option value="">Seleccionar Trabajador</option>
                                            {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">Unidad de Medida</label>
                                        <input type="text" placeholder="m², m³, pz, etc" value={currentTask.volumeUnit || ''} onChange={e => setCurrentTask({...currentTask, volumeUnit: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Volumen Total</label>
                                    <input type="number" value={currentTask.totalVolume || 0} onChange={e => setCurrentTask({...currentTask, totalVolume: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded bg-white text-black font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ejecutado</label>
                                    <input type="number" value={currentTask.completedVolume || 0} onChange={e => setCurrentTask({...currentTask, completedVolume: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded bg-white text-black font-bold text-blue-600" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Precio Unit. ($)</label>
                                    <input type="number" value={currentTask.unitPrice || 0} onChange={e => setCurrentTask({...currentTask, unitPrice: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded bg-white text-black font-bold" />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-100 rounded-lg flex justify-between items-center border-2 border-primary-100">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Inversión Total Destajo</p>
                                    <p className="text-2xl font-black text-black">${((currentTask.totalVolume || 0) * (currentTask.unitPrice || 0)).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Por Pagar (Avance)</p>
                                    <p className="text-2xl font-black text-green-600">${((currentTask.completedVolume || 0) * (currentTask.unitPrice || 0)).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'materials' && (
                        <div className="space-y-4">
                            <div className="flex gap-2 mb-4">
                                <select id="mat-select" className="flex-1 p-2 border rounded bg-white text-black text-sm">
                                    <option value="">Seleccionar Material del Inventario...</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit} disp.)</option>)}
                                </select>
                                <button onClick={() => {
                                    const sel = document.getElementById('mat-select') as HTMLSelectElement;
                                    handleAddMaterial(sel.value);
                                }} className="px-4 py-2 bg-primary-600 text-white rounded font-bold hover:bg-primary-700">+</button>
                            </div>

                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">Materiales Asignados a esta Tarea</h5>
                                {currentTask.materialAssignments?.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic text-center py-8">No hay materiales vinculados a esta tarea.</p>
                                ) : (
                                    currentTask.materialAssignments?.map(assignment => {
                                        const mat = materials.find(m => m.id === assignment.materialId);
                                        return (
                                            <div key={assignment.materialId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                                                <div className="flex-1">
                                                    <p className="font-bold text-black text-sm">{mat?.name || 'Material Desconocido'}</p>
                                                    <p className="text-[10px] text-gray-500">Stock disponible: {mat?.quantity} {mat?.unit}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        value={assignment.quantity} 
                                                        onChange={e => handleUpdateMaterialQty(assignment.materialId, parseFloat(e.target.value) || 0)}
                                                        className="w-20 p-1 border rounded bg-white text-black text-sm text-center font-bold"
                                                    />
                                                    <span className="text-xs text-gray-500 w-12">{mat?.unit}</span>
                                                    <button onClick={() => handleRemoveMaterial(assignment.materialId)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t sticky bottom-0 bg-white">
                        <button onClick={handleSave} className="w-full py-3 bg-primary-600 text-white rounded-md font-bold shadow-lg hover:bg-primary-700 transition-all">
                            Guardar Planificación Completa
                        </button>
                    </div>
                </div>
            </Modal>
            
            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportTasks}
                title="Importar Tareas Maestro"
                expectedColumns={['Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin', 'Estado', 'Volumen Total', 'Precio Unitario', 'Extraordinario']}
            />

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={async () => {
                    if (deleteConfirmation.id) await deleteItem('tasks', deleteConfirmation.id);
                }}
                title="Eliminar Actividad"
                message={`¿Eliminar "${deleteConfirmation.name}"? Se perderán los cálculos de destajo y materiales vinculados.`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Planning;
