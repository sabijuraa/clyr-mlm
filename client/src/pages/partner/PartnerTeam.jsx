import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Users, ChevronDown, ChevronRight, Award, ShoppingBag, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

export default function PartnerTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const { data } = await api.get('/partners/team');
      setTeam(data.team || []);
    } catch (err) {
      toast.error('Team konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clyr-teal"></div>
      </div>
    );
  }

  const totalMembers = countMembers(team);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-clyr-dark">Mein Team</h1>
        <p className="text-gray-600 mt-1">
          {totalMembers} {totalMembers === 1 ? 'Teampartner' : 'Teampartner'} in deinem Netzwerk
        </p>
      </div>

      {team.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Noch keine Teampartner</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Teile deinen Empfehlungscode, um Partner für dein Team zu gewinnen und Differenzprovisionen zu verdienen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {team.map(member => (
            <TeamMember key={member.id} member={member} level={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamMember({ member, level }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = member.children && member.children.length > 0;
  const isActive = (member.quarterly_sales_count || 0) >= 2;

  return (
    <div style={{ marginLeft: `${level * 24}px` }}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-4">
          {/* Expand button */}
          <button
            onClick={() => hasChildren && setExpanded(!expanded)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${hasChildren ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-0'}`}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-clyr-teal/10 flex items-center justify-center text-clyr-teal font-semibold">
            {(member.first_name?.[0] || '')}{(member.last_name?.[0] || '')}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-clyr-dark truncate">
                {member.first_name} {member.last_name}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Award size={16} className="text-purple-500" />
              <span>{member.rank_name || 'Starter'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <ShoppingBag size={16} className="text-blue-500" />
              <span>{member.personal_sales_count || 0} Verkäufe</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar size={16} className="text-gray-400" />
              <span>{member.created_at ? formatDate(member.created_at) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex md:hidden items-center gap-4 mt-3 ml-[72px] text-xs text-gray-600">
          <span className="flex items-center gap-1"><Award size={14} className="text-purple-500" /> {member.rank_name || 'Starter'}</span>
          <span className="flex items-center gap-1"><ShoppingBag size={14} className="text-blue-500" /> {member.personal_sales_count || 0}</span>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {member.children.map(child => (
            <TeamMember key={child.id} member={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function countMembers(team) {
  let count = 0;
  for (const m of team) {
    count++;
    if (m.children) count += countMembers(m.children);
  }
  return count;
}
