const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');
const ProfileObservation = require('../models/ProfileObservation');
const {
  COLORS,
  formatDate,
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
} = require('../utils/pdfLayout');

const pdfController = {};

const rankColor = (v) => (v >= 85 ? COLORS.green : v >= 70 ? COLORS.amber : COLORS.red);

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
      bufferPages: true,
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Perfil de Juez — ${judge.name}`,
        Author: 'WBO Judges Evaluation System',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="perfil-juez-${judge.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    doc.pipe(res);

    // Header + título del informe
    doc.y = drawTitleBlock(doc, 'PERFIL DE JUEZ', judge.name, 'Informe de desempeño');

    // Identificación (ficha profesional)
    doc.y = drawSectionTitle(doc, 'IDENTIFICACIÓN');
    doc.y = drawProfileCard(doc, [
      [
        { label: 'Nombre', value: judge.name },
        { label: 'Email', value: judge.email },
        { label: 'Estado', value: judge.is_active ? 'Activo' : 'Inactivo', pill: true },
      ],
      [
        { label: 'Nivel', value: judge.level || '—' },
        { label: 'Miembro desde', value: formatDate(judge.created_at) },
      ],
    ]);

    // Ranking
    doc.y = drawSectionTitle(doc, 'RANKING');
    doc.y = drawMetricCards(doc, [
      { label: 'Posición', value: position ? `#${position}` : '—', caption: 'Ranking WBO', color: COLORS.gold },
      { label: 'Promedio', value: stats ? `${stats.avg_match_pct}%` : '—', caption: 'Accuracy promedio', color: COLORS.blue },
      { label: 'Últimas 5', value: stats ? `${stats.last_5_avg_pct}%` : '—', caption: 'Últimas 5 peleas', color: COLORS.green },
    ]);

    // Rendimiento (panel diferenciado)
    doc.y = drawSectionTitle(doc, 'RENDIMIENTO');
    doc.y = drawPerformancePanel(doc, [
      { label: 'Peleas evaluadas', value: stats?.total_fights ?? 0, caption: 'Peleas totales', color: COLORS.primary },
      { label: 'Rounds puntuados', value: stats?.total_rounds_judged ?? 0, caption: 'Rounds', color: COLORS.gold },
      { label: 'Accuracy global', value: stats ? `${stats.avg_match_pct}%` : '—', caption: 'Match exacto', color: COLORS.green },
    ]);

    // Evolución (line/area, mismos valores)
    doc.y = drawEvolutionChart(doc, 'EVOLUCIÓN DE ACCURACY', history, (h) => h.match_pct, rankColor, '%');

    // Historial
    if (history.length > 0) {
      checkNewPage(doc, 80);
      doc.y = drawSectionTitle(doc, 'HISTORIAL DE PELEAS');
      const pageW = doc.page.width - 100;
      const colWidths = [pageW * 0.35, pageW * 0.2, pageW * 0.15, pageW * 0.15, pageW * 0.15];
      doc.y = drawTable(doc,
        ['Evento', 'Fecha', 'Accuracy', 'Matches', 'Errors'],
        history.map((h) => [
          h.event_name,
          formatDate(h.scheduled_date),
          `${h.match_pct}%`,
          h.matches,
          h.errors,
        ]),
        colWidths,
        ['left', 'left', 'right', 'right', 'right']
      );
    }

    // Mapa de rendimiento por pelea (para mostrar junto a las observaciones)
    const fightPerf = new Map(history.map((h) => [h.fight_id, h.match_pct]));

    // Observaciones
    if (observations.length > 0) {
      checkNewPage(doc, 40);
      doc.y = drawSectionTitle(doc, 'OBSERVACIONES');
      observations.forEach((obs) => {
        const perf = fightPerf.get(obs.fight_id);
        const badge = perf != null ? `Rendimiento: ${perf}% accuracy` : 'Rendimiento: sin evaluación';
        const badgeColor = perf == null ? COLORS.textMuted : rankColor(perf);
        doc.y = drawContentCard(doc, {
          header: obs.event_name,
          date: formatDate(obs.scheduled_date),
          badge,
          badgeColor,
          sub: `${obs.boxer_red} vs ${obs.boxer_blue} · Creada por: ${obs.creator_name}`,
          body: obs.observation,
        });
      });
    }

    drawFooters(doc);
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
      bufferPages: true,
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Perfil de Árbitro — ${fullName}`,
        Author: 'WBO Judges Evaluation System',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="perfil-arbitro-${profile.last_name.toLowerCase()}.pdf"`);
    doc.pipe(res);

    // Header + título del informe
    doc.y = drawTitleBlock(doc, 'PERFIL DE ÁRBITRO', fullName, 'Informe de desempeño');

    // Identificación (ficha profesional)
    doc.y = drawSectionTitle(doc, 'IDENTIFICACIÓN');
    doc.y = drawProfileCard(doc, [
      [
        { label: 'Nombre', value: fullName },
        { label: 'Licencia', value: profile.license_number || '—' },
        { label: 'Estado', value: profile.active ? 'Activo' : 'Inactivo', pill: true },
      ],
      [
        { label: 'Federación', value: profile.federation || '—' },
        { label: 'Teléfono', value: profile.phone || '—' },
      ],
    ]);

    // Ranking
    doc.y = drawSectionTitle(doc, 'RANKING');
    doc.y = drawMetricCards(doc, [
      { label: 'Posición', value: position ? `#${position}` : '—', caption: 'Ranking WBO', color: COLORS.gold },
      { label: 'Score promedio', value: profile.average_final_score, caption: 'Final promedio', color: COLORS.blue },
      { label: 'Mejor score', value: profile.best_score, caption: 'Máximo alcanzado', color: COLORS.green },
    ]);

    // Rendimiento (panel diferenciado)
    doc.y = drawSectionTitle(doc, 'RENDIMIENTO');
    doc.y = drawPerformancePanel(doc, [
      { label: 'Peleas evaluadas', value: profile.total_fights, caption: 'Peleas totales', color: COLORS.primary },
      { label: 'Score base', value: profile.average_score, caption: 'Sin deducciones', color: COLORS.gold },
      { label: 'Deducción promedio', value: profile.average_deduction, caption: 'Deducción por pelea', color: COLORS.amber },
    ]);

    // Evolución (line/area, mismos valores)
    doc.y = drawEvolutionChart(doc, 'EVOLUCIÓN DEL SCORE FINAL', history, (h) => h.final_score, rankColor);

    // Historial de evaluaciones
    if (history.length > 0) {
      checkNewPage(doc, 80);
      doc.y = drawSectionTitle(doc, 'HISTORIAL DE EVALUACIONES');
      const pageW = doc.page.width - 100;
      const colWidths = [pageW * 0.3, pageW * 0.2, pageW * 0.15, pageW * 0.15, pageW * 0.2];
      doc.y = drawTable(doc,
        ['Evento', 'Fecha', 'Score', 'Deducción', 'Final'],
        history.map((h) => [
          h.event_name,
          formatDate(h.fight_date),
          String(h.score),
          String(h.point_deduction),
          String(h.final_score),
        ]),
        colWidths,
        ['left', 'left', 'right', 'right', 'right']
      );
    }

    // Evaluaciones existentes (comments)
    const evalsWithComments = history.filter((h) => h.comments);
    if (evalsWithComments.length > 0) {
      checkNewPage(doc, 80);
      doc.y = drawSectionTitle(doc, 'EVALUACIONES (comentarios del supervisor)');
      evalsWithComments.forEach((ev) => {
        doc.y = drawContentCard(doc, {
          header: ev.event_name,
          date: formatDate(ev.fight_date),
          badge: `Score: ${ev.final_score}`,
          badgeColor: rankColor(Number(ev.final_score)),
          sub: `Supervisor: ${ev.supervisor_name}`,
          body: ev.comments,
        });
      });
    }

    // Mapa de rendimiento por pelea (para mostrar junto a las observaciones)
    const fightPerf = new Map(history.map((h) => [h.fight_id, h.final_score]));

    // Observaciones del perfil
    if (observations.length > 0) {
      checkNewPage(doc, 40);
      doc.y = drawSectionTitle(doc, 'OBSERVACIONES DEL PERFIL');
      observations.forEach((obs) => {
        const perf = fightPerf.get(obs.fight_id);
        const badge = perf != null ? `Score: ${perf}` : 'Score: sin evaluación';
        const badgeColor = perf == null ? COLORS.textMuted : rankColor(Number(perf));
        doc.y = drawContentCard(doc, {
          header: obs.event_name,
          date: formatDate(obs.scheduled_date),
          badge,
          badgeColor,
          sub: `${obs.boxer_red} vs ${obs.boxer_blue} · Creada por: ${obs.creator_name}`,
          body: obs.observation,
        });
      });
    }

    drawFooters(doc);
    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = pdfController;