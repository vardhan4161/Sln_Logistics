import React, { createContext, useCallback, useContext, useState } from "react";

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

const SEED_LOCATION_NAMES = [
  'IIL-Gachibowli', 'RGI Airport', 'IIL-Karkapatla', 'IIL-Uppal', 
  'IIL-Cherlapally', 'Potential-ALEAP', 'Jubilee Hills'
];

const SEED_VEHICLE_NOS = [
  "TG12T6078", "TS12UC3042", "TS06UA7249", "TS05UA0781", "TG08T9023",
  "AP28TA4481", "AP29TB9031", "TS07UA1111", "TS09UB2222", "TG10TC3333",
  "AP31TA4444", "TS11UD5555", "TG07TE6666", "AP09TB7777"
];

const hamaliMap: any = { 1.0: 1200, 3.0: 2400, 6.0: 3600, 9.0: 6000, 12.0: 7200 };

const rawAnnexure = [
  { f:'IIL-Gachibowli', t:'RGI Airport', r1:2800, r3:4000, r6:6500 },
  { f:'IIL-Gachibowli', t:'IIL-Karkapatla', r1:4200, r3:5600, r6:6900 },
  { f:'IIL-Gachibowli', t:'IIL-Uppal', r1:2900, r3:4500, r6:6000 },
  { f:'IIL-Gachibowli', t:'IIL-Cherlapally', r1:3000, r3:4800, r6:6500 },
  { f:'IIL-Gachibowli', t:'Potential-ALEAP', r1:2800, r3:4300, r6:6000 },
  { f:'IIL-Karkapatla', t:'RGI Airport', r1:5500, r3:8000, r6:9000, r9:9500, r12:9800 },
  { f:'IIL-Karkapatla', t:'IIL-Uppal', r1:3500, r3:4900, r6:5900, r9:6800, r12:7500 },
  { f:'IIL-Karkapatla', t:'IIL-Gachibowli', r1:3500, r3:5000, r6:6200 },
  { f:'IIL-Karkapatla', t:'IIL-Cherlapally', r1:3400, r3:4800, r6:5800, r9:6300, r12:7500 },
  { f:'IIL-Karkapatla', t:'Potential-ALEAP', r1:3400, r3:4800, r6:5800, r9:6300, r12:7500 },
  { f:'Potential-ALEAP', t:'RGI Airport', r1:4000, r3:5000, r6:6500, r9:8500, r12:9500 },
  { f:'Potential-ALEAP', t:'IIL-Uppal', r1:4200, r3:5500, r6:7500, r9:8500, r12:9000 },
  { f:'Potential-ALEAP', t:'IIL-Gachibowli', r1:4000, r3:5200, r6:6500 },
  { f:'Potential-ALEAP', t:'IIL-Karkapatla', r1:4000, r3:5200, r6:7500, r9:8500, r12:9200 },
  { f:'Potential-ALEAP', t:'IIL-Cherlapally', r1:4000, r3:5500, r6:7500, r9:8500, r12:9200 },
  { f:'IIL-Cherlapally', t:'IIL-Karkapatla', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
  { f:'IIL-Cherlapally', t:'IIL-Gachibowli', r1:4500, r3:6000, r6:7500 },
  { f:'IIL-Cherlapally', t:'RGI Airport', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
  { f:'IIL-Cherlapally', t:'IIL-Uppal', r1:2800, r3:4000, r6:6500, r9:7500, r12:8500 },
  { f:'IIL-Cherlapally', t:'Potential-ALEAP', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
  { f:'IIL-Uppal', t:'IIL-Gachibowli', r1:2800, r3:4000, r6:6500 },
  { f:'IIL-Uppal', t:'IIL-Karkapatla', r1:3500, r3:4500, r6:6500, r9:8500, r12:10500 },
  { f:'IIL-Uppal', t:'Potential-ALEAP', r1:4500, r3:6000, r6:7500, r9:8500, r12:10500 },
  { f:'IIL-Uppal', t:'Jubilee Hills', r1:2800, r3:4000, r6:6500 },
  { f:'IIL-Uppal', t:'IIL-Cherlapally', r1:2800, r3:4000, r6:6500 },
];

const processedRoutes: any[] = [];
rawAnnexure.forEach(row => {
  if (row.r1) processedRoutes.push({ f: row.f, t: row.t, w: 1.0, r: row.r1, h: hamaliMap[1.0] });
  if (row.r3) processedRoutes.push({ f: row.f, t: row.t, w: 3.0, r: row.r3, h: hamaliMap[3.0] });
  if (row.r6) processedRoutes.push({ f: row.f, t: row.t, w: 6.0, r: row.r6, h: hamaliMap[6.0] });
  if ((row as any).r9) processedRoutes.push({ f: row.f, t: row.t, w: 9.0, r: (row as any).r9, h: hamaliMap[9.0] });
  if ((row as any).r12) processedRoutes.push({ f: row.f, t: row.t, w: 12.0, r: (row as any).r12, h: hamaliMap[12.0] });
});

const DBContext = createContext<DBContextType | null>(null);

export function initDB(_db: unknown): Promise<void> { return Promise.resolve(); }

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>(() => SEED_LOCATION_NAMES.map((name, i) => ({ id: i + 1, name })));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => SEED_VEHICLE_NOS.map((v, i) => ({ id: i + 1, vehicle_no: v })));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>(() => processedRoutes.map((r, i) => ({ id: i + 1, from_location: r.f, to_location: r.t, weight_mt: r.w, rate: r.r, hamali: r.h })));
  const [invoiceSeqs, setInvoiceSeqs] = useState<Record<string, number>>({});
  
  const nextLocationId = React.useRef(SEED_LOCATION_NAMES.length + 1);
  const nextVehicleId = React.useRef(SEED_VEHICLE_NOS.length + 1);
  const nextTripId = React.useRef(1);
  const nextRouteId = React.useRef(processedRoutes.length + 1);

  const getLocations = useCallback(() => [...locations].sort((a, b) => a.name.localeCompare(b.name)), [locations]);
  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = locations.find(l => l.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const newLoc = { id: nextLocationId.current++, name: trimmed };
    setLocations(p => [...p, newLoc]);
    return newLoc;
  }, [locations]);
  const deleteLocation = useCallback((id: number) => setLocations(p => p.filter(l => l.id !== id)), []);

  const getVehicles = useCallback(() => [...vehicles].sort((a, b) => a.vehicle_no.localeCompare(b.vehicle_no)), [vehicles]);
  const addVehicle = useCallback((v: string) => {
    const trimmed = v.trim().toUpperCase();
    if (!trimmed) return null;
    const existing = vehicles.find(veh => veh.vehicle_no === trimmed);
    if (existing) return existing;
    const newVeh = { id: nextVehicleId.current++, vehicle_no: trimmed };
    setVehicles(p => [...p, newVeh]);
    return newVeh;
  }, [vehicles]);
  const deleteVehicle = useCallback((id: number) => setVehicles(p => p.filter(v => v.id !== id)), []);

  const getTrips = useCallback(() => [...trips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [trips]);
  const addTrip = useCallback((data: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    const newTrip = { id: nextTripId.current, serial_no: nextTripId.current++, created_at: new Date().toISOString(), ...data };
    setTrips(p => [...p, newTrip]);
    return newTrip;
  }, []);
  const updateTrip = useCallback((id: number, data: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    setTrips(p => p.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);
  const deleteTrip = useCallback((id: number) => setTrips(p => p.filter(t => t.id !== id)), []);

  const getRoutes = useCallback(() => [...routes].sort((a, b) => a.from_location.localeCompare(b.from_location)), [routes]);
  const addRoute = useCallback((r: Omit<Route, "id">) => {
    const newRoute = { id: nextRouteId.current++, ...r };
    setRoutes(p => [...p, newRoute]);
    return newRoute;
  }, []);
  const updateRoute = useCallback((id: number, r: Omit<Route, "id">) => {
    setRoutes(p => p.map(old => old.id === id ? { ...old, ...r } : old));
  }, []);
  const deleteRoute = useCallback((id: number) => setRoutes(p => p.filter(r => r.id !== id)), []);

  const lookupRouteRate = useCallback((from: string, to: string, weight: number) => {
    const matches = routes.filter(r => r.from_location === from && r.to_location === to);
    if (matches.length === 0) return null;
    const exact = matches.find(r => r.weight_mt === weight);
    if (exact) return { rate: exact.rate, hamali: exact.hamali };
    const closest = matches.sort((a, b) => Math.abs(a.weight_mt - weight) - Math.abs(b.weight_mt - weight))[0];
    return { rate: closest.rate, hamali: closest.hamali };
  }, [routes]);

  const getNextInvoiceNo = useCallback((monthKey: string) => {
    const current = invoiceSeqs[monthKey] || 0;
    const nextSeq = current + 1;
    setInvoiceSeqs(p => ({ ...p, [monthKey]: nextSeq }));
    return `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
  }, [invoiceSeqs]);

  return (
    <DBContext.Provider value={{
      getLocations, addLocation, deleteLocation, getVehicles, addVehicle, deleteVehicle,
      getTrips, addTrip, updateTrip, deleteTrip, getRoutes, addRoute, updateRoute, deleteRoute,
      lookupRouteRate, getNextInvoiceNo,
    }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (!context) throw new Error("useDB must be used within a DatabaseProvider");
  return context;
}
