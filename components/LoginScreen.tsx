import React, { useState, FormEvent } from 'react';
import { Project } from '../contexts/ProjectContext';
import Card from './ui/Card';

interface LoginScreenProps {
  project: Project;
  onUnlock: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ project, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin === project.pin) {
      onUnlock();
    } else {
      setError('PIN incorrecto. Inténtelo de nuevo.');
      setPin('');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <Card title={`Acceso al Proyecto: ${project.name}`} className="w-full max-w-sm shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pin" className="block text-center text-sm font-medium text-black mb-2">
              Introduzca el PIN de 4 dígitos
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => {
                setError('');
                if (/^\d{0,4}$/.test(e.target.value)) {
                  setPin(e.target.value);
                }
              }}
              maxLength={4}
              className="mt-1 block w-full p-3 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-center text-3xl tracking-[1.5em] bg-white text-black"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Desbloquear
          </button>
        </form>
      </Card>
    </div>
  );
};

export default LoginScreen;
