const PDFDocument = require('pdfkit');
const path = require('path');
const { pool } = require('../config/db');
const ProfileObservation = require('../models/ProfileObservation');

const pdfController = {};

const WBO_LOGO = path.join(__dirname, '..', '..', 'assets', 'logo-wbo.png');

// ─── Colores WBO ────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#991B1B',      // wbo-800 (rojo oscuro)
  primaryLight: '#B91C1C', // wbo-700
  dark: '#1F2937',         // slate-800
  text: '#374151',         // slate-700
  textLight: '#6B7280',    // slate-500
  textMuted: '#9CA3AF',    // slate-400
  bg: '#F9FAFB',           // slate-50
  bgAlt: '#F3F4F6',        // slate-100
  border: '#E5E7EB',       // slate-200
  green: '#059669',
  blue: '#2563EB',
  amber: '#D97706',
  red: '#DC2626',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const HEADER_H = 56;

// Marca institucional común: barra + logo + WBO + subtítulo (usuada en TODAS las páginas)
function drawInstitutionalHeader(doc) {
  const left = doc.page.margins.left;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const top = doc.page.margins.top;

  doc.rect(left, top, pageW, HEADER_H).fill(COLORS.primary);

  const chipSize = 34;
  const chipX = left + 14;
  const chipY = top + (HEADER_H - chipSize) / 2;
  doc.save()
    .roundedRect(chipX, chipY, chipSize, chipSize, 6)
    .fillColor('#FFFFFF')
    .fill()
    .restore();
  if (require('fs').existsSync(WBO_LOGO)) {
    doc.image(WBO_LOGO, chipX + 5, chipY + 5, { width: chipSize - 10, height: chipSize - 10, fit: [chipSize - 10, chipSize - 10] });
  }

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#FFFFFF')
    .text('WBO', left, top + 9, { width: pageW, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF99')
    .text('JUDGES EVALUATION SYSTEM', left, top + 34, { width: pageW, align: 'center' });
}

// Header de la PRIMERA página: añade título + subtítulo del informe
function drawHeader(doc, title, subtitle) {
  const left = doc.page.margins.left;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const top = doc.page.margins.top;

  drawInstitutionalHeader(doc);

  doc.y = top + HEADER_H + 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.dark)
    .text(title, left, doc.y, { width: pageW, align: 'left', lineGap: 2 });

  if (subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
      .text(subtitle, left, doc.y + 2, { width: pageW, align: 'left', lineGap: 1 });
  }

  doc.y = top + HEADER_H + 14;
  doc.y += subtitle ? 26 : 22;
  doc.y += 14;
}

// Header de las páginas siguientes (solo marca institucional)
function drawPageHeader(doc) {
  drawInstitutionalHeader(doc);
  doc.y = doc.page.margins.top + HEADER_H + 20;
}

function addPageWithHeader(doc) {
  doc.addPage();
  drawPageHeader(doc);
}

function drawSectionTitle(doc, title) {
  const y = doc.y;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Línea sutil
  doc.moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + pageW, y)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();

  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary)
    .text(title, doc.page.margins.left, doc.y);

  doc.moveDown(0.4);
}

function drawField(doc, label, value, x, y) {
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted)
    .text(label, x, y);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark)
    .text(String(value ?? '—'), x, y + 11);
  return y + 26;
}

// ─── Gráficos (dibujados con pdfkit, sin dependencias externas) ─────────────

// Elige color semántico según un puntaje de 0..100 (o proporcional)
function perfColor(value, max = 100) {
  if (value == null) return COLORS.textMuted;
  const ratio = value / max;
  if (ratio >= 0.85) return COLORS.green;
  if (ratio >= 0.7) return COLORS.amber;
  return COLORS.red;
}

