import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_H1KBe5FMYVgc@ep-rough-math-ae9vu5v4-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
