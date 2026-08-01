import { useState, useEffect } from 'react';
import { getRefereeEvaluation, createRefereeEvaluation, updateRefereeEvaluation } from '../../services/refereeEvaluationService';
import { useAuth } from '../../context/AuthContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const RefereeEvaluationSection = ({ fight, onEvaluationChange }) => {
  const { token, user } = useAuth();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Form state
  const [formScore, setFormScore] = useState('');
  const [formDeduction, setFormDeduction] = useState(0);
  const [formComments, setFormComments] = useState('');

  const isSupervisor = user?.role === 'supervisor';
  const isAdmin = user?.role === 'admin';
  const isJudge = user?.role === 'judge';
  const canEdit = isSupervisor && fight?.status === 'analyzed';
  const canView = (isSupervisor || isAdmin) && fight?.status === 'analyzed';

  // Juez no puede ver esta sección
  if (isJudge) return null;

  useEffect(() => {
    if (!canView || !fight?.id) {
      setLoading(false);
      return;
    }
    loadEvaluation();
  }, [fight?.id, token]);

  const loadEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRefereeEvaluation(fight.id, token);
      setEvaluation(res.data);
      setFormScore(res.data.score);
      setFormDeduction(res.data.point_deduction);
      setFormComments(res.data.comments || '');
    } catch (err) {
      if (err.response?.status === 404) {
        setEvaluation(null);
        setFormScore('');
        setFormDeduction(0);
        setFormComments('');
      } else {
        setError(err.response?.data?.message || 'Error al cargar la evaluación');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);

    const scoreNum = parseInt(formScore, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setSaveError('La calificación debe ser un número entre 0 y 100');
      return;
    }

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
      setFormScore(evaluation.score);
      setFormDeduction(evaluation.point_deduction);
      setFormComments(evaluation.comments || '');
    }
    setEditing(true);
  };

  const handleCancel = () => {
    if (evaluation) {
      setFormScore(evaluation.score);
      setFormDeduction(evaluation.point_deduction);
      setFormComments(evaluation.comments || '');
    } else {
      setFormScore('');
      setFormDeduction(0);
      setFormComments('');
    }
    setEditing(false);
    setSaveError(null);
  };

  const finalScore = Math.max(0, (parseInt(formScore, 10) || 0) - (parseInt(formDeduction, 10) || 0));

  if (!canView) return null;

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
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-wbo-600 text-white rounded-xl text-xs font-semibold hover:bg-wbo-700 transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <div className="w-9 h-9 rounded-lg bg-wbo-100 dark:bg-wbo-900/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Calificación</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{evaluation.score}/100</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Calificación <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={formScore}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 100)) {
                  setFormScore(val);
                }
              }}
              placeholder="0 - 100"
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
            />
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Calificación <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={formScore}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 100)) {
                  setFormScore(val);
                }
              }}
              placeholder="0 - 100"
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wbo-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
            />
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