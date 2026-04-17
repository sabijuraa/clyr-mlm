-- Group 11: Order item variant persistence + customer profile completeness

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'variant_description'
  ) THEN
    ALTER TABLE order_items ADD COLUMN variant_description TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'variant_data'
  ) THEN
    ALTER TABLE order_items ADD COLUMN variant_data JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN birth_date DATE;
  END IF;
END $$;
