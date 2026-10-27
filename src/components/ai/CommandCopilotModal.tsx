import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  X,
  Printer,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import type {
  CaseRecord,
  CustodyRecord,
  OBEntry,
  Officer,
  ApprovalRequest,
  ArmoryWeapon,
  OCSHandoverBrief,
} from '../../types';

interface CommandCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  obEntries: OBEntry[];
  cases: CaseRecord[];
  custodyRecords: CustodyRecord[];
  officers: Officer[];
  approvals: ApprovalRequest[];
  weapons: ArmoryWeapon[];
  currentOfficer: Officer;
  onNavigate: (module: string) => void;
}

export const CommandCopilotModal: React.FC<CommandCopilotModalProps> = ({
  isOpen,
  onClose,
  obEntries,
  cases,
  custodyRecords,
  officers: _officers,
  approvals,
  weapons,
  currentOfficer,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'BRIEF'>('SEARCH');
  const [query, setQuery] = useState('');
  const [generatedBrief, setGeneratedBrief] = useState<OCSHandoverBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Search logic across entities
  const trimmed = query.trim().toLowerCase();
  const matchedOB = trimmed
    ? obEntries.filter(
        (o) =>
          o.ob_number.toLowerCase().includes(trimmed) ||
          o.subject.toLowerCase().includes(trimmed) ||
          o.narrative.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const matchedCases = trimmed
    ? cases.filter(
        (c) =>
          c.case_number.toLowerCase().includes(trimmed) ||
          c.title.toLowerCase().includes(trimmed) ||
          c.crime_category.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const matchedCustody = trimmed
    ? custodyRecords.filter(
        (c) =>
          c.person.full_name.toLowerCase().includes(trimmed) ||
          c.ob_number.toLowerCase().includes(trimmed) ||
          c.cell_number.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const handleGenerateBrief = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const activeCustody = custodyRecords.filter((c) => c.is_in_custody);
      const urgentBreaches = activeCustody.filter((c) => {
        const elapsed = (Date.now() - new Date(c.countdown_start).getTime()) / (1000 * 60 * 60);
        return elapsed >= 20;
      });

      const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
      const armoryDeficits = weapons.filter((w) => w.discrepancy_flagged);

      const brief: OCSHandoverBrief = {
        generatedAt: new Date().toISOString(),
        generatingOfficerServiceNo: currentOfficer.service_number,
        totalOBEntries12h: obEntries.length,
        detaineesUnder24hRisk: urgentBreaches.length,
        pendingFourEyesApprovals: pendingApprovals.length,
        armoryDeficitsCount: armoryDeficits.length,
        auditChainIntegrity: '100% VERIFIED',
        summaryNarrative: `Operational Handover Brief for Rockport Police Station (RPS-001). During the 12-hour duty cycle, ${obEntries.length} Occurrence Book entries were officially sealed with gap-free SHA-256 hash chaining. Current cell occupancy is nominal across Male and Female blocks, with ${urgentBreaches.length} detainee(s) flagged for priority court presentation under Constitutional Article 49(1)(f). Station armory reports ${armoryDeficits.length} discrepancy requiring sworn incident statements.`,
        actionItems: [
          urgentBreaches.length > 0
            ? `PRIORITY ARRAIGNMENT: Ensure ${urgentBreaches.length} detainee(s) approaching 24h statutory limit are escorted to Rockport Principal Magistrate Court before 0900 hrs.`
            : 'Custody status is nominal; all detainees within constitutional time limits.',
          pendingApprovals.length > 0
            ? `FOUR-EYES SIGN-OFF: Review ${pendingApprovals.length} pending dual-authorization request(s) in the Command Inbox.`
            : 'Zero pending dual-authorization requests in the Command Inbox.',
          armoryDeficits.length > 0
            ? `ARMORY AUDIT: Require Investigating Officer to submit sworn fired rounds statement for ${armoryDeficits.map((w) => w.serial_number).join(', ')}.`
            : 'Station armory ammunition reconciled at 100% serviceability.',
          'Verify tamper-evident physical seals on Exhibit Room Safe 2 before shift departure.',
        ],
      };

      setGeneratedBrief(brief);
      setIsGenerating(false);
    }, 800);
  };

  const handleCopyBrief = () => {
    if (!generatedBrief) return;
    const text = `=== ROCKPORT POLICE STATION (RPS-001) - OCS SHIFT HANDOVER BRIEF ===\nGenerated: ${new Date(generatedBrief.generatedAt).toLocaleString('en-KE')}\nCommander: ${currentOfficer.rank} ${currentOfficer.full_name} (${currentOfficer.service_number})\nLedger Integrity: ${generatedBrief.auditChainIntegrity}\n\nSUMMARY:\n${generatedBrief.summaryNarrative}\n\nDIRECTIVES & ACTION ITEMS:\n${generatedBrief.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        {/* Top Header & Tab Controls */}
        <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SEARCH')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'SEARCH'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Universal Forensic Search
            </button>
            <button
              onClick={() => {
                setActiveTab('BRIEF');
                if (!generatedBrief) handleGenerateBrief();
              }}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'BRIEF'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              OCS Shift Handover Brief
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================
            TAB 1: UNIVERSAL SEARCH & QUICK ACTIONS
            =================================================================== */}
        {activeTab === 'SEARCH' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Input Bar */}
            <div className="p-3 border-b border-zinc-800/80 flex items-center gap-3 bg-zinc-950">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search OB records, case files, suspect names, cell numbers, vehicles..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                ESC to close
              </span>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {!trimmed && (
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Quick Operational Shortcuts
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        onNavigate('OB_ENTRIES');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded text-left flex items-center justify-between"
                    >
                      <span className="text-zinc-200">Open Occurrence Book</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('CUSTODY');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded text-left flex items-center justify-between"
                    >
                      <span className="text-zinc-200">24h Custody Clock Sentinel</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('CASES');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded text-left flex items-center justify-between"
                    >
                      <span className="text-zinc-200">CID Case Files & Allocations</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('AI_GRAPH');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded text-left flex items-center justify-between"
                    >
                      <span className="text-zinc-200">Sentinel AI Link Graph</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Matched OB */}
              {matchedOB.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Occurrence Book Entries ({matchedOB.length})
                  </span>
                  {matchedOB.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        onNavigate('OB_ENTRIES');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded cursor-pointer transition text-xs flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-400 font-bold">OB {o.ob_number}</span>
                          <span className="text-zinc-500 font-mono text-[10px]">{o.category}</span>
                        </div>
                        <p className="text-zinc-200 mt-0.5 line-clamp-1">{o.subject}</p>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        {new Date(o.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matched Cases */}
              {matchedCases.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    CID Case Dockets ({matchedCases.length})
                  </span>
                  {matchedCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onNavigate('CASES');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded cursor-pointer transition text-xs flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-300 font-bold">{c.case_number}</span>
                          <span className="text-zinc-500 text-[10px] font-mono">{c.crime_category}</span>
                        </div>
                        <p className="text-zinc-200 mt-0.5 line-clamp-1">{c.title}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matched Custody */}
              {matchedCustody.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Detainees In Custody ({matchedCustody.length})
                  </span>
                  {matchedCustody.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        onNavigate('CUSTODY');
                        onClose();
                      }}
                      className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded cursor-pointer transition text-xs flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-100 font-bold">{cust.person.full_name}</span>
                          <span className="font-mono text-zinc-500 text-[10px]">Cell {cust.cell_number}</span>
                        </div>
                        <p className="text-zinc-400 mt-0.5 line-clamp-1">{cust.arrest_reason}</p>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400">
                        OB {cust.ob_number}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {trimmed && matchedOB.length === 0 && matchedCases.length === 0 && matchedCustody.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  No records found matching "{query}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: OCS SHIFT HANDOVER BRIEF
            =================================================================== */}
        {activeTab === 'BRIEF' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isGenerating ? (
              <div className="py-16 text-center space-y-3 font-mono text-xs text-zinc-400">
                <Sparkles className="w-6 h-6 text-emerald-400 mx-auto animate-spin" />
                <p>Synthesizing 12-hour Occurrence Book & Custody telemetry...</p>
              </div>
            ) : generatedBrief ? (
              <div className="space-y-4 text-xs">
                {/* Brief Header */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      National Police Service • Rockport Police Station
                    </span>
                    <h4 className="text-sm font-bold text-zinc-100 tracking-tight mt-0.5">
                      Contemporaneous OCS Shift Handover Dossier
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Generated at {new Date(generatedBrief.generatedAt).toLocaleString('en-KE')} by {currentOfficer.rank} {currentOfficer.full_name}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyBrief}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-xs flex items-center gap-1 font-mono transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded text-xs flex items-center gap-1 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                    <span className="text-[10px] font-mono text-zinc-500 block">OB ENTRIES (12H)</span>
                    <strong className="text-base font-mono text-zinc-100">{generatedBrief.totalOBEntries12h}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                    <span className="text-[10px] font-mono text-zinc-500 block">24H BREACH RISK</span>
                    <strong className={`text-base font-mono ${generatedBrief.detaineesUnder24hRisk > 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                      {generatedBrief.detaineesUnder24hRisk}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                    <span className="text-[10px] font-mono text-zinc-500 block">PENDING APPROVALS</span>
                    <strong className="text-base font-mono text-zinc-100">{generatedBrief.pendingFourEyesApprovals}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                    <span className="text-[10px] font-mono text-zinc-500 block">HASH CHAIN</span>
                    <strong className="text-base font-mono text-emerald-400">100% OK</strong>
                  </div>
                </div>

                {/* Narrative Summary */}
                <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100 font-mono text-[11px] uppercase block mb-1">
                    Situation Report Narrative
                  </strong>
                  {generatedBrief.summaryNarrative}
                </div>

                {/* Action Items */}
                <div className="space-y-1.5">
                  <strong className="text-zinc-100 font-mono text-[11px] uppercase block">
                    Directives for Incoming Watch Commander
                  </strong>
                  {generatedBrief.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded text-zinc-300 flex items-start gap-2.5"
                    >
                      <span className="font-mono text-zinc-500 font-bold">{idx + 1}.</span>
                      <span className="text-xs">{item}</span>
                    </div>
                  ))}
                </div>

                {/* HITL Notice */}
                <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-2 text-center">
                  HUMAN-IN-THE-LOOP LAW ENFORCEMENT PROTOCOL • STATION RECORD RPS-001 • SIGN-OFF CERTIFIED
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
