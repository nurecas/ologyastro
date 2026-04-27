// -----------------------------------------------------------------------------
// Historical world population — by major region, 1500 → 2025 (millions).
//
// Compiled from McEvedy & Jones (1978), UN historical estimates, Maddison.
// Numbers are rounded to the nearest million — precision is not the point;
// relative regional share is.
//
// Each region has an AstroCartography *centroid* (representative lat/lon).
// -----------------------------------------------------------------------------

export const POP_REGIONS = [
  { name: 'Europe',             centroidLat:  50.0, centroidLon:  15.0 },
  { name: 'East Asia',          centroidLat:  35.0, centroidLon: 110.0 },
  { name: 'South Asia',         centroidLat:  22.0, centroidLon:  78.0 },
  { name: 'Sub-Saharan Africa', centroidLat:  -5.0, centroidLon:  25.0 },
  { name: 'Middle East / N.Afr',centroidLat:  30.0, centroidLon:  40.0 },
  { name: 'Americas',           centroidLat:  15.0, centroidLon: -85.0 },
  { name: 'Oceania',            centroidLat: -25.0, centroidLon: 135.0 },
];

// years aligned; values in millions.
// Historical through 2025 (McEvedy & Jones, UN historical);
// 2030-2080 are UN World Population Prospects 2022 medium-variant projections.
const YEARS =  [1500, 1600, 1700, 1800, 1850, 1900, 1950, 1970, 1990, 2000, 2010, 2020, 2025, 2030, 2050, 2070, 2080];
const TABLE = {
  'Europe':              [ 84, 111, 125, 195, 266, 408, 549, 656, 721, 727, 740, 748, 750, 747, 703, 644, 612],
  'East Asia':           [130, 160, 160, 330, 430, 470, 680, 930,1360,1490,1570,1620,1640,1640,1520,1320,1210],
  'South Asia':          [105, 145, 175, 200, 230, 290, 450, 680,1150,1400,1670,1860,1930,1990,2080,2030,1960],
  'Sub-Saharan Africa':  [ 46,  55,  61,  70,  81, 100, 180, 280, 510, 680, 870,1100,1200,1330,2030,2700,3050],
  'Middle East / N.Afr': [ 25,  30,  30,  30,  40,  60, 100, 170, 310, 390, 470, 540, 580, 620, 750, 840, 870],
  'Americas':            [ 39,  15,  13,  24,  59, 156, 340, 510, 720, 840, 945,1030,1060,1090,1160,1160,1130],
  'Oceania':             [  3,   3,   3,   2,   2,   6,  13,  19,  27,  31,  37,  43,  46,  49,  57,  63,  66],
};

// Linear interpolation of population in millions at a given decimal year.
export function populationAtYear(regionName, year) {
  const row = TABLE[regionName];
  if (!row) return 0;
  if (year <= YEARS[0]) return row[0];
  if (year >= YEARS[YEARS.length - 1]) return row[row.length - 1];
  for (let i = 0; i < YEARS.length - 1; i++) {
    if (year >= YEARS[i] && year <= YEARS[i + 1]) {
      const frac = (year - YEARS[i]) / (YEARS[i + 1] - YEARS[i]);
      return row[i] + frac * (row[i + 1] - row[i]);
    }
  }
  return 0;
}

// Region → weight (sums to 1) at a given year.
export function regionWeightsAtYear(year) {
  let total = 0;
  const vals = new Map();
  for (const r of POP_REGIONS) {
    const v = populationAtYear(r.name, year);
    vals.set(r.name, v);
    total += v;
  }
  const out = new Map();
  for (const [k, v] of vals) out.set(k, total > 0 ? v / total : 0);
  return out;
}

// -----------------------------------------------------------------------------
// Historical population centers — a small but globally distributed set.
// Each city has (name, lat, lon, founded, abandoned?, pop_at_year).
// -----------------------------------------------------------------------------