// Medidor (gauge) semicircular para el rendimiento global.
// Dibuja un arco de fondo y un arco proporcional al valor.
function drawGauge(doc, value, label, max = 100) {
  const cx = doc.page.margins.left + 60;
  const cy = doc.y + 52;
  const r = 46;
  const ratio = value == null ? 0 : Math.max(0, Math.min(1, value / max));

  checkNewPage(doc, 150);

  doc.save();
  doc.lineWidth(14);
  doc.lineCap('round');

  // Arco de fondo (de -180° a 0° => semicírculo superior)
  doc.strokeColor('#EDEDED');
  doc.moveTo(cx - r, cy).arc(cx, cy, r, -180, 0).stroke();

  // Arco de valor (proporcional)
  doc.strokeColor(perfColor(value, max));
  doc.moveTo(cx - r, cy).arc(cx, cy, r, -180, -180 + (180 * ratio)).stroke();
  doc.restore();

  // Valor central
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.dark)
    .text(value == null ? '—' : `${Number(value).toFixed(1)}`,
      cx - 30, cy - 20, { width: 60, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
    .text(label, cx - 40, cy + 4, { width: 80, align: 'center' });

  doc.y = cy + r + 8;
  return doc.y;
}

// Gráfico de barras para el rendimiento histórico (por pelea/evento).
// data: array de {label, value, max}.
function drawBarChart(doc, data, title, max = 100) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartH = 120;
  const baseY = doc.y + 24;
  const plotH = chartH - 34;
  const axisY = baseY + plotH;
  const labelX = left;
  const labelW = 70; // ancho reservado para etiquetas de evento a la izquierda
  const plotRight = left + width - 8;

  checkNewPage(doc, chartH + 40);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
    .text(title, left, doc.y, { width, align: 'left' });

  const n = data.length;
  const slotW = (plotRight - (labelX + labelW)) / Math.max(n, 1);
  const barMaxW = slotW * 0.55;

  // Eje / línea base
  doc.moveTo(labelX + labelW, axisY).lineTo(plotRight, axisY)
    .lineWidth(0.5).strokeColor(COLORS.border).stroke();

  // Banda de niveles en el fondo (sutil)
  doc.save();
  doc.fillColor('#F9FAFB');
  doc.rect(labelX + labelW, baseY, plotRight - (labelX + labelW), plotH).fill();
  doc.restore();

  // Líneas de referencia 60% / 85%
  [0.6, 0.85].forEach((ref) => {
    const ry = axisY - (plotH * ref);
    doc.moveTo(labelX + labelW, ry).lineTo(plotRight, ry)
      .lineWidth(0.4).strokeColor(ref === 0.85 ? COLORS.green : COLORS.amber).opacity(0.35).stroke().opacity(1);
  });

  data.forEach((d, i) => {
    const cx = labelX + labelW + (i * slotW) + slotW / 2;
    const ratio = d.value == null ? 0 : Math.max(0, Math.min(1, d.value / (d.max || max)));
    const bh = ratio * plotH;
    const bx = cx - barMaxW / 2;
    const by = axisY - bh;

    // Barra
    doc.rect(bx, by, barMaxW, bh).fill(perfColor(d.value, d.max || max));

    // Valor sobre la barra (solo si hay altura)
    if (bh > 12) {
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.dark)
        .text(String(d.value), bx, by - 10, { width: barMaxW, align: 'center' });
    }

    // Etiqueta de evento (vertical si es muy largo)
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.textMuted)
      .text(d.label, cx - barMaxW, axisY + 4, { width: barMaxW * 2, align: 'center' });
  });

  doc.y = axisY + 20;
  return doc.y;
}

// Gráfico de línea/área para la tendencia (últimas N lecturas).
// data: array de {label, value, max}.
function drawTrendChart(doc, data, title, max = 100) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartH = 110;
  const baseY = doc.y + 24;
  const plotH = chartH - 34;
  const axisY = baseY + plotH;
  const labelX = left + 8;
  const plotRight = left + width - 8;

  checkNewPage(doc, chartH + 40);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
    .text(title, left, doc.y, { width, align: 'left' });

  if (data.length === 0) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted)
      .text('Sin datos', left, doc.y + 4, { width });
    doc.y += 20;
    return doc.y;
  }

  const n = data.length;
  const stepX = (plotRight - labelX) / Math.max(n - 1, 1);

  // Banda de niveles
  doc.save();
  doc.fillColor('#F9FAFB');
  doc.rect(labelX, baseY, plotRight - labelX, plotH).fill();
  doc.restore();

  // Referencias
  [0.6, 0.85].forEach((ref) => {
    const ry = axisY - (plotH * ref);
    doc.moveTo(labelX, ry).lineTo(plotRight, ry)
      .lineWidth(0.4).strokeColor(ref === 0.85 ? COLORS.green : COLORS.amber).opacity(0.35).stroke().opacity(1);
  });

  const pts = data.map((d, i) => ({
    x: labelX + (i * stepX),
    y: axisY - (Math.max(0, Math.min(1, (d.value ?? 0) / (d.max || max))) * plotH),
    label: d.label,
    value: d.value,
  }));

  // Área de relleno
  doc.save();
  doc.fillColor(COLORS.primary).opacity(0.12);
  doc.moveTo(pts[0].x, axisY);
  pts.forEach(p => doc.lineTo(p.x, p.y));
  doc.lineTo(pts[pts.length - 1].x, axisY).closePath().fill();
  doc.restore();

  // Línea
  doc.save();
  doc.lineWidth(2).strokeColor(COLORS.primary).lineJoin('round');
  pts.forEach((p, i) => (i === 0 ? doc.moveTo(p.x, p.y) : doc.lineTo(p.x, p.y)));
  doc.stroke();
  doc.restore();

  // Puntos + valores
  pts.forEach((p) => {
    doc.save();
    doc.fillColor(perfColor(p.value, max));
    doc.circle(p.x, p.y, 2.6).fill();
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.dark)
      .text(String(p.value), p.x - 10, p.y - 11, { width: 20, align: 'center' });
  });

  // Etiquetas (fechas cortas)
  pts.forEach((p) => {
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.textMuted)
      .text(p.label, p.x - 14, axisY + 4, { width: 28, align: 'center' });
  });

  doc.y = axisY + 20;
  return doc.y;
}

