import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import RankingTabs from '../../components/ranking/RankingTabs';
import JudgeRankingView from './JudgeRankingView';
import RefereeRankingView from './RefereeRankingView';

const JudgeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const RefereeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Ranking = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewReferees = user?.role === 'admin' || user?.role === 'supervisor';
  const tabs = [
    { id: 'jueces', label: 'Jueces', icon: <JudgeIcon /> },
    ...(canViewReferees ? [{ id: 'arbitros', label: 'Árbitros', icon: <RefereeIcon /> }] : []),
  ];

  const requested = searchParams.get('tab');
  const activeTab = tabs.some((t) => t.id === requested) ? requested : 'jueces';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      <div className="max-w-[1440px] mx-auto space-y-6">

        <div className="mb-2">
          <BackButton fallbackRoute="/dashboard" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Ranking</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
              Rendimiento de jueces y árbitros del sistema
            </p>
          </div>
          <RankingTabs tabs={tabs} active={activeTab} onChange={handleTabChange} />
        </div>

        {/* Active view */}
        {activeTab === 'arbitros' && canViewReferees ? (
          <RefereeRankingView />
        ) : (
          <JudgeRankingView />
        )}
      </div>
    </div>
  );
};

export default Ranking;
