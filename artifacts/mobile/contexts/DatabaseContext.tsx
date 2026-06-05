import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;

export interface Location { id: number; name: string; }
export interface Vehicle { id: number; vehicle_no: string; }
export interface Trip {
  id: number; serial_no: number; trip_date: string; from_location: string; to_location: string;
  vehicle_no: string; chargeable_weight: number; rate: number; hamali: number; total_freight: number; added_by?: string; created_at: string;
}
export interface Route {
  id: number; from_location: string; to_location: string; weight_mt: number; rate: number; hamali: number;
}
export interface GeneratedInvoice {
  id: number; invoice_no: string; invoice_date: string; period: string;
  amount: number; cgst: number; sgst: number; total_amount: number;
  trip_count: number; created_at: string;
  pdf_base64?: string; excel_base64?: string; // stored locally only, not synced to cloud
}

interface DBContextType {
  isLoading: boolean;
  isConnected: boolean;
  refresh: () => Promise<void>;
  getLocations: () => Location[];
  addLocation: (name: string) => Location | null;
  updateLocation: (id: number, name: string) => void;
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
  getNextInvoiceNo: (monthKey: string) => Promise<string>;
  peekNextInvoiceNo: (monthKey: string) => Promise<string>;
  getInvoices: () => GeneratedInvoice[];
  getInvoiceFiles: (id: number) => { pdf_base64?: string; excel_base64?: string };
  addInvoice: (inv: Omit<GeneratedInvoice, "id" | "created_at">) => GeneratedInvoice;
  deleteInvoice: (id: number) => void;
}

type ApiDocument<T> = T & { _id?: string };

const seedLocations: Location[] = [
  "IIL-Gachibowli", "RGI Airport", "IIL-Karkapatla", "IIL-Uppal",
  "IIL-Cherlapally", "Potential-ALEAP", "Jubilee Hills",
].map((name, index) => ({ id: index + 1, name }));

const seedVehicles: Vehicle[] = [
  "TG12T6078", "TS12UC3042", "TS06UA7249", "TS05UA0781", "TG08T9023",
  "AP28TA4481", "AP29TB9031", "TS07UA1111", "TS09UB2222", "TG10TC3333",
  "AP31TA4444", "TS11UD5555", "TG07TE6666", "AP09TB7777",
].map((vehicle_no, index) => ({ id: index + 1, vehicle_no }));

