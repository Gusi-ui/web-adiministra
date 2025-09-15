import { createClient } from '@supabase/supabase-js';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

import { type NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
);

interface HolidayData {
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
}

// Función para validar y convertir datos de Supabase
const validateHolidayData = (data: unknown): HolidayData[] | null => {
  if (!Array.isArray(data)) return null;

  const isValidHoliday = (item: unknown): item is HolidayData => {
    if (typeof item !== 'object' || item === null) return false;
    const holiday = item as Record<string, unknown>;

    return (
      typeof holiday['day'] === 'number' &&
      typeof holiday['month'] === 'number' &&
      typeof holiday['year'] === 'number' &&
      typeof holiday['name'] === 'string' &&
      typeof holiday['type'] === 'string' &&
      ['national', 'regional', 'local'].includes(holiday['type'])
    );
  };

  return data.every(isValidHoliday) ? data : null;
};

const determineHolidayType = (
  name: string
): 'national' | 'regional' | 'local' => {
  const nationalHolidays = [
    "Cap d'Any",
    'Reis',
    'Divendres Sant',
    'Dilluns de Pasqua Florida',
    'Festa del Treball',
    'Sant Joan',
    "L'Assumpció",
    'Diada Nacional de Catalunya',
    'Tots Sants',
    'Dia de la Constitució',
    'La Immaculada',
    'Nadal',
    'Sant Esteve',
  ];

  const localHolidays = ['Fira a Mataró', 'Festa major de Les Santes'];

  if (nationalHolidays.includes(name)) {
    return 'national';
  } else if (localHolidays.includes(name)) {
    return 'local';
  }
  return 'regional';
};

const scrapeHolidaysFromMataroWebsite = async (
  year: number
): Promise<HolidayData[]> => {
  const MATARO_HOLIDAYS_URL =
    'https://www.mataro.cat/ca/la-ciutat/festius-locals';

  const response = await fetch(MATARO_HOLIDAYS_URL);
  const html = await response.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const table = document.querySelector('table');
  if (!table) {
    throw new Error('No se encontró la tabla de festivos en la página');
  }

  const rows = table.querySelectorAll('tr');
  const holidays: HolidayData[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row === null || row === undefined) continue;

    const cells = row.querySelectorAll('td');

    if (cells.length >= 2) {
      const dateCell = cells[0]?.textContent?.trim();
      const nameCell = cells[1]?.textContent?.trim();

      if (
        dateCell?.trim() !== undefined &&
        dateCell.trim() !== '' &&
        nameCell?.trim() !== undefined &&
        nameCell.trim() !== ''
      ) {
        const dateMatch = dateCell.match(/(\d+)\s+(?:de|d['])\s*(\w+)/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1] ?? '0');
          const monthName = (dateMatch[2] ?? '').toLowerCase();

          const monthMap: { [key: string]: number } = {
            gener: 1,
            febrer: 2,
            març: 3,
            abril: 4,
            maig: 5,
            juny: 6,
            juliol: 7,
            agost: 8,
            setembre: 9,
            octubre: 10,
            novembre: 11,
            desembre: 12,
          };

          const month = monthMap[monthName];
          if (month !== undefined && month > 0) {
            const type = determineHolidayType(nameCell);

            holidays.push({
              day,
              month,
              year,
              name: nameCell,
              type,
            });
          }
        }
      }
    }
  }

  return holidays;
};

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as { year: number };
    const { year } = body;

    if (typeof year !== 'number' || isNaN(year)) {
      return NextResponse.json({ error: 'Año requerido' }, { status: 400 });
    }

    // Extraer festivos de la web
    const holidays = await scrapeHolidaysFromMataroWebsite(year);

    if (holidays.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron festivos para importar' },
        { status: 404 }
      );
    }

    // Eliminar festivos existentes del año
    await supabase.from('holidays').delete().eq('year', year);

    // Insertar nuevos festivos
    const { data, error: dbError } = await supabase
      .from('holidays')
      .insert(holidays)
      .select();

    if (dbError) {
      // console.error('Error al importar festivos:', dbError);
      return NextResponse.json(
        { error: 'Error al importar festivos a la base de datos' },
        { status: 500 }
      );
    }
    const holidaysData = validateHolidayData(data as unknown);
    return NextResponse.json({
      success: true,
      message: `${holidaysData?.length ?? 0} festivos importados exitosamente`,
      holidays: holidaysData ?? [],
    });
  } catch {
    // console.error('Error en la importación:', _error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
};
