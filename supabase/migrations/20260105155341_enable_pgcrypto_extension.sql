/*
  # Enable pgcrypto Extension for Password Encryption

  1. Purpose
    - Enable pgcrypto extension required for password hashing
    - Provides gen_salt() and crypt() functions for secure password storage
    - Required by admin_create_user_v3 function

  2. Changes
    - CREATE EXTENSION IF NOT EXISTS pgcrypto
    - Extension is created in public schema by default
    - Available to all schemas including auth

  3. Functions Provided
    - gen_salt(type) - Generates salt for password hashing
    - crypt(password, salt) - Encrypts password with salt
    - Other cryptographic functions
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extension is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pgcrypto'
  ) THEN
    RAISE NOTICE 'pgcrypto extension successfully enabled';
  ELSE
    RAISE EXCEPTION 'Failed to enable pgcrypto extension';
  END IF;
END $$;

-- Add comment
COMMENT ON EXTENSION pgcrypto IS 'Cryptographic functions for password hashing and encryption. Required for user creation and authentication.';
