
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialCmsEntries } from '../constants';
import { ContentEntry } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';

const CMS: React.FC = () => {
    const { activeProjectId } = useProject();
    const [entries, setEntries] = useLocalStorage<ContentEntry[]>(`constructpro_project_${activeProjectId}_cms_entries`, initialCmsEntries);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<Partial<ContentEntry>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');

    const handleOpenModal = (entry?: ContentEntry) => {
        setValidationError('');
        if (entry) {
            setCurrentEntry({ ...entry, tags: entry.tags || [] });
            setIsEditing(true);
        } else {
            setCurrentEntry({
                title: '',
                content: '',
                author: 'Gerente de Proyecto',
                status: 'Borrador',
                tags: []
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentEntry({});
        setValidationError('');
    };

    const handleSaveEntry = () => {
        if (!currentEntry.title || !currentEntry.content) {
            setValidationError("El título y el contenido son obligatorios.");
            return;
        }

        const now = new Date().toISOString();

        if (isEditing) {
            const updatedEntry: ContentEntry = { 
                ...(currentEntry as ContentEntry),
                updatedAt: now,
            };
            setEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
        } else {
            const newEntry: ContentEntry = {
                id: `cms-${Date.now()}`,
                title: currentEntry.title,
                content: currentEntry.content,
                author: currentEntry.author || 'Anónimo',
                status: currentEntry.status || 'Borrador',
                createdAt: now,
                updatedAt: now,
                tags: currentEntry.tags || [],
            };
            setEntries([...entries, newEntry]);
        }
        handleCloseModal();
    };

    const handleDeleteEntryClick = (entryId: string) => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            setDeleteConfirmation({ isOpen: true, id: entryId, name: entry.title });
        }
    };

    const confirmDeleteEntry = () => {
        if (deleteConfirmation.id) {
            setEntries(entries.filter(e => e.id !== deleteConfirmation.id));
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'tags') {
            setCurrentEntry(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()) }));
        } else {
            setCurrentEntry(prev => ({ ...prev, [name]: value }));
        }
        if (validationError) setValidationError('');
    };

    const getStatusColor = (status: ContentEntry['status']) => {
        switch(status) {
            case 'Publicado': return 'bg-green-100 text-green-800';
            case 'Borrador': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Gestor de Contenido (CMS)</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    Crear Nueva Entrada
                </button>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Título</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Autor</th>
                                <th className="p-3">Última Actualización</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(entry => (
                                <tr key={entry.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{entry.title}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="p-3">{entry.author}</td>
                                    <td className="p-3 text-sm text-black">{new Date(entry.updatedAt).toLocaleString()}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(entry)} className="text-black hover:text-gray-600 font-medium">Editar</button>
                                        <button onClick={() => handleDeleteEntryClick(entry.id)} className="ml-4 text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {entries.length === 0 && <p className="text-center p-8 text-black">No hay entradas de contenido. ¡Crea una para empezar!</p>}
                </div>
            </Card>
            
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditing ? 'Editar Entrada' : 'Crear Nueva Entrada'}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                    <input name="title" value={currentEntry.title || ''} onChange={handleInputChange} placeholder="Título de la entrada" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <textarea name="content" value={currentEntry.content || ''} onChange={handleInputChange} placeholder="Contenido de la entrada..." className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" rows={8}></textarea>
                    <div className="grid grid-cols-2 gap-4">
                        <input name="author" value={currentEntry.author || ''} onChange={handleInputChange} placeholder="Autor" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                        <select name="status" value={currentEntry.status || 'Borrador'} onChange={handleInputChange} className="w-full p-2 border rounded bg-white text-black">
                            <option value="Borrador">Borrador</option>
                            <option value="Publicado">Publicado</option>
                        </select>
                    </div>
                    <input name="tags" value={(currentEntry.tags || []).join(', ')} onChange={handleInputChange} placeholder="Etiquetas (separadas por coma)" className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveEntry} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Entrada</button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteEntry}
                title="Eliminar Entrada"
                message={`¿Estás seguro de que quieres eliminar la entrada "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};
export default CMS;
