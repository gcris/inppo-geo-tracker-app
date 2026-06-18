import * as SQLite from 'expo-sqlite';
import { Personnel, Vehicle, Schedule, VehicleLog } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('pnp_geo_tracker.db');
  
  // 1. Create tables mimicking Room Entities
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      badgeNumber TEXT,
      rank TEXT,
      fullname TEXT,
      unitId TEXT,
      isApproved INTEGER,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS unit (
      id TEXT PRIMARY KEY,
      unitName TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plateNumber TEXT,
      createdAt TEXT,
      personnelId TEXT,
      unitId TEXT,
      loadStatus TEXT,
      lastLoadUpdate TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicle_logs (
      id TEXT PRIMARY KEY,
      vehicleId TEXT,
      latitude REAL,
      longitude REAL,
      speed REAL,
      networkSignal INTEGER,
      capturedAt TEXT,
      isSynced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id TEXT PRIMARY KEY,
      date TEXT,
      timeFrom TEXT,
      timeTo TEXT,
      sector TEXT,
      unitId TEXT,
      personnelId TEXT
    );
  `);

  // Seed default PNP Personnel, Unit & Schedule data exactly like the Kotlin project does
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM personnel;');
  if (countResult && countResult.count === 0) {
    await db.runAsync(`INSERT INTO unit (id, unitName) VALUES (?, ?);`, ['unit-manila-01', 'MANILA DISTRICT FOOT PATROL UNIT-4']);
    
    await db.runAsync(`INSERT INTO personnel (id, badgeNumber, rank, fullname, unitId, isApproved, role) VALUES (?, ?, ?, ?, ?, ?, ?);`, [
      'pnp-badge-7448',
      '744874',
      'PMASTER SGT',
      'GERYCRIS S. CARIAGA',
      'unit-manila-01',
      1,
      'PATROL_OFFICER'
    ]);

    await db.runAsync(`INSERT INTO schedule (id, date, timeFrom, timeTo, sector, unitId, personnelId) VALUES (?, ?, ?, ?, ?, ?, ?);`, [
      'sched-today',
      new Date().toISOString().split('T')[0], // yyyy-MM-dd
      '08:00',
      '17:00',
      'Sector 4 (Intramuros & Ermita Foot Patrol district)',
      'unit-manila-01',
      'pnp-badge-7448'
    ]);
  }

  return db;
};

// --- Personnel Operations ---
export const getPersonnelByBadge = async (badgeNumber: string): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM personnel WHERE badgeNumber = ? LIMIT 1', [badgeNumber]);
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unitId,
    isApproved: row.isApproved === 1,
    role: row.role
  };
};

export const getPersonnelById = async (id: string): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM personnel WHERE id = ?', [id]);
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unitId,
    isApproved: row.isApproved === 1,
    role: row.role
  };
};

export const savePersonnel = async (p: Personnel): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync(
    `INSERT OR REPLACE INTO personnel (id, badgeNumber, rank, fullname, unitId, isApproved, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.badgeNumber, p.rank, p.fullname, p.unitId, p.isApproved ? 1 : 0, p.role]
  );
};

// --- Unit Operations ---
export const getUnitById = async (unitId: string): Promise<any> => {
  const sqlite = await initDatabase();
  return await sqlite.getFirstAsync<any>('SELECT * FROM unit WHERE id = ?', [unitId]);
};

// --- Vehicle Operations ---
export const getVehicleByPersonnel = async (personnelId: string): Promise<Vehicle | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM vehicles WHERE personnelId = ? LIMIT 1', [personnelId]);
  if (!row) return null;
  return {
    id: row.id,
    plateNumber: row.plateNumber,
    createdAt: row.createdAt,
    personnelId: row.personnelId,
    unitId: row.unitId,
    loadStatus: row.loadStatus,
    lastLoadUpdate: row.lastLoadUpdate,
  };
};

export const insertVehicle = async (v: Vehicle): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync(
    `INSERT OR REPLACE INTO vehicles (id, plateNumber, createdAt, personnelId, unitId, loadStatus, lastLoadUpdate) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [v.id, v.plateNumber, v.createdAt, v.personnelId, v.unitId, v.loadStatus, v.lastLoadUpdate]
  );
};

// --- Schedule Operations ---
export const getScheduleByPersonnel = async (personnelId: string): Promise<Schedule | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM schedule WHERE personnelId = ? LIMIT 1', [personnelId]);
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    timeFrom: row.timeFrom,
    timeTo: row.timeTo,
    sector: row.sector,
    unitId: row.unitId,
    personnelId: row.personnelId,
  };
};

// --- Log Operations ---
export const insertVehicleLog = async (log: VehicleLog): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync(
    `INSERT INTO vehicle_logs (id, vehicleId, latitude, longitude, speed, networkSignal, capturedAt, isSynced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [log.id, log.vehicleId, log.latitude, log.longitude, log.speed, log.networkSignal, log.capturedAt]
  );
};

export const getUnsyncedLogs = async (): Promise<VehicleLog[]> => {
  const sqlite = await initDatabase();
  const rows = await sqlite.getAllAsync<any>('SELECT * FROM vehicle_logs WHERE isSynced = 0 ORDER BY capturedAt ASC');
  return rows.map(r => ({
    id: r.id,
    vehicleId: r.vehicleId,
    latitude: r.latitude,
    longitude: r.longitude,
    speed: r.speed,
    networkSignal: r.networkSignal,
    capturedAt: r.capturedAt,
    isSynced: r.isSynced === 1
  }));
};

export const getLatestLogs = async (limit = 100): Promise<VehicleLog[]> => {
  const sqlite = await initDatabase();
  const rows = await sqlite.getAllAsync<any>(`SELECT * FROM vehicle_logs ORDER BY capturedAt DESC LIMIT ?`, [limit]);
  return rows.map(r => ({
    id: r.id,
    vehicleId: r.vehicleId,
    latitude: r.latitude,
    longitude: r.longitude,
    speed: r.speed,
    networkSignal: r.networkSignal,
    capturedAt: r.capturedAt,
    isSynced: r.isSynced === 1
  }));
};

export const getUnsyncedCount = async (): Promise<number> => {
  const sqlite = await initDatabase();
  const res = await sqlite.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM vehicle_logs WHERE isSynced = 0');
  return res ? res.count : 0;
};

export const markLogsAsSynced = async (logIds: string[]): Promise<void> => {
  if (logIds.length === 0) return;
  const sqlite = await initDatabase();
  const placeholders = logIds.map(() => '?').join(',');
  await sqlite.runAsync(`UPDATE vehicle_logs SET isSynced = 1 WHERE id IN (${placeholders})`, logIds);
};

export const cleanSyncedLogs = async (): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync('DELETE FROM vehicle_logs WHERE isSynced = 1');
};
