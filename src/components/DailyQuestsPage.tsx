import React from 'react';
import { 
  Target, 
  Flame, 
  CheckCircle2, 
  ArrowLeft,
  Award,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { DailyGoal, User } from '../types';

interface DailyQuestsPageProps {
  goals: DailyGoal[];
  currentUser: User;
  onClaimReward: (goalId: string) => void;
  onBackToPool: () => void;
}

export const DailyQuestsPage: React.FC<DailyQuestsPageProps> = ({
  goals,
  currentUser,
  onClaimReward,
  onBackToPool,
}) => {
  const completedCount = goals.filter(g => g.current >= g.target).length;
  const totalXp = goals.reduce((sum, g) => sum + g.rewardXp, 0);
  const earnedXp = goals
    .filter(g => g.current >= g.target)
    .reduce((sum, g) => sum + g.rewardXp, 0);
  const overallPercent = Math.round((completedCount / goals.length) * 100);

  const LONG_TERM_MILESTONES = [
    {
      id: 'm1',
      title: 'Flawless Verification Node',
      description: 'Achieve 10 consecutive exchange rooms without any dispute flags or skips.',
      progress: '10/10',
      unlocked: true,
      reward: 'Verified Badge',
    },
    {
      id: 'm2',
      title: 'Retention Guardian',
      description: 'Complete 25 links with 45-second high-dwell duration.',
      progress: '18/25',
      unlocked: false,
      reward: '+5 Trust Bonus',
    },
    {
      id: 'm3',
      title: 'Centurion Exchanger',
      description: 'Reach 100 lifetime mutual link verifications on the network.',
      progress: `${currentUser.lifetimeExchanges}/100`,
      unlocked: currentUser.lifetimeExchanges >= 100,
      reward: 'Elite Priority',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200">
            <Target className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              Daily Quests & Milestones
            </h1>
            <p className="text-xs text-zinc-400">
              Resets daily at 00:00 UTC • Complete verified link swaps to earn XP, streak multipliers, and trust boosts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
            <span>Cycle resets in <strong className="text-zinc-200 font-normal">14h 22m</strong></span>
          </div>

          <button
            type="button"
            onClick={onBackToPool}
            className="flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Discovery Pool</span>
          </button>
        </div>
      </div>

      {/* Top Bento Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Active Streak */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Active Streak</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
              Active
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Flame className="h-5 w-5 text-zinc-200" strokeWidth={1.5} />
            <span className="text-2xl font-semibold text-white tabular-nums">
              {currentUser.activeStreak} Days
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Complete at least 1 exchange every 24 hours to maintain your multiplier.
          </p>
        </div>

        {/* Quests Completed Today */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Today's Progress</span>
            <span className="text-xs text-zinc-300 font-medium tabular-nums">{overallPercent}%</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              {completedCount} / {goals.length}
            </span>
            <span className="text-xs text-zinc-500">Quests done</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-zinc-200 transition-all duration-300"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>

        {/* XP Earned */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">XP Yield</span>
            <Zap className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              +{earnedXp}
            </span>
            <span className="text-xs text-zinc-500">/ +{totalXp} XP available</span>
          </div>
          <p className="text-xs text-zinc-400">
            XP unlocks automated matchmaking priority in discovery pools.
          </p>
        </div>

        {/* Trust Cap */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Daily Trust Cap</span>
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              +2 / +6 PTS
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Earned from verified exchanges today. Up to +4 PTS more attainable today.
          </p>
        </div>

      </div>

      {/* Main Quests Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Active Daily Quests</span>
            <span className="text-xs text-zinc-400 font-normal">
              ({completedCount} of {goals.length} ready)
            </span>
          </h2>
          <span className="text-xs text-zinc-500">Auto-tracked via exchange telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map((goal) => {
            const isDone = goal.current >= goal.target;
            const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));

            return (
              <div
                key={goal.id}
                className={`rounded-lg border p-4 transition-colors flex flex-col justify-between space-y-3 ${
                  isDone
                    ? 'border-zinc-700 bg-zinc-900/50'
                    : 'border-zinc-800 bg-zinc-900/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-white">
                        {goal.title}
                      </h3>
                      {isDone && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                          Complete
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded font-medium tabular-nums shrink-0">
                      +{goal.rewardXp} XP
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {goal.description}
                  </p>
                </div>

                {/* Progress bar and counter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>
                      Progress: <strong className="text-zinc-300 font-medium tabular-nums">{goal.current}</strong> / <span className="tabular-nums">{goal.target} {goal.unit}</span>
                    </span>
                    <span className="text-zinc-300 tabular-nums font-medium">{percent}%</span>
                  </div>
                  
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-zinc-200 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {isDone && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onClaimReward(goal.id)}
                        className="flex items-center space-x-1.5 rounded bg-white hover:bg-zinc-200 text-zinc-950 px-3 py-1 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Claim Reward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Long Term Milestones Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Award className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <span>Long-Term Network Milestones</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LONG_TERM_MILESTONES.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">{m.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                  m.unlocked
                    ? 'border-emerald-900/40 bg-emerald-950/40 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                }`}>
                  {m.unlocked ? 'Unlocked' : 'In Progress'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {m.description}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900">
                <span className="text-zinc-500 tabular-nums">Progress: {m.progress}</span>
                <span className="text-zinc-300 font-medium">{m.reward}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
