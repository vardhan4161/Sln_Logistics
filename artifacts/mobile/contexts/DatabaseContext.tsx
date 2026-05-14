import React, { createContext, useContext, useCallback } from "react";
import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";

console.log("DATABASE_CONTEXT_LOADED_v2");

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
  getRoutes: () => Route[];
  addRoute: (r: Omit<Route, "id">) => Route | null;
  updateRoute: (id: number, r: Omit<Route, "id">) => void;
  deleteRoute: (id: number) => void;
  lookupRouteRate: (from: string, to: string, weight: number) => { rate: number; hamali: number } | null;
  getNextInvoiceNo: (monthKey: string) => string;
}

const DBContext = createContext<DBContextType | null>(null);

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
}

function DatabaseProviderInner({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  const getLocations = useCallback(() => db.getAllSync<Location>("SELECT * FROM locations ORDER BY name ASC"), [db]);
  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const result = db.runSync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [trimmed]);
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
