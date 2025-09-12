import { users, reports, unsafeZones, type User, type InsertUser, type Report, type InsertReport, type UnsafeZone, type InsertUnsafeZone } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  updateUserProfile(id: string, data: { fullName?: string; phone?: string; emergencyContact?: string }): Promise<User>;

  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<(Report & { user?: User })[]>;
  getUserReports(userId: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  deleteReport(id: string): Promise<void>;
  updateReportStatus(id: string, status: string): Promise<Report>;

  // Unsafe zone operations
  createUnsafeZone(zone: InsertUnsafeZone): Promise<UnsafeZone>;
  getAllUnsafeZones(): Promise<UnsafeZone[]>;
  updateZoneReportCount(zoneId: string, count: number): Promise<void>;
  deleteUnsafeZone(id: string): Promise<void>;
  getZonesWithReportCounts(): Promise<UnsafeZone[]>;
  createOrUpdateZone(data: { name: string; latitude: string; longitude: string; radius?: number }): Promise<UnsafeZone>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'user')).orderBy(desc(users.createdAt));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserProfile(id: string, data: { fullName?: string; phone?: string; emergencyContact?: string }): Promise<User> {
    console.log('Storage: Updating user profile for ID:', id);
    console.log('Storage: Update data:', data);
    
    try {
      const [user] = await db.update(users)
        .set({
          fullName: data.fullName,
          phone: data.phone,
          emergencyContact: data.emergencyContact,
        })
        .where(eq(users.id, id))
        .returning();
      
      if (!user) {
        throw new Error('User not found or update failed');
      }
      
      console.log('Storage: Profile updated successfully:', user.id);
      return user;
    } catch (error) {
      console.error('Storage: Error updating user profile:', error);
      throw error;
    }
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async getAllReports(): Promise<(Report & { user?: User })[]> {
    const result = await db
      .select({
        report: reports,
        user: users,
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .orderBy(desc(reports.createdAt));

    return result.map(row => ({
      ...row.report,
      user: row.user || undefined,
    }));
  }

  async getUserReports(userId: string): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async updateReportStatus(id: string, status: string): Promise<Report> {
    const [report] = await db.update(reports).set({ status }).where(eq(reports.id, id)).returning();
    return report;
  }

  async createUnsafeZone(insertZone: InsertUnsafeZone): Promise<UnsafeZone> {
    const [zone] = await db.insert(unsafeZones).values(insertZone).returning();
    return zone;
  }

  async getAllUnsafeZones(): Promise<UnsafeZone[]> {
    return await db.select().from(unsafeZones).orderBy(desc(unsafeZones.createdAt));
  }

  async updateZoneReportCount(zoneId: string, count: number): Promise<void> {
    let riskLevel = 'low';
    if (count >= 15) riskLevel = 'high';
    else if (count >= 6) riskLevel = 'medium';
    else if (count >= 4) riskLevel = 'low';

    await db.update(unsafeZones)
      .set({ 
        reportCount: count, 
        riskLevel,
        updatedAt: new Date()
      })
      .where(eq(unsafeZones.id, zoneId));
  }

  async deleteUnsafeZone(id: string): Promise<void> {
    await db.delete(unsafeZones).where(eq(unsafeZones.id, id));
  }

  async createOrUpdateZone(data: { name: string; latitude: string; longitude: string; radius?: number }): Promise<UnsafeZone> {
    // Check if a zone already exists near this location
    const existingZones = await db.select().from(unsafeZones);
    
    for (const zone of existingZones) {
      const latDiff = Math.abs(Number(zone.latitude) - Number(data.latitude));
      const lngDiff = Math.abs(Number(zone.longitude) - Number(data.longitude));
      
      // If within 0.005 degrees (~500m), update existing zone
      if (latDiff < 0.005 && lngDiff < 0.005) {
        const newCount = (zone.reportCount || 0) + 1;
        await this.updateZoneReportCount(zone.id, newCount);
        return zone;
      }
    }
    
    // Create new zone
    const newZone = await this.createUnsafeZone({
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius || 100,
      reportCount: 1,
      riskLevel: 'low'
    });
    
    return newZone;
  }

  async getZonesWithReportCounts(): Promise<UnsafeZone[]> {
    // Get zones with updated report counts based on actual approved reports within radius
    const zones = await db.select().from(unsafeZones);
    
    for (const zone of zones) {
      // Count approved reports within zone radius
      const reportsInZone = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(reports)
        .where(sql`
          ${reports.status} = 'approved' AND
          ABS(CAST(${reports.latitude} AS DECIMAL) - CAST(${zone.latitude} AS DECIMAL)) < 0.01 
          AND ABS(CAST(${reports.longitude} AS DECIMAL) - CAST(${zone.longitude} AS DECIMAL)) < 0.01
        `);
      
      const count = Number(reportsInZone[0]?.count || 0);
      await this.updateZoneReportCount(zone.id, count);
    }
    
    return await this.getAllUnsafeZones();
  }
}

export const storage = new DatabaseStorage();