const hamaliByWeight: Record<number, number> = { 1: 1200, 3: 2400, 6: 3600, 9: 6000, 12: 7200 };
const seedRouteRows = [
  { f: "IIL-Gachibowli", t: "RGI Airport", r1: 2800, r3: 4000, r6: 6500 },
  { f: "IIL-Gachibowli", t: "IIL-Karkapatla", r1: 4200, r3: 5600, r6: 6900 },
  { f: "IIL-Gachibowli", t: "IIL-Uppal", r1: 2900, r3: 4500, r6: 6000 },
  { f: "IIL-Gachibowli", t: "IIL-Cherlapally", r1: 3000, r3: 4800, r6: 6500 },
  { f: "IIL-Gachibowli", t: "Potential-ALEAP", r1: 2800, r3: 4300, r6: 6000 },
  { f: "IIL-Karkapatla", t: "RGI Airport", r1: 5500, r3: 8000, r6: 9000, r9: 9500, r12: 9800 },
  { f: "IIL-Karkapatla", t: "IIL-Uppal", r1: 3500, r3: 4900, r6: 5900, r9: 6800, r12: 7500 },
  { f: "IIL-Karkapatla", t: "IIL-Gachibowli", r1: 3500, r3: 5000, r6: 6200 },
  { f: "IIL-Karkapatla", t: "IIL-Cherlapally", r1: 3400, r3: 4800, r6: 5800, r9: 6300, r12: 7500 },
  { f: "IIL-Karkapatla", t: "Potential-ALEAP", r1: 3400, r3: 4800, r6: 5800, r9: 6300, r12: 7500 },
  { f: "Potential-ALEAP", t: "RGI Airport", r1: 4000, r3: 5000, r6: 6500, r9: 8500, r12: 9500 },
  { f: "Potential-ALEAP", t: "IIL-Uppal", r1: 4200, r3: 5500, r6: 7500, r9: 8500, r12: 9000 },
  { f: "Potential-ALEAP", t: "IIL-Gachibowli", r1: 4000, r3: 5200, r6: 6500 },
  { f: "Potential-ALEAP", t: "IIL-Karkapatla", r1: 4000, r3: 5200, r6: 7500, r9: 8500, r12: 9200 },
  { f: "Potential-ALEAP", t: "IIL-Cherlapally", r1: 4000, r3: 5500, r6: 7500, r9: 8500, r12: 9200 },
  { f: "IIL-Cherlapally", t: "IIL-Karkapatla", r1: 4500, r3: 6000, r6: 7500, r9: 8500, r12: 10500 },
  { f: "IIL-Cherlapally", t: "IIL-Gachibowli", r1: 4500, r3: 6000, r6: 7500 },
  { f: "IIL-Cherlapally", t: "RGI Airport", r1: 4500, r3: 6000, r6: 7500, r9: 8500, r12: 10500 },
  { f: "IIL-Cherlapally", t: "IIL-Uppal", r1: 2800, r3: 4000, r6: 6500, r9: 7500, r12: 8500 },
  { f: "IIL-Cherlapally", t: "Potential-ALEAP", r1: 4500, r3: 6000, r6: 7500, r9: 8500, r12: 10500 },
  { f: "IIL-Uppal", t: "IIL-Gachibowli", r1: 2800, r3: 4000, r6: 6500 },
  { f: "IIL-Uppal", t: "IIL-Karkapatla", r1: 3500, r3: 4500, r6: 6500, r9: 8500, r12: 10500 },
  { f: "IIL-Uppal", t: "Potential-ALEAP", r1: 4500, r3: 6000, r6: 7500, r9: 8500, r12: 10500 },
  { f: "IIL-Uppal", t: "Jubilee Hills", r1: 2800, r3: 4000, r6: 6500 },
  { f: "IIL-Uppal", t: "IIL-Cherlapally", r1: 2800, r3: 4000, r6: 6500 },
];

const seedRoutes: Route[] = seedRouteRows.flatMap((row) =>
  ([1, 3, 6, 9, 12] as const).flatMap((weight) => {
    const key = `r${weight}` as keyof typeof row;
    const rate = row[key];
    return typeof rate === "number"
      ? [{ id: 0, from_location: row.f, to_location: row.t, weight_mt: weight, rate, hamali: hamaliByWeight[weight] }]
      : [];
  }),
).map((route, index) => ({ ...route, id: index + 1 }));

const DBContext = createContext<DBContextType | null>(null);

export function initDB(_db?: unknown): Promise<void> {
  return Promise.resolve();
}

const getApiBaseUrl = () => "https://sln-logistics-api.vercel.app/api";

function maxId(items: Array<{ id: number }>) {
  return items.reduce((max, item) => Math.max(max, item.id), 0);
}

