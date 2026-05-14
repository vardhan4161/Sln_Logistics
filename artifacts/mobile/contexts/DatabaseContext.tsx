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

interface DBContextType {
  getLocations: () => Location[];
  addLocation: (name: string) => Location | null;
  deleteLocation: (id: number) => void;
  getVehicles: () => Vehicle[];
  addVehicle: (vehicle_no: string) => Vehicle | null;
  deleteVehicle: (id: number) => void;
  getTrips: () => Trip[];
  addTrip: (trip: Omit<Trip, "id" | "serial_no" | "created_at">) => Trip;
  deleteTrip: (id: number) => void;
}

const SEED_LOCATIONS = [
  "Gubba-Medchal",
  "IIL-Karkapatla",
  "Priya feeds - Cherlapally",
  "SANZYME",
  "ARC Transport Medchal",
  "BIO CHEMICHAL SANATHNAGAR",
  "Potential-ALEAP",
  "Bollaram",
  "Sainath-Jeedimetla",
  "IIL-Uppal",
  "IIL-Gachibowli",
  "RGIA-Airport",
  "RGI Airport",
  "ICD-Sanathnagar",
  "Jiyaguda",
  "Cherlapally",
  "Medchal",
  "Uppal",
  "Gachibowli",
  "Airport",
  "Sanathnagar",
  "Jeedimetla",
  "ALEAP",
];

const SEED_VEHICLES = [
  "TG12T6078",
  "TS12UC3042",
  "TS06UA7249",
  "TS05UA0781",
  "TG08T9023",
  "AP28TA4481",
  "AP29TB9031",
  "TS07UA1111",
  "TS09UB2222",
  "TG10TC3333",
  "AP31TA4444",
  "TS11UD5555",
  "TG07TE6666",
  "AP09TB7777",
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
  `);

  const meta = await db.getFirstAsync(
    "SELECT value FROM app_meta WHERE key = 'seeded'"
  );
  if (!meta) {
    for (const name of SEED_LOCATIONS) {
      await db.runAsync("INSERT OR IGNORE INTO locations (name) VALUES (?)", [
        name,
      ]);
    }
    for (const vehicle_no of SEED_VEHICLES) {
      await db.runAsync(
        "INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)",
        [vehicle_no]
      );
    }
    await db.runAsync(
      "INSERT INTO app_meta (key, value) VALUES ('seeded', 'true')"
    );
  }
}

const DBContext = createContext<DBContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  const getLocations = useCallback((): Location[] => {
    return db.getAllSync("SELECT * FROM locations ORDER BY name ASC");
  }, [db]);

  const addLocation = useCallback(
    (name: string): Location | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const result = db.runSync(
          "INSERT OR IGNORE INTO locations (name) VALUES (?)",
          [trimmed]
        );
        if (result.changes > 0) {
          return db.getFirstSync<Location>(
            "SELECT * FROM locations WHERE id = ?",
            [result.lastInsertRowId]
          ) as Location;
        }
        return db.getFirstSync<Location>(
          "SELECT * FROM locations WHERE name = ?",
          [trimmed]
        ) as Location;
      } catch {
        return null;
      }
    },
    [db]
  );

  const deleteLocation = useCallback(
    (id: number) => {
      db.runSync("DELETE FROM locations WHERE id = ?", [id]);
    },
    [db]
  );

  const getVehicles = useCallback((): Vehicle[] => {
    return db.getAllSync("SELECT * FROM vehicles ORDER BY vehicle_no ASC");
  }, [db]);

  const addVehicle = useCallback(
    (vehicle_no: string): Vehicle | null => {
      const trimmed = vehicle_no.trim().toUpperCase();
      if (!trimmed) return null;
      try {
        const result = db.runSync(
          "INSERT OR IGNORE INTO vehicles (vehicle_no) VALUES (?)",
          [trimmed]
        );
        if (result.changes > 0) {
          return db.getFirstSync<Vehicle>(
            "SELECT * FROM vehicles WHERE id = ?",
            [result.lastInsertRowId]
          ) as Vehicle;
        }
        return db.getFirstSync<Vehicle>(
          "SELECT * FROM vehicles WHERE vehicle_no = ?",
          [trimmed]
        ) as Vehicle;
      } catch {
        return null;
      }
    },
    [db]
  );

  const deleteVehicle = useCallback(
    (id: number) => {
      db.runSync("DELETE FROM vehicles WHERE id = ?", [id]);
    },
    [db]
  );

  const getTrips = useCallback((): Trip[] => {
    return db.getAllSync(
      "SELECT * FROM trips ORDER BY created_at DESC"
    );
  }, [db]);

  const addTrip = useCallback(
    (tripData: Omit<Trip, "id" | "serial_no" | "created_at">): Trip => {
      const created_at = new Date().toISOString();
      const maxResult = db.getFirstSync<{ max_sn: number }>(
        "SELECT MAX(serial_no) as max_sn FROM trips"
      );
      const serial_no = (maxResult?.max_sn ?? 0) + 1;
      const result = db.runSync(
        "INSERT INTO trips (serial_no, trip_date, from_location, to_location, vehicle_no, chargeable_weight, rate, hamali, total_freight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          serial_no,
          tripData.trip_date,
          tripData.from_location,
          tripData.to_location,
          tripData.vehicle_no,
          tripData.chargeable_weight,
          tripData.rate,
          tripData.hamali,
          tripData.total_freight,
          created_at,
        ]
      );
      return db.getFirstSync<Trip>("SELECT * FROM trips WHERE id = ?", [
        result.lastInsertRowId,
      ]) as Trip;
    },
    [db]
  );

  const deleteTrip = useCallback(
    (id: number) => {
      db.runSync("DELETE FROM trips WHERE id = ?", [id]);
    },
    [db]
  );

  return (
    <DBContext.Provider
      value={{
        getLocations,
        addLocation,
        deleteLocation,
        getVehicles,
        addVehicle,
        deleteVehicle,
        getTrips,
        addTrip,
        deleteTrip,
      }}
    >
      {children}
    </DBContext.Provider>
  );
}

export function useDB(): DBContextType {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error("useDB must be used within DatabaseProvider");
  return ctx;
}
