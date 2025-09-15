/**
 * Tipos principales para la aplicación móvil
 */

export interface Worker {
  id: string;
  email: string;
  name: string;
  surname?: string;
  phone?: string;
  dni?: string;
  worker_type?: string;
  role: string;
  is_active?: boolean;
  monthly_contracted_hours?: number;
  weekly_contracted_hours?: number;
  address?: string | null;
  postal_code?: string;
  city?: string;
  user_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  client_code?: string;
  is_active?: boolean;
  monthly_assigned_hours?: number;
  medical_conditions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  worker_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  schedule: unknown;
  created_at: string;
  updated_at: string;
  users?: User | User[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  state: {
    isAuthenticated: boolean;
    currentWorker: Worker | null;
    isLoading: boolean;
    error: string | null;
  };
  user: Worker | null;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<Worker | undefined>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<Worker | undefined>;
  updatePassword: (email: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Tipos adicionales necesarios
export interface Activity {
  id: string;
  user_id: string | null;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  user_name?: string;
  time_ago?: string;
  created_at: string;
}

export interface ActivityInsert {
  user_id?: string | null;
  activity_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  user_email?: string;
  user_name?: string;
  entity_name?: string;
  details?: unknown;
  ip_address?: string;
  user_agent?: string;
}

export type NotificationType =
  | 'new_user'
  | 'user_removed'
  | 'schedule_change'
  | 'assignment_change'
  | 'route_update'
  | 'service_start'
  | 'service_end'
  | 'system_message'
  | 'reminder'
  | 'urgent'
  | 'holiday_update';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WorkerNotification {
  id: string;
  worker_id: string;
  notification_type: string;
  title: string;
  message: string;
  body?: string;
  type?: NotificationType;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string | null;
  sent_at?: string;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface WorkerNotificationInsert {
  worker_id: string;
  notification_type: string;
  title: string;
  message: string;
  body?: string;
  type?: NotificationType;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_read?: boolean;
  data?: Record<string, unknown>;
  expires_at?: string | null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface HoursBalance {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  contracted_hours: number;
  worked_hours: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface HoursBalanceInsert {
  worker_id: string;
  month: number;
  year: number;
  contracted_hours: number;
  worked_hours: number;
  balance: number;
}

export interface HoursBalanceUpdate {
  contracted_hours?: number;
  worked_hours?: number;
  balance?: number;
}

// Tipos para operaciones CRUD
export interface UserInsert {
  email: string;
  name: string;
  surname?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  client_code?: string;
  is_active?: boolean;
  monthly_assigned_hours?: number;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  surname?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  client_code?: string;
  is_active?: boolean;
  monthly_assigned_hours?: number;
}

export interface WorkerInsert {
  email: string;
  name: string;
  surname?: string;
  phone?: string;
  dni?: string;
  worker_type?: string;
  role: string;
  is_active?: boolean;
  monthly_contracted_hours?: number;
  weekly_contracted_hours?: number;
  address?: string | null;
  postal_code?: string;
  city?: string;
}

export interface WorkerUpdate {
  email?: string;
  name?: string;
  surname?: string;
  phone?: string;
  dni?: string;
  worker_type?: string;
  role?: string;
  is_active?: boolean;
  monthly_contracted_hours?: number;
  weekly_contracted_hours?: number;
  address?: string | null;
  postal_code?: string;
  city?: string;
}

export interface AssignmentInsert {
  worker_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  schedule: unknown;
}

export interface AssignmentUpdate {
  worker_id?: string;
  user_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  schedule?: unknown;
}

export interface AdminInsert {
  email: string;
  password: string;
  name: string;
  surname?: string;
}
