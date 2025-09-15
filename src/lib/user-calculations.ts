import type { Assignment } from './assignments-query';
import { supabase } from './database';
import { getHolidaysForMonth } from './holidays-query';
import { getUserById } from './users-query';

export interface UserCalculation {
  userId: string;
  userName: string;
  userSurname: string;
  totalAssignedHours: number;
  totalWorkers: number;
  assignments: Assignment[];
  calculationDetails: {
    laborablesHours: number;
    festivosHours: number;
    flexibleHours: number;
    completaHours: number;
    personalizadaHours: number;
  };
}

export const calculateUserTotalHours = (
  assignments: Assignment[],
  userId: string
): UserCalculation | null => {
  const userAssignments = assignments.filter(
    assignment =>
      assignment.user_id === userId && assignment.status === 'active'
  );

  if (userAssignments.length === 0) {
    return null;
  }

  const firstAssignment = userAssignments[0];
  const calculationDetails = {
    laborablesHours: 0,
    festivosHours: 0,
    flexibleHours: 0,
    completaHours: 0,
    personalizadaHours: 0,
  };

  // Calcular horas por tipo de asignación
  userAssignments.forEach(assignment => {
    switch (assignment.assignment_type) {
      case 'laborables':
        calculationDetails.laborablesHours += assignment.monthly_hours;
        break;
      case 'festivos':
        calculationDetails.festivosHours += assignment.monthly_hours;
        break;
      case 'flexible':
        calculationDetails.flexibleHours += assignment.monthly_hours;
        break;
      case 'completa':
        calculationDetails.completaHours += assignment.monthly_hours;
        break;
      case 'personalizada':
        calculationDetails.personalizadaHours += assignment.monthly_hours;
        break;
    }
  });

  const totalAssignedHours = userAssignments.reduce(
    (total, assignment) => total + assignment.monthly_hours,
    0
  );

  // Verificar que firstAssignment existe antes de usarlo
  if (firstAssignment === null || firstAssignment === undefined) {
    return null;
  }

  return {
    userId,
    userName: firstAssignment.user?.name ?? '',
    userSurname: firstAssignment.user?.surname ?? '',
    totalAssignedHours,
    totalWorkers: userAssignments.length,
    assignments: userAssignments,
    calculationDetails,
  };
};

export const getAllUserCalculations = (
  assignments: Assignment[]
): UserCalculation[] => {
  const userIds = [...new Set(assignments.map(a => a.user_id))];

  return userIds
    .map(userId => calculateUserTotalHours(assignments, userId))
    .filter(
      (calculation): calculation is UserCalculation => calculation !== null
    );
};

// ==========================================================================
// Cálculo de balance mensual por usuario (asignadas vs teóricas)
// ==========================================================================

export interface UserMonthlyBalance {
  userId: string;
  month: number; // 1-12
  year: number;
  assignedMonthlyHours: number; // desde perfil del usuario (monthly_assigned_hours)
  theoreticalMonthlyHours: number; // estimación a partir de asignaciones
  difference: number; // theoretical - assigned; >0 exceso, <0 defecto
  laborablesMonthlyHours?: number;
  holidaysMonthlyHours?: number;
}

const formatDateKey = (y: number, m: number, d: number): string => {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
};

const getMonthDateRange = (
  year: number,
  month: number
): { start: string; end: string; daysInMonth: number } => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    start: formatDateKey(year, month, 1),
    end: formatDateKey(year, month, daysInMonth),
    daysInMonth,
  };
};

const parseTime = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h + m / 60;
};

type ParsedSchedule = {
  weekdayHours: Record<
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday',
    number
  >;
  holidayHoursPerDay: number; // desde holiday_config.holiday_timeSlots
};

