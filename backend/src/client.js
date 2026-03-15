// Centralized Prisma client (singleton) to avoid multiple instances in dev
// Usage: const prisma = require('./client');

const { PrismaClient } = require('@prisma/client');

// Reuse the PrismaClient instance across hot-reloads in development
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
