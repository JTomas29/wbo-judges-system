import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import RankingTabs from '../../components/ranking/RankingTabs';
import JudgeRankingView from './JudgeRankingView';
import RefereeRankingView from './RefereeRankingView';
import { JudgeIcon, RefereeIcon } from '../../components/common/icons';

const Ranking = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewReferees = user?.role === 'admin' || user?.role === 'supervisor';
  const tabs = [
    { id: 'jueces', label: 'Judges', icon: <JudgeIcon /> },
    ...(canViewReferees ? [{ id: 'arbitros', label: 'Referees', icon: <RefereeIcon /> }] : []),
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
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-gold-light via-gold to-gold-dark text-white flex items-center justify-center shrink-0 shadow-lg shadow-gold/30 ring-1 ring-white/20">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Ranking</h1>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1.5 max-w-xl">
                Performance of the system's judges and referees
              </p>
            </div>
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
