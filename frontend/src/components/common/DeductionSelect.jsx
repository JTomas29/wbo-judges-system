import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

// ─── DeductionSelect ───────────────────────────────────────────────────────────
// Selector personalizado y accesible (patrón ARIA "listbox") para elegir la
// deducción de puntos por faltas del árbitro (0, 1 o 2 puntos).
// El listado se renderiza mediante un portal sobre <body> con reposicionamiento
// dinámico (hacia arriba o abajo) y soporte completo de teclado.
// Sin contexto adicional: recibe valor y callback por props.
// ───────────────────────────────────────────────────────────────────────────────

// Valores de descuento permitidos (en puntos)
const OPTIONS = [0, 1, 2];

// style por valor: categoriza visualmente la severidad del descuento aplicado
const valueStyle = (v) => {
  switch (Number(v)) {
    case 0:
      return 'text-slate-500 dark:text-[#94A3B8]';
    case 1:
      return 'text-amber-600 dark:text-amber-400';
    case 2:
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-red-600 dark:text-red-400';
  }
};

const DeductionSelect = ({ value = 0, onChange, disabled = false, labelId, listboxLabel = 'Descuento (puntos)' }) => {
  // Estado interno del componente
  const [open, setOpen] = useState(false);                              // ¿listado abierto o cerrado?
  const [activeIndex, setActiveIndex] = useState(OPTIONS.indexOf(Number(value))); // opción resaltada por teclado/hover
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placeAbove: false }); // posición del portal

  // Referencias al botón disparador y al listbox flotante
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  // ID único (useId) para conectar aria-controls / aria-activedescendant sin colisiones
  const uid = useId();
  const listboxId = `deduction-listbox-${uid}`;

  // Valor y posición actuales normalizados a número
  const currentValue = Number(value);
  const currentIndex = OPTIONS.indexOf(currentValue);

  // Calcula coordenadas del portal según el espacio disponible en el viewport
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const listHeight = 148;
    const placeAbove = window.innerHeight - rect.bottom < listHeight + 8 && rect.top > listHeight + 8;
    setCoords({
      top: placeAbove ? rect.top - listHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      placeAbove,
    });
  }, []);

  // Mientras esté abierto: reposiciona el portal al hacer scroll o resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onViewportChange = () => updatePosition();
    window.addEventListener('scroll', onViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, { capture: true });
      window.removeEventListener('resize', onViewportChange);
    };
  }, [open, updatePosition]);

  // Clic fuera del control (por fuera del trigger/listbox) => cierra el menú
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Al reabrir, reinicia el índice activo a la opción seleccionada actual
  useEffect(() => {
    if (open) setActiveIndex(currentIndex);
  }, [open, currentIndex]);

  // Selecciona un valor, notifica al padre y devuelve el foco al botón
  const select = (val) => {
    onChange(Number(val));
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Navegación por teclado: flechas, Home/End, Enter/Espacio y Escape
  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setActiveIndex(currentIndex);
          setOpen(true);
        } else {
          setActiveIndex((i) => Math.min(i + 1, OPTIONS.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          setActiveIndex(currentIndex);
          setOpen(true);
        } else {
          setActiveIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Home':
        e.preventDefault();
        if (open) setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (open) setActiveIndex(OPTIONS.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setActiveIndex(currentIndex);
          setOpen(true);
        } else {
          select(OPTIONS[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  // Renderiza el botón disparador + el listado flotante (portal) cuando está abierto
  return (
    <>
      {/* Botón disparador: muestra el valor actual y el chevron indicador */}
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? `${listboxId}-option-${OPTIONS[activeIndex]}` : undefined}
          className={`w-full px-3 py-3 flex items-center justify-between gap-2 rounded-xl text-sm font-bold tabular-nums shadow-sm transition-all duration-200 outline-none border ${valueStyle(currentValue)}
            ${open
              ? 'border-wbo-600 dark:border-wbo-400 ring-4 ring-wbo-700/10 shadow-md'
              : 'border-slate-200 dark:border-[#1E293B] hover:border-wbo-500/60 dark:hover:border-wbo-700/70'}
            bg-slate-50/50 dark:bg-[#0B1120]
            disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 dark:disabled:hover:border-[#1E293B]`}
        >
          <span className="tabular-nums leading-none">{currentValue}</span>
          <ChevronDownIcon
            className={`w-4 h-4 shrink-0 transition-all duration-200 ${
              open
                ? 'rotate-180 text-wbo-600 dark:text-wbo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          />
        </button>
      </div>

      {/* Listado flotante con las opciones de descuento (renderizado en <body> vía portal) */}
      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={listboxLabel}
            className={`fixed z-50 min-w-[6rem] bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#334155] shadow-lg shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-dropdownIn ${
              coords.placeAbove ? 'origin-bottom' : 'origin-top'
            }`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {OPTIONS.map((opt, i) => {
              const isSelected = opt === currentValue;
              const isActive = i === activeIndex;
              return (
                <div
                  key={opt}
                  id={`${listboxId}-option-${opt}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-bold tabular-nums cursor-pointer transition-colors duration-150 select-none ${valueStyle(opt)}
                    ${isSelected
                      ? 'bg-wbo-50 dark:bg-wbo-900/30 ring-1 ring-wbo-600/25'
                      : isActive
                        ? 'bg-slate-50 dark:bg-[#0B1120]'
                        : 'hover:bg-slate-50 dark:hover:bg-[#0B1120]'}`}
                >
                  <span className="tabular-nums leading-none">{opt}</span>
                  {isSelected && <CheckIcon className="w-4 h-4 text-wbo-700 dark:text-wbo-400" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

// Exporta el selector de descuentos para su uso en la evaluación de lucha
export default DeductionSelect;
