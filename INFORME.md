# WBO Judges Evaluation System — Informe para revisión

## 1. Qué es el sistema

Plataforma web para la **gestión y evaluación del desempeño de jueces y árbitros de boxeo WBO**. Permite crear peleas, asignar jueces, cargar tarjetas de puntuación en vivo, registrar resultados oficiales, evaluar árbitros, calcular rankings automáticos, analizar la consistencia entre jueces y exportar **informes PDF** por perfil. Incluye perfiles por rol (admin, supervisor, juez, árbitro) y **notificaciones**.

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite + Tailwind, SPA + PWA)      │
│  frontend/  → dist/  (build estático)               │
└──────────────────────┬──────────────────────────────┘
                       │ /api/* (misma URL, servido por Express)
┌──────────────────────▼──────────────────────────────┐
│  BACKEND (Node.js + Express) → src/server.js :4000  │
│  app.js monta routers por dominio bajo /api         │
└──────────────────────┬──────────────────────────────┘
                       │  pool (pg)
┌──────────────────────▼──────────────────────────────┐
│  PostgreSQL  → BD "wbo_judges" (localhost:5432)     │
│  + funciones PL/pgSQL (consistencia, análisis)      │
└─────────────────────────────────────────────────────┘
```

En producción **Express sirve el build del frontend y la API en una sola URL** (espíritu "single-URL" para ngrok). La SPA usa React Router con code-splitting (`lazy`), por lo que el backend tiene fallback a `index.html` para rutas no-API.

## 3. Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| **Frontend framework** | React (con JSX, hooks, Context) | ^19.2 |
| **Build** | Vite + `@vitejs/plugin-react` | ^8.1 |
| **Ruteo** | React Router DOM | ^7.18 |
| **Estilos** | Tailwind CSS (modo dark incluido) | ^3.4 |
| **Íconos** | Heroicons | ^2.2 |
| **HTTP cliente** | Axios (interceptor JWT) | ^1.18 |
| **Lint frontend** | oxlint | ^1.69 |
| **PWA/offline** | vite-plugin-pwa (Service Worker + Workbox: caché de API e imágenes) | ^1.3 |
| **Backend** | Node.js + Express | Node 22 / Express ^4.21 |
| **BD** | PostgreSQL (pool `pg`) | pg ^8.22 |
| **Auth** | JSON Web Token (`jsonwebtoken`) + bcryptjs (hash) | ^9.0 / ^2.4 |
| **PDF** | PDFKit | ^0.20 |
| **Variables de entorno** | dotenv | ^16.4 |
| **CORS** | cors | ^2.8 |

**Infra local:** backend en `:4000`, PostgreSQL en `localhost:5432` (BD `wbo_judges`, user/pass `postgres`/`postgres`). JWT expira a las 8h.

## 4. Base de datos

19 migraciones SQL evolutivas (`backend/database/migration_0*.sql`), aplicadas por `setup_db.sh`. Modelo principal (`schema.sql`):

- **users** (admin / supervisor / judge, `level`: junior/senior/elite)
- **fights** (peleas; rounds 4/6/8/10/12; estado pending→active→completed→analyzed/cancelled; result_type, referee asignado)
- **judge_assignments** (M:N juez↔pelea; pending/confirmed/rejected; tipo evaluation/official)
- **score_cards** + **round_scores** (tarjetas de los jueces por asalto)
- **official_cards** + **official_round_scores** (tarjeta oficial del supervisor)
- **official_judge_cards** + **official_judge_round_scores** (tarjetas oficiales por juez)
- **analysis_results** (métricas de precisión por pelea: `match_pct`, matches, errors)
- **judge_consistency** (consistencia entre pares de jueces, calculada por función PL/pgSQL)
- **notifications** (con deduplicación y vencimiento)
- **referees** + **referee_evaluations** (árbitros y sus evaluaciones con descuentos → `final_score`)
- **profile_observations** (observaciones/notas por perfil de juez o árbitro)
- **Vistas**: `v_judge_history`, `v_judge_performance`, `v_fight_summary`

El **ranking** de jueces y árbitros se calcula con CTEs/agregaciones sobre estas tablas (posición = conteo de promedios superiores).

## 5. Roles y seguridad

- **Requests autenticados con JWT** (`Authorization: Bearer`); el frontend lo inyecta vía interceptor de axios y persiste en `localStorage` (`wbo_token`/`wbo_user`).
- **Guards de ruta** en frontend: `ProtectedRoute` (cualquiera logueado), `SupervisorRoute` (admin/supervisor), `AdminRoute` (solo admin).
- **roleMiddleware** en backend restringe rutas por rol.
- **Manejo central de errores** (`errorMiddleware`) y respuestas normativas (404/409 por FK, etc.).
- Contraseñas hasheadas con bcrypt (10 salt rounds).

## 6. Funcionalidades principales

| Módulo | Qué hace |
|---|---|
| **Dashboard** | KPIs globales (admin/supervisor) + panel propio del juez (sus peleas, puntuar, ver análisis) |
| **Peleas** | CRUD, activar, finalizar, resultado oficial (KO/TKO/RTD/DQ/NC/Decisión), reporte de resultado |
| **Asignaciones** | Designar jueces a peleas, el juez confirma/rechaza |
| **Puntuación en vivo** | Tarjeta del juez por asalto (puntos, descuentos), finalización; vista en vivo del supervisor |
| **Tarjetas oficiales** | El supervisor carga la tarjeta oficial; tarjetas oficiales por juez |
| **Análisis** | Comparación tarjeta de cada juez vs oficial → accuracy/matches/errors por pelea |
| **Rankings** | Ranking de jueces (por consistency/accuracy) y de árbitros (por score final) |
| **Árbitros** | CRUD + evaluación por pelea con descuento de puntos + ranking |
| **Perfiles + PDF** | Perfil de juez/árbitro con observaciones y **Export PDF**: informe con header/footer institucional (logo WBO), sección RESUMEN GENERAL con gráficos (gauge de rendimiento, tendencia, barras por pelea), sección DETALLE (identificación, historial, observaciones con rendimiento) |
| **Usuarios/admin** | Alta/baja de usuarios, roles, activación |
| **Notificaciones** | Centro de notificaciones, no-leídas, lectura individual/total |
| **Historial** | Historial de peleas con filtros |
| **PWA** | Instalable, offline (`/offline.html`), caché de API NetworkFirst y de imágenes CacheFirst |

## 7. Trabajo realizado en las sesiones recientes

1. **Rediseño del PDF** (pdfkit): header institucional repetido en todas las páginas + footer vía evento `pageAdded` (se corrigió bug de página extra/stack overflow), renderizado de observaciones con flujo natural y sin texto sobreescrito (pre-cálculo de alturas), y ahora con **gráficos dibujados con pdfkit** (gauge, tendencia, barras).
2. **Tabla + CRUD de observaciones** de perfiles (`migration_020`, controller, rutas, modelo `ProfileObservation.getForPdf`).
3. **Documentación completa del código**: ~20.400 líneas comentadas en español (backend + frontend, archivo por archivo).
4. **Limpieza de código muerto**: se eliminaron archivos sin importar, handlers-stub (`/api/scores`, `/api/analysis/*`), métodos de modelo y funciones de servicio sin uso. Se verificó que **no hay rutas rotas** entre frontend y backend.
5. **Estado actual**: backend corriendo en `:4000` y funcionando (login OK, PDF genera). Hay **~130 archivos modificados sin commitear** (documentación + limpieza).

## 8. Cómo levantar el proyecto

```bash
# Backend
cd backend && npm install && npm start      # sirve API + frontend/dist en :4000

# Frontend (solo dev)
cd frontend && npm install && npm run dev   # Vite dev server
npm run build                               # genera frontend/dist (PWA incluida)
```

Credenciales demo: `admin@wbo.com`/`admin123` · `supervisor@wbo.com`/`super123` · jueces `juez123`.

## 9. Posibles preguntas de la revisión (y cómo responder)

- **¿Qué medís de un juez?** Su accuracy por pelea (cuántos rounds coinciden con la tarjeta oficial), consistencia entre pares de jueces, y errores.
- **¿Por qué pdfkit en vez de un servicio de charts?** Generación offline, sin dependencias externas ni costo; los gráficos se dibujan como vectores con las primitivas del PDF.
- **¿Arquitectura desplegada?** Monolito: Express sirve frontend estático + API, una sola URL (amigable con ngrok/hosting free). BD PostgreSQL.
- **¿Seguridad?** JWT + bcrypt, control por rol tanto en rutas del backend como en guards del frontend.