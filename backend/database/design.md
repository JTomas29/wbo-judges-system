# WBO Judges Evaluation System — Diseño de Base de Datos

---

## 1. Modelo Entidad-Relación (ERD)

```
┌──────────────────────┐
│        users         │──────── 1 ── * ──┐
├──────────────────────┤                   │
│ PK  id               │                   │
│     name             │                   ▼
│     email            │         ┌──────────────────────┐
│     password_hash    │         │       fights         │
│     role (enum)      │─────────┼──────────────────────┤
│     is_active        │ 1 ── *  │ PK  id               │
│     created_at       │         │     event_name        │
│     updated_at       │         │     boxer_red         │
└──────────────────────┘         │     boxer_blue        │
        │                        │     scheduled_date    │
        │                        │     total_rounds      │
        │ 1 ── * (judge)         │     status (enum)     │
        ▼                        │     created_by (FK)   │
┌──────────────────────┐         │     created_at        │
│  judge_assignments   │         │     updated_at        │
├──────────────────────┤         └──────────┬────────────┘
│ PK  id               │                    │
│     fight_id (FK)    │                    │ 1
│     judge_id (FK)    │                    │
│     status (enum)    │                    ▼
│     assigned_at      │         ┌──────────────────────┐
│     responded_at     │         │    score_cards        │       ┌──────────────────────┐
└──────────────────────┘         ├──────────────────────┤       │   official_cards      │
                                 │ PK  id               │       ├──────────────────────┤
┌──────────────────────┐         │     fight_id (FK)    │       │ PK  id               │
│    round_scores      │         │     judge_id (FK)    │       │     fight_id (FK)    │
├──────────────────────┤         │     status (enum)    │       │     card_number       │
│ PK  id               │         │     total_score_red  │       │     total_score_red  │
│     score_card_id(FK)│◄────────│     total_score_blue │       │     total_score_blue │
│     round_number     │  * ── 1 │     winner           │       │     winner           │
│     score_red        │         │     submitted_at     │       │     created_by (FK)  │
│     score_blue       │         └──────────────────────┘       │     created_at       │
└──────────────────────┘                                       └──────────┬───────────┘
                                                                          │ 1
┌──────────────────────┐         ┌──────────────────────┐                │
│ official_round_scores│         │  analysis_results    │                │
├──────────────────────┤         ├──────────────────────┤                ▼
│ PK  id               │         │ PK  id               │   ┌──────────────────────────┐
│     official_card_id │         │     fight_id (FK)    │   │  official_round_scores    │
│     round_number     │         │     judge_id (FK)    │   ├──────────────────────────┤
│     score_red        │         │     official_card    │   │  PK  id                  │
│     score_blue       │         │     _id (FK)         │   │      official_card_id(FK)│
└──────────────────────┘         │     total_rounds     │   │      round_number        │
                                 │     matches          │   │      score_red           │
                                 │     errors           │   │      score_blue          │
                                 │     match_pct        │   └──────────────────────────┘
                                 │     created_at       │
                                 └──────────────────────┘
```

---

## 2. Explicación de cada tabla

### 2.1 `users` — Usuarios del sistema

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `name` | VARCHAR(150) | Nombre completo |
| `email` | VARCHAR(255) UNIQUE | Email de acceso |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |
| `role` | `user_role` (ENUM) | `admin`, `supervisor` o `judge` |
| `is_active` | BOOLEAN | Permite desactivar sin eliminar |
| `created_at` | TIMESTAMPTZ | Fecha de registro |
| `updated_at` | TIMESTAMPTZ | Última modificación |

**Reglas de negocio:**
- Un `judge` no puede crear peleas ni cargar tarjetas oficiales.
- Un `supervisor` no puede puntuar peleas (solo crear y administrar).
- Un `admin` tiene todos los privilegios.
- `is_active = FALSE` impide el login pero preserva el historial.

