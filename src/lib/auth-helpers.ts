import { supabase } from './database';

export async function getWorkerFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  console.log('🔍 Auth header:', authHeader ? 'Presente' : 'Ausente');
  console.log('🔑 Token extraído:', token ? 'Token presente' : 'No token');

  if (!token) {
    throw new Error('Token no proporcionado');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('🚨 Error de token:', error);
    throw new Error('Token inválido');
  }

  if (!user.email) {
    throw new Error('Usuario sin email');
  }

  console.log('👤 Usuario autenticado:', user.email);

  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('*')
    .eq('email', user.email)
    .single();

  console.log('🔍 Búsqueda de worker:', {
    email: user.email,
    found: !!worker,
    error: workerError,
  });

  if (workerError || !worker) {
    console.log(
      '🔧 Worker no existe, creando automáticamente para:',
      user.email
    );

    // Crear worker automáticamente
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
      console.error('🚨 Error creando worker:', createError);
      throw new Error('Error creando worker');
    }

    console.log('✅ Worker creado exitosamente:', newWorker.id);
    return newWorker;
  }

  return worker;
}
