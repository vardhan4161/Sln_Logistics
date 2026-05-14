import React, { createContext, useCallback, useContext, useState } from "react";

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

const SEED_LOCATION_NAMES = [
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

const SEED_VEHICLE_NOS = [
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

const DBContext = createContext<DBContextType | null>(null);

export function initDB(_db: unknown): Promise<void> {
  return Promise.resolve();
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>(() =>
    SEED_LOCATION_NAMES.map((name, i) => ({ id: i + 1, name }))
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    SEED_VEHICLE_NOS.map((vehicle_no, i) => ({ id: i + 1, vehicle_no }))
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [invoiceSeqs, setInvoiceSeqs] = useState<Record<string, number>>({});
  const nextLocationId = React.useRef(SEED_LOCATION_NAMES.length + 1);
  const nextVehicleId = React.useRef(SEED_VEHICLE_NOS.length + 1);
  const nextTripId = React.useRef(1);
  const nextRouteId = React.useRef(1);

  const getLocations = useCallback((): Location[] => {
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  const addLocation = useCallback(
    (name: string): Location | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = locations.find(
        (l) => l.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing;
      const newLoc: Location = { id: nextLocationId.current++, name: trimmed };
      setLocations((prev) => [...prev, newLoc]);
      return newLoc;
    },
    [locations]
  );

  const deleteLocation = useCallback((id: number) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const getVehicles = useCallback((): Vehicle[] => {
    return [...vehicles].sort((a, b) =>
      a.vehicle_no.localeCompare(b.vehicle_no)
    );
  }, [vehicles]);

  const addVehicle = useCallback(
    (vehicle_no: string): Vehicle | null => {
      const trimmed = vehicle_no.trim().toUpperCase();
      if (!trimmed) return null;
      const existing = vehicles.find((v) => v.vehicle_no === trimmed);
      if (existing) return existing;
      const newVeh: Vehicle = {
        id: nextVehicleId.current++,
        vehicle_no: trimmed,
      };
      setVehicles((prev) => [...prev, newVeh]);
      return newVeh;
    },
    [vehicles]
  );

  const deleteVehicle = useCallback((id: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const getTrips = useCallback((): Trip[] => {
    return [...trips].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [trips]);

  const addTrip = useCallback(
    (tripData: Omit<Trip, "id" | "serial_no" | "created_at">): Trip => {
      const newTrip: Trip = {
        id: nextTripId.current,
        serial_no: nextTripId.current++,
        created_at: new Date().toISOString(),
        ...tripData,
      };
      setTrips((prev) => [...prev, newTrip]);
      return newTrip;
    },
    []
  );

  const deleteTrip = useCallback((id: number) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getRoutes = useCallback((): Route[] => [...routes].sort((a, b) => a.from_location.localeCompare(b.from_location)), [routes]);
  
  const addRoute = useCallback((r: Omit<Route, "id">): Route | null => {
    const newRoute: Route = { id: nextRouteId.current++, ...r };
    setRoutes((prev) => [...prev, newRoute]);
    return newRoute;
  }, []);

  const updateRoute = useCallback((id: number, r: Omit<Route, "id">) => {
    setRoutes((prev) => prev.map((old) => (old.id === id ? { ...old, ...r } : old)));
  }, []);

  const deleteRoute = useCallback((id: number) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const lookupRouteRate = useCallback((from: string, to: string, weight: number) => {
    const matching = routes.filter(r => r.from_location === from && r.to_location === to);
    if (matching.length === 0) return null;
    
    const exact = matching.find(r => r.weight_mt === weight);
    if (exact) return { rate: exact.rate, hamali: exact.hamali };
    
    // Sort by closest weight
    const closest = matching.sort((a, b) => Math.abs(a.weight_mt - weight) - Math.abs(b.weight_mt - weight))[0];
    return { rate: closest.rate, hamali: closest.hamali };
  }, [routes]);

  const getNextInvoiceNo = useCallback((monthKey: string) => {
    const current = invoiceSeqs[monthKey] || 0;
    const nextSeq = current + 1;
    setInvoiceSeqs(prev => ({ ...prev, [monthKey]: nextSeq }));
    return `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
  }, [invoiceSeqs]);

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
        updateTrip,
        deleteTrip,
        getRoutes,
        addRoute,
        updateRoute,
        deleteRoute,
        lookupRouteRate,
        getNextInvoiceNo,
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
