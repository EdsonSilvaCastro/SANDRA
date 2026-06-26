
import React, { useState } from 'react';
import { User } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';
import { isConfigured } from '../lib/supabaseClient';

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const UserManagement: React.FC = () => {
    const { allUsers, addUser, updateUser, deleteUser, projects, updateProject } = useProject();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenModal = (user?: User) => {
        setValidationError('');
        if (user) {
            setCurrentUser({ ...user });
            setIsEditing(true);
            const initialProjectIds = projects
                .filter(p => p.collaboratorIds && p.collaboratorIds.includes(user.id))
                .map(p => p.id);
            setAssignedProjectIds(initialProjectIds);
        } else {
            setCurrentUser({
                id: isConfigured ? generateUUID() : `user-${Date.now()}`,
                role: 'user', 
                name: '',
                email: '',
                password: ''
            });
            setIsEditing(false);
            setAssignedProjectIds([]);
        }
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!currentUser.name || !currentUser.email || !currentUser.role) {
            setValidationError('Nombre, Email y Rol son obligatorios.');
            return;
        }
        if (!isEditing && !currentUser.password) {
             setValidationError('La contraseña es obligatoria para nuevos usuarios.');
             return;
         }

        setIsSaving(true);
        setValidationError('');
        
        try {
            let finalUserId = currentUser.id;
            if (isConfigured && (!finalUserId || finalUserId.startsWith('user-'))) {
                finalUserId = generateUUID();
                currentUser.id = finalUserId;
            } else if (!finalUserId) {
                finalUserId = `user-${Date.now()}`;
            }
            
            if (isEditing) {
                await updateUser(currentUser.id!, currentUser);
            } else {
                if (allUsers.some(u => u.email === currentUser.email)) {
                    setValidationError('Ya existe un usuario con este correo electrónico.');
                    setIsSaving(false);
                    return;
                }
                const newUser = { ...currentUser, id: finalUserId } as User;
                await addUser(newUser);
            }

            // Actualizar asignaciones de proyecto (collaboratorIds) para el usuario
            for (const project of projects) {
                const isCurrentlyCollaborator = project.collaboratorIds && project.collaboratorIds.includes(finalUserId);
                const shouldBeCollaborator = assignedProjectIds.includes(project.id);
                
                if (shouldBeCollaborator && !isCurrentlyCollaborator) {
                    const newCollaborators = [...(project.collaboratorIds || []), finalUserId];
                    await updateProject(project.id, { collaboratorIds: newCollaborators });
                } else if (!shouldBeCollaborator && isCurrentlyCollaborator) {
                    const newCollaborators = (project.collaboratorIds || []).filter(id => id !== finalUserId);
                    await updateProject(project.id, { collaboratorIds: newCollaborators });
                }
            }

            setIsModalOpen(false);
        } catch (error: any) {
            setValidationError(`Error al guardar el usuario: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        if (user.email === 'admin@constructpro.com') {
            alert('No se puede eliminar al administrador principal.');
            return;
        }
        setDeleteConfirmation({ isOpen: true, id: user.id, name: user.name });
    };

    const confirmDeleteUser = async () => {
        if (deleteConfirmation.id) {
            try {
                await deleteUser(deleteConfirmation.id);
                
                // Desvincular de todos los proyectos tras eliminarlo
                for (const project of projects) {
                    if (project.collaboratorIds && project.collaboratorIds.includes(deleteConfirmation.id)) {
                        const newCollaborators = project.collaboratorIds.filter(id => id !== deleteConfirmation.id);
                        await updateProject(project.id, { collaboratorIds: newCollaborators });
                    }
                }
            } catch (error: any) {
                alert(`Error al eliminar usuario: ${error.message}`);
            }
        }
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-black">Gestión de Usuarios y Roles</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    Añadir Usuario
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50 text-sm font-bold text-gray-700">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Rol</th>
                                <th className="p-3">Proyectos Con Permiso</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50 text-sm">
                                    <td className="p-3 font-medium text-black">{user.name}</td>
                                    <td className="p-3 text-slate-650">{user.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'user' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Editor' : 'Visualizador'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                                            {projects.filter(p => p.collaboratorIds && p.collaboratorIds.includes(user.id)).map(p => (
                                                <span key={p.id} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-bold max-w-[130px] truncate" title={p.name}>
                                                    {p.name}
                                                </span>
                                            ))}
                                            {projects.filter(p => p.collaboratorIds && p.collaboratorIds.includes(user.id)).length === 0 && (
                                                <span className="text-xs text-gray-400 italic">
                                                    {user.role === 'admin' ? 'Todos (Acceso Total)' : 'Ningún proyecto asignado'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(user)} className="text-black hover:text-gray-600 font-medium">Editar</button>
                                        {user.email !== 'admin@constructpro.com' && (
                                            <button onClick={() => handleDeleteClick(user)} className="ml-4 text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}>
                <div className="space-y-4">
                    <input type="text" placeholder="Nombre Completo" value={currentUser.name || ''} onChange={e => setCurrentUser({...currentUser, name: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    <input type="email" placeholder="Correo Electrónico" value={currentUser.email || ''} onChange={e => setCurrentUser({...currentUser, email: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    {!isEditing && (
                        <input type="password" placeholder="Contraseña" value={currentUser.password || ''} onChange={e => setCurrentUser({...currentUser, password: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                    )}
                    {isEditing && (
                        <div>
                            <label className="text-xs text-gray-500">Dejar en blanco para mantener la actual</label>
                            <input type="password" placeholder="Nueva Contraseña (Opcional)" value={currentUser.password || ''} onChange={e => setCurrentUser({...currentUser, password: e.target.value})} className="w-full p-2 border rounded bg-white text-black" />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-black">Rol</label>
                        <select value={currentUser.role || 'user'} onChange={e => setCurrentUser({...currentUser, role: e.target.value as any})} className="w-full p-2 border rounded bg-white text-black">
                            <option value="admin">Administrador (Acceso Total)</option>
                            <option value="user">Editor (Gestión de Proyecto)</option>
                            <option value="viewer">Visualizador (Solo Lectura)</option>
                        </select>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Proyectos Asignados</label>
                        <p className="text-[11px] text-gray-400">Asigna los proyectos a los que este usuario tendría acceso.</p>
                        <div className="max-h-40 overflow-y-auto border rounded p-2 bg-slate-50 space-y-1.5">
                            {projects.map(project => {
                                const isChecked = assignedProjectIds.includes(project.id);
                                return (
                                    <label key={project.id} className="flex items-center gap-2 text-xs text-black cursor-pointer font-medium p-1 hover:bg-white rounded transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setAssignedProjectIds([...assignedProjectIds, project.id]);
                                                } else {
                                                    setAssignedProjectIds(assignedProjectIds.filter(id => id !== project.id));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="truncate">{project.name}</span>
                                    </label>
                                );
                            })}
                            {projects.length === 0 && (
                                <p className="text-xs text-gray-400 italic">No hay proyectos disponibles.</p>
                            )}
                        </div>
                    </div>

                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                    <button onClick={handleSaveUser} disabled={isSaving} className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-400">
                        {isSaving ? 'Guardando...' : 'Guardar Usuario'}
                    </button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                onConfirm={confirmDeleteUser}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que quieres eliminar a "${deleteConfirmation.name}"?`}
                confirmText="Eliminar"
                isDangerous={true}
            />
        </div>
    );
};

export default UserManagement;
