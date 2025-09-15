export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          worker_id: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: string;
          schedule: Json;
          created_at: string;
          updated_at: string;
          users?: {
            id: string;
            email: string;
            name: string;
            created_at: string;
            updated_at: string;
          };
        };
        Insert: {
          id?: string;
          worker_id: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: string;
          schedule: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          user_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'workers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_activities: {
        Row: {
          id: string;
          user_id: string | null;
          activity_type: string;
          entity_type: string;
          entity_id: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          activity_type: string;
          entity_type: string;
          entity_id: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          activity_type?: string;
          entity_type?: string;
          entity_id?: string;
          description?: string;
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
