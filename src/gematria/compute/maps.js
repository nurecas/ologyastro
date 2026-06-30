// Gematria — letter-value lookup tables for every supported script + system.
// Ported verbatim from the standalone Gematria.html so behaviour matches.

/* ----- HEBREW ----- */
export const HEBREW = {
  letters: [
    ['א','Alef',   1,   1,   1],
    ['ב','Bet',    2,   2,   2],
    ['ג','Gimel',  3,   3,   3],
    ['ד','Dalet',  4,   4,   4],
    ['ה','He',     5,   5,   5],
    ['ו','Vav',    6,   6,   6],
    ['ז','Zayin',  7,   7,   7],
    ['ח','Het',    8,   8,   8],
    ['ט','Tet',    9,   9,   9],
    ['י','Yod',   10,  10,  10],
    ['כ','Kaf',   20,  20,  11],
    ['ך','Kaf sofit', 20, 500, 11],
    ['ל','Lamed', 30,  30,  12],
    ['מ','Mem',   40,  40,  13],
    ['ם','Mem sofit', 40, 600, 13],
    ['נ','Nun',   50,  50,  14],
    ['ן','Nun sofit', 50, 700, 14],
    ['ס','Samekh',60,  60,  15],
    ['ע','Ayin',  70,  70,  16],
    ['פ','Pe',    80,  80,  17],
    ['ף','Pe sofit',  80, 800, 17],
    ['צ','Tsade', 90,  90,  18],
    ['ץ','Tsade sofit', 90, 900, 18],
    ['ק','Qof',  100, 100,  19],
    ['ר','Resh', 200, 200,  20],
    ['ש','Shin', 300, 300,  21],
    ['ת','Tav',  400, 400,  22],
  ],
  names: {
    'א':'אלף','ב':'בית','ג':'גימל','ד':'דלת','ה':'הא','ו':'וו','ז':'זין',
    'ח':'חית','ט':'טית','י':'יוד','כ':'כף','ך':'כף','ל':'למד','מ':'מם','ם':'מם',
    'נ':'נון','ן':'נון','ס':'סמך','ע':'עין','פ':'פא','ף':'פא','צ':'צדי','ץ':'צדי',
    'ק':'קוף','ר':'ריש','ש':'שין','ת':'תו',
  },
  atbashOrder: ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],
  albamOrder:  ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],
};

export const HEB_STD = {}, HEB_GADOL = {}, HEB_ORD = {}, HEB_NAME = {};
HEBREW.letters.forEach(([l, n, s, g, o]) => {
  HEB_STD[l] = s; HEB_GADOL[l] = g; HEB_ORD[l] = o; HEB_NAME[l] = n;
});

export const HEB_ATBASH = {};
{
  const a = HEBREW.atbashOrder;
  for (let i = 0; i < a.length; i++) HEB_ATBASH[a[i]] = HEB_STD[a[a.length - 1 - i]];
  ['ך','ם','ן','ף','ץ'].forEach((sof, i) => {
    HEB_ATBASH[sof] = HEB_ATBASH[['כ','מ','נ','פ','צ'][i]];
  });
}

export const HEB_ALBAM = {};
{
  const a = HEBREW.albamOrder;
  for (let i = 0; i < 11; i++) {
    HEB_ALBAM[a[i]] = HEB_STD[a[i + 11]];
    HEB_ALBAM[a[i + 11]] = HEB_STD[a[i]];
  }
  ['ך','ם','ן','ף','ץ'].forEach((sof, i) => {
    HEB_ALBAM[sof] = HEB_ALBAM[['כ','מ','נ','פ','צ'][i]];
  });
}

/* ----- GREEK ----- */
export const GREEK = {
  letters: [
    ['α','Alpha',   1,  1],
    ['β','Beta',    2,  2],
    ['γ','Gamma',   3,  3],
    ['δ','Delta',   4,  4],
    ['ε','Epsilon', 5,  5],
    ['ϛ','Stigma',  6,  6],
    ['ζ','Zeta',    7,  7],
    ['η','Eta',     8,  8],
    ['θ','Theta',   9,  9],
    ['ι','Iota',   10, 10],
    ['κ','Kappa',  20, 11],
    ['λ','Lambda', 30, 12],
    ['μ','Mu',     40, 13],
    ['ν','Nu',     50, 14],
    ['ξ','Xi',     60, 15],
    ['ο','Omicron',70, 16],
    ['π','Pi',     80, 17],
    ['ϟ','Koppa',  90, 18],
    ['ρ','Rho',   100, 19],
    ['σ','Sigma', 200, 20],
    ['ς','Final sigma', 200, 20],
    ['τ','Tau',   300, 21],
    ['υ','Upsilon',400,22],
    ['φ','Phi',   500, 23],
    ['χ','Chi',   600, 24],
    ['ψ','Psi',   700, 25],
    ['ω','Omega', 800, 26],
    ['ϡ','Sampi', 900, 27],
  ],
};
export const GRK_STD = {}, GRK_ORD = {}, GRK_NAME = {};
GREEK.letters.forEach(([l, n, s, o]) => {
  GRK_STD[l.toLowerCase()] = s;
  GRK_STD[l.toUpperCase()] = s;
  GRK_ORD[l.toLowerCase()] = o;
  GRK_ORD[l.toUpperCase()] = o;
  GRK_NAME[l.toLowerCase()] = n;
});
GRK_STD['Σ'] = 200; GRK_ORD['Σ'] = 20;

