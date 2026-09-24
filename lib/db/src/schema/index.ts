import { integer, pgTable, real, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const companiesTable = pgTable("companies", {
  id: integer("id").primaryKey(),
  companyCode: text("company_code"),
  name: text("name").notNull(),
  industry: text("industry"),
  country: text("country"),
  website: text("website"),
  description: text("description"),
  renewableCommitment: text("renewable_commitment"),
  pueGlobal2025: real("pue_global_2025"),
  wueGlobal2025: real("wue_global_2025"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const dataCentersTable = pgTable("data_centers", {
  id: integer("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  dataCenterCode: varchar("data_center_code", { length: 100 }).notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  pue2025: real("pue_2025"),
  wue2025: real("wue_2025"),
  cpuCapacity: real("cpu_capacity"),
  memoryCapacityGb: real("memory_capacity_gb"),
  status: text("status").notNull(),
  sourceName: text("source_name"),
  sourceYear: integer("source_year"),
  sourceUrl: text("source_url"),
  dataConfidence: text("data_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});