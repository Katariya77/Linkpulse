import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
  ArrowLeftRight, 
  X, 
  Check, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle,
  Radio,
  Copy,
  Layers,
  CheckCircle2,
  ArrowRight,
  Shield,
  RotateCcw
} from 'lucide-react';
import { User, PackageType, ExchangeLink, ExchangeSession } from '../types';
import { getTrustTier } from '../utils/trustUtils';

export interface ChatMessage {
  id: string;
  senderId: string; // 'current_user' | partner.id | 'system'
  senderName: string;
  senderAvatar?: string;
  text?: string;
  timestamp: string;
  type: 'text' | 'system' | 'exchange_proposal';
  proposal?: {
    packageType: PackageType;
    volume: number; // 5 | 10 | 20
    dwellTime: number; // 30
    links: string[];
    roomCode: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}

interface SessionCreationChatProps {
  partner: User;
  currentUser: User;
  onBack: () => void;
  onEnterRoom: (sessionData: {
    packageType: PackageType;
    dwellTime: number;
    userLinks: string[];
    roomCode: string;
    partner: User;
  }) => void;
  onOpenTrustInspector?: () => void;
}

export const SessionCreationChat: React.FC<SessionCreationChatProps> = ({
  partner,
  currentUser,
  onBack,
  onEnterRoom,
  onOpenTrustInspector,
}) => {
  const partnerTier = getTrustTier(partner.trustScore);

  // 3-dot dropdown menu state
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Chat message input state
  const [inputText, setInputText] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Bottom Sheet Modal & 3-Step Wizard state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [sheetStep, setSheetStep] = useState<1 | 2 | 3>(1);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  
  // Exchange volume selection (5, 10, or 20 Links)
  const [selectedVolume, setSelectedVolume] = useState<5 | 10 | 20>(10);
  const dwellTime = 30;

  // Helper to generate default valid shortener URLs for user
  const generateInitialLinks = (count: number): string[] => {
    const s1 = currentUser.preferredShorteners?.[0] || 'shrinkme.io';
    const s2 = currentUser.preferredShorteners?.[1] || 'ouo.io';
    return Array.from({ length: count }).map((_, i) => {
      const shortener = i % 2 === 0 ? s1 : s2;
      return `https://${shortener}/user-${currentUser.username.toLowerCase()}-lnk${i + 1}`;
    });
  };

  // Links for step 02
  const [userLinks, setUserLinks] = useState<string[]>(() => generateInitialLinks(10));

  // Whenever volume changes, resize or re-fill links
  const handleVolumeChange = (vol: 5 | 10 | 20) => {
    setSelectedVolume(vol);
    setUserLinks(prev => {
      if (prev.length === vol) return prev;
      if (prev.length < vol) {
        const extra = generateInitialLinks(vol).slice(prev.length);
        return [...prev, ...extra];
      }
      return prev.slice(0, vol);
    });
  };

  // Initial chat messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-sys-1',
      senderId: 'system',
      senderName: 'System',
      text: `Private 1-on-1 chat started with @${partner.username}. Safety checks and link verification active.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    },
    {
      id: 'msg-init-partner',
      senderId: partner.id,
      senderName: partner.username,
      senderAvatar: partner.avatar,
      text: `Hey @${currentUser.username}! Ready to exchange links. Tap the exchange button below to choose your exchange size and add links!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    },
  ]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBottomSheetOpen]);

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Send regular text message
  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'current_user',
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Optional partner automated response if no active proposal
    const hasActiveProposal = messages.some(m => m.type === 'exchange_proposal');
    if (!hasActiveProposal) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `msg-reply-${Date.now()}`,
            senderId: partner.id,
            senderName: partner.username,
            senderAvatar: partner.avatar,
            text: `Sounds great! Tap the exchange icon below when you are ready to pick your exchange size.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
          },
        ]);
      }, 1200);
    }
  };

  // Step transitions in Bottom Sheet
  const handleNextStep = () => {
    setSlideDirection('next');
    if (sheetStep === 1) {
      setSheetStep(2);
    } else if (sheetStep === 2) {
      setSheetStep(3);
    }
  };

  const handlePrevStep = () => {
    setSlideDirection('prev');
    if (sheetStep === 3) {
      setSheetStep(2);
    } else if (sheetStep === 2) {
      setSheetStep(1);
    }
  };

  // Open Bottom Sheet
  const handleOpenBottomSheet = () => {
    setSheetStep(1);
    setIsBottomSheetOpen(true);
  };

  // Close Bottom Sheet
  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
  };

  // When clicking "Start Exchange" in Step 03:
  // Sends an interactive UI Box into the chat body
  const handleFinalStartExchange = () => {
    setIsBottomSheetOpen(false);

    const randomRoomNum = Math.floor(10000 + Math.random() * 90000);
    const roomCode = `#LP-${randomRoomNum}`;
    const pkgType: PackageType = selectedVolume === 5 ? '5x5' : selectedVolume === 10 ? '10x10' : '20x20';

    const proposalMsgId = `proposal-${Date.now()}`;
    const proposalMsg: ChatMessage = {
      id: proposalMsgId,
      senderId: 'current_user',
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'exchange_proposal',
      proposal: {
        packageType: pkgType,
        volume: selectedVolume,
        dwellTime,
        links: [...userLinks],
        roomCode,
        status: 'pending',
      },
    };

    setMessages(prev => [...prev, proposalMsg]);

    // Simulate partner acceptance: automatically or via button
    // After 2.5 seconds, partner accepts and UI box turns into active session room!
    const timer = setTimeout(() => {
      handlePartnerAcceptProposal(proposalMsgId);
    }, 2800);

    return () => clearTimeout(timer);
  };

  // Turn the UI Box from pending into an Active Session Room
  const handlePartnerAcceptProposal = (proposalMsgId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === proposalMsgId && m.proposal && m.proposal.status === 'pending') {
          return {
            ...m,
            proposal: {
              ...m.proposal,
              status: 'accepted',
            },
          };
        }
        return m;
      })
    );

    // Also add a confirmation message from partner
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-accept-${Date.now()}`,
          senderId: partner.id,
          senderName: partner.username,
          senderAvatar: partner.avatar,
          text: `Exchange proposal accepted! Session room synchronized. Click below to enter the room.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        },
      ]);
    }, 400);
  };

  // Update an individual link in Step 02
  const handleUpdateLink = (index: number, value: string) => {
    const updated = [...userLinks];
    updated[index] = value;
    setUserLinks(updated);
  };

  // Autofill links in Step 02
  const handleAutofillLinks = () => {
    setUserLinks(generateInitialLinks(selectedVolume));
  };

  // Clear all links
  const handleClearLinks = () => {
    setUserLinks(Array(selectedVolume).fill(''));
  };

  const isStep2Valid = userLinks.slice(0, selectedVolume).every(l => l.trim().length > 0);

  return (
    <div 
      id="session-creation-chat-screen"
      className="max-w-3xl mx-auto w-full h-[85vh] sm:h-[88vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl overflow-hidden relative"
    >
      {/* =================================================================== */}
      {/* 1. HEADER: PFP, Status, Partner Info & 3-dot Menu                   */}
      {/* =================================================================== */}
      <header className="px-4 py-3 sm:py-3.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back button + PFP + Username + Trust Badge */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            id="chat-back-to-pool-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Back to Discovery Pool"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Profile Picture with Online Status Dot */}
          <div className="relative shrink-0">
            <img
              src={partner.avatar}
              alt={partner.username}
              className="h-10 w-10 rounded-full object-cover border border-zinc-700 bg-zinc-800"
            />
            <span 
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" 
              title="Online now"
            />
          </div>

          {/* Partner Username & Stats */}
          <div className="flex flex-col text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">
                @{partner.username}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${partnerTier.badgeClass}`}>
                {partnerTier.label}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
              <span>•</span>
              <span>Trust: <strong className="text-zinc-200">{partner.trustScore}</strong></span>
              <span>•</span>
              <span><strong className="text-zinc-200">{partner.successRate}%</strong> Success</span>
            </div>
          </div>
        </div>

        {/* Right: 3-Dot Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            id="chat-options-menu-btn"
            onClick={() => setShowMenu(prev => !prev)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="More options"
            aria-label="Chat options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div 
              className="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 text-xs text-zinc-200 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3 py-2 border-b border-zinc-800/80">
                <p className="font-semibold text-white">@{partner.username}</p>
                <p className="text-[10px] text-zinc-400">Country: {partner.country} ({partner.countryCode})</p>
              </div>

              {onOpenTrustInspector && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenTrustInspector();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Inspect Trust Ledger</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMessages(prev => prev.filter(m => m.type === 'exchange_proposal'));
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                <span>Clear Message History</span>
              </button>

              <div className="border-t border-zinc-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  alert(`Report submitted for @${partner.username}. Our moderators will review telemetry logs.`);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span>Report / Block Member</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. CHAT BODY: Bubbles & Interactive Proposal / Active Room Boxes    */}
      {/* =================================================================== */}
      <div 
        id="chat-messages-container"
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scroll-smooth bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/60"
      >
        {messages.map((msg) => {
          // A: System notification badge
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-zinc-900 border border-zinc-800/80 px-3 py-1 text-[11px] text-zinc-400 text-center max-w-md">
                  <Shield className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          // B: Interactive Exchange Proposal / Active Session Room Box!
          if (msg.type === 'exchange_proposal' && msg.proposal) {
            const proposal = msg.proposal;
            const isAccepted = proposal.status === 'accepted';

            return (
              <div key={msg.id} className="w-full my-3 flex justify-center animate-in fade-in zoom-in-95 duration-200">
                <div 
                  id={`exchange-proposal-box-${msg.id}`}
                  className={`w-full max-w-md rounded-2xl border p-4 sm:p-5 transition-all shadow-xl ${
                    isAccepted 
                      ? 'border-emerald-500/50 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/20 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                      : 'border-zinc-700 bg-zinc-900/90 shadow-black/50'
                  }`}
                >
                  {/* Proposal Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isAccepted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        <ArrowLeftRight className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-xs sm:text-sm">
                          {isAccepted ? 'Active Session Room' : 'Exchange Proposal'}
                        </h4>
                        <p className="text-[10px] text-zinc-400">
                          {isAccepted ? 'Ready to enter room' : `Sent to @${partner.username}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="text-right">
                      {isAccepted ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Accepted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>Awaiting Partner</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proposal Meta / Details */}
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/80 mb-3 text-center">
                    <div>
                      <div className="text-[10px] text-zinc-500">Exchange Size</div>
                      <div className="text-xs font-semibold text-white font-mono">{proposal.volume} Links</div>
                    </div>
                    <div className="border-x border-zinc-800">
                      <div className="text-[10px] text-zinc-500">Verification Time</div>
                      <div className="text-xs font-semibold text-white font-mono">{proposal.dwellTime}s / link</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Room Code</div>
                      <div className="text-xs font-semibold text-emerald-400 font-mono">{proposal.roomCode}</div>
                    </div>
                  </div>

                  {/* Links Summary Preview */}
                  <div className="space-y-1 mb-4">
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                      <span>Your Links ({proposal.links.length}):</span>
                      <span className="text-zinc-500 text-[9px]">Verified Clean</span>
                    </div>
                    <div className="max-h-20 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-zinc-400">
                      {proposal.links.slice(0, 3).map((link, idx) => (
                        <div key={idx} className="truncate bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
                          {idx + 1}. {link}
                        </div>
                      ))}
                      {proposal.links.length > 3 && (
                        <div className="text-center text-[10px] text-zinc-500 py-0.5">
                          + {proposal.links.length - 3} more links
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION SECTION: If pending vs accepted */}
                  {!isAccepted ? (
                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-center space-x-2 text-[11px] text-zinc-400 py-1">
                        <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                        <span>Waiting for @{partner.username} to accept...</span>
                      </div>
                      
                      {/* Single-Player Testing / Instant Partner Accept Trigger */}
                      <button
                        type="button"
                        id="simulate-partner-accept-btn"
                        onClick={() => handlePartnerAcceptProposal(msg.id)}
                        className="w-full py-2 px-3 rounded-lg text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center justify-center space-x-1.5 cursor-pointer border border-zinc-700/60"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Simulate Partner Accept</span>
                      </button>
                    </div>
                  ) : (
                    /* ACCEPTED: The UI Box has turned into an Active Session Room! */
                    <div className="pt-1 space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs">
                        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Room ready! Both partners ready for live exchange.</span>
                      </div>

                      {/* REDIRECT TO ROOM PAGE BUTTON */}
                      <button
                        type="button"
                        id="enter-active-room-btn"
                        onClick={() =>
                          onEnterRoom({
                            packageType: proposal.packageType,
                            dwellTime: proposal.dwellTime,
                            userLinks: proposal.links,
                            roomCode: proposal.roomCode,
                            partner,
                          })
                        }
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-zinc-200 text-zinc-950 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-[0.99]"
                      >
                        <span>Enter Exchange Room</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // C: Regular Chat Bubbles (User vs Partner)
          const isCurrentUser = msg.senderId === 'current_user';

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isCurrentUser && (
                <img
                  src={partner.avatar}
                  alt={partner.username}
                  className="h-7 w-7 rounded-full object-cover border border-zinc-800 shrink-0 mb-0.5"
                />
              )}

              <div
                className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                  isCurrentUser
                    ? 'bg-zinc-100 text-zinc-950 rounded-br-none font-normal'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                }`}
              >
                {!isCurrentUser && (
                  <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">
                    @{partner.username}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <div 
                  className={`text-[9px] mt-1 text-right select-none ${
                    isCurrentUser ? 'text-zinc-500' : 'text-zinc-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* =================================================================== */}
      {/* 3. BOTTOM: Input, Send Button & START EXCHANGE Button (Icon only)   */}
      {/* =================================================================== */}
      <footer className="p-3 sm:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* START EXCHANGE BUTTON:
              User instruction: "Bottom, input box for typing, send button, and a start exchange button, ( don't add text in button, use any exchange icon )"
          */}
          <button
            type="button"
            id="open-start-exchange-sheet-btn"
            onClick={handleOpenBottomSheet}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md active:scale-95 group"
            title="Start Exchange (Configure Package & Send Proposal)"
            aria-label="Start Exchange"
          >
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 text-white transition-transform group-hover:rotate-180 duration-300" />
          </button>

          {/* Message Input Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              id="chat-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="w-full h-10 sm:h-11 pl-4 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            id="chat-send-btn"
            disabled={!inputText.trim()}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              inputText.trim()
                ? 'bg-white hover:bg-zinc-200 text-zinc-950 cursor-pointer shadow-md active:scale-95'
                : 'bg-zinc-800/60 text-zinc-600 border border-zinc-800/80 cursor-not-allowed'
            }`}
            title="Send Message"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>

      {/* =================================================================== */}
      {/* 4. BOTTOM SHEET: 3-Step Wizard with Slide Animations               */}
      {/* =================================================================== */}
      {isBottomSheetOpen && (
        <div 
          id="exchange-bottom-sheet-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
          onClick={handleCloseBottomSheet}
        >
          {/* Bottom Sheet Drawer */}
          <div
            id="exchange-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-auto bg-zinc-950 border-t border-x border-zinc-800 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 max-h-[88vh]"
          >
            {/* Sheet Handle & Header */}
            <div className="pt-3 pb-2 px-6 border-b border-zinc-800/80 shrink-0">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                    START EXCHANGE
                  </h3>
                  <div className="text-[11px] text-zinc-500">
                    Step 0{sheetStep} of 03
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Step indicators */}
                  <div className="flex items-center space-x-1.5 mr-2">
                    <span className={`h-1.5 w-6 rounded-full transition-colors ${sheetStep >= 1 ? 'bg-white' : 'bg-zinc-800'}`} />
                    <span className={`h-1.5 w-6 rounded-full transition-colors ${sheetStep >= 2 ? 'bg-white' : 'bg-zinc-800'}`} />
                    <span className={`h-1.5 w-6 rounded-full transition-colors ${sheetStep >= 3 ? 'bg-white' : 'bg-zinc-800'}`} />
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseBottomSheet}
                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Carousel Container for Slide Animations */}
            <div className="relative overflow-hidden w-full flex-1 min-h-[380px] sm:min-h-[400px]">
              
              {/* ============================================================= */}
              {/* STEP 01: Choose Volume                                        */}
              {/* ============================================================= */}
              <div
                className={`w-full p-6 space-y-6 transition-all duration-300 ease-out transform ${
                  sheetStep === 1
                    ? 'translate-x-0 opacity-100 relative'
                    : '-translate-x-full opacity-0 pointer-events-none absolute inset-0'
                }`}
              >
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <span className="font-mono text-zinc-400">01</span>
                    <span>Choose Exchange Size</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select the number of links you want to exchange with @{partner.username}.
                  </p>
                </div>

                {/* Radio Options: 5 Links, 10 Links, 20 Links */}
                <div className="space-y-3">
                  {/* 5 Links */}
                  <label
                    onClick={() => handleVolumeChange(5)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedVolume === 5
                        ? 'border-white bg-zinc-900/90 text-white shadow-md'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="relative flex items-center justify-center">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          selectedVolume === 5 ? 'border-white' : 'border-zinc-600'
                        }`}>
                          {selectedVolume === 5 && (
                            <div className="h-2.5 w-2.5 rounded-full bg-white animate-in zoom-in-50 duration-150" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">5 Links</div>
                        <div className="text-[11px] text-zinc-400">Quick trade • 30s verification / link • ~2.5 mins</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      Fast
                    </span>
                  </label>

                  {/* 10 Links (Default) */}
                  <label
                    onClick={() => handleVolumeChange(10)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedVolume === 10
                        ? 'border-white bg-zinc-900/90 text-white shadow-md'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="relative flex items-center justify-center">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          selectedVolume === 10 ? 'border-white' : 'border-zinc-600'
                        }`}>
                          {selectedVolume === 10 && (
                            <div className="h-2.5 w-2.5 rounded-full bg-white animate-in zoom-in-50 duration-150" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">10 Links</div>
                        <div className="text-[11px] text-zinc-400">Standard match • 30s verification / link • ~5 mins</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60 font-semibold">
                      Popular
                    </span>
                  </label>

                  {/* 20 Links */}
                  <label
                    onClick={() => handleVolumeChange(20)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedVolume === 20
                        ? 'border-white bg-zinc-900/90 text-white shadow-md'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="relative flex items-center justify-center">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          selectedVolume === 20 ? 'border-white' : 'border-zinc-600'
                        }`}>
                          {selectedVolume === 20 && (
                            <div className="h-2.5 w-2.5 rounded-full bg-white animate-in zoom-in-50 duration-150" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">20 Links</div>
                        <div className="text-[11px] text-zinc-400">Extended volume • 30s verification / link • ~10 mins</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      Bulk
                    </span>
                  </label>
                </div>

                {/* Step 1 Next Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    id="volume-next-btn"
                    onClick={handleNextStep}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-white hover:bg-zinc-200 text-zinc-950 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-[0.99]"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ============================================================= */}
              {/* STEP 02: Add Your Links                                       */}
              {/* ============================================================= */}
              <div
                className={`w-full p-6 space-y-4 transition-all duration-300 ease-out transform ${
                  sheetStep === 2
                    ? 'translate-x-0 opacity-100 relative'
                    : sheetStep === 1
                    ? 'translate-x-full opacity-0 pointer-events-none absolute inset-0'
                    : '-translate-x-full opacity-0 pointer-events-none absolute inset-0'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span className="font-mono text-zinc-400">02</span>
                      <span>Add Your Links</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Provide your {selectedVolume} destination shortlinks for verification.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleAutofillLinks}
                      className="text-[11px] text-zinc-300 hover:text-white underline cursor-pointer"
                    >
                      Autofill
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={handleClearLinks}
                      className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Links Input List */}
                <div className="space-y-2.5 max-h-[220px] sm:max-h-[240px] overflow-y-auto pr-1">
                  {Array.from({ length: selectedVolume }).map((_, idx) => (
                    <div key={idx} className="relative flex items-center">
                      <span className="absolute left-3 font-mono text-[11px] text-zinc-500 select-none">
                        Link {idx + 1}
                      </span>
                      <input
                        type="url"
                        value={userLinks[idx] || ''}
                        onChange={(e) => handleUpdateLink(idx, e.target.value)}
                        placeholder={`https://${currentUser.preferredShorteners?.[0] || 'shrinkme.io'}/your-link-${idx + 1}`}
                        className="w-full pl-16 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  ))}
                </div>

                {/* Step 2 Buttons */}
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-3.5 px-4 rounded-xl font-semibold text-sm border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    id="links-next-btn"
                    disabled={!isStep2Valid}
                    onClick={handleNextStep}
                    className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                      isStep2Valid
                        ? 'bg-white hover:bg-zinc-200 text-zinc-950 cursor-pointer shadow-lg active:scale-[0.99]'
                        : 'bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ============================================================= */}
              {/* STEP 03: Confirm Partner                                      */}
              {/* ============================================================= */}
              <div
                className={`w-full p-6 space-y-6 transition-all duration-300 ease-out transform ${
                  sheetStep === 3
                    ? 'translate-x-0 opacity-100 relative'
                    : 'translate-x-full opacity-0 pointer-events-none absolute inset-0'
                }`}
              >
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <span className="font-mono text-zinc-400">03</span>
                    <span>Confirm Partner</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Review partner credentials before launching exchange.
                  </p>
                </div>

                {/* Partner Confirmation Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3.5">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={partner.avatar}
                      alt={partner.username}
                      className="h-12 w-12 rounded-xl object-cover border border-zinc-700"
                    />
                    <div>
                      <div className="text-base font-bold text-white">
                        @{partner.username}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Trust Score {partner.trustScore}
                      </div>
                      <div className="text-xs text-emerald-400 font-medium">
                        {partner.successRate}% Success Rate
                      </div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span>Exchange Size:</span>
                    <span className="font-semibold text-white">{selectedVolume} Links ({selectedVolume}x{selectedVolume})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Verification Time:</span>
                    <span className="font-semibold text-white">30 seconds per link</span>
                  </div>
                </div>

                {/* Step 3 Boxed Start Exchange Button */}
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-3.5 px-4 rounded-xl font-semibold text-sm border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  {/* 
                      Start Exchange Box Button as designed in prompt:
                      ┌───────────────────────────┐
                      │     Start Exchange        │
                      └───────────────────────────┘
                  */}
                  <button
                    type="button"
                    id="confirm-start-exchange-btn"
                    onClick={handleFinalStartExchange}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-white hover:bg-zinc-200 text-zinc-950 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xl active:scale-[0.99] border-2 border-zinc-300"
                  >
                    <span>Start Exchange</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