const parseAssignmentSchedule = (schedule: unknown): ParsedSchedule => {
  const weekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;

  let safe: Record<string, unknown> = {};
  if (schedule !== null && schedule !== undefined) {
    if (typeof schedule === 'string') {
      try {
        const parsed = JSON.parse(schedule) as unknown;
        if (parsed !== null && typeof parsed === 'object') {
          safe = parsed as Record<string, unknown>;
        }
      } catch {
        safe = {};
      }
    } else if (typeof schedule === 'object') {
      safe = schedule as Record<string, unknown>;
    }
  }

  const weekdayHours = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  } as ParsedSchedule['weekdayHours'];

  for (const day of weekdays) {
    const dayObj = safe[day];
    if (dayObj === null || dayObj === undefined || typeof dayObj !== 'object') {
      continue;
    }
    const d = dayObj as Record<string, unknown>;
    const enabledVal = d['enabled'];
    const enabled = typeof enabledVal === 'boolean' ? enabledVal : false;
    if (!enabled) continue;
    const slots: unknown[] = Array.isArray(d['timeSlots'])
      ? (d['timeSlots'] as unknown[])
      : [];
    const total = slots.reduce((sum: number, raw: unknown) => {
      if (raw === null || raw === undefined || typeof raw !== 'object')
        return sum;
      const s = raw as Record<string, unknown>;
      let startStr = '';
      if (typeof s['start'] === 'string') startStr = s['start'];
      else if (typeof s['startTime'] === 'string') startStr = s['startTime'];
      let endStr = '';
      if (typeof s['end'] === 'string') endStr = s['end'];
      else if (typeof s['endTime'] === 'string') endStr = s['endTime'];
      if (startStr !== '' && endStr !== '') {
        const hours = parseTime(endStr) - parseTime(startStr);
        return sum + (Number.isFinite(hours) && hours > 0 ? hours : 0);
      }
      const hoursVal = s['hours'];
      const directHours: number = typeof hoursVal === 'number' ? hoursVal : 0;
      const add =
        Number.isFinite(directHours) && directHours > 0 ? directHours : 0;
      return sum + add;
    }, 0);
    weekdayHours[day] = total;
  }

  let holidayHoursPerDay = 0;
  const holidayConfig: unknown = safe['holiday_config'];
  if (
    holidayConfig !== null &&
    holidayConfig !== undefined &&
    typeof holidayConfig === 'object'
  ) {
    const hc: Record<string, unknown> = holidayConfig as Record<
      string,
      unknown
    >;
    const holidaySlots: unknown[] = Array.isArray(hc['holiday_timeSlots'])
      ? (hc['holiday_timeSlots'] as unknown[])
      : [];
    holidayHoursPerDay = holidaySlots.reduce((sum: number, raw: unknown) => {
      if (raw === null || raw === undefined || typeof raw !== 'object')
        return sum;
      const s = raw as Record<string, unknown>;
      const startVal = s['start'];
      const startStr = typeof startVal === 'string' ? startVal : '';
      const endVal = s['end'];
      const endStr = typeof endVal === 'string' ? endVal : '';
      if (startStr !== '' && endStr !== '') {
        const hours = parseTime(endStr) - parseTime(startStr);
        const add = Number.isFinite(hours) && hours > 0 ? hours : 0;
        return sum + add;
      }
      const hoursVal = s['hours'];
      const directHours: number = typeof hoursVal === 'number' ? hoursVal : 0;
      const add =
        Number.isFinite(directHours) && directHours > 0 ? directHours : 0;
      return sum + add;
    }, 0);
  }

  return { weekdayHours, holidayHoursPerDay };
};

