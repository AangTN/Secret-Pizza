const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Move Role from TaiKhoan to NguoiDung...');

  // Step 1: Add Role column to NguoiDung table (this will be done by Prisma migration)
  // Step 2: Copy role from TaiKhoan to NguoiDung
  const result = await prisma.$executeRaw`
    UPDATE "NguoiDung"
    SET "Role" = (
      SELECT "Role" 
      FROM "TaiKhoan" 
      WHERE "TaiKhoan"."MaTaiKhoan" = "NguoiDung"."MaTaiKhoan"
    )
    WHERE "NguoiDung"."MaTaiKhoan" IS NOT NULL
  `;

  console.log(`Migration completed. Updated ${result} rows.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
