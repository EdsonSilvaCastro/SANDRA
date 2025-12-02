
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
    const { activeProject, projects, switchProject, createProject, updateProject, deleteProject, activeProjectId, shareProject } = useProject();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectPin, setNewProjectPin] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});

    // Share State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [projectToShare, setProjectToShare] = useState<Project | null>(null);
    const [emailToShare, setEmailToShare] = useState('');
    const [shareMessage, setShareMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (newProjectName.trim()) {
            try {
                await createProject(newProjectName.trim(), newProjectPin.trim() || undefined);
                setNewProjectName('');
                setNewProjectPin('');
                setIsManageModalOpen(false);
            } catch (error: any) {
                setActionError("No se pudo crear el proyecto. Verifica tu conexión a Supabase.");
            }
        }
    };

    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit({ ...project });
        setIsManageModalOpen(false);
        setIsEditModalOpen(true);
        setActionError(null);
    };

    const handleUpdateProject = async () => {
        if (projectToEdit && projectToEdit.name.trim()) {
            try {
                await updateProject(projectToEdit.id, { name: projectToEdit.name.trim(), pin: projectToEdit.pin?.trim() || undefined });
                setIsEditModalOpen(false);
                setProjectToEdit(null);
            } catch (err) {
                alert("Error al actualizar el proyecto");
            }
        }
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

    const confirmDeleteProject = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteProject(deleteConfirmation.id);
            } catch (err) {
                alert("Error al eliminar el proyecto");
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    // Share Logic
    const handleShareClick = (project: Project) => {
        setProjectToShare(project);
        setIsManageModalOpen(false);
        setIsShareModalOpen(true);
        setEmailToShare('');
        setShareMessage(null);
    };

    const confirmShareProject = async () => {
        if (!projectToShare || !emailToShare) return;
        setShareMessage(null);
        try {
            await shareProject(projectToShare.id, emailToShare);
            setShareMessage({ type: 'success', text: `Proyecto compartido exitosamente con ${emailToShare}` });
            setEmailToShare('');
        } catch (error: any) {
            setShareMessage({ type: 'error', text: error.message });
        }
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

    const ShareIcon = () => (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
         </svg>
    );

    return (
        <>
            <div className="bg-white shadow-md p-4 flex justify-between items-center no-print sticky top-0 z-10">
                <div>
                     <span className="text-sm text-gray-500">Proyecto Actual:</span>
                    <h2 className="text-xl font-bold text-black">{activeProject?.name || 'Ningún proyecto seleccionado'}</h2>
                    {activeProject && activeProject.ownerId !== currentUser.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-1">Compartido contigo</span>
                    )}
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

            <Modal isOpen={isManageModalOpen} onClose={() => {setIsManageModalOpen(false); setActionError(null);}} title="Gestionar Proyectos">
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
                            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
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
                            {projects.length > 0 ? projects.map(project => {
                                const isOwner = project.ownerId === currentUser.id;
                                return (
                                <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {project.pin && <LockIcon />}
                                            <span className="font-medium text-black">{project.name}</span>
                                        </div>
                                        {!isOwner && <span className="text-xs text-blue-600">Compartido contigo</span>}
                                        {isOwner && project.collaboratorIds && project.collaboratorIds.length > 0 && (
                                            <span className="text-xs text-green-600">{project.collaboratorIds.length} colaborador(es)</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { switchProject(project.id); setIsManageModalOpen(false); }}
                                            disabled={project.id === activeProjectId}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {project.id === activeProjectId ? 'Activo' : 'Cambiar'}
                                        </button>
                                        
                                        {isOwner && (
                                            <>
                                                <button 
                                                    onClick={() => handleShareClick(project)} 
                                                    className="px-2 py-1 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center justify-center"
                                                    title="Compartir Proyecto"
                                                >
                                                    <ShareIcon />
                                                </button>
                                                <button onClick={() => handleOpenEditModal(project)} className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">Editar</button>
                                                <button
                                                    onClick={() => handleDeleteClick(project)}
                                                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                                                >
                                                    Eliminar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}) : <p className="text-center text-gray-500 p-4">No tienes proyectos. ¡Crea uno para empezar!</p>}
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

            {projectToShare && (
                <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={`Compartir Proyecto: ${projectToShare.name}`}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Introduce el correo electrónico del usuario con el que deseas compartir este proyecto. El usuario debe estar registrado en la aplicación.</p>
                        
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={emailToShare}
                            onChange={(e) => setEmailToShare(e.target.value)}
                            className="w-full p-2 border rounded bg-white text-black"
                        />

                        {shareMessage && (
                            <div className={`p-2 rounded text-sm ${shareMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {shareMessage.text}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsShareModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
                            <button onClick={confirmShareProject} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Compartir</button>
                        </div>

                        {projectToShare.collaboratorIds && projectToShare.collaboratorIds.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold mb-2">Colaboradores Actuales:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-700">
                                    {projectToShare.collaboratorIds.map(uid => (
                                        <li key={uid}>ID Usuario: {uid}</li> 
                                    ))}
                                </ul>
                                <p className="text-xs text-gray-400 mt-1">* Para gestionar o eliminar colaboradores, contacte al soporte (funcionalidad avanzada).</p>
                            </div>
                        )}
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
