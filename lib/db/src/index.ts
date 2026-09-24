import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = isDatabaseConfigured
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;
export const db = pool ? drizzle(pool, { schema }) : undefined;

export * from "./schema";
