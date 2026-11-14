export type PredictionOutcome = 'win' | 'loss' | 'draw' | 'rain'

export interface GutPrediction {
  id: string
  user_id: string
  fixture_id: string
  prediction: PredictionOutcome
  is_correct: boolean | null
  creds_awarded: number
  created_at: string
  fixture?: {
    opponent: string
    match_date: string
    result?: string
  }
}

export interface GutFeelingSeason {
  total_predictions: number
  correct_predictions: number
  accuracy_percent: number
  total_creds_earned: number
  current_streak: number  // consecutive correct predictions
}
