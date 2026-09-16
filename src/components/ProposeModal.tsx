import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Shield, 
  Clock, 
  Layers, 
  AlertCircle, 
  Link as LinkIcon
} from 'lucide-react';
import { User, PackageType } from '../types';
import { getTrustTier } from '../utils/trustUtils';

interface ProposeModalProps {
  partner: User;
  currentUser: User;
  isCooldownActive: boolean;
  cooldownRemainingFormatted?: string;
  onClose: () => void;
  onSubmitProposal: (packageType: PackageType, dwellTime: number, links: string[], note?: string) => void;
}

export const ProposeModal: React.FC<ProposeModalProps> = ({
  partner,
  currentUser,
  isCooldownActive,
  cooldownRemainingFormatted,
  onClose,
  onSubmitProposal,
}) => {
  const [packageType, setPackageType] = useState<PackageType>('5x5');
  const [dwellTime, setDwellTime] = useState<number>(30);
  const [links, setLinks] = useState<string[]>(Array(5).fill(''));
  const [note, setNote] = useState<string>('Ready for instant exchange! Clean links.');
  
  const partnerTrust = getTrustTier(partner.trustScore);
  const is10x10Allowed = currentUser.trustScore >= 75 && partner.trustScore >= 75;

  const handlePackageChange = (type: PackageType) => {
    if (type === '10x10' && !is10x10Allowed) return;
    setPackageType(type);
    if (type === '5x5') {
      setLinks(Array(5).fill(''));
    } else {
      setLinks(Array(10).fill(''));
    }
  };

  const handleUpdateLink = (index: number, val: string) => {
    const updated = [...links];
    updated[index] = val;
    setLinks(updated);
  };

  const targetCount = packageType === '5x5' ? 5 : 10;
  const isReady = links.filter(l => l.trim().length > 0).length === targetCount && !isCooldownActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="propose-modal-container"
        className="relative w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <Layers className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Propose Exchange Session
              </h2>
              <p className="text-xs text-zinc-400">
                1-on-1 link swap with <span className="text-zinc-200">@{partner.username}</span>
              </p>
            </div>
          </div>
          <button
            id="close-propose-modal-btn"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* IP Cooldown Alert */}
          {isCooldownActive && (
            <div className="rounded-md border border-zinc-700 bg-zinc-950 p-3 flex items-start space-x-2.5 text-xs">
              <AlertCircle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-semibold text-zinc-200">24-Hour Cooldown Active</h4>
                <p className="text-zinc-400 mt-0.5 leading-relaxed">
                  Exchanges between this partner are limited to once every 24 hours to maintain high link quality and protect earnings.
                </p>
                <div className="mt-1 text-zinc-300">
                  Remaining: <span className="tabular-nums font-mono text-xs">{cooldownRemainingFormatted || 'Active'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Partner Info */}
          <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950 border border-zinc-800">
            <div className="flex items-center space-x-3">
              <img
                src={partner.avatar}
                alt={partner.username}
                className="h-9 w-9 rounded-md object-cover border border-zinc-800 grayscale"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">{partner.username}</span>
                  <span className="text-xs text-zinc-500">({partner.countryCode})</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                  <span className="text-zinc-200">Trust: <span className="tabular-nums font-medium">{partner.trustScore}/100</span></span>
                  <span className="text-zinc-700">•</span>
                  <span><span className="tabular-nums">{partner.successRate}%</span> Success</span>
                </div>
              </div>
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded border ${partnerTrust.badgeClass}`}>
              {partnerTrust.label}
            </span>
          </div>

          {/* Package Type Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">
              Exchange Volume
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="select-package-5x5"
                onClick={() => handlePackageChange('5x5')}
                className={`p-3 rounded-md border text-left transition-colors ${
                  packageType === '5x5'
                    ? 'border-zinc-500 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">5x5 Package</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 font-medium">Standard</span>
                </div>
                <p className="text-xs text-zinc-400">5 links each • ~3 min total</p>
              </button>

              <button
                type="button"
                id="select-package-10x10"
                disabled={!is10x10Allowed}
                onClick={() => handlePackageChange('10x10')}
                className={`p-3 rounded-md border text-left transition-colors ${
                  !is10x10Allowed
                    ? 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-950'
                    : packageType === '10x10'
                    ? 'border-zinc-500 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">10x10 Package</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 font-medium">Tier 75+</span>
                </div>
                <p className="text-xs text-zinc-400">10 links each • ~6 min total</p>
              </button>
            </div>
          </div>

          {/* Retention Dwell Time */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">
              Retention Dwell Time Per Link
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="select-dwell-30s"
                onClick={() => setDwellTime(30)}
                className={`p-2.5 rounded-md border text-left transition-colors ${
                  dwellTime === 30
                    ? 'border-zinc-500 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold block">30 Seconds</span>
                <span className="text-xs text-zinc-400">Standard retention</span>
              </button>

              <button
                type="button"
                id="select-dwell-45s"
                onClick={() => setDwellTime(45)}
                className={`p-2.5 rounded-md border text-left transition-colors ${
                  dwellTime === 45
                    ? 'border-zinc-500 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold block">45 Seconds</span>
                <span className="text-xs text-zinc-400">High-CPM boost</span>
              </button>
            </div>
          </div>

          {/* Your Shortened URLs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Your URLs ({links.length}/{targetCount})
              </label>
              <button
                type="button"
                onClick={() => setLinks(Array(targetCount).fill(''))}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Clear
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="h-6 w-6 shrink-0 flex items-center justify-center rounded bg-zinc-950 text-xs font-medium text-zinc-500 border border-zinc-800 tabular-nums">
                    {idx + 1}
                  </span>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleUpdateLink(idx, e.target.value)}
                    placeholder="https://shrinkme.io/..."
                    className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Note */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Message / Note for Partner (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-5 py-3 text-xs">
          <span className="text-zinc-500">Unique-IP certified</span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="cancel-propose-btn"
              onClick={onClose}
              className="px-3 py-1.5 text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              id="submit-proposal-btn"
              disabled={!isReady}
              onClick={() => onSubmitProposal(packageType, dwellTime, links, note)}
              className={`flex items-center space-x-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-colors ${
                isReady
                  ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send className="h-3 w-3" strokeWidth={1.5} />
              <span>Launch Room</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
