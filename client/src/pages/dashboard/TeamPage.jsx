import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Filter, Download, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import TeamTree from '../../components/dashboard/TeamTree';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';

// Demo data
const demoTeamStats = {
  directPartners: 5,
  totalTeam: 12,
  activePartners: 9,
  inactivePartners: 3
};

const demoTeamTree = [
  {
    id: 1,
    firstName: 'Max',
    lastName: 'Mustermann',
    rank: 'Berater',
    isActive: true,
    totalSales: 23,
    directPartners: 2,
    teamSize: 4,
    children: [
      {
        id: 2,
        firstName: 'Anna',
        lastName: 'Schmidt',
        rank: 'Starter',
        isActive: true,
        totalSales: 8,
        directPartners: 1,
        teamSize: 1,
        children: [
          { id: 5, firstName: 'Lisa', lastName: 'Weber', rank: 'Starter', isActive: false, totalSales: 2, children: [] }
        ]
      },
      {
        id: 3,
        firstName: 'Peter',
        lastName: 'Müller',
        rank: 'Starter',
        isActive: true,
        totalSales: 5,
        children: []
      }
    ]
  },
  {
    id: 4,
    firstName: 'Sarah',
    lastName: 'Koch',
    rank: 'Senior Berater',
    isActive: true,
    totalSales: 34,
    directPartners: 3,
    teamSize: 5,
    children: []
  }
];

const TeamPage = () => {
  const { t } = useLanguage();
  const [teamStats, setTeamStats] = useState(demoTeamStats);
  const [teamTree, setTeamTree] = useState(demoTeamTree);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'list'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            {t('dashboard.menu.team')}
          </h1>
          <p className="text-gray-600">Verwalten Sie Ihr Vertriebsteam</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Team exportieren
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.teamTree.directPartners')}
          value={teamStats.directPartners}
          icon={UserPlus}
          color="primary"
          index={0}
        />
        <StatCard
          title={t('dashboard.teamTree.totalTeam')}
          value={teamStats.totalTeam}
          icon={Users}
          color="info"
          index={1}
        />
        <StatCard
          title={t('dashboard.teamTree.active')}
          value={teamStats.activePartners}
          icon={Users}
          color="success"
          index={2}
        />
        <StatCard
          title={t('dashboard.teamTree.inactive')}
          value={teamStats.inactivePartners}
          icon={Users}
          color="warning"
          index={3}
        />
      </div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Partner suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Baumansicht
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Listenansicht
            </button>
          </div>
        </div>
      </motion.div>

      {/* Team Tree */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <h3 className="font-heading font-semibold text-lg text-gray-900 mb-6">
          {t('dashboard.teamTree.title')}
        </h3>
        <TeamTree data={teamTree} isLoading={isLoading} />
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-teal-50 rounded-2xl p-6 border border-teal-100"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-900 mb-1">Tipp zum Teamaufbau</h3>
            <p className="text-teal-700 text-sm">
              Teilen Sie Ihren Empfehlungslink mit potenziellen Partnern. 
              Je aktiver Ihr Team ist, desto mehr Differenzprovisionen können Sie verdienen!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeamPage;