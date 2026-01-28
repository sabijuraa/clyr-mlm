import { motion } from 'framer-motion';
import { TrendingUp, Star, Award, Crown, Target } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import appConfig, { getRankById, getNextRank, formatCurrency } from '../../config/app.config';
import { cn } from '../../utils/helpers';

const RankProgress = ({ currentRankId, currentSales = 0, teamSales = 0 }) => {
  const { t, lang } = useLanguage();
  
  const currentRank = getRankById(currentRankId);
  const nextRank = getNextRank(currentRankId);
  
  // Calculate progress to next rank
  const salesNeeded = nextRank ? nextRank.minSales - currentSales : 0;
  const progress = nextRank 
    ? Math.min(100, (currentSales / nextRank.minSales) * 100) 
    : 100;

  const rankIcons = {
    starter: Star,
    consultant: TrendingUp,
    senior: Award,
    teamleader: Crown,
    manager: Crown,
    salesmanager: Crown
  };

  const RankIcon = rankIcons[currentRank.key] || Star;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-heading font-semibold text-lg text-gray-900 mb-6 flex items-center gap-2">
        <Target className="w-5 h-5 text-teal-500" />
        {t('dashboard.rankProgress')}
      </h3>

      {/* Current Rank Display */}
      <div className="flex items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${currentRank.color}20` }}
        >
          <RankIcon 
            className="w-8 h-8" 
            style={{ color: currentRank.color }} 
          />
        </div>
        <div>
          <p className="text-sm text-gray-500">Aktueller Rang</p>
          <p className="text-2xl font-heading font-bold text-gray-900">
            {currentRank.name[lang]}
          </p>
          <p className="text-sm text-teal-600 font-medium">
            {(currentRank.rate * 100).toFixed(0)}% Provision
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {nextRank && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Fortschritt zu {nextRank.name[lang]}</span>
            <span className="font-semibold text-gray-900">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank.color})` 
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Noch {salesNeeded} Verkäufe bis zum nächsten Rang
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">Eigene Verkäufe</p>
          <p className="text-xl font-bold text-gray-900">{currentSales}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">Team Verkäufe</p>
          <p className="text-xl font-bold text-gray-900">{teamSales}</p>
        </div>
      </div>

      {/* Rank Ladder */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-4">Alle Ränge</p>
        <div className="space-y-2">
          {appConfig.ranks.map((rank, idx) => (
            <div 
              key={rank.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                rank.id === currentRankId ? "bg-teal-50" : "hover:bg-gray-50"
              )}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: rank.color }}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  rank.id === currentRankId ? "text-teal-700" : "text-gray-700"
                )}>
                  {rank.name[lang]}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {(rank.rate * 100).toFixed(0)}%
              </span>
              {rank.bonus > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  +{formatCurrency(rank.bonus)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RankProgress;