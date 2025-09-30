import { supabase } from './database';

export async function getWorkerFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Validación de token
  if (!token) {
    throw new Error('Token no proporcionado');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Token inválido');
  }

  if (!user.email) {
    throw new Error('Usuario sin email');
  }

  // Buscar worker existente
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (workerError || !worker) {
    // Crear worker automáticamente si no existe
    const { data: newWorker, error: createError } = await supabase
      .from('workers')
      .insert({
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'worker',
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newWorker) {
      throw new Error('Error creando worker');
    }

    return newWorker;
  }

  return worker;
}
