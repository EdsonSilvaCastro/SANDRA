import React, { useState, useEffect } from 'react';
import { useProject, Project } from '../contexts/ProjectContext';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { User } from '../types';

interface ProjectHeaderProps {
    onLogout: () => void;
    currentUser: User;
    isManageModalOpen: boolean;
    setIsManageModalOpen: (isOpen: boolean) => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ onLogout, currentUser, isManageModalOpen, setIsManageModalOpen }) => {
    const { activeProject, projects, switchProject, createProject, updateProject, deleteProject, activeProjectId } = useProject();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectPin, setNewProjectPin] = useState('');
    
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            createProject(newProjectName.trim(), newProjectPin.trim() || undefined);
            setNewProjectName('');
            setNewProjectPin('');
        }
    };

    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit({ ...project });
        setIsManageModalOpen(false);
        setIsEditModalOpen(true);
    };

    const handleUpdateProject = () => {
        if (projectToEdit && projectToEdit.name.trim()) {
            updateProject(projectToEdit.id, { name: projectToEdit.name.trim(), pin: projectToEdit.pin?.trim() || undefined });
        }
        setIsEditModalOpen(false);
        setProjectToEdit(null);
    };

    const handleSaveChanges = () => {
        setShowSaveConfirmation(true);
    };
    
    const handleDeleteClick = (project: Project) => {
        setDeleteConfirmation({
            isOpen: true,
            id: project.id,
            name: project.name
        });
    };

    const confirmDeleteProject = () => {
        if (deleteConfirmation.id) {
            deleteProject(deleteConfirmation.id);
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    useEffect(() => {
        if (showSaveConfirmation) {
            const timer = setTimeout(() => {
                setShowSaveConfirmation(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSaveConfirmation]);
    
    const LockIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
    );

    return (
        <>
            <div className="bg-white shadow-md p-4 flex justify-between items-center no-print sticky top-0 z-10">
                <div>
                     <span className="text-sm text-gray-500">Proyecto Actual:</span>
                    <h2 className="text-xl font-bold text-black">{activeProject?.name || 'Ningún proyecto seleccionado'}</h2>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-right">
                        <span className="text-sm font-medium text-black">{currentUser.name}</span>
                        <button onClick={onLogout} className="text-xs text-blue-600 hover:text-blue-800 ml-2 font-semibold">Cerrar Sesión</button>
                    </div>
                     {showSaveConfirmation && (
                        <div className="text-green-700 font-semibold bg-green-100 px-3 py-2 rounded-md transition-opacity duration-300">
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                ¡Proyecto guardado con éxito!
                            </span>
                        </div>
                    )}
                    <button 
                        onClick={handleSaveChanges}
                        title="Los cambios se guardan automáticamente. Este botón confirma que todo está guardado."
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                        Guardar Cambios
                    </button>
                    <button 
                        onClick={() => setIsManageModalOpen(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                        Gestionar Proyectos
                    </button>
                </div>
            </div>

            <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Gestionar Proyectos">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Crear Nuevo Proyecto</h3>
                        <form onSubmit={handleCreateProject} className="space-y-3">
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Nombre del nuevo proyecto"
                                className="w-full p-2 border rounded bg-white text-black placeholder-gray-500"
                                required
                            />
                            <input
                                type="password"
                                value={newProjectPin}
                                onChange={(e) => /^\d{0,4}$/.test(e.target.value) && setNewProjectPin(e.target.value)}
                                placeholder="PIN de 4 dígitos (opcional)"
                                maxLength={4}
                                className="w-full p-2 border rounded bg-white text-black placeholder-gray-500"
                            />
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                Crear Proyecto
                            </button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Mis Proyectos</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md">
                            {projects.length > 0 ? projects.map(project => (
                                <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        {project.pin && <LockIcon />}
                                        <span className="font-medium text-black">{project.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { switchProject(project.id); setIsManageModalOpen(false); }}
                                            disabled={project.id === activeProjectId}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {project.id === activeProjectId ? 'Activo' : 'Cambiar'}
                                        </button>
                                         <button onClick={() => handleOpenEditModal(project)} className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">Editar</button>
                                         <button
                                            onClick={() => handleDeleteClick(project)}
                                            className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 p-4">No tienes proyectos. ¡Crea uno para empezar!</p>}
                        </div>
                    </div>
                </div>
            </Modal>

            {projectToEdit && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Proyecto">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-black">Nombre del Proyecto</label>
                            <input
                                type="text"
                                value={projectToEdit.name}
                                onChange={(e) => setProjectToEdit({...projectToEdit, name: e.target.value})}
                                className="w-full p-2 border rounded bg-white text-black"
                            />
                        </div>
                        <div>
                             <label className="text-sm font-medium text-black">PIN de 4 dígitos (dejar en blanco para eliminar)</label>
                            <input
                                type="password"
                                value={projectToEdit.pin || ''}
                                onChange={(e) => /^\d{0,4}$/.test(e.target.value) && setProjectToEdit({...projectToEdit, pin: e.target.value})}
                                maxLength={4}
                                className="w-full p-2 border rounded bg-white text-black"
                            />
                        </div>
                        <button onClick={handleUpdateProject} className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Guardar Cambios</button>
                    </div>
                </Modal>
            )}

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteProject}
                title="Eliminar Proyecto"
                message={`¿Estás seguro de que quieres eliminar el proyecto "${deleteConfirmation.name}"? Esta acción es irreversible y borrará todos sus datos.`}
                confirmText="Eliminar Proyecto"
                isDangerous={true}
            />
        </>
    );
};

export default ProjectHeader;