export const computeUserMonthlyBalance = async (
  userId: string,
  year: number,
  month: number
): Promise<UserMonthlyBalance | null> => {
  const { start, end, daysInMonth } = getMonthDateRange(year, month);

  // 1) Cargar usuario para obtener horas asignadas mensuales
  const user = await getUserById(userId);
  if (user === null || user === undefined) {
    return null;
  }

  const assignedMonthlyHours = user.monthly_assigned_hours ?? 0;
  // 2) Cargar festivos del mes
  const holidays = await getHolidaysForMonth(month, year);
  const holidayDays = new Set(holidays.map(h => h.day));

  // 3) Cargar asignaciones activas del mes (incluye tipo y schedule)
  const { data: rows, error } = await supabase
    .from('assignments')
    .select('assignment_type, schedule, start_date, end_date, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('start_date', end)
    .or(`end_date.is.null,end_date.gte.${start}`);

  if (error !== null) {
    return {
      userId,
      year,
      month,
      assignedMonthlyHours,
      theoreticalMonthlyHours: 0,
      difference: 0 - assignedMonthlyHours,
    };
  }

  type Row = {
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    status: string;
  };

  const activeAssignments: Row[] = Array.isArray(rows) ? (rows as Row[]) : [];

  // 4) Sumar horas por día del mes según tipo de día y tipo de asignación
  let theoreticalMonthlyHours = 0;
  let laborablesMonthlyHours = 0;
  let holidaysMonthlyHours = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay(); // 0=domingo ... 6=sábado
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidayDays.has(day);
    const isHolidayContext = isWeekend || isHoliday;

    let dailyHours = 0;
    let dailyLaborables = 0;
    let dailyHolidays = 0;
    for (const a of activeAssignments) {
      const parsed = parseAssignmentSchedule(a.schedule);
      const type = a.assignment_type as
        | 'laborables'
        | 'festivos'
        | 'flexible'
        | 'completa'
        | 'personalizada';

      if (type === 'laborables' && !isHolidayContext && dow >= 1 && dow <= 5) {
        const weekdayMap = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ] as const;
        const key = weekdayMap[dow];
        if (key) {
          const add = parsed.weekdayHours[key];
          dailyHours += add;
          dailyLaborables += add;
        }
      }

      if (type === 'festivos' && isHolidayContext) {
        dailyHours += parsed.holidayHoursPerDay;
        dailyHolidays += parsed.holidayHoursPerDay;
      }
    }

    theoreticalMonthlyHours += dailyHours;
    laborablesMonthlyHours += dailyLaborables;
    holidaysMonthlyHours += dailyHolidays;
  }

  return {
    userId,
    year,
    month,
    assignedMonthlyHours,
    theoreticalMonthlyHours,
    difference: theoreticalMonthlyHours - assignedMonthlyHours,
    laborablesMonthlyHours,
    holidaysMonthlyHours,
  };
};

export const computeUserMonthlyBalanceByName = async (
  name: string,
  surname: string,
  year: number,
  month: number
): Promise<UserMonthlyBalance | null> => {
  // Buscar usuario por nombre y apellidos (coincidencia flexible por ILIKE)
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id')
    .ilike('name', name)
    .ilike('surname', surname)
    .single();

  if (userErr !== null || userRow === null) {
    return null;
  }

  return computeUserMonthlyBalance(userRow.id, year, month);
};

// ==========================================================================
// Cálculo de balances por trabajadora: horas por usuario asignado ese mes
// ==========================================================================

export interface WorkerUserMonthlyBalanceRow {
  userId: string;
  userName: string;
  userSurname: string;
  assignedMonthlyHours: number; // desde perfil del usuario
  laborablesHours: number;
  holidaysHours: number;
  totalHours: number; // laborables + holidays
  difference: number; // totalHours - assignedMonthlyHours
}

