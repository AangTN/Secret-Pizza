const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting email migration...');
  
  try {
    // Step 1: Add Email column to NguoiDung (nullable first)
    await prisma.$executeRawUnsafe(`ALTER TABLE "NguoiDung" ADD COLUMN "Email" VARCHAR(100)`);
    console.log('✓ Added Email column to NguoiDung');
    
    // Step 2: Copy email data from TaiKhoan to NguoiDung
    await prisma.$executeRawUnsafe(`
      UPDATE "NguoiDung" 
      SET "Email" = (
          SELECT "TaiKhoan"."Email" 
          FROM "TaiKhoan" 
          WHERE "TaiKhoan"."MaTaiKhoan" = "NguoiDung"."MaTaiKhoan"
      )
      WHERE "NguoiDung"."MaTaiKhoan" IS NOT NULL
    `);
    console.log('✓ Copied email data from TaiKhoan to NguoiDung');
    
    // Step 3: Add unique constraint to NguoiDung.Email
    await prisma.$executeRawUnsafe(`ALTER TABLE "NguoiDung" ADD CONSTRAINT "NguoiDung_Email_key" UNIQUE ("Email")`);
    console.log('✓ Added unique constraint to NguoiDung.Email');
    
    // Step 4: Drop Email column from TaiKhoan
    await prisma.$executeRawUnsafe(`ALTER TABLE "TaiKhoan" DROP COLUMN "Email"`);
    console.log('✓ Dropped Email column from TaiKhoan');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
