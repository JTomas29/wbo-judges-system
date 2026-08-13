import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import RankingTabs from '../../components/ranking/RankingTabs';
import JudgeRankingView from './JudgeRankingView';
import RefereeRankingView from './RefereeRankingView';

const JudgeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="m20.01 18.51l-4.95-4.95m0 0l-3.54 3.54c-.78.78-2.05.78-2.83 0l-4.24-4.24c-.78-.78-.78-2.05 0-2.83l7.07-7.07c.78-.78 2.05-.78 2.83 0l4.24 4.24c.78.78.78 2.05 0 2.83zM2 21h6M6.56 7.92l7.07 7.07" />
  </svg>
);

const RefereeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 20a1 1 0 1 0 2 0zm5-6a1 1 0 1 0 0 2zm1 2a1 1 0 1 0 0-2zm-1-5l-.447.894a1 1 0 0 0 1.437-.753zm-8 0l-.99.141a1 1 0 0 0 1.437.753zm.78-7.625a1 1 0 0 0-1.56 1.25L8 4zm8 1.25a1 1 0 1 0-1.56-1.25L16 4zm-9.617.516l-.99.142zm9.674 0L15.847 5zM20 9.561h-1V18h2V9.562zM18 20v-1H6v2h12zM4 18h1V9.562H3V18zM5.515 7.621l.242.97l1.986-.496l-.243-.97l-.243-.97l-1.985.496zM16.5 7.125l-.242.97l1.985.496l.242-.97l.243-.97l-1.986-.496zM12 9h-1v11h2V9zm4 6v1h1v-2h-1zM8.153 4v1h7.694V3H8.153zm8.684 1.141L15.847 5l-.837 5.859L16 11l.99.141l.837-5.858zM16 11l.447-.894l-4-2L12 9l-.447.894l4 2zm-4-2l-.447-.894l-4 2L8 11l.447.894l4-2zm-4 2l.99-.141L8.153 5l-.99.141l-.99.142l.837 5.858zm4-2l.78-.625l-4-5L8 4l-.78.625l4 5zm0 0l.78.625l4-5L16 4l-.78-.625l-4 5zm-8 .562h1a1 1 0 0 1 .757-.97l-.242-.97l-.243-.97A3 3 0 0 0 3 9.561zM6 20v-1a1 1 0 0 1-1-1H3a3 3 0 0 0 3 3zm14-2h-1a1 1 0 0 1-1 1v2a3 3 0 0 0 3-3zM8.153 4V3a2 2 0 0 0-1.98 2.283l.99-.142l.99-.141zm7.694 0v1l.99.141l.99.142A2 2 0 0 0 15.847 3zM20 9.562h1a3 3 0 0 0-2.272-2.91l-.243.97l-.242.97a1 1 0 0 1 .757.97z" />
  </svg>
);

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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Ranking</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
              Performance of the system's judges and referees
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
