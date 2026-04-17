// client/src/pages/admin/AdminTreePage.jsx
// Admin: View the complete MLM hierarchy starting from Theresa (Director)
import { useState, useEffect } from 'react';
import { Users, RefreshCw, Network, Crown, Search, ChevronRight, ChevronDown, MapPin, Mail, Phone } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Inline tree node component (no external dependency)
const TreeNode = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const rankColorMap = {
    1: '#94A3B8', // Starter - gray
    2: '#64748B', // Berater
    3: '#3B82F6', // Fachberater - blue
    4: '#8B5CF6', // Teamleiter - purple
    5: '#EC4899', // Manager - pink
    6: '#F59E0B', // Sales Manager - amber
    7: '#7C3AED', // Direktor - violet
  };
  const rankColor = node.rankColor || rankColorMap[node.rankLevel] || '#94A3B8';

  return (
    <div className="relative">
      <div 
        className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${
          level === 0 
            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200' 
            : 'bg-white border-gray-100'
        }`}
        style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="mt-1 text-secondary-400 hover:text-secondary-600 flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 h-4 mt-1 flex-shrink-0" />
        )}

        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: rankColor }}
        >
          {level === 0 ? <Crown className="w-5 h-5" /> : (node.firstName?.[0] || '?').toUpperCase()}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-secondary-800 truncate">{node.name}</h4>
            <span 
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: rankColor }}
            >
              {node.rank} ({node.commissionRate}%)
            </span>
            {!node.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                {node.status}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-secondary-500 flex-wrap">
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{node.email}</span>
            {node.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{node.country}</span>}
            {node.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{node.phone}</span>}
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-secondary-600">
            <span><strong>{node.directPartners}</strong> direct</span>
            <span><strong>{node.totalSales}</strong> sales</span>
            <span>€{node.ownVolume?.toFixed(0) || 0} own</span>
            <span>€{node.teamVolume?.toFixed(0) || 0} team</span>
            {node.customerCount > 0 && <span><strong>{node.customerCount}</strong> customers</span>}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminTreePage = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getFullTree();
      setTree(res.data?.tree || []);
    } catch (err) {
      console.error('Failed to load tree:', err);
      toast.error('Fehler beim Laden des MLM-Baums');
    } finally {
      setLoading(false);
    }
  };

  // Recursive search filter
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce((acc, node) => {
      const matches = (node.name || '').toLowerCase().includes(q) ||
                      (node.email || '').toLowerCase().includes(q) ||
                      (node.referralCode || '').toLowerCase().includes(q);
      const filteredChildren = filterTree(node.children || [], query);
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  // Count total members
  const countMembers = (nodes) => 
    nodes.reduce((sum, n) => sum + 1 + countMembers(n.children || []), 0);

  const filteredTree = filterTree(tree, searchQuery);
  const totalMembers = countMembers(tree);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
            <Network className="w-6 h-6 text-primary-500" />
            MLM-Baum (Vollständig)
          </h1>
          <p className="text-secondary-500 text-sm mt-1">
            Komplette Hierarchie aller Partner ab Direktor
          </p>
        </div>
        <button
          onClick={loadTree}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Crown className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary-500">Direktor</p>
              <p className="text-sm font-semibold text-secondary-800 truncate">
                {tree[0]?.name || '-'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Direkte Partner</p>
              <p className="text-lg font-semibold text-secondary-800">
                {tree[0]?.directPartners || tree[0]?.children?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Network className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Gesamt-Mitglieder</p>
              <p className="text-lg font-semibold text-secondary-800">{totalMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail oder Empfehlungscode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-secondary-300 animate-spin" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-16">
            <Network className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-500">
              {searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine Partner im System'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            {filteredTree.map((node) => (
              <TreeNode key={node.id} node={node} level={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTreePage;
