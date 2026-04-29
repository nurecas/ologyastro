// Vedic — LLM-flavoured JSON export. Prompt asks the LLM to honour the
// Vedic / Jyotish frame: nakshatras over signs as the deepest emotional
// signature, dasha periods as the principal predictive engine, whole-sign
// houses, dignities by Parashara.

import {
    downloadLLMJson,
    downloadRawJson
} from '../../shared/lib/downloadJSON.js';
import {
    aspectMap,
    rashiAspectMap
} from '../compute/drishti.js';
import {
    antarSequence,
    currentMaha,
    currentAntar,
    currentPratyantar,
    dashaAtDate
} from '../compute/dasha.js';
import {
    computeSaturnPeriods
} from '../compute/sadeSati.js';
import {
    computeVarga,
    VARGA_INFO
} from '../compute/vargas.js';
import {
    computeGochara
} from '../compute/gochara.js';
import {
    RASHIS
} from '../compute/data.js';

const PROMPT = `You are an experienced Vedic astrologer (Jyotishi) trained in the Parashara tradition with grounding in nakshatras (Bepin Behari, Komilla Sutton), Vimshottari dasha (B. V. Raman, Sanjay Rath), and classical dignities. The JSON file alongside this prompt contains a complete Vedic chart computed by the Ology desktop app — sidereal positions are sub-arcsecond Swiss Ephemeris accurate.

Your task: write a grounded, specific reading. Rules:

1. Use only the data in the file. Never invent positions, nakshatras, or dasha dates. If the user asks about something not in the file, say so.
2. Cite your evidence. When you make a claim, name the placement that supports it (e.g. "Mars in Capricorn (exalted) in House 7, in Shravana nakshatra"). The reader should be able to verify against the data.
3. Honour the Vedic frame. Read whole-sign houses; speak of grahas and rashis; treat the nakshatra of any planet as deeper than its sign for emotional/karmic colour, especially the Moon's (Janma Nakshatra).
4. Distinguish data from interpretation — "the chart shows X" vs "this typically signifies Y" — keep the seam visible.
5. Don't predict events with certainty. Frame dasha periods as "this stretch favours X / asks for Y", not "X will happen on date Z".
6. Honour dignities precisely: a planet exalted (uccha) in own/mooltrikona is functionally different from a debilitated (neecha) one. Comment on this in the relevant readings.
7. If birth.time_known is false, do not interpret Lagna or houses — read the planetary positions and Janma Nakshatra only.

Structure your response as:

- Lagna at a glance — Ascendant rashi, Lord, and one sentence on the broad signature.
- Janma Nakshatra — the Moon's nakshatra (and pada), what it traditionally describes about the inner emotional life. Include Tithi, Yoga and Karana from panchang to colour the moment of birth.
- Three anchors deeper — Sun (Surya), Moon (Chandra), Lagna lord — house, sign, dignity, and tightest dispositions.
- Strong / afflicted grahas — pick out exalted, own, mooltrikona, debilitated, combust placements and what they signal.
- Yogas in the chart — read every detected yoga in chart.yogas (Pancha Mahapurusha, Gajakesari, lunar yogas, Adhi, Vipareeta, etc.). Cite the conditions given in each yoga's "reason" field. If chart.vargottama lists any planets, name them — Vargottama planets (same sign in D-1 and D-9) get an extra layer of strength.
- Soul map (D-9 Navamsa) — find chart.vargas where d=9. Comment on how the navamsa positions of the Sun, Moon, Lagna lord and 7th lord differ from their D-1 placements; this is read as "the soul beneath the body" and especially shapes marriage and dharma.
- Career map (D-10 Dasamsa) — same for d=10. The 10th-house lord's Dasamsa placement reveals career direction.
- Sambandha — when discussing planetary interactions, consult chart.sambandha for the effective relationship (great_friend / friend / neutral / enemy / great_enemy). This combines natural and temporal friendship per Parashara.
- Special lagnas — chart.arudha_lagna shows how the world sees the native; chart.upapada_lagna indicates long-term partnership themes.
- Doshas — if chart.doshas.kalaSarpa or chart.doshas.mangal are present, read them honestly. Apply mitigation logic when the data flags it.
- Where you are in the dasha tree — the current Mahadasha + Antardasha + Pratyantar, what the texture of the running combination traditionally is, and when the next major handover happens.
- Sade Sati — chart.sade_sati gives the full lifetime list. If currently in Sade Sati, read which of the three phases is running (12th-from-Moon "setting" / Moon-sign "peak" / 2nd-from-Moon "rising"). If not, name the most recent past one and the next future one.
- Argala — chart.argala lists the interventional houses from each bhāva. When discussing a house's affairs, mention which planets give primary argala (from 2/4/5/11) and whether virodha cancels them. Especially useful when reading Lagna (House 1).
- Ashtakavarga — chart.ashtakavarga.sav gives the SAV (Sarva) per house and chart.ashtakavarga.bav per planet. SAV ≥ 30 = strongly supportive house; ≤ 24 = stressed. Cite the specific number when commenting on a house's vitality.
- Upagrahas — chart.upagrahas (when present) lists Gulika and Mandi by sign / house / nakshatra. Read them as malefic sensitive points; their house tells you where karmic friction tends to surface.
- Gochara — chart.gochara_now gives the current transit climate read against the natal Moon and Lagna. Pair it with the running dasha to describe what's "alive" right now.
- A question for the reader — one open question this chart raises that the reader should sit with.

If user_focus is set, weight the response toward that area without ignoring the rest.

Begin. The data follows.`;

