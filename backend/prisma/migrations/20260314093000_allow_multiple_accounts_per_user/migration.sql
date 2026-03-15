-- Allow one NguoiDung to own multiple TaiKhoan records

BEGIN;

ALTER TABLE "TaiKhoan"
  DROP CONSTRAINT IF EXISTS "TaiKhoan_MaNguoiDung_key";

DROP INDEX IF EXISTS "TaiKhoan_MaNguoiDung_key";

CREATE INDEX IF NOT EXISTS "TaiKhoan_MaNguoiDung_idx"
  ON "TaiKhoan"("MaNguoiDung");

COMMIT;