### 2.2 `fights` — Peleas

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `event_name` | VARCHAR(255) | Nombre del evento (ej: "Velada del Año") |
| `boxer_red` | VARCHAR(150) | Nombre del boxeador en esquina roja |
| `boxer_blue` | VARCHAR(150) | Nombre del boxeador en esquina azul |
| `scheduled_date` | DATE | Fecha programada |
| `total_rounds` | SMALLINT | Cantidad de rounds (4, 6, 8, 10, 12) |
| `status` | `fight_status` (ENUM) | `pending`, `active`, `completed`, `cancelled` |
| `created_by` | INTEGER FK → `users.id` | Supervisor que creó la pelea |
| `created_at` / `updated_at` | TIMESTAMPTZ | Control de cambios |

**Reglas:**
- `total_rounds` está limitado a 4, 6, 8, 10, 12 vía CHECK.
- `scheduled_date >= CURRENT_DATE` evita fechas pasadas al crear.
- `boxer_red <> boxer_blue` evita mismo boxeador en ambas esquinas.
- `created_by` debe ser `admin` o `supervisor`.

### 2.3 `judge_assignments` — Asignación de jueces a peleas

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `fight_id` | INTEGER FK → `fights.id` | Pelea asignada |
| `judge_id` | INTEGER FK → `users.id` | Juez asignado |
| `status` | `assignment_status` (ENUM) | `pending`, `confirmed`, `rejected` |
| `assigned_at` | TIMESTAMPTZ | Cuándo se asignó |
| `responded_at` | TIMESTAMPTZ | Cuándo respondió el juez |

**Reglas:**
- `UNIQUE (fight_id, judge_id)` — un juez no puede asignarse dos veces a la misma pelea.
- CHECK: si `status = pending`, `responded_at` debe ser NULL; si `confirmed` o `rejected`, debe tener fecha.
- `judge_id` debe referenciar un usuario con `role = 'judge'`.

### 2.4 `score_cards` — Tarjetas de puntuación de jueces

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `fight_id` | INTEGER FK → `fights.id` | Pelea |
| `judge_id` | INTEGER FK → `users.id` | Juez |
| `status` | `card_status` (ENUM) | `draft` o `finalized` |
| `total_score_red` | SMALLINT | Suma total del boxeador rojo |
| `total_score_blue` | SMALLINT | Suma total del boxeador azul |
| `winner` | VARCHAR(150) | Nombre del ganador según el juez |
| `submitted_at` | TIMESTAMPTZ | Momento de finalización |

**Reglas:**
- `UNIQUE (fight_id, judge_id)` — un juez solo puede tener **una** tarjeta por pelea.
- CHECK: si `draft`, `submitted_at` debe ser NULL; si `finalized`, debe tener fecha.
- Los totales se actualizan automáticamente vía **trigger** al insertar/modificar `round_scores`.

### 2.5 `round_scores` — Puntuaciones por asalto (juez)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `score_card_id` | INTEGER FK → `score_cards.id` | Tarjeta padre |
| `round_number` | SMALLINT (1-12) | Número de asalto |
| `score_red` | SMALLINT (1-10) | Puntuación boxeador rojo |
| `score_blue` | SMALLINT (1-10) | Puntuación boxeador azul |

**Reglas:**
- `UNIQUE (score_card_id, round_number)` — un round no puede duplicarse dentro de la misma tarjeta.
- `score_red` y `score_blue` entre 1 y 10 (escala obligatoria de boxeo).
- `round_number` entre 1 y 12.

### 2.6 `official_cards` — Tarjetas oficiales (carga el supervisor)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `fight_id` | INTEGER FK → `fights.id` | Pelea |
| `card_number` | SMALLINT (1-3) | Nº de tarjeta oficial |
| `total_score_red` | SMALLINT | Suma rojo |
| `total_score_blue` | SMALLINT | Suma azul |
| `winner` | VARCHAR(150) | Ganador oficial según esta tarjeta |
| `created_by` | INTEGER FK → `users.id` | Supervisor que la cargó |
| `created_at` | TIMESTAMPTZ | Fecha de carga |

