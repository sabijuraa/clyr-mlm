import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, User, Users, TrendingUp } from 'lucide-react';
import { cn, getInitials } from '../../utils/helpers';

// Single team member node
const TeamMemberNode = ({ member, level = 0, isLast = false }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = member.children && member.children.length > 0;

  return (
    <div className="relative">
      {/* Connection line */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-6 h-full">
          <div className={cn(
            "absolute left-3 top-0 w-px bg-gray-200",
            isLast ? "h-6" : "h-full"
          )} />
          <div className="absolute left-3 top-6 w-3 h-px bg-gray-200" />
        </div>
      )}

      {/* Member Card */}
      <div className={cn("relative", level > 0 && "ml-6")}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: level * 0.1 }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            "bg-white border border-gray-100 hover:border-teal-200 hover:shadow-md",
            hasChildren && "cursor-pointer"
          )}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Expand Icon */}
          {hasChildren && (
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-5 h-5 flex items-center justify-center text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          )}

          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
            member.isActive 
              ? "bg-teal-600" 
              : "bg-gray-300"
          )}>
            {getInitials(member.firstName, member.lastName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {member.firstName} {member.lastName}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(
                "px-2 py-0.5 rounded-full font-medium",
                member.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {member.rank}
              </span>
              <span className="text-gray-400">
                {member.totalSales} Verkäufe
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold text-gray-900">{member.directPartners || 0}</p>
              <p className="text-xs text-gray-400">Direkt</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">{member.teamSize || 0}</p>
              <p className="text-xs text-gray-400">Team</p>
            </div>
          </div>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {expanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              {member.children.map((child, idx) => (
                <TeamMemberNode
                  key={child.id}
                  member={child}
                  level={level + 1}
                  isLast={idx === member.children.length - 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Main Team Tree Component
const TeamTree = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Noch keine Teammitglieder</h3>
        <p className="text-sm text-gray-500">
          Teilen Sie Ihren Empfehlungslink, um Ihr Team aufzubauen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((member, idx) => (
        <TeamMemberNode
          key={member.id}
          member={member}
          level={0}
          isLast={idx === data.length - 1}
        />
      ))}
    </div>
  );
};

export default TeamTree;