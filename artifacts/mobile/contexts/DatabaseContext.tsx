import React, { createContext, useContext, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";

export interface Location {
  id: number;
  name: string;
}

export interface Vehicle {
  id: number;
  vehicle_no: string;
}

export interface Trip {
  id: number;
  serial_no: number;
  trip_date: string;
  from_location: string;
  to_location: string;
  vehicle_no: string;
  chargeable_weight: number;
  rate: number;
  hamali: number;
  total_freight: number;
  created_at: string;
}

export interface Route {
  id: number;
  from_location: string;
  to_location: string;
  weight_mt: number;
  rate: number;
  hamali: number;
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
  // Routes (rate table)
  getRoutes: () => Route[];
  addRoute: (r: Omit<Route, "id">) => Route | null;
  updateRoute: (id: number, r: Omit<Route, "id">) => void;
  deleteRoute: (id: number) => void;
  getRouteRate: (from: string, to: string, weight: number) => { rate: number; hamali: number } | null;
  // Invoice sequence
  getNextInvoiceNo: (monthKey: string) => string;
}

const SEED_LOCATIONS = [
  "Gubba-Medchal", "IIL-Karkapatla", "Priya feeds - Cherlapally", "SANZYME",
  "ARC Transport Medchal", "BIO CHEMICHAL SANATHNAGAR", "Potential-ALEAP",
  "Bollaram", "Sainath-Jeedimetla", "IIL-Uppal", "IIL-Gachibowli",
  "RGIA-Airport", "RGI Airport", "ICD-Sanathnagar", "Jiyaguda", "Cherlapally",
  "Medchal", "Uppal", "Gachibowli", "Airport", "Sanathnagar", "Jeedimetla", "ALEAP",
];

const SEED_VEHICLES = [
  "TG12T6078", "TS12UC3042", "TS06UA7249", "TS05UA0781", "TG08T9023",
  "AP28TA4481", "AP29TB9031", "TS07UA1111", "TS09UB2222", "TG10TC3333",
  "AP31TA4444", "TS11UD5555", "TG07TE6666", "AP09TB7777",
];

// Pre-loaded rate table from historical data
const SEED_ROUTES: Omit<Route, "id">[] = [
  { from_location: "Gubba-Medchal", to_location: "Sainath-Jeedimetla", weight_mt: 6, rate: 7500, hamali: 3600 },
  { from_location: "Gubba-Medchal", to_location: "Potential-ALEAP", weight_mt: 6, rate: 8500, hamali: 3600 },
  { from_location: "Gubba-Medchal", to_location: "IIL-Gachibowli", weight_mt: 6, rate: 8500, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Uppal", weight_mt: 6, rate: 5900, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Uppal", weight_mt: 3, rate: 4900, hamali: 2400 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Uppal", weight_mt: 2, rate: 4900, hamali: 1200 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Uppal", weight_mt: 1, rate: 3500, hamali: 1000 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Gachibowli", weight_mt: 6, rate: 6200, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Gachibowli", weight_mt: 3, rate: 5000, hamali: 1200 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Gachibowli", weight_mt: 2, rate: 4900, hamali: 1200 },
  { from_location: "IIL-Karkapatla", to_location: "IIL-Gachibowli", weight_mt: 1, rate: 3500, hamali: 600 },
  { from_location: "IIL-Karkapatla", to_location: "Sainath-Jeedimetla", weight_mt: 6, rate: 7500, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "Potential-ALEAP", weight_mt: 6, rate: 5800, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "Potential-ALEAP", weight_mt: 3, rate: 4800, hamali: 2400 },
  { from_location: "IIL-Karkapatla", to_location: "Potential-ALEAP", weight_mt: 2, rate: 4800, hamali: 1200 },
  { from_location: "IIL-Karkapatla", to_location: "Potential-ALEAP", weight_mt: 1, rate: 3400, hamali: 1200 },
  { from_location: "IIL-Karkapatla", to_location: "RGI Airport", weight_mt: 6, rate: 9000, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "RGI Airport", weight_mt: 1, rate: 5500, hamali: 600 },
  { from_location: "IIL-Karkapatla", to_location: "RGIA-Airport", weight_mt: 6, rate: 9000, hamali: 3600 },
  { from_location: "IIL-Karkapatla", to_location: "RGIA-Airport", weight_mt: 3, rate: 8000, hamali: 1200 },
  { from_location: "Sainath-Jeedimetla", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 7500, hamali: 3600 },
  { from_location: "Sainath-Jeedimetla", to_location: "IIL-Karkapatla", weight_mt: 4, rate: 7500, hamali: 2400 },
  { from_location: "Sainath-Jeedimetla", to_location: "Potential-ALEAP", weight_mt: 6, rate: 5900, hamali: 3600 },
  { from_location: "Sainath-Jeedimetla", to_location: "Potential-ALEAP", weight_mt: 3, rate: 4800, hamali: 1200 },
  { from_location: "Potential-ALEAP", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 7500, hamali: 3600 },
  { from_location: "Potential-ALEAP", to_location: "IIL-Karkapatla", weight_mt: 4, rate: 7500, hamali: 2400 },
  { from_location: "Potential-ALEAP", to_location: "IIL-Karkapatla", weight_mt: 3, rate: 5200, hamali: 2400 },
  { from_location: "Potential-ALEAP", to_location: "IIL-Karkapatla", weight_mt: 2, rate: 5200, hamali: 1200 },
  { from_location: "Potential-ALEAP", to_location: "Sainath-Jeedimetla", weight_mt: 6, rate: 5900, hamali: 3600 },
  { from_location: "Potential-ALEAP", to_location: "Sainath-Jeedimetla", weight_mt: 3, rate: 4900, hamali: 1200 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 7500, hamali: 3600 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Karkapatla", weight_mt: 4, rate: 7500, hamali: 3600 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Karkapatla", weight_mt: 3, rate: 6000, hamali: 1200 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Karkapatla", weight_mt: 2, rate: 6000, hamali: 1200 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Karkapatla", weight_mt: 1, rate: 4500, hamali: 600 },
  { from_location: "Priya feeds - Cherlapally", to_location: "IIL-Gachibowli", weight_mt: 6, rate: 6200, hamali: 3600 },
  { from_location: "SANZYME", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 5800, hamali: 3600 },
  { from_location: "IIL-Gachibowli", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 6200, hamali: 3600 },
  { from_location: "IIL-Gachibowli", to_location: "IIL-Karkapatla", weight_mt: 1, rate: 4200, hamali: 600 },
  { from_location: "IIL-Gachibowli", to_location: "IIL-Uppal", weight_mt: 6, rate: 6000, hamali: 3600 },
  { from_location: "IIL-Uppal", to_location: "IIL-Karkapatla", weight_mt: 6, rate: 6500, hamali: 3600 },
  { from_location: "BIO CHEMICHAL SANATHNAGAR", to_location: "IIL-Karkapatla", weight_mt: 2, rate: 4900, hamali: 1200 },
  { from_location: "BIO CHEMICHAL SANATHNAGAR", to_location: "IIL-Karkapatla", weight_mt: 1, rate: 3500, hamali: 600 },
  { from_location: "ARC Transport Medchal", to_location: "IIL-Karkapatla", weight_mt: 1, rate: 3500, hamali: 600 },
];

export async function initDB(db: any): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_no TEXT UNIQUE NOT NULL
    );
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

  const meta = await db.getFirstAsync(
    "SELECT value FROM app_meta WHERE key = 'seeded'"
  );
  if (!meta) {
    for (const name of SEED_LOCATIONS) {
      await db.runAsync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [name]);
    }
    for (const vehicle_no of SEED_VEHICLES) {
      await db.runAsync("INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)", [vehicle_no]);
    }
    for (const r of SEED_ROUTES) {
      await db.runAsync(
        "INSERT OR IGNORE INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?, ?, ?, ?, ?)",
        [r.from_location, r.to_location, r.weight_mt, r.rate, r.hamali]
      );
    }
    await db.runAsync("INSERT INTO app_meta (key, value) VALUES ('seeded', 'true')");
  }
}

