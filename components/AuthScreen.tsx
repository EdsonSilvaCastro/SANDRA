
import React, { useState, FormEvent, useEffect } from 'react';
import { User } from '../types';
import Card from './ui/Card';
import useLocalStorage from '../hooks/useLocalStorage';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Usuario por defecto para garantizar el acceso
  const defaultUser: User = { 
      id: 'admin-user', 
      name: 'Administrador', 
      email: 'admin@constructpro.com', 
      password: 'admin',
      role: 'admin'
  };

  // Inicializar usuarios con el usuario por defecto si localStorage está vacío (o si la clave no existe)
  const [users, setUsers] = useLocalStorage<User[]>('constructpro_users', [defaultUser]);

  // Efecto para asegurar que el usuario por defecto exista si la lista está vacía (ej. si se limpió el storage)
  useEffect(() => {
    if (users.length === 0) {
        setUsers([defaultUser]);
    }
  }, [users.length, setUsers]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Buscar usuario en la lista (incluyendo el por defecto)
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Correo electrónico o contraseña incorrectos.');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <Card title="Iniciar Sesión" className="w-full max-w-sm shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border rounded-md shadow-sm bg-white text-black focus:ring-primary-500 focus:border-primary-500"
              required
              placeholder="ej. admin@constructpro.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border rounded-md shadow-sm bg-white text-black focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {error && <p className="text-center text-sm text-red-600 font-medium">{error}</p>}
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-colors shadow-md"
          >
            Entrar
          </button>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
              <p className="font-bold mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Credenciales por defecto:
              </p>
              <div className="grid grid-cols-[auto,1fr] gap-x-2">
                <span className="font-semibold">Email:</span> <span>admin@constructpro.com</span>
                <span className="font-semibold">Clave:</span> <span>admin</span>
              </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AuthScreen;
