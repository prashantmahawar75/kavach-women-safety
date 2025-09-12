import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  role: text("role").notNull().default("user"), // "user" or "admin"
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  incidentType: text("incident_type").notNull(),
  description: text("description"),
  datetime: timestamp("datetime").notNull(),
  anonymous: boolean("anonymous").default(false),
  status: text("status").default("pending"), // "pending", "resolved"
  createdAt: timestamp("created_at").defaultNow(),
});

export const unsafeZones = pgTable("unsafe_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radius: integer("radius").default(100), // radius in meters
  reportCount: integer("report_count").default(0),
  riskLevel: text("risk_level").default("low"), // "low", "medium", "high"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
}).extend({
  latitude: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : undefined),
  longitude: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : undefined),
  datetime: z.union([z.string(), z.date()]).transform(val => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
});

export const insertUnsafeZoneSchema = createInsertSchema(unsafeZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.union([z.string(), z.number()]).transform(val => String(val)),
  longitude: z.union([z.string(), z.number()]).transform(val => String(val)),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type UnsafeZone = typeof unsafeZones.$inferSelect;
export type InsertUnsafeZone = z.infer<typeof insertUnsafeZoneSchema>;