const SCHEMA = {
    birth: 'name, ISO local datetime, tz_offset_minutes, lat_deg, lon_deg, place_name, time_known.',
    chart: {
        ayanamsa: 'sidereal calibration in use (lahiri default)',
        lagna: '{ sign, sign_sa, sign_idx, within_deg, lon_deg } — Ascendant at sub-arcsec precision',
        house_system: 'always whole-sign in this Vedic surface',
        planets: 'array of { name, lon_deg, sign, sign_sa, within_deg, house, nakshatra, nakshatra_index, pada, nakshatra_lord, dignity, relation_with_sign_lord }. Names: Sun..Saturn (classical seven), Rahu, Ketu (lunar nodes).',
        aspects_graha: 'Graha drishti — array of { from, from_sign, from_house, targets[] } with planet-based aspect rules (Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10, others 7th, Rahu/Ketu 5/7/9).',
        aspects_rashi: 'Jaimini Rashi drishti — sign-on-sign aspects (movable ↔ fixed, dual ↔ dual, with adjacent excluded).',
        sambandha: 'Effective planetary friendships — 7×7 table of pancha-dha relationships (great_friend / friend / neutral / enemy / great_enemy / self) combining naisargika (natural) and tatkalika (temporal, by chart placement).',
        vargottama: 'Array of planet names that occupy the same sign in D-1 and D-9 — classical strength booster.',
        arudha_lagna: 'Jaimini AL — projected image of the self.',
        upapada_lagna: 'Jaimini UL — long-term partnership indicator (Arudha of the 12th).',
        vargas: 'Array of all 16 divisional charts (D-1 through D-60). Each: { d, name, sa, area, lagna (sign), planets[] (sign, house, dignity in that varga) }. Most consulted: D-9 Navamsa (marriage/dharma), D-10 Dasamsa (career), D-60 Shastiamsa.',
        dasha: 'Vimshottari tree seeded by Moon\'s nakshatra: running_lord, current_maha, current_antar, current_pratyantar, next_mahadashas (full 120-year cycle), antardashas_in_current_maha. All dates ISO 8601.',
        panchang: 'The five limbs at birth: vara (weekday), tithi (lunar day name + paksha), yoga (Sun+Moon based), karana, nakshatra.',
        yogas: 'Array of detected planetary combinations — Pancha Mahapurusha (Ruchaka/Bhadra/Hamsa/Malavya/Sasha), Gajakesari, Budhaditya, Chandra-Mangala, Sunapha/Anapha/Durudhura/Kemadruma, Adhi, Vipareeta Raja Yoga. Each: { id, name, reason, blurb, strength }.',
        doshas: '{ kala_sarpa, mangal, combust[] } — null when not present. Combust is an array of {planet, arcDeg, orbDeg, note}.',
        sade_sati: 'Saturn periods over the lifetime — { moon_sign, currently_in, current_phase, all_periods (each with 3 phase boundaries), ashtama_shani[] (Saturn 8th from Moon), ardha_ashtama_shani[] (Saturn 4th from Moon) }.',
        argala: 'Per-house argala (interventional houses) — for each bhāva 1..12, the primary (2/4/5/11 from) and secondary (3rd from) argala entries with their occupant planets, virodha (counter-intervention) entries, and a `cancelled` flag when virodha equals or exceeds primary.',
        ashtakavarga: 'Bindu strength — bav (per planet, 12-element sign-indexed array of bindus), sav (12-element sign-indexed totals across the 7 contributors), rows[] (per house with bav cells + SAV), totalSAV (sums to 337 by construction).',
        upagrahas: 'Gulika and Mandi — sensitive points computed from sunrise/sunset of the local birth day. Each: { sign, sign_idx, house, within_deg, nakshatra, pada }. Plus partNumber + isDayBirth for transparency on the derivation.',
        gochara_now: 'Live transits at export time — { asOf, transits[] }. Each transit: { name, sign, houseFromMoon, houseFromLagna, flavour: favourable|mixed|challenging, saturnTag (sade_sati_*/ashtama_shani/ardha_ashtama when applicable) }.',
    },
};

