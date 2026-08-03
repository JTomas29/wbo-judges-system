import { useState, useEffect, useCallback, useRef } from 'react';
import { getRefereeEvaluation, createRefereeEvaluation, updateRefereeEvaluation, deleteRefereeEvaluation } from '../../services/refereeEvaluationService';
import { useAuth } from '../../context/AuthContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Sistema de estrellas para la calificación del árbitro.
// Cada estrella equivale a 2 puntos internos: score = estrellas × 2
const STAR_LABELS = {
  0: 'Seleccione una calificación',
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
};

const starLabel = (n) => STAR_LABELS[n] || STAR_LABELS[0];

// Convierte un score guardado (2, 4, 6, 8, 10) al número de estrellas (1-5)
const scoreToStars = (score) => {
  const n = parseInt(score, 10);
  if (!Number.isInteger(n) || n < 1) return 0;
  return Math.min(5, Math.max(1, Math.round(n / 2)));
};

const StarIcon = ({ filled }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
    className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-150 ${filled ? 'text-amber-400 drop-shadow-sm' : 'text-slate-300 dark:text-slate-600'}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const StarRating = ({ value = 0, onChange, disabled = false, name }) => {
  const [hover, setHover] = useState(0);
  const [focusStar, setFocusStar] = useState(0);
  const starRefs = useRef({});
  const effective = hover || value;

  const move = (next) => {
    const clamped = Math.min(5, Math.max(1, next));
    setFocusStar(clamped);
    setHover(clamped);
    const el = starRefs.current[clamped];
    if (el) el.focus();
  };

  const handleKeyDown = (e, star) => {
    if (disabled) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); move(star + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(star - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(1); }
    else if (e.key === 'End') { e.preventDefault(); move(5); }
  };

  return (
    <div role="radiogroup" aria-label={name || 'Calificación'}>
      <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => { starRefs.current[n] = el; }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${STAR_LABELS[n]}`}
            tabIndex={focusStar === n || (focusStar === 0 && n === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => { setFocusStar(n); setHover(0); if (onChange) onChange(n); }}
            onFocus={() => setFocusStar(n)}
            onMouseEnter={() => { if (!disabled) setHover(n); }}
            onKeyDown={(e) => handleKeyDown(e, n)}
            className={`p-1 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:scale-105'}`}
          >
            <StarIcon filled={n <= effective} />
          </button>
        ))}
      </div>
    </div>
  );
};

