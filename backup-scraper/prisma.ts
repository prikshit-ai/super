// src/lib/prisma.ts
// @ts-nocheck
import { PrismaClient } from '@/generated/prisma';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof prismaClientSingleton>;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
