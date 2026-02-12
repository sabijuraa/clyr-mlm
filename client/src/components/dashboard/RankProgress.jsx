import { motion } from 'framer-motion';
import { Award, TrendingUp, ChevronRight } from 'lucide-react';

const RankProgress = ({ currentRank, nextRank, progress, requirements }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-secondary-100 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center">
          <Award className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-secondary-700">Rank Progress</h3>
          <p className="text-sm text-secondary-500">Track your advancement</p>
        </div>
      </div>

      {/* Current Rank */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-secondary-700 text-white rounded-full text-sm font-semibold">
            {currentRank?.name || 'Starter'}
          </span>
          <ChevronRight className="w-4 h-4 text-secondary-400" />
          <span className="px-3 py-1 bg-secondary-100 text-secondary-600 rounded-full text-sm font-medium">
            {nextRank?.name || 'Bronze'}
          </span>
        </div>
        <span className="text-sm font-semibold text-primary-500">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-secondary-100 rounded-full overflow-hidden mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-secondary-700 to-primary-500 rounded-full"
        />
      </div>

      {/* Requirements */}
      {requirements && (
        <div className="space-y-3">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-secondary-600">{req.label}</span>
              </div>
              <span className="text-sm">
                <span className={req.current >= req.target ? 'text-green-600 font-semibold' : 'text-secondary-700'}>
                  {req.current}
                </span>
                <span className="text-secondary-400"> / {req.target}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RankProgress;