const RefereeEvaluationSection = ({ fight, onEvaluationChange }) => {
  const { token, user } = useAuth();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Form state
  const [formStars, setFormStars] = useState(0);
  const [formDeduction, setFormDeduction] = useState(0);
  const [formComments, setFormComments] = useState('');

  const isSupervisor = user?.role === 'supervisor';
  const isAdmin = user?.role === 'admin';
  const isJudge = user?.role === 'judge';
  // Único usuario autorizado: el SUPERVISOR de la pelea (quien la creó)
  const isFightSupervisor = isSupervisor && Number(fight?.created_by) === Number(user?.id);
  // La evaluación está disponible una vez finalizada la pelea (completed o analyzed)
  const isFightFinalized = fight?.status === 'completed' || fight?.status === 'analyzed';
  const canEdit = isFightSupervisor && isFightFinalized;
  const canView = isFightSupervisor && isFightFinalized;

  const loadEvaluation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRefereeEvaluation(fight.id, token);
      setEvaluation(res.data);
      setFormStars(scoreToStars(res.data.score));
      setFormDeduction(res.data.point_deduction);
      setFormComments(res.data.comments || '');
    } catch (err) {
      if (err.response?.status === 404) {
        setEvaluation(null);
        setFormStars(0);
        setFormDeduction(0);
        setFormComments('');
      } else {
        setError(err.response?.data?.message || 'Error al cargar la evaluación');
      }
    } finally {
      setLoading(false);
    }
  }, [fight?.id, token]);

  useEffect(() => {
    if (!canView || !fight?.id) {
      setLoading(false);
      return;
    }
    loadEvaluation();
  }, [canView, fight?.id, token, loadEvaluation]);

  // Juez no puede ver esta sección
  if (isJudge) return null;

  // Solo el supervisor de la pelea puede ver/editar la evaluación del árbitro
  if (isAdmin) return null;
  if (isSupervisor && !isFightSupervisor) return null;

  const handleSave = async () => {
    setSaveError(null);

    if (!formStars || formStars < 1 || formStars > 5) {
      setSaveError('Debe seleccionar entre 1 y 5 estrellas');
      return;
    }
    const scoreNum = formStars * 2;

    const deductionNum = parseInt(formDeduction, 10);
    if (isNaN(deductionNum) || deductionNum < 0 || deductionNum > 5) {
      setSaveError('El descuento debe ser un número entre 0 y 5');
      return;
    }

    if (formComments && formComments.length > 500) {
      setSaveError('Los comentarios no pueden exceder los 500 caracteres');
      return;
    }

    setSaving(true);
    try {
      if (evaluation?.id) {
        const res = await updateRefereeEvaluation(evaluation.id, {
          score: scoreNum,
          point_deduction: deductionNum,
          comments: formComments || null,
        }, token);
        setEvaluation(res.data);
        setEditing(false);
        if (onEvaluationChange) onEvaluationChange(res.data);
      } else {
        const res = await createRefereeEvaluation({
          fight_id: fight.id,
          referee_id: fight.referee?.id,
          score: scoreNum,
          point_deduction: deductionNum,
          comments: formComments || null,
        }, token);
        setEvaluation(res.data);
        setEditing(false);
        if (onEvaluationChange) onEvaluationChange(res.data);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar la evaluación');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (evaluation) {
      setFormStars(scoreToStars(evaluation.score));
      setFormDeduction(evaluation.point_deduction);
      setFormComments(evaluation.comments || '');
    }
    setEditing(true);
  };

  const handleCancel = () => {
    if (evaluation) {
      setFormStars(scoreToStars(evaluation.score));
      setFormDeduction(evaluation.point_deduction);
      setFormComments(evaluation.comments || '');
    } else {
      setFormStars(0);
      setFormDeduction(0);
      setFormComments('');
    }
    setEditing(false);
    setSaveError(null);
  };

  const handleDelete = async () => {
    if (!evaluation?.id) return;
    if (!window.confirm('¿Está seguro de que desea eliminar la evaluación del árbitro? Esta acción no se puede deshacer.')) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteRefereeEvaluation(evaluation.id, token);
      setEvaluation(null);
      setFormStars(0);
      setFormDeduction(0);
      setFormComments('');
      setEditing(false);
      if (onEvaluationChange) onEvaluationChange(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error al eliminar la evaluación');
    } finally {
      setDeleting(false);
    }
  };

  const finalScore = Math.max(0, (formStars || 0) * 2 - (parseInt(formDeduction, 10) || 0));

  if (!canView) return null;

  // No se puede evaluar un árbitro si la pelea no tiene uno asignado
  if (!fight?.referee?.id) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-500 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Evaluación del Árbitro</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">
              Esta pelea no tiene un árbitro asignado, por lo que no se puede registrar una evaluación.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-500 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 dark:border-slate-700 border-t-wbo-500" />
          <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Cargando evaluación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-red-500 shadow-sm p-5">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-2.5">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{error}</p>
        </div>
        <button
          onClick={loadEvaluation}
          className="mt-3 inline-flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#293548] transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Modo visualización (read-only)
  if (!editing && evaluation) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-500 shadow-sm p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Evaluación del Árbitro</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">
                Evaluada por {evaluation.supervisor_name || 'Supervisor'} el {formatDate(evaluation.created_at)}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shadow-sm disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-wbo-600 text-white rounded-xl text-xs font-semibold hover:bg-wbo-700 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Editar
              </button>
            </div>
          )}
        </div>

        {deleteError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-2.5">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{deleteError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <div className="w-9 h-9 rounded-lg bg-wbo-100 dark:bg-wbo-900/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Calificación</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{evaluation.score}/10</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <div className="w-9 h-9 rounded-lg bg-wbo-100 dark:bg-wbo-900/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Descuento</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">-{evaluation.point_deduction} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 border border-wbo-100 dark:border-wbo-800/30">
            <div className="w-9 h-9 rounded-lg bg-wbo-200 dark:bg-wbo-800/40 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Puntaje Final</p>
              <p className="text-lg font-extrabold text-wbo-700 dark:text-wbo-300 truncate">{evaluation.final_score}</p>
            </div>
          </div>
        </div>

        {evaluation.comments && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-1">Comentarios</p>
            <p className="text-sm text-slate-700 dark:text-[#94A3B8] leading-relaxed m-0">{evaluation.comments}</p>
          </div>
        )}
      </div>
    );
  }

  // No hay evaluación todavía y el usuario puede crearla
  if (!evaluation && canEdit) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-500 shadow-sm p-5 transition-all duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Evaluación del Árbitro</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">Complete la evaluación del árbitro de esta pelea</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Calificación */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Calificación <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center sm:justify-start">
              <StarRating value={formStars} onChange={setFormStars} name="Calificación del árbitro" />
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
              <span className={`text-sm font-bold ${formStars ? 'text-slate-800 dark:text-[#F8FAFC]' : 'text-slate-400 dark:text-slate-500'}`}>
                {starLabel(formStars)}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-wbo-700 dark:text-wbo-400 bg-wbo-50 dark:bg-wbo-900/20 border border-wbo-100 dark:border-wbo-800/30 rounded-lg px-2.5 py-1 tabular-nums">
                Puntaje: {formStars ? formStars * 2 : '—'}/10
              </span>
            </div>
          </div>

          {/* Descuento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Descuento
            </label>
            <select
              value={formDeduction}
              onChange={(e) => setFormDeduction(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC]"
            >
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} punto{v !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Puntaje Final */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Puntaje Final
            </label>
            <div className="w-full px-3.5 py-2.5 border border-wbo-200 dark:border-wbo-800/30 rounded-xl text-sm bg-wbo-50 dark:bg-wbo-900/20 text-wbo-700 dark:text-wbo-300 font-bold flex items-center">
              {finalScore}
            </div>
          </div>
        </div>

        {/* Comentarios */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
            Comentarios <span className="text-slate-400 font-normal">(opcional, máx. 500 caracteres)</span>
          </label>
          <textarea
            value={formComments}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setFormComments(e.target.value);
              }
            }}
            rows={3}
            placeholder="Observaciones sobre el desempeño del árbitro..."
            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 resize-none bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">{formComments.length}/500</p>
        </div>

        {saveError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-2.5">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{saveError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-wbo-600 text-white rounded-xl text-sm font-semibold hover:bg-wbo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-40"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {evaluation?.id ? 'Actualizar evaluación' : 'Guardar evaluación'}
              </>
            )}
          </button>
          {evaluation?.id && (
            <button
              disabled={saving}
              onClick={handleCancel}
              className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Modo edición
  if (editing && canEdit) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-500 shadow-sm p-5 transition-all duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Editar Evaluación del Árbitro</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">Modifique la evaluación del árbitro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Calificación */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Calificación <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center sm:justify-start">
              <StarRating value={formStars} onChange={setFormStars} name="Calificación del árbitro" />
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
              <span className={`text-sm font-bold ${formStars ? 'text-slate-800 dark:text-[#F8FAFC]' : 'text-slate-400 dark:text-slate-500'}`}>
                {starLabel(formStars)}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-wbo-700 dark:text-wbo-400 bg-wbo-50 dark:bg-wbo-900/20 border border-wbo-100 dark:border-wbo-800/30 rounded-lg px-2.5 py-1 tabular-nums">
                Puntaje: {formStars ? formStars * 2 : '—'}/10
              </span>
            </div>
          </div>

          {/* Descuento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Descuento
            </label>
            <select
              value={formDeduction}
              onChange={(e) => setFormDeduction(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC]"
            >
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} punto{v !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Puntaje Final */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Puntaje Final
            </label>
            <div className="w-full px-3.5 py-2.5 border border-wbo-200 dark:border-wbo-800/30 rounded-xl text-sm bg-wbo-50 dark:bg-wbo-900/20 text-wbo-700 dark:text-wbo-300 font-bold flex items-center">
              {finalScore}
            </div>
          </div>
        </div>

        {/* Comentarios */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
            Comentarios <span className="text-slate-400 font-normal">(opcional, máx. 500 caracteres)</span>
          </label>
          <textarea
            value={formComments}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setFormComments(e.target.value);
              }
            }}
            rows={3}
            placeholder="Observaciones sobre el desempeño del árbitro..."
            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 resize-none bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">{formComments.length}/500</p>
        </div>

        {saveError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-2.5">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{saveError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-wbo-600 text-white rounded-xl text-sm font-semibold hover:bg-wbo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-40"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Actualizar evaluación
              </>
            )}
          </button>
          <button
            disabled={saving}
            onClick={handleCancel}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default RefereeEvaluationSection;