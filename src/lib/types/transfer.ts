export interface TransferAvailable {
  id: string;
  position: string;
  level: string;
  description?: string | null;
  club?: { name: string } | null;
}

export interface TransferWanted {
  id: string;
  position: string;
  level_required: string;
  age_range?: string | null;
  description?: string | null;
  applications_count: number;
  club?: { name: string } | null;
}
