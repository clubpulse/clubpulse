-- The four kit rewards added in 20261024000015_kit_discounts.sql were samples: there is no
-- agreement with those brands and no code to hand out. They are switched off so members are
-- not shown rewards that cannot be honoured. Turn one back on, or add a new row, once a real
-- offer exists.
UPDATE rewards_catalogue
SET is_active = FALSE
WHERE merchant_id IS NULL
  AND title IN ('Gray-Nicolls 10% Off', 'Kookaburra Cricket Ball Deal', 'New Balance Cricket Boots', 'GM Cricket Bag');
