export interface KitSupplier {
  id: string
  name: string
  logo_url?: string
  website_url?: string
  description?: string
  is_active: boolean
}

export interface KitReward {
  id: string
  title: string
  description?: string
  creds_cost: number
  category: string
  brand?: string
  discount_percent?: number
  voucher_code?: string
  expires_at?: string
  min_order_value?: number
  stock_count?: number
  is_active: boolean
  supplier_id?: string
  supplier?: KitSupplier
}

export interface KitRedemption {
  id: string
  user_id: string
  reward_id: string
  creds_spent: number
  redeemed_at: string
  status: 'pending' | 'fulfilled' | 'cancelled' | 'refunded'
  fulfilment_data: Record<string, unknown>
  reward?: KitReward
}