function drawTable(doc, headers, rows, colWidths) {
  const startX = doc.page.margins.left;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowH = 22;
  let y = doc.y;

  // Header row
  let x = startX;
  doc.rect(startX, y, pageW, rowH).fill(COLORS.bgAlt);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.textLight)
      .text(h, x + 4, y + 7, { width: colWidths[i] - 8, align: 'left' });
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      addPageWithHeader(doc);
      y = doc.page.margins.top + 18;
      // Re-draw table header
      let hx = startX;
      doc.rect(startX, y, pageW, rowH).fill(COLORS.bgAlt);
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.textLight)
          .text(h, hx + 4, y + 7, { width: colWidths[i] - 8, align: 'left' });
        hx += colWidths[i];
      });
      y += rowH;
    }

    const bgColor = ri % 2 === 0 ? '#FFFFFF' : COLORS.bg;
    doc.rect(startX, y, pageW, rowH).fill(bgColor);

    let rx = startX;
    row.forEach((cell, ci) => {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
        .text(String(cell ?? '—'), rx + 4, y + 7, { width: colWidths[ci] - 8, align: 'left' });
      rx += colWidths[ci];
    });
    y += rowH;
  });

  doc.y = y + 5;
}

function drawFooter(doc) {
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // El texto debe quedar DENTRO del área útil (page.height - bottom) para que
  // doc.text() NO fuerce un addPage (eso causaba página vacía / recursión infinita).
  const y = doc.page.height - doc.page.margins.bottom - 9;

  doc.moveTo(doc.page.margins.left, y - 5)
    .lineTo(doc.page.margins.left + pageW, y - 5)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
    .text(
      `Generado el ${formatDate(new Date())} — WBO Judges Evaluation System`,
      doc.page.margins.left,
      y,
      { width: pageW, align: 'center', lineBreak: false }
    );
}

// Dibuja el footer en la primera página y en cada página nueva (evento).
// drawFooter ya NO fuerza addPage, así que no hay recursión.
function setupFooter(doc) {
  drawFooter(doc);
  doc.on('pageAdded', () => drawFooter(doc));
}

function checkNewPage(doc, neededSpace) {
  const maxY = doc.page.height - doc.page.margins.bottom - 30;
  if (doc.y + neededSpace > maxY) {
    addPageWithHeader(doc);
    return true;
  }
  return false;
}

// Dibuja un bloque de observación en FLUJO natural (sin Y fijos),
// evitando superposición. Devuelve la nueva posición de doc.y.
function drawObservationBlock(doc, obs, perfText, perfColor) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Pre-cálculo de alturas para salto de página correcto
  const titleStr = `${obs.event_name} — ${formatDate(obs.scheduled_date)}`;
  const subStr = `${obs.boxer_red} vs ${obs.boxer_blue} | Creada por: ${obs.creator_name}`;
  const obsText = obs.observation || '';

  doc.font('Helvetica-Bold').fontSize(9);
  const titleH = doc.heightOfString(titleStr, { width, lineGap: 2 });
  doc.font('Helvetica').fontSize(7);
  const subH = doc.heightOfString(subStr, { width, lineGap: 1 });
  const badgeH = 11;
  doc.font('Helvetica').fontSize(9);
  const bodyH = doc.heightOfString(obsText, { width, lineGap: 3 });

  const blockHeaderH = titleH + badgeH + subH + 6;
  const totalH = blockHeaderH + bodyH + 12;

  checkNewPage(doc, totalH);

  // 1) Título (evento — fecha)
  const titleStart = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
    .text(titleStr, left, titleStart, { width, lineGap: 2 });

  // 2) Badge de rendimiento (línea propia, debajo del título)
  const badgeY = titleStart + titleH + 2;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(perfColor)
    .text(perfText, left, badgeY, { width });

  // 3) Subtítulo (debajo del badge)
  const subY = badgeY + badgeH + 1;
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
    .text(subStr, left, subY, { width, lineGap: 1 });

  // 4) Cuerpo de la observación (multilínea), en flujo a partir del subtítulo
  const bodyY = subY + subH + 5;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
    .text(obsText, left, bodyY, { width, lineGap: 3 });

  doc.y = bodyY + bodyH + 12;
  doc.moveDown(0.5);
}

