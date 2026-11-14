export type EntryType = 'income' | 'expense'

export const INCOME_CATEGORIES = [
  'Match Fees', 'Annual Memberships', 'Bar Takings', 'Sponsorship',
  'Fundraising', 'Grant / Funding', 'Kit Sales', 'Other Income'
] as const

export const EXPENSE_CATEGORIES = [
  'Ground Hire', 'Equipment', 'Travel & Transport', 'Umpires',
  'Coaching', 'Kit & Uniform', 'Insurance', 'Admin & Fees',
  'Maintenance', 'Social Events', 'Other Expense'
] as const

export interface FinanceEntry {
  id: string
  club_id: string
  entry_type: EntryType
  category: string
  description: string
  amount_pence: number
  entry_date: string
  recorded_by?: string
  receipt_url?: string
  created_at: string
}

export interface FinanceMonthSummary {
  month: string
  total_income_pence: number
  total_expense_pence: number
  net_pence: number
  entry_count: number
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export function parsePoundsToPence(pounds: string): number {
  return Math.round(parseFloat(pounds) * 100)
}
