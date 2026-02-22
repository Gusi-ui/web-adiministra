'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

interface EnsureWorkerAuthInput {
  email: string;
  name: string;
  password: string;
}

export interface EnsureWorkerAuthResult {
  success: boolean;
  message: string;
}

/**
 * Crea o actualiza una cuenta de Supabase Auth para una trabajadora con rol 'worker'.
 * - Si no existe, la crea confirmada y asigna contraseña fija.
 * - Si existe, actualiza su contraseña y user_metadata.
 * - Garantiza registro en tabla `auth_users` con role 'worker'.
 */
export const ensureWorkerAuthAccount = async (
  input: EnsureWorkerAuthInput
): Promise<EnsureWorkerAuthResult> => {
  const email = input.email.trim();
  const password = input.password;
  const name = input.name.trim();

  if (email === '' || password.length < 6) {
    return {
      success: false,
      message: 'Email o contraseña inválidos (mín. 6 caracteres).',
    };
  }

  // Estrategia robusta: buscar por email; si existe, actualizar; si no, crear

  let authUserId: string | null;

  // Buscar por email (primera página)
  const { data: listData, error: listErr } =
    await supabaseAdmin.auth.admin.listUsers();
  if (listErr !== null) {
    return {
      success: false,
      message: `Error listando usuarios: ${listErr.message}`,
    };
  }
  const found = listData.users.find(
    u => (u.email?.toLowerCase() ?? '') === email.toLowerCase()
  );

  if (found !== undefined) {
    authUserId = found.id;
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        password,
        user_metadata: { ...found.user_metadata, role: 'worker', name },
      }
    );
    if (updErr !== null) {
      return {
        success: false,
        message: `Error actualizando usuario: ${updErr.message}`,
      };
    }
  } else {
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'worker', name },
      });
    if (createErr !== null) {
      return {
        success: false,
        message: `Error creando usuario: ${createErr.message}`,
      };
    }
    authUserId = created?.user?.id ?? null;
  }

  if (authUserId === null) {
    return {
      success: false,
      message: 'No se pudo determinar el ID del usuario.',
    };
  }

  // 3) Asegurar registro en auth_users (upsert simple por id)
  // Type assertion necesaria para tabla auth_users de Supabase
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { error: upsertErr } = await supabaseAdmin
    .from('auth_users' as any)
    .upsert({ id: authUserId, email, role: 'worker' } as any, {
      onConflict: 'id',
    });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (upsertErr !== null) {
    return {
      success: false,
      message: `Error registrando en auth_users: ${upsertErr.message}`,
    };
  }

  return {
    success: true,
    message: 'Acceso de trabajadora configurado correctamente.',
  };
};

export const resetWorkerPasswordByEmail = async (
  email: string,
  newPassword: string
): Promise<EnsureWorkerAuthResult> => {
  const mail = email.trim();
  if (mail === '' || newPassword.length < 6) {
    return {
      success: false,
      message: 'Email o contraseña inválidos (mín. 6 caracteres).',
    };
  }
  const { data: listData, error: listErr } =
    await supabaseAdmin.auth.admin.listUsers();
  if (listErr !== null) {
    return {
      success: false,
      message: `Error listando usuarios: ${listErr.message}`,
    };
  }
  const found = listData.users.find(
    u => (u.email?.toLowerCase() ?? '') === mail.toLowerCase()
  );
  if (found === undefined) {
    return { success: false, message: 'Usuario no encontrado por email.' };
  }
  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
    found.id,
    {
      password: newPassword,
    }
  );
  if (updErr !== null) {
    return {
      success: false,
      message: `Error actualizando contraseña: ${updErr.message}`,
    };
  }
  return { success: true, message: 'Contraseña actualizada.' };
};
