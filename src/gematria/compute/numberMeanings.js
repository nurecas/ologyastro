// Gematria — number meanings + mathematical/mystical fingerprint.

export const NUMBER_MEANINGS = {
  1: { title:'The Origin',    keywords:'Leadership · independence · the initiating spark',
       body:'Pure beginning. The will that decides, the seed that breaks the soil. Strong individuality and pioneering spirit, but the shadow is isolation and self-absorption.' },
  2: { title:'The Mirror',    keywords:'Duality · partnership · sensitivity · diplomacy',
       body:'Cooperation and balance. Carries the gift of empathy and patience to see another’s side. The shadow is hesitation and dependence.' },
  3: { title:'The Triangle',  keywords:'Expression · creativity · joy · communication',
       body:'The creative voice. Words, art, performance — the soul speaking outward. Optimistic and magnetic, but easily scattered.' },
  4: { title:'The Builder',   keywords:'Foundation · order · discipline · structure',
       body:'The patient architect. Lays brick by brick, prizes loyalty and method. The shadow is rigidity.' },
  5: { title:'The Messenger', keywords:'Change · freedom · sensuality · adventure',
       body:'The wanderer. Quicksilver intelligence, magnetic curiosity, refusal to be caged. The shadow is restlessness and escape.' },
  6: { title:'The Heart',     keywords:'Harmony · service · responsibility · love',
       body:'The nurturer and healer. Beauty, family, devotion. The shadow is over-giving and martyrdom.' },
  7: { title:'The Seeker',    keywords:'Mystery · wisdom · solitude · contemplation',
       body:'The mystic and analyst both. Trusts the unseen, questions the seen. The shadow is withdrawal.' },
  8: { title:'The Sovereign', keywords:'Power · mastery · abundance · authority',
       body:'The worldly architect. Capable of great achievement and material command. Karma weighs heavy here.' },
  9: { title:'The Universal', keywords:'Completion · compassion · wisdom · letting go',
       body:'The soul who has lived all the others. Humanitarian, artistic, mature.' },
  11:{ title:'The Illuminator (Master)', keywords:'Intuition · vision · spiritual messenger',
       body:'A master number — the doubled 1. Heightened intuition, channeled inspiration. Can collapse to 2 under strain.' },
  22:{ title:'The Master Builder', keywords:'Vision made manifest · earthly mastery',
       body:'The most powerful number — the doubled 2. Builds dreams into stone and law. Falls to 4 when overwhelmed.' },
  33:{ title:'The Master Teacher', keywords:'Compassionate service · the Christ frequency',
       body:'The rarest master — pure devotional service, healing through love.' },
};

function isPrime(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}
function isTriangular(n) {
  if (n < 1) return false;
  const x = 8 * n + 1;
  const r = Math.round(Math.sqrt(x));
  return r * r === x;
}
function isSquare(n) {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}
function isPerfect(n) {
  if (n < 2) return false;
  let sum = 1;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) { sum += i; if (i !== n / i) sum += n / i; }
  }
  return sum === n;
}
function isFibonacci(n) {
  return isSquare(5 * n * n + 4) || isSquare(5 * n * n - 4);
}

