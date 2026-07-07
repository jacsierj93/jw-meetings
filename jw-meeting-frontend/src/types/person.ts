export interface Person {
  id: string;
  congregation_id: string;
  full_name: string;
  email?: string;
  extra_data?: Record<string, unknown>;
  active: boolean;
  created_at?: string;
}
