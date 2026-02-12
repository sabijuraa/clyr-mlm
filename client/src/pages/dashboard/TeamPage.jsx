// client/src/pages/dashboard/TeamPage.jsx
// GROUP 6 #10: Build visual team hierarchy with real API data
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Download, Lightbulb, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { partnerAPI } from '../../services/api';
import TeamTree from '../../components/dashboard/TeamTree';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const TeamPage = () => {
  const { t } = useLanguage();
  const [teamStats, setTeamStats] = useState({ directPartners: 0, totalTeam: 0, activePartners: 0, inactivePartners: 0 });
  const [teamTree, setTeamTree] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tree');

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setIsLoading(true);
    try {
      // Load tree data
      const treeRes = await partnerAPI.getTeamTree(5).catch(() => null);
      if (treeRes?.data) {
        const tree = treeRes.data.tree || treeRes.data || [];
        setTeamTree(Array.isArray(tree) ? tree : []);
      }

      // Load flat list + stats
      const teamRes = await partnerAPI.getTeam().catch(() => null);
      if (teamRes?.data) {
        const data = teamRes.data;
        setTeamList(data.members || data.team || []);
        setTeamStats({
          directPartners: data.stats?.directPartners || data.directCount || 0,
          totalTeam: data.stats?.totalTeam || data.totalCount || (data.members || data.team || []).length,
          activePartners: data.stats?.activePartners || (data.members || data.team || []).filter(m => m.status === 'active' || m.isActive).length,
          inactivePartners: data.stats?.inactivePartners || (data.members || data.team || []).filter(m => m.status !== 'active' && !m.isActive).length,
        });
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tree based on search
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    return nodes.reduce((acc, node) => {
      const nameMatch = `${node.firstName || node.first_name || ''} ${node.lastName || node.last_name || ''}`
        .toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterTree(node.children || [], query);
      if (nameMatch || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(teamTree, searchQuery);

  // Filter list
  const filteredList = teamList.filter(m => {
    if (!searchQuery) return true;
    const name = `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">
            {t('dashboard.menu.team')}
          </h1>
          <p className="text-secondary-500">Verwalten Sie Ihr Vertriebsteam</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={loadTeamData}>
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.teamTree.directPartners') || 'Direkte Partner'} value={teamStats.directPartners} icon={UserPlus} color="primary" index={0} />
        <StatCard title={t('dashboard.teamTree.totalTeam') || 'Gesamt Team'} value={teamStats.totalTeam} icon={Users} color="info" index={1} />
        <StatCard title={t('dashboard.teamTree.active') || 'Aktive Partner'} value={teamStats.activePartners} icon={Users} color="success" index={2} />
        <StatCard title={t('dashboard.teamTree.inactive') || 'Inaktive Partner'} value={teamStats.inactivePartners} icon={Users} color="warning" index={3} />
      </div>

      {/* Search & View Toggle */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Partner suchen..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent" />
          </div>
          <div className="flex gap-2">
            {['tree', 'list'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  viewMode === mode ? 'bg-secondary-100 text-secondary-700' : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'
                }`}>
                {mode === 'tree' ? 'Baumansicht' : 'Listenansicht'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team Tree / List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">

        {viewMode === 'tree' ? (
          <>
            <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6">
              {t('dashboard.teamTree.title') || 'Team-Hierarchie'}
            </h3>
            <TeamTree data={filteredTree} isLoading={isLoading} />
          </>
        ) : (
          <>
            <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6">
              Team-Liste ({filteredList.length})
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (<div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />))}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-secondary-500">Noch keine Teammitglieder</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-secondary-500">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Rang</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Verkaeufe</th>
                      <th className="pb-3 font-medium text-right">Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredList.map((m, idx) => {
                      const name = `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`;
                      const isActive = m.status === 'active' || m.isActive;
                      return (
                        <tr key={m.id || idx} className="hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${isActive ? 'bg-secondary-700' : 'bg-gray-300'}`}>
                                {(m.firstName || m.first_name || '?')[0]}{(m.lastName || m.last_name || '?')[0]}
                              </div>
                              <div>
                                <p className="font-medium text-secondary-700">{name}</p>
                                <p className="text-xs text-gray-400">{m.email || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 bg-secondary-50 text-secondary-600 rounded-full text-xs font-medium">
                              {m.rank || m.rank_name || 'Starter'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isActive ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium text-secondary-700">{m.totalSales || m.own_sales_count || 0}</td>
                          <td className="py-3 text-right font-medium text-secondary-700">{m.teamSize || m.direct_partners_count || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Tip */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-slate-50 rounded-2xl p-6 border border-secondary-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-700 mb-1">Tipp zum Teamaufbau</h3>
            <p className="text-secondary-700 text-sm">
              Teilen Sie Ihren Empfehlungslink mit potenziellen Partnern.
              Je aktiver Ihr Team ist, desto mehr Differenzprovisionen koennen Sie verdienen!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeamPage;
