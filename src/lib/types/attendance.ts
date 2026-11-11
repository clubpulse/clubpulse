export type ClubMemberLite = { user_id: string; name: string; is_junior: boolean };

export type TrainingSession = {
  id: string;
  session_date: string;
  title: string;
  attendee_ids: string[];
};

export type MatchFee = {
  id: string;
  user_id: string;
  player_name: string;
  description: string;
  amount_pence: number;
  due_date: string;
  paid_at: string | null;
};

export type AttendanceAdminData = {
  members: ClubMemberLite[];
  sessions: TrainingSession[];
  fees: MatchFee[];
  rewards: { training: number; trainingOn: boolean; fee: number; feeOn: boolean };
};
