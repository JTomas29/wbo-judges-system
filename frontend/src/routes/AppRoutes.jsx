import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import FightList from '../pages/fights/FightList';
import CreateFight from '../pages/fights/CreateFight';
import EditFight from '../pages/fights/EditFight';
import FightDetails from '../pages/fights/FightDetails';
import JudgeList from '../pages/judges/JudgeList';
import EditJudge from '../pages/judges/EditJudge';
import AssignJudges from '../pages/judges/AssignJudges';
import Confirmation from '../pages/judges/Confirmation';
import JudgeProfile from '../pages/judges/JudgeProfile';
import ScoreFight from '../pages/scoring/ScoreFight';
import LiveScore from '../pages/scoring/LiveScore';
import OfficialCards from '../pages/official-cards/OfficialCards';
import FightAnalysis from '../pages/analysis/FightAnalysis';
import Ranking from '../pages/ranking/Ranking';
import UserManagement from '../pages/admin/UserManagement';
import History from '../pages/history/History';
import RefereeList from '../pages/referees/RefereeList';
import RefereeProfile from '../pages/referees/RefereeProfile';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const SupervisorRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-wbo-700 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'supervisor') return <Navigate to="/dashboard" replace />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-wbo-700 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

    <Route path="/fights" element={<ProtectedRoute><FightList /></ProtectedRoute>} />
    <Route path="/fights/create" element={<ProtectedRoute><CreateFight /></ProtectedRoute>} />
    <Route path="/fights/:id/edit" element={<ProtectedRoute><EditFight /></ProtectedRoute>} />
    <Route path="/fights/:id" element={<ProtectedRoute><FightDetails /></ProtectedRoute>} />

    <Route path="/judges" element={<ProtectedRoute><JudgeList /></ProtectedRoute>} />
    <Route path="/judges/:id/edit" element={<AdminRoute><EditJudge /></AdminRoute>} />
    <Route path="/judges/assign/:fightId" element={<ProtectedRoute><AssignJudges /></ProtectedRoute>} />
    <Route path="/judges/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
    <Route path="/judges/:judgeId/profile" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />
    <Route path="/profile/:userId" element={<ProtectedRoute><JudgeProfile /></ProtectedRoute>} />

    <Route path="/scoring/:fightId" element={<ProtectedRoute><ScoreFight /></ProtectedRoute>} />
    <Route path="/scoring/live/:fightId" element={<ProtectedRoute><LiveScore /></ProtectedRoute>} />

    <Route path="/official-cards/:fightId" element={<ProtectedRoute><OfficialCards /></ProtectedRoute>} />

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
);

export default AppRoutes;
