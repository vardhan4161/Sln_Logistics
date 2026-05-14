import React, { createContext, useContext, useCallback } from "react";
import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";

console.log("DATABASE_CONTEXT_LOADED_v4_FINAL_ANNEXURE");

export interface Location { id: number; name: string; }
export interface Vehicle { id: number; vehicle_no: string; }
export interface Trip {
  id: number; serial_no: number; trip_date: string; from_location: string; to_location: string;
  vehicle_no: string; chargeable_weight: number; rate: number; hamali: number; total_freight: number; created_at: string;
}
export interface Route {
  id: number; from_location: string; to_location: string; weight_mt: number; rate: number; hamali: number;
}

interface DBContextType {
  getLocations: () => Location[];
  addLocation: (name: string) => Location | null;
  deleteLocation: (id: number) => void;
  getVehicles: () => Vehicle[];
  addVehicle: (vehicle_no: string) => Vehicle | null;
  deleteVehicle: (id: number) => void;
  getTrips: () => Trip[];
  addTrip: (trip: Omit<Trip, "id" | "serial_no" | "created_at">) => Trip;
  updateTrip: (id: number, trip: Omit<Trip, "id" | "serial_no" | "created_at">) => void;
  deleteTrip: (id: number) => void;
  getRoutes: () => Route[];
  addRoute: (r: Omit<Route, "id">) => Route | null;
  updateRoute: (id: number, r: Omit<Route, "id">) => void;
  deleteRoute: (id: number) => void;
  lookupRouteRate: (from: string, to: string, weight: number) => { rate: number; hamali: number } | null;
  getNextInvoiceNo: (monthKey: string) => string;
}

const DBContext = createContext<DBContextType | null>(null);

const SEED_VEHICLES = [
  "TG12T6078", "TS12UC3042", "TS06UA7249", "TS05UA0781", "TG08T9023",
  "AP28TA4481", "AP29TB9031", "TS07UA1111", "TS09UB2222", "TG10TC3333",
  "AP31TA4444", "TS11UD5555", "TG07TE6666", "AP09TB7777"
];