// ─── PDF DE JUEZ ────────────────────────────────────────────────────────────

pdfController.generateJudgePdf = async (req, res, next) => {
  try {
    const judgeId = parseInt(req.params.id, 10);

    // Datos del juez
    const judgeResult = await pool.query(
      "SELECT id, name, email, level::text AS level, is_active, created_at FROM users WHERE id = $1 AND role = 'judge'",
      [judgeId]
    );
    if (judgeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Juez no encontrado' });
    }
    const judge = judgeResult.rows[0];

    // Estadísticas generales
    const statsResult = await pool.query(`
      SELECT judge_id, judge_name, level, total_fights,
             total_rounds_judged, avg_match_pct, last_5_avg_pct
      FROM v_judge_history
      WHERE judge_id = $1
    `, [judgeId]);
    const stats = statsResult.rows[0] || null;

    // Historial detallado
    const historyResult = await pool.query(`
      SELECT
        ar.fight_id,
        f.event_name,
        f.scheduled_date,
        ar.match_pct,
        ar.matches,
        ar.errors
      FROM analysis_results ar
      JOIN fights f ON f.id = ar.fight_id
      WHERE ar.judge_id = $1
      ORDER BY f.scheduled_date DESC
    `, [judgeId]);
    const history = historyResult.rows;

    // Observaciones
    const observations = await ProfileObservation.getForPdf('judge', judgeId);

    // Ranking implícito (pos among all judges by avg_match_pct)
    let position = null;
    if (stats) {
      const rankResult = await pool.query(`
        SELECT COUNT(*) + 1 AS pos
        FROM v_judge_history
        WHERE avg_match_pct > $1
      `, [stats.avg_match_pct]);
      position = rankResult.rows[0]?.pos || null;
    }

    // ── Generar PDF ──────────────────────────────────────────────────────

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Perfil de Juez — ${judge.name}`,
        Author: 'WBO Judges Evaluation System',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="perfil-juez-${judge.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    doc.pipe(res);

    setupFooter(doc);

    // Header
    drawHeader(doc, 'PERFIL DE JUEZ', `Informe de desempeño — ${judge.name}`);

    // ── 1) RESUMEN GENERAL ────────────────────────────────────────────────
    drawSectionTitle(doc, 'RESUMEN GENERAL');

    const summaryColW = (doc.page.width - 100) / 3;
    let sfy = doc.y;
    sfy = drawField(doc, 'Posición en ranking', position ? `#${position}` : '—', 50, sfy);
    sfy = drawField(doc, 'Peleas evaluadas', stats?.total_fights ?? 0, 50 + summaryColW, sfy);
    sfy = drawField(doc, 'Rounds puntuados', stats?.total_rounds_judged ?? 0, 50 + summaryColW * 2, sfy);
    doc.y = sfy + 2;
    sfy = drawField(doc, 'Accuracy global', stats ? `${stats.avg_match_pct}%` : '—', 50, doc.y);
    sfy = drawField(doc, 'Tendencia (últ. 5)', stats ? `${stats.last_5_avg_pct}%` : '—', 50 + summaryColW, sfy);
    sfy = drawField(doc, 'Ultimo accuracy', history[0] ? `${history[0].match_pct}%` : '—', 50 + summaryColW * 2, sfy);
    doc.y = sfy + 6;

    // Encabezado de bloques de gráficos
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark)
      .text('RENDIMIENTO VISUAL', 50, doc.y);
    doc.moveDown(0.4);

    // Fila 1: gauge de rendimiento global + tendencia de últimas 5
    const gaugeY = doc.y;
    checkNewPage(doc, 150);
    drawGauge(doc, stats ? stats.avg_match_pct : null, 'Accuracy global');
    checkNewPage(doc, 150);
    const trendData = history.slice(0, 5).reverse().map(h => ({
      label: formatDate(h.scheduled_date).slice(0, 5),
      value: h.match_pct,
    }));
    drawTrendChart(doc, trendData, 'Tendencia — últimas 5 peleas');
    doc.y = Math.max(doc.y, gaugeY + 120) + 4;

    // Barras: accuracy por pelea
    if (history.length > 0) {
      checkNewPage(doc, 170);
      drawBarChart(doc,
        history.map(h => ({
          label: (h.event_name || '').slice(0, 14),
          value: h.match_pct,
        })),
        'Rendimiento por pelea (accuracy)'
      );
      doc.moveDown(0.5);
    }

    // ── 2) DETALLE ────────────────────────────────────────────────────────
    addPageWithHeader(doc);
    doc.y = doc.page.margins.top + 20;

    // Identificación completa
    drawSectionTitle(doc, 'IDENTIFICACIÓN');
    let fy = doc.y;
    const colW = (doc.page.width - 100) / 3;
    fy = drawField(doc, 'Nombre', judge.name, 50, fy);
    fy = drawField(doc, 'Email', judge.email, 50 + colW, fy);
    fy = drawField(doc, 'Estado', judge.is_active ? 'Activo' : 'Inactivo', 50 + colW * 2, fy);
    doc.y = fy + 2;
    fy = drawField(doc, 'Nivel', judge.level || '—', 50, doc.y);
    fy = drawField(doc, 'Miembro desde', formatDate(judge.created_at), 50 + colW, fy);
    doc.y = fy + 8;

    // Historial
    if (history.length > 0) {
      checkNewPage(doc, 80);
      drawSectionTitle(doc, 'HISTORIAL DE PELEAS');
      const pageW = doc.page.width - 100;
      const colWidths = [pageW * 0.35, pageW * 0.2, pageW * 0.15, pageW * 0.15, pageW * 0.15];
      drawTable(doc,
        ['Evento', 'Fecha', 'Accuracy', 'Matches', 'Errors'],
        history.map(h => [
          h.event_name,
          formatDate(h.scheduled_date),
          `${h.match_pct}%`,
          h.matches,
          h.errors,
        ]),
        colWidths
      );
    }

    // Mapa de rendimiento por pelea (para mostrar junto a las observaciones)
    const fightPerf = new Map(history.map(h => [h.fight_id, h.match_pct]));

    // Observaciones
    if (observations.length > 0) {
      checkNewPage(doc, 40);
      drawSectionTitle(doc, 'OBSERVACIONES');
      observations.forEach((obs) => {
        const perf = fightPerf.get(obs.fight_id);
        const perfLabel = perf != null ? `Rendimiento: ${perf}% accuracy` : 'Rendimiento: sin evaluación';
        const perfColor = perf == null ? COLORS.textMuted : (perf >= 85 ? COLORS.green : (perf >= 70 ? COLORS.amber : COLORS.red));
        drawObservationBlock(doc, obs, perfLabel, perfColor);
      });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

// ─── PDF DE ÁRBITRO ─────────────────────────────────────────────────────────

pdfController.generateRefereePdf = async (req, res, next) => {
  try {
    const refereeId = parseInt(req.params.id, 10);

    // Datos del árbitro
    const Referee = require('../models/Referee');
    const profile = await Referee.getProfile(refereeId);
    if (!profile) {
      return res.status(404).json({ message: 'Árbitro no encontrado' });
    }

    const history = await Referee.getEvaluationHistory(refereeId);

    // Observaciones
    const observations = await ProfileObservation.getForPdf('referee', refereeId);

    // Ranking position
    let position = null;
    if (profile.average_final_score > 0) {
      const rankResult = await pool.query(`
        WITH eval_stats AS (
          SELECT referee_id, AVG(final_score) AS avg_fs
          FROM referee_evaluations
          GROUP BY referee_id
        )
        SELECT COUNT(*) + 1 AS pos
        FROM eval_stats es
        JOIN referees r ON r.id = es.referee_id
        WHERE es.avg_fs > $1
      `, [profile.average_final_score]);
      position = rankResult.rows[0]?.pos || null;
    }

    // ── Generar PDF ──────────────────────────────────────────────────────

    const fullName = `${profile.first_name} ${profile.last_name}`;
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Perfil de Árbitro — ${fullName}`,
        Author: 'WBO Judges Evaluation System',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="perfil-arbitro-${profile.last_name.toLowerCase()}.pdf"`);
    doc.pipe(res);

    setupFooter(doc);

    // Header
    drawHeader(doc, 'PERFIL DE ÁRBITRO', `Informe de desempeño — ${fullName}`);

    // Identificación
    drawSectionTitle(doc, 'IDENTIFICACIÓN');
    let fy = doc.y;
    const colW = (doc.page.width - 100) / 3;
    fy = drawField(doc, 'Nombre', fullName, 50, fy);
    fy = drawField(doc, 'Licencia', profile.license_number || '—', 50 + colW, fy);
    fy = drawField(doc, 'Federación', profile.federation || '—', 50 + colW * 2, fy);
    doc.y = fy + 2;
    fy = drawField(doc, 'Teléfono', profile.phone || '—', 50, fy);
    fy = drawField(doc, 'Estado', profile.active ? 'Activo' : 'Inactivo', 50 + colW, fy);
    doc.y = fy + 8;

    // Ranking
    drawSectionTitle(doc, 'RANKING');
    fy = doc.y;
    fy = drawField(doc, 'Posición', position ? `#${position}` : '—', 50, fy);
    fy = drawField(doc, 'Score promedio', `${profile.average_final_score}`, 50 + colW, fy);
    fy = drawField(doc, 'Mejor score', `${profile.best_score}`, 50 + colW * 2, fy);
    doc.y = fy + 2;
    fy = drawField(doc, 'Peor score', `${profile.worst_score}`, 50, fy);
    fy = drawField(doc, 'Deducción prom.', `${profile.average_deduction}`, 50 + colW, fy);
    doc.y = fy + 8;

    // Rendimiento
    drawSectionTitle(doc, 'RENDIMIENTO');
    fy = doc.y;
    fy = drawField(doc, 'Peleas evaluadas', profile.total_fights, 50, fy);
    fy = drawField(doc, 'Score promedio (base)', `${profile.average_score}`, 50 + colW, fy);
    fy = drawField(doc, 'Score final promedio', `${profile.average_final_score}`, 50 + colW * 2, fy);
    doc.y = fy + 8;

    // Historial de evaluaciones
    if (history.length > 0) {
      checkNewPage(doc, 80);
      drawSectionTitle(doc, 'HISTORIAL DE EVALUACIONES');
      const pageW = doc.page.width - 100;
      const colWidths = [pageW * 0.3, pageW * 0.2, pageW * 0.15, pageW * 0.15, pageW * 0.2];
      drawTable(doc,
        ['Evento', 'Fecha', 'Score', 'Deducción', 'Final'],
        history.map(h => [
          h.event_name,
          formatDate(h.fight_date),
          String(h.score),
          String(h.point_deduction),
          String(h.final_score),
        ]),
        colWidths
      );
    }

    // Evaluaciones existentes (comments)
    const evalsWithComments = history.filter(h => h.comments);
    if (evalsWithComments.length > 0) {
      checkNewPage(doc, 80);
      drawSectionTitle(doc, 'EVALUACIONES (comentarios del supervisor)');
      evalsWithComments.forEach((ev) => {
        checkNewPage(doc, 50);
        const ey = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
          .text(`${ev.event_name} — ${formatDate(ev.fight_date)}`, 50, ey);
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
          .text(`Supervisor: ${ev.supervisor_name} | Score: ${ev.final_score}`, 50, ey + 13);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
          .text(ev.comments, 50, ey + 26, { width: doc.page.width - 100 });
        doc.y = ey + 40 + doc.heightOfString(ev.comments, { width: doc.page.width - 100 });
        doc.moveDown(0.5);
      });
    }

    // Mapa de rendimiento por pelea (para mostrar junto a las observaciones)
    const fightPerf = new Map(history.map(h => [h.fight_id, h.final_score]));

    // Observaciones del perfil
    if (observations.length > 0) {
      checkNewPage(doc, 40);
      drawSectionTitle(doc, 'OBSERVACIONES DEL PERFIL');
      observations.forEach((obs) => {
        const perf = fightPerf.get(obs.fight_id);
        const perfLabel = perf != null ? `Score: ${perf}` : 'Score: sin evaluación';
        const perfColor = perf == null ? COLORS.textMuted : (perf >= 85 ? COLORS.green : (perf >= 70 ? COLORS.amber : COLORS.red));
        drawObservationBlock(doc, obs, perfLabel, perfColor);
      });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = pdfController;
