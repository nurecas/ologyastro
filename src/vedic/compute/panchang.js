// Vedic Panchang — the five "limbs" of the Hindu calendar at the moment of
// birth: Tithi (lunar day), Nakshatra (lunar mansion — already shown in the
// chart), Yoga (Sun+Moon-based, not the planetary "yogas"), Karana (half a
// tithi), Vara (weekday). Computed from sidereal Sun and Moon longitudes.

import { NAKSHATRAS } from './data.js';

// Tithi names — a cycle of 30 lunar days, repeated each lunar month.
// Two pakshas (halves) of 15 each: Shukla (waxing) → Krishna (waning).
const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi',  'Saptami', 'Ashtami', 'Navami',     'Dashami',
  'Ekadashi',  'Dvadashi','Trayodashi','Chaturdashi',
];

// 27 Yogas (sum of Sun and Moon longitudes / 13°20′).
const YOGA_NAMES = [
  'Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarman',
  'Dhriti','Shoola','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana',
  'Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha',
  'Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti',
];

// 11 Karanas; the first 7 (Bava–Vishti) cycle through the 56 movable
// karanas, and the last 4 (Shakuni, Chatushpada, Naga, Kimstughna) are the
// four fixed Karanas at the cycle's poles. Total of 60 karanas in a lunar
// month.
const KARANA_NAMES = [
  'Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti',
  // movable repeats; mapping below handles index → name:
];
const FIXED_KARANAS = ['Shakuni','Chatushpada','Naga','Kimstughna'];

// Vara = weekday. Vedic vara strictly starts at sunrise, but the standard
// modern simplification is to use the LOCAL calendar day. Caller must
// pass `localDate` already shifted by the tz offset — using UT here would
// be wrong for any birth in the pre-sunrise UT window (e.g. a 2 AM IST
// birth = 8:30 PM UT of the previous day → wrong vara by one day).
const VARA = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }

// Tithi: the angular separation (Moon - Sun)/12° gives a tithi index in [0,29].
// Index 0..14: Shukla Paksha (Pratipada..Purnima/15)
// Index 15..29: Krishna Paksha (Pratipada..Amavasya/30)
function tithiAt(sunLon, moonLon) {
  const diff = norm360(moonLon - sunLon);
  const idx = Math.floor(diff / 12);          // 0..29
  const within = diff - idx * 12;
  const fraction = within / 12;                // 0..1 within this tithi
  const isShukla = idx < 15;
  const dayOfPaksha = idx % 15;                 // 0..14
  const name = dayOfPaksha === 14
    ? (isShukla ? 'Purnima' : 'Amavasya')
    : TITHI_NAMES[dayOfPaksha];
  return {
    index: idx + 1,                             // 1..30 for display
    paksha: isShukla ? 'Shukla' : 'Krishna',
    name,
    fraction,
  };
}

// Yoga: (Sun + Moon)/13°20'.
function yogaAt(sunLon, moonLon) {
  const sum = norm360(sunLon + moonLon);
  const span = 360 / 27;
  const idx = Math.floor(sum / span);
  const within = sum - idx * span;
  return { index: idx + 1, name: YOGA_NAMES[idx], fraction: within / span };
}

// Karana: each tithi has two karanas (first half + second half).
// Tithi indices 1..30, each split into two halves → 60 karanas in a month.
// The 4 fixed karanas occupy positions 58, 59, 60, 1 of the cycle (per
// classical convention), and the 7 movable karanas (Bava..Vishti) cycle 8
// times through positions 2..57.
function karanaAt(sunLon, moonLon) {
  const diff = norm360(moonLon - sunLon);
  const idx = Math.floor(diff / 6);             // 0..59 (each karana = 6° of Moon-Sun)
  // Position in the 60-karana monthly cycle (1..60):
  const pos = idx + 1;
  let name;
  if (pos === 1)        name = FIXED_KARANAS[3];   // Kimstughna (after Amavasya)
  else if (pos >= 58)   name = FIXED_KARANAS[pos - 58];   // Shakuni / Chatushpada / Naga
  else                  name = KARANA_NAMES[(pos - 2) % 7];
  return { index: pos, name };
}

// `localDate`: the birth moment shifted by the tzOffset so vara reflects
// the user's actual calendar day. Tithi / Yoga / Karana don't depend on
// this — they're computed directly from the sidereal Sun and Moon at the
// exact birth moment.
export function computePanchang(sunLonSidereal, moonLonSidereal, localDate) {
  const tithi   = tithiAt(sunLonSidereal, moonLonSidereal);
  const yoga    = yogaAt(sunLonSidereal, moonLonSidereal);
  const karana  = karanaAt(sunLonSidereal, moonLonSidereal);
  const vara    = VARA[localDate.getUTCDay()];
  // Nakshatra of the Moon — the "lunar mansion" of the day.
  const nakIdx  = Math.floor(norm360(moonLonSidereal) / (360 / 27));
  const nakshatra = NAKSHATRAS[nakIdx];
  return {
    tithi,
    yoga,
    karana,
    vara,
    nakshatra: { name: nakshatra.name, lord: nakshatra.lord, index: nakshatra.index + 1 },
  };
}
