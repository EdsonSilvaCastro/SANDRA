
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Task, Worker, Photo } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
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

    const chartData = useMemo(() => sortedTasks.map(task => {
        const start = new Date(task.startDate).getTime();
        const end = new Date(task.endDate).getTime();
        let duration = end - start;
        if (duration < 0) duration = 0;

        const progress = getTaskProgress(task);
        const completed = duration * (progress / 100);
        const remaining = duration - completed;

        return {
            name: task.name,
            offset: start - projectStartDate,
            completed: completed,
            remaining: remaining,
            startDate: new Date(start).toLocaleDateString('es-ES'),
            endDate: new Date(end).toLocaleDateString('es-ES'),
            status: task.status
        };
    }), [sortedTasks, projectStartDate, getTaskProgress]);
    
    const tickFormatter = useCallback((tick: number) => {
        const date = new Date(projectStartDate + tick);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }, [projectStartDate]);

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
        
        const formatStr = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
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
        const dependentTasks = tasks.filter(t => t.dependsOn?.includes(dragInfo.task.id));
        for (const depTask of dependentTasks) {
            if (new Date(depTask.startDate) < newEndDate) {
                alert(`Conflicto de dependencia: La tarea "${depTask.name}" (que depende de esta) empezaría antes de que esta termine.`);
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
                                <div className="w-[150px] flex-shrink-0 p-2 text-sm font-medium truncate text-black sticky left-0 bg-white border-r z-10 h-full flex items-center">{task.name}</div>
                             </div>
                        ))}
                        {sortedTasks.map((task, index) => {
                            const startPixel = dateToPixel(new Date(task.startDate));
                            const endPixel = dateToPixel(new Date(task.endDate));
                            let width = endPixel - startPixel + (timeScale === 'day' ? columnWidth : 0);
                            if (width < 0) width = 0;

                            const progress = getTaskProgress(task);
                            const statusColor = task.status === 'Completado' ? 'bg-green-500' : task.status === 'En Progreso' ? 'bg-blue-500' : task.status === 'Retrasado' ? 'bg-red-500' : 'bg-gray-400';
                            
                            return (
                                <div
                                    key={task.id}
                                    data-bar-id={task.id}
                                    className={`absolute h-8 top-0 rounded-md group flex items-center ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={{ top: index * 40 + 6, left: 150 + startPixel, width }}
                                    onMouseDown={(e) => canEdit && handleMouseDown(e, task, 'move')}
                                >
                                    {/* Fondo de la barra (duración total) - Gris claro */}
                                    <div className="absolute left-0 top-0 h-full w-full rounded-md bg-gray-200 border border-gray-300"></div>
                                    
                                    {/* Barra de progreso (avance) - Color sólido */}
                                    <div 
                                        className={`absolute left-0 top-0 h-full rounded-l-md ${progress >= 100 ? 'rounded-r-md' : ''} ${statusColor}`} 
                                        style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                                    ></div>
                                    
                                    {/* Etiqueta de texto con porcentaje */}
                                    <span className="relative text-xs px-2 truncate z-10 pointer-events-none font-semibold text-gray-800">
                                        {task.name} <span className="text-[10px] font-normal opacity-90">({progress.toFixed(0)}%)</span>
                                    </span>

                                    {canEdit && (
                                        <>
                                            <div 
                                                className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-20" 
                                                onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')}
                                            />
                                            <div 
                                                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-20"
                                                onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                                            />
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
                        <svg className="absolute top-0 left-[150px] w-full h-full pointer-events-none z-10">
                            <defs>
                                <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="4.5" refY="1.75" orient="auto">
                                    <polygon points="0 0, 5 1.75, 0 3.5" fill="#333" />
                                </marker>
                            </defs>
                            {sortedTasks.map(task => {
                                if (!task.dependsOn) return null;
                                return task.dependsOn.map(depId => {
                                    const fromTask = sortedTasks.find(t => t.id === depId);
                                    if (!fromTask) return null;

                                    const fromIndex = sortedTasks.findIndex(t => t.id === fromTask.id);
                                    const toIndex = sortedTasks.findIndex(t => t.id === task.id);

                                    if(fromIndex < 0 || toIndex < 0) return null;
                                    
                                    const fromX = dateToPixel(new Date(fromTask.endDate)) + (timeScale === 'day' ? columnWidth : 0);
                                    const fromY = fromIndex * 40 + 20;
                                    const toX = dateToPixel(new Date(task.startDate));
                                    const toY = toIndex * 40 + 20;

                                    if (toX <= fromX) return <path key={`${depId}-${task.id}`} d={`M ${fromX} ${fromY} L ${toX} ${toY}`} stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />;
                                    
                                    return <path key={`${depId}-${task.id}`} d={`M ${fromX} ${fromY} H ${fromX + 10} V ${toY} H ${toX}`} stroke="#333" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead)" />;
                                });
                            })}
                        </svg>
                        <div className="absolute top-0 left-[150px] w-full h-full pointer-events-none">
                             <ResponsiveContainer>
                                <BarChart
                                    layout="vertical"
                                    data={chartData}
                                    margin={{ top: 40, right: 0, left: 0, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        type="number" 
                                        dataKey="offset" 
                                        domain={[0, overallEndDate.getTime() - projectStartDate]} 
                                        tickFormatter={tickFormatter} 
                                        tick={{ fontSize: 10, fill: '#000' }} 
                                        dy={5} 
                                        xAxisId="gantt-axis"
                                        orientation="top"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
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

    const handleOpenModal = (task?: Task) => {
        if (!canEdit) return;
        setValidationError('');
        if (task) {
            setCurrentTask({ ...task, photoIds: task.photoIds || [], dependsOn: task.dependsOn || [] });
            setIsEditing(true);
        } else {
            setCurrentTask({ status: 'No Iniciado', startDate: new Date().toISOString().split('T')[0], photoIds: [], dependsOn: [] });
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
        if (currentTask.dependsOn && currentTask.dependsOn.length > 0) {
            for (const depId of currentTask.dependsOn) {
                const dependencyTask = tasks.find(t => t.id === depId);
                if (dependencyTask) {
                    if (currentTask.startDate && new Date(currentTask.startDate) < new Date(dependencyTask.endDate)) {
                        setValidationError(`Conflicto de dependencia: La tarea no puede comenzar antes de que finalice "${dependencyTask.name}".`);
                        return; 
                    }
                    if ((currentTask.status === 'En Progreso' || currentTask.status === 'Completado') && dependencyTask.status !== 'Completado') {
                         setValidationError(`Conflicto de dependencia: La tarea no puede avanzar porque "${dependencyTask.name}" aún no está completada.`);
                        return; 
                    }
                }
            }
        }

        const taskToSave: Partial<Task> = { ...currentTask };
    
        if (typeof taskToSave.totalVolume === 'number' && taskToSave.totalVolume > 0) {
            const completedVolume = taskToSave.completedVolume || 0;
            const totalVolume = taskToSave.totalVolume;
    
            if (completedVolume >= totalVolume) {
                if (taskToSave.status !== 'Completado') {
                    taskToSave.status = 'Completado';
                }
            } else if (completedVolume > 0) {
                if (taskToSave.status === 'No Iniciado' || taskToSave.status === 'Completado') {
                    taskToSave.status = 'En Progreso';
                }
            }
        }
        
        if (taskToSave.status === 'Completado') {
            if (!taskToSave.completionDate) {
                taskToSave.completionDate = new Date().toISOString().split('T')[0];
            }
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
        if (taskId) {
            await deleteItem('tasks', taskId);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
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

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Planificación del Proyecto</h2>
                <div className="flex flex-wrap gap-2">
                    {canEdit && (
                        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                            Añadir Tarea
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mb-6">
                <GanttChart tasks={tasks} onUpdateTask={(t) => updateItem('tasks', t.id, t)} canEdit={canEdit} />
            </div>

            <Card title="Lista de Tareas">
                <div className="space-y-4">
                    {tasks.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => {
                        const attachedPhotos = task.photoIds ? photos.filter(p => task.photoIds!.includes(p.id)) : [];
                        const dependencies = task.dependsOn ? tasks.filter(t => task.dependsOn!.includes(t.id)) : [];
                        const progress = getTaskProgress(task);
                        const valueProgress = task.totalValue ? task.totalValue * (progress / 100) : 0;

                        return (
                        <div key={task.id} className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
                           <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-black">{task.name}</h4>
                                    <p className="text-sm text-black">{task.description}</p>
                                    <p className="text-xs text-black mt-1">Asignado a: {workers.find(w => w.id === task.assignedWorkerId)?.name || 'Sin asignar'}</p>
                                     {dependencies.length > 0 && (
                                        <p className="text-xs text-black mt-1">
                                            Depende de: <span className="font-semibold">{dependencies.map(d => d.name).join(', ')}</span>
                                        </p>
                                     )}
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                     <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${getStatusColor(task.status)}`}>{task.status}</span>
                                    <p className="text-sm text-black mt-1">{new Date(task.startDate).toLocaleDateString()}</p>
                                     {canEdit && (
                                        <>
                                            <button onClick={() => handleOpenModal(task)} className="text-sm text-black hover:text-gray-600 mt-1">Editar</button>
                                            <button onClick={() => handleDeleteClick(task.id)} className="text-sm text-red-600 hover:text-red-800 mt-1 ml-2 font-medium">Eliminar</button>
                                        </>
                                     )}
                                </div>
                           </div>
                           <div className="mt-3">
                                <div className="flex items-center">
                                    <div className="flex-grow">
                                        <ProgressBar value={progress} color={task.status === 'Retrasado' ? 'red' : task.status === 'Completado' ? 'green' : 'blue'} />
                                    </div>
                                    <span className="ml-4 w-12 text-right text-sm font-semibold text-black">{progress.toFixed(0)}%</span>
                                </div>
                                <div className="mt-2 flex justify-between items-baseline text-sm">
                                    <div className="text-gray-600">
                                        {(task.totalVolume && task.volumeUnit) ? (
                                            <span>Avance Físico: <strong>{task.completedVolume ?? 0} / {task.totalVolume}</strong> {task.volumeUnit}</span>
                                        ) : ( <span>&nbsp;</span> )}
                                    </div>
                                    <div className="text-right">
                                        {task.totalValue && (
                                            <p className="text-black">
                                                <span className="font-medium">Avance Monetario:</span> 
                                                <span className="font-bold text-green-600 ml-2">
                                                    ${valueProgress.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-gray-500"> / ${task.totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                           </div>
                           {attachedPhotos.length > 0 && (
                                <div className="mt-4">
                                    <h5 className="text-sm font-semibold text-black mb-2">Fotos Adjuntas:</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {attachedPhotos.map(photo => (
                                            <div key={photo.id} className="relative group cursor-pointer" onClick={() => setViewingPhotoUrl(photo.url)}>
                                                <img src={photo.url} alt={photo.description} className="h-20 w-20 object-cover rounded-md border-2 border-transparent group-hover:border-primary-500 transition-all" />
                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Tarea' : 'Añadir Nueva Tarea'}>
                <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
                    <input type="text" placeholder="Nombre de la Tarea" value={currentTask.name || ''} onChange={e => {setCurrentTask({...currentTask, name: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <textarea placeholder="Descripción" value={currentTask.description || ''} onChange={e => setCurrentTask({...currentTask, description: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" rows={2}></textarea>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-black block text-sm font-medium">Fecha de Inicio</label>
                            <input type="date" value={currentTask.startDate || ''} onChange={e => {setCurrentTask({...currentTask, startDate: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black" />
                        </div>
                        <div>
                            <label className="text-black block text-sm font-medium">Fecha de Fin</label>
                            <input type="date" value={currentTask.endDate || ''} onChange={e => {setCurrentTask({...currentTask, endDate: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black" />
                        </div>
                    </div>

                    <div>
                        <label className="text-black block text-sm font-medium">Dependencias (Tareas que deben completarse antes)</label>
                        <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                            {tasks.filter(t => t.id !== currentTask.id).map(potentialDep => (
                                <div key={potentialDep.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`dep-${potentialDep.id}`}
                                        checked={currentTask.dependsOn?.includes(potentialDep.id) || false}
                                        onChange={e => {
                                            const selectedId = potentialDep.id;
                                            const isChecked = e.target.checked;
                                            setCurrentTask(prev => {
                                                const currentDeps = prev.dependsOn || [];
                                                if (isChecked) {
                                                    return { ...prev, dependsOn: [...currentDeps, selectedId] };
                                                } else {
                                                    return { ...prev, dependsOn: currentDeps.filter(id => id !== selectedId) };
                                                }
                                            });
                                        }}
                                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <label htmlFor={`dep-${potentialDep.id}`} className="ml-2 text-sm text-black">{potentialDep.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <select value={currentTask.assignedWorkerId || ''} onChange={e => setCurrentTask({...currentTask, assignedWorkerId: e.target.value})} className="w-full p-2 border rounded bg-white text-black">
                        <option value="">Asignar Trabajador</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select value={currentTask.status || ''} onChange={e => setCurrentTask({...currentTask, status: e.target.value as Task['status']})} className="w-full p-2 border rounded bg-white text-black">
                        <option>No Iniciado</option><option>En Progreso</option><option>Completado</option><option>Retrasado</option>
                    </select>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="text-black block text-sm font-medium">Volumen Total</label>
                            <input type="number" placeholder="Ej. 100" value={currentTask.totalVolume || ''} onChange={e => setCurrentTask({...currentTask, totalVolume: parseFloat(e.target.value) || undefined})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                        </div>
                        <div>
                            <label className="text-black block text-sm font-medium">Unidad</label>
                            <input type="text" placeholder="Ej. m³" value={currentTask.volumeUnit || ''} onChange={e => setCurrentTask({...currentTask, volumeUnit: e.target.value})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                        </div>
                    </div>
                    <div>
                        <label className="text-black block text-sm font-medium">Volumen de Avance</label>
                        <input type="number" placeholder="Ej. 25" value={currentTask.completedVolume || ''} onChange={e => setCurrentTask({...currentTask, completedVolume: parseFloat(e.target.value) || undefined})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    </div>

                    <div>
                        <label className="text-black block text-sm font-medium">Valor Total del Trabajo ($)</label>
                        <input 
                            type="number" 
                            placeholder="Ej. 10000" 
                            value={currentTask.totalValue || ''} 
                            onChange={e => setCurrentTask({...currentTask, totalValue: parseFloat(e.target.value) || undefined})} 
                            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" 
                        />
                    </div>
                    
                    <div>
                        <label className="text-black block text-sm font-medium">Fotos Adjuntas</label>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md flex-grow bg-gray-50 min-h-[40px]">
                                {(currentTask.photoIds || []).map(id => {
                                    const photo = photos.find(p => p.id === id);
                                    return photo ? <img key={id} src={photo.url} alt={photo.description} className="h-10 w-10 object-cover rounded" /> : null;
                                })}
                                {(currentTask.photoIds || []).length === 0 && <span className="text-sm text-gray-500">Ninguna</span>}
                            </div>
                             <button onClick={() => setIsPhotoManagerOpen(true)} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors font-medium text-sm">Gestionar</button>
                        </div>
                    </div>
                    
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}

                    <button onClick={handleSave} className="w-full mt-2 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Tarea</button>
                </div>
            </Modal>

             <Modal isOpen={isPhotoManagerOpen} onClose={() => setIsPhotoManagerOpen(false)} title="Gestionar Fotos de la Tarea">
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map(photo => (
                                <div key={photo.id} className="relative cursor-pointer" onClick={() => handlePhotoSelection(photo.id)}>
                                    <img src={photo.url} alt={photo.description} className={`w-full h-28 object-cover rounded-md transition-all ${currentTask.photoIds?.includes(photo.id) ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent'}`} />
                                    {(currentTask.photoIds?.includes(photo.id)) && (
                                        <div className="absolute top-1 right-1 bg-primary-600 text-white rounded-full h-6 w-6 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-black py-8">No hay fotos en la bitácora del proyecto. Sube algunas fotos primero.</p>
                    )}
                </div>
                 <div className="mt-4 flex justify-end">
                    <button onClick={() => setIsPhotoManagerOpen(false)} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Hecho</button>
                 </div>
            </Modal>
            
            {viewingPhotoUrl && (
                 <Modal isOpen={!!viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} title="Vista Previa de Foto">
                    <img src={viewingPhotoUrl} alt="Vista Previa" className="w-full max-h-[80vh] object-contain rounded-lg"/>
                 </Modal>
            )}

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteTask}
                title="Eliminar Tarea"
                message={`¿Estás seguro de que quieres eliminar la tarea "${deleteConfirmation.name}"? También se eliminará como dependencia de otras tareas.`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Planning;
