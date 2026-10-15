const path = require('path');
const fs = require('fs');

const WBO_LOGO = path.join(__dirname, '..', '..', 'assets', 'logo-wbo.png');

// ─── Paleta institucional WBO ────────────────────────────────────────────────

const COLORS = {
  primary: '#8F1822',
  primaryLight: '#C32835',
  gold: '#D9AA39',
  goldLight: '#F0D187',
  navy: '#101827',
  navyLight: '#1F2937',
  dark: '#172033',
  text: '#374151',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  bg: '#F8F9FB',
  bgAlt: '#F1F3F6',
  border: '#E5E7EB',
  borderLight: '#EEF1F4',
  green: '#059669',
  greenLight: '#E6F4EF',
  blue: '#2563EB',
  amber: '#D97706',
  red: '#DC2626',
  white: '#FFFFFF',
};

// Header institucional compacto (banda baja), ~8% de la altura A4
const HEADER_H = 64;
const GOLD_LINE = 3;
// Primer plano utilizable después de la banda (reportes)
const CONTENT_TOP = HEADER_H + 12;

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Ajusta el texto de una celda a una sola línea sin sobrepasar maxW
function fitInColumn(doc, text, size, maxW, minSize = 6.5) {
  doc.font('Helvetica-Bold');
  let s = size;
  while (s > minSize && doc.widthOfString(text, { fontSize: s }) > maxW) s -= 0.5;
  if (doc.widthOfString(text, { fontSize: s }) <= maxW) return { text, size: s };
  let t = text;
  while (t.length > 1 && doc.widthOfString(t + '…', { fontSize: minSize }) > maxW) t = t.slice(0, -1);
  return { text: t + '…', size: minSize };
}

function leftX(doc) {
  return doc.page.margins.left;
}

function contentW(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function maxY(doc) {
  return doc.page.height - doc.page.margins.bottom - 30;
}

// ─── Header institucional (todas las páginas) ───────────────────────────────

function drawInstitutionalHeader(doc) {
  const pageW = doc.page.width;
  const left = doc.page.margins.left;
  const w = contentW(doc);

  // Barra institucional
  doc.rect(0, 0, pageW, HEADER_H).fill(COLORS.navy);
  doc.rect(0, HEADER_H - GOLD_LINE, pageW, GOLD_LINE).fill(COLORS.gold);
  doc.rect(0, 0, 7, HEADER_H - GOLD_LINE).fill(COLORS.primary);

  // Logo
  const chip = 40;
  const chipX = left;
  const chipY = 12;
  doc.save()
    .roundedRect(chipX, chipY, chip, chip, 6)
    .fillColor('#FFFFFF')
    .fill()
    .restore();
  if (fs.existsSync(WBO_LOGO)) {
    doc.image(WBO_LOGO, chipX + 4, chipY + 4, { width: chip - 8, height: chip - 8, fit: [chip - 8, chip - 8] });
  }

  const nameX = chipX + chip + 10;
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF')
    .text('WBO', nameX, 13);
  doc.font('Helvetica').fontSize(7).fillColor('#C7D2E5')
    .text('JUDGES EVALUATION SYSTEM', nameX, 32, { characterSpacing: 0.8 });

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.goldLight)
    .text('PERFORMANCE REPORT', left, 14, { width: w, align: 'right', characterSpacing: 0.7 });
  doc.font('Helvetica').fontSize(7).fillColor('#C7D2E5')
    .text(`ISSUED ${formatDate(new Date())}`, left, 30, { width: w, align: 'right', characterSpacing: 0.4 });
}

// Título del informe en la primera página: kicker + nombre + subtítulo + acento
function drawTitleBlock(doc, kicker, name, subtitle) {
  const left = leftX(doc);
  const w = contentW(doc);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
    .text(String(kicker).toUpperCase(), left, CONTENT_TOP, { characterSpacing: 1.2 });
  let y = CONTENT_TOP + 13;

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.navy)
    .text(String(name), left, y, { width: w });
  y += 24;

  if (subtitle) {
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.textLight)
      .text(String(subtitle), left, y, { width: w });
    y += 15;
  }

  doc.rect(left, y + 1, 54, 3).fill(COLORS.gold);
  return y + 12;
}

// ─── Páginas siguientes ─────────────────────────────────────────────────────

function addPageWithHeader(doc) {
  doc.addPage();
  drawInstitutionalHeader(doc);
  doc.y = CONTENT_TOP + 10;
}

function checkNewPage(doc, spaceNeeded) {
  if (doc.y + spaceNeeded > maxY(doc)) {
    addPageWithHeader(doc);
    return true;
  }
  return false;
}

// ─── Título de sección: accent bar + label (sin líneas largas) ──────────────

