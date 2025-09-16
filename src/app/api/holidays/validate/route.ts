import { createClient } from '@supabase/supabase-js';

import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

// Solo crear el cliente si las variables están disponibles
const createSupabaseClient = () => {
  if (
    supabaseUrl === undefined ||
    supabaseUrl === null ||
    supabaseUrl === '' ||
    supabaseKey === undefined ||
    supabaseKey === null ||
    supabaseKey === ''
  ) {
    // Durante el build, usar valores placeholder para evitar errores
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  return createClient(supabaseUrl, supabaseKey);
};

interface Holiday {
  id: string;
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
  created_at: string;
  updated_at: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalHolidays: number;
    nationalHolidays: number;
    regionalHolidays: number;
    localHolidays: number;
    monthsWithHolidays: number[];
  };
}

// Función para validar y convertir datos de Supabase
const validateHolidayData = (data: unknown): Holiday[] | null => {
  if (!Array.isArray(data)) return null;

  const isValidHoliday = (item: unknown): item is Holiday => {
    if (typeof item !== 'object' || item === null) return false;
    const holiday = item as Record<string, unknown>;

    return (
      typeof holiday['id'] === 'string' &&
      typeof holiday['day'] === 'number' &&
      typeof holiday['month'] === 'number' &&
      typeof holiday['year'] === 'number' &&
      typeof holiday['name'] === 'string' &&
      typeof holiday['type'] === 'string' &&
      typeof holiday['created_at'] === 'string' &&
      typeof holiday['updated_at'] === 'string' &&
      ['national', 'regional', 'local'].includes(holiday['type'])
    );
  };

  return data.every(isValidHoliday) ? data : null;
};

const validateHolidaysIntegrity = (
  holidays: Holiday[],
  year: number
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const summary = {
    totalHolidays: holidays.length,
    nationalHolidays: 0,
    regionalHolidays: 0,
    localHolidays: 0,
    monthsWithHolidays: [] as number[],
  };

  if (holidays.length === 0) {
    errors.push(`No hay festivos registrados para el año ${year}`);
    return { isValid: false, errors, warnings, summary };
  }

  const dateKeys = new Set<string>();
  for (const holiday of holidays) {
    const dateKey = `${holiday.year}-${holiday.month}-${holiday.day}`;
    if (dateKeys.has(dateKey)) {
      const dayStr = String(holiday.day);
      const monthStr = String(holiday.month);
      const yearStr = String(holiday.year);
      errors.push(
        `Festivo duplicado: ${holiday.name} (${dayStr}/${monthStr}/${yearStr})`
      );
    }
    dateKeys.add(dateKey);

    switch (holiday.type) {
      case 'national':
        summary.nationalHolidays++;
        break;
      case 'regional':
        summary.regionalHolidays++;
        break;
      case 'local':
        summary.localHolidays++;
        break;
      default:
        errors.push(
          `Tipo de festivo inválido: ${String(
            holiday.type
          )} para ${holiday.name}`
        );
    }

    if (holiday.day < 1 || holiday.day > 31) {
      errors.push(`Día inválido: ${holiday.day} para ${holiday.name}`);
    }
    if (holiday.month < 1 || holiday.month > 12) {
      errors.push(`Mes inválido: ${holiday.month} para ${holiday.name}`);
    }
    if (holiday.year !== year) {
      errors.push(
        `Año incorrecto: ${holiday.year} para ${holiday.name} (esperado: ${year})`
      );
    }

    if (!holiday.name.trim()) {
      errors.push(
        `Nombre de festivo vacío para ${holiday.day}/${holiday.month}/${holiday.year}`
      );
    }

    if (!summary.monthsWithHolidays.includes(holiday.month)) {
      summary.monthsWithHolidays.push(holiday.month);
    }
  }

  const expectedHolidays = [
    { day: 1, month: 1, name: "Cap d'Any", type: 'national' },
    { day: 6, month: 1, name: 'Reis', type: 'national' },
    { day: 9, month: 6, name: 'Fira a Mataró', type: 'local' },
    { day: 28, month: 7, name: 'Festa major de Les Santes', type: 'local' },
    { day: 15, month: 8, name: "L'Assumpció", type: 'national' },
    { day: 25, month: 12, name: 'Nadal', type: 'national' },
  ];

  for (const expected of expectedHolidays) {
    const found = holidays.find(
      h => h.day === expected.day && h.month === expected.month
    );
    if (!found) {
      warnings.push(
        `Festivo esperado no encontrado: ${expected.name} (${expected.day}/${expected.month})`
      );
    } else if (found.type !== expected.type) {
      warnings.push(
        `Tipo incorrecto para ${expected.name}: esperado ${expected.type}, encontrado ${found.type}`
      );
    }
  }

  if (summary.monthsWithHolidays.length < 6) {
    warnings.push(
      `Pocos meses con festivos: ${summary.monthsWithHolidays.length} (esperado al menos 6)`
    );
  }

  if (summary.nationalHolidays < 8) {
    warnings.push(
      `Pocos festivos nacionales: ${summary.nationalHolidays} (esperado al menos 8)`
    );
  }

  if (summary.localHolidays < 2) {
    warnings.push(
      `Pocos festivos locales: ${summary.localHolidays} (esperado al menos 2: Fira a Mataró y Les Santes)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
};

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as { year: number };
    const { year } = body;

    if (!year) {
      return NextResponse.json({ error: 'Año requerido' }, { status: 400 });
    }

    // Crear cliente Supabase
    const supabase = createSupabaseClient();

    // Obtener festivos del año
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('month', { ascending: true })
      .order('day', { ascending: true });

    if (error !== null && error !== undefined) {
      // console.error('Error obteniendo festivos:', error);
      return NextResponse.json(
        { error: 'Error al obtener festivos de la base de datos' },
        { status: 500 }
      );
    }

    // Validar festivos
    const holidaysData = validateHolidayData(holidays as unknown);
    const validation = validateHolidaysIntegrity(holidaysData ?? [], year);

    return NextResponse.json({
      success: true,
      validation,
      holidays: holidaysData ?? [],
    });
  } catch {
    // console.error('Error en la validación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
};
