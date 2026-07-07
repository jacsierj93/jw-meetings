export interface Congregation {
  id: string;
  name: string;
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}