function drawSectionTitle(doc, title, color = COLORS.primary) {
  const left = leftX(doc);
  const y = doc.y;
  doc.rect(left, y + 1, 4, 10).fill(color);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.navy)
    .text(String(title).toUpperCase(), left + 11, y, { characterSpacing: 0.8 });
  return y + 16;
}

// ─── Ficha de identificación (perfil) ────────────────────────────────────────

function drawPill(doc, text, x, y, w, h, bg, fg) {
  doc.roundedRect(x, y, w, h, h / 2).fillColor(bg).fill();
  doc.circle(x + 12, y + h / 2, 2.6).fillColor(fg).fill();
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(fg)
    .text(String(text).toUpperCase(), x + 20, y + (h - 8) / 2, { width: w - 24, lineBreak: false });
}

// rows: [ [ {label, value, color?, pill?}, ... ], ... ] (columnas alineadas por fila)
function drawProfileCard(doc, rows) {
  const left = leftX(doc);
  const w = contentW(doc);
  const y = doc.y;
  const pad = 16;
  const rowH = 30;
  const height = pad + 12 + rows.length * rowH + pad;

  doc.roundedRect(left, y, w, height, 6).fillColor('#FFFFFF').fill();
  doc.roundedRect(left, y, w, height, 6).lineWidth(0.8).strokeColor(COLORS.border).stroke();
  doc.rect(left, y, w, 5).fill(COLORS.primary);

  rows.forEach((fields, ri) => {
    const fy = y + pad + 11 + ri * rowH;
    const colW = (w - pad * 2 - (fields.length - 1) * 16) / fields.length;
    fields.forEach((field, ci) => {
      const cx = left + pad + ci * (colW + 16);
      if (field.pill) {
        doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
          .text(String(field.label).toUpperCase(), cx, fy, { characterSpacing: 0.6 });
        drawPill(doc, field.value, cx, fy + 10, Math.min(104, colW - 8), 16, field.bg || COLORS.greenLight, field.color || COLORS.green);
      } else {
        doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
          .text(String(field.label).toUpperCase(), cx, fy, { characterSpacing: 0.6 });
        const fit = fitInColumn(doc, String(field.value ?? '—'), 10.5, colW);
        doc.font('Helvetica-Bold').fontSize(fit.size).fillColor(field.color || COLORS.dark)
          .text(fit.text, cx, fy + 10, { lineBreak: false });
      }
    });
  });

  return y + height + 12;
}

// ─── Tarjetas de métrica (RANKING) ───────────────────────────────────────────

function drawMetricCards(doc, metrics) {
  const left = leftX(doc);
  const gap = 10;
  const w = (contentW(doc) - gap * (metrics.length - 1)) / metrics.length;
  const y = doc.y;
  const height = 66;

  metrics.forEach((m, i) => {
    const x = left + i * (w + gap);
    doc.roundedRect(x, y, w, height, 6).fillColor('#FFFFFF').fill();
    doc.roundedRect(x, y, w, height, 6).lineWidth(0.8).strokeColor(COLORS.border).stroke();
    doc.rect(x, y, w, 4).fill(m.color || COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.textMuted)
      .text(String(m.label).toUpperCase(), x + 12, y + 12, { width: w - 20, characterSpacing: 0.5 });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.dark)
      .text(String(m.value ?? '—'), x + 10, y + 27, { width: w - 18 });
    if (m.caption) {
      doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
        .text(String(m.caption), x + 12, y + 52, { width: w - 20, characterSpacing: 0.2 });
    }
  });

  return y + height + 12;
}

// ─── Panel de rendimiento (diferenciado de Ranking) ─────────────────────────

function drawPerformancePanel(doc, items) {
  const left = leftX(doc);
  const w = contentW(doc);
  const y = doc.y;
  const height = 62;
  const colW = w / items.length;

  doc.roundedRect(left, y, w, height, 6).fillColor('#FFFFFF').fill();
  doc.roundedRect(left, y, w, height, 6).lineWidth(0.8).strokeColor(COLORS.border).stroke();
  doc.rect(left, y, w, 4).fill(COLORS.primary);

  items.forEach((item, i) => {
    const cx = left + colW * i;
    if (i > 0) {
      doc.moveTo(cx, y + 12).lineTo(cx, y + height - 9).strokeColor(COLORS.borderLight).lineWidth(0.7).stroke();
    }
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.textMuted)
      .text(String(item.label).toUpperCase(), cx + 4, y + 12, { width: colW - 8, align: 'center', characterSpacing: 0.6 });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(item.color || COLORS.dark)
      .text(String(item.value ?? '—'), cx + 4, y + 28, { width: colW - 8, align: 'center' });
    if (item.caption) {
      doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
        .text(String(item.caption), cx + 4, y + 49, { width: colW - 8, align: 'center' });
    }
  });

  return y + height + 12;
}

