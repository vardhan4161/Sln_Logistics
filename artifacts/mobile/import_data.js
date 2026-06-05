const xlsx = require("xlsx");
const https = require("https");

const API_BASE = "https://sln-logistics-api.vercel.app/api";

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log("Fetching existing data...");
  const existingTrips = await fetchJson(`${API_BASE}/trips`);
  let maxTripId = existingTrips.reduce((max, t) => Math.max(max, t.id || 0), 0);
  
  const existingLocs = await fetchJson(`${API_BASE}/locations`);
  const locSet = new Set(existingLocs.map(l => (l.name || "").trim().toLowerCase()));

  const existingRates = await fetchJson(`${API_BASE}/rates`);
  const rateSet = new Set(existingRates.map(r => `${(r.from_location || "").trim().toLowerCase()}-${(r.to_location || "").trim().toLowerCase()}`));
  let maxRateId = existingRates.reduce((max, r) => Math.max(max, r.id || 0), 0);

  const existingVehicles = await fetchJson(`${API_BASE}/vehicles`);
  const vehSet = new Set(existingVehicles.map(v => (v.number || "").trim().toUpperCase()));

  console.log("Reading Excel file...");
  const wb = xlsx.readFile("C:/Users/vardh/OneDrive/Desktop/SLN_Logistics_20260603.xlsx");
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  console.log(`Found ${data.length} rows in Excel. Processing...`);

  let tripSuccess = 0;
  let locSuccess = 0;
  let rateSuccess = 0;
  let vehSuccess = 0;

  for (const row of data) {
    if (!row["Date"] || !row["From Location"] || !row["To Location"]) continue;

    const fromLoc = row["From Location"].trim();
    const toLoc = row["To Location"].trim();
    const vehicle = row["Vehicle No"] ? String(row["Vehicle No"]).trim().toUpperCase() : "";
    const weight = Number(row["Chargeable Weight (MT)"]) || 0;
    const rate = Number(row["Rate"]) || 0;
    const hamali = Number(row["Hamali"]) || 0;

    // 1. Add missing locations
    if (fromLoc && !locSet.has(fromLoc.toLowerCase())) {
      try {
        await fetchJson(`${API_BASE}/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Date.now() + Math.random(), name: fromLoc }) });
        locSet.add(fromLoc.toLowerCase());
        locSuccess++;
        console.log(`Added Location: ${fromLoc}`);
      } catch(e){}
    }
    if (toLoc && !locSet.has(toLoc.toLowerCase())) {
      try {
        await fetchJson(`${API_BASE}/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Date.now() + Math.random(), name: toLoc }) });
        locSet.add(toLoc.toLowerCase());
        locSuccess++;
        console.log(`Added Location: ${toLoc}`);
      } catch(e){}
    }

    // 2. Add missing rate tables
    const rateKey = `${fromLoc.toLowerCase()}-${toLoc.toLowerCase()}`;
    if (rate > 0 && !rateSet.has(rateKey)) {
      maxRateId++;
      try {
        await fetchJson(`${API_BASE}/rates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: maxRateId, from_location: fromLoc, to_location: toLoc, weight_mt: weight, rate: rate, hamali: hamali }) });
        rateSet.add(rateKey);
        rateSuccess++;
        console.log(`Added Rate: ${fromLoc} -> ${toLoc} (₹${rate})`);
      } catch(e){}
    }

    // 3. Add missing vehicles
    if (vehicle && !vehSet.has(vehicle)) {
      try {
        await fetchJson(`${API_BASE}/vehicles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Date.now() + Math.random(), number: vehicle, type: "Unknown", capacity_mt: weight }) });
        vehSet.add(vehicle);
        vehSuccess++;
        console.log(`Added Vehicle: ${vehicle}`);
      } catch(e){}
    }

    // 4. Add trip
    maxTripId++;
    const tripDateRaw = row["Date"];
    let tripDateStr = String(tripDateRaw);
    if (typeof tripDateRaw === 'number') {
      // Excel date format
      const d = new Date((tripDateRaw - (25567 + 2)) * 86400 * 1000);
      tripDateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } else {
      // Check if it has a time component or weird format and normalize to DD/MM/YYYY
      if (tripDateStr.includes("-")) {
        const parts = tripDateStr.split("-");
        if (parts.length === 3) {
            if(parts[0].length === 4) { // YYYY-MM-DD
                 tripDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else { // DD-MM-YYYY
                 tripDateStr = `${parts[0]}/${parts[1]}/${parts[2]}`;
            }
        }
      }
    }

    const trip = {
      id: maxTripId,
      serial_no: row["S.No."] || maxTripId,
      trip_date: tripDateStr,
      from_location: fromLoc,
      to_location: toLoc,
      vehicle_no: vehicle,
      chargeable_weight: weight,
      rate: rate,
      hamali: hamali,
      total_freight: Number(row["Total Freight"]) || 0,
    };

    try {
      await fetchJson(`${API_BASE}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });
      tripSuccess++;
      console.log(`Imported trip: ${trip.trip_date} - ${trip.vehicle_no}`);
    } catch (err) {
      console.error(`Failed to import trip:`, err.message);
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Trips Imported: ${tripSuccess}`);
  console.log(`New Locations: ${locSuccess}`);
  console.log(`New Rates: ${rateSuccess}`);
  console.log(`New Vehicles: ${vehSuccess}`);
}

run().catch(console.error);
