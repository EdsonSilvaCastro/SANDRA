
import React, { useState } from 'react';
import { User } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import ConfirmModal from './ui/ConfirmModal';
import { useProject } from '../contexts/ProjectContext';

const UserManagement: React.FC = () => {
    const { allUsers, addUser, updateUser, deleteUser } = useProject();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null, name: string}>({isOpen: false, id: null, name: ''});
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenModal = (user?: User) => {
        setValidationError('');
        if (user) {
            setCurrentUser(user);
            setIsEditing(true);
        } else {
            setCurrentUser({
                role: 'user', 
                name: '',
                email: '',
                password: ''
            });
            setIsEditing(false);
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
        try {
            if (isEditing) {
                await updateUser(currentUser.id!, currentUser);
            } else {
                // Check duplicate logic handled by DB constraint usually, but locally:
                if (allUsers.some(u => u.email === currentUser.email)) {
                    setValidationError('Ya existe un usuario con este correo electrónico.');
                    setIsSaving(false);
                    return;
                }
                const newUser = { ...currentUser, id: `user-${Date.now()}` } as User;
                await addUser(newUser);
            }
            setIsModalOpen(false);
        } catch (error) {
            setValidationError('Error al guardar el usuario.');
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
            await deleteUser(deleteConfirmation.id);
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
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Rol</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{user.name}</td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'user' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Editor' : 'Visualizador'}
                                        </span>
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
                            <option value="user">Editor (Gestión de Proyecto, sin CRM/Usuarios)</option>
                            <option value="viewer">Visualizador (Solo Lectura)</option>
                        </select>
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
