
import React, { useState } from 'react';
import { Photo } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';

interface PendingPhoto {
    url: string;
    description: string;
    fileName: string;
}

const PhotoLog: React.FC = () => {
    const { currentUser, projectData, addItem, updateItem, deleteItem } = useProject();
    const canEdit = currentUser.role !== 'viewer';
    
    const photos = projectData.photos;
    const tasks = projectData.tasks;

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // States for batch upload
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [globalTags, setGlobalTags] = useState<string[]>([]);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);

    const [editingPhoto, setEditingPhoto] = useState<Partial<Photo>>({});
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [validationError, setValidationError] = useState<string>('');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    const handleOpenUploadModal = () => {
        if (!canEdit) return;
        setValidationError('');
        setPendingPhotos([]);
        setGlobalTags([]);
        setIsUploadModalOpen(true);
    };

    const handleOpenEditModal = (photo: Photo) => {
        if (!canEdit) return;
        setValidationError('');
        setEditingPhoto({ ...photo });
        setIsEditModalOpen(true);
    };

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsProcessingFiles(true);
            setValidationError('');
            // FIX: Explicitly cast the file list to File[] to prevent TypeScript from inferring elements as 'unknown'.
            const files = Array.from(e.target.files) as File[];
            
            const newPending: PendingPhoto[] = [];
            
            for (const file of files) {
                try {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.onerror = (error) => reject(error);
                        // FIX: By casting 'files' to 'File[]', 'file' is correctly typed as 'Blob' for readAsDataURL.
                        reader.readAsDataURL(file);
                    });
                    
                    newPending.push({
                        url: base64,
                        // FIX: Accessing .name property is now safe as 'file' is typed as 'File'.
                        description: file.name.split('.')[0], // Default description from filename
                        fileName: file.name
                    });
                } catch (err) {
                    // FIX: Accessing .name property is now safe in catch block error log.
                    console.error("Error processing file:", file.name, err);
                }
            }
            
            setPendingPhotos(prev => [...prev, ...newPending]);
            setIsProcessingFiles(false);
            // Reset input so the same files can be selected again if needed
            e.target.value = '';
        }
    };

    const removePendingPhoto = (index: number) => {
        setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const updatePendingDescription = (index: number, desc: string) => {
        setPendingPhotos(prev => {
            const next = [...prev];
            next[index].description = desc;
            return next;
        });
    };

    const handleSavePhotosBatch = async () => {
        if (pendingPhotos.length === 0) {
            setValidationError('Por favor, seleccione al menos una imagen.');
            return;
        }

        const uploadPromises = pendingPhotos.map((photo, index) => {
            return addItem('photos', {
                id: `photo-${Date.now()}-${index}`,
                url: photo.url,
                description: photo.description || `Foto ${index + 1}`,
                tags: globalTags,
                uploadDate: new Date().toISOString(),
            });
        });

        try {
            await Promise.all(uploadPromises);
            setIsUploadModalOpen(false);
            setPendingPhotos([]);
            setGlobalTags([]);
            setValidationError('');
        } catch (error) {
            setValidationError('Ocurrió un error al subir algunas fotos.');
            console.error(error);
        }
    };

    const handleUpdatePhoto = async () => {
        if (!editingPhoto.id) return;
        if (!editingPhoto.description) {
            setValidationError('La descripción es obligatoria.');
            return;
        }

        await updateItem('photos', editingPhoto.id, {
            description: editingPhoto.description,
            tags: editingPhoto.tags || [],
            url: editingPhoto.url
        });
        setIsEditModalOpen(false);
        setEditingPhoto({});
    };

    const handleDeleteClick = (e: React.MouseEvent, photo: Photo) => {
        e.stopPropagation();
        if (!canEdit) return;
        setDeleteConfirmation({
            isOpen: true,
            id: photo.id,
            name: photo.description
        });
    };

    const confirmDeletePhoto = async () => {
        if (deleteConfirmation.id) {
            await deleteItem('photos', deleteConfirmation.id);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };
    
    const handleViewPhoto = (photo: Photo) => {
        setSelectedPhoto(photo);
        setIsViewModalOpen(true);
    };

    const filteredPhotos = photos.filter(photo => 
        photo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    
    const linkedTasks = selectedPhoto ? tasks.filter(task => task.photoIds?.includes(selectedPhoto.id)) : [];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-3xl font-semibold text-black">Bitácora de Fotos</h2>
                <div className="w-full md:w-auto flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Buscar por descripción o etiqueta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 p-2 border rounded-md"
                    />
                    {canEdit && (
                        <button onClick={handleOpenUploadModal} className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Subir Fotos
                        </button>
                    )}
                </div>
            </div>

            <Card>
                {filteredPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredPhotos.map(photo => (
                            <div key={photo.id} className="relative group overflow-hidden rounded-lg cursor-pointer border hover:border-primary-500 transition-all shadow-sm" onClick={() => handleViewPhoto(photo)}>
                                <img src={photo.url} alt={photo.description} className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300" />
                                
                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-white text-xs truncate w-full">{photo.description}</p>
                                </div>

                                {canEdit && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(photo); }}
                                            className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-colors"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, photo)}
                                            className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-red-50 hover:text-red-600 shadow-sm transition-colors"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="mt-4 text-lg">No se encontraron fotos.</p>
                        {canEdit && <p>Sube algunas fotos para documentar tu obra.</p>}
                    </div>
                )}
            </Card>

            {/* Modal de Subida Múltiple */}
            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Subir Fotos (Lote)">
                <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors bg-gray-50">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            onChange={handleFilesChange} 
                            className="hidden" 
                            id="batch-file-input"
                        />
                        <label htmlFor="batch-file-input" className="cursor-pointer flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-sm font-medium text-black">Haz clic para seleccionar varias fotos</span>
                            <span className="text-xs text-gray-500 mt-1">Soporta PNG, JPG y JPEG</span>
                        </label>
                    </div>

                    {isProcessingFiles && (
                        <div className="text-center py-2">
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                            <span className="text-sm text-gray-600">Procesando imágenes...</span>
                        </div>
                    )}

                    {pendingPhotos.length > 0 && (
                        <div className="space-y-4">
                            <div className="bg-primary-50 p-3 rounded-md">
                                <label className="block text-sm font-semibold text-primary-900 mb-1">Etiquetas Globales (para todas estas fotos)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Cimentación, Area A, Inspección..." 
                                    value={globalTags.join(', ')}
                                    onChange={e => setGlobalTags(e.target.value.split(',').map(t=>t.trim()).filter(t=>t))}
                                    className="w-full p-2 border rounded-md bg-white text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <h4 className="text-sm font-bold text-black">Fotos a subir ({pendingPhotos.length})</h4>
                                {pendingPhotos.map((p, idx) => (
                                    <div key={idx} className="flex gap-3 p-2 border rounded-md bg-white items-center shadow-sm">
                                        <img src={p.url} alt="thumbnail" className="w-16 h-16 object-cover rounded border" />
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                value={p.description} 
                                                onChange={e => updatePendingDescription(idx, e.target.value)}
                                                className="w-full text-sm p-1 border-b focus:border-primary-500 outline-none"
                                                placeholder="Descripción de esta foto..."
                                            />
                                            <span className="text-[10px] text-gray-400 truncate block mt-1">{p.fileName}</span>
                                        </div>
                                        <button 
                                            onClick={() => removePendingPhoto(idx)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {validationError && <p className="text-red-600 text-sm font-medium">{validationError}</p>}
                    
                    <button 
                        onClick={handleSavePhotosBatch} 
                        disabled={pendingPhotos.length === 0 || isProcessingFiles}
                        className="w-full py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-bold disabled:bg-gray-400 shadow-md"
                    >
                        Subir {pendingPhotos.length} {pendingPhotos.length === 1 ? 'Foto' : 'Fotos'}
                    </button>
                </div>
            </Modal>

            {/* Modal de Edición Individual */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Detalles de Foto">
                <div className="space-y-4">
                    <img src={editingPhoto.url} alt="Edit preview" className="max-h-64 rounded-md mx-auto object-contain border" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <input type="text" placeholder="Descripción" value={editingPhoto.description || ''} onChange={e => {setEditingPhoto({...editingPhoto, description: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas (separadas por coma)</label>
                        <input type="text" placeholder="Etiquetas" value={editingPhoto.tags?.join(', ') || ''} onChange={e => setEditingPhoto({...editingPhoto, tags: e.target.value.split(',').map(t=>t.trim()).filter(t=>t)})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    </div>
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleUpdatePhoto} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-semibold shadow-md">Actualizar Cambios</button>
                </div>
            </Modal>

            {/* Modal de Vista Detallada */}
            {selectedPhoto && (
                 <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalles de la Foto">
                    <img src={selectedPhoto.url} alt={selectedPhoto.description} className="w-full max-h-[60vh] object-contain rounded-lg mb-4 bg-gray-900 shadow-inner"/>
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-black">{selectedPhoto.description}</h3>
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">ID: {selectedPhoto.id}</span>
                        </div>
                        <p className="text-sm text-gray-600">Capturada el: {new Date(selectedPhoto.uploadDate).toLocaleString()}</p>
                        {selectedPhoto.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedPhoto.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{tag}</span>
                                ))}
                            </div>
                        )}
                        {linkedTasks.length > 0 && (
                            <div className="pt-3 border-t">
                                <h4 className="font-semibold text-black flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 00-2 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Vinculado a Tareas:
                                </h4>
                                <ul className="list-disc list-inside mt-1 text-sm text-gray-700">
                                    {linkedTasks.map(task => (
                                        <li key={task.id} className="hover:text-primary-600 transition-colors">{task.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                 </Modal>
            )}

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeletePhoto}
                title="Eliminar Foto"
                message={`¿Estás seguro de que quieres eliminar la foto "${deleteConfirmation.name}"? Esta acción borrará la imagen permanentemente.`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default PhotoLog;