export async function initDB(db: any): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_no TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_no INTEGER NOT NULL,
      trip_date TEXT NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      vehicle_no TEXT NOT NULL,
      chargeable_weight REAL NOT NULL,
      rate REAL NOT NULL,
      hamali REAL NOT NULL,
      total_freight REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      weight_mt REAL NOT NULL,
      rate REAL NOT NULL,
      hamali REAL NOT NULL,
      UNIQUE(from_location, to_location, weight_mt)
    );
    CREATE TABLE IF NOT EXISTS invoice_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_key TEXT UNIQUE NOT NULL,
      last_seq INTEGER NOT NULL DEFAULT 0
    );
  `);

  const meta = await db.getFirstAsync("SELECT value FROM app_meta WHERE key = 'seeded_annexure_v2'");
  if (!meta) {
    // PURGE OLD ROUTES
    await db.execAsync("DELETE FROM routes;");
    
    // SEED LOCATIONS
    const locs = [
      'IIL-Gachibowli', 'RGI Airport', 'IIL-Karkapatla', 'IIL-Uppal', 
      'IIL-Cherlapally', 'Potential-ALEAP', 'Jubilee Hills'
    ];
    for (const l of locs) await db.runAsync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [l]);
    
    // SEED VEHICLES
    for (const v of SEED_VEHICLES) await db.runAsync("INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)", [v]);

    // SEED ROUTES FROM ANNEXURE
    const hamaliMap: any = { 1.0: 1200, 3.0: 2400, 6.0: 3600, 9.0: 6000, 12.0: 7200 };
    
    const annexure = [
      // 1. Gachibowli Plant
      { f:'IIL-Gachibowli', t:'RGI Airport', r1:2800, r3:4000, r6:6500 },
      { f:'IIL-Gachibowli', t:'IIL-Karkapatla', r1:4200, r3:5600, r6:6900 },
      { f:'IIL-Gachibowli', t:'IIL-Uppal', r1:2900, r3:4500, r6:6000 },
      { f:'IIL-Gachibowli', t:'IIL-Cherlapally', r1:3000, r3:4800, r6:6500 },
      { f:'IIL-Gachibowli', t:'Potential-ALEAP', r1:2800, r3:4300, r6:6000 },
      
      // 6. Karkapatla Plant
      { f:'IIL-Karkapatla', t:'RGI Airport', r1:5500, r3:8000, r6:9000, r9:9500, r12:9800 },
      { f:'IIL-Karkapatla', t:'IIL-Uppal', r1:3500, r3:4900, r6:5900, r9:6800, r12:7500 },
      { f:'IIL-Karkapatla', t:'IIL-Gachibowli', r1:3500, r3:5000, r6:6200 },
      { f:'IIL-Karkapatla', t:'IIL-Cherlapally', r1:3400, r3:4800, r6:5800, r9:6300, r12:7500 },
      { f:'IIL-Karkapatla', t:'Potential-ALEAP', r1:3400, r3:4800, r6:5800, r9:6300, r12:7500 },
      
      // 11. Aleap
      { f:'Potential-ALEAP', t:'RGI Airport', r1:4000, r3:5000, r6:6500, r9:8500, r12:9500 },
      { f:'Potential-ALEAP', t:'IIL-Uppal', r1:4200, r3:5500, r6:7500, r9:8500, r12:9000 },
      { f:'Potential-ALEAP', t:'IIL-Gachibowli', r1:4000, r3:5200, r6:6500 },
      { f:'Potential-ALEAP', t:'IIL-Karkapatla', r1:4000, r3:5200, r6:7500, r9:8500, r12:9200 },
      { f:'Potential-ALEAP', t:'IIL-Cherlapally', r1:4000, r3:5500, r6:7500, r9:8500, r12:9200 },
      
      // 16. Cherlapally
      { f:'IIL-Cherlapally', t:'IIL-Karkapatla', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
      { f:'IIL-Cherlapally', t:'IIL-Gachibowli', r1:4500, r3:6000, r6:7500 },
      { f:'IIL-Cherlapally', t:'RGI Airport', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
      { f:'IIL-Cherlapally', t:'IIL-Uppal', r1:2800, r3:4000, r6:6500, r9:7500, r12:8500 },
      { f:'IIL-Cherlapally', t:'Potential-ALEAP', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
      
      // 21. Uppal
      { f:'IIL-Uppal', t:'IIL-Gachibowli', r1:2800, r3:4000, r6:6500 },
      { f:'IIL-Uppal', t:'IIL-Karkapatla', r1:3500, r3:4500, r6:6500, r9:8500, r12:10500 },
      { f:'IIL-Uppal', t:'Potential-ALEAP', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
      { f:'IIL-Uppal', t:'Jubilee Hills', r1:2800, r3:4000, r6:6500 },
      { f:'IIL-Uppal', t:'IIL-Cherlapally', r1:2800, r3:4000, r6:6500 },
    ];

    for (const row of annexure) {
      if (row.r1) await db.runAsync("INSERT INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?,?,?,?,?)", [row.f, row.t, 1.0, row.r1, hamaliMap[1.0]]);
      if (row.r3) await db.runAsync("INSERT INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?,?,?,?,?)", [row.f, row.t, 3.0, row.r3, hamaliMap[3.0]]);
      if (row.r6) await db.runAsync("INSERT INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?,?,?,?,?)", [row.f, row.t, 6.0, row.r6, hamaliMap[6.0]]);
      if ((row as any).r9) await db.runAsync("INSERT INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?,?,?,?,?)", [row.f, row.t, 9.0, (row as any).r9, hamaliMap[9.0]]);
      if ((row as any).r12) await db.runAsync("INSERT INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?,?,?,?,?)", [row.f, row.t, 12.0, (row as any).r12, hamaliMap[12.0]]);
    }

    // LEGACY MIGRATION: Normalize existing trip names
    const normalizationMap: Record<string, string> = {
      'Gachibowli Plant': 'IIL-Gachibowli',
      'IIL-Gachhibowli': 'IIL-Gachibowli',
      'RGIA - Airport': 'RGI Airport',
      'RGAI-Shamshabad': 'RGI Airport',
      'Karkapatla Plant': 'IIL-Karkapatla',
      'Uppal Industrial Area': 'IIL-Uppal',
      'Aleap, Pragathi Nagar': 'Potential-ALEAP',
      'HO, Jubilee Hills': 'Jubilee Hills',
      'Sanzyem': 'SANZYME',
      'Turkapally': 'SANZYME-Turkapally'
    };
    for (const [oldName, newName] of Object.entries(normalizationMap)) {
      await db.runAsync("UPDATE trips SET from_location = ? WHERE from_location = ?", [newName, oldName]);
      await db.runAsync("UPDATE trips SET to_location = ? WHERE to_location = ?", [newName, oldName]);
    }

    await db.runAsync("INSERT INTO app_meta (key, value) VALUES ('seeded_annexure_v2', 'true')");
  }
}

function DatabaseProviderInner({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  const getLocations = useCallback(() => db.getAllSync<Location>("SELECT * FROM locations ORDER BY name ASC"), [db]);
  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      db.runSync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [trimmed]);
      return db.getFirstSync<Location>("SELECT * FROM locations WHERE name = ?", [trimmed]);
    } catch { return null; }
  }, [db]);
  const deleteLocation = useCallback((id: number) => db.runSync("DELETE FROM locations WHERE id = ?", [id]), [db]);

  const getVehicles = useCallback(() => db.getAllSync<Vehicle>("SELECT * FROM vehicles ORDER BY vehicle_no ASC"), [db]);
  const addVehicle = useCallback((v: string) => {
    const trimmed = v.trim().toUpperCase();
    if (!trimmed) return null;
    try {
      db.runSync("INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)", [trimmed]);
      return db.getFirstSync<Vehicle>("SELECT * FROM vehicles WHERE vehicle_no = ?", [trimmed]);
    } catch { return null; }
  }, [db]);
  const deleteVehicle = useCallback((id: number) => db.runSync("DELETE FROM vehicles WHERE id = ?", [id]), [db]);

  const getTrips = useCallback(() => db.getAllSync<Trip>("SELECT * FROM trips ORDER BY trip_date DESC, serial_no DESC"), [db]);
  const addTrip = useCallback((tripData: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    const created_at = new Date().toISOString();
    const max = db.getFirstSync<{ max_sn: number }>("SELECT MAX(serial_no) as max_sn FROM trips");
    const serial_no = (max?.max_sn ?? 0) + 1;
    const res = db.runSync(
      "INSERT INTO trips (serial_no, trip_date, from_location, to_location, vehicle_no, chargeable_weight, rate, hamali, total_freight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [serial_no, tripData.trip_date, tripData.from_location, tripData.to_location, tripData.vehicle_no, tripData.chargeable_weight, tripData.rate, tripData.hamali, tripData.total_freight, created_at]
    );
    return db.getFirstSync<Trip>("SELECT * FROM trips WHERE id = ?", [res.lastInsertRowId]) as Trip;
  }, [db]);
  const updateTrip = useCallback((id: number, t: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    db.runSync(
      "UPDATE trips SET trip_date=?, from_location=?, to_location=?, vehicle_no=?, chargeable_weight=?, rate=?, hamali=?, total_freight=? WHERE id=?",
      [t.trip_date, t.from_location, t.to_location, t.vehicle_no, t.chargeable_weight, t.rate, t.hamali, t.total_freight, id]
    );
  }, [db]);
  const deleteTrip = useCallback((id: number) => db.runSync("DELETE FROM trips WHERE id = ?", [id]), [db]);

  const getRoutes = useCallback(() => db.getAllSync<Route>("SELECT * FROM routes ORDER BY from_location ASC, weight_mt ASC"), [db]);
  const addRoute = useCallback((r: Omit<Route, "id">) => {
    try {
      const res = db.runSync("INSERT OR REPLACE INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?, ?, ?, ?, ?)", [r.from_location, r.to_location, r.weight_mt, r.rate, r.hamali]);
      return db.getFirstSync<Route>("SELECT * FROM routes WHERE id = ?", [res.lastInsertRowId]);
    } catch { return null; }
  }, [db]);
  const updateRoute = useCallback((id: number, r: Omit<Route, "id">) => {
    db.runSync("UPDATE routes SET from_location=?, to_location=?, weight_mt=?, rate=?, hamali=? WHERE id=?", [r.from_location, r.to_location, r.weight_mt, r.rate, r.hamali, id]);
  }, [db]);
  const deleteRoute = useCallback((id: number) => db.runSync("DELETE FROM routes WHERE id = ?", [id]), [db]);

  const lookupRouteRate = useCallback((from: string, to: string, weight: number) => {
    try {
      const exact = db.getFirstSync<{ rate: number; hamali: number }>("SELECT rate, hamali FROM routes WHERE from_location=? AND to_location=? AND weight_mt=?", [from, to, weight]);
      if (exact) return exact;
      return db.getFirstSync<{ rate: number; hamali: number }>("SELECT rate, hamali FROM routes WHERE from_location=? AND to_location=? ORDER BY ABS(weight_mt - ?) ASC LIMIT 1", [from, to, weight]);
    } catch { return null; }
  }, [db]);

  const getNextInvoiceNo = useCallback((monthKey: string) => {
    const seq = db.getFirstSync<{ last_seq: number }>("SELECT last_seq FROM invoice_sequences WHERE month_key = ?", [monthKey]);
    const nextSeq = (seq?.last_seq ?? 0) + 1;
    db.runSync("INSERT INTO invoice_sequences (month_key, last_seq) VALUES (?, ?) ON CONFLICT(month_key) DO UPDATE SET last_seq = ?", [monthKey, nextSeq, nextSeq]);
    return `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
  }, [db]);

  return (
    <DBContext.Provider value={{
      getLocations, addLocation, deleteLocation,
      getVehicles, addVehicle, deleteVehicle,
      getTrips, addTrip, updateTrip, deleteTrip,
      getRoutes, addRoute, updateRoute, deleteRoute, lookupRouteRate,
      getNextInvoiceNo,
    }}>
      {children}
    </DBContext.Provider>
  );
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="sln_logistics.db" onInit={initDB}>
      <DatabaseProviderInner>{children}</DatabaseProviderInner>
    </SQLiteProvider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (!context) throw new Error("useDB must be used within a DatabaseProvider");
  return context;
}
