export interface Program {
  id: string;
  congregation_id: string;
  version: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeekContent {
  treasures: Record<string, unknown>;
  ministry_items: Array<
    {
      titulo?: string;
      detail?: { raw_text?: string };
    } & Record<string, unknown>
  >;
  christian_life_items: Record<string, unknown>[];
}

export interface Week {
  id: string;
  program_id: string;
  date_range: string;
  reading?: string | null;
  songs: Record<string, unknown>;
  week_number: number;
  week_date: string;
  content?: WeekContent | null;
  extra_data?: Record<string, unknown> | null;
}