export function fingerprint(n) {
  const f = [];
  if (n === 0) return [];
  if (isPrime(n))      f.push({ tag:'Prime', note:'Indivisible — only 1 and itself.' });
  if (isTriangular(n)) f.push({ tag:'Triangular', note:'Sum of consecutive integers — Pythagorean tetractys form.' });
  if (isSquare(n))     f.push({ tag:'Square', note:'A perfect square — fourfold balance.' });
  if (isPerfect(n))    f.push({ tag:'Perfect', note:'Equal to the sum of its proper divisors.' });
  if (isFibonacci(n))  f.push({ tag:'Fibonacci', note:'In the golden series.' });
  if (n === 7)   f.push({ tag:'Heptad', note:'Days of creation, planets of the ancients, chakras.' });
  if (n === 12)  f.push({ tag:'Dodecad', note:'Zodiac, tribes of Israel, apostles.' });
  if (n === 13)  f.push({ tag:'Hebrew unity', note:'אחד and אהבה both equal 13 — love as oneness.' });
  if (n === 18)  f.push({ tag:'Chai', note:'חי — life. The number of vitality in Hebrew.' });
  if (n === 22)  f.push({ tag:'Hebrew alphabet', note:'The 22 letters; the paths of the Tree of Life.' });
  if (n === 26)  f.push({ tag:'YHVH', note:'The Tetragrammaton — divine name.' });
  if (n === 32)  f.push({ tag:'Paths of wisdom', note:'10 sephirot + 22 letters of the Tree.' });
  if (n === 33)  f.push({ tag:'Christ frequency', note:'Master teacher number; lifespan of Christ.' });
  if (n === 36)  f.push({ tag:'Lamed-Vav', note:'The 36 hidden righteous who sustain the world.' });
  if (n === 40)  f.push({ tag:'Trial', note:'40 days of flood, fasting, wandering.' });
  if (n === 42)  f.push({ tag:'42-letter Name', note:'Mystical divine name.' });
  if (n === 50)  f.push({ tag:'Jubilee', note:'50 gates of understanding.' });
  if (n === 72)  f.push({ tag:'Shem ha-Mephorash', note:'72 names of God; 72 angels.' });
  if (n === 108) f.push({ tag:'Sacred 108', note:'Mantra repetitions.' });
  if (n === 144) f.push({ tag:'Apocalypse', note:'12 × 12 — the 144,000 sealed.' });
  if (n === 153) f.push({ tag:'Fishes', note:'The miraculous catch in John 21.' });
  if (n === 248) f.push({ tag:'Limbs', note:'248 positive commandments.' });
  if (n === 358) f.push({ tag:'Mashiach · Nachash', note:'Both Messiah and Serpent — redemption hidden in the fall.' });
  if (n === 365) f.push({ tag:'Solar year', note:'Days of the year; 365 negative commandments.' });
  if (n === 666) f.push({ tag:'Number of the Beast', note:'Revelation 13:18.' });
  if (n === 777) f.push({ tag:'Triple seven', note:'Crowley’s number; perfection thrice.' });
  if (n === 888) f.push({ tag:'Iēsous', note:'The Greek value of Jesus — the number of resurrection.' });
  return f;
}

// ---------- Date numerology ----------

export function digitSum(n, preserveMasters = true) {
  let cur = Math.abs(parseInt(n, 10));
  if (Number.isNaN(cur)) return 0;
  while (cur > 9) {
    if (preserveMasters && (cur === 11 || cur === 22 || cur === 33)) break;
    cur = String(cur).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  }
  return cur;
}

export function lifePath(year, month, day) {
  const m = digitSum(month);
  const d = digitSum(day);
  const y = digitSum(year);
  const total = m + d + y;
  const final = digitSum(total);
  return { m, d, y, total, final, isMaster: [11, 22, 33].includes(final) };
}

export function birthdayNum(day) {
  return { value: parseInt(day, 10), reduced: digitSum(day), raw: parseInt(day, 10) };
}

export function personalYear(month, day, calYear) {
  const m = digitSum(month), d = digitSum(day), y = digitSum(calYear);
  const total = m + d + y;
  return { total, final: digitSum(total) };
}

export function universalYear(year) { return digitSum(year); }

export function pinnacles(year, month, day) {
  const m = digitSum(month), d = digitSum(day), y = digitSum(year);
  const p1 = digitSum(m + d);
  const p2 = digitSum(d + y);
  const p3 = digitSum(p1 + p2);
  const p4 = digitSum(m + y);
  const lp = digitSum(m + d + y);
  const end1 = 36 - lp;
  return [
    { name:'1st Pinnacle',  value:p1, period:`Birth — age ${end1}`,        isMaster:[11,22,33].includes(p1) },
    { name:'2nd Pinnacle',  value:p2, period:`Age ${end1+1} — ${end1+9}`,   isMaster:[11,22,33].includes(p2) },
    { name:'3rd Pinnacle',  value:p3, period:`Age ${end1+10} — ${end1+18}`, isMaster:[11,22,33].includes(p3) },
    { name:'4th Pinnacle',  value:p4, period:`Age ${end1+19} — onwards`,    isMaster:[11,22,33].includes(p4) },
  ];
}

export function challenges(year, month, day) {
  const m = digitSum(month, false);
  const d = digitSum(day, false);
  const y = digitSum(year, false);
  return [
    { name:'1st Challenge', value:Math.abs(m - d), period:'Early life'   },
    { name:'2nd Challenge', value:Math.abs(d - y), period:'Middle years' },
    { name:'3rd Challenge', value:Math.abs(Math.abs(m - d) - Math.abs(d - y)), period:'Main lesson'  },
    { name:'4th Challenge', value:Math.abs(m - y), period:'Later life'   },
  ];
}