function fmtDeg(d) {
    const dd = Math.floor(d),
        mm = Math.round((d - dd) * 60);
    return `${dd}°${String(mm).padStart(2, '0')}'`;
}

function buildBirth(birth, timeUnknown) {
    if (!birth) return null;
    const iso = `${birth.year}-${String(birth.month).padStart(2,'0')}-${String(birth.day).padStart(2,'0')}T${String(birth.hour).padStart(2,'0')}:${String(birth.minute).padStart(2,'0')}:00`;
    return {
        name: birth.name,
        iso_local: iso,
        tz_offset_minutes: birth.tzOffsetMin,
        lat_deg: birth.latDeg,
        lon_deg: birth.lonDeg,
        place_name: birth.placeName,
        time_known: !timeUnknown,
    };
}

function buildChart(state) {
    const c = state.chart;
    if (!c) return null;
    const now = new Date();
    const aspects = aspectMap(c);
    const cur = currentMaha(c.dasha.sequence, now);
    const antar = currentAntar(cur, now);
    const mahaSequence = c.dasha.sequence.map(m => ({
        lord: m.lord,
        years: m.years,
        start: m.start.toISOString(),
        end: m.end.toISOString(),
    }));
    return {
        as_of: now.toISOString(),
        ayanamsa: c.ayanamsa,
        house_system: 'whole-sign',
        lagna: {
            sign: c.lagnaSign,
            sign_sa: c.lagnaSignSa,
            sign_idx: c.lagnaSignIdx,
            lon_deg: c.lagnaLonDeg,
            within_deg: c.lagnaWithinDeg,
            within_formatted: fmtDeg(c.lagnaWithinDeg),
            sign_lord: RASHIS[c.lagnaSignIdx].ruler,
        },
        planets: c.planets.map(p => ({
            name: p.name,
            lon_deg: p.lonDeg,
            sign: p.sign,
            sign_sa: p.signSa,
            sign_idx: p.signIdx,
            within_deg: p.withinDeg,
            within_formatted: fmtDeg(p.withinDeg),
            house: p.house,
            nakshatra: p.nakshatra,
            nakshatra_index: p.nakshatraIndex,
            pada: p.pada,
            nakshatra_lord: p.nakshatraLord,
            dignity: p.dignity,
            relation_with_sign_lord: p.relation,
            vargottama: !!p.isVargottama,
        })),
        aspects_graha: aspects,
        aspects_rashi: rashiAspectMap(c),
        sambandha: c.sambandha,
        vargottama: c.vargottama || [],
        arudha_lagna: c.arudha ? {
            sign: c.arudha.sign,
            sign_sa: c.arudha.signSa,
            sign_idx: c.arudha.signIdx,
            house: c.arudha.house
        } : null,
        upapada_lagna: c.upapada ? {
            sign: c.upapada.sign,
            sign_sa: c.upapada.signSa,
            sign_idx: c.upapada.signIdx,
            house: c.upapada.house
        } : null,
        vargas: VARGA_INFO.map(v => {
            const dv = computeVarga(c, v.d);
            if (!dv) return null;
            return {
                d: v.d,
                name: v.name,
                sa: v.sa,
                area: v.area,
                lagna: {
                    sign: dv.lagnaSign,
                    sign_sa: dv.lagnaSignSa,
                    sign_idx: dv.lagnaSignIdx
                },
                planets: dv.planets.map(p => ({
                    name: p.name,
                    sign: p.sign,
                    sign_idx: p.signIdx,
                    house: p.house,
                    dignity: p.dignity,
                })),
            };
        }).filter(Boolean),
        dasha: {
            janma_nakshatra: c.dasha.nakshatra,
            running_lord: c.dasha.runningLord,
            current_maha: {
                lord: cur.lord,
                years: cur.years,
                start: cur.start.toISOString(),
                end: cur.end.toISOString(),
            },
            current_antar: antar ? {
                lord: antar.lord,
                years: antar.years,
                start: antar.start.toISOString(),
                end: antar.end.toISOString(),
            } : null,
            current_pratyantar: (() => {
                const p = antar ? currentPratyantar(antar, now) : null;
                return p ? {
                    lord: p.lord,
                    years: p.years,
                    start: p.start.toISOString(),
                    end: p.end.toISOString()
                } : null;
            })(),
            next_mahadashas: mahaSequence,
            antardashas_in_current_maha: antarSequence(cur).map(a => ({
                lord: a.lord,
                years: a.years,
                start: a.start.toISOString(),
                end: a.end.toISOString(),
            })),
        },
        panchang: c.panchang ? {
            vara: c.panchang.vara,
            tithi: `${c.panchang.tithi.paksha} ${c.panchang.tithi.name}`,
            tithi_index: c.panchang.tithi.index,
            paksha: c.panchang.tithi.paksha,
            yoga: c.panchang.yoga.name,
            yoga_index: c.panchang.yoga.index,
            karana: c.panchang.karana.name,
            karana_index: c.panchang.karana.index,
            nakshatra: c.panchang.nakshatra.name,
            nakshatra_lord: c.panchang.nakshatra.lord,
        } : null,
        yogas: (c.yogas || []).map(y => ({
            id: y.id,
            name: y.name,
            reason: y.reason,
            blurb: y.blurb,
            strength: y.strength,
        })),
        doshas: (() => {
            const d = c.doshas || {};
            return {
                kala_sarpa: d.kalaSarpa ? {
                    name: d.kalaSarpa.name,
                    severity: d.kalaSarpa.severity,
                    reason: d.kalaSarpa.reason,
                    blurb: d.kalaSarpa.blurb
                } : null,
                mangal: d.mangal ? {
                    name: d.mangal.name,
                    severity: d.mangal.severity,
                    reason: d.mangal.reason,
                    blurb: d.mangal.blurb
                } : null,
                combust: d.combust || [],
            };
        })(),
        sade_sati: (() => {
            const sp = computeSaturnPeriods(c, {
                now
            });
            if (!sp) return null;
            return {
                moon_sign: sp.moonSignName,
                currently_in: !!sp.currentSadeSati,
                current_phase: sp.currentSubPhase ? {
                    phase: sp.currentSubPhase.label,
                    sign: sp.currentSubPhase.signName,
                    start: sp.currentSubPhase.start?.toISOString() || null,
                    end: sp.currentSubPhase.end?.toISOString() || null,
                } : null,
                all_periods: sp.sadeSati.map(p => ({
                    start: p.start.toISOString(),
                    end: p.end.toISOString(),
                    phases: p.phases.map(ph => ({
                        phase: ph.label,
                        sign: ph.signName,
                        start: ph.start?.toISOString() || null,
                        end: ph.end?.toISOString() || null,
                    })),
                })),
                ashtama_shani: sp.ashtamaShani.map(p => ({
                    start: p.start.toISOString(),
                    end: p.end.toISOString()
                })),
                ardha_ashtama_shani: sp.ardhaAshtamaShani.map(p => ({
                    start: p.start.toISOString(),
                    end: p.end.toISOString()
                })),
            };
        })(),
        argala: (c.argala || []).map(row => ({
            house: row.house,
            sign: row.signName,
            primary: row.primary.map(a => ({
                kind: a.kind,
                sign: a.signName,
                house: a.house,
                planets: a.planets,
                virodha_sign: a.virodhaSignName,
                virodha_house: a.virodhaHouse,
                virodha_planets: a.virodhaPlanets,
                cancelled: !!a.cancelled,
            })),
            secondary: row.secondary.map(a => ({
                kind: a.kind,
                sign: a.signName,
                house: a.house,
                planets: a.planets,
            })),
        })),
        ashtakavarga: c.ashtakavarga ? {
            bav: c.ashtakavarga.bav,
            sav: c.ashtakavarga.sav,
            total_sav: c.ashtakavarga.totalSAV,
            strongest_house: c.ashtakavarga.rows.find(r => r.sav === c.ashtakavarga.maxSAV)?.house ?? null,
            weakest_house: c.ashtakavarga.rows.find(r => r.sav === c.ashtakavarga.minSAV)?.house ?? null,
            rows: c.ashtakavarga.rows.map(r => ({
                house: r.house,
                sign: r.signName,
                sav: r.sav,
                bav: r.bav,
            })),
        } : null,
        upagrahas: c.upagrahas ? {
            is_day_birth: c.upagrahas.isDayBirth,
            weekday: c.upagrahas.weekdayName,
            part_number: c.upagrahas.partNumber,
            gulika: c.upagrahas.gulika ? {
                sign: c.upagrahas.gulika.sign,
                sign_idx: c.upagrahas.gulika.signIdx,
                within_deg: c.upagrahas.gulika.withinDeg,
                house: c.upagrahas.gulika.house,
                nakshatra: c.upagrahas.gulika.nakshatra,
                nakshatra_lord: c.upagrahas.gulika.nakshatraLord,
                pada: c.upagrahas.gulika.pada,
            } : null,
            mandi: c.upagrahas.mandi ? {
                sign: c.upagrahas.mandi.sign,
                sign_idx: c.upagrahas.mandi.signIdx,
                within_deg: c.upagrahas.mandi.withinDeg,
                house: c.upagrahas.mandi.house,
                nakshatra: c.upagrahas.mandi.nakshatra,
                nakshatra_lord: c.upagrahas.mandi.nakshatraLord,
                pada: c.upagrahas.mandi.pada,
            } : null,
        } : null,
        gochara_now: (() => {
            const g = computeGochara(c, {
                now
            });
            if (!g) return null;
            return {
                as_of: g.asOf.toISOString(),
                ref_moon_sign: g.refMoonSignName,
                ref_lagna_sign: g.refLagnaSignName,
                transits: g.transits.map(t => ({
                    name: t.name,
                    sign: t.signName,
                    house_from_moon: t.houseFromMoon,
                    house_from_lagna: t.houseFromLagna,
                    flavour: t.flavour,
                    saturn_tag: t.saturnTag || null,
                })),
            };
        })(),
    };
}

export function exportVedicForLLM(state, userFocus = null) {
    const chart = buildChart(state);
    if (!chart) return;
    downloadLLMJson({
        name: state.birth?.name || 'kundali',
        system: 'vedic',
        prompt: PROMPT,
        schema: SCHEMA,
        chart,
        birth: buildBirth(state.birth, state.timeUnknown),
        userFocus,
    });
}

export function exportVedicRaw(state) {
    const chart = buildChart(state);
    if (!chart) return;
    downloadRawJson({
        name: state.birth?.name || 'kundali',
        system: 'vedic',
        payload: {
            birth: buildBirth(state.birth, state.timeUnknown),
            chart
        },
    });
}
