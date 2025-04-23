class PrefixedPrimaryIds < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      -- The generated ID has 10 random bytes =>
      -- the output is Base58 encoded, with an optional prefix:
      -- gen_id() => 5xXBF6THVcCpa
      -- gen_id('user') => user_5xXBF6THVcCpa

      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE OR REPLACE FUNCTION gen_id(prefix text default NULL) RETURNS text
          LANGUAGE plpgsql
          AS $$
      DECLARE
          return_string    TEXT;
          no_of_chars      INT := 12;
          -- Max. 16 chars. If more, then increase DECIMAL-size in hex_to_base58
      BEGIN
          -- Entropy bytes
          return_string := RIGHT(gen_random_bytes(no_of_chars)::text, - 2);
          -- Note: We truncate the output to no_of_chars, further down. So the
          -- final entropy will be less. E.g. 12 Base58-chars is only about 9
          -- bytes of entropy.

          return_string := hex_to_base58(return_string);

          return_string := substring(return_string from 1 for no_of_chars);

          IF prefix IS NOT NULL THEN
              return_string := prefix || '_' || return_string;
          END IF;

          RETURN return_string;
      END;
      $$;
      COMMENT ON FUNCTION gen_id(prefix text) IS 'Generates a Base58-encoded ID
       with 80 random bits';

      CREATE OR REPLACE FUNCTION hex_to_base58(hexstr TEXT) RETURNS TEXT AS $$
      DECLARE
          bytes          BYTEA := ('\\x' || hexstr)::BYTEA;
          leading_zeroes INT := 0;
          num            DECIMAL(40,0) := 0;
          base           DECIMAL(40,0) := 1;

          -- Bitcoin base58 alphabet
          base58_alphabet TEXT := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          byte_value      INT;
          byte_val        INT;
          byte_values     INT[] DEFAULT ARRAY[]::INT[];
          modulo          INT;
          base58_result   TEXT := '';
      BEGIN
          FOR hex_index IN REVERSE ((length(hexstr) / 2) - 1)..0 LOOP
              byte_value := get_byte(bytes, hex_index);
              IF byte_value = 0 THEN
                  leading_zeroes := leading_zeroes + 1;
              ELSE
                  leading_zeroes := 0;
                  num := num + (base * byte_value);
              END IF;
              base := base * 256; -- = 16^2 (2 hex-digits)
          END LOOP;

          WHILE num > 0 LOOP
              modulo := num % length(base58_alphabet);
              num := div(num, length(base58_alphabet));
              byte_values := array_append(byte_values, modulo);
          END LOOP;

          FOREACH byte_val IN ARRAY byte_values
          LOOP
              base58_result := SUBSTRING(base58_alphabet, byte_val + 1, 1) || base58_result;
          END LOOP;

          base58_result := repeat(SUBSTRING(base58_alphabet, 1, 1), leading_zeroes) || base58_result;

          RETURN base58_result;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE STRICT;

      COMMENT ON FUNCTION hex_to_base58(hexstr TEXT) IS 'Encodes a hex-string to
      Base58 using the bitcoin alphabet';
    SQL
  end

  def down
    execute <<~SQL
      DROP FUNCTION IF EXISTS hex_to_base58(hexstr TEXT);
      DROP FUNCTION IF EXISTS gen_id(prefix text);
      DROP EXTENSION IF EXISTS pgcrypto;
    SQL
  end
end
