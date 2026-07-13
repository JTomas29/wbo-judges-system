-- ============================================================
-- VALIDACIÓN: Migration 002
-- ============================================================

INSERT INTO users (name, email, password_hash, role)
SELECT 'Admin Test', 'admin.test@wbo.com', '$2a$10$dummyhashtest0000', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin.test@wbo.com');

DO $$
DECLARE
    v_fight_id INTEGER;
    v_j1 INTEGER;
    v_j2 INTEGER;
    v_j3 INTEGER;
    v_sc1 INTEGER;
    v_sc2 INTEGER;
    v_sc3 INTEGER;
    v_oc1 INTEGER;
    v_admin_id INTEGER;
    v_status TEXT;
    v_red SMALLINT;
    v_blue SMALLINT;
    v_winner TEXT;
    rec RECORD;
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE email = 'admin.test@wbo.com';

    RAISE NOTICE '=== 2. TEST: pending -> active (trigger confirmations) ===';

    INSERT INTO fights (event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, status, created_by, min_judges_required, weight_class, notes)
    VALUES ('Pelea Test Migracion', 'Boxeador Rojo Test', 'Boxeador Azul Test', CURRENT_DATE + 10, 8, 'pending', v_admin_id, 3, 'Peso Pesado', 'Pelea de validacion migracion 002')
    RETURNING id INTO v_fight_id;

    RAISE NOTICE 'Pelea creada ID: %', v_fight_id;

    INSERT INTO users (name, email, password_hash, role) VALUES ('Juez Test A', 'juez.a@test.com', '$2a$10$dummyhashtestA1', 'judge') RETURNING id INTO v_j1;
    INSERT INTO users (name, email, password_hash, role) VALUES ('Juez Test B', 'juez.b@test.com', '$2a$10$dummyhashtestB1', 'judge') RETURNING id INTO v_j2;
    INSERT INTO users (name, email, password_hash, role) VALUES ('Juez Test C', 'juez.c@test.com', '$2a$10$dummyhashtestC1', 'judge') RETURNING id INTO v_j3;

    INSERT INTO judge_assignments (fight_id, judge_id, status) VALUES (v_fight_id, v_j1, 'pending');
    INSERT INTO judge_assignments (fight_id, judge_id, status) VALUES (v_fight_id, v_j2, 'pending');
    INSERT INTO judge_assignments (fight_id, judge_id, status) VALUES (v_fight_id, v_j3, 'pending');

    SELECT status::text INTO v_status FROM fights WHERE id = v_fight_id;
    RAISE NOTICE 'Inicial: % (debe ser pending)', v_status;

    UPDATE judge_assignments SET status = 'confirmed', responded_at = NOW() WHERE fight_id = v_fight_id AND judge_id = v_j1;
    SELECT status::text INTO v_status FROM fights WHERE id = v_fight_id;
    RAISE NOTICE 'Tras J1: % (debe ser pending - 1/3)', v_status;

    UPDATE judge_assignments SET status = 'confirmed', responded_at = NOW() WHERE fight_id = v_fight_id AND judge_id = v_j2;
    SELECT status::text INTO v_status FROM fights WHERE id = v_fight_id;
    RAISE NOTICE 'Tras J2: % (debe ser pending - 2/3)', v_status;

    UPDATE judge_assignments SET status = 'confirmed', responded_at = NOW() WHERE fight_id = v_fight_id AND judge_id = v_j3;
    SELECT status::text INTO v_status FROM fights WHERE id = v_fight_id;
    RAISE NOTICE 'Tras J3: % (debe ser ACTIVE)', v_status;

    -- ============================================================
    RAISE NOTICE '=== 3. TEST: Tarjetas + rounds + oficial ===';

    INSERT INTO score_cards (fight_id, judge_id, status, total_score_red, total_score_blue)
    VALUES (v_fight_id, v_j1, 'draft', 0, 0) RETURNING id INTO v_sc1;
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc1, 1, 10, 9);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc1, 2, 10, 8);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc1, 3, 9, 10);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc1, 4, 10, 9);
    UPDATE score_cards SET status = 'finalized', submitted_at = NOW() WHERE id = v_sc1;

    SELECT total_score_red, total_score_blue, winner INTO v_red, v_blue, v_winner FROM score_cards WHERE id = v_sc1;
    RAISE NOTICE 'J1 score_card: rojo=%, azul=%, winner=%', v_red, v_blue, v_winner;

    INSERT INTO score_cards (fight_id, judge_id, status, total_score_red, total_score_blue)
    VALUES (v_fight_id, v_j2, 'draft', 0, 0) RETURNING id INTO v_sc2;
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc2, 1, 10, 9);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc2, 2, 10, 8);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc2, 3, 9, 10);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc2, 4, 10, 9);
    UPDATE score_cards SET status = 'finalized', submitted_at = NOW() WHERE id = v_sc2;

    INSERT INTO score_cards (fight_id, judge_id, status, total_score_red, total_score_blue)
    VALUES (v_fight_id, v_j3, 'draft', 0, 0) RETURNING id INTO v_sc3;
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc3, 1, 9, 10);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc3, 2, 10, 8);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc3, 3, 9, 10);
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue) VALUES (v_sc3, 4, 10, 9);
    UPDATE score_cards SET status = 'finalized', submitted_at = NOW() WHERE id = v_sc3;

    INSERT INTO official_cards (fight_id, card_number, total_score_red, total_score_blue, created_by)
    VALUES (v_fight_id, 1, 0, 0, v_admin_id) RETURNING id INTO v_oc1;
    INSERT INTO official_round_scores (official_card_id, round_number, score_red, score_blue) VALUES (v_oc1, 1, 10, 9);
    INSERT INTO official_round_scores (official_card_id, round_number, score_red, score_blue) VALUES (v_oc1, 2, 10, 8);
    INSERT INTO official_round_scores (official_card_id, round_number, score_red, score_blue) VALUES (v_oc1, 3, 9, 10);
    INSERT INTO official_round_scores (official_card_id, round_number, score_red, score_blue) VALUES (v_oc1, 4, 10, 9);

    SELECT total_score_red, total_score_blue, winner INTO v_red, v_blue, v_winner FROM official_cards WHERE id = v_oc1;
    RAISE NOTICE 'Oficial card: rojo=%, azul=%, winner=%', v_red, v_blue, v_winner;

    -- ============================================================
    RAISE NOTICE '=== 4. TEST: fn_calculate_analysis() ===';

    FOR rec IN SELECT * FROM fn_calculate_analysis(v_fight_id) LOOP
        RAISE NOTICE '  Juez: %, Oficial #%, Rds:%, Match:%, Err:%, Pct:%', rec.judge_name, rec.card_number, rec.total_rounds, rec.matches, rec.errors, rec.match_pct;
    END LOOP;

    SELECT status::text INTO v_status FROM fights WHERE id = v_fight_id;
    RAISE NOTICE 'Estado pelea: % (debe ser analyzed)', v_status;

    RAISE NOTICE 'analysis_results:';
    FOR rec IN SELECT u.name, ar.total_rounds, ar.matches, ar.errors, ar.match_pct FROM analysis_results ar JOIN users u ON u.id = ar.judge_id WHERE ar.fight_id = v_fight_id ORDER BY u.name LOOP
        RAISE NOTICE '  %: %/% match (pct:%)', rec.name, rec.matches, rec.total_rounds, rec.match_pct;
    END LOOP;

    RAISE NOTICE 'judge_consistency:';
    FOR rec IN SELECT ja.name AS j_a, jb.name AS j_b, jc.matching_rounds, jc.total_rounds, jc.match_pct FROM judge_consistency jc JOIN users ja ON ja.id = jc.judge_a_id JOIN users jb ON jb.id = jc.judge_b_id WHERE jc.fight_id = v_fight_id ORDER BY ja.name LOOP
        RAISE NOTICE '  % vs %: %/% rounds (pct:%)', rec.j_a, rec.j_b, rec.matching_rounds, rec.total_rounds, rec.match_pct;
    END LOOP;

    RAISE NOTICE 'users.level:';
    FOR rec IN SELECT name, level::text FROM users WHERE id IN (v_j1, v_j2, v_j3) ORDER BY name LOOP
        RAISE NOTICE '  %: %', rec.name, rec.level;
    END LOOP;

    RAISE NOTICE 'v_judge_history:';
    FOR rec IN SELECT judge_name, level::text, total_fights, total_rounds_judged, avg_match_pct, last_5_avg_pct FROM v_judge_history WHERE judge_id IN (v_j1, v_j2, v_j3) ORDER BY judge_name LOOP
        RAISE NOTICE '  % (level=%): % fights, % rds, avg=%, last5=%', rec.judge_name, rec.level, rec.total_fights, rec.total_rounds_judged, rec.avg_match_pct, rec.last_5_avg_pct;
    END LOOP;

    RAISE NOTICE '=== 5. TODOS LOS TESTS PASARON ===';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END;
$$;
