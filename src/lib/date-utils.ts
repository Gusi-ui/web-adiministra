/**
 * Utilidades para manejo de fechas según el calendario español
 * Las semanas empiezan el lunes (día 1) y terminan el domingo (día 0)
 */

/**
 * Obtiene el lunes de la semana actual
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Fecha del lunes de la semana actual
 */
export const getMondayOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea 1
  d.setDate(diff);
  return d;
};

/**
 * Obtiene el domingo de la semana actual
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Fecha del domingo de la semana actual
 */
export const getSundayOfWeek = (date: Date = new Date()): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

/**
 * Obtiene el rango de la semana actual (lunes a domingo)
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Objeto con start y end en formato YYYY-MM-DD
 */
export const getWeekRange = (
  date: Date = new Date()
): {
  start: string;
  end: string;
} => {
  const monday = getMondayOfWeek(date);
  const sunday = getSundayOfWeek(date);

  return {
    start: monday.toLocaleDateString('sv-SE'), // formato YYYY-MM-DD en zona horaria local
    end: sunday.toLocaleDateString('sv-SE'), // formato YYYY-MM-DD en zona horaria local
  };
};

/**
 * Obtiene el rango de la próxima semana (lunes a domingo)
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Objeto con start y end en formato YYYY-MM-DD
 */
export const getNextWeekRange = (
  date: Date = new Date()
): {
  start: string;
  end: string;
} => {
  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return getWeekRange(nextWeek);
};

/**
 * Obtiene el rango del mes actual
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Objeto con start y end en formato YYYY-MM-DD
 */
export const getMonthRange = (
  date: Date = new Date()
): {
  start: string;
  end: string;
} => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: start.toLocaleDateString('sv-SE'), // formato YYYY-MM-DD en zona horaria local
    end: end.toLocaleDateString('sv-SE'), // formato YYYY-MM-DD en zona horaria local
  };
};

/**
 * Obtiene el rango del mes actual desde mañana hasta el final del mes
 * @param date - Fecha de referencia (por defecto hoy)
 * @returns Objeto con start y end en formato YYYY-MM-DD
 */
export const getRemainingMonthRange = (
  date: Date = new Date()
): {
  start: string;
  end: string;
} => {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: tomorrow.toISOString().split('T')[0] ?? '',
    end: end.toISOString().split('T')[0] ?? '',
  };
};

/**
 * Verifica si una fecha es lunes
 * @param date - Fecha a verificar
 * @returns true si es lunes
 */
export const isMonday = (date: Date): boolean => date.getDay() === 1;

/**
 * Verifica si una fecha es domingo
 * @param date - Fecha a verificar
 * @returns true si es domingo
 */
export const isSunday = (date: Date): boolean => date.getDay() === 0;

/**
 * Obtiene el nombre del día de la semana en español
 * @param date - Fecha
 * @returns Nombre del día en español
 */
export const getDayName = (date: Date): string => {
  const days = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ];
  return days[date.getDay()] ?? 'lunes';
};
