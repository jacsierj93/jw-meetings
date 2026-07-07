export interface AssignmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  requires_assistant: boolean;
  default_duration?: number | null;
  config?: Record<string, unknown> | null;
}

export interface PersonSummary {
  id: string;
  full_name: string;
}

export interface Assignment {
  id: string;
  week_id: string;
  assignment_type: AssignmentType;
  assignee?: PersonSummary | null;
  assistant?: PersonSummary | null;
  title: string;
  duration?: number | null;
  order_index: number;
  assigned_at?: string | null;
  created_at: string;
}
