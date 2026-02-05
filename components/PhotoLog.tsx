
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
    
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [globalTags, setGlobalTags] = useState<string[]>([]);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);

    const [editingPhoto, setEditingPhoto] = useState<Partial<Photo>>({});
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [validationError, setValidationError] = useState<string>('');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    // Función para comprimir imágenes antes de guardarlas
    const compressImage = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Comprimir a JPEG al 70% de calidad
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    };

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
            const files = Array.from(e.target.files) as File[];
            const newPending: PendingPhoto[] = [];
            
            for (const file of files) {
                try {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.onerror = (error) => reject(error);
                        reader.readAsDataURL(file);
                    });
                    
                    // Comprimir antes de añadir a la lista de pendientes para liberar memoria
                    const compressed = await compressImage(base64);

                    newPending.push({
                        url: compressed,
                        description: file.name.split('.')[0],
                        fileName: file.name
                    });
                } catch (err) {
                    console.error("Error procesando archivo:", file.name, err);
                }
            }
            
            setPendingPhotos(prev => [...prev, ...newPending]);
            setIsProcessingFiles(false);
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
            setValidationError('Selecciona al menos una imagen.');
            return;
        }

        setIsSaving(true);
        setSaveProgress(0);
        setValidationError('');

        try {
            for (let i = 0; i < pendingPhotos.length; i++) {
                const photo = pendingPhotos[i];
                await addItem('photos', {
                    url: photo.url,
                    description: photo.description || `Foto ${i + 1}`,
                    tags: globalTags,
                    uploadDate: new Date().toISOString(),
                });
                setSaveProgress(Math.round(((i + 1) / pendingPhotos.length) * 100));
            }

            setIsUploadModalOpen(false);
            setPendingPhotos([]);
            setGlobalTags([]);
        } catch (error: any) {
            setValidationError(error.message || 'Error al guardar las fotos. Posible falta de espacio.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePhoto = async () => {
        if (!editingPhoto.id) return;
        if (!editingPhoto.description) {
            setValidationError('La descripción es obligatoria.');
            return;
        }

        try {
            await updateItem('photos', editingPhoto.id, {
                description: editingPhoto.description,
                tags: editingPhoto.tags || [],
                url: editingPhoto.url
            });
            setIsEditModalOpen(false);
            setEditingPhoto({});
        } catch (e: any) {
            setValidationError(e.message || "Error al actualizar.");
        }
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
                        className="w-full md:w-64 p-2 border rounded-md bg-white text-black"
                    />
                    {canEdit && (
                        <button onClick={handleOpenUploadModal} className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm font-bold">
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
                                    <p className="text-white text-xs truncate w-full font-bold">{photo.description}</p>
                                </div>

                                {canEdit && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(photo); }}
                                            className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, photo)}
                                            className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-red-50 hover:text-red-600 shadow-sm transition-colors"
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
                        {canEdit && <p>Sube algunas fotos comprimidas para documentar tu obra.</p>}
                    </div>
                )}
            </Card>

            <Modal isOpen={isUploadModalOpen} onClose={() => !isSaving && setIsUploadModalOpen(false)} title="Subir y Comprimir Fotos">
                <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
                    {!isSaving && (
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
                                <span className="text-sm font-medium text-black font-bold">Seleccionar fotos para comprimir</span>
                                <span className="text-xs text-gray-500 mt-1">Se optimizarán automáticamente para ahorrar espacio</span>
                            </label>
                        </div>
                    )}

                    {isProcessingFiles && (
                        <div className="text-center py-2">
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                            <span className="text-sm text-gray-600 font-bold">Procesando y comprimiendo...</span>
                        </div>
                    )}

                    {isSaving && (
                        <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 text-center">
                            <p className="text-primary-800 font-bold mb-2">Guardando en bitácora... {saveProgress}%</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${saveProgress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {pendingPhotos.length > 0 && !isSaving && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {pendingPhotos.map((p, idx) => (
                                    <div key={idx} className="flex gap-3 p-2 border rounded-md bg-white items-center shadow-sm">
                                        <img src={p.url} alt="thumbnail" className="w-16 h-16 object-cover rounded border" />
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                value={p.description} 
                                                onChange={e => updatePendingDescription(idx, e.target.value)}
                                                className="w-full text-sm p-1 border-b focus:border-primary-500 outline-none text-black font-medium"
                                                placeholder="Descripción..."
                                            />
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

                    {validationError && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm font-bold">
                            {validationError}
                        </div>
                    )}
                    
                    {!isSaving && pendingPhotos.length > 0 && (
                        <button 
                            onClick={handleSavePhotosBatch} 
                            className="w-full py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-bold shadow-md"
                        >
                            Subir {pendingPhotos.length} Fotos Optimizadas
                        </button>
                    )}
                </div>
            </Modal>

            {selectedPhoto && (
                 <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalles de la Foto">
                    <img src={selectedPhoto.url} alt={selectedPhoto.description} className="w-full max-h-[60vh] object-contain rounded-lg mb-4 bg-gray-900 shadow-inner"/>
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-black">{selectedPhoto.description}</h3>
                        <p className="text-sm text-gray-600">Fecha: {new Date(selectedPhoto.uploadDate).toLocaleString()}</p>
                    </div>
                 </Modal>
            )}

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeletePhoto}
                title="Eliminar Foto"
                message={`¿Estás seguro de que quieres eliminar la foto "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default PhotoLog;
