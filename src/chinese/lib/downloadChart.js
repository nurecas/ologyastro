// Chinese BaZi — Four Pillars PNG export.

import { ELEMENT_COLOR, HIDDEN_STEMS, STEM_BY_HANZI, TEN_GODS } from '../compute/data.js';
import { tenGodOfStem } from '../compute/tenGods.js';

function pad(n) { return String(n).padStart(2, '0'); }
function slug(s) { return (s || 'chart').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }

function drawPillar(ctx, label, pillar, isDM, dm, x, y, width) {
  const stemColor = ELEMENT_COLOR[pillar.stem.element];
  const branchColor = ELEMENT_COLOR[pillar.branch.element];

  // Header label
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText(label, x + width / 2, y);
  // Ten God on stem
  let stemGodLabel = isDM ? 'Day Master' : '';
  if (!isDM) {
    const g = tenGodOfStem(pillar.stem, dm);
    stemGodLabel = g?.english || '';
  }
  ctx.fillStyle = isDM ? '#ff6a6a' : '#9b9bbd';
  ctx.font = 'italic 12px "Cormorant Garamond", serif';
  ctx.fillText(stemGodLabel, x + width / 2, y + 28);
  // Stem block
  const stemY = y + 50;
  const stemH = 100;
  ctx.fillStyle = stemColor.bg;
  ctx.strokeStyle = stemColor.accent;
  ctx.lineWidth = 2;
  ctx.fillRect(x, stemY, width, stemH);
  ctx.strokeRect(x, stemY, width, stemH);
  ctx.fillStyle = stemColor.fg;
  ctx.font = '64px "Noto Serif CJK SC", "Cormorant Garamond", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillar.stem.hanzi, x + width / 2, stemY + stemH / 2);
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`${pillar.stem.pinyin} · ${pillar.stem.label}`, x + width / 2, stemY + stemH + 14);

  // Branch block
  const branchY = stemY + stemH + 30;
  ctx.fillStyle = branchColor.bg;
  ctx.strokeStyle = branchColor.accent;
  ctx.fillRect(x, branchY, width, stemH);
  ctx.strokeRect(x, branchY, width, stemH);
  ctx.fillStyle = branchColor.fg;
  ctx.font = '60px "Noto Serif CJK SC", "Cormorant Garamond", serif';
  ctx.fillText(pillar.branch.hanzi, x + width / 2, branchY + stemH / 2);
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`${pillar.branch.pinyin} · ${pillar.branch.animal}`, x + width / 2, branchY + stemH + 14);

  // Hidden stems list
  let yc = branchY + stemH + 36;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#9b9bbd';
  ctx.fillText('Hidden:', x + width / 2, yc);
  yc += 16;
  const hidden = HIDDEN_STEMS[pillar.branch.hanzi] || [];
  for (const h of hidden) {
    const stem = STEM_BY_HANZI[h];
    if (!stem) continue;
    const god = tenGodOfStem(stem, dm);
    ctx.fillStyle = ELEMENT_COLOR[stem.element].fg;
    ctx.fillText(`${h}  ${god?.english || '—'}`, x + width / 2, yc);
    yc += 14;
  }
}

export function downloadBaziChart(chart) {
  if (!chart) return;
  const W = 1400, H = 1900;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0b0b15';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('O L O G Y · B A Z I', W / 2, 42);
  ctx.fillStyle = '#ff6a6a';
  ctx.font = 'bold 40px "Cormorant Garamond", serif';
  ctx.fillText(chart.birth.name || 'Untitled', W / 2, 96);
  ctx.fillStyle = '#c8c8dd';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(`${chart.birth.day}/${chart.birth.month}/${chart.birth.year}  ·  ${pad(chart.birth.hour)}:${pad(chart.birth.minute)}  ·  ${chart.birth.placeName}`, W / 2, 126);
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`${chart.gender} · solar year ${chart.pillars.lichun.solarYear} · Day Master ${chart.dayMaster.hanzi} (${chart.dayMaster.label})`, W / 2, 152);

  // Four pillars: 4 columns, centred.
  const colWidth = 240;
  const gap = 30;
  const totalW = colWidth * 4 + gap * 3;
  const xStart = (W - totalW) / 2;
  const labels = ['Year (年)', 'Month (月)', 'Day (日)', 'Hour (時)'];
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour];
  for (let i = 0; i < 4; i++) {
    drawPillar(ctx, labels[i], pillars[i], i === 2, chart.dayMaster,
               xStart + i * (colWidth + gap), 200, colWidth);
  }

  // Element distribution
  let y = 720;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('ELEMENT DISTRIBUTION', 80, y);
  y += 24;
  const max = Math.max(...Object.values(chart.elements));
  for (const [el, count] of Object.entries(chart.elements)) {
    const ec = ELEMENT_COLOR[el];
    const pct = max > 0 ? count / max : 0;
    ctx.fillStyle = '#9b9bbd';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(el, 80, y + 5);
    ctx.fillStyle = ec.accent;
    ctx.fillRect(180, y - 6, 800 * pct, 14);
    ctx.fillStyle = ec.fg;
    ctx.fillText(String(count), 1000, y + 5);
    y += 22;
  }

  // Luck pillars (first 6)
  y += 20;
  ctx.fillStyle = '#9b9bbd';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText(`LUCK PILLARS · ${chart.luck.direction} · starting age ${chart.luck.startingAge.toFixed(1)}`, 80, y);
  y += 24;
  ctx.font = '14px Inter, sans-serif';
  for (const lp of chart.luck.pillars.slice(0, 8)) {
    const stemColor = ELEMENT_COLOR[lp.stem.element];
    const branchColor = ELEMENT_COLOR[lp.branch.element];
    ctx.fillStyle = '#9b9bbd';
    ctx.fillText(`Age ${Math.floor(lp.startAge)}–${Math.floor(lp.endAge)}`, 80, y);
    ctx.fillStyle = stemColor.fg;
    ctx.font = '20px "Noto Serif CJK SC", serif';
    ctx.fillText(lp.stem.hanzi, 220, y + 4);
    ctx.fillStyle = branchColor.fg;
    ctx.fillText(lp.branch.hanzi, 250, y + 4);
    ctx.fillStyle = '#c8c8dd';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(`${lp.stem.label} / ${lp.branch.element} ${lp.branch.animal}`, 290, y);
    ctx.fillStyle = '#9b9bbd';
    ctx.fillText(`${lp.startDate.getUTCFullYear()}–${lp.endDate.getUTCFullYear()}`, 700, y);
    y += 24;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6d6d88';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Generated by Ology — BaZi', W / 2, H - 40);

  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${slug(chart.birth.name)}-bazi.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
