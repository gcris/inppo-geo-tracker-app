import * as SQLite from 'expo-sqlite';
import { Personnel, Vehicle, Schedule, VehicleLog } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('pnp_geo_tracker.db');
  
  // Self-heal: Drop old schema if rank table doesn't exist to ensure column synchronicity
  const rankTableExists = await db.getFirstAsync<{ count: number }>("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='rank';");
  if (!rankTableExists || rankTableExists.count === 0) {
    await db.execAsync(`
      DROP TABLE IF EXISTS personnel;
      DROP TABLE IF EXISTS unit;
      DROP TABLE IF EXISTS rank;
    `);
  }

  // 1. Create tables mimicking Room Entities
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rank (
      id TEXT PRIMARY KEY,
      rankName TEXT
    );

    CREATE TABLE IF NOT EXISTS unit (
      id TEXT PRIMARY KEY,
      unitName TEXT
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      badgeNumber TEXT,
      badge_number TEXT,
      rank TEXT,
      rank_id TEXT,
      fullname TEXT,
      unitId TEXT,
      unit_id TEXT,
      designation TEXT,
      phone_number TEXT,
      viber_number TEXT,
      email TEXT,
      password TEXT,
      isApproved INTEGER,
      is_approved INTEGER,
      role TEXT
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

  // Seed default PNP Personnel, Unit, Rank & Schedule data exactly like the Kotlin project does
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM personnel;');
  if (countResult && countResult.count === 0) {
    const mdpUnitId = '91a92e15-5ec2-4217-baaa-c81b95ff88be';
    await db.runAsync(`INSERT INTO unit (id, unitName) VALUES (?, ?);`, [mdpUnitId, 'Manila Police District (MPD)']);
    await db.runAsync(`INSERT INTO unit (id, unitName) VALUES (?, ?);`, ['92b005fe-1429-4654-8e12-32b005fe1429', 'Quezon City Police District (QCPD)']);
    
    // Seed ranks
    await db.runAsync(`INSERT INTO rank (id, rankName) VALUES (?, ?);`, ['Pat', 'Patrolman']);
    await db.runAsync(`INSERT INTO rank (id, rankName) VALUES (?, ?);`, ['PCpl', 'Police Corporal']);
    await db.runAsync(`INSERT INTO rank (id, rankName) VALUES (?, ?);`, ['PMSg', 'Police Master Sergeant']);

    // Seed the target officer only
    await db.runAsync(`INSERT INTO personnel (id, badgeNumber, badge_number, rank, rank_id, fullname, unitId, unit_id, designation, isApproved, is_approved, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
      '9a7bde06-a831-4db3-96b1-096bade8cc12',
      'PNP-4820-2026',
      'PNP-4820-2026',
      'PCpl',
      'PCpl',
      'Gerry Cris Cariaga',
      mdpUnitId,
      mdpUnitId,
      'Patrol Officer',
      1,
      1,
      'itsme.gerrycriscariaga@gmail.com',
      'password123',
      'patrol'
    ]);

    // Seed Vehicle Assignment
    await db.runAsync(`INSERT INTO vehicles (id, plateNumber, createdAt, personnelId, unitId, loadStatus, lastLoadUpdate) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      'eeca1d4a-67bf-46b4-b10c-d19602ca5aba',
      'PNP-EP-391',
      '2026-06-01T08:00:00Z',
      '9a7bde06-a831-4db3-96b1-096bade8cc12',
      mdpUnitId,
      'ACTIVE_PATROL',
      '2026-06-02T08:00:00Z'
    ]);

    // Seed Schedule details
    await db.runAsync(`INSERT INTO schedule (id, date, timeFrom, timeTo, sector, unitId, personnelId) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      'e6fcfe10-c0b0-4dbf-8182-b7bc6719ab21',
      new Date().toISOString().split('T')[0], // today's date dynamically
      '08:00',
      '17:00',
      'Sector 4 (Intramuros & Ermita - Foot Patrol Area)',
      mdpUnitId,
      '9a7bde06-a831-4db3-96b1-096bade8cc12'
    ]);
  }

  return db;
};

// --- Personnel Operations ---
export const getPersonnelByBadge = async (badgeNumber: string): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM personnel WHERE (badgeNumber = ? OR badge_number = ?) LIMIT 1', [badgeNumber, badgeNumber]);
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badge_number || row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unit_id || row.unitId,
    isApproved: (row.is_approved !== undefined ? row.is_approved : row.isApproved) === 1,
    role: row.role,
    email: row.email,
    password: row.password,
    phoneNumber: row.phone_number,
    viberNumber: row.viber_number,
    rank_id: row.rank_id,
    unit_id: row.unit_id,
    designation: row.designation
  };
};

export const getPersonnelByEmail = async (email: string): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM personnel WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badge_number || row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unit_id || row.unitId,
    isApproved: (row.is_approved !== undefined ? row.is_approved : row.isApproved) === 1,
    role: row.role,
    email: row.email,
    password: row.password,
    phoneNumber: row.phone_number,
    viberNumber: row.viber_number,
    rank_id: row.rank_id,
    unit_id: row.unit_id,
    designation: row.designation
  };
};

export const findCandidatePersonnel = async (
  badgeNumber: string,
  rankId: string,
  unitId: string,
  designation: string
): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  // Clean values for loose matching
  const bClean = badgeNumber.trim().toUpperCase();
  const rClean = rankId.trim();
  const uClean = unitId.trim();
  const dClean = designation.trim().toLowerCase();
  
  const row = await sqlite.getFirstAsync<any>(
    `SELECT * FROM personnel 
     WHERE (UPPER(badgeNumber) = ? OR UPPER(badge_number) = ?) 
       AND (LOWER(rank) = LOWER(?) OR LOWER(rank_id) = LOWER(?)) 
       AND (LOWER(unitId) = LOWER(?) OR LOWER(unit_id) = LOWER(?)) 
       AND LOWER(designation) = ? 
     LIMIT 1`,
    [bClean, bClean, rClean, rClean, uClean, uClean, dClean]
  );
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badge_number || row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unit_id || row.unitId,
    isApproved: (row.is_approved !== undefined ? row.is_approved : row.isApproved) === 1,
    role: row.role,
    email: row.email,
    password: row.password,
    phoneNumber: row.phone_number,
    viberNumber: row.viber_number,
    rank_id: row.rank_id,
    unit_id: row.unit_id,
    designation: row.designation
  };
};

export const registerPersonnel = async (
  id: string,
  email: string,
  password?: string,
  fullname?: string,
  phoneNumber?: string,
  viberNumber?: string
): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync(
    `UPDATE personnel 
     SET email = ?, password = ?, fullname = ?, phone_number = ?, viber_number = ?, isApproved = 0, is_approved = 0 
     WHERE id = ?`,
    [email.trim().toLowerCase(), password || '', fullname || '', phoneNumber || '', viberNumber || '', id]
  );
};

export const getRanks = async (): Promise<{ id: string; rankName: string }[]> => {
  const sqlite = await initDatabase();
  const rows = await sqlite.getAllAsync<{ id: string; rankName: string }>('SELECT * FROM rank ORDER BY rankName ASC');
  return rows || [];
};

export const getUnits = async (): Promise<{ id: string; unitName: string }[]> => {
  const sqlite = await initDatabase();
  const rows = await sqlite.getAllAsync<{ id: string; unitName: string }>('SELECT * FROM unit ORDER BY unitName ASC');
  return rows || [];
};

export const getPersonnelById = async (id: string): Promise<Personnel | null> => {
  const sqlite = await initDatabase();
  const row = await sqlite.getFirstAsync<any>('SELECT * FROM personnel WHERE id = ?', [id]);
  if (!row) return null;
  return {
    id: row.id,
    badgeNumber: row.badge_number || row.badgeNumber,
    rank: row.rank,
    fullname: row.fullname,
    unitId: row.unit_id || row.unitId,
    isApproved: (row.is_approved !== undefined ? row.is_approved : row.isApproved) === 1,
    role: row.role,
    email: row.email,
    password: row.password,
    phoneNumber: row.phone_number,
    viberNumber: row.viber_number,
    rank_id: row.rank_id,
    unit_id: row.unit_id,
    designation: row.designation
  };
};

export const savePersonnel = async (p: Personnel): Promise<void> => {
  const sqlite = await initDatabase();
  await sqlite.runAsync(
    `INSERT OR REPLACE INTO personnel (
      id, badgeNumber, badge_number, rank, rank_id, fullname, unitId, unit_id, designation, phone_number, viber_number, email, password, isApproved, is_approved, role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id, 
      p.badgeNumber, 
      p.badgeNumber, 
      p.rank || '', 
      p.rank_id || p.rank || '', 
      p.fullname || '', 
      p.unitId || '', 
      p.unit_id || p.unitId || '', 
      p.designation || '', 
      p.phone_number || p.phoneNumber || '', 
      p.viber_number || p.viberNumber || '', 
      p.email || '', 
      p.password || '', 
      p.isApproved ? 1 : 0, 
      p.isApproved ? 1 : 0, 
      p.role || 'patrol'
    ]
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