// ─── Evolución: LINE / AREA chart (valores exactos, sin recalcular) ─────────

function drawEvolutionChart(doc, title, history, valueFn, colorFn, suffix = '', chartH = 150) {
  checkNewPage(doc, chartH + 34);
  doc.y = drawSectionTitle(doc, title);

  const left = leftX(doc);
  const width = contentW(doc);
  const y = doc.y;
  const values = history.slice(0, 8).reverse().map(valueFn).map(Number).filter(Number.isFinite);

  doc.roundedRect(left, y, width, chartH + 8, 6).fillColor('#FFFFFF').fill();
  doc.roundedRect(left, y, width, chartH + 8, 6).lineWidth(0.8).strokeColor(COLORS.border).stroke();

  if (!values.length) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textMuted)
      .text('Aún no hay evaluaciones suficientes para mostrar una evolución.', left + 24, y + chartH / 2, { width: width - 48, align: 'center' });
    return y + chartH + 22;
  }

  const plotX = left + 40;
  const plotY = y + 32;
  const plotW = width - 54;
  const plotH = chartH - 50;
  const maxValue = Math.max(100, ...values.map((v) => Math.ceil(v / 10) * 10));

  // Grid horizontal sutil + etiquetas del eje Y
  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const gy = plotY + plotH - plotH * ratio;
    doc.moveTo(plotX, gy).lineTo(plotX + plotW, gy).strokeColor(COLORS.borderLight).lineWidth(0.6).stroke();
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.textMuted)
      .text(`${Math.round(maxValue * ratio)}${suffix}`, left + 4, gy - 3, { width: 32, align: 'right' });
  });

  const xs = values.map((_, i) => (values.length === 1 ? plotX + plotW / 2 : plotX + (i / (values.length - 1)) * plotW));
  const ys = values.map((v) => plotY + plotH - (v / maxValue) * plotH);

  // Área bajo la curva (muy sutil)
  if (values.length >= 2) {
    doc.save();
    doc.moveTo(xs[0], plotY + plotH);
    values.forEach((_, i) => doc.lineTo(xs[i], ys[i]));
    doc.lineTo(xs[xs.length - 1], plotY + plotH).closePath();
    doc.fillOpacity(0.09).fillColor(COLORS.primary).fill();
    doc.restore();
  }

  // Línea principal
  doc.save();
  doc.moveTo(xs[0], ys[0]);
  values.forEach((_, i) => doc.lineTo(xs[i], ys[i]));
  doc.lineWidth(1.6).strokeColor(COLORS.primary).stroke();
  doc.restore();

  // Puntos + etiquetas de valor (sin solaparse)
  let lastBox = null;
  values.forEach((v, i) => {
    const px = xs[i];
    const py = ys[i];

    doc.save();
    doc.circle(px, py, 3).fillColor(colorFn(v)).fill();
    doc.circle(px, py, 3).lineWidth(1).strokeColor('#FFFFFF').stroke();
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.dark);
    const label = `${v}${suffix}`;
    const lw = doc.widthOfString(label);
    const labelX = Math.min(Math.max(px - lw / 2, plotX), plotX + plotW - lw);
    const aboveY0 = py - 8 - 3;
    const aboveY1 = py - 3;
    const belowY0 = py + 6;
    const belowY1 = py + 14;

    let useBelow = false;
    if (lastBox && !(aboveY1 <= lastBox.y0)) {
      useBelow = true;
    }
    const boxY0 = useBelow ? belowY0 : aboveY0;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.dark)
      .text(label, labelX, boxY0, { lineBreak: false });
    lastBox = { y0: boxY0, y1: useBelow ? belowY1 : aboveY1 };

    doc.font('Helvetica').fontSize(6).fillColor(COLORS.textMuted)
      .text(String(i + 1), px - 7, plotY + plotH + 6, { width: 14, align: 'center' });
  });

  doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
    .text('EVALUACIONES MÁS RECIENTES · DE LA MÁS ANTIGUA A LA MÁS NUEVA', left, y + chartH + 1, { width, align: 'center', characterSpacing: 0.3 });

  return y + chartH + 8 + 14;
}

// ─── Tabla (historial) ───────────────────────────────────────────────────────

