// client/src/pages/dashboard/TeamTree.jsx
// Visual MLM org-chart — circles, connecting lines, rank colors
import { useState } from 'react';
import { Users } from 'lucide-react';

const RANK_COLORS = {
  'Direktor':       { bg: '#1a3a4a', light: '#e8f0f4' },
  'Sales Manager':  { bg: '#1d4ed8', light: '#dbeafe' },
  'Manager':        { bg: '#7c3aed', light: '#ede9fe' },
  'Teamleiter':     { bg: '#059669', light: '#d1fae5' },
  'Fachberater':    { bg: '#0891b2', light: '#cffafe' },
  'Berater':        { bg: '#64748b', light: '#f1f5f9' },
  'Starter':        { bg: '#94a3b8', light: '#f8fafc' },
  'Director':       { bg: '#1a3a4a', light: '#e8f0f4' },
  'Advisor':        { bg: '#64748b', light: '#f1f5f9' },
  'Expert Advisor': { bg: '#0891b2', light: '#cffafe' },
  'Team Leader':    { bg: '#059669', light: '#d1fae5' },
  'Partner':        { bg: '#94a3b8', light: '#f8fafc' },
};
const getColor = (rank) => RANK_COLORS[rank] || RANK_COLORS['Starter'];
const getInits = (f, l) => ((f?.[0]||'?') + (l?.[0]||'?')).toUpperCase();

const Node = ({ member, isRoot, onClick, collapsed }) => {
  const color  = getColor(member.rank);
  const size   = isRoot ? 76 : 60;
  const active = member.isActive !== false && member.status !== 'inactive';
  const hasKids = (member.children||[]).length > 0;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', cursor: hasKids?'pointer':'default' }} onClick={onClick}>
      <div style={{ position:'relative' }}>
        <div style={{
          width:size, height:size, borderRadius:'50%',
          background: active ? color.bg : '#94a3b8',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:'bold', color:'white', fontSize: isRoot ? 24 : 18,
          boxShadow:'0 4px 14px rgba(0,0,0,0.18)', border:'4px solid white',
          userSelect:'none'
        }}>
          {getInits(member.firstName, member.lastName)}
        </div>
        {/* Active indicator */}
        <div style={{ position:'absolute', bottom:3, right:3, width:13, height:13, borderRadius:'50%', background: active?'#22c55e':'#94a3b8', border:'2px solid white' }} />
        {/* Expand/collapse badge */}
        {hasKids && (
          <div style={{ position:'absolute', bottom:-11, left:'50%', transform:'translateX(-50%)', width:20, height:20, borderRadius:'50%', background:'white', border:'2px solid #d1d5db', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:'bold', color:'#6b7280', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', zIndex:1 }}>
            {collapsed ? '+' : '−'}
          </div>
        )}
      </div>
      {/* Name */}
      <p style={{ marginTop:16, fontSize:12, fontWeight:600, color:'#1f2937', textAlign:'center', lineHeight:1.3, maxWidth:96 }}>
        {member.firstName} {member.lastName}
      </p>
      {/* Rank badge */}
      <span style={{ marginTop:4, padding:'2px 10px', borderRadius:999, fontSize:10, fontWeight:600, background:color.light, color:color.bg }}>
        {member.rank || 'Starter'}
      </span>
      {member.totalSales > 0 && (
        <span style={{ marginTop:2, fontSize:10, color:'#9ca3af' }}>{member.totalSales} Sales</span>
      )}
    </div>
  );
};

const TreeNode = ({ member, depth = 0 }) => {
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const children = member.children || [];
  const hasKids = children.length > 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <Node
        member={member}
        isRoot={depth === 0}
        collapsed={collapsed}
        onClick={() => hasKids && setCollapsed(v => !v)}
      />
      {hasKids && !collapsed && (
        <>
          {/* Vertical line down from parent */}
          <div style={{ width:1, height:32, background:'#d1d5db', marginTop:2 }} />
          {/* Children row */}
          <div style={{ display:'flex', alignItems:'flex-start', position:'relative' }}>
            {/* Horizontal connector bar */}
            {children.length > 1 && (
              <div style={{ position:'absolute', top:0, height:1, background:'#d1d5db' }}
                ref={el => {
                  if (!el) return;
                  const p = el.parentElement;
                  if (!p || p.children.length < 2) return;
                  const first = p.children[1];
                  const last  = p.children[p.children.length - 1];
                  const pr = p.getBoundingClientRect();
                  const fr = first.getBoundingClientRect();
                  const lr = last.getBoundingClientRect();
                  el.style.left  = `${fr.left - pr.left + fr.width / 2}px`;
                  el.style.right = `${pr.right - lr.right + lr.width / 2}px`;
                }}
              />
            )}
            {/* Each child */}
            {children.map((child, i) => (
              <div key={child.id || i} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 20px' }}>
                {/* Vertical drop to child */}
                <div style={{ width:1, height:32, background:'#d1d5db' }} />
                <TreeNode member={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const TeamTree = ({ data, currentUser, isLoading = false }) => {
  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', gap:48, padding:'48px 24px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:'#e5e7eb' }} />
          <div style={{ width:72, height:12, borderRadius:6, background:'#e5e7eb' }} />
          <div style={{ width:48, height:10, borderRadius:6, background:'#f3f4f6' }} />
        </div>
      ))}
    </div>
  );

  if (!data || data.length === 0) return (
    <div style={{ textAlign:'center', padding:'64px 24px' }}>
      <Users style={{ width:48, height:48, color:'#d1d5db', margin:'0 auto 16px' }} />
      <h3 style={{ fontWeight:600, color:'#374151', marginBottom:8 }}>Noch keine Teammitglieder</h3>
      <p style={{ fontSize:14, color:'#9ca3af' }}>Teilen Sie Ihren Empfehlungslink, um Ihr Team aufzubauen.</p>
    </div>
  );

  // Wrap all top-level nodes under currentUser as the root node
  const root = currentUser ? {
    id: 'root',
    firstName: currentUser.first_name  || currentUser.firstName || '',
    lastName:  currentUser.last_name   || currentUser.lastName  || '',
    rank:      currentUser.rank_name   || currentUser.rank      || 'Direktor',
    isActive:  true,
    totalSales: currentUser.own_sales_count || 0,
    children:  data,
  } : null;

  return (
    <div style={{ overflowX:'auto' }}>
      <div style={{ minWidth:'max-content', margin:'0 auto', padding:'32px 32px 48px' }}>
        {root
          ? <TreeNode member={root} depth={0} />
          : (
            <div style={{ display:'flex', gap:48, justifyContent:'center' }}>
              {data.map((n, i) => <TreeNode key={n.id || i} member={n} depth={0} />)}
            </div>
          )
        }
      </div>
    </div>
  );
};

export default TeamTree;