const DBContext = createContext<DBContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  // ── Locations ──────────────────────────────────────────────────────────────
  const getLocations = useCallback((): Location[] => {
    return db.getAllSync("SELECT * FROM locations ORDER BY name ASC");
  }, [db]);

  const addLocation = useCallback((name: string): Location | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const result = db.runSync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [trimmed]);
      if (result.changes > 0) {
        return db.getFirstSync<Location>("SELECT * FROM locations WHERE id = ?", [result.lastInsertRowId]) as Location;
      }
      return db.getFirstSync<Location>("SELECT * FROM locations WHERE name = ?", [trimmed]) as Location;
    } catch { return null; }
  }, [db]);

  const deleteLocation = useCallback((id: number) => {
    db.runSync("DELETE FROM locations WHERE id = ?", [id]);
  }, [db]);

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const getVehicles = useCallback((): Vehicle[] => {
    return db.getAllSync("SELECT * FROM vehicles ORDER BY vehicle_no ASC");
  }, [db]);

  const addVehicle = useCallback((vehicle_no: string): Vehicle | null => {
    const trimmed = vehicle_no.trim().toUpperCase();
    if (!trimmed) return null;
    try {
      const result = db.runSync("INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)", [trimmed]);
      if (result.changes > 0) {
        return db.getFirstSync<Vehicle>("SELECT * FROM vehicles WHERE id = ?", [result.lastInsertRowId]) as Vehicle;
      }
      return db.getFirstSync<Vehicle>("SELECT * FROM vehicles WHERE vehicle_no = ?", [trimmed]) as Vehicle;
    } catch { return null; }
  }, [db]);

  const deleteVehicle = useCallback((id: number) => {
    db.runSync("DELETE FROM vehicles WHERE id = ?", [id]);
  }, [db]);

  // ── Trips ──────────────────────────────────────────────────────────────────
  const getTrips = useCallback((): Trip[] => {
    return db.getAllSync("SELECT * FROM trips ORDER BY created_at DESC");
  }, [db]);

  const addTrip = useCallback((tripData: Omit<Trip, "id" | "serial_no" | "created_at">): Trip => {
    const created_at = new Date().toISOString();
    const maxResult = db.getFirstSync<{ max_sn: number }>("SELECT MAX(serial_no) as max_sn FROM trips");
    const serial_no = (maxResult?.max_sn ?? 0) + 1;
    const result = db.runSync(
      "INSERT INTO trips (serial_no, trip_date, from_location, to_location, vehicle_no, chargeable_weight, rate, hamali, total_freight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [serial_no, tripData.trip_date, tripData.from_location, tripData.to_location, tripData.vehicle_no, tripData.chargeable_weight, tripData.rate, tripData.hamali, tripData.total_freight, created_at]
    );
    return db.getFirstSync<Trip>("SELECT * FROM trips WHERE id = ?", [result.lastInsertRowId]) as Trip;
  }, [db]);

  const updateTrip = useCallback((id: number, tripData: Omit<Trip, "id" | "serial_no" | "created_at">): void => {
    db.runSync(
      "UPDATE trips SET trip_date=?, from_location=?, to_location=?, vehicle_no=?, chargeable_weight=?, rate=?, hamali=?, total_freight=? WHERE id=?",
      [tripData.trip_date, tripData.from_location, tripData.to_location, tripData.vehicle_no, tripData.chargeable_weight, tripData.rate, tripData.hamali, tripData.total_freight, id]
    );
  }, [db]);

  const deleteTrip = useCallback((id: number) => {
    db.runSync("DELETE FROM trips WHERE id = ?", [id]);
  }, [db]);

  // ── Routes ─────────────────────────────────────────────────────────────────
  const getRoutes = useCallback((): Route[] => {
    return db.getAllSync("SELECT * FROM routes ORDER BY from_location ASC, to_location ASC, weight_mt ASC");
  }, [db]);

  const addRoute = useCallback((r: Omit<Route, "id">): Route | null => {
    try {
      const result = db.runSync(
        "INSERT OR REPLACE INTO routes (from_location, to_location, weight_mt, rate, hamali) VALUES (?, ?, ?, ?, ?)",
        [r.from_location, r.to_location, r.weight_mt, r.rate, r.hamali]
      );
      return db.getFirstSync<Route>("SELECT * FROM routes WHERE id = ?", [result.lastInsertRowId]) as Route;
    } catch { return null; }
  }, [db]);

  const updateRoute = useCallback((id: number, r: Omit<Route, "id">): void => {
    db.runSync(
      "UPDATE routes SET from_location=?, to_location=?, weight_mt=?, rate=?, hamali=? WHERE id=?",
      [r.from_location, r.to_location, r.weight_mt, r.rate, r.hamali, id]
    );
  }, [db]);

  const deleteRoute = useCallback((id: number) => {
    db.runSync("DELETE FROM routes WHERE id = ?", [id]);
  }, [db]);

  const getRouteRate = useCallback((from: string, to: string, weight: number): { rate: number; hamali: number } | null => {
    const exact = db.getFirstSync<{ rate: number; hamali: number }>(
      "SELECT rate, hamali FROM routes WHERE from_location=? AND to_location=? AND weight_mt=?",
      [from, to, weight]
    );
    if (exact) return exact;
    // Fuzzy match by closest weight on same route
    const closest = db.getFirstSync<{ rate: number; hamali: number }>(
      "SELECT rate, hamali FROM routes WHERE from_location=? AND to_location=? ORDER BY ABS(weight_mt - ?) ASC LIMIT 1",
      [from, to, weight]
    );
    return closest ?? null;
  }, [db]);

  // ── Invoice Sequence ───────────────────────────────────────────────────────
  const getNextInvoiceNo = useCallback((monthKey: string): string => {
    // monthKey format: "042026" (MMYYYY)
    let seq = db.getFirstSync<{ last_seq: number }>(
      "SELECT last_seq FROM invoice_sequences WHERE month_key = ?",
      [monthKey]
    );
    const nextSeq = (seq?.last_seq ?? 0) + 1;
    db.runSync(
      "INSERT INTO invoice_sequences (month_key, last_seq) VALUES (?, ?) ON CONFLICT(month_key) DO UPDATE SET last_seq = ?",
      [monthKey, nextSeq, nextSeq]
    );
    const mm = monthKey.slice(0, 2);
    const yyyy = monthKey.slice(2);
    return `IIL/${mm}/${yyyy}/${String(nextSeq).padStart(3, "0")}`;
  }, [db]);

  return (
    <DBContext.Provider value={{
      getLocations, addLocation, deleteLocation,
      getVehicles, addVehicle, deleteVehicle,
      getTrips, addTrip, updateTrip, deleteTrip,
      getRoutes, addRoute, updateRoute, deleteRoute, getRouteRate,
      getNextInvoiceNo,
    }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB(): DBContextType {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error("useDB must be used within DatabaseProvider");
  return ctx;
}
