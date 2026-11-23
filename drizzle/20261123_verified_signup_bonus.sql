ALTER TABLE credit_wallets
  ADD COLUMN IF NOT EXISTS signup_bonus_claimed boolean NOT NULL DEFAULT true;
