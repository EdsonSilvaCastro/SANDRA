
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialPhotos, initialTasks } from '../constants';
import { Photo, Task } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { useProject } from '../contexts/ProjectContext';

const PhotoLog: React.FC = () => {
    const { activeProjectId } = useProject();
    const [photos, setPhotos] = useLocalStorage<Photo[]>(`constructpro_project_${activeProjectId}_photos`, initialPhotos);
    const [tasks] = useLocalStorage<Task[]>(`constructpro_project_${activeProjectId}_tasks`, initialTasks);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [newPhoto, setNewPhoto] = useState<Partial<Photo>>({ tags: [] });
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [validationError, setValidationError] = useState<string>('');

    const handleOpenUploadModal = () => {
        setValidationError('');
        setNewPhoto({ tags: [] });
        setIsUploadModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setNewPhoto(prev => ({ ...prev, url: event.target?.result as string }));
                setValidationError('');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSavePhoto = () => {
        if (!newPhoto.url) {
            setValidationError('Por favor, seleccione una imagen para subir.');
            return;
        }
        if (!newPhoto.description) {
             setValidationError('Por favor, ingrese una descripción para la foto.');
             return;
        }

        if (newPhoto.url && newPhoto.description) {
            const photoToSave: Photo = {
                id: `photo-${Date.now()}`,
                url: newPhoto.url,
                description: newPhoto.description,
                tags: newPhoto.tags || [],
                uploadDate: new Date().toISOString(),
            };
            setPhotos([...photos, photoToSave]);
            setIsUploadModalOpen(false);
            setNewPhoto({ tags: [] });
            setValidationError('');
        }
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
                    <button onClick={handleOpenUploadModal} className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                        Subir Foto
                    </button>
                </div>
            </div>

            <Card>
                {filteredPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredPhotos.map(photo => (
                            <div key={photo.id} className="relative group overflow-hidden rounded-lg cursor-pointer" onClick={() => handleViewPhoto(photo)}>
                                <img src={photo.url} alt={photo.description} className="w-full h-48 object-cover transform group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-black text-sm truncate">{photo.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="mt-4 text-lg">No se encontraron fotos.</p>
                        <p>Sube una foto para comenzar.</p>
                    </div>
                )}
            </Card>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Subir Nueva Foto">
                <div className="space-y-4">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full p-2 border rounded bg-white text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                    {newPhoto.url && <img src={newPhoto.url} alt="Preview" className="max-h-48 rounded-md mx-auto" />}
                    <input type="text" placeholder="Descripción" value={newPhoto.description || ''} onChange={e => {setNewPhoto({...newPhoto, description: e.target.value}); setValidationError('');}} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    <input type="text" placeholder="Etiquetas (separadas por coma)" onChange={e => setNewPhoto({...newPhoto, tags: e.target.value.split(',').map(t=>t.trim())})} className="w-full p-2 border rounded bg-white text-black placeholder-gray-500" />
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSavePhoto} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar Foto</button>
                </div>
            </Modal>

            {selectedPhoto && (
                 <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalles de la Foto">
                    <img src={selectedPhoto.url} alt={selectedPhoto.description} className="w-full max-h-80 object-contain rounded-lg mb-4"/>
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-black">{selectedPhoto.description}</h3>
                        <p className="text-sm text-black">Subido el: {new Date(selectedPhoto.uploadDate).toLocaleString()}</p>
                        {selectedPhoto.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedPhoto.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-blue-100 text-black text-xs font-semibold rounded-full">{tag}</span>
                                ))}
                            </div>
                        )}
                        {linkedTasks.length > 0 && (
                            <div className="pt-3 border-t">
                                <h4 className="font-semibold text-black">Vinculado a Tareas:</h4>
                                <ul className="list-disc list-inside mt-1 text-black">
                                    {linkedTasks.map(task => (
                                        <li key={task.id}>{task.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                 </Modal>
            )}
        </div>
    );
};

export default PhotoLog;
