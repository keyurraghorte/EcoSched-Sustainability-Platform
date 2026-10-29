import {
  pgEnum,
  pgTable,
  text,
  integer,
  real,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Define enums for priority ('High', 'Medium', 'Low') and status ('Pending', 'Scheduled', 'Completed', 'Failed')
export const priorityEnum = pgEnum("priority", ["High", "Medium", "Low"]);

export const statusEnum = pgEnum("status", [
  "Pending",
  "Scheduled",
  "Completed",
  "Failed",
  "Deferred",
]);

// Workloads table using Drizzle's pgTable
export const workloads = pgTable("workloads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  cpuCores: integer("cpu_cores").notNull(),
  memoryGb: real("memory_gb").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  energyKwh: real("energy_kwh").notNull(),
  arrival: timestamp("arrival", { mode: "string", withTimezone: true }).notNull(),
  deadline: timestamp("deadline", { mode: "string", withTimezone: true }).notNull(),
  priority: priorityEnum("priority").notNull(),
  dataSizeGb: real("data_size_gb").default(0).notNull(),
  status: statusEnum("status").default("Pending").notNull(),
  failureReason: text("failure_reason"),
  failureDetails: text("failure_details"),
  scheduledTime: timestamp("scheduled_time", { mode: "string", withTimezone: true }),
  energySource: text("energy_source"),
  sourceAllocationMix: text("source_allocation_mix"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Standard Drizzle infer types
export const workloadsTable = workloads;
export type WorkloadInsert = typeof workloads.$inferInsert;
export type WorkloadSelect = typeof workloads.$inferSelect;