function drawTable(doc, headers, rows, colWidths, aligns = null) {
  const left = leftX(doc);
  const width = contentW(doc);
  const rowH = 22;
  const headerH = 22;
  let y = doc.y;

  const cellAlign = (i) => {
    if (!aligns) return 'left';
    if (aligns[i] === 'right') return 'right';
    if (aligns[i] === 'center') return 'center';
    return 'left';
  };

  const drawHeaderRow = (yy) => {
    doc.rect(left, yy, width, headerH).fill(COLORS.primary);
    let x = left;
    headers.forEach((h, i) => {
      const a = cellAlign(i);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF')
        .text(String(h).toUpperCase(), x + (a === 'right' ? 6 : 8), yy + 7, { width: colWidths[i] - 12, align: a, characterSpacing: 0.4 });
      x += colWidths[i];
    });
  };

  drawHeaderRow(y);
  y += headerH;

  rows.forEach((row, ri) => {
    if (y + rowH > maxY(doc)) {
      addPageWithHeader(doc);
      y = CONTENT_TOP + 10;
      drawHeaderRow(y);
      y += headerH;
    }
    if (ri % 2 === 1) doc.rect(left, y, width, rowH).fill(COLORS.bg);
    let x = left;
    row.forEach((cell, ci) => {
      const a = cellAlign(ci);
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
        .text(String(cell ?? '—'), x + (a === 'right' ? 6 : 8), y + 7, { width: colWidths[ci] - 12, align: a });
      x += colWidths[ci];
    });
    doc.moveTo(left, y).lineTo(left + width, y).strokeColor(COLORS.borderLight).lineWidth(0.5).stroke();
    y += rowH;
  });
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  return y + 12;
}

// ─── Tarjeta de contenido (observación / comentario) ─────────────────────────

function drawContentCard(doc, { header, date, badge, badgeColor, sub, body, bodySize = 9 }) {
  const left = leftX(doc);
  const width = contentW(doc);
  const pad = 14;

  doc.font('Helvetica-Bold').fontSize(9);
  const headerH = doc.heightOfString(header, { width: width - pad * 2 - 70 });
  doc.font('Helvetica').fontSize(7);
  const subH = doc.heightOfString(sub || '', { width: width - pad * 2, lineGap: 1 });
  doc.font('Helvetica').fontSize(bodySize);
  const bodyH = doc.heightOfString(body || '', { width: width - pad * 2, lineGap: 3 });

  const badgeH = badge ? 11 : 0;
  const blockH = pad + headerH + 2 + badgeH + subH + bodyH + 6 + pad;

  checkNewPage(doc, blockH + 6);

  const y = doc.y;
  doc.roundedRect(left, y, width, blockH, 6).fillColor('#FDFCFA').fill();
  doc.roundedRect(left, y, width, blockH, 6).lineWidth(0.8).strokeColor(COLORS.border).stroke();
  doc.rect(left, y, 3, blockH).fill(COLORS.gold);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.navy)
    .text(header, left + pad, y + pad, { width: width - pad * 2 - 70 });
  if (date) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
      .text(date, left + pad, y + pad + 1, { width: width - pad * 2, align: 'right' });
  }

  let cy = y + pad + headerH + 2;
  if (badge) {
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(badgeColor || COLORS.textMuted)
      .text(String(badge).toUpperCase(), left + pad, cy, { characterSpacing: 0.4 });
    cy += badgeH;
  }
  if (sub) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
      .text(sub, left + pad, cy + 1, { width: width - pad * 2, lineGap: 1 });
    cy += subH + 4;
  }
  if (body && String(body).trim()) {
    doc.font('Helvetica').fontSize(bodySize).fillColor(COLORS.text)
      .text(body, left + pad, cy, { width: width - pad * 2, lineGap: 3 });
    cy += bodyH;
  } else {
    doc.font('Helvetica').fontSize(bodySize).fillColor(COLORS.textMuted)
      .text('Sin comentarios.', left + pad, cy, { width: width - pad * 2 });
  }

  return cy + pad;
}

// ─── Footer (page X / Y con bufferPages) ─────────────────────────────────────
// Requiere crear el documento con `bufferPages: true` para conocer el total.

function drawFooters(doc) {
  const total = doc.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    const left = doc.page.margins.left;
    const w = contentW(doc);
    // Debe quedar por encima de page.maxY() (height - margins.bottom) para que
    // doc.text() NO fuerce un addPage automático.
    const lineY = doc.page.height - 75;
    const textY = lineY + 6;

    doc.moveTo(left, lineY).lineTo(left + w, lineY).strokeColor(COLORS.border).lineWidth(0.6).stroke();

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.navy)
      .text('WBO JUDGES EVALUATION SYSTEM', left, textY, { lineBreak: false });
    doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textMuted)
      .text(`Confidential Performance Report · Generated ${formatDate(new Date())}`, left, textY + 8, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.navy)
      .text(`Página ${i + 1} de ${total}`, left, textY, { width: w, align: 'right', lineBreak: false });
  }
}

module.exports = {
  COLORS,
  formatDate,
  HEADER_H,
  CONTENT_TOP,
  drawInstitutionalHeader,
  drawTitleBlock,
  addPageWithHeader,
  checkNewPage,
  drawSectionTitle,
  drawProfileCard,
  drawMetricCards,
  drawPerformancePanel,
  drawEvolutionChart,
  drawTable,
  drawContentCard,
  drawFooters,
};