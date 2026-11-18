import type { Delivery, MerchState } from '@/lib/merch/logic';

/** A merchandise order waiting to be placed with the supplier or posted. */
export type MerchOrder = {
  id: string;
  player_name: string;
  email: string | null;
  item: string;
  delivery: Delivery;
  state: MerchState;
  supplier_reference: string | null;
  ordered_at: string;
};