export const CITIES = [
  { name: 'Beijing',      lat: 39.9,  lon: 116.4, founded: 1500, series: {1500:672,1600:700,1700:650,1800:1100,1850:1600,1900:1100,1950:4300,2000:13500,2025:21800} },
  { name: 'Delhi',        lat: 28.6,  lon:  77.2, founded: 1500, series: {1500:400,1600:500,1700:450,1800:160,1850:150,1900:210,1950:1400,2000:15900,2025:34700} },
  { name: 'Constantinople',lat:41.0,  lon:  28.9, founded: 1500, series: {1500:400,1600:700,1700:700,1800:570,1850:900,1900:950,1950:1100,2000:8700,2025:16100} },
  { name: 'Paris',        lat: 48.9,  lon:   2.3, founded: 1500, series: {1500:225,1600:300,1700:530,1800:550,1850:1314,1900:3330,1950:5900,2000:9700,2025:11200} },
  { name: 'London',       lat: 51.5,  lon:  -0.1, founded: 1500, series: {1500:50,1600:200,1700:575,1800:960,1850:2685,1900:6480,1950:8360,2000:7600,2025:9800} },
  { name: 'Cairo',        lat: 30.0,  lon:  31.2, founded: 1500, series: {1500:400,1600:400,1700:300,1800:263,1850:267,1900:590,1950:2500,2000:10400,2025:23100} },
  { name: 'Tokyo / Edo',  lat: 35.7,  lon: 139.7, founded: 1590, series: {1600:1,1700:1000,1800:1200,1850:1300,1900:1440,1950:6900,2000:34450,2025:37400} },
  { name: 'Kyoto',        lat: 35.0,  lon: 135.8, founded: 1500, series: {1500:200,1600:400,1700:350,1800:380,1850:330,1900:350,1950:1100,2000:1460,2025:1460} },
  { name: 'Mexico City',  lat: 19.4,  lon: -99.1, founded: 1500, series: {1500:200,1600:75,1700:100,1800:125,1850:170,1900:345,1950:3365,2000:18100,2025:22500} },
  { name: 'Cuzco',        lat: -13.5, lon: -71.9, founded: 1500, series: {1500:200,1600:25,1700:30,1800:40,1850:50,1900:80,1950:150,2000:320,2025:440} },
  { name: 'New York',     lat: 40.7,  lon: -74.0, founded: 1624, series: {1700:5,1800:60,1850:500,1900:3400,1950:12340,2000:18000,2025:19000} },
  { name: 'Moscow',       lat: 55.8,  lon:  37.6, founded: 1500, series: {1500:100,1600:100,1700:200,1800:250,1850:365,1900:1040,1950:5100,2000:10000,2025:12600} },
  { name: 'Lagos',        lat:  6.5,  lon:   3.4, founded: 1700, series: {1700:5,1800:5,1850:25,1900:41,1950:325,2000:7200,2025:17000} },
  { name: 'Baghdad',      lat: 33.3,  lon:  44.4, founded: 1500, series: {1500:60,1600:50,1700:30,1800:50,1850:50,1900:145,1950:580,2000:5500,2025:7700} },
  { name: 'Isfahan',      lat: 32.7,  lon:  51.7, founded: 1500, series: {1500:80,1600:250,1700:600,1800:120,1850:80,1900:60,1950:254,2000:1600,2025:2300} },
  { name: 'Venice',       lat: 45.4,  lon:  12.3, founded: 1500, series: {1500:100,1600:139,1700:140,1800:138,1850:120,1900:151,1950:175,2000:271,2025:258} },
  { name: 'Madrid',       lat: 40.4,  lon:  -3.7, founded: 1500, series: {1500:35,1600:110,1700:110,1800:160,1850:281,1900:540,1950:1620,2000:5500,2025:6700} },
  { name: 'Manila',       lat: 14.6,  lon: 120.9, founded: 1571, series: {1600:30,1700:40,1800:60,1850:140,1900:220,1950:1570,2000:10000,2025:14800} },
  { name: 'Tenochtitlan / MX', lat: 19.43, lon:-99.13, founded: 1500, abandoned: 1525, series: {1500:200,1525:0} },
  { name: 'Sydney',       lat:-33.9,  lon: 151.2, founded: 1788, series: {1800:5,1850:40,1900:480,1950:1700,2000:4100,2025:5500} },
];

// Pop in thousands at a decimal year.
export function cityPopAtYear(city, year) {
  if (city.abandoned && year >= city.abandoned) return 0;
  if (year < city.founded) return 0;
  const keys = Object.keys(city.series).map(Number).sort((a, b) => a - b);
  if (year <= keys[0]) return city.series[keys[0]];
  if (year >= keys[keys.length - 1]) return city.series[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    if (year >= keys[i] && year <= keys[i + 1]) {
      const a = city.series[keys[i]];
      const b = city.series[keys[i + 1]];
      const frac = (year - keys[i]) / (keys[i + 1] - keys[i]);
      return a + frac * (b - a);
    }
  }
  return 0;
}