**Reglas:**
- `UNIQUE (fight_id, card_number)` — por pelea solo pueden existir 3 tarjetas (1, 2, 3).
- CHECK: `card_number BETWEEN 1 AND 3`.
- `created_by` debe ser `admin` o `supervisor`.
- Los totales se actualizan automáticamente vía **trigger**.

### 2.7 `official_round_scores` — Puntuaciones por asalto (oficial)

Misma estructura que `round_scores` pero vinculada a `official_cards`.

### 2.8 `analysis_results` — Resultados del análisis

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Identificador único |
| `fight_id` | INTEGER FK → `fights.id` | Pelea analizada |
| `judge_id` | INTEGER FK → `users.id` | Juez evaluado |
| `official_card_id` | INTEGER FK → `official_cards.id` | Tarjeta oficial de referencia |
| `total_rounds` | SMALLINT | Rounds comparados |
| `matches` | SMALLINT | Rounds donde coincidió exactamente |
| `errors` | SMALLINT | Rounds donde hubo diferencia |
| `match_pct` | NUMERIC(5,2) | Porcentaje de acierto (0.00-100.00) |
| `created_at` | TIMESTAMPTZ | Momento del análisis |

**Reglas:**
- `UNIQUE (fight_id, judge_id, official_card_id)` — una comparación por triplete.
- CHECK: `matches + errors = total_rounds`.
- `match_pct` entre 0 y 100.

### 2.9 Vistas

**`v_judge_performance`**: Rendimiento consolidado de cada juez por pelea (promedio contra las 3 tarjetas oficiales). Incluye ranking.

**`v_fight_summary`**: Resumen ejecutivo de cada pelea con cantidad de jueces confirmados, tarjetas recibidas y estado del análisis.

### 2.10 Función `fn_calculate_analysis`

Procedimiento almacenado que:
1. Limpia los resultados previos de la pelea.
2. Compara **cada tarjeta de juez finalizada** contra **cada tarjeta oficial**, round por round.
3. Si la puntuación del juez en un round coincide exactamente con la oficial (rojo y azul), cuenta como **match**; si no, como **error**.
4. Calcula el porcentaje y almacena en `analysis_results`.

---

## 3. Resumen de relaciones

| Relación | Tipo | Desde | Hacia |
|---|---|---|---|
| Creador de pelea | 1:N | `users` (admin/supervisor) | `fights` |
| Asignación juez-pelea | N:M | `fights` ↔ `users` (judge) | vía `judge_assignments` |
| Tarjeta de juez | 1:N | `users` (judge) → `score_cards` | |
| Tarjeta de juez por pelea | 1:N | `fights` → `score_cards` | |
| Rounds de tarjeta | 1:N | `score_cards` → `round_scores` | |
| Tarjetas oficiales | 1:N | `fights` → `official_cards` | |
| Rounds oficiales | 1:N | `official_cards` → `official_round_scores` | |
| Resultados de análisis | 1:N | `fights` → `analysis_results` | |
| | 1:N | `users` → `analysis_results` | |
| | 1:N | `official_cards` → `analysis_results` | |

---

## 4. Problemas potenciales detectados

### 4.1 Inconsistencia entre totales y suma de rounds
**Problema**: Si `total_score_red` = 100 pero la suma de `round_scores` da 98, hay corrupción de datos.
**Solución**: Triggers que actualizan automáticamente los totales al insertar/modificar/eliminar rounds. También podría agregarse una constraint CHECK que compare: `total_score_red = (SELECT SUM(score_red) FROM round_scores WHERE score_card_id = id)` — pero PostgreSQL no permite subconsultas en CHECK de la misma tabla. La alternativa es el trigger + validación en la capa de aplicación.

### 4.2 Juez con tarjeta draft y pelea finalizada
**Problema**: Una pelea puede marcarse como `completed` aunque jueces tengan tarjetas en `draft`.
**Solución**: Validar en la capa de aplicación que todos los jueces hayan finalizado antes de cerrar la pelea. Alternativa: trigger que impida cambiar a `completed` si existen `score_cards` con `status = 'draft'` para esa pelea.

