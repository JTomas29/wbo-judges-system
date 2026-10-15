-- ============================================================
-- Migración 021: Regla 10-point-must en la puntuación de los rounds
-- PostgreSQL 17+
-- Aplicar con: psql -U postgres -d wbo_judges -f migration_021.sql
-- ============================================================
-- CONTEXTO
-- --------
-- `round_scores.chk_round_scores` sólo acotaba el rango 1..10, por lo que
-- admitedía rounds que en boxeo no existen (9-9, 8-8, 6-6, 10-5...).
--
-- Esta migración endurece la restricción a la regla real del sistema de
-- puntuación (10-point-must):
--
--   * score_red  y score_blue enteros entre 6 y 10
--   * obligatoriamente uno de los dos es 10  ->  GREATEST(...) = 10
--   * el menor es 6 o más                     ->  LEAST(...)  >= 6
--
-- Válidos: 10-10, 10-9, 10-8, 10-7, 10-6 y sus inversos.
-- Inválidos: 9-9, 8-8, 7-7, 6-6, 10-5, 5-10, 11-9.
--
-- NO se toca el descuento: `deduction_red`/`deduction_blue` siguen siendo
-- 0/1/2 y las columnas generadas `final_score_red/blue` (= score - deduction)
-- se siguen usando SÓLO para el total de la tarjeta. El puntaje base de cada
-- round queda intacto.
-- ============================================================

BEGIN;

-- Verificación defensiva: la migración falla si ya existieran rounds que
-- violen la regla, en lugar de dejar la base en un estado inconsistente.
DO $$
DECLARE
    v_invalidos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_invalidos
    FROM round_scores
    WHERE score_red  < 6 OR score_red  > 10
       OR score_blue < 6 OR score_blue > 10
       OR GREATEST(score_red, score_blue) <> 10
       OR LEAST(score_red, score_blue) < 6;

    IF v_invalidos > 0 THEN
        RAISE EXCEPTION
            'Migración 021 abortada: % round(s) con puntuación fuera de la regla 10-6. Corregilos antes de aplicar.',
            v_invalidos;
    END IF;
END $$;

ALTER TABLE round_scores DROP CONSTRAINT IF EXISTS chk_round_scores;

ALTER TABLE round_scores
    ADD CONSTRAINT chk_round_scores CHECK (
        score_red  BETWEEN 6 AND 10
        AND score_blue BETWEEN 6 AND 10
        AND GREATEST(score_red, score_blue) = 10
        AND LEAST(score_red, score_blue) >= 6
    );

COMMENT ON CONSTRAINT chk_round_scores ON round_scores IS
    'Sistema de boxeo 10-point-must: enteros 6-10 y obligatoriamente uno de los dos con 10 puntos.';

-- Recálculo defensivo de los totales de las tarjetas con la misma lógica
-- (suma de los puntajes finales = base - descuento). Los totales ya se
-- mantienen con el trigger fn_update_score_card_totals(); esta sección sólo
-- normaliza tarjetas que hubieran quedado desactualizadas.
UPDATE score_cards sc
SET
    total_score_red = (
        SELECT COALESCE(SUM(rs.score_red - rs.deduction_red), 0)
        FROM round_scores rs
        WHERE rs.score_card_id = sc.id
    ),
    total_score_blue = (
        SELECT COALESCE(SUM(rs.score_blue - rs.deduction_blue), 0)
        FROM round_scores rs
        WHERE rs.score_card_id = sc.id
    );

COMMIT;
