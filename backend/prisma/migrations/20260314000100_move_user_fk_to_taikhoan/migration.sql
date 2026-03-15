-- Move account-user relation ownership from NguoiDung.MaTaiKhoan to TaiKhoan.MaNguoiDung

BEGIN;

-- 1) Add new nullable foreign key column on TaiKhoan
ALTER TABLE "TaiKhoan"
  ADD COLUMN IF NOT EXISTS "MaNguoiDung" INTEGER;

-- 2) Backfill relation data from old column before dropping it
UPDATE "TaiKhoan" tk
SET "MaNguoiDung" = nd."MaNguoiDung"
FROM "NguoiDung" nd
WHERE nd."MaTaiKhoan" = tk."MaTaiKhoan"
  AND tk."MaNguoiDung" IS NULL;

-- 3) Remove old relation artifacts from NguoiDung
ALTER TABLE "NguoiDung" DROP CONSTRAINT IF EXISTS "NguoiDung_MaTaiKhoan_fkey";
ALTER TABLE "NguoiDung" DROP CONSTRAINT IF EXISTS "NguoiDung_MaTaiKhoan_key";
DROP INDEX IF EXISTS "NguoiDung_MaTaiKhoan_key";
ALTER TABLE "NguoiDung" DROP COLUMN IF EXISTS "MaTaiKhoan";

-- 4) Add one-to-one unique index and FK from TaiKhoan -> NguoiDung
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'TaiKhoan_MaNguoiDung_key'
  ) THEN
    CREATE UNIQUE INDEX "TaiKhoan_MaNguoiDung_key" ON "TaiKhoan"("MaNguoiDung");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TaiKhoan_MaNguoiDung_fkey'
  ) THEN
    ALTER TABLE "TaiKhoan"
      ADD CONSTRAINT "TaiKhoan_MaNguoiDung_fkey"
      FOREIGN KEY ("MaNguoiDung") REFERENCES "NguoiDung"("MaNguoiDung")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END
$$;

COMMIT;
