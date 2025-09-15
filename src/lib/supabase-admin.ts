// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

// ¡ATENCIÓN! Este cliente utiliza la service_role key y DEBE usarse solo en el servidor.
// Tiene permisos para saltarse las políticas de RLS.
// Asegúrate de que las variables de entorno estén configuradas en tu Vercel/servidor.

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const supabaseServiceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

// Validar variables solo cuando realmente se necesiten en producción
// No durante el build time estático de Next.js
const isActualProduction =
  process.env.NODE_ENV === 'production' &&
  process.env['VERCEL'] === '1' && // Solo en Vercel deployment
  (!supabaseUrl || !supabaseServiceRoleKey);

if (isActualProduction) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing Supabase environment variables in production deployment'
  );
}

// En desarrollo o CI/CD, usar valores por defecto si no están las variables
const finalSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalSupabaseKey = supabaseServiceRoleKey || 'placeholder-key';

export const supabaseAdmin = createClient<Database>(
  finalSupabaseUrl,
  finalSupabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
