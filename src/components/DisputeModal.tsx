import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  FileWarning, 
  AlertTriangle
} from 'lucide-react';
import { ExchangeSession } from '../types';

interface DisputeModalProps {
  session: ExchangeSession;
  onClose: () => void;
  onSubmitDispute: (reason: string, notes: string, evidenceUrl?: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  session,
  onClose,
  onSubmitDispute,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('partner_abandoned');
  const [notes, setNotes] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');

  const DISPUTE_REASONS = [
    {
      id: 'partner_abandoned',
      title: 'Partner Inactive or Abandoned Session',
      description: 'Peer stopped responding while your queue is waiting.',
      penaltyText: '-10 Trust penalty for abandonment',
    },
    {
      id: 'broken_malicious_link',
      title: 'Broken, Malicious, or Banned URL',
      description: 'The shortened link contains malware, redirects to phishing, or 404s.',
      penaltyText: '-15 Trust penalty for broken URL',
    },
    {
      id: 'fake_confirmation',
      title: 'Bypassed Dwell Timer / Fake Confirmation',
      description: 'Partner claimed verification without completing dwell duration.',
      penaltyText: '-15 Trust penalty for tampering',
    },
    {
      id: 'network_incompatible',
      title: 'Ad Network Violation / Bot Behavior',
      description: 'Detected automated scripts, proxy rotation, or bot extensions.',
      penaltyText: 'Immediate probation flag',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reasonObj = DISPUTE_REASONS.find(r => r.id === selectedReason);
    onSubmitDispute(reasonObj ? reasonObj.title : selectedReason, notes, evidenceUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="dispute-modal-container"
        className="relative w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-5 py-3.5 bg-zinc-900 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Report Session & Dispute (<span className="font-mono">{session.roomCode}</span>)
              </h3>
              <p className="text-xs text-zinc-400">
                Partner: @{session.partner.username}
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="leading-relaxed">
              Submitting a validated dispute freezes the exchange room. Offender receives a <span className="text-zinc-100 font-bold">-15 Trust penalty</span>.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">
              Violation Category
            </label>
            <div className="space-y-1.5">
              {DISPUTE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start p-2.5 rounded border cursor-pointer transition-colors ${
                    selectedReason === r.id
                      ? 'border-zinc-500 bg-zinc-800 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute_reason"
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                    className="mt-0.5 text-zinc-100 focus:ring-0 bg-zinc-900 border-zinc-700"
                  />
                  <div className="ml-2.5">
                    <p className="text-xs font-semibold">{r.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{r.description}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{r.penaltyText}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Incident Notes
            </label>
            <textarea
              required
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain the specific issue..."
              className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Evidence Link (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-submit-dispute-btn"
              disabled={notes.trim().length === 0}
              className={`flex items-center space-x-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-colors ${
                notes.trim().length > 0
                  ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <FileWarning className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Submit & Freeze Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
