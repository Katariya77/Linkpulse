import React from 'react';
import { 
  Target, 
  X, 
  Flame
} from 'lucide-react';
import { DailyGoal, User } from '../types';

interface DailyGoalsModalProps {
  goals: DailyGoal[];
  currentUser: User;
  onClose: () => void;
  onClaimReward: (goalId: string) => void;
}

export const DailyGoalsModal: React.FC<DailyGoalsModalProps> = ({
  goals,
  currentUser,
  onClose,
  onClaimReward,
}) => {
  const completedCount = goals.filter(g => g.current >= g.target).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="daily-goals-modal"
        className="relative w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <Target className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Daily Quests & Milestones
              </h2>
              <p className="text-xs text-zinc-400">
                Resets daily at 00:00 UTC ({completedCount}/{goals.length} completed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Streak summary pill */}
        <div className="mx-5 mt-4 p-3 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Flame className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
            <div>
              <span className="text-xs font-semibold text-white">
                {currentUser.activeStreak}-Day Active Streak
              </span>
              <p className="text-xs text-zinc-400">
                Complete at least 1 exchange every 24h to maintain
              </p>
            </div>
          </div>
          <span className="text-[10px] text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-medium">
            Active
          </span>
        </div>

        {/* Goals List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {goals.map((goal) => {
            const isDone = goal.current >= goal.target;
            const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));

            return (
              <div
                key={goal.id}
                className={`p-3 rounded border transition-colors ${
                  isDone
                    ? 'border-zinc-700 bg-zinc-950/80'
                    : 'border-zinc-800 bg-zinc-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-semibold text-white">{goal.title}</h4>
                      {isDone && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{goal.description}</p>
                    
                    {/* Progress bar */}
                    <div className="pt-1.5 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span><span className="tabular-nums">{goal.current}</span> / <span className="tabular-nums">{goal.target}</span> {goal.unit}</span>
                        <span className="text-zinc-300 tabular-nums">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-zinc-900 overflow-hidden border border-zinc-800/80">
                        <div
                          className="h-full bg-zinc-200 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-medium tabular-nums">
                      +{goal.rewardXp} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-900 px-5 py-3 flex justify-between items-center text-xs text-zinc-500">
          <span>Tracked automatically as you complete swaps</span>
          <button
            onClick={onClose}
            className="rounded bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
