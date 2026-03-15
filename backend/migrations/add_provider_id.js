const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding providerId column to TaiKhoan...');
  
  try {
    // Add providerId column (nullable for existing accounts)
    await prisma.$executeRawUnsafe(`ALTER TABLE "TaiKhoan" ADD COLUMN "providerId" VARCHAR(255)`);
    console.log('✓ Added providerId column');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