### 4.3 Solo 3 tarjetas oficiales
**Problema**: La regla de "exactamente 3 tarjetas" se controla con `UNIQUE (fight_id, card_number)` pero no evita que falten tarjetas.
**Solución**: Validación en la capa de aplicación + la vista `v_fight_summary` muestra cuántas faltan.

### 4.4 Boxeadores como texto libre
**Problema**: `boxer_red` y `boxer_blue` son VARCHAR. Si un boxeador participa en múltiples peleas, su nombre podría escribirse distinto.
**Solución**: Para crecimiento futuro, crear una tabla `boxers` independiente y referenciarla desde `fights`.

---

## 5. Mejoras propuestas

### 5.1 Inmediatas (fáciles de implementar)
- [ ] Agregar columna `notes` (TEXT) a `fights` para observaciones.
- [ ] Agregar columna `timezone` a `fights` para eventos internacionales.
- [ ] Agregar `weight_class` (VARCHAR) a `fights` para la categoría de peso.

### 5.2 A mediano plazo
- [ ] Crear tabla `boxers` para normalizar peleadores y permitir historial por boxeador.
- [ ] Agregar `audit_log` para registrar todas las acciones importantes (creación, asignación, finalización).
- [ ] Implementar `versioning` en `official_cards` por si el supervisor corrige una tarjeta.

### 5.3 A largo plazo
- [ ] Tabla `events` agrupando múltiples peleas en un mismo evento (ej: "Velada del Año" con 8 peleas).
- [ ] Tabla `sanctions` para registrar suspensiones o amonestaciones a jueces.
- [ ] Internacionalización: soporte para múltiples idiomas en comentarios y notas.
- [ ] Soft deletes generalizados con `deleted_at` en todas las tablas.

---

## 6. Índices creados

| Índice | Tabla | Propósito |
|---|---|---|
| `idx_users_role` | users | Filtrar por rol rápido |
| `idx_users_active` | users | Solo usuarios activos (índice parcial) |
| `idx_fights_status` | fights | Consultas por estado |
| `idx_fights_date` | fights | Ordenar/agrupar por fecha |
| `idx_fights_creator` | fights | Buscar peleas de un supervisor |
| `idx_assign_fight` | judge_assignments | Asignaciones de una pelea |
| `idx_assign_judge` | judge_assignments | Asignaciones de un juez |
| `idx_assign_status` | judge_assignments | Filtrar por estado |
| `idx_score_fight` | score_cards | Tarjetas de una pelea |
| `idx_score_judge` | score_cards | Tarjetas de un juez |
| `idx_round_score_card` | round_scores | Rounds de una tarjeta |
| `idx_official_fight` | official_cards | Oficiales de una pelea |
| `idx_official_creator` | official_cards | Quién las cargó |
| `idx_official_round_card` | official_round_scores | Rounds de una oficial |
| `idx_analysis_fight` | analysis_results | Resultados de una pelea |
| `idx_analysis_judge` | analysis_results | Resultados de un juez |

---

## 7. Convenciones y buenas prácticas aplicadas

- **Naming**: `snake_case` para tablas, columnas y objetos de base de datos.
- **Timestamps**: `TIMESTAMPTZ` (con zona horaria) para evitar problemas de huso.
- **Soft logic**: `is_active` en vez de DELETE; `status` con ENUMs en vez de flags booleanas.
- **Integridad referencial**: `ON DELETE CASCADE` para datos dependientes (rounds → tarjeta padre); `ON DELETE RESTRICT` para entidades críticas (usuarios).
- **Documentación**: `COMMENT ON` en todas las tablas y columnas clave.
- **Versiones**: `updated_at` con trigger automático para tracking de cambios.
- **Seguridad**: `password_hash` con VARCHAR(255) para soportar bcrypt; `role` como ENUM para control de acceso.
- **Normalización**: 3FN. Ninguna tabla tiene dependencias transitivas. Las repeticiones controladas (card_number, round_number) tienen constraints CHECK.