function normalizeCollection<T extends { id: number }>(items: ApiDocument<T>[]) {
  return items.filter((item): item is T => Number.isInteger(item.id));
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const locationsRef = useRef<Location[]>(seedLocations);
  const vehiclesRef = useRef<Vehicle[]>(seedVehicles);
  const tripsRef = useRef<Trip[]>([]);
  const routesRef = useRef<Route[]>(seedRoutes);
  const invoicesRef = useRef<GeneratedInvoice[]>([]);
  const localFilesRef = useRef<Record<number, { pdf_base64?: string; excel_base64?: string }>>({});
  const invoiceSeqsRef = useRef<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((current) => current + 1), []);

  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    console.log(`[API_REQUEST] Sending request to: ${apiBaseUrl}${path}`);
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        console.error(`[API_ERROR] Response not ok: ${response.status} - ${message}`);
        throw new Error(message || `Request failed: ${response.status}`);
      }

      if (response.status === 204) return {} as T;
      return response.json();
    } catch (err: any) {
      console.error(`[API_ERROR] Network request failed for ${apiBaseUrl}${path}: ${err.message}`, err);
      throw err;
    }
  }, [apiBaseUrl]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [locations, vehicles, trips, routes, invoices] = await Promise.all([
        api<ApiDocument<Location>[]>("/locations"),
        api<ApiDocument<Vehicle>[]>("/vehicles"),
        api<ApiDocument<Trip>[]>("/trips"),
        api<ApiDocument<Route>[]>("/rates"),
        api<ApiDocument<GeneratedInvoice>[]>("/invoices"),
      ]);

      locationsRef.current = normalizeCollection(locations);
      vehiclesRef.current = normalizeCollection(vehicles);
      tripsRef.current = normalizeCollection(trips);
      routesRef.current = normalizeCollection(routes);
      invoicesRef.current = normalizeCollection(invoices);
      setIsConnected(true);
      bump();
    } catch (error) {
      console.warn("Failed to refresh cloud database", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [api, bump]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveRemote = useCallback(<T,>(task: Promise<T>, onSuccess?: (value: T) => void) => {
    void task
      .then((value) => {
        onSuccess?.(value);
        bump();
      })
      .catch((error) => {
        console.warn("Cloud database write failed", error);
        void refresh();
      });
  }, [bump, refresh]);

  const getLocations = useCallback(
    () => [...locationsRef.current].sort((a, b) => a.name.localeCompare(b.name)),
    [version],
  );

  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = locationsRef.current.find((location) => location.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const created: Location = { id: maxId(locationsRef.current) + 1, name: trimmed };
    locationsRef.current = [...locationsRef.current, created];
    bump();
    saveRemote(api<Location>("/locations", { method: "POST", body: JSON.stringify({ name: trimmed }) }), (remote) => {
      locationsRef.current = locationsRef.current.map((item) => item.name === trimmed ? remote : item);
    });
    return created;
  }, [api, bump, saveRemote]);

  const updateLocation = useCallback((id: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldLocation = locationsRef.current.find((l) => l.id === id);
    if (!oldLocation) return;
    const oldName = oldLocation.name;

    // Optimistic local update: rename the location
    locationsRef.current = locationsRef.current.map((l) => l.id === id ? { ...l, name: trimmed } : l);
    // Cascade rename in local trips
    tripsRef.current = tripsRef.current.map((t) => ({
      ...t,
      from_location: t.from_location === oldName ? trimmed : t.from_location,
      to_location: t.to_location === oldName ? trimmed : t.to_location,
    }));
    // Cascade rename in local routes
    routesRef.current = routesRef.current.map((r) => ({
      ...r,
      from_location: r.from_location === oldName ? trimmed : r.from_location,
      to_location: r.to_location === oldName ? trimmed : r.to_location,
    }));
    bump();

    // Send to API and refresh to stay in sync
    saveRemote(
      api<Location>(`/locations/${id}`, { method: "PUT", body: JSON.stringify({ name: trimmed }) }),
      () => { void refresh(); },
    );
  }, [api, bump, saveRemote, refresh]);

  const deleteLocation = useCallback((id: number) => {
    locationsRef.current = locationsRef.current.filter((location) => location.id !== id);
    bump();
    saveRemote(api<void>(`/locations/${id}`, { method: "DELETE" }));
  }, [api, bump, saveRemote]);

  const getVehicles = useCallback(
    () => [...vehiclesRef.current].sort((a, b) => a.vehicle_no.localeCompare(b.vehicle_no)),
    [version],
  );

  const addVehicle = useCallback((vehicleNo: string) => {
    const vehicle_no = vehicleNo.trim().toUpperCase();
    if (!vehicle_no) return null;
    const existing = vehiclesRef.current.find((vehicle) => vehicle.vehicle_no === vehicle_no);
    if (existing) return existing;

    const created: Vehicle = { id: maxId(vehiclesRef.current) + 1, vehicle_no };
    vehiclesRef.current = [...vehiclesRef.current, created];
    bump();
    saveRemote(api<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify({ vehicle_no }) }), (remote) => {
      vehiclesRef.current = vehiclesRef.current.map((item) => item.vehicle_no === vehicle_no ? remote : item);
    });
    return created;
  }, [api, bump, saveRemote]);

  const deleteVehicle = useCallback((id: number) => {
    vehiclesRef.current = vehiclesRef.current.filter((vehicle) => vehicle.id !== id);
    bump();
    saveRemote(api<void>(`/vehicles/${id}`, { method: "DELETE" }));
  }, [api, bump, saveRemote]);

  const getTrips = useCallback(
    () => [...tripsRef.current].sort((a, b) => b.serial_no - a.serial_no),
    [version],
  );

  const addTrip = useCallback((tripData: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    const created: Trip = {
      ...tripData,
      id: maxId(tripsRef.current) + 1,
      serial_no: tripsRef.current.reduce((max, trip) => Math.max(max, trip.serial_no), 0) + 1,
      created_at: new Date().toISOString(),
    };
    tripsRef.current = [created, ...tripsRef.current];
    bump();
    saveRemote(api<Trip>("/trips", { method: "POST", body: JSON.stringify(tripData) }), (remote) => {
      tripsRef.current = tripsRef.current.map((item) => item.id === created.id ? remote : item);
    });
    return created;
  }, [api, bump, saveRemote]);

  const updateTrip = useCallback((id: number, tripData: Omit<Trip, "id" | "serial_no" | "created_at">) => {
    tripsRef.current = tripsRef.current.map((trip) => trip.id === id ? { ...trip, ...tripData } : trip);
    bump();
    saveRemote(api<Trip>(`/trips/${id}`, { method: "PUT", body: JSON.stringify(tripData) }), (remote) => {
      tripsRef.current = tripsRef.current.map((item) => item.id === id ? remote : item);
    });
  }, [api, bump, saveRemote]);

  const deleteTrip = useCallback((id: number) => {
    tripsRef.current = tripsRef.current.filter((trip) => trip.id !== id);
    bump();
    saveRemote(api<void>(`/trips/${id}`, { method: "DELETE" }));
  }, [api, bump, saveRemote]);

  const getRoutes = useCallback(
    () => [...routesRef.current].sort((a, b) =>
      a.from_location.localeCompare(b.from_location) || a.to_location.localeCompare(b.to_location) || a.weight_mt - b.weight_mt,
    ),
    [version],
  );

  const addRoute = useCallback((routeData: Omit<Route, "id">) => {
    const existing = routesRef.current.find((route) =>
      route.from_location === routeData.from_location &&
      route.to_location === routeData.to_location &&
      route.weight_mt === routeData.weight_mt
    );
    const created: Route = existing ? { ...existing, ...routeData } : { id: maxId(routesRef.current) + 1, ...routeData };

    routesRef.current = existing
      ? routesRef.current.map((route) => route.id === existing.id ? created : route)
      : [...routesRef.current, created];
    bump();
    saveRemote(api<Route>("/rates", { method: "POST", body: JSON.stringify(routeData) }), (remote) => {
      routesRef.current = routesRef.current.map((item) => item.id === created.id ? remote : item);
    });
    return created;
  }, [api, bump, saveRemote]);

  const updateRoute = useCallback((id: number, routeData: Omit<Route, "id">) => {
    routesRef.current = routesRef.current.map((route) => route.id === id ? { id, ...routeData } : route);
    bump();
    saveRemote(api<Route>(`/rates/${id}`, { method: "PUT", body: JSON.stringify(routeData) }), (remote) => {
      routesRef.current = routesRef.current.map((item) => item.id === id ? remote : item);
    });
  }, [api, bump, saveRemote]);

  const deleteRoute = useCallback((id: number) => {
    routesRef.current = routesRef.current.filter((route) => route.id !== id);
    bump();
    saveRemote(api<void>(`/rates/${id}`, { method: "DELETE" }));
  }, [api, bump, saveRemote]);

  const lookupRouteRate = useCallback((from: string, to: string, weight: number) => {
    const matches = routesRef.current.filter((route) => route.from_location === from && route.to_location === to);
    if (matches.length === 0) return null;
    const exact = matches.find((route) => route.weight_mt === weight);
    const closest = exact ?? [...matches].sort((a, b) => Math.abs(a.weight_mt - weight) - Math.abs(b.weight_mt - weight))[0];
    return { rate: closest.rate, hamali: closest.hamali };
  }, [version]);

  const getInvoices = useCallback(() => [...invoicesRef.current].sort((a, b) => b.id - a.id), [version]);

  const addInvoice = useCallback((invData: Omit<GeneratedInvoice, "id" | "created_at">) => {
    const { pdf_base64, excel_base64, ...cloudData } = invData;
    const created: GeneratedInvoice = {
      ...cloudData,
      id: maxId(invoicesRef.current) + 1,
      created_at: new Date().toISOString(),
    };
    // Store files locally in memory only (not sent to cloud)
    if (pdf_base64 || excel_base64) {
      localFilesRef.current[created.id] = { pdf_base64, excel_base64 };
    }
    invoicesRef.current = [created, ...invoicesRef.current];
    bump();
    // Send only metadata (no Base64 blobs) to cloud
    saveRemote(api<GeneratedInvoice>("/invoices", { method: "POST", body: JSON.stringify(created) }), (remote) => {
      invoicesRef.current = invoicesRef.current.map((item) => item.id === created.id ? remote : item);
    });
    return created;
  }, [api, bump, saveRemote]);

  const getInvoiceFiles = useCallback((id: number) => {
    return localFilesRef.current[id] ?? {};
  }, []);

  const deleteInvoice = useCallback((id: number) => {
    invoicesRef.current = invoicesRef.current.filter((inv) => inv.id !== id);
    bump();
    saveRemote(api<void>(`/invoices/${id}`, { method: "DELETE" }));
  }, [api, bump, saveRemote]);

  const peekNextInvoiceNo = useCallback(async (monthKey: string) => {
    try {
      const response = await api<{ invoice_number: string }>(`/invoices/next?monthKey=${monthKey}`, { method: "GET" });
      return response.invoice_number;
    } catch (error) {
      console.warn("Peek invoice number failed; using local fallback", error);
      const nextSeq = (invoiceSeqsRef.current[monthKey] ?? 0) + 1;
      return `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
    }
  }, [api]);

  const getNextInvoiceNo = useCallback(async (monthKey: string) => {
    try {
      const response = await api<{ invoice_number: string }>("/invoices/next", {
        method: "POST",
        body: JSON.stringify({ monthKey }),
      });
      return response.invoice_number;
    } catch (error) {
      console.warn("Cloud invoice number failed; using local fallback", error);
      const nextSeq = (invoiceSeqsRef.current[monthKey] ?? 0) + 1;
      invoiceSeqsRef.current = { ...invoiceSeqsRef.current, [monthKey]: nextSeq };
      return `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
    }
  }, [api]);

  const value = useMemo<DBContextType>(() => ({
    isLoading,
    isConnected,
    refresh,
    getLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    getVehicles,
    addVehicle,
    deleteVehicle,
    getTrips,
    addTrip,
    updateTrip,
    deleteTrip,
    getRoutes,
    addRoute,
    updateRoute,
    deleteRoute,
    lookupRouteRate,
    getNextInvoiceNo,
    peekNextInvoiceNo,
    getInvoices,
    getInvoiceFiles,
    addInvoice,
    deleteInvoice,
  }), [
    isLoading,
    isConnected,
    refresh,
    getLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    getVehicles,
    addVehicle,
    deleteVehicle,
    getTrips,
    addTrip,
    updateTrip,
    deleteTrip,
    getRoutes,
    addRoute,
    updateRoute,
    deleteRoute,
    lookupRouteRate,
    getNextInvoiceNo,
    peekNextInvoiceNo,
    getInvoices,
    getInvoiceFiles,
    addInvoice,
    deleteInvoice,
  ]);

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export function useDB() {
  const context = useContext(DBContext);
  if (!context) throw new Error("useDB must be used within a DatabaseProvider");
  return context;
}
