export const seedLocations = [
  "IIL-Gachibowli",
  "RGI Airport",
  "IIL-Karkapatla",
  "IIL-Uppal",
  "IIL-Cherlapally",
  "Potential-ALEAP",
  "Jubilee Hills",
];

export const seedVehicles = [
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

const hamaliByWeight: Record<number, number> = {
  1: 1200,
  3: 2400,
  6: 3600,
  9: 6000,
  12: 7200,
};

const annexure = [
  { from: "IIL-Gachibowli", to: "RGI Airport", rates: { 1: 2800, 3: 4000, 6: 6500 } },
  { from: "IIL-Gachibowli", to: "IIL-Karkapatla", rates: { 1: 4200, 3: 5600, 6: 6900 } },
  { from: "IIL-Gachibowli", to: "IIL-Uppal", rates: { 1: 2900, 3: 4500, 6: 6000 } },
  { from: "IIL-Gachibowli", to: "IIL-Cherlapally", rates: { 1: 3000, 3: 4800, 6: 6500 } },
  { from: "IIL-Gachibowli", to: "Potential-ALEAP", rates: { 1: 2800, 3: 4300, 6: 6000 } },
  { from: "IIL-Karkapatla", to: "RGI Airport", rates: { 1: 5500, 3: 8000, 6: 9000, 9: 9500, 12: 9800 } },
  { from: "IIL-Karkapatla", to: "IIL-Uppal", rates: { 1: 3500, 3: 4900, 6: 5900, 9: 6800, 12: 7500 } },
  { from: "IIL-Karkapatla", to: "IIL-Gachibowli", rates: { 1: 3500, 3: 5000, 6: 6200 } },
  { from: "IIL-Karkapatla", to: "IIL-Cherlapally", rates: { 1: 3400, 3: 4800, 6: 5800, 9: 6300, 12: 7500 } },
  { from: "IIL-Karkapatla", to: "Potential-ALEAP", rates: { 1: 3400, 3: 4800, 6: 5800, 9: 6300, 12: 7500 } },
  { from: "Potential-ALEAP", to: "RGI Airport", rates: { 1: 4000, 3: 5000, 6: 6500, 9: 8500, 12: 9500 } },
  { from: "Potential-ALEAP", to: "IIL-Uppal", rates: { 1: 4200, 3: 5500, 6: 7500, 9: 8500, 12: 9000 } },
  { from: "Potential-ALEAP", to: "IIL-Gachibowli", rates: { 1: 4000, 3: 5200, 6: 6500 } },
  { from: "Potential-ALEAP", to: "IIL-Karkapatla", rates: { 1: 4000, 3: 5200, 6: 7500, 9: 8500, 12: 9200 } },
  { from: "Potential-ALEAP", to: "IIL-Cherlapally", rates: { 1: 4000, 3: 5500, 6: 7500, 9: 8500, 12: 9200 } },
  { from: "IIL-Cherlapally", to: "IIL-Karkapatla", rates: { 1: 4500, 3: 6000, 6: 7500, 9: 8500, 12: 10500 } },
  { from: "IIL-Cherlapally", to: "IIL-Gachibowli", rates: { 1: 4500, 3: 6000, 6: 7500 } },
  { from: "IIL-Cherlapally", to: "RGI Airport", rates: { 1: 4500, 3: 6000, 6: 7500, 9: 8500, 12: 10500 } },
  { from: "IIL-Cherlapally", to: "IIL-Uppal", rates: { 1: 2800, 3: 4000, 6: 6500, 9: 7500, 12: 8500 } },
  { from: "IIL-Cherlapally", to: "Potential-ALEAP", rates: { 1: 4500, 3: 6000, 6: 7500, 9: 8500, 12: 10500 } },
  { from: "IIL-Uppal", to: "IIL-Gachibowli", rates: { 1: 2800, 3: 4000, 6: 6500 } },
  { from: "IIL-Uppal", to: "IIL-Karkapatla", rates: { 1: 3500, 3: 4500, 6: 6500, 9: 8500, 12: 10500 } },
  { from: "IIL-Uppal", to: "Potential-ALEAP", rates: { 1: 4500, 3: 6000, 6: 7500, 9: 8500, 12: 10500 } },
  { from: "IIL-Uppal", to: "Jubilee Hills", rates: { 1: 2800, 3: 4000, 6: 6500 } },
  { from: "IIL-Uppal", to: "IIL-Cherlapally", rates: { 1: 2800, 3: 4000, 6: 6500 } },
];

export const seedRoutes = annexure.flatMap((route) =>
  Object.entries(route.rates).map(([weight, rate]) => {
    const weight_mt = Number(weight);
    return {
      from_location: route.from,
      to_location: route.to,
      weight_mt,
      rate: Number(rate),
      hamali: hamaliByWeight[weight_mt] ?? 0,
    };
  }),
);
