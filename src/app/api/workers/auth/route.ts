import { NextResponse } from 'next/server';

import { ensureWorkerAuthAccount } from '@/lib/worker-auth';

// Función auxiliar para validar email sin riesgo de ReDoS
// Usa un enfoque simple de indexOf para evitar regex complejas
function isValidEmail(input: string): boolean {
  // Verificación básica de estructura sin regex complejo
  const atIndex = input.indexOf('@');
  if (atIndex <= 0 || atIndex === input.length - 1) return false;

  const dotIndex = input.lastIndexOf('.');
  if (dotIndex <= atIndex + 1 || dotIndex === input.length - 1) return false;

  // Validar longitud total
  if (input.length > 254) return false;

  // Verificar caracteres permitidos de forma segura
  const allowedChars = /^[a-zA-Z0-9._%+@-]+$/;
  return allowedChars.test(input);
}

// Función auxiliar para sanitizar strings de forma segura
function sanitizeString(value: unknown): string | null {
  // Verificación explícita de tipo
  if (typeof value !== 'string') return null;

  // Convertir a string primitivo explícitamente
  const str = String(value).trim();

  // Retornar null si está vacío después de trim
  if (str.length === 0) return null;

  return str;
}

const POST = async (req: Request): Promise<Response> => {
  try {
    // Parse del body con manejo de errores
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Formato JSON inválido' },
        { status: 400 }
      );
    }

    // Validación explícita de que body es un objeto
    const isValidObject =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      Object.prototype.toString.call(body) === '[object Object]';

    if (!isValidObject) {
      return NextResponse.json(
        { success: false, message: 'Formato de datos inválido' },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    // Sanitizar y validar cada campo de forma independiente
    const email = sanitizeString(bodyObj.email);
    const name = sanitizeString(bodyObj.name);
    const rawPassword = bodyObj.password;

    // Validar que todos los campos estén presentes
    if (email === null || name === null || typeof rawPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Campos requeridos faltantes o inválidos' },
        { status: 400 }
      );
    }

    // Validaciones de longitud con constantes
    const EMAIL_MAX_LENGTH = 254;
    const NAME_MIN_LENGTH = 2;
    const NAME_MAX_LENGTH = 100;
    const PASSWORD_MIN_LENGTH = 6;
    const PASSWORD_MAX_LENGTH = 128;

    // Validar email usando función segura sin ReDoS
    const emailLength = email.length;
    const isEmailValid =
      emailLength > 0 && emailLength <= EMAIL_MAX_LENGTH && isValidEmail(email);

    if (!isEmailValid) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar nombre con longitudes explícitas
    const nameLength = name.length;
    const isNameValid =
      nameLength >= NAME_MIN_LENGTH && nameLength <= NAME_MAX_LENGTH;

    if (!isNameValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nombre debe tener entre 2 y 100 caracteres',
        },
        { status: 400 }
      );
    }

    // Validar contraseña (no se hace trim en passwords)
    const passwordLength = rawPassword.length;
    const isPasswordValid =
      passwordLength >= PASSWORD_MIN_LENGTH &&
      passwordLength <= PASSWORD_MAX_LENGTH;

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contraseña debe tener entre 6 y 128 caracteres',
        },
        { status: 400 }
      );
    }

    // Todos los valores están sanitizados y validados
    const result = await ensureWorkerAuthAccount({
      email,
      name,
      password: rawPassword,
    });

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
};

export { POST };
