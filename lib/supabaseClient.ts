
import { createClient } from '@supabase/supabase-js';

// Helper para obtener variables de entorno de manera segura (Soporte para Vite y standard process.env)
const getEnv = (key: string, viteKey: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    // @ts-ignore
    return import.meta.env[viteKey];
  }
  return '';
};

const envUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const envKey = getEnv('SUPABASE_KEY', 'VITE_SUPABASE_KEY');

export const isConfigured = !!envUrl && !!envKey;

if (!isConfigured) {
    console.warn('Supabase URL o Key no encontradas. La aplicación se está ejecutando sin conexión a base de datos. Las operaciones fallarán.');
}

export const supabase = createClient(
    envUrl || 'https://placeholder-project.supabase.co', 
    envKey || 'placeholder-key'
);

// Instrucciones para el usuario:
// 1. Crea un proyecto en Supabase.
// 2. Ve al editor SQL y ejecuta el script SQL proporcionado en los comentarios anteriores o documentación.
