// The consents a parent can give for a child. Mirrors the consent_type enum on the server.
export const CONSENTS: { type: string; label: string; detail: string }[] = [
  { type: 'general_participation', label: 'Taking part', detail: 'Training, matches and club activities' },
  { type: 'data_processing', label: 'Data processing', detail: 'The club holding and using their details' },
  { type: 'medical_treatment', label: 'Emergency medical treatment', detail: 'If you can\u2019t be reached in an emergency' },
  { type: 'photo_video', label: 'Photos and video', detail: 'Being photographed or filmed at club events' },
  { type: 'social_media', label: 'Social media', detail: 'Appearing in the club\u2019s posts' },
  { type: 'travel', label: 'Travel to away fixtures', detail: 'Travelling with the team' },
  { type: 'coaching_observation', label: 'One-to-one coaching', detail: 'Individual sessions with a club coach' },
];
