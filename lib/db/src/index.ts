import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

// Configure postgres-js with prepare: false to ensure compatibility with Supabase's transaction pooler
export const client = postgres(connectionString, { prepare: false });

// Export initialized db instance wired with the schema
export const db = drizzle(client, { schema });

export * from "./schema";
