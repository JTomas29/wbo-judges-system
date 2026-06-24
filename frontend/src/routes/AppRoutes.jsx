import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import FightList from '../pages/fights/FightList';
import CreateFight from '../pages/fights/CreateFight';
import FightDetails from '../pages/fights/FightDetails';
import JudgeList from '../pages/judges/JudgeList';
import AssignJudges from '../pages/judges/AssignJudges';
import Confirmation from '../pages/judges/Confirmation';
import ScoreFight from '../pages/scoring/ScoreFight';
import LiveScore from '../pages/scoring/LiveScore';
import OfficialCards from '../pages/official-cards/OfficialCards';
import FightAnalysis from '../pages/analysis/FightAnalysis';
import Statistics from '../pages/analysis/Statistics';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

    <Route path="/fights" element={<ProtectedRoute><FightList /></ProtectedRoute>} />
    <Route path="/fights/create" element={<ProtectedRoute><CreateFight /></ProtectedRoute>} />
    <Route path="/fights/:id" element={<ProtectedRoute><FightDetails /></ProtectedRoute>} />

    <Route path="/judges" element={<ProtectedRoute><JudgeList /></ProtectedRoute>} />
    <Route path="/judges/assign/:fightId" element={<ProtectedRoute><AssignJudges /></ProtectedRoute>} />
    <Route path="/judges/confirmation/:fightId" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />

    <Route path="/scoring/:fightId" element={<ProtectedRoute><ScoreFight /></ProtectedRoute>} />
    <Route path="/scoring/live/:fightId" element={<ProtectedRoute><LiveScore /></ProtectedRoute>} />

    <Route path="/official-cards/:fightId" element={<ProtectedRoute><OfficialCards /></ProtectedRoute>} />

    <Route path="/analysis/:fightId" element={<ProtectedRoute><FightAnalysis /></ProtectedRoute>} />
    <Route path="/analysis/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;
