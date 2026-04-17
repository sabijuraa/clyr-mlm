// client/src/pages/admin/AdminTeamPage.jsx
// Admin team tree — reuses the same TeamTree visual component from partner dashboard
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TeamTree from '../dashboard/TeamTree';

export default function AdminTeamPage() {
  const { user } = useAuth();
  const [treeData, setTreeData]   = useState([]);
  const [flatList, setFlatList]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState('tree');
  const [stats, setStats]         = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all partners (limit high enough to catch everyone)
      const res = await api.get('/admin/partners', { params: { limit: 500 } });
      const partners = res.data?.partners || res.data || [];
      setFlatList(partners);

      console.log('[ADMIN TREE] Loaded', partners.length, 'partners');
      console.log('[ADMIN TREE] First partner sample:', partners[0]);

      // Build hash by ID — normalize UUIDs to strings for safe comparison
      const byId = {};
      partners.forEach(p => {
        const pid = String(p.id);
        byId[pid] = {
          id: pid,
          firstName: p.first_name,
          lastName: p.last_name,
          rank: p.rank_name || 'Starter',
          rank_slug: p.rank_slug,
          isActive: p.status === 'active',
          status: p.status,
          email: p.email,
          totalSales: p.own_sales_count || 0,
          children: [],
        };
      });

      // Build tree: every partner whose upline_id matches another partner becomes that one's child
      // Partners whose upline_id is NOT in the partners list (i.e. points to admin/Theresa) become roots
      const roots = [];
      partners.forEach(p => {
        const pid = String(p.id);
        const uplineId = p.upline_id ? String(p.upline_id) : null;
        if (uplineId && byId[uplineId]) {
          byId[uplineId].children.push(byId[pid]);
        } else {
          roots.push(byId[pid]);
        }
      });

      console.log('[ADMIN TREE] Roots count (direct under admin):', roots.length);
      console.log('[ADMIN TREE] Tree depth check - first root children:', roots[0]?.children?.length || 0);

      setTreeData(roots);
      setStats({
        total:    partners.length,
        active:   partners.filter(p => p.status === 'active').length,
        inactive: partners.filter(p => p.status !== 'active').length,
      });
    } catch (e) {
      console.error('Failed to load team:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter tree recursively
  const filterTree = (nodes, q) => {
    if (!q) return nodes;
    return nodes.reduce((acc, node) => {
      const match = `${node.firstName} ${node.lastName} ${node.email}`
        .toLowerCase().includes(q.toLowerCase());
      const filteredChildren = filterTree(node.children || [], q);
      if (match || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(treeData, search);
  const filteredList = flatList.filter(p =>
    !search ||
    `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-700">Team Overview</h1>
          <p className="text-secondary-500 mt-1">Full MLM structure and partner network</p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Partners', value: stats.total,    color: 'text-gray-900'  },
          { label: 'Active',         value: stats.active,   color: 'text-green-600' },
          { label: 'Inactive',       value: stats.inactive, color: 'text-red-500'   },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + View Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search partners..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500" />
          </div>
          <div className="flex gap-2">
            {[['tree','Tree View'], ['list','List View']].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-secondary-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tree / List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">

        {viewMode === 'tree' ? (
          <>
            <h2 className="font-semibold text-lg text-secondary-700 mb-6">Partner Hierarchy</h2>
            <TeamTree data={filteredTree} isLoading={loading} currentUser={user} />
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg text-secondary-700 mb-6">
              All Partners ({filteredList.length})
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No partners found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      {['Name','Rank','Status','Direct','Sales','Earned'].map(h => (
                        <th key={h} className="pb-3 text-xs font-semibold text-gray-500 uppercase px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredList.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${p.status === 'active' ? 'bg-secondary-700' : 'bg-gray-300'}`}>
                              {(p.first_name||'?')[0]}{(p.last_name||'?')[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-gray-400">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {p.rank_name || 'Starter'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {p.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-medium">{p.direct_partners_count || 0}</td>
                        <td className="py-3 px-2 text-center font-medium">{p.own_sales_count || 0}</td>
                        <td className="py-3 px-2 text-right font-medium text-green-600">
                          €{parseFloat(p.total_earned || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
