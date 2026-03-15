const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding provider and isActived columns to TaiKhoan...');
  
  try {
    // Add Provider column with default 'local'
    await prisma.$executeRawUnsafe(`ALTER TABLE "TaiKhoan" ADD COLUMN "Provider" VARCHAR(50) DEFAULT 'local'`);
    console.log('✓ Added Provider column');
    
    // Add IsActived column with default true
    await prisma.$executeRawUnsafe(`ALTER TABLE "TaiKhoan" ADD COLUMN "IsActived" BOOLEAN DEFAULT true`);
    console.log('✓ Added IsActived column');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
