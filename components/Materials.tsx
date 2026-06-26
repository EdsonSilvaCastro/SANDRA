
import React, { useState, useEffect, useMemo } from 'react';
import { Material, MaterialOrder, Expense, BudgetCategory } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import ExcelImportModal from './ui/ExcelImportModal';
import { GoogleGenAI } from "@google/genai";
import { useProject } from '../contexts/ProjectContext';

interface GroundingSource {
    uri: string;
    title: string;
}

const Materials: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';

    const materials = projectData.materials;
    const orders = projectData.materialOrders;
    const budgetCategories = projectData.budgetCategories;
    
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [currentMaterial, setCurrentMaterial] = useState<Partial<Material>>({});
    const [isEditingMaterial, setIsEditingMaterial] = useState(false);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Partial<MaterialOrder>>({});
    const [isEditingOrder, setIsEditingOrder] = useState(false);

    const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
    const [suppliersMarkdown, setSuppliersMarkdown] = useState<string>('');
    const [suppliersSources, setSuppliersSources] = useState<GroundingSource[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [suppliersError, setSuppliersError] = useState<string | null>(null);
    const [selectedMaterialForSuppliers, setSelectedMaterialForSuppliers] = useState<Material | null>(null);
    
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
            case 'total_cost_desc':
                return materialsCopy.sort((a, b) => (b.quantity * b.unitCost) - (a.quantity * a.unitCost));
            case 'critical_asc':
                return materialsCopy.sort((a, b) => a.criticalStockLevel - b.criticalStockLevel);
            case 'proximity':
                return materialsCopy.sort((a, b) => {
                    const proximityA = a.criticalStockLevel > 0 ? a.quantity / a.criticalStockLevel : Infinity;
                    const proximityB = b.criticalStockLevel > 0 ? b.quantity / b.criticalStockLevel : Infinity;
                    return proximityA - proximityB;
                });
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

        const totalCost = (currentMaterial.quantity || 0) * (currentMaterial.unitCost || 0);

        // Buscar categoría "Materiales" o similar
        let category = budgetCategories.find(c => c.name.toLowerCase().includes('material'));
        if (!category && budgetCategories.length > 0) {
            category = budgetCategories[0]; // Fallback a la primera si no hay una de materiales
        }

        if (isEditingMaterial && currentMaterial.id) {
            await updateItem('materials', currentMaterial.id, currentMaterial);

            // Intentar buscar gasto automático existente por ID predecible
            const expenseId = `exp-mat-${currentMaterial.id}`;
            let existingExpense = projectData.expenses.find(e => 
                e.id === expenseId || 
                e.id === `exp-mat-auto-${currentMaterial.id}`
            );

            // Fallback: si no se encuentra por ID, buscar por descripción que contenga el nombre original o nuevo del material
            if (!existingExpense) {
                const originalMaterial = materials.find(m => m.id === currentMaterial.id);
                existingExpense = projectData.expenses.find(e => 
                    (e.id.startsWith('exp-mat-auto-') || e.id.startsWith('exp-mat-')) && 
                    (e.description.includes(currentMaterial.name || '') || (originalMaterial && e.description.includes(originalMaterial.name)))
                );
            }

            if (existingExpense) {
                await updateItem('expenses', existingExpense.id, {
                    description: `Compra inicial: ${currentMaterial.name} (${currentMaterial.quantity} ${currentMaterial.unit})`,
                    amount: totalCost,
                    categoryId: category ? category.id : existingExpense.categoryId,
                    date: existingExpense.date || new Date().toISOString().split('T')[0]
                });
            } else if (category) {
                // Si no existía un gasto anterior, crear uno nuevo con ID predecible
                await addItem('expenses', {
                    id: expenseId,
                    description: `Compra inicial: ${currentMaterial.name} (${currentMaterial.quantity} ${currentMaterial.unit})`,
                    amount: totalCost,
                    categoryId: category.id,
                    date: new Date().toISOString().split('T')[0]
                });
            }
        } else {
            // REGISTRO NUEVO: Crear material y generar gasto automático
            const materialId = `mat-${Date.now()}`;
            const newMaterial = { ...currentMaterial, id: materialId } as Material;
            await addItem('materials', newMaterial);

            if (category) {
                await addItem('expenses', {
                    id: `exp-mat-${materialId}`,
                    description: `Compra inicial: ${newMaterial.name} (${newMaterial.quantity} ${newMaterial.unit})`,
                    amount: totalCost,
                    categoryId: category.id,
                    date: new Date().toISOString().split('T')[0]
                });
            }

            if (newMaterial.quantity <= newMaterial.criticalStockLevel) {
                 setNotification(`¡Advertencia! El nuevo material "${newMaterial.name}" fue añadido con stock crítico.`);
            }
        }
        handleCloseMaterialModal();
    };

    const handleDeleteMaterialClick = (materialId: string) => {
        if (!canEdit) return;
        const materialToDelete = materials.find(m => m.id === materialId);
        if (!materialToDelete) return;
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
        setCurrentMaterial(prev => ({ 
            ...prev, 
            [name]: name === 'quantity' || name === 'unitCost' || name === 'criticalStockLevel' ? parseFloat(value) || 0 : value 
        }));
        if (validationError) setValidationError('');
    };

    const handleFindSuppliers = async (material: Material) => {
        if (!material.location) return;
        setSelectedMaterialForSuppliers(material);
        setIsSuppliersModalOpen(true);
        setIsLoadingSuppliers(true);
        setSuppliersMarkdown('');
        setSuppliersSources([]);
        setSuppliersError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Busca en internet proveedores reales para '${material.name}' en la zona de '${material.location}'. Proporciona una lista detallada con nombres de tiendas, direcciones si están disponibles y por qué son buenas opciones.`,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });
            
            const text = response.text;
            setSuppliersMarkdown(text || 'No se encontró información detallada.');

            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const sources: GroundingSource[] = chunks
                .filter(chunk => chunk.web)
                .map(chunk => ({
                    uri: chunk.web!.uri,
                    title: chunk.web!.title || 'Sitio Web'
                }));
            
            const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
            setSuppliersSources(uniqueSources);

        } catch (error) {
            console.error("Error al buscar proveedores:", error);
            setSuppliersError('Error al conectar con el servicio de búsqueda.');
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    return (
        <div>
            {notification && (
                <div className="fixed top-24 right-5 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-lg z-50 animate-toast">
                    <div className="flex items-start">
                        <div className="py-1"><svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg></div>
                        <div className="flex-1">
                            <p className="font-bold">Aviso de Almacén</p>
                            <p className="text-sm">{notification}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Inventario de Materiales</h2>
                {canEdit && (
                    <div className="flex gap-2">
                         <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Importar
                        </button>
                        <button onClick={() => handleOpenMaterialModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                            Registrar Material
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-4 flex justify-end">
                <label className="mr-2 self-center text-sm font-medium text-black">Ordenar por:</label>
                <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-2 border rounded-md bg-white text-black text-sm"
                >
                    <option value="default">Nombre</option>
                    <option value="total_cost_desc">Mayor Inversión Total</option>
                    <option value="quantity_desc">Más Stock</option>
                    <option value="proximity">Stock Crítico</option>
                </select>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Stock Actual</th>
                                <th className="p-3">Costo Unit.</th>
                                <th className="p-3">Inversión Total</th>
                                <th className="p-3">Ubicación</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMaterials.map(material => {
                                const totalValue = material.quantity * material.unitCost;
                                return (
                                <tr key={material.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-bold">{material.name}</td>
                                    <td className="p-3">{material.quantity} {material.unit}</td>
                                    <td className="p-3 text-gray-600">${material.unitCost.toLocaleString()}</td>
                                    <td className="p-3 font-bold text-primary-700">${totalValue.toLocaleString()}</td>
                                    <td className="p-3 text-sm">{material.location || '---'}</td>
                                    <td className="p-3">
                                        {material.quantity <= material.criticalStockLevel ? 
                                            (<span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-md">BAJO</span>) :
                                            (<span className="px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-md">OK</span>)
                                        }
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <div className="flex gap-3">
                                            {canEdit && <button onClick={() => handleOpenMaterialModal(material)} className="text-black hover:underline text-sm font-medium">Editar</button>}
                                            <button onClick={() => handleFindSuppliers(material)} className="text-primary-600 hover:underline text-sm font-medium" disabled={!material.location}>Proveedores</button>
                                            {canEdit && <button onClick={() => handleDeleteMaterialClick(material.id)} className="text-red-600 hover:underline text-sm font-medium">Eliminar</button>}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isMaterialModalOpen} onClose={handleCloseMaterialModal} title={isEditingMaterial ? 'Editar Datos del Material' : 'Registro y Compra de Material'}>
                <div className="space-y-4">
                    {!isEditingMaterial && (
                        <div className="bg-green-50 p-3 rounded-md border border-green-100 text-xs text-green-800">
                            <strong>Dato Pro:</strong> Al registrar un nuevo material, el sistema creará automáticamente un registro de gasto en el presupuesto global.
                        </div>
                    )}
                    
                    <input name="name" value={currentMaterial.name || ''} onChange={handleMaterialChange} placeholder="Nombre del Material *" className="w-full p-2 border rounded bg-white text-black" />
                    <input name="location" value={currentMaterial.location || ''} onChange={handleMaterialChange} placeholder="Proveedor / Ubicación Almacén" className="w-full p-2 border rounded bg-white text-black" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Cantidad</label>
                            <input name="quantity" type="number" value={currentMaterial.quantity ?? ''} onChange={handleMaterialChange} placeholder="0" className="w-full p-2 border rounded bg-white text-black font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Unidad (ej. sacos, m³)</label>
                            <input name="unit" value={currentMaterial.unit || ''} onChange={handleMaterialChange} placeholder="Unidad *" className="w-full p-2 border rounded bg-white text-black" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Costo Unitario ($)</label>
                            <input name="unitCost" type="number" value={currentMaterial.unitCost ?? ''} onChange={handleMaterialChange} placeholder="0.00" className="w-full p-2 border rounded bg-white text-black font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Stock Crítico</label>
                            <input name="criticalStockLevel" type="number" value={currentMaterial.criticalStockLevel ?? ''} onChange={handleMaterialChange} placeholder="Alerta en..." className="w-full p-2 border rounded bg-white text-black" />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-100 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">INVERSIÓN TOTAL:</span>
                        <span className="text-2xl font-black text-primary-600">
                            ${((currentMaterial.quantity || 0) * (currentMaterial.unitCost || 0)).toLocaleString()}
                        </span>
                    </div>

                    {validationError && <p className="text-red-600 text-sm font-bold">{validationError}</p>}
                    <button onClick={handleSaveMaterial} className="w-full py-3 bg-primary-600 text-white rounded-md font-bold hover:bg-primary-700 shadow-md">
                        {isEditingMaterial ? 'Actualizar Inventario' : 'Registrar y Pasar a Gastos'}
                    </button>
                </div>
            </Modal>

            {/* Modal de Proveedores y otras utilidades se mantienen igual */}
            <Modal isOpen={isSuppliersModalOpen} onClose={() => setIsSuppliersModalOpen(false)} title={`Proveedores: ${selectedMaterialForSuppliers?.name}`}>
                {isLoadingSuppliers ? (
                    <div className="text-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-2"></div><p>Consultando la red...</p></div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="prose prose-sm text-black whitespace-pre-wrap">{suppliersMarkdown}</div>
                        {suppliersSources.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block text-xs text-primary-600 hover:underline">🔗 {s.title}</a>
                        ))}
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteMaterial}
                title="Eliminar de Inventario"
                message={`¿Eliminar "${deleteConfirmation.name}"? El historial de gastos vinculados no se borrará.`}
                confirmText="Eliminar"
                isDangerous={true}
            />

            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={async (data) => {
                    // Buscar categoría para materiales
                    let category = budgetCategories.find(c => c.name.toLowerCase().includes('material'));
                    if (!category && budgetCategories.length > 0) {
                        category = budgetCategories[0];
                    }

                    for (const row of data) {
                        const name = row['Nombre'] || row['name'] || row['Material'] || row['Concepto'];
                        if (!name) continue;

                        const quantity = parseFloat(row['Cantidad'] || row['quantity'] || row['Cantidad Original'] || row['Stock'] || '0') || 0;
                        const unit = (row['Unidad'] || row['unit'] || row['Medida'] || 'unidades').toString();
                        const unitCost = parseFloat(row['Costo Unitario'] || row['unitCost'] || row['Costo'] || row['Precio'] || row['Precio Unitario'] || '0') || 0;
                        const criticalStockLevel = parseFloat(row['Stock Mínimo'] || row['Minimo'] || row['criticalStockLevel'] || row['Mínimo'] || row['Alerta'] || '0') || 0;
                        const location = (row['Ubicación'] || row['location'] || row['Proveedor'] || row['Ubicacion'] || '').toString();

                        const materialId = `mat-${Date.now()}-${Math.random()}`;
                        const totalCost = quantity * unitCost;

                        const newMaterialInput: Material = {
                            id: materialId,
                            name: name.toString(),
                            description: `Importado: ${name}`,
                            quantity,
                            unit,
                            unitCost,
                            criticalStockLevel,
                            location
                        };

                        await addItem('materials', newMaterialInput);

                        if (category && totalCost > 0) {
                            await addItem('expenses', {
                                id: `exp-mat-${materialId}`,
                                description: `Compra inicial (Importación): ${name} (${quantity} ${unit})`,
                                amount: totalCost,
                                categoryId: category.id,
                                date: new Date().toISOString().split('T')[0]
                            });
                        }
                    }
                }}
                title="Importar Catálogo de Materiales (Excel)"
                expectedColumns={['Nombre', 'Cantidad', 'Unidad', 'Costo Unitario']}
                templateFileName="plantilla_materiales.xlsx"
            />
        </div>
    );
};

export default Materials;