export const computeWorkerUsersMonthlyBalances = async (
  workerId: string,
  year: number,
  month: number
): Promise<WorkerUserMonthlyBalanceRow[]> => {
  const { start, end, daysInMonth } = getMonthDateRange(year, month);

  // Festivos del mes
  const holidays = await getHolidaysForMonth(month, year);
  const holidayDays = new Set(holidays.map(h => h.day));

  // Asignaciones activas del mes para la trabajadora
  const { data: rows, error } = await supabase
    .from('assignments')
    .select('user_id, assignment_type, schedule, start_date, end_date, status')
    .eq('worker_id', workerId)
    .eq('status', 'active')
    .lte('start_date', end)
    .or(`end_date.is.null,end_date.gte.${start}`);

  if (error !== null || rows === null) return [];

  type Row = {
    user_id: string;
    assignment_type: string;
    schedule: unknown;
    start_date: string;
    end_date: string | null;
    status: string;
  };

  const assignments: Row[] = rows as Row[];
  if (assignments.length === 0) return [];

  // Obtener usuarios involucrados
  const userIds = Array.from(new Set(assignments.map(r => r.user_id)));
  const { data: userRows } = await supabase
    .from('users')
    .select('id, name, surname')
    .in('id', userIds);

  const userMap = new Map<
    string,
    { name: string; surname: string; assigned: number }
  >();
  for (const ur of userRows ?? []) {
    const uid = typeof ur.id === 'string' ? ur.id : String(ur.id);
    const uname = typeof ur.name === 'string' ? ur.name : '';
    const usurname = typeof ur.surname === 'string' ? ur.surname : '';
    userMap.set(uid, {
      name: uname,
      surname: usurname,
      assigned: 0,
    });
  }
  // Completar horas asignadas desde perfil usando helper tipado
  const assignedPairs = await Promise.all(
    userIds.map(async uid => {
      const u = await getUserById(uid);
      return [uid, u?.monthly_assigned_hours ?? 0] as const;
    })
  );
  for (const [uid, assigned] of assignedPairs) {
    const cur = userMap.get(uid);
    if (cur !== undefined) cur.assigned = assigned;
    else userMap.set(uid, { name: '', surname: '', assigned });
  }

  // Inicializar acumuladores por usuario
  const acc = new Map<string, { laborables: number; holidays: number }>();
  for (const uid of userIds) {
    acc.set(uid, { laborables: 0, holidays: 0 });
  }

  // Sumar por día y por asignación
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay(); // 0=domingo ... 6=sábado
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidayDays.has(day);
    const isHolidayContext = isWeekend || isHoliday;

    for (const a of assignments) {
      const parsed = parseAssignmentSchedule(a.schedule);
      const type = a.assignment_type as
        | 'laborables'
        | 'festivos'
        | 'flexible'
        | 'completa'
        | 'personalizada';

      // Laborables: solo lunes-viernes no festivo
      if (type === 'laborables' && !isHolidayContext && dow >= 1 && dow <= 5) {
        const weekdayMap = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ] as const;
        const key = weekdayMap[dow];
        if (key) {
          const add = parsed.weekdayHours[key];
          const cur = acc.get(a.user_id);
          if (cur !== undefined) cur.laborables += add;
        }
      }

      // Festivos: fines de semana o festivos
      if (type === 'festivos' && isHolidayContext) {
        const cur = acc.get(a.user_id);
        if (cur !== undefined) cur.holidays += parsed.holidayHoursPerDay;
      }
    }
  }

  // Construir filas
  const rowsOut: WorkerUserMonthlyBalanceRow[] = [];
  for (const uid of userIds) {
    const sums = acc.get(uid) ?? { laborables: 0, holidays: 0 };
    const uinfo = userMap.get(uid) ?? { name: '', surname: '', assigned: 0 };
    const total = sums.laborables + sums.holidays;
    rowsOut.push({
      userId: uid,
      userName: uinfo.name,
      userSurname: uinfo.surname,
      assignedMonthlyHours: uinfo.assigned,
      laborablesHours: sums.laborables,
      holidaysHours: sums.holidays,
      totalHours: total,
      difference: total - uinfo.assigned,
    });
  }

  // Ordenar por nombre
  rowsOut.sort((a, b) =>
    `${a.userName} ${a.userSurname}`.localeCompare(
      `${b.userName} ${b.userSurname}`,
      'es'
    )
  );

  return rowsOut;
};
