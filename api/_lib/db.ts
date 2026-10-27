import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Ensure this file is never bundled into client
if (typeof window !== 'undefined') {
  throw new Error('SECURITY VIOLATION: Database driver must NEVER run in the browser.');
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // In serverless environment, DATABASE_URL must be defined
  console.warn('WARNING: DATABASE_URL is not set in environment.');
}

export const getDb = (): NeonQueryFunction<false, false> => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return neon(url);
};
