import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Lock, 
  Info, 
  Mail, 
  RotateCcw, 
  Truck,
  X, 
  Copy, 
  Check, 
  Clock, 
  CreditCard,
  Building2,
  CheckCircle2,
  Users,
  Sparkles,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

export type LegalPolicyTab = 'terms' | 'privacy' | 'about' | 'contact' | 'refunds' | 'shipping';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalPolicyTab;
  onClose: () => void;
  onSelectTab?: (tab: LegalPolicyTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
  onSelectTab,
}) => {
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);
  const [hasCopiedEmail, setHasCopiedEmail] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabChange = (tab: LegalPolicyTab) => {
    setActiveTab(tab);
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };

  const handleCopyEmail = (emailStr: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emailStr);
      setHasCopiedEmail(true);
      setTimeout(() => setHasCopiedEmail(false), 2000);
    }
  };

  const tabsConfig = [
    { id: 'terms' as LegalPolicyTab, label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy' as LegalPolicyTab, label: 'Privacy Policy', icon: Lock },
    { id: 'about' as LegalPolicyTab, label: 'About Us', icon: Info },
    { id: 'contact' as LegalPolicyTab, label: 'Contact Us', icon: Mail },
    { id: 'refunds' as LegalPolicyTab, label: 'Cancellation & Refunds', icon: RotateCcw },
    { id: 'shipping' as LegalPolicyTab, label: 'Shipping & Delivery', icon: Truck },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      id="legal-policies-modal"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#101014] border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                LinkPulse Legal & Compliance
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Official
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Transparent policies, digital software terms, and regulatory disclosures
              </p>
            </div>
          </div>
          <button
            type="button"
            id="legal-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            aria-label="Close legal modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector Nav */}
        <div className="flex items-center space-x-1 px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto no-scrollbar">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`legal-tab-btn-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/70'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 sm:px-8 space-y-6 text-zinc-300 text-xs sm:text-sm leading-relaxed">
          
          {/* ========================================================================= */}
          {/* TAB 1: TERMS AND CONDITIONS (20 STRUCTURED SECTIONS)                      */}
          {/* ========================================================================= */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-terms">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Legal Agreement</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Terms & Conditions</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Last updated: September 2026. Please read these Terms carefully before using LinkPulse.
                </p>
              </div>

              {/* 1. Acceptance of Terms */}
              <section className="space-y-1.5" id="terms-section-1">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">01.</span>
                  Acceptance of Terms
                </h4>
                <p>
                  By creating an account, accessing, browsing, or using the LinkPulse web application (&quot;LinkPulse&quot;, &quot;Platform&quot;, &quot;Service&quot;), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms & Conditions (&quot;Terms&quot;), as well as our Privacy Policy. If you do not agree with any part of these Terms, you must not access or use the Platform.
                </p>
              </section>

              {/* 2. Description of Service */}
              <section className="space-y-1.5" id="terms-section-2">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">02.</span>
                  Description of Service
                </h4>
                <p>
                  LinkPulse is a private software platform and controlled community created for shortlink creators and digital publishers. The Platform provides digital software tools for members to manage their links, discover available link-exchange opportunities, participate in member-to-member link interactions, and utilize automated verification, matching, peer reputation, and anti-abuse systems.
                </p>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  <strong className="text-white">Service Scope Clarification:</strong> LinkPulse is strictly a software utility and community platform. LinkPulse is <strong className="text-white">NOT</strong> an employment agency, job provider, guaranteed-income service, financial product, investment scheme, or advertising brokerage.
                </div>
              </section>

              {/* 3. Eligibility */}
              <section className="space-y-1.5" id="terms-section-3">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">03.</span>
                  Eligibility
                </h4>
                <p>
                  You must be of legal age (at least 18 years of age or the age of majority in your jurisdiction) to register an account and use the Platform. By using LinkPulse, you represent and warrant that you have the legal capacity to enter into a binding contract and are legally permitted to use the Service under applicable laws.
                </p>
              </section>

              {/* 4. Account Registration & Security */}
              <section className="space-y-1.5" id="terms-section-4">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">04.</span>
                  Account Registration & Security
                </h4>
                <p>
                  To use certain features of the Platform, you must register an account by providing accurate, current, and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>One individual may not operate multiple fraudulent, duplicate, or phantom accounts to manipulate community discovery or reputation.</li>
                  <li>Accounts cannot be sold, assigned, transferred, rented, or shared with third parties unless LinkPulse explicitly permits it in writing.</li>
                  <li>You agree to notify LinkPulse immediately of any unauthorized use or security breach of your account.</li>
                </ul>
              </section>

              {/* 5. Acceptable Use */}
              <section className="space-y-1.5" id="terms-section-5">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">05.</span>
                  Acceptable Use
                </h4>
                <p>
                  You agree to use LinkPulse only for lawful, ethical, and legitimate purposes and in accordance with these Terms. You shall not use the Platform in any manner that could disable, overburden, damage, or impair platform infrastructure or interfere with any other member&apos;s lawful use.
                </p>
              </section>

              {/* 6. Link & Content Rules */}
              <section className="space-y-1.5" id="terms-section-6">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">06.</span>
                  Link & Content Rules
                </h4>
                <p>
                  Members are strictly responsible for the destination URLs they submit to the Platform. You are expressly prohibited from submitting, sharing, or exchanging links that contain or lead to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Malware, viruses, trojans, ransomware, or malicious executables.</li>
                  <li>Phishing pages, credential-harvesting schemes, or scam links.</li>
                  <li>Illegal, violent, hateful, obscene, or defamatory content.</li>
                  <li>Deceptive redirects, forced downloads, or click-hijacking scripts.</li>
                  <li>Content that infringes on third-party intellectual property or copyrights.</li>
                  <li>Unsolicited spam, deceptive promotional materials, or fraudulent offers.</li>
                  <li>Links intended to abuse, exploit, or violate the policies of third-party services.</li>
                </ul>
              </section>

              {/* 7. Anti-Fraud & Traffic Manipulation */}
              <section className="space-y-1.5" id="terms-section-7">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">07.</span>
                  Anti-Fraud & Traffic Manipulation
                </h4>
                <p>
                  LinkPulse enforces strict automated and peer-driven fraud prevention. You are strictly prohibited from engaging in any of the following practices:
                </p>
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-200/90 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Strictly Prohibited Traffic Generation Practices</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Automated bots, scripts, headless browsers, or browser emulators.</li>
                    <li>Fake traffic, simulated impressions, or automated click generators.</li>
                    <li>Click manipulation, auto-refreshers, proxy rotators, or click-farm networks.</li>
                    <li>Manipulating dwell timers, falsifying verification codes, or tampering with telemetry payloads.</li>
                    <li>Coordinated fraudulent activity, peer collusion, or mutual evasion schemes.</li>
                    <li>Any traffic generation method prohibited by the relevant third-party service or ad network.</li>
                  </ul>
                </div>
              </section>

              {/* 8. Third-Party Services */}
              <section className="space-y-1.5" id="terms-section-8">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">08.</span>
                  Third-Party Services
                </h4>
                <p>
                  Third-party URL shorteners, advertising networks, analytics platforms, and monetization providers operate completely independently of LinkPulse. Their own terms of service, privacy policies, traffic quality requirements, eligibility criteria, payout rules, and account policies apply exclusively to their services.
                </p>
                <p className="text-zinc-400 text-xs">
                  LinkPulse does not guarantee that any third-party service will accept your traffic, approve your account, validate clicks, or issue payments. LinkPulse has no control over third-party shortener rate cards, advertiser demand, or payout schedules.
                </p>
              </section>

              {/* 9. Earnings Disclaimer */}
              <section className="space-y-1.5" id="terms-section-9">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">09.</span>
                  Earnings Disclaimer
                </h4>
                <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-800/40 space-y-2 text-amber-200/95">
                  <p className="font-semibold text-white">
                    &quot;LinkPulse does not guarantee any specific amount of traffic, clicks, revenue, income, or earnings.&quot;
                  </p>
                  <p className="text-xs leading-relaxed">
                    Any earnings generated through third-party URL shorteners, advertising networks, or monetization services depend entirely on those third parties, their independent payout policies, traffic-quality assessments, advertiser demand, geographic factors, and your own individual activity.
                  </p>
                  <p className="text-xs font-medium text-amber-300">
                    &quot;Purchasing LinkPulse Premium does not guarantee earnings or any particular financial return.&quot;
                  </p>
                </div>
              </section>

              {/* 10. Premium Services & Payments */}
              <section className="space-y-1.5" id="terms-section-10">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">10.</span>
                  Premium Services & Payments
                </h4>
                <p>
                  LinkPulse may offer optional paid digital software memberships, such as LinkPulse Pro. Premium features provide software enhancements such as zero cooldown wait timers, priority pool matching, extended link slots, and advanced telemetry analytics.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong className="text-white">Pricing & Duration:</strong> The exact price and billing duration ([PREMIUM PRICE], currently ₹10/month) are clearly presented prior to checkout.</li>
                  <li><strong className="text-white">Activation:</strong> Access to digital software features is activated electronically upon successful confirmation of payment.</li>
                  <li><strong className="text-white">Payment Processing:</strong> Payments are processed through third-party payment providers using their payment infrastructure. LinkPulse does not store sensitive cardholder details or banking credentials.</li>
                  <li><strong className="text-white">Software Classification:</strong> Premium is solely a digital software and feature membership. Premium does NOT guarantee earnings, clicks, or financial return.</li>
                </ul>
              </section>

              {/* 11. Cancellation & Refunds */}
              <section className="space-y-1.5" id="terms-section-11">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">11.</span>
                  Cancellation & Refunds
                </h4>
                <p>
                  Our policies regarding subscription cancellations and refund eligibility are detailed in our dedicated <button type="button" onClick={() => handleTabChange('refunds')} className="text-emerald-400 underline hover:text-emerald-300 cursor-pointer">Cancellation & Refunds Policy</button>, which is incorporated into these Terms by reference.
                </p>
              </section>

              {/* 12. Account Suspension & Termination */}
              <section className="space-y-1.5" id="terms-section-12">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">12.</span>
                  Account Suspension & Termination
                </h4>
                <p>
                  LinkPulse reserves the right to restrict, suspend, or terminate your account and access to the Platform at our sole discretion, without prior notice, for conduct that violates these Terms, fraudulent activity, traffic manipulation, abuse of platform features, security threats, or other legitimate platform-protection reasons.
                </p>
              </section>

              {/* 13. Intellectual Property */}
              <section className="space-y-1.5" id="terms-section-13">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">13.</span>
                  Intellectual Property
                </h4>
                <p>
                  All software code, visual design, user interface elements, branding, algorithms, logos, and original content comprising LinkPulse are the intellectual property of LinkPulse and its operators. Members retain ownership of the lawful URLs and content they legitimately submit to the platform.
                </p>
              </section>

              {/* 14. Service Availability */}
              <section className="space-y-1.5" id="terms-section-14">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">14.</span>
                  Service Availability
                </h4>
                <p>
                  We strive to maintain high service availability; however, temporary outages, scheduled maintenance, hardware or software errors, third-party infrastructure disruptions, or broader internet interruptions may occur. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis.
                </p>
              </section>

              {/* 15. Disclaimer of Warranties */}
              <section className="space-y-1.5" id="terms-section-15">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">15.</span>
                  Disclaimer of Warranties
                </h4>
                <p>
                  To the maximum extent permitted by applicable law, LinkPulse disclaims all warranties of any kind, whether express, statutory, or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, non-infringement, or uninterrupted operation.
                </p>
              </section>

              {/* 16. Limitation of Liability */}
              <section className="space-y-1.5" id="terms-section-16">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">16.</span>
                  Limitation of Liability
                </h4>
                <p>
                  LinkPulse does not control and shall not be held liable for:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Third-party shortener rate changes, payout policies, or monetization algorithms.</li>
                  <li>Advertiser demand fluctuations, campaign expirations, or third-party payout rejections.</li>
                  <li>Suspension or termination of your account by third-party services.</li>
                  <li>Internet connectivity failures, browser incompatibility, or external network outages.</li>
                </ul>
                <p className="text-zinc-400 text-xs">
                  To the extent permitted by law, LinkPulse shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of or inability to use the Service.
                </p>
              </section>

              {/* 17. Indemnification */}
              <section className="space-y-1.5" id="terms-section-17">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">17.</span>
                  Indemnification
                </h4>
                <p>
                  You agree to defend, indemnify, and hold harmless LinkPulse, its operators, contractors, and affiliates from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable legal fees) arising out of or relating to your violation of these Terms, your unlawful use of the Platform, or your submission of prohibited links or artificial traffic.
                </p>
              </section>

              {/* 18. Changes to Terms */}
              <section className="space-y-1.5" id="terms-section-18">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">18.</span>
                  Changes to Terms
                </h4>
                <p>
                  LinkPulse reserves the right to revise and update these Terms at any time. When updates are published, the &quot;Last updated&quot; date will be amended. Your continued use of the Platform following the posting of revised Terms constitutes your acceptance of the changes.
                </p>
              </section>

              {/* 19. Governing Law & Disputes */}
              <section className="space-y-1.5" id="terms-section-19">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">19.</span>
                  Governing Law & Disputes
                </h4>
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200">
                  <p>
                    These Terms shall be governed by the laws applicable in India. Any disputes shall be subject to the jurisdiction of courts having appropriate jurisdiction under applicable law.
                  </p>
                </div>
              </section>

              {/* 20. Contact Information */}
              <section className="space-y-1.5" id="terms-section-20">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs">20.</span>
                  Contact Information
                </h4>
                <p>
                  For any legal inquiries, compliance questions, or feedback regarding these Terms, please contact our support team at <span className="text-emerald-400 font-mono">[SUPPORT EMAIL] support@linkpulse.io</span>.
                </p>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PRIVACY POLICY                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-privacy">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Data Protection</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Privacy Policy</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  How LinkPulse collects, handles, and safeguards account information and platform telemetry.
                </p>
              </div>

              {/* 1. Information We Collect */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">1. Information We Collect</h4>
                <p>
                  We collect only the minimum information necessary to operate, secure, and maintain the LinkPulse application:
                </p>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <strong className="text-white text-xs block mb-1">Account & Authentication Information:</strong>
                    <p className="text-xs text-zinc-400">
                      When you register or sign in, we receive your email address, chosen public display name/username, selected avatar preset URL, and authenticated User ID (UID) generated through Google Sign-In or email authentication.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <strong className="text-white text-xs block mb-1">Platform Activity & Telemetry:</strong>
                    <p className="text-xs text-zinc-400">
                      We record submitted shortlink URLs, link categories, active exchange room session durations, verification code match statuses, dwell-timer completion events, reputation ratings, and dispute timestamps to verify authentic peer interactions.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <strong className="text-white text-xs block mb-1">Payment & Transaction Records:</strong>
                    <p className="text-xs text-zinc-400">
                      When you purchase LinkPulse Pro, we receive payment identifiers (such as Order ID, Payment ID, payment status, and timestamp) provided by the third-party payment gateway to activate your membership.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <strong className="text-white text-xs block mb-1">Technical & Security Data:</strong>
                    <p className="text-xs text-zinc-400">
                      Basic network information, such as IP address and browser user-agent strings, is processed transiently to prevent automated bot attacks, click fraud, and multi-accounting.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. How We Use Information */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">2. How We Use Information</h4>
                <p>The information we collect is used strictly to:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Operate link discovery rooms and coordinate peer exchanges between approved members.</li>
                  <li>Verify compliance with community dwell timers and prevent artificial traffic generation.</li>
                  <li>Calculate public trust ratings and detect multi-accounting or fraudulent patterns.</li>
                  <li>Activate and manage LinkPulse Pro digital software subscriptions.</li>
                  <li>Provide customer support, resolve peer disputes, and investigate security concerns.</li>
                </ul>
              </section>

              {/* 3. Payment Information & Security */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">3. Payment Information</h4>
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs leading-relaxed space-y-2">
                  <p>
                    <strong className="text-white">No Storage of Sensitive Financial Data:</strong> LinkPulse does <strong className="text-white">NOT</strong> collect, view, or store credit or debit card numbers, expiration dates, CVVs, net-banking passwords, or UPI MPINs.
                  </p>
                  <p className="text-zinc-400">
                    Payment transactions are processed through third-party payment providers using their payment infrastructure. They transmit only transaction reference IDs (Order ID and Payment ID) back to LinkPulse for subscription provisioning.
                  </p>
                </div>
              </section>

              {/* 4. Third-Party Services */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">4. Third-Party Services</h4>
                <p>
                  LinkPulse integrates with trusted cloud infrastructure providers to provide authentication, database persistence, and payment processing:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong className="text-white">Google Firebase:</strong> Used for secure user authentication and cloud database persistence (Firestore).</li>
                  <li><strong className="text-white">Payment Gateway (Razorpay):</strong> Used to facilitate electronic payments. Payments are processed through their independent payment infrastructure.</li>
                </ul>
                <p className="text-zinc-400 text-xs">
                  We do not sell, rent, or trade your personal data to marketing brokers or advertising networks.
                </p>
              </section>

              {/* 5. Data Security */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">5. Data Security</h4>
                <p>
                  We implement reasonable technical and organizational security measures, including HTTPS/TLS encryption in transit, strict database access rules, and authenticated user isolation, to safeguard data against unauthorized access, loss, or alteration.
                </p>
              </section>

              {/* 6. Data Retention */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">6. Data Retention</h4>
                <p>
                  We retain personal information for as long as your account remains active or as necessary to fulfill the purposes described in this Privacy Policy, comply with legal obligations, and resolve community disputes.
                </p>
              </section>

              {/* 7. User Rights */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">7. User Rights</h4>
                <p>
                  You have the right to access the personal information associated with your account, correct inaccurate data, or request the deletion of your account. To submit a data request, contact our support desk at <span className="text-emerald-400 font-mono">[SUPPORT EMAIL] support@linkpulse.io</span>.
                </p>
              </section>

              {/* 8. Cookies & Local Storage */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">8. Cookies & Local Storage</h4>
                <p>
                  LinkPulse uses local browser storage and essential cookies strictly to maintain user authentication sessions, preserve theme preferences, and track active verification room states. We do not use third-party advertising tracking cookies.
                </p>
              </section>

              {/* 9. Changes & Contact */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">9. Changes to Privacy Policy & Contact</h4>
                <p>
                  We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. If you have questions regarding this policy, please reach out via email to <span className="text-emerald-400 font-mono">[SUPPORT EMAIL] support@linkpulse.io</span>.
                </p>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ABOUT US                                                           */}
          {/* ========================================================================= */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-about">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Platform Overview</span>
                <h3 className="text-lg font-bold text-white mt-0.5">About LinkPulse</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Private, controlled online platform for shortlink creators and digital publishers.
                </p>
              </div>

              {/* Core Statement */}
              <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <p className="text-zinc-200 text-sm leading-relaxed">
                  <strong className="text-white">LinkPulse</strong> is a private, controlled online platform designed for shortlink creators and digital publishers to discover and share link-based opportunities within a controlled community.
                </p>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  The platform provides members with tools to manage their links, discover available opportunities, interact with other approved members, and utilize verification and anti-abuse systems.
                </p>
              </div>

              {/* Platform Functionality Highlights */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  What the Platform Provides
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-1">
                    <strong className="text-white block">Link Management:</strong>
                    <p className="text-zinc-400">Tools to organize, monitor, categorize, and track member-owned links in one centralized interface.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-1">
                    <strong className="text-white block">Member Discovery & Exchange:</strong>
                    <p className="text-zinc-400">Real-time matching with active members in the Discovery Pool for balanced peer opportunities.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-1">
                    <strong className="text-white block">Anti-Abuse & Verification:</strong>
                    <p className="text-zinc-400">Integrated dwell-timer validation, verification code confirmation, and automated fraud shields.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-1">
                    <strong className="text-white block">Optional Premium Membership:</strong>
                    <p className="text-zinc-400">Optional paid digital software membership unlocking extended features and queue prioritization.</p>
                  </div>
                </div>
              </section>

              {/* Controlled Community Access */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Controlled Community Access
                </h4>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  LinkPulse is intentionally private and maintains a limited number of active members. Access to the platform is limited and may require registration, approval, an invitation, or an access code.
                </p>
              </section>

              {/* Explicit Earnings & Independence Disclaimer */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Earnings & Third-Party Independence
                </h4>
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs sm:text-sm text-amber-200/95 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-white">No Income Guarantee:</strong> The platform does NOT guarantee any specific income, traffic, clicks, revenue, or earnings.
                  </p>
                  <p>
                    Any earnings generated through third-party URL shorteners, advertising networks, or monetization services depend entirely on those third parties and their own policies, traffic-quality requirements, advertiser demand, geographic factors, payout rules, and other external factors.
                  </p>
                  <p className="text-xs text-amber-300/90 font-medium">
                    Users must comply with the terms and traffic policies of all third-party services they use. Purchasing Premium is an optional software membership and does NOT guarantee any amount of earnings.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CONTACT US                                                         */}
          {/* ========================================================================= */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-contact">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Customer Support</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Contact Us</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Assistance with account access, digital subscriptions, technical inquiries, and compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Support Email</h4>
                  <p className="text-xs text-zinc-400">For account assistance, billing questions, and general support:</p>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-xs font-mono text-emerald-400 select-all">
                      support@linkpulse.io
                    </span>
                    <button
                      type="button"
                      id="contact-copy-email-btn"
                      onClick={() => handleCopyEmail('support@linkpulse.io')}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                      title="Copy email"
                    >
                      {hasCopiedEmail ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500">Primary Desk: [SUPPORT EMAIL]</p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Support Hours & Response</h4>
                  <div className="space-y-1 text-xs text-zinc-400">
                    <p><strong className="text-zinc-300">Operational Hours:</strong> Monday – Saturday, 10:00 AM – 6:00 PM IST</p>
                    <p><strong className="text-zinc-300">Expected Response:</strong> Within 2 business days</p>
                  </div>
                </div>
              </div>

              {/* Platform Representative Information */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center space-x-2 text-zinc-200 font-semibold text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <span>Platform Information</span>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-400">
                  <p><strong className="text-zinc-300">Platform Name:</strong> LinkPulse</p>
                  <p><strong className="text-zinc-300">Platform Owner / Operator:</strong> [PLATFORM OWNER NAME]</p>
                  <p><strong className="text-zinc-300">Registered Domain:</strong> [DOMAIN]</p>
                  <p><strong className="text-zinc-300">Business Address:</strong> [BUSINESS ADDRESS, IF APPLICABLE]</p>
                  <p><strong className="text-zinc-300">Location:</strong> Rajasthan, India</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-zinc-400">Need direct assistance with an order or account issue?</span>
                <a
                  href="mailto:support@linkpulse.io?subject=LinkPulse%20Support%20Inquiry"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email Support Desk</span>
                </a>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: CANCELLATION & REFUNDS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'refunds' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-refunds">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Consumer Protection</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Cancellation & Refunds Policy</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Transparent guidelines for subscription cancellations, digital service delivery, and refund eligibility.
                </p>
              </div>

              {/* 1. Digital Service Nature */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">1. Digital Service Provisioning</h4>
                <p>
                  LinkPulse Pro is an online digital software membership that provides immediate access to enhanced software tools (including priority matchmaking, zero wait cooldown timers, extended link slots, and advanced telemetry). Because digital software features are activated instantaneously upon confirmation of payment, special considerations apply to cancellations and refunds.
                </p>
              </section>

              {/* 2. Cancellation Process */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">2. How to Cancel</h4>
                <p>
                  You may cancel or opt out of recurring renewal for your LinkPulse Pro subscription at any time:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>You can initiate cancellation directly from your account settings or by sending an email to our support desk.</li>
                  <li>Upon cancellation, your Pro privileges will remain active until the end of your current paid billing period ([PREMIUM PRICE], ₹10/month).</li>
                  <li>No further renewal charges will be billed after cancellation.</li>
                </ul>
              </section>

              {/* 3. Refund Eligibility */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">3. Refund Eligibility</h4>
                <p>Refund requests are reviewed and evaluated under the following specific circumstances:</p>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
                    <strong className="text-white block mb-0.5">Duplicate Charges:</strong>
                    <p className="text-zinc-400">If your account was billed more than once for the same subscription period due to a payment gateway timeout or technical latency, the duplicate payment will be refunded in full.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
                    <strong className="text-white block mb-0.5">Payment Successful But Access Not Activated:</strong>
                    <p className="text-zinc-400">If your payment succeeded but digital Pro features were not provisioned within a reasonable timeframe, and our support team is unable to manually activate your service within 48 hours of notification.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
                    <strong className="text-white block mb-0.5">Verified Technical Platform Failure:</strong>
                    <p className="text-zinc-400">If critical platform defects attributable directly to LinkPulse completely prevented the use of purchased software features throughout the billing cycle.</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 mt-2">
                  <strong className="text-white">Refund Request Window:</strong> Refund claims must be submitted within <strong className="text-white">[REFUND PERIOD, e.g. within 48 hours to 7 days]</strong> of the transaction timestamp.
                </div>
              </section>

              {/* 4. Forfeiture of Refund on Terms Violations */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  4. Violations & Termination
                </h4>
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-200/90 text-xs leading-relaxed">
                  Accounts that are suspended, restricted, or terminated due to violations of our Terms & Conditions (including the use of automated bots, traffic manipulation, artificial clicks, or fraudulent links) are <strong className="text-white">not eligible for refunds</strong>.
                </div>
              </section>

              {/* 5. Processing Timelines & Instructions */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">5. How to Request a Refund & Processing Timelines</h4>
                <p>
                  To request a refund, email our support desk at <span className="text-emerald-400 font-mono">[SUPPORT EMAIL] support@linkpulse.io</span> with:
                </p>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono space-y-1 text-zinc-300">
                  <p>• Your registered LinkPulse email address</p>
                  <p>• Transaction Reference / Payment ID / Order ID from your receipt</p>
                  <p>• Specific description of the issue or reason for the request</p>
                </div>
                <p className="text-xs text-zinc-400">
                  Approved refunds are credited back to the original source payment method (UPI account, card, or bank) via the payment processor within <strong className="text-zinc-200">5 to 7 business days</strong>, subject to standard banking settlement cycles.
                </p>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: SHIPPING & DELIVERY (DIGITAL SOFTWARE FULFILLMENT)                  */}
          {/* ========================================================================= */}
          {activeTab === 'shipping' && (
            <div className="space-y-6 animate-fadeIn" id="policy-content-shipping">
              <div className="border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] uppercase font-mono text-zinc-500">Digital Fulfillment</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Shipping & Delivery Policy</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Electronic delivery terms for LinkPulse digital software services and membership subscriptions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 leading-relaxed">
                  <strong className="text-white block mb-0.5">100% Digital SaaS Delivery:</strong>
                  LinkPulse does not sell physical goods. No physical shipping, parcel handling, or postal delivery occurs. All services are strictly digital software tools and online community access.
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">1. Electronic Delivery Method</h4>
                <p>
                  All purchased digital memberships, features, and platform functionality (such as LinkPulse Pro, zero wait cooldowns, priority matchmaking queues, and analytics) are delivered electronically and directly through the user&apos;s account dashboard upon confirmation of payment.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">2. Delivery Timeline & Provisioning</h4>
                <p>
                  Access to purchased digital features is provisioned electronically and instantaneously within seconds of successful payment confirmation from the payment provider:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Your user status is updated in real time to <strong className="text-white">Pro Member</strong>.</li>
                  <li>An electronic transaction confirmation containing your Order ID and Payment ID is generated on screen.</li>
                  <li>All Pro software features become immediately accessible without requiring manual installation or physical shipping.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">3. Shipping Fees</h4>
                <p>
                  Because all services offered on LinkPulse are delivered entirely online via electronic means, there are <strong className="text-white">zero (₹0.00) shipping, handling, packaging, or postal charges</strong>.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">4. Delivery Inquiries & Support</h4>
                <p>
                  In rare cases of bank network latency where electronic activation is delayed, please allow up to 10 minutes. If your account does not reflect purchased privileges after payment, please contact our support desk with your Payment ID at <span className="text-emerald-400 font-mono">[SUPPORT EMAIL] support@linkpulse.io</span> for prompt electronic provisioning.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/80 text-[11px] text-zinc-500">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-400">Transparent policies and digital service terms</span>
          </div>
          <button
            type="button"
            id="legal-modal-done-btn"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
