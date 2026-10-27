import { neon, Client, type NeonQueryFunction } from '@neondatabase/serverless';

// Ensure this file is never bundled into client
if (typeof window !== 'undefined') {
  throw new Error('SECURITY VIOLATION: Database driver must NEVER run in the browser.');
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.warn('WARNING: DATABASE_URL is not set in environment.');
}

export const getDb = (): NeonQueryFunction<false, false> => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return neon(url);
};

export const getDbClient = async (): Promise<Client> => {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
};
