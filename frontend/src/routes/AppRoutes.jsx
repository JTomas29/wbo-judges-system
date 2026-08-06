import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

const RouteFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-[3px] border-wbo-700 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const SupervisorRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'supervisor') return <Navigate to="/dashboard" replace />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="/fights" element={<ProtectedRoute><FightList /></ProtectedRoute>} />
      <Route path="/fights/create" element={<ProtectedRoute><CreateFight /></ProtectedRoute>} />
      <Route path="/fights/:id/edit" element={<ProtectedRoute><EditFight /></ProtectedRoute>} />
      <Route path="/fights/:id" element={<ProtectedRoute><FightDetails /></ProtectedRoute>} />

      <Route path="/judges" element={<ProtectedRoute><JudgeList /></ProtectedRoute>} />
      <Route path="/judges/assignments" element={<ProtectedRoute><JudgeAssignments /></ProtectedRoute>} />
      <Route path="/judges/:id/edit" element={<AdminRoute><EditJudge /></AdminRoute>} />
      <Route path="/judges/assign/:fightId" element={<ProtectedRoute><AssignJudges /></ProtectedRoute>} />
      <Route path="/judges/:judgeId/profile" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />

      <Route path="/scoring/:fightId" element={<ProtectedRoute><ScoreFight /></ProtectedRoute>} />
      <Route path="/scoring/live/:fightId" element={<ProtectedRoute><LiveScore /></ProtectedRoute>} />

      <Route path="/official-cards/:fightId" element={<ProtectedRoute><OfficialCards /></ProtectedRoute>} />
      <Route path="/official-judge-cards/:fightId" element={<SupervisorRoute><OfficialJudgeCards /></SupervisorRoute>} />

      <Route path="/analysis/:fightId" element={<ProtectedRoute><FightAnalysis /></ProtectedRoute>} />
      <Route path="/analysis/statistics" element={<Navigate to="/ranking?tab=jueces" replace />} />

      <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />

      <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
      <Route path="/admin/referees" element={<AdminRoute><RefereeList /></AdminRoute>} />
      <Route path="/referees/ranking" element={<Navigate to="/ranking?tab=arbitros" replace />} />
      <Route path="/referees/:id/profile" element={<SupervisorRoute><RefereeProfile /></SupervisorRoute>} />

      <Route path="/history" element={<AdminRoute><History /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
