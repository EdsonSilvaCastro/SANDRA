
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Task, Worker, Photo, Material, TaskMaterial } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ProgressBar from './ui/ProgressBar';
import ExcelImportModal from './ui/ExcelImportModal';
import { useProject } from '../contexts/ProjectContext';
import { addDays, format, differenceInDays, startOfWeek, addWeeks, addMonths, endOfWeek, parseISO } from 'date-fns';

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
        return { overallStartDate: startOfWeek(new Date(Math.min(...startDates))), overallEndDate: endOfWeek(new Date(Math.max(...endDates))) };
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

    const handleMouseDown = (e: React.MouseEvent, task: Task, action: 'move' | 'resize-end' | 'resize-start') => {
        if (!canEdit) return;
        e.preventDefault();
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
        const dayFactor = columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44);
        const daysChanged = deltaX / dayFactor;

        let newStartDate = new Date(dragInfo.initialStartDate);
        let newEndDate = new Date(dragInfo.initialEndDate);

        if (dragInfo.action === 'move') {
            newStartDate = addDays(dragInfo.initialStartDate, daysChanged);
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        } else if (dragInfo.action === 'resize-end') {
            newEndDate = addDays(dragInfo.initialEndDate, daysChanged);
        }

        setTooltip({
            x: e.clientX + 15,
            y: e.clientY,
            text: `${format(newStartDate, 'dd/MM')} - ${format(newEndDate, 'dd/MM')}`
        });
    }, [dragInfo, columnWidth, timeScale]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!dragInfo) return;
        const deltaX = e.clientX - dragInfo.initialMouseX;
        const dayFactor = columnWidth / (timeScale === 'day' ? 1 : timeScale === 'week' ? 7 : 30.44);
        const daysChanged = Math.round(deltaX / dayFactor);

        let newStartDate = format(addDays(dragInfo.initialStartDate, dragInfo.action === 'move' ? daysChanged : 0), 'yyyy-MM-dd');
        let newEndDate = format(addDays(dragInfo.initialEndDate, daysChanged), 'yyyy-MM-dd');

        onUpdateTask({ ...dragInfo.task, startDate: newStartDate, endDate: newEndDate });
        setDragInfo(null);
        setTooltip(null);
    }, [dragInfo, onUpdateTask, columnWidth, timeScale]);

    useEffect(() => {
        if (dragInfo) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragInfo, handleMouseMove, handleMouseUp]);

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-black flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                    Cronograma Maestro
                </h3>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                    {(['day', 'week', 'month'] as TimeScale[]).map(scale => (
                        <button key={scale} onClick={() => setTimeScale(scale)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeScale === scale ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'}`}>
                            {scale === 'day' ? 'Día' : scale === 'week' ? 'Sem' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto border rounded-lg bg-white" style={{ maxHeight: '400px' }}>
                <div className="relative" style={{ width: gridDates.length * columnWidth + 200 }}>
                    <div className="flex sticky top-0 z-20 bg-gray-50 border-b">
                        <div className="w-[200px] flex-shrink-0 border-r p-2 font-bold text-xs text-black sticky left-0 bg-gray-50">Actividad</div>
                        {gridDates.map((date, i) => (
                            <div key={i} className="border-r text-center text-[10px] py-1 flex-shrink-0 font-medium text-black" style={{ width: columnWidth }}>
                                {timeScale === 'day' ? format(date, 'd') : format(date, 'w')}
                            </div>
                        ))}
                    </div>
                    {sortedTasks.map((task, idx) => {
                        const startPx = dateToPixel(new Date(task.startDate));
                        const endPx = dateToPixel(new Date(task.endDate));
                        const width = Math.max(columnWidth, endPx - startPx + (timeScale === 'day' ? columnWidth : 0));
                        const progress = (task.totalVolume && task.totalVolume > 0) ? (task.completedVolume || 0) / task.totalVolume : (task.status === 'Completado' ? 1 : 0);

                        return (
                            <div key={task.id} className="flex border-b hover:bg-gray-50" style={{ height: '36px' }}>
                                <div className="w-[200px] flex-shrink-0 p-2 text-xs truncate font-medium text-black sticky left-0 bg-white border-r z-10 flex items-center">
                                    {task.isExtraordinary && <span className="mr-1 text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-bold">EXT</span>}
                                    {task.name}
                                </div>
                                <div className="relative flex-1">
                                    <div 
                                        className={`absolute h-6 top-1.5 rounded-md cursor-pointer group shadow-sm flex items-center transition-opacity ${task.isExtraordinary ? 'border-orange-400 bg-orange-50' : task.status === 'Completado' ? 'bg-green-100 border border-green-300' : 'bg-blue-100 border border-blue-300'}`}
                                        style={{ left: startPx, width }}
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                    >
                                        <div className={`h-full rounded-l-md ${task.isExtraordinary ? 'bg-orange-500' : task.status === 'Completado' ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${progress * 100}%` }}></div>
                                        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                                            <span className="text-[9px] font-bold text-black truncate">{task.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {tooltip && <div className="fixed p-2 bg-black text-white text-[10px] rounded-md pointer-events-none z-50 font-bold" style={{ top: tooltip.y, left: tooltip.x, transform: 'translateY(-100%)' }}>{tooltip.text}</div>}
        </Card>
    );
};

const Planning: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const tasks = projectData.tasks;
    const workers = projectData.workers;
    const materials = projectData.materials;
    
    const [mainTab, setMainTab] = useState<MainViewTab>('cronograma');
    const [listFilter, setListFilter] = useState<'all' | 'base' | 'extraordinary'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<TaskModalTab>('general');
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    const filteredTasks = useMemo(() => {
        if (listFilter === 'base') return tasks.filter(t => !t.isExtraordinary);
        if (listFilter === 'extraordinary') return tasks.filter(t => t.isExtraordinary);
        return tasks;
    }, [tasks, listFilter]);

    const handleOpenModal = (task?: Task, forceExtraordinary: boolean = false) => {
        if (!canEdit) return;
        setActiveModalTab('general');
        if (task) {
            setCurrentTask({ ...task, materialAssignments: task.materialAssignments || [] });
            setIsEditing(true);
        } else {
            setCurrentTask({ 
                status: 'No Iniciado', 
                startDate: format(new Date(), 'yyyy-MM-dd'), 
                endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
                materialAssignments: [],
                totalVolume: 0,
                completedVolume: 0,
                unitPrice: 0,
                volumeUnit: 'pz',
                isExtraordinary: forceExtraordinary
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentTask.name || !currentTask.startDate || !currentTask.endDate) return;
        
        const laborValue = (currentTask.totalVolume || 0) * (currentTask.unitPrice || 0);
        const taskData = { ...currentTask, totalValue: laborValue };
        
        if (isEditing && currentTask.id) {
            await updateItem('tasks', currentTask.id, taskData);
        } else {
            await addItem('tasks', { ...taskData, id: `tsk-${Date.now()}` });
        }
        setIsModalOpen(false);
    };

    const handleQuickAdvance = async (task: Task, advance: number) => {
        const newCompleted = Math.min(task.totalVolume || 0, advance);
        const status = newCompleted >= (task.totalVolume || 0) ? 'Completado' : 'En Progreso';
        await updateItem('tasks', task.id, { completedVolume: newCompleted, status });
    };

    const calculateMaterialCost = (task: Partial<Task>) => {
        return (task.materialAssignments || []).reduce((acc, asg) => {
            const mat = materials.find(m => m.id === asg.materialId);
            return acc + (asg.quantity * (mat?.unitCost || 0));
        }, 0);
    };

    const handleAddMaterialToTask = (materialId: string) => {
        const assignments = [...(currentTask.materialAssignments || [])];
        if (assignments.some(asg => asg.materialId === materialId)) return;
        
        assignments.push({ materialId, quantity: 1 });
        setCurrentTask({ ...currentTask, materialAssignments: assignments });
    };

    const handleUpdateMaterialQty = (materialId: string, quantity: number) => {
        const assignments = (currentTask.materialAssignments || []).map(asg => 
            asg.materialId === materialId ? { ...asg, quantity } : asg
        );
        setCurrentTask({ ...currentTask, materialAssignments: assignments });
    };

    const handleRemoveMaterial = (materialId: string) => {
        const assignments = (currentTask.materialAssignments || []).filter(asg => asg.materialId !== materialId);
        setCurrentTask({ ...currentTask, materialAssignments: assignments });
    };

    const parseExcelDate = (serial: any) => {
        if (!serial) return format(new Date(), 'yyyy-MM-dd');
        if (typeof serial === 'number') {
            // Excel serial dates start from 1900-01-01
            const date = new Date((serial - 25569) * 86400 * 1000);
            return format(date, 'yyyy-MM-dd');
        }
        try {
            const d = new Date(serial);
            if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
        } catch (e) {}
        return format(new Date(), 'yyyy-MM-dd');
    };

    const renderLaborView = () => (
        <Card>
            <div className="flex justify-between items-center mb-4 text-black">
                <h3 className="text-xl font-bold">Control Maestro de Destajos</h3>
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Total Producido en Obra</p>
                    <p className="text-xl font-black text-green-600">
                        ${filteredTasks.reduce((acc, t) => acc + ((t.completedVolume || 0) * (t.unitPrice || 0)), 0).toLocaleString()}
                    </p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3">Actividad</th>
                            <th className="p-3">Trabajador Asignado</th>
                            <th className="p-3 text-center">Volumen Total</th>
                            <th className="p-3 text-center">Ejecutado (Avance)</th>
                            <th className="p-3 text-right">Precio Unitario</th>
                            <th className="p-3 text-right font-bold text-primary-700">Monto Producido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map(task => {
                            const worker = workers.find(w => w.id === task.assignedWorkerId);
                            const produced = (task.completedVolume || 0) * (task.unitPrice || 0);
                            return (
                                <tr key={task.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-semibold">
                                        {task.isExtraordinary && <span className="mr-2 text-[9px] bg-orange-100 text-orange-600 px-1 rounded font-bold uppercase">Extraordinario</span>}
                                        {task.name}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                {worker?.name.charAt(0) || '?'}
                                            </div>
                                            {worker?.name || <span className="text-gray-400 italic">Sin asignar</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">{task.totalVolume} {task.volumeUnit}</td>
                                    <td className="p-3 text-center font-bold text-blue-600">{task.completedVolume} {task.volumeUnit}</td>
                                    <td className="p-3 text-right">${(task.unitPrice || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-black text-green-700">${produced.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderMaterialView = () => (
        <Card>
            <h3 className="text-xl font-bold text-black mb-4">Matriz de Insumos Planificados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.filter(t => t.materialAssignments && t.materialAssignments.length > 0).map(task => (
                    <div key={task.id} className={`p-4 border rounded-xl shadow-sm ${task.isExtraordinary ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex justify-between items-start border-b pb-2 mb-3">
                            <div>
                                <h4 className="font-bold text-primary-800">
                                    {task.isExtraordinary && <span className="mr-1 text-[9px] bg-orange-600 text-white px-1 rounded font-bold uppercase">EXT</span>}
                                    {task.name}
                                </h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Inversión Material: ${calculateMaterialCost(task).toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
                                {task.materialAssignments?.length} items
                            </span>
                        </div>
                        <div className="space-y-2">
                            {task.materialAssignments?.map(asg => {
                                const mat = materials.find(m => m.id === asg.materialId);
                                const isCritical = mat ? mat.quantity < asg.quantity : true;
                                return (
                                    <div key={asg.materialId} className="flex justify-between items-center text-xs text-black">
                                        <span className="text-gray-600 font-medium">{mat?.name || '---'}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-black'}`}>
                                                {asg.quantity} {mat?.unit}
                                            </span>
                                            {isCritical && <span title="Stock insuficiente en almacén" className="text-red-500 cursor-help">⚠️</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-black tracking-tight">Planificación y Avances</h2>
                    <p className="text-sm text-gray-500">Gestión de tiempos, destajos y catálogo de obra</p>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Importar Catálogo
                        </button>
                        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-sm shadow-md transition-all">Nueva Actividad</button>
                    </div>
                )}
            </div>

            {/* Sub-modulos Navigation */}
            <div className="flex p-1 bg-gray-200 rounded-xl w-full md:w-fit no-print">
                <button onClick={() => setMainTab('cronograma')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'cronograma' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>Cronograma</button>
                <button onClick={() => setMainTab('destajos')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'destajos' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>Mano de Obra</button>
                <button onClick={() => setMainTab('materiales')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'materiales' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>Materiales</button>
            </div>

            {/* Filters for the list */}
            <div className="flex border-b border-gray-200 no-print overflow-x-auto">
                <button onClick={() => setListFilter('all')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${listFilter === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Todos</button>
                <button onClick={() => setListFilter('base')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${listFilter === 'base' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Contrato Base</button>
                <button onClick={() => setListFilter('extraordinary')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${listFilter === 'extraordinary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Extraordinarios</button>
            </div>

            {mainTab === 'cronograma' && (
                <>
                    <GanttChart tasks={filteredTasks} onUpdateTask={(t) => updateItem('tasks', t.id, t)} canEdit={canEdit} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTasks.map(task => {
                            const laborCost = (task.totalVolume || 0) * (task.unitPrice || 0);
                            const materialCost = calculateMaterialCost(task);
                            const progress = (task.totalVolume && task.totalVolume > 0) ? ((task.completedVolume || 0) / (task.totalVolume || 0)) * 100 : 0;

                            return (
                                <Card key={task.id} className={`relative overflow-hidden group border hover:border-primary-300 transition-all ${task.isExtraordinary ? 'border-l-4 border-l-orange-500' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-black group-hover:text-primary-600 transition-colors truncate pr-2 cursor-pointer" onClick={() => handleOpenModal(task)}>
                                            {task.isExtraordinary && <span className="mr-1 text-[9px] bg-orange-100 text-orange-600 px-1 rounded font-bold uppercase">Extraordinario</span>}
                                            {task.name}
                                        </h4>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${task.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-3 text-[10px] font-bold text-gray-500 uppercase">
                                        <span>Total: ${(laborCost + materialCost).toLocaleString()}</span>
                                        <span>Vence: {format(new Date(task.endDate), 'dd MMM')}</span>
                                    </div>

                                    <ProgressBar value={progress} color={task.isExtraordinary ? 'yellow' : task.status === 'Completado' ? 'green' : 'blue'} />
                                    
                                    <div className="mt-4 flex flex-col gap-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase">Registrar Avance Real ({task.volumeUnit})</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                defaultValue={task.completedVolume} 
                                                onBlur={(e) => handleQuickAdvance(task, parseFloat(e.target.value) || 0)}
                                                className="flex-1 p-1 text-xs border rounded bg-white text-black font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder={`0 de ${task.totalVolume}`}
                                            />
                                            <button 
                                                onClick={() => handleOpenModal(task)}
                                                className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                                title="Editar detalles completos"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        {filteredTasks.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-400 font-medium">No se encontraron actividades.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {mainTab === 'destajos' && renderLaborView()}
            {mainTab === 'materiales' && renderMaterialView()}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${isEditing ? 'Gestionar' : 'Nueva'} Actividad de Obra`}>
                <div className="space-y-6">
                    <div className="flex border-b">
                        {(['general', 'labor', 'materials'] as TaskModalTab[]).map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveModalTab(tab)} 
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeModalTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}
                            >
                                {tab === 'general' ? 'Información' : tab === 'labor' ? 'Nómina/Destajo' : 'Insumos'}
                            </button>
                        ))}
                    </div>

                    {activeModalTab === 'general' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <input 
                                    type="checkbox" 
                                    id="extra-toggle" 
                                    checked={currentTask.isExtraordinary || false} 
                                    onChange={e => setCurrentTask({...currentTask, isExtraordinary: e.target.checked})}
                                    className="h-4 w-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                                />
                                <label htmlFor="extra-toggle" className="text-xs font-bold text-orange-800 uppercase cursor-pointer">Actividad Extraordinaria</label>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Concepto / Actividad</label>
                                <input type="text" value={currentTask.name || ''} onChange={e => setCurrentTask({...currentTask, name: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Inicio</label>
                                    <input type="date" value={currentTask.startDate || ''} onChange={e => setCurrentTask({...currentTask, startDate: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Entrega Final</label>
                                    <input type="date" value={currentTask.endDate || ''} onChange={e => setCurrentTask({...currentTask, endDate: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Estado Actual</label>
                                <select value={currentTask.status || 'No Iniciado'} onChange={e => setCurrentTask({...currentTask, status: e.target.value as any})} className="w-full p-2 border rounded-lg bg-white text-black font-bold">
                                    <option>No Iniciado</option>
                                    <option>En Progreso</option>
                                    <option>Completado</option>
                                    <option>Retrasado</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeModalTab === 'labor' && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="text-xs font-black text-primary-700 uppercase mb-2">Configuración de Pago por Destajo</h4>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Destajista Responsable</label>
                                <select value={currentTask.assignedWorkerId || ''} onChange={e => setCurrentTask({...currentTask, assignedWorkerId: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black font-medium">
                                    <option value="">Sin Asignar...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} - {w.role}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Cantidad Total Programada</label>
                                    <input type="number" value={currentTask.totalVolume || 0} onChange={e => setCurrentTask({...currentTask, totalVolume: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Unidad de Medida</label>
                                    <input type="text" value={currentTask.volumeUnit || ''} onChange={e => setCurrentTask({...currentTask, volumeUnit: e.target.value})} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="m2, ml, kg, pz" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Avance Real Actual</label>
                                    <input type="number" value={currentTask.completedVolume || 0} onChange={e => setCurrentTask({...currentTask, completedVolume: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-lg bg-white text-black font-bold text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Precio Unitario Destajo ($)</label>
                                    <input type="number" value={currentTask.unitPrice || 0} onChange={e => setCurrentTask({...currentTask, unitPrice: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-lg bg-white text-black font-bold" />
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border-2 border-primary-100 flex justify-between items-center shadow-inner">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Monto Producido Hoy:</span>
                                <span className="text-xl font-black text-primary-600">
                                    ${((currentTask.completedVolume || 0) * (currentTask.unitPrice || 0)).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {activeModalTab === 'materials' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-primary-700 uppercase mb-2">Vincular Materiales</h4>
                            <div className="flex gap-2 text-black">
                                <select id="planning-mat-sel" className="flex-1 p-2 border rounded-lg bg-white text-sm">
                                    <option value="">Seleccionar Material del Almacén...</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} (${m.unitCost.toLocaleString()} /{m.unit})</option>)}
                                </select>
                                <button 
                                    onClick={() => {
                                        const sel = document.getElementById('planning-mat-sel') as HTMLSelectElement;
                                        if (sel.value) handleAddMaterialToTask(sel.value);
                                    }}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all"
                                >
                                    Añadir
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                {currentTask.materialAssignments?.map(asg => {
                                    const mat = materials.find(m => m.id === asg.materialId);
                                    return (
                                        <div key={asg.materialId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-black">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{mat?.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Inversión: ${(asg.quantity * (mat?.unitCost || 0)).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={asg.quantity} 
                                                    onChange={e => handleUpdateMaterialQty(asg.materialId, parseFloat(e.target.value) || 0)}
                                                    className="w-16 p-1 border rounded bg-white text-center font-bold text-xs"
                                                />
                                                <span className="text-[10px] text-gray-400 font-bold uppercase w-10 truncate">{mat?.unit}</span>
                                                <button onClick={() => handleRemoveMaterial(asg.materialId)} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t sticky bottom-0 bg-white">
                        <div className="mb-4 bg-primary-50 p-4 rounded-xl border-2 border-primary-100">
                             <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-black text-primary-800 uppercase">Costo Total Estimado</h5>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Mano de Obra: ${( (currentTask.totalVolume || 0) * (currentTask.unitPrice || 0) ).toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Materiales: ${calculateMaterialCost(currentTask).toLocaleString()}</p>
                                </div>
                                <div className="text-right text-black">
                                    <p className="text-2xl font-black">${(( (currentTask.totalVolume || 0) * (currentTask.unitPrice || 0) ) + calculateMaterialCost(currentTask)).toLocaleString()}</p>
                                </div>
                             </div>
                        </div>
                        <button onClick={handleSave} className="w-full py-4 bg-primary-600 text-white rounded-xl font-black shadow-lg hover:bg-primary-700 transition-all uppercase tracking-wider">
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </Modal>

            <ExcelImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onImport={async (data) => {
                    for (const row of data) {
                        const name = row.Nombre || row.Actividad || row.Concepto;
                        if (!name) continue;

                        await addItem('tasks', {
                            id: `tsk-${Date.now()}-${Math.random()}`,
                            name: name.toString(),
                            startDate: parseExcelDate(row.Inicio || row.FechaInicio),
                            endDate: parseExcelDate(row.Fin || row.FechaFin),
                            status: 'No Iniciado',
                            totalVolume: parseFloat(row.Volumen || row.Cantidad) || 0,
                            unitPrice: parseFloat(row.Precio || row.PrecioUnitario) || 0,
                            volumeUnit: (row.Unidad || 'pz').toString(),
                            isExtraordinary: row.Extraordinario?.toString().toLowerCase() === 'si'
                        });
                    }
                }}
                title="Importar Catálogo de Obra"
                expectedColumns={['Nombre', 'Inicio', 'Fin', 'Volumen', 'Unidad', 'Precio']}
                templateFileName="catalogo_obra_template.xlsx"
            />

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={async () => {
                    if (deleteConfirmation.id) {
                        await deleteItem('tasks', deleteConfirmation.id);
                        setIsModalOpen(false);
                    }
                }}
                title="Eliminar Actividad"
                message={`¿Eliminar permanentemente "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Planning;
