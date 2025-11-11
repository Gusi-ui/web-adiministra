import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface HolidayData {
  day: number;
  month: number;
  year: number;
  name: string;
  type: 'national' | 'regional' | 'local';
}

// Nota: Los tipos de festivos están definidos directamente en el array holidays2026
// Esta función se mantiene como referencia pero no se usa en este script
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    "Festa Nacional d'Espanya",
    'La Immaculada',
    'Nadal',
    'Sant Esteve',
  ];

  const localHolidays = ['Fira a Mataró', 'Festa major de Les Santes'];

  const regionalHolidays = ['Diada Nacional de Catalunya'];

  if (nationalHolidays.includes(name)) {
    return 'national';
  } else if (localHolidays.includes(name)) {
    return 'local';
  } else if (regionalHolidays.includes(name)) {
    return 'regional';
  }
  return 'national'; // Por defecto
};

// Festivos de 2026 para Mataró
const holidays2026: HolidayData[] = [
  { day: 1, month: 1, year: 2026, name: "Cap d'Any", type: 'national' },
  { day: 6, month: 1, year: 2026, name: 'Reis', type: 'national' },
  { day: 3, month: 4, year: 2026, name: 'Divendres Sant', type: 'national' },
  {
    day: 6,
    month: 4,
    year: 2026,
    name: 'Dilluns de Pasqua Florida',
    type: 'national',
  },
  { day: 1, month: 5, year: 2026, name: 'Festa del Treball', type: 'national' },
  { day: 25, month: 5, year: 2026, name: 'Fira a Mataró', type: 'local' },
  { day: 24, month: 6, year: 2026, name: 'Sant Joan', type: 'national' },
  {
    day: 27,
    month: 7,
    year: 2026,
    name: 'Festa major de Les Santes',
    type: 'local',
  },
  { day: 15, month: 8, year: 2026, name: "L'Assumpció", type: 'national' },
  {
    day: 11,
    month: 9,
    year: 2026,
    name: 'Diada Nacional de Catalunya',
    type: 'regional',
  },
  {
    day: 12,
    month: 10,
    year: 2026,
    name: "Festa Nacional d'Espanya",
    type: 'national',
  },
  { day: 8, month: 12, year: 2026, name: 'La Immaculada', type: 'national' },
  { day: 25, month: 12, year: 2026, name: 'Nadal', type: 'national' },
  { day: 26, month: 12, year: 2026, name: 'Sant Esteve', type: 'national' },
];

async function addHolidays2026() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      '❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados en el archivo .env'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('📅 Iniciando inserción de festivos de 2026...\n');

  try {
    // Verificar si ya existen festivos de 2026
    const { data: existingHolidays, error: checkError } = await supabase
      .from('holidays')
      .select('id, day, month, name')
      .eq('year', 2026);

    if (checkError) {
      console.error('❌ Error al verificar festivos existentes:', checkError);
      process.exit(1);
    }

    if (existingHolidays && existingHolidays.length > 0) {
      console.log(
        `⚠️  Ya existen ${existingHolidays.length} festivos para 2026.`
      );
      console.log('¿Deseas eliminarlos y reemplazarlos? (s/n)');
      // En un script automatizado, podemos usar un flag o simplemente eliminar y reemplazar
      // Por ahora, eliminamos los existentes
      const { error: deleteError } = await supabase
        .from('holidays')
        .delete()
        .eq('year', 2026);

      if (deleteError) {
        console.error('❌ Error al eliminar festivos existentes:', deleteError);
        process.exit(1);
      }

      console.log('✅ Festivos existentes eliminados.\n');
    }

    // Insertar los nuevos festivos
    const { data: insertedHolidays, error: insertError } = await supabase
      .from('holidays')
      .insert(holidays2026)
      .select();

    if (insertError) {
      console.error('❌ Error al insertar festivos:', insertError);
      process.exit(1);
    }

    console.log(
      `✅ ${insertedHolidays?.length ?? 0} festivos insertados exitosamente:\n`
    );

    // Mostrar los festivos insertados agrupados por mes
    const holidaysByMonth = holidays2026.reduce<Record<number, HolidayData[]>>(
      (acc, holiday) => {
        acc[holiday.month] ??= [];
        acc[holiday.month].push(holiday);
        return acc;
      },
      {}
    );

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    Object.entries(holidaysByMonth).forEach(([month, holidays]) => {
      const monthName = monthNames[Number(month) - 1];
      console.log(`📆 ${monthName}:`);
      holidays.forEach(holiday => {
        const typeLabel =
          holiday.type === 'national'
            ? 'Nacional'
            : holiday.type === 'regional'
              ? 'Regional'
              : 'Local';
        console.log(
          `   ${holiday.day.toString().padStart(2, '0')}/${month.padStart(2, '0')} - ${holiday.name} (${typeLabel})`
        );
      });
      console.log('');
    });

    console.log('✅ Proceso completado exitosamente!');
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar el script
addHolidays2026().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
