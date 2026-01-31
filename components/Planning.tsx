
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Task, Worker, Photo } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
import ExcelImportModal from './ui/ExcelImportModal';
import { useProject } from '../contexts/ProjectContext';
import { addDays, format, differenceInDays, startOfWeek, addWeeks, addMonths, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


type TimeScale = 'day' | 'week' | 'month';

const GanttChart: React.FC<{ 
    tasks: Task[]; 
    onUpdateTask: (task: Task) => void;
    canEdit: boolean;
}> = ({ tasks, onUpdateTask, canEdit }) => {
    const ganttContainerRef = useRef<HTMLDivElement>(null);
    const [timeScale, setTimeScale] = useState<TimeScale>('day');
    const [taskPositions, setTaskPositions] = useState<Record<string, { top: number, height: number }>>({});
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

    const getTaskProgress = useCallback((task: Task) => {
        if (task.totalVolume && task.totalVolume > 0) {
            return Math.min(100, ((task.completedVolume || 0) / task.totalVolume) * 100);
        }
        if (task.status === 'Completado') return 100;
        return 0;
    }, []);

    const projectStartDate = overallStartDate.getTime();

    useEffect(() => {
        if (!ganttContainerRef.current) return;
        const newPositions: Record<string, { top: number, height: number }> = {};
        const taskElements = ganttContainerRef.current.querySelectorAll('.gantt-task-row');
        taskElements.forEach((el) => {
            const taskId = el.getAttribute('data-task-id');
            if (taskId) {
                newPositions[taskId] = { top: (el as HTMLElement).offsetTop, height: el.getBoundingClientRect().height };
            }
        });
        setTaskPositions(newPositions);
    }, [sortedTasks]);

    const handleDownload = async () => {
        const element = document.getElementById('gantt-chart-view');
        if (!element) return;

        setIsDownloading(true);
        try {
            const canvas = await (window as any).html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2 
            });
            const dataUrl = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'cronograma_proyecto.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error al descargar la gráfica:', error);
            alert('Ocurrió un error al intentar descargar la gráfica.');
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

        if (dragInfo.action === 'move') {
            const daysChanged = deltaX / (columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44));
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-end') {
            const daysChanged = deltaX / (columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44));
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
            if (newEndDate < newStartDate) newEndDate = newStartDate;
        } else if (dragInfo.action === 'resize-start') {
            const daysChanged = deltaX / (columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44));
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            if (newStartDate > newEndDate) newStartDate = newEndDate;
        }
        
        // @ts-ignore
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

        const daysChanged = deltaX / (columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44));

        if (dragInfo.action === 'move') {
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-end') {
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
            if (newEndDate < newStartDate) newEndDate = newStartDate;
        } else if (dragInfo.action === 'resize-start') {
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            if (newStartDate > newEndDate) newStartDate = newEndDate;
        }
        
        // --- Dependency Validation ---
        if (dragInfo.task.dependsOn && dragInfo.task.dependsOn.length > 0) {
            for (const depId of dragInfo.task.dependsOn) {
                const depTask = tasks.find(t => t.id === depId);
                if (depTask && newStartDate < new Date(depTask.endDate)) {
                    alert(`Conflicto de dependencia: La tarea "${dragInfo.task.name}" no puede empezar antes de que termine "${depTask.name}".`);
                    const taskBar = ganttContainerRef.current?.querySelector(`[data-bar-id="${dragInfo.task.id}"]`) as HTMLElement;
                    if (taskBar) {
                        taskBar.style.left = `${dateToPixel(dragInfo.initialStartDate)}px`;
                        taskBar.style.width = `${dateToPixel(dragInfo.initialEndDate) - dateToPixel(dragInfo.initialStartDate)}px`;
                    }
                    setDragInfo(null);
                    setTooltip(null);
                    return;
                }
            }
        }

        const updatedTask = { 
            ...dragInfo.task, 
            startDate: format(newStartDate, 'yyyy-MM-dd'), 
            endDate: format(newEndDate, 'yyyy-MM-dd') 
        };

        onUpdateTask(updatedTask);
        setDragInfo(null);
        setTooltip(null);
    }, [dragInfo, onUpdateTask, tasks, dateToPixel, columnWidth, timeScale]);

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
    
    const getHeaderLabel = (date: Date) => {
        switch (timeScale) {
            case 'day': return <><span className="text-black">{date.getDate()}</span><span className="block text-gray-500">{date.toLocaleDateString('es-ES', { month: 'short' })}</span></>;
            case 'week': return <span className="text-black text-[10px]">Semana {format(date, 'w')}</span>;
            case 'month': return <span className="text-black">{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>;
        }
    };
    
    const today = new Date();
    const todayOffset = dateToPixel(today);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">Diagrama de Gantt</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center gap-1"
                    >
                        {isDownloading ? '...' : 'Descargar'}
                    </button>
                    <div className="flex gap-1 p-1 bg-gray-200 rounded-md">
                        {(['day', 'week', 'month'] as TimeScale[]).map(scale => (
                            <button key={scale} onClick={() => setTimeScale(scale)} className={`px-3 py-1 text-sm rounded-md transition-colors ${timeScale === scale ? 'bg-white text-primary-600 shadow' : 'bg-transparent text-black'}`}>
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
                                {getHeaderLabel(date)}
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        {sortedTasks.map((task, index) => (
                             <div key={task.id} data-task-id={task.id} className="gantt-task-row flex items-center border-b" style={{ height: 40 }}>
                                <div className="w-[150px] flex-shrink-0 p-2 text-sm font-medium truncate text-black sticky left-0 bg-white border-r z-10 h-full flex items-center">
                                    {task.isExtraordinary && <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 flex-shrink-0" title="Extraordinario"></span>}
                                    {task.name}
                                </div>
                             </div>
                        ))}
                        {sortedTasks.map((task, index) => {
                            const startPixel = dateToPixel(new Date(task.startDate));
                            const endPixel = dateToPixel(new Date(task.endDate));
                            let width = endPixel - startPixel + (timeScale === 'day' ? columnWidth : 0);
                            if (width < 0) width = 0;

                            const progress = getTaskProgress(task);
                            let statusColor = task.status === 'Completado' ? 'bg-green-500' : task.status === 'En Progreso' ? 'bg-blue-500' : task.status === 'Retrasado' ? 'bg-red-500' : 'bg-gray-400';
                            
                            // Highlight extraordinary tasks with orange tone if not completed
                            if (task.isExtraordinary && task.status !== 'Completado') {
                                statusColor = 'bg-orange-500';
                            }

                            return (
                                <div
                                    key={task.id}
                                    data-bar-id={task.id}
                                    className={`absolute h-8 top-0 rounded-md group flex items-center ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={{ top: index * 40 + 6, left: 150 + startPixel, width }}
                                    onMouseDown={(e) => canEdit && handleMouseDown(e, task, 'move')}
                                >
                                    <div className={`absolute left-0 top-0 h-full w-full rounded-md ${task.isExtraordinary ? 'bg-orange-100' : 'bg-gray-200'} border ${task.isExtraordinary ? 'border-orange-300' : 'border-gray-300'}`}></div>
                                    <div 
                                        className={`absolute left-0 top-0 h-full rounded-l-md ${progress >= 100 ? 'rounded-r-md' : ''} ${statusColor}`} 
                                        style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                                    ></div>
                                    <span className="relative text-xs px-2 truncate z-10 pointer-events-none font-semibold text-gray-800">
                                        {task.name} <span className="text-[10px] font-normal opacity-90">({progress.toFixed(0)}%)</span>
                                    </span>
                                    {canEdit && (
                                        <>
                                            <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-20" onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')} />
                                            <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-20" onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')} />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        {todayOffset > 0 && today > overallStartDate && today < overallEndDate && (
                            <div className="absolute top-0 bottom-0 border-r-2 border-red-500 z-20 pointer-events-none" style={{ left: 150 + todayOffset }}>
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-1 rounded-sm">Hoy</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {tooltip && (
                <div className="fixed p-2 bg-black text-white text-xs rounded-md pointer-events-none z-50" style={{ top: tooltip.y, left: tooltip.x, transform: 'translateY(-100%)' }}>
                    {tooltip.text}
                </div>
            )}
        </Card>
    );
};


const Planning: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const tasks = projectData.tasks;
    const workers = projectData.workers;
    const photos = projectData.photos;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
    const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'all' | 'base' | 'extraordinary'>('all');
    
    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const filteredTasksByTab = useMemo(() => {
        if (activeTab === 'base') return tasks.filter(t => !t.isExtraordinary);
        if (activeTab === 'extraordinary') return tasks.filter(t => t.isExtraordinary);
        return tasks;
    }, [tasks, activeTab]);

    const extraordinaryStats = useMemo(() => {
        const extra = tasks.filter(t => t.isExtraordinary);
        return {
            count: extra.length,
            totalValue: extra.reduce((sum, t) => sum + (t.totalValue || 0), 0),
            completedValue: extra.reduce((sum, t) => {
                const prog = (t.totalVolume && t.totalVolume > 0) ? (t.completedVolume || 0) / t.totalVolume : (t.status === 'Completado' ? 1 : 0);
                return sum + ((t.totalValue || 0) * prog);
            }, 0)
        };
    }, [tasks]);

    // Función para manejar cambios en Volumen o Precio y recalcular el Total
    const handleVolumeOrPriceChange = (field: 'totalVolume' | 'unitPrice', value: number) => {
        setCurrentTask(prev => {
            const next = { ...prev, [field]: value };
            const vol = field === 'totalVolume' ? value : (prev.totalVolume || 0);
            const price = field === 'unitPrice' ? value : (prev.unitPrice || 0);
            next.totalValue = vol * price;
            return next;
        });
        setValidationError('');
    };

    const handleOpenModal = (task?: Task, forceExtraordinary: boolean = false) => {
        if (!canEdit) return;
        setValidationError('');
        if (task) {
            setCurrentTask({ ...task, photoIds: task.photoIds || [], dependsOn: task.dependsOn || [] });
            setIsEditing(true);
        } else {
            setCurrentTask({ 
                status: 'No Iniciado', 
                startDate: new Date().toISOString().split('T')[0], 
                photoIds: [], 
                dependsOn: [],
                totalVolume: 0,
                unitPrice: 0,
                totalValue: 0,
                isExtraordinary: forceExtraordinary || activeTab === 'extraordinary'
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!canEdit) return;
        if (!currentTask.name || !currentTask.startDate || !currentTask.endDate) {
            setValidationError('Nombre de tarea y fechas de inicio/fin son obligatorios.');
            return;
        }

        const taskToSave: Partial<Task> = { ...currentTask };
    
        if (typeof taskToSave.totalVolume === 'number' && taskToSave.totalVolume > 0) {
            const completedVolume = taskToSave.completedVolume || 0;
            const totalVolume = taskToSave.totalVolume;
            if (completedVolume >= totalVolume) {
                if (taskToSave.status !== 'Completado') taskToSave.status = 'Completado';
            } else if (completedVolume > 0) {
                if (taskToSave.status === 'No Iniciado' || taskToSave.status === 'Completado') taskToSave.status = 'En Progreso';
            }
        }
        
        if (taskToSave.status === 'Completado') {
            if (!taskToSave.completionDate) taskToSave.completionDate = new Date().toISOString().split('T')[0];
        } else {
            taskToSave.completionDate = undefined;
        }
    
        if (isEditing && taskToSave.id) {
            await updateItem('tasks', taskToSave.id, taskToSave);
        } else {
            await addItem('tasks', { ...taskToSave, id: `tsk-${Date.now()}` });
        }
        setIsModalOpen(false);
        setValidationError('');
    };

    const handleDeleteClick = (taskId: string) => {
        if (!canEdit) return;
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (taskToDelete) {
            setDeleteConfirmation({ isOpen: true, id: taskId, name: taskToDelete.name });
        }
    };

    const confirmDeleteTask = async () => {
        if (!canEdit) return;
        const taskId = deleteConfirmation.id;
        if (taskId) await deleteItem('tasks', taskId);
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };
    
    const getStatusColor = (task: Task) => {
        if (task.isExtraordinary && task.status !== 'Completado') return 'bg-orange-500';
        switch (task.status) {
            case 'Completado': return 'bg-green-500';
            case 'En Progreso': return 'bg-blue-500';
            case 'Retrasado': return 'bg-red-500';
            case 'No Iniciado': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };
    
    const getTaskProgress = (task: Task) => {
        if (task.totalVolume && task.totalVolume > 0) {
            return Math.min(100, ((task.completedVolume || 0) / task.totalVolume) * 100);
        }
        if (task.status === 'Completado') return 100;
        return 0;
    };

    const handlePhotoSelection = (photoId: string) => {
        if (!canEdit) return;
        setCurrentTask(prev => {
            const currentPhotoIds = prev.photoIds || [];
            if (currentPhotoIds.includes(photoId)) {
                return { ...prev, photoIds: currentPhotoIds.filter(id => id !== photoId) };
            } else {
                return { ...prev, photoIds: [...currentPhotoIds, photoId] };
            }
        });
    };

    const handleImportTasks = async (data: any[]) => {
        let count = 0;
        for (const row of data) {
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

            const newTask: Partial<Task> = {
                name: row['Nombre'],
                description: row['Descripción'] || '',
                startDate: parseDate(row['Fecha Inicio']),
                endDate: parseDate(row['Fecha Fin']),
                status: row['Estado'] || 'No Iniciado',
                totalVolume: Number(row['Volumen Total']) || undefined,
                unitPrice: Number(row['Precio Unitario']) || undefined,
                volumeUnit: row['Unidad'] || undefined,
                totalValue: (Number(row['Volumen Total']) * Number(row['Precio Unitario'])) || Number(row['Costo']) || undefined,
                isExtraordinary: row['Extraordinario']?.toString().toLowerCase() === 'si'
            };

            if (newTask.name) {
                await addItem('tasks', { ...newTask, id: `tsk-imp-${Date.now()}-${count}` });
                count++;
            }
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-semibold text-black">Planificación</h2>
                    <p className="text-sm text-gray-500">Gestión del cronograma y trabajos extraordinarios</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canEdit && (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Importar
                            </button>
                            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm">
                                Añadir Tarea
                            </button>
                            <button onClick={() => handleOpenModal(undefined, true)} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-semibold">
                                + Trabajo Extraordinario
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Trabajos Extraordinarios</p>
                    <p className="text-2xl font-bold text-black">{extraordinaryStats.count} <span className="text-sm font-normal text-gray-400">tareas</span></p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Presupuesto Extraordinario</p>
                    <p className="text-2xl font-bold text-orange-600">${extraordinaryStats.totalValue.toLocaleString()}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Ejecutado Extraordinario</p>
                    <p className="text-2xl font-bold text-green-600">${extraordinaryStats.completedValue.toLocaleString()}</p>
                </Card>
            </div>

            <div className="mb-6">
                <GanttChart tasks={tasks} onUpdateTask={(t) => updateItem('tasks', t.id, t)} canEdit={canEdit} />
            </div>

            <div className="flex border-b border-gray-200 mb-6 no-print overflow-x-auto">
                <button onClick={() => setActiveTab('all')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Todas las Tareas
                </button>
                <button onClick={() => setActiveTab('base')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'base' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Cronograma Base
                </button>
                <button onClick={() => setActiveTab('extraordinary')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'extraordinary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Trabajos Extraordinarios
                </button>
            </div>

            <Card title={activeTab === 'extraordinary' ? 'Detalle de Trabajos Extraordinarios' : 'Lista de Tareas'}>
                <div className="space-y-4">
                    {filteredTasksByTab.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => {
                        const attachedPhotos = task.photoIds ? photos.filter(p => task.photoIds!.includes(p.id)) : [];
                        const progress = getTaskProgress(task);
                        const valueProgress = task.totalValue ? task.totalValue * (progress / 100) : 0;

                        return (
                        <div key={task.id} className={`p-4 border rounded-lg hover:shadow-lg transition-shadow ${task.isExtraordinary ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                           <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {task.isExtraordinary && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-200 uppercase tracking-tighter">Extraordinario</span>}
                                        <h4 className="font-bold text-lg text-black">{task.name}</h4>
                                    </div>
                                    <p className="text-sm text-black">{task.description}</p>
                                    <p className="text-xs text-black mt-1">Responsable: {workers.find(w => w.id === task.assignedWorkerId)?.name || 'Sin asignar'}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                     <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${getStatusColor(task)}`}>{task.status}</span>
                                    <p className="text-sm text-black mt-1 font-mono">{format(new Date(task.startDate), 'dd/MM/yy')} - {format(new Date(task.endDate), 'dd/MM/yy')}</p>
                                     {canEdit && (
                                        <div className="mt-2 space-x-2">
                                            <button onClick={() => handleOpenModal(task)} className="text-xs text-blue-600 hover:underline font-semibold">Editar</button>
                                            <button onClick={() => handleDeleteClick(task.id)} className="text-xs text-red-600 hover:underline font-semibold">Eliminar</button>
                                        </div>
                                     )}
                                </div>
                           </div>
                           <div className="mt-3">
                                <div className="flex items-center">
                                    <div className="flex-grow">
                                        <ProgressBar value={progress} color={task.isExtraordinary && task.status !== 'Completado' ? 'yellow' : (task.status === 'Retrasado' ? 'red' : (task.status === 'Completado' ? 'green' : 'blue'))} />
                                    </div>
                                    <span className="ml-4 w-12 text-right text-sm font-semibold text-black">{progress.toFixed(0)}%</span>
                                </div>
                                <div className="mt-2 flex justify-between items-baseline text-sm">
                                    <div className="text-gray-600 text-xs">
                                        {(task.totalVolume && task.volumeUnit) && (
                                            <span>Físico: <strong>{task.completedVolume ?? 0} / {task.totalVolume}</strong> {task.volumeUnit}</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {task.totalValue && (
                                            <p className="text-xs text-black">
                                                <span className="font-medium">Valor:</span> 
                                                <span className="font-bold text-green-600 ml-1">${valueProgress.toLocaleString()}</span>
                                                <span className="text-gray-400"> / ${task.totalValue.toLocaleString()}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                           </div>
                           {attachedPhotos.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex flex-wrap gap-2">
                                        {attachedPhotos.map(photo => (
                                            <img key={photo.id} src={photo.url} alt={photo.description} onClick={() => setViewingPhotoUrl(photo.url)} className="h-12 w-12 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                    {filteredTasksByTab.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No hay tareas para mostrar en esta sección.</p>
                            {canEdit && <button onClick={() => handleOpenModal()} className="text-primary-600 font-semibold mt-2 hover:underline">Añadir una tarea ahora</button>}
                        </div>
                    )}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Tarea' : 'Nueva Tarea'}>
                <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-md">
                        <input
                            type="checkbox"
                            id="extra-checkbox"
                            checked={currentTask.isExtraordinary || false}
                            onChange={e => setCurrentTask({...currentTask, isExtraordinary: e.target.checked})}
                            className="h-4 w-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="extra-checkbox" className="text-sm font-bold text-orange-700">MARCAR COMO TRABAJO EXTRAORDINARIO</label>
                    </div>

                    <input type="text" placeholder="Nombre de la Tarea" value={currentTask.name || ''} onChange={e => {setCurrentTask({...currentTask, name: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <textarea placeholder="Descripción" value={currentTask.description || ''} onChange={e => setCurrentTask({...currentTask, description: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" rows={2}></textarea>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Fecha de Inicio</label>
                            <input type="date" value={currentTask.startDate || ''} onChange={e => {setCurrentTask({...currentTask, startDate: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black text-sm" />
                        </div>
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Fecha de Fin</label>
                            <input type="date" value={currentTask.endDate || ''} onChange={e => {setCurrentTask({...currentTask, endDate: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Responsable</label>
                            <select value={currentTask.assignedWorkerId || ''} onChange={e => setCurrentTask({...currentTask, assignedWorkerId: e.target.value})} className="w-full p-2 border rounded bg-white text-black text-sm">
                                <option value="">Sin asignar</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Estado</label>
                            <select value={currentTask.status || 'No Iniciado'} onChange={e => setCurrentTask({...currentTask, status: e.target.value as Task['status']})} className="w-full p-2 border rounded bg-white text-black text-sm">
                                <option>No Iniciado</option>
                                <option>En Progreso</option>
                                <option>Completado</option>
                                <option>Retrasado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="text-black block text-xs font-medium uppercase mb-1">Volumen Total</label>
                            <input type="number" placeholder="Ej. 100" value={currentTask.totalVolume || ''} onChange={e => handleVolumeOrPriceChange('totalVolume', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 text-sm" />
                        </div>
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Unidad</label>
                            <input type="text" placeholder="m³, ML, etc" value={currentTask.volumeUnit || ''} onChange={e => setCurrentTask({...currentTask, volumeUnit: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Precio Unitario ($)</label>
                            <input type="number" placeholder="Ej. 50" value={currentTask.unitPrice || ''} onChange={e => handleVolumeOrPriceChange('unitPrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 text-sm" />
                        </div>
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1">Volumen Ejecutado</label>
                            <input type="number" placeholder="Ej. 25" value={currentTask.completedVolume || ''} onChange={e => setCurrentTask({...currentTask, completedVolume: parseFloat(e.target.value) || undefined})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 text-sm" />
                        </div>
                        <div>
                            <label className="text-black block text-xs font-medium uppercase mb-1 font-bold">Costo Total ($)</label>
                            <div className="w-full p-2 border rounded bg-gray-100 text-black font-bold text-sm h-9 flex items-center">
                                ${ (currentTask.totalValue || 0).toLocaleString() }
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <label className="text-black block text-xs font-medium uppercase mb-1">Fotos Vinculadas</label>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md flex-grow bg-gray-50 min-h-[44px]">
                                {(currentTask.photoIds || []).map(id => {
                                    const photo = photos.find(p => p.id === id);
                                    return photo ? <img key={id} src={photo.url} className="h-8 w-8 object-cover rounded shadow-sm" /> : null;
                                })}
                                {(currentTask.photoIds || []).length === 0 && <span className="text-xs text-gray-400 py-1">Sin fotos</span>}
                            </div>
                             <button onClick={() => setIsPhotoManagerOpen(true)} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 font-bold text-xs uppercase">Elegir</button>
                        </div>
                    </div>
                    
                    {validationError && <p className="text-red-600 text-xs font-bold bg-red-50 p-2 border border-red-100 rounded">{validationError}</p>}

                    <button onClick={handleSave} className="w-full mt-2 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-bold shadow-md transition-all active:scale-95">
                        {isEditing ? 'Actualizar Tarea' : 'Crear Tarea'}
                    </button>
                </div>
            </Modal>

             <Modal isOpen={isPhotoManagerOpen} onClose={() => setIsPhotoManagerOpen(false)} title="Vincular Fotos">
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map(photo => (
                                <div key={photo.id} className="relative cursor-pointer" onClick={() => handlePhotoSelection(photo.id)}>
                                    <img src={photo.url} alt={photo.description} className={`w-full h-28 object-cover rounded-md transition-all ${currentTask.photoIds?.includes(photo.id) ? 'ring-4 ring-primary-500 opacity-100 shadow-md' : 'opacity-60 grayscale-[50%] hover:grayscale-0'}`} />
                                    {(currentTask.photoIds?.includes(photo.id)) && (
                                        <div className="absolute top-1 right-1 bg-primary-600 text-white rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8 italic">No hay fotos en la bitácora todavía.</p>
                    )}
                </div>
                 <div className="mt-4 flex justify-end">
                    <button onClick={() => setIsPhotoManagerOpen(false)} className="px-6 py-2 bg-primary-600 text-white rounded-md font-bold">Hecho</button>
                 </div>
            </Modal>
            
             <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportTasks}
                title="Importar Tareas"
                expectedColumns={['Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin', 'Estado']}
                templateFileName="plantilla_planificacion.xlsx"
            />

            {viewingPhotoUrl && (
                 <Modal isOpen={!!viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} title="Vista Previa">
                    <img src={viewingPhotoUrl} alt="Vista Previa" className="w-full max-h-[80vh] object-contain rounded-lg"/>
                 </Modal>
            )}

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteTask}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Planning;
