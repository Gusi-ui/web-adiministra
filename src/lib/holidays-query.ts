/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { logger } from '@/utils/logger';

import { supabase } from './database';

export interface Holiday {
  id: string;
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
  created_at: string;
  updated_at: string;
}

export interface MonthDaysCalculation {
  laborables: number;
  festivos: number;
  fines_de_semana: number;
}

// Obtener festivos de un mes específico
export const getHolidaysForMonth = async (
  month: number,
  year: number
): Promise<Holiday[]> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('day');

    if (error !== null) {
      logger.error('Error obteniendo festivos:', error);
      return [];
    }

    return (data ?? []).map(holiday => ({
      ...holiday,
      type: holiday.type as 'national' | 'regional' | 'local',
      created_at: holiday.created_at ?? '',
      updated_at: holiday.updated_at ?? '',
    }));
  } catch (error) {
    logger.error('Error obteniendo festivos:', error);
    return [];
  }
};

// Obtener todos los festivos de un año
export const getHolidaysForYear = async (year: number): Promise<Holiday[]> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('month', { ascending: true })
      .order('day', { ascending: true });

    if (error !== null) {
      logger.error('Error obteniendo festivos del año:', error);
      return [];
    }

    return (data ?? []).map(holiday => ({
      ...holiday,
      type: holiday.type as 'national' | 'regional' | 'local',
      created_at: holiday.created_at ?? '',
      updated_at: holiday.updated_at ?? '',
    }));
  } catch (error) {
    logger.error('Error obteniendo festivos del año:', error);
    return [];
  }
};

// Calcular días del mes (implementación en JavaScript)
export const calculateMonthDays = async (
  month: number,
  year: number
): Promise<MonthDaysCalculation> => {
  try {
    // Obtener festivos del mes
    const holidays = await getHolidaysForMonth(month, year);

    // Calcular días en el mes
    const daysInMonth = new Date(year, month, 0).getDate();
    let laborables = 0;
    let festivos = 0;
    let finesDeSemana = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, etc.
      const isHolidayDate = holidays.some(holiday => holiday.day === day);

      if (isHolidayDate) {
        festivos++;
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Sábado o domingo
        finesDeSemana++;
      } else {
        // Día laborable
        laborables++;
      }
    }

    return {
      laborables,
      festivos,
      fines_de_semana: finesDeSemana,
    };
  } catch (error) {
    logger.error('Error calculando días del mes:', error);
    return {
      laborables: 0,
      festivos: 0,
      fines_de_semana: 0,
    };
  }
};

// Añadir un nuevo festivo
export const addHoliday = async (
  holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>
): Promise<Holiday | null> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .insert(holiday)
      .select()
      .single();

    if (error !== null) {
      logger.error('Error añadiendo festivo:', error);
      return null;
    }

    return {
      ...data,
      type: data.type as 'national' | 'regional' | 'local',
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
    };
  } catch (error) {
    logger.error('Error añadiendo festivo:', error);
    return null;
  }
};

// Actualizar un festivo
export const updateHoliday = async (
  id: string,
  updates: Partial<Holiday>
): Promise<Holiday | null> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error !== null) {
      logger.error('Error actualizando festivo:', error);
      return null;
    }

    return {
      ...data,
      type: data.type as 'national' | 'regional' | 'local',
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
    };
  } catch (error) {
    logger.error('Error actualizando festivo:', error);
    return null;
  }
};

// Eliminar un festivo
export const deleteHoliday = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('holidays').delete().eq('id', id);

    if (error !== null) {
      logger.error('Error eliminando festivo:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error eliminando festivo:', error);
    return false;
  }
};

// Obtener festivos por tipo
export const getHolidaysByType = async (
  type: 'national' | 'regional' | 'local',
  year?: number
): Promise<Holiday[]> => {
  try {
    let query = supabase
      .from('holidays')
      .select('*')
      .eq('type', type)
      .order('month', { ascending: true })
      .order('day', { ascending: true });

    if (year !== undefined) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;

    if (error !== null) {
      logger.error('Error obteniendo festivos por tipo:', error);
      return [];
    }

    return (data ?? []).map(holiday => ({
      ...holiday,
      type: holiday.type as 'national' | 'regional' | 'local',
      created_at: holiday.created_at ?? '',
      updated_at: holiday.updated_at ?? '',
    }));
  } catch (error) {
    logger.error('Error obteniendo festivos por tipo:', error);
    return [];
  }
};

// Verificar si una fecha específica es festivo
export const isHoliday = async (
  day: number,
  month: number,
  year: number
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('id')
      .eq('day', day)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (error !== null) return false;

    return data !== null;
  } catch (error) {
    logger.error('Error verificando si es festivo:', error);
    return false;
  }
};

// Obtener información completa de un mes (festivos + cálculo de días)
export const getMonthInfo = async (month: number, year: number) => {
  try {
    const [holidays, daysCalculation] = await Promise.all([
      getHolidaysForMonth(month, year),
      calculateMonthDays(month, year),
    ]);

    return {
      holidays,
      daysCalculation,
      month,
      year,
    };
  } catch (error) {
    logger.error('Error obteniendo información del mes:', error);
    return {
      holidays: [],
      daysCalculation: {
        laborables: 0,
        festivos: 0,
        fines_de_semana: 0,
      },
      month,
      year,
    };
  }
};
