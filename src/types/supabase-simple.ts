/**
 * Tipos simplificados para Supabase en la aplicación móvil
 */

export interface Worker {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
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

export interface SystemActivity {
  id: string;
  user_id: string | null;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      workers: {
        Row: Worker;
        Insert: Omit<Worker, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Worker, 'id' | 'created_at' | 'updated_at'>> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: Omit<
          Assignment,
          'id' | 'created_at' | 'updated_at' | 'users'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'users'>
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_activities: {
        Row: SystemActivity;
        Insert: Omit<SystemActivity, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SystemActivity, 'id' | 'created_at'>> & {
          id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
