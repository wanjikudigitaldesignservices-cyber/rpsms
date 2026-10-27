import React from 'react';
import {
  BookOpen,
  UserPlus,
  Clock,
  Briefcase,
  Share2,
  Package,
  CreditCard,
  Crosshair,
  Users,
  CheckSquare,
  FileText,
  Shield,
  Settings,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { NavigationModule } from '../../types';

interface SidebarProps {
  activeTab: NavigationModule;
  onTabChange: (tab: NavigationModule) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  counts: {
    ob: number;
    custody: number;
    cases: number;
    exhibits: number;
    bail: number;
    officers: number;
    approvals: number;
    armoryDeficits: number;
    vehiclesOnPatrol: number;
    custodyBreachRisk: boolean;
  };
}

interface NavItem {
  id: NavigationModule;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeType?: 'neutral' | 'emerald' | 'amber' | 'red';
  isNew?: boolean;
}

interface NavSection {
  title: string;
  code: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  counts,
}) => {
  const sections: NavSection[] = [
    {
      title: 'FRONT DESK & CUSTODY',
      code: '01',
      items: [
        {
          id: 'OB_ENTRIES',
          label: 'Occurrence Book (OB)',
          shortLabel: 'OB',
          icon: BookOpen,
          badge: counts.ob,
          badgeType: 'neutral',
        },
        {
          id: 'BOOK_IN',
          label: 'Book-In Desk',
          shortLabel: 'Book-In',
          icon: UserPlus,
        },
        {
          id: 'CUSTODY',
          label: '24h Custody Sentinel',
          shortLabel: 'Custody',
          icon: Clock,
          badge: counts.custody > 0 ? counts.custody : undefined,
          badgeType: counts.custodyBreachRisk ? 'red' : 'neutral',
        },
      ],
    },
    {
      title: 'CID & INTELLIGENCE',
      code: '02',
      items: [
        {
          id: 'CASES',
          label: 'Case Files & Allocation',
          shortLabel: 'Cases',
          icon: Briefcase,
          badge: counts.cases,
          badgeType: 'neutral',
        },
        {
          id: 'AI_GRAPH',
          label: 'Sentinel AI Graph',
          shortLabel: 'AI Graph',
          icon: Share2,
          isNew: true,
          badge: 'AI',
          badgeType: 'emerald',
        },
        {
          id: 'EVIDENCE',
          label: 'Exhibits & Custody Chain',
          shortLabel: 'Exhibits',
          icon: Package,
          badge: counts.exhibits,
          badgeType: 'neutral',
        },
        {
          id: 'BAIL',
          label: 'Cashless Bail',
          shortLabel: 'Bail',
          icon: CreditCard,
          badge: counts.bail,
          badgeType: 'neutral',
        },
      ],
    },
    {
      title: 'TACTICAL ASSETS',
      code: '03',
      items: [
        {
          id: 'LOGISTICS',
          label: 'Armory & Fleet Register',
          shortLabel: 'Armory',
          icon: Crosshair,
          badge: counts.armoryDeficits > 0 ? 'DEFICIT' : undefined,
          badgeType: 'red',
        },
        {
          id: 'OFFICERS',
          label: 'Station Roster & Staff',
          shortLabel: 'Officers',
          icon: Users,
          badge: counts.officers,
          badgeType: 'neutral',
        },
      ],
    },
    {
      title: 'OCS COMMAND & GOVERNANCE',
      code: '04',
      items: [
        {
          id: 'APPROVALS',
          label: 'Four-Eyes Inbox',
          shortLabel: 'Approvals',
          icon: CheckSquare,
          badge: counts.approvals > 0 ? counts.approvals : undefined,
          badgeType: counts.approvals > 0 ? 'amber' : 'neutral',
        },
        {
          id: 'AUDIT',
          label: 'Cryptographic Audit',
          shortLabel: 'Audit',
          icon: FileText,
          badge: 'SHA-256',
          badgeType: 'neutral',
        },
        {
          id: 'ROLES',
          label: 'RBAC & RLS Matrix',
          shortLabel: 'RBAC',
          icon: Shield,
        },
        {
          id: 'SETTINGS',
          label: 'Station Configuration',
          shortLabel: 'Config',
          icon: Settings,
        },
        {
          id: 'SETUP',
          label: 'Bootstrap Authority',
          shortLabel: 'Setup',
          icon: KeyRound,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between transition-all duration-200 select-none shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Branding / Station Identifier */}
      <div className="h-14 px-3.5 border-b border-zinc-800/80 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 truncate">
            <img
              src="/crest.jpg"
              alt="Crest"
              className="w-7 h-7 rounded-sm object-cover border border-zinc-700 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-100 tracking-tight">RPSMS</span>
                <span className="text-[10px] font-mono text-zinc-400 px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded">
                  RPS-001
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 truncate">Rockport Central • NPS</p>
            </div>
          </div>
        ) : (
          <img
            src="/crest.jpg"
            alt="Crest"
            className="w-7 h-7 mx-auto rounded-sm object-cover border border-zinc-700"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2 scrollbar-thin scrollbar-thumb-zinc-800">
        {sections.map((sec) => (
          <div key={sec.code} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <span>{sec.title}</span>
                <span className="text-zinc-600 font-mono text-[9px]">{sec.code}</span>
              </div>
            )}

            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors group relative ${
                      isActive
                        ? 'bg-zinc-900 text-zinc-100 border-l-2 border-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span className="flex items-center gap-1.5 font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                        {item.badgeType === 'emerald' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        {item.badgeType === 'amber' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                        )}
                        {item.badgeType === 'red' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                        )}
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && item.badgeType === 'red' && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-2 border-t border-zinc-800/80 bg-zinc-950/60">
        {!isCollapsed ? (
          <div className="p-2 bg-zinc-900/70 border border-zinc-800/80 rounded-md text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Trust Active
              </span>
              <span className="font-mono text-[10px] text-emerald-400">RLS 34/34</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>LEDGER: CHAIN_OK</span>
              <span>v3.4.0</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" title="System Operational" />
          </div>
        )}
      </div>
    </aside>
  );
};
