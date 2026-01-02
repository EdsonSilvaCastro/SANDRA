
import React, { useState, useEffect, useMemo } from 'react';
import { Material, MaterialOrder } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ExcelImportModal from './ui/ExcelImportModal';
import { GoogleGenAI, Type } from "@google/genai";
import { useProject } from '../contexts/ProjectContext';

interface Supplier {
    name: string;
    description: string;
}

const Materials: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const materials = projectData.materials;
    const orders = projectData.materialOrders;
    
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [currentMaterial, setCurrentMaterial] = useState<Partial<Material>>({});
    const [isEditingMaterial, setIsEditingMaterial] = useState(false);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Partial<MaterialOrder>>({});
    const [isEditingOrder, setIsEditingOrder] = useState(false);

    const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
    const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [suppliersError, setSuppliersError] = useState<string | null>(null);
    const [selectedMaterialForSuppliers, setSelectedMaterialForSuppliers] = useState<Material | null>(null);
    
    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [notification, setNotification] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string>('');

    const [sortOption, setSortOption] = useState<string>('default');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    const sortedMaterials = useMemo(() => {
        const materialsCopy = [...materials];
        switch (sortOption) {
            case 'quantity_asc':
                return materialsCopy.sort((a, b) => a.quantity - b.quantity);
            case 'quantity_desc':
                return materialsCopy.sort((a, b) => b.quantity - a.quantity);
            case 'critical_asc':
                return materialsCopy.sort((a, b) => a.criticalStockLevel - b.criticalStockLevel);
            case 'critical_desc':
                return materialsCopy.sort((a, b) => b.criticalStockLevel - a.criticalStockLevel);
            case 'proximity':
                return materialsCopy.sort((a, b) => {
                    const proximityA = a.criticalStockLevel > 0 ? a.quantity / a.criticalStockLevel : Infinity;
                    const proximityB = b.criticalStockLevel > 0 ? b.quantity / b.criticalStockLevel : Infinity;
                    return proximityA - proximityB;
                });
            case 'default':
            default:
                return materials;
        }
    }, [materials, sortOption]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleOpenMaterialModal = (material?: Material) => {
        if (!canEdit) return;
        setValidationError('');
        if (material) {
            setCurrentMaterial(material);
            setIsEditingMaterial(true);
        } else {
            setCurrentMaterial({
                name: '',
                description: '',
                quantity: 0,
                unit: 'unidades',
                unitCost: 0,
                criticalStockLevel: 0,
                location: ''
            });
            setIsEditingMaterial(false);
        }
        setIsMaterialModalOpen(true);
    };
    
    const handleCloseMaterialModal = () => {
        setIsMaterialModalOpen(false);
        setCurrentMaterial({});
        setValidationError('');
    };

    const handleSaveMaterial = async () => {
        if (!canEdit) return;
        if (!currentMaterial.name || !currentMaterial.unit || currentMaterial.quantity === undefined || currentMaterial.unitCost === undefined) {
            setValidationError('Por favor, complete los campos obligatorios: Nombre, Cantidad, Unidad y Costo.');
            return;
        }

        if (isEditingMaterial && currentMaterial.id) {
            const originalMaterial = materials.find(m => m.id === currentMaterial.id);
            const updatedMaterial = currentMaterial as Material;
            
            await updateItem('materials', currentMaterial.id, currentMaterial);

            if (originalMaterial && updatedMaterial.quantity <= updatedMaterial.criticalStockLevel && originalMaterial.quantity > originalMaterial.criticalStockLevel) {
                setNotification(`¡Advertencia! El stock de "${updatedMaterial.name}" ha caído por debajo del nivel crítico de ${updatedMaterial.criticalStockLevel} ${updatedMaterial.unit}.`);
            }
        } else {
            const newMaterial = { ...currentMaterial, id: `mat-${Date.now()}` } as Material;
            await addItem('materials', newMaterial);
            
            if (newMaterial.quantity <= newMaterial.criticalStockLevel) {
                 setNotification(`¡Advertencia! El nuevo material "${newMaterial.name}" fue añadido con stock por debajo del nivel crítico.`);
            }
        }
        handleCloseMaterialModal();
    };

    const handleDeleteMaterialClick = (materialId: string) => {
        if (!canEdit) return;
        const materialToDelete = materials.find(m => m.id === materialId);
        if (!materialToDelete) return;

        const isMaterialInOrders = orders.some(order => order.materialId === materialId);
        if (isMaterialInOrders) {
            alert('Este material no se puede eliminar porque está asociado a uno o más pedidos. Por favor, elimine o modifique los pedidos asociados primero.');
            return;
        }
        setDeleteConfirmation({ isOpen: true, id: materialId, name: materialToDelete.name });
    };

    const confirmDeleteMaterial = async () => {
        if (deleteConfirmation.id) {
            await deleteItem('materials', deleteConfirmation.id);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentMaterial(prev => ({ ...prev, [name]: name === 'quantity' || name === 'unitCost' || name === 'criticalStockLevel' ? parseFloat(value) : value }));
        if (validationError) setValidationError('');
    };

    const handleOpenOrderModal = (order?: MaterialOrder) => {
        if (!canEdit) return;
        setValidationError('');
        if (order) {
            setCurrentOrder(order);
            setIsEditingOrder(true);
        } else {
            setCurrentOrder({
                materialId: materials.length > 0 ? materials[0].id : '',
                quantity: 1,
                orderDate: new Date().toISOString().split('T')[0],
                status: 'Pendiente'
            });
            setIsEditingOrder(false);
        }
        setIsOrderModalOpen(true);
    };

    const handleCloseOrderModal = () => {
        setIsOrderModalOpen(false);
        setCurrentOrder({});
        setValidationError('');
    };

    const handleSaveOrder = async () => {
        if (!canEdit) return;
        if (!currentOrder.materialId || !currentOrder.quantity || !currentOrder.orderDate || !currentOrder.status) {
            setValidationError('Todos los campos del pedido son obligatorios.');
            return;
        }
        if (isEditingOrder && currentOrder.id) {
            await updateItem('materialOrders', currentOrder.id, currentOrder);
        } else {
            const newOrder = { ...currentOrder, id: `ord-${Date.now()}` } as MaterialOrder;
            await addItem('materialOrders', newOrder);
        }
        handleCloseOrderModal();
    };

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentOrder(prev => ({ ...prev, [name]: name === 'quantity' ? parseFloat(value) : value }));
        if (validationError) setValidationError('');
    };

    const handleOrderStatusChange = async (orderId: string, newStatus: MaterialOrder['status']) => {
        if (!canEdit) return;
        await updateItem('materialOrders', orderId, { status: newStatus });
    };

    const handleFindSuppliers = async (material: Material) => {
        if (!material.location) return;
        setSelectedMaterialForSuppliers(material);
        setIsSuppliersModalOpen(true);
        setIsLoadingSuppliers(true);
        setSuppliersList([]);
        setSuppliersError(null);
        
        try {
            // FIX: Initialize GoogleGenAI with named apiKey parameter and use gemini-3-flash-preview for text reasoning.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Encuentra al menos 3 proveedores de '${material.name}' cerca de '${material.location}'.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: {
                                    type: Type.STRING,
                                    description: 'El nombre del proveedor.'
                                },
                                description: {
                                    type: Type.STRING,
                                    description: 'Una breve descripción, dirección o información de contacto del proveedor.'
                                }
                            },
                            required: ['name', 'description'],
                            propertyOrdering: ["name", "description"]
                        }
                    }
                }
            });
            
            const jsonStr = response.text.trim();
            const parsedSuppliers = JSON.parse(jsonStr) as Supplier[];
            setSuppliersList(parsedSuppliers);

        } catch (error) {
            console.error("Error al buscar proveedores:", error);
            setSuppliersError('No se pudieron encontrar proveedores en este momento. Inténtelo de nuevo más tarde.');
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    // Excel Import Logic
    const handleImportMaterials = async (data: any[]) => {
        let count = 0;
        for (const row of data) {
            // Map Excel columns to Material props
            const newMaterial: Partial<Material> = {
                name: row['Nombre'],
                description: row['Descripción'] || '',
                quantity: Number(row['Cantidad']) || 0,
                unit: row['Unidad'] || 'unidades',
                unitCost: Number(row['Costo']) || 0,
                criticalStockLevel: Number(row['Stock Crítico']) || 0,
                location: row['Ubicación'] || ''
            };

            // Basic validation
            if (newMaterial.name && typeof newMaterial.quantity === 'number') {
                await addItem('materials', { ...newMaterial, id: `mat-imp-${Date.now()}-${count}` });
                count++;
            }
        }
    };


    return (
        <div>
            {notification && (
                <div className="fixed top-24 right-5 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-lg z-50 animate-toast" role="alert">
                    <div className="flex items-start">
                        <div className="py-1"><svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg></div>
                        <div className="flex-1">
                            <p className="font-bold">Alerta de Stock Bajo</p>
                            <p className="text-sm">{notification}</p>
                        </div>
                        <button onClick={() => setNotification(null)} className="ml-auto -mx-1.5 -my-1.5 bg-yellow-100 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 inline-flex h-8 w-8" aria-label="Cerrar">
                            <span className="sr-only">Cerrar</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                        </button>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Inventario de Materiales</h2>
                {canEdit && (
                    <div className="flex gap-2">
                         <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Importar Excel
                        </button>
                        <button onClick={() => handleOpenMaterialModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                            Añadir Material
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-4 flex justify-end">
                <label htmlFor="sort-materials" className="mr-2 self-center text-sm font-medium text-black">Ordenar por:</label>
                <select 
                    id="sort-materials"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-2 border rounded-md bg-white text-black text-sm focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="default">Predeterminado</option>
                    <option value="quantity_asc">Cantidad (Ascendente)</option>
                    <option value="quantity_desc">Cantidad (Descendente)</option>
                    <option value="critical_asc">Nivel Crítico (Ascendente)</option>
                    <option value="critical_desc">Nivel Crítico (Descendente)</option>
                    <option value="proximity">Proximidad a Nivel Crítico</option>
                </select>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Cantidad</th>
                                <th className="p-3">Ubicación</th>
                                <th className="p-3">Costo Unitario</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMaterials.map(material => (
                                <tr key={material.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{material.name}</td>
                                    <td className="p-3">{material.quantity} {material.unit}</td>
                                    <td className="p-3">{material.location || 'N/A'}</td>
                                    <td className="p-3">${material.unitCost.toFixed(2)}</td>
                                    <td className="p-3">
                                        {material.quantity <= material.criticalStockLevel ? 
                                            (<span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">Stock Bajo</span>) :
                                            (<span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">En Stock</span>)
                                        }
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {canEdit && (
                                            <>
                                                <button onClick={() => handleOpenMaterialModal(material)} className="text-black hover:text-gray-600 font-medium">Editar</button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => handleFindSuppliers(material)} 
                                            className={`ml-4 text-primary-600 hover:text-primary-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed ${!canEdit ? 'ml-0' : ''}`}
                                            disabled={!material.location}
                                            title={!material.location ? "Añadir ubicación para buscar proveedores" : "Buscar proveedores cercanos"}
                                        >
                                            Buscar Proveedores
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => handleDeleteMaterialClick(material.id)} className="ml-4 text-red-600 hover:text-red-800 font-medium">
                                                Eliminar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-2xl font-semibold text-black">Pedidos de Materiales</h3>
                     {canEdit && (
                        <button onClick={() => handleOpenOrderModal()} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                            Añadir Pedido
                        </button>
                     )}
                </div>
                 <Card>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Material</th>
                                <th className="p-3">Cantidad</th>
                                <th className="p-3">Fecha de Pedido</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const material = materials.find(m => m.id === order.materialId);
                                return (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{material?.name || 'Material Eliminado'}</td>
                                        <td className="p-3">{order.quantity} {material?.unit}</td>
                                        <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleOrderStatusChange(order.id, e.target.value as MaterialOrder['status'])}
                                                disabled={!canEdit}
                                                className={`px-2 py-1 text-xs font-semibold rounded-full border-0 focus:ring-0 appearance-none cursor-pointer ${
                                                    order.status === 'Entregado' ? 'bg-green-500 text-white' :
                                                    order.status === 'Enviado' ? 'bg-blue-500 text-white' :
                                                    order.status === 'Pendiente' ? 'bg-yellow-400 text-black' :
                                                    order.status === 'Cancelado' ? 'bg-gray-500 text-white' : ''
                                                } ${!canEdit ? 'opacity-80 cursor-not-allowed' : ''}`}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Enviado">Enviado</option>
                                                <option value="Entregado">Entregado</option>
                                                <option value="Cancelado">Cancelado</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            {canEdit ? (
                                                <button onClick={() => handleOpenOrderModal(order)} className="text-black hover:text-gray-600 font-medium">Editar</button>
                                            ) : <span className="text-gray-400 text-sm">Solo lectura</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>

            <Modal isOpen={isMaterialModalOpen} onClose={handleCloseMaterialModal} title={isEditingMaterial ? 'Editar Material' : 'Añadir Nuevo Material'}>
                <div className="space-y-4">
                    <input name="name" value={currentMaterial.name || ''} onChange={handleMaterialChange} placeholder="Nombre *" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="description" value={currentMaterial.description || ''} onChange={handleMaterialChange} placeholder="Descripción" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="location" value={currentMaterial.location || ''} onChange={handleMaterialChange} placeholder="Ubicación (ej. Ciudad, Dirección)" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="quantity" type="number" value={currentMaterial.quantity ?? ''} onChange={handleMaterialChange} placeholder="Cantidad *" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="unit" value={currentMaterial.unit || ''} onChange={handleMaterialChange} placeholder="Unidad (ej. sacos, m³) *" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="unitCost" type="number" value={currentMaterial.unitCost ?? ''} onChange={handleMaterialChange} placeholder="Costo Unitario *" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="criticalStockLevel" type="number" value={currentMaterial.criticalStockLevel ?? ''} onChange={handleMaterialChange} placeholder="Nivel Crítico de Stock" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveMaterial} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar</button>
                </div>
            </Modal>

            <Modal isOpen={isOrderModalOpen} onClose={handleCloseOrderModal} title={isEditingOrder ? 'Editar Pedido de Material' : 'Añadir Nuevo Pedido'}>
                <div className="space-y-4">
                    <select name="materialId" value={currentOrder.materialId || ''} onChange={handleOrderChange} className="w-full p-2 border rounded bg-white text-black" disabled={isEditingOrder}>
                        <option value="" disabled>Seleccionar Material</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input name="quantity" type="number" min="1" value={currentOrder.quantity ?? ''} onChange={handleOrderChange} placeholder="Cantidad" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input name="orderDate" type="date" value={currentOrder.orderDate || ''} onChange={handleOrderChange} className="w-full p-2 border rounded bg-white text-black" />
                    <select name="status" value={currentOrder.status || 'Pendiente'} onChange={handleOrderChange} className="w-full p-2 border rounded bg-white text-black">
                        <option value="Pendiente">Pendiente</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveOrder} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Pedido</button>
                </div>
            </Modal>

            <Modal 
              isOpen={isSuppliersModalOpen} 
              onClose={() => setIsSuppliersModalOpen(false)} 
              title={`Proveedores para ${selectedMaterialForSuppliers?.name}`}
            >
                {isLoadingSuppliers ? (
                    <div className="text-center p-8">
                        <p className="text-black">Buscando proveedores cercanos...</p>
                    </div>
                ) : suppliersError ? (
                    <div className="p-4 bg-red-100 text-red-800 rounded-md">
                        {suppliersError}
                    </div>
                ) : suppliersList.length > 0 ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                        {suppliersList.map((supplier, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                <h4 className="font-bold text-black">{supplier.name}</h4>
                                <p className="text-black mt-1">{supplier.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <p className="text-black">No se encontraron proveedores para este material y ubicación.</p>
                    </div>
                )}
            </Modal>
            
            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportMaterials}
                title="Importar Materiales desde Excel"
                expectedColumns={['Nombre', 'Cantidad', 'Unidad', 'Costo', 'Stock Crítico', 'Ubicación']}
                templateFileName="plantilla_materiales.xlsx"
            />

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteMaterial}
                title="Eliminar Material"
                message={`¿Estás seguro de que quieres eliminar el material "${deleteConfirmation.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default Materials;
