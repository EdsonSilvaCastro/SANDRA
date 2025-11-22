
import React, { useState, useMemo } from 'react';
import { Client, Interaction } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';

const CRM: React.FC = () => {
    const { projectData, addItem, updateItem, deleteItem } = useProject();

    const clients = projectData.clients;
    const interactions = projectData.interactions;

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [isEditingClient, setIsEditingClient] = useState(false);
    
    const [currentInteraction, setCurrentInteraction] = useState<Partial<Interaction>>({});
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');


    const stats = useMemo(() => ({
        total: clients.length,
        active: clients.filter(c => c.status === 'Activo').length,
        potential: clients.filter(c => c.status === 'Potencial').length,
    }), [clients]);
    
    // Client Handlers
    const handleOpenClientModal = (client?: Client) => {
        setValidationError('');
        if (client) {
            setCurrentClient(client);
            setIsEditingClient(true);
        } else {
            setCurrentClient({ type: 'Empresa', status: 'Potencial' });
            setIsEditingClient(false);
        }
        setIsClientModalOpen(true);
    };

    const handleSaveClient = async () => {
        // Simple validation
        if (!currentClient.name || !currentClient.primaryContactName) {
            setValidationError('El nombre del cliente y el nombre del contacto principal son obligatorios.');
            return;
        }

        if (isEditingClient && currentClient.id) {
            await updateItem('clients', currentClient.id, currentClient);
        } else {
            await addItem('clients', { ...currentClient, id: `cli-${Date.now()}` });
        }
        setIsClientModalOpen(false);
        setValidationError('');
    };

    const handleDeleteClientClick = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setDeleteConfirmation({ isOpen: true, id: clientId, name: client.name });
        }
    };

    const confirmDeleteClient = async () => {
        const clientId = deleteConfirmation.id;
        if (clientId) {
            await deleteItem('clients', clientId);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };
    
    // Details & Interaction Handlers
    const handleOpenDetailsModal = (client: Client) => {
        setCurrentClient(client);
        setIsDetailsModalOpen(true);
    };
    
    const handleOpenInteractionModal = (clientId: string) => {
        setValidationError('');
        setCurrentInteraction({ 
            clientId: clientId,
            date: new Date().toISOString().split('T')[0],
            type: 'Llamada'
        });
        setIsInteractionModalOpen(true);
    };

    const handleSaveInteraction = async () => {
         if (!currentInteraction.clientId || !currentInteraction.summary) {
            setValidationError('El resumen de la interacción es obligatorio.');
            return;
        }
        await addItem('interactions', { ...currentInteraction, id: `int-${Date.now()}` });
        setIsInteractionModalOpen(false);
        setValidationError('');
    };
    
    const getStatusColor = (status: Client['status']) => {
        switch(status) {
            case 'Activo': return 'bg-green-100 text-green-800';
            case 'Potencial': return 'bg-blue-100 text-blue-800';
            case 'Inactivo': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">CRM / Gestión de Clientes</h2>
                <button onClick={() => handleOpenClientModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    Añadir Cliente
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card><h4 className="font-medium text-black">Total de Clientes</h4><p className="text-3xl font-bold text-black">{stats.total}</p></Card>
                <Card><h4 className="font-medium text-black">Clientes Activos</h4><p className="text-3xl font-bold text-black">{stats.active}</p></Card>
                <Card><h4 className="font-medium text-black">Clientes Potenciales</h4><p className="text-3xl font-bold text-black">{stats.potential}</p></Card>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Nombre del Cliente</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Contacto Principal</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{client.name}</td>
                                    <td className="p-3">{client.type}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div>{client.primaryContactName}</div>
                                        <div className="text-sm text-gray-500">{client.primaryContactEmail}</div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <button onClick={() => handleOpenDetailsModal(client)} className="text-blue-600 hover:text-blue-800 font-medium">Ver Detalles</button>
                                        <button onClick={() => handleOpenClientModal(client)} className="ml-4 text-black hover:text-gray-600 font-medium">Editar</button>
                                        <button onClick={() => handleDeleteClientClick(client.id)} className="ml-4 text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Client Add/Edit Modal */}
            <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={isEditingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}>
                <div className="space-y-4">
                    <input name="name" value={currentClient.name || ''} onChange={e => {setCurrentClient({...currentClient, name: e.target.value}); setValidationError('');}} placeholder="Nombre Cliente/Empresa" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <div className="grid grid-cols-2 gap-4">
                        <select name="type" value={currentClient.type || 'Empresa'} onChange={e => setCurrentClient({...currentClient, type: e.target.value as Client['type']})} className="w-full p-2 border rounded bg-white text-black">
                            <option>Empresa</option>
                            <option>Individual</option>
                        </select>
                        <select name="status" value={currentClient.status || 'Potencial'} onChange={e => setCurrentClient({...currentClient, status: e.target.value as Client['status']})} className="w-full p-2 border rounded bg-white text-black">
                            <option>Potencial</option>
                            <option>Activo</option>
                            <option>Inactivo</option>
                        </select>
                    </div>
                     <input name="primaryContactName" value={currentClient.primaryContactName || ''} onChange={e => {setCurrentClient({...currentClient, primaryContactName: e.target.value}); setValidationError('');}} placeholder="Nombre Contacto Principal" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                     <input name="primaryContactEmail" type="email" value={currentClient.primaryContactEmail || ''} onChange={e => setCurrentClient({...currentClient, primaryContactEmail: e.target.value})} placeholder="Email Contacto Principal" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                     <input name="primaryContactPhone" value={currentClient.primaryContactPhone || ''} onChange={e => setCurrentClient({...currentClient, primaryContactPhone: e.target.value})} placeholder="Teléfono Contacto Principal" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                     <input name="address" value={currentClient.address || ''} onChange={e => setCurrentClient({...currentClient, address: e.target.value})} placeholder="Dirección" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                     <textarea name="notes" value={currentClient.notes || ''} onChange={e => setCurrentClient({...currentClient, notes: e.target.value})} placeholder="Notas adicionales..." className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" rows={3}></textarea>
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveClient} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Cliente</button>
                </div>
            </Modal>
            
            {/* Client Details & Interactions Modal */}
            {isDetailsModalOpen && currentClient.id && (
                <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Detalles de ${currentClient.name}`}>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-black border-b pb-2 mb-2">Información del Cliente</h3>
                            <p><strong>Contacto:</strong> {currentClient.primaryContactName}</p>
                            <p><strong>Email:</strong> {currentClient.primaryContactEmail}</p>
                            <p><strong>Teléfono:</strong> {currentClient.primaryContactPhone}</p>
                            <p><strong>Dirección:</strong> {currentClient.address}</p>
                            <p><strong>Notas:</strong> {currentClient.notes}</p>
                        </div>
                        <div>
                            <div className="flex justify-between items-center border-b pb-2 mb-2">
                                <h3 className="font-semibold text-black">Historial de Interacciones</h3>
                                <button onClick={() => handleOpenInteractionModal(currentClient.id!)} className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">Registrar</button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {interactions.filter(i => i.clientId === currentClient.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => (
                                    <div key={interaction.id} className="p-2 bg-gray-50 rounded">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{interaction.type} - {new Date(interaction.date).toLocaleDateString()}</span>
                                            {interaction.followUpDate && <span className="text-orange-600">Seguimiento: {new Date(interaction.followUpDate).toLocaleDateString()}</span>}
                                        </div>
                                        <p className="text-sm mt-1">{interaction.summary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Interaction Add Modal */}
            <Modal isOpen={isInteractionModalOpen} onClose={() => setIsInteractionModalOpen(false)} title="Registrar Nueva Interacción">
                 <div className="space-y-4">
                    <select name="type" value={currentInteraction.type || 'Llamada'} onChange={e => setCurrentInteraction({...currentInteraction, type: e.target.value as Interaction['type']})} className="w-full p-2 border rounded bg-white text-black">
                        <option>Llamada</option>
                        <option>Correo Electrónico</option>
                        <option>Reunión</option>
                        <option>Otro</option>
                    </select>
                    <input name="date" type="date" value={currentInteraction.date || ''} onChange={e => setCurrentInteraction({...currentInteraction, date: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    <textarea name="summary" value={currentInteraction.summary || ''} onChange={e => {setCurrentInteraction({...currentInteraction, summary: e.target.value}); setValidationError('');}} placeholder="Resumen de la interacción..." className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" rows={4}></textarea>
                    <div>
                        <label className="text-sm text-black">Fecha de Seguimiento (Opcional)</label>
                        <input name="followUpDate" type="date" value={currentInteraction.followUpDate || ''} onChange={e => setCurrentInteraction({...currentInteraction, followUpDate: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    </div>
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveInteraction} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">Guardar Interacción</button>
                 </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteClient}
                title="Eliminar Cliente"
                message={`¿Estás seguro de que quieres eliminar a "${deleteConfirmation.name}"? Esto también eliminará todas sus interacciones.`}
                confirmText="Eliminar"
                isDangerous={true}
            />

        </div>
    );
};

export default CRM;
