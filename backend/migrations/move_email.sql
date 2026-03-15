-- Step 1: Add Email column to NguoiDung (nullable first)
ALTER TABLE "NguoiDung" ADD COLUMN "Email" VARCHAR(100);

-- Step 2: Copy email data from TaiKhoan to NguoiDung
UPDATE "NguoiDung" 
SET "Email" = (
    SELECT "TaiKhoan"."Email" 
    FROM "TaiKhoan" 
    WHERE "TaiKhoan"."MaTaiKhoan" = "NguoiDung"."MaTaiKhoan"
)
WHERE "NguoiDung"."MaTaiKhoan" IS NOT NULL;

-- Step 3: Add unique constraint to NguoiDung.Email (will fail if duplicates exist)
ALTER TABLE "NguoiDung" ADD CONSTRAINT "NguoiDung_Email_key" UNIQUE ("Email");

-- Step 4: Drop Email column from TaiKhoan
ALTER TABLE "TaiKhoan" DROP COLUMN "Email";
