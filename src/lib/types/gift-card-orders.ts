export type GiftCardOrderKind = 'redemption' | 'scratch_card';

export type GiftCardOrder = {
  kind: GiftCardOrderKind;
  id: string;                 // reward_redemptions.id or scratch_cards.id; also the order reference
  player_name: string;
  email: string | null;
  reward_title: string;
  amount_gbp: number | null;
  tango_utid: string | null;
  requested_at: string;
  note: string | null;
};
