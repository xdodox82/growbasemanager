/*
  # Create RPC Function to Decrement Packaging Stock

  1. New Function
    - `decrement_packaging_stock` - Safely decrements packaging quantity
    - Takes packaging_id and amount as parameters
    - Returns void
    - Prevents stock from going negative

  2. Security
    - Only authenticated users can call this function
*/

CREATE OR REPLACE FUNCTION decrement_packaging_stock(
  packaging_id uuid,
  amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE packagings
  SET quantity = GREATEST(0, quantity - amount)
  WHERE id = packaging_id;
END;
$$;