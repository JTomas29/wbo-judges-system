/**
 * AppRoutes.jsx — Tabla de rutas de la SPA.
 *
 * Usa React Router v6 con code-splitting: cada página se importa de forma
 * perezosa (lazy) y se muestra un spinner mientras se descarga su bundle.
 *
 * Guards de ruta (envuelven la página según el rol):
 *   - ProtectedRoute  : exige token JWT. Sin sesión → redirige a /login.
 *   - SupervisorRoute : exige sesión y rol 'admin' o 'supervisor'.
 *                       Sin sesión → /login; rol inferior → /dashboard.
 *   - AdminRoute      : exige sesión y rol 'admin'.
 *                       Sin sesión → /login; rol inferior → /dashboard.
 */

// lazy: carga diferida de componentes; Suspense: fallback mientras se resuelve el import dinámico.
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// useAuth: acceso al estado de sesión (token, user, loading) para los guards de ruta.
import { useAuth } from '../context/AuthContext';

// Carga perezosa de páginas: verbo lazy(() => import(...)) impide que se
// prefieran al inicio; el bundle de cada página se pide al navegar a su ruta.
const Login = lazy(() => import('../pages/auth/Login'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const FightList = lazy(() => import('../pages/fights/FightList'));
const CreateFight = lazy(() => import('../pages/fights/CreateFight'));
const EditFight = lazy(() => import('../pages/fights/EditFight'));
const FightDetails = lazy(() => import('../pages/fights/FightDetails'));
const JudgeList = lazy(() => import('../pages/judges/JudgeList'));
const EditJudge = lazy(() => import('../pages/judges/EditJudge'));
const AssignJudges = lazy(() => import('../pages/judges/AssignJudges'));
const JudgeProfile = lazy(() => import('../pages/judges/JudgeProfile'));
const JudgeAssignments = lazy(() => import('../pages/judges/JudgeAssignments'));
const ScoreFight = lazy(() => import('../pages/scoring/ScoreFight'));
const LiveScore = lazy(() => import('../pages/scoring/LiveScore'));
const OfficialCards = lazy(() => import('../pages/official-cards/OfficialCards'));
const OfficialJudgeCards = lazy(() => import('../pages/official-judge-cards/OfficialJudgeCards'));
const FightAnalysis = lazy(() => import('../pages/analysis/FightAnalysis'));
const Ranking = lazy(() => import('../pages/ranking/Ranking'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const History = lazy(() => import('../pages/history/History'));
const RefereeList = lazy(() => import('../pages/referees/RefereeList'));
const RefereeProfile = lazy(() => import('../pages/referees/RefereeProfile'));

// Spinner de carga usado como fallback de <Suspense> y mientras AuthContext valida la sesión.
const RouteFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-[3px] border-wbo-700 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Loading...</p>
    </div>
  </div>
);

// Guard genérico: solo comprueba existencia de token (NO valida rol).
// Cualquier usuario autenticado (admin, supervisor o juez) puede pasar.
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

// Guard para roles elevados (admin/supervisor). A diferencia de ProtectedRoute,
// espera a que termine la carga de sesión (loading) para no decidir antes de
// conocer el rol; usa "replace" para que el botón "atrás" no vuelva a la ruta rechazada.
const SupervisorRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  // Mientras se restaura la sesión (llamada a /auth/me) mostrar spinner.
  if (loading) {
    return <RouteFallback />;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'supervisor') return <Navigate to="/dashboard" replace />;

  return children;
};

// Guard estricto de administración: solo rol 'admin'. Un supervisor que intente
// entrar es redirigido al dashboard, su área permitida.
const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

// Declaración de rutas. Nota: Suspense envuelve a <Routes> para cubrir el
// lazy-loading de cualquier página hija en cualquier ruta.
const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Ruta pública de acceso; sin guard. */}
      <Route path="/login" element={<Login />} />

      {/* Inicio: cualquier usuario autenticado. */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Gestión de peleas (listado, alta, edición y detalle): cualquier sesión activa. */}
      <Route path="/fights" element={<ProtectedRoute><FightList /></ProtectedRoute>} />
      <Route path="/fights/create" element={<ProtectedRoute><CreateFight /></ProtectedRoute>} />
      <Route path="/fights/:id/edit" element={<ProtectedRoute><EditFight /></ProtectedRoute>} />
      <Route path="/fights/:id" element={<ProtectedRoute><FightDetails /></ProtectedRoute>} />

      {/* Jueces: listado y asignaciones para todos; edición y perfil solo según rol (editar = admin). */}
      <Route path="/judges" element={<ProtectedRoute><JudgeList /></ProtectedRoute>} />
      <Route path="/judges/assignments" element={<ProtectedRoute><JudgeAssignments /></ProtectedRoute>} />
      <Route path="/judges/:id/edit" element={<AdminRoute><EditJudge /></AdminRoute>} />
      <Route path="/judges/assign/:fightId" element={<ProtectedRoute><AssignJudges /></ProtectedRoute>} />
      <Route path="/judges/:judgeId/profile" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />

      {/* Puntuación en vivo de una pelea: cualquiera autenticado (juez puntúa su pelea). */}
      <Route path="/scoring/:fightId" element={<ProtectedRoute><ScoreFight /></ProtectedRoute>} />
      <Route path="/scoring/live/:fightId" element={<ProtectedRoute><LiveScore /></ProtectedRoute>} />

      {/* Tarjetas: oficial accesible para todos; revisión de tarjetas oficiales de jueces solo admin/supervisor. */}
      <Route path="/official-cards/:fightId" element={<ProtectedRoute><OfficialCards /></ProtectedRoute>} />
      <Route path="/official-judge-cards/:fightId" element={<SupervisorRoute><OfficialJudgeCards /></SupervisorRoute>} />

      {/* Análisis de pelea: cualquiera autenticado. /analysis/statistics es una redirección a /ranking. */}
      <Route path="/analysis/:fightId" element={<ProtectedRoute><FightAnalysis /></ProtectedRoute>} />
      <Route path="/analysis/statistics" element={<Navigate to="/ranking?tab=jueces" replace />} />

      {/* Ranking: cualquier sesión activa. */}
      <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />

      {/* Administración: gestión de usuarios y árbitros solo admin. */}
      <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
      <Route path="/admin/referees" element={<AdminRoute><RefereeList /></AdminRoute>} />
      <Route path="/referees/ranking" element={<Navigate to="/ranking?tab=arbitros" replace />} />
      {/* Perfil de árbitro: solo admin/supervisor (información sensible). */}
      <Route path="/referees/:id/profile" element={<SupervisorRoute><RefereeProfile /></SupervisorRoute>} />

      {/* Historial de peleas: solo admin. */}
      <Route path="/history" element={<AdminRoute><History /></AdminRoute>} />

      {/* Comodín: cualquier URL desconocida cae al dashboard. */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
