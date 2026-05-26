import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not set.`);
  }
  return value;
}

export const config = {
  mongoUri: required("MONGODB_URI"),
  database: required("MONGODB_DATABASE"),
} as const;