/* ----- ARABIC ----- */
export const ARABIC = {
  letters: [
    ['ا','Alif',   1],
    ['ب','Ba',     2],
    ['ج','Jim',    3],
    ['د','Dal',    4],
    ['ه','Ha',     5],
    ['و','Waw',    6],
    ['ز','Zay',    7],
    ['ح','Ha(hutti)', 8],
    ['ط','Ta',     9],
    ['ي','Ya',    10],
    ['ك','Kaf',   20],
    ['ل','Lam',   30],
    ['م','Mim',   40],
    ['ن','Nun',   50],
    ['س','Sin',   60],
    ['ع','Ayn',   70],
    ['ف','Fa',    80],
    ['ص','Sad',   90],
    ['ق','Qaf',  100],
    ['ر','Ra',   200],
    ['ش','Shin', 300],
    ['ت','Ta(marbuta)', 400],
    ['ث','Tha',  500],
    ['خ','Kha',  600],
    ['ذ','Dhal', 700],
    ['ض','Dad',  800],
    ['ظ','Za',   900],
    ['غ','Ghayn',1000],
  ],
};
export const ARB_STD = {}, ARB_NAME = {};
ARABIC.letters.forEach(([l, n, v]) => { ARB_STD[l] = v; ARB_NAME[l] = n; });
ARB_STD['أ'] = 1; ARB_STD['إ'] = 1; ARB_STD['آ'] = 1; ARB_STD['ء'] = 1;
ARB_STD['ة'] = 5; ARB_STD['ى'] = 10; ARB_STD['ؤ'] = 6; ARB_STD['ئ'] = 10;

/* ----- ENGLISH ----- */
export const ENG_ORDINAL     = {};
export const ENG_REVERSE     = {};
export const ENG_REDUCTION   = {};
export const ENG_REV_REDUCTION = {};
export const ENG_AGRIPPA     = {};
export const ENG_CHALDEAN    = {
  'A':1,'I':1,'J':1,'Q':1,'Y':1,
  'B':2,'K':2,'R':2,
  'C':3,'G':3,'L':3,'S':3,
  'D':4,'M':4,'T':4,
  'E':5,'H':5,'N':5,'X':5,
  'U':6,'V':6,'W':6,
  'O':7,'Z':7,
  'F':8,'P':8,
};

for (let i = 0; i < 26; i++) {
  const ch = String.fromCharCode(65 + i);
  ENG_ORDINAL[ch]   = i + 1;
  ENG_REVERSE[ch]   = 26 - i;
  ENG_REDUCTION[ch] = (i % 9) + 1;
  ENG_REV_REDUCTION[ch] = ((26 - i - 1) % 9) + 1;
  if (i < 9)       ENG_AGRIPPA[ch] = i + 1;
  else if (i < 18) ENG_AGRIPPA[ch] = (i - 8) * 10;
  else             ENG_AGRIPPA[ch] = (i - 17) * 100;
}

export const VOWELS_ENGLISH    = new Set(['A','E','I','O','U']);
export const VOWELS_ENGLISH_Y  = new Set(['A','E','I','O','U','Y']);
export const VOWELS_HEBREW     = new Set(['א','ה','ו','י']);
export const VOWELS_GREEK      = new Set(['α','ε','η','ι','ο','υ','ω','Α','Ε','Η','Ι','Ο','Υ','Ω']);
export const VOWELS_ARABIC     = new Set(['ا','و','ي','ى','أ','إ','آ']);

export function getVowelSet(lang, includeY) {
  if (lang === 'english') return includeY ? VOWELS_ENGLISH_Y : VOWELS_ENGLISH;
  if (lang === 'hebrew')  return VOWELS_HEBREW;
  if (lang === 'greek')   return VOWELS_GREEK;
  return VOWELS_ARABIC;
}
