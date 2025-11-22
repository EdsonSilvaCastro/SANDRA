
import React, { useState, FormEvent, useEffect } from 'react';
import { User } from '../types';
import Card from './ui/Card';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Consulta directa a la tabla 'users' (Simulando auth personalizada sobre tabla)
        const { data, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) // En producción, usar auth real o hashing
            .single();

        if (dbError || !data) {
            // Fallback para el primer inicio si no hay usuarios en DB
            if (email === 'admin@constructpro.com' && password === 'admin') {
                // Comprobar si existe
                const { data: checkAdmin } = await supabase.from('users').select('*').eq('email', 'admin@constructpro.com').single();
                if (!checkAdmin) {
                     // Crear admin por defecto
                     const defaultUser = {
                         id: 'admin-user',
                         name: 'Administrador',
                         email: 'admin@constructpro.com',
                         password: 'admin',
                         role: 'admin'
                     };
                     await supabase.from('users').insert(defaultUser);
                     onLogin(defaultUser as User);
                     return;
                }
            }
            setError('Correo electrónico o contraseña incorrectos.');
        } else {
            onLogin(data as User);
        }

    } catch (err) {
        setError('Error de conexión al servidor.');
        console.error(err);
    } finally {
        setLoading(false);
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
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-colors shadow-md disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
              <p className="font-bold mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Credenciales por defecto (Si es primer uso):
              </p>
              <div className="grid grid-cols-[auto,1fr] gap-x-2">
                <span className="font-semibold">Email:</span> <span>admin@constructpro.com</span>
                <span className="font-semibold">Clave:</span> <span>admin</span>
              </div>
              <p className="mt-2 text-xs text-gray-500 italic">Asegúrate de configurar la conexión a Supabase primero.</p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AuthScreen;
