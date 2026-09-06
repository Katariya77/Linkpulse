import { TrustTier } from '../types';

export function getTrustTier(score: number): {
  tier: TrustTier;
  label: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
} {
  if (score >= 95) {
    return {
      tier: 'elite',
      label: 'Elite Tier',
      badgeClass: 'text-zinc-100 bg-zinc-800/80 border-zinc-700',
      bgClass: 'bg-zinc-100',
      borderClass: 'border-zinc-700',
      description: 'Maximum verified reliability • Unlocked 10x10 packages',
    };
  }
  if (score >= 75) {
    return {
      tier: 'reliable',
      label: 'Reliable Tier',
      badgeClass: 'text-zinc-300 bg-zinc-900 border-zinc-800',
      bgClass: 'bg-zinc-400',
      borderClass: 'border-zinc-800',
      description: 'Standard pool access • Verified completion rate',
    };
  }
  if (score >= 60) {
    return {
      tier: 'caution',
      label: 'Caution Tier',
      badgeClass: 'text-zinc-400 bg-zinc-900/80 border-zinc-800',
      bgClass: 'bg-zinc-600',
      borderClass: 'border-zinc-800',
      description: 'Restricted matching: 5x5 packages only',
    };
  }
  if (score >= 40) {
    return {
      tier: 'at_risk',
      label: 'At-Risk Tier',
      badgeClass: 'text-zinc-400 bg-zinc-950 border-zinc-800/80',
      bgClass: 'bg-zinc-700',
      borderClass: 'border-zinc-800',
      description: 'Penalty warnings active • Manual pre-verification required',
    };
  }
  return {
    tier: 'suspended',
    label: 'Suspended',
    badgeClass: 'text-zinc-500 bg-zinc-950 border-zinc-900 line-through',
    bgClass: 'bg-zinc-800',
    borderClass: 'border-zinc-900',
    description: 'Account suspended (<40 Trust Score). Probation review required.',
  };
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'shortener.link';
  }
}
