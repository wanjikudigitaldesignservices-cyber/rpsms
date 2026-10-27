import { useState, useEffect } from 'react';
import { 
  UserPlus
} from 'lucide-react';
import type { 
  Officer, 
  AuditLogEntry, 
  ApprovalRequest, 
  StationSettingsData, 
  RoleName,
  OBEntry,
  Person,
  Cell,
  CustodyRecord,
  PropertyItem,
  WelfareLog,
  ExitReason,
  CaseRecord,
  CaseNote,
  EvidenceItem,
  EvidenceTransfer,
  EvidenceStatus,
  BailRecord,
  CashlessPayment,
  ArmoryWeapon,
  PatrolVehicle,
  FuelLog,
  CaseStatus,
  NavigationModule
} from '@/types';
import { OfficerList } from '@/components/admin/OfficerList';
import { OfficerOnboardingModal } from '@/components/admin/OfficerOnboardingModal';
import { RolesPermissionsView } from '@/components/admin/RolesPermissionsView';
import { StationSettings } from '@/components/admin/StationSettings';
import { LiveAuditLogViewer } from '@/components/admin/LiveAuditLogViewer';
import { ApprovalsInbox } from '@/components/admin/ApprovalsInbox';
import { FirstRunSetup } from '@/components/admin/FirstRunSetup';
import { MfaSetupModal } from '@/components/admin/MfaSetupModal';
import { LoginPage } from '@/components/auth/LoginPage';

// Phase 2 Components
import { DigitalOccurrenceBook } from '@/components/ob/DigitalOccurrenceBook';
import { PersonBookInFlow } from '@/components/custody/PersonBookInFlow';
import { CustodyManagement } from '@/components/custody/CustodyManagement';
import { GlobalForensicSearch } from '@/components/search/GlobalForensicSearch';

// Phase 3 Components
import { CaseManagement } from '@/components/cases/CaseManagement';
import { EvidenceRegistry } from '@/components/evidence/EvidenceRegistry';
import { CashlessBailCheckout } from '@/components/bail/CashlessBailCheckout';
import { ArmoryAndVehicles } from '@/components/logistics/ArmoryAndVehicles';

// Palantir UI & Sentinel AI Suite Components
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { TerminalLockScreen } from '@/components/security/TerminalLockScreen';
import { PIIRevealModal } from '@/components/security/PIIRevealModal';
import { CommandCopilotModal } from '@/components/ai/CommandCopilotModal';
import { SentinelAIGraph } from '@/components/ai/SentinelAIGraph';

// Seed Data
import { 
  INITIAL_CELLS, 
  INITIAL_OB_ENTRIES, 
  INITIAL_PERSONS, 
  INITIAL_CUSTODY_RECORDS, 
  INITIAL_PROPERTY_ITEMS, 
  INITIAL_WELFARE_LOGS,
  INITIAL_CASES,
  INITIAL_CASE_NOTES,
  INITIAL_EVIDENCE_ITEMS,
  INITIAL_EVIDENCE_TRANSFERS,
  INITIAL_BAIL_RECORDS,
  INITIAL_PAYMENTS,
  INITIAL_ARMORY_WEAPONS,
  INITIAL_PATROL_VEHICLES,
  INITIAL_FUEL_LOGS
} from '@/lib/initialData';

const INITIAL_STATION: StationSettingsData = {
  id: 'a0000000-0000-0000-0000-000000000001',
  code: 'RPS-001',
  name: 'Rockport Police Station',
  county: 'Rockport County',
  sub_county: 'Central Sub-County',
  division: 'Rockport Central Division',
  phone: '+25420790100',
  email: 'inquiries@rockportpolice.go.ke',
  custody_clock_limit_hours: 24,
  custody_warning_threshold_1: 12,
  custody_warning_threshold_2: 20,
  ob_number_daily_reset: true,
  cashless_bail_account: 'PAYBILL-522123',
  require_mandatory_mfa: true,
  session_timeout_minutes: 15,
};

const INITIAL_OFFICERS: Officer[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-238914',
    full_name: 'Senior Supt. Joseph Mwangi',
    role_id: 'r0000000-0000-0000-0000-000000000001',
    role_name: 'OCS',
    rank: 'Senior Superintendent of Police',
    email: 'ocs.mwangi@rockportpolice.go.ke',
    phone_number: '+254711000001',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-241088',
    full_name: 'Chief Insp. David Otieno',
    role_id: 'r0000000-0000-0000-0000-000000000002',
    role_name: 'DEPUTY_OCS',
    rank: 'Chief Inspector',
    email: 'deputy.otieno@rockportpolice.go.ke',
    phone_number: '+254711000002',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-248901',
    full_name: 'Sgt. Peter Kamau',
    role_id: 'r0000000-0000-0000-0000-000000000003',
    role_name: 'DUTY_OFFICER_OB_CLERK',
    rank: 'Sergeant',
    email: 'duty.kamau@rockportpolice.go.ke',
    phone_number: '+254711000003',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-250122',
    full_name: 'Cpl. Grace Wambui',
    role_id: 'r0000000-0000-0000-0000-000000000004',
    role_name: 'INVESTIGATING_OFFICER',
    rank: 'Corporal',
    email: 'io.wambui@rockportpolice.go.ke',
    phone_number: '+254711000004',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-244519',
    full_name: 'Sgt. Hassan Abdi',
    role_id: 'r0000000-0000-0000-0000-000000000005',
    role_name: 'CELL_SERGEANT',
    rank: 'Sergeant',
    email: 'cell.abdi@rockportpolice.go.ke',
    phone_number: '+254711000005',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-253441',
    full_name: 'PC Brian Kiprono',
    role_id: 'r0000000-0000-0000-0000-000000000006',
    role_name: 'RECORDS_CLERK',
    rank: 'Police Constable',
    email: 'records.kiprono@rockportpolice.go.ke',
    phone_number: '+254711000006',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    station_id: INITIAL_STATION.id,
    service_number: 'IPOA-00412',
    full_name: 'Mercy Chebet',
    role_id: 'r0000000-0000-0000-0000-000000000007',
    role_name: 'AUDITOR',
    rank: 'Senior Oversight Inspector',
    email: 'auditor.chebet@ipoa.go.ke',
    phone_number: '+254711000007',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000018',
    station_id: INITIAL_STATION.id,
    service_number: 'ODPP-88219',
    full_name: 'SC Anthony Wakoli',
    role_id: 'DPP',
    role_name: 'DPP',
    rank: 'Senior State Counsel (ODPP Liaison)',
    email: 'prosecutions.wakoli@odpp.go.ke',
    phone_number: '+254711000018',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: false,
    last_login_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    station_id: INITIAL_STATION.id,
    service_number: 'LQD-TECH-01',
    full_name: 'Antigravity Engineer (Break-Glass)',
    role_id: 'r0000000-0000-0000-0000-000000000008',
    role_name: 'ADMIN_SUPER_OWNER',
    rank: 'Technical Lead',
    email: 'ops@lqdcreatives.com',
    phone_number: '+254711000008',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
];

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    station_id: INITIAL_STATION.id,
    seq_number: 1,
    action_type: 'STATION_GENESIS',
    table_name: 'stations',
    actor_service_number: 'SYSTEM',
    actor_role: 'ADMIN_SUPER_OWNER',
    ip_address: '127.0.0.1',
    previous_log_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    log_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    recorded_at: '2026-10-27T00:00:00Z',
    justification: 'Station genesis initialization for Rockport Police Station (RPS-001)',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    station_id: INITIAL_STATION.id,
    seq_number: 2,
    action_type: 'OCS_BOOTSTRAP',
    table_name: 'officers',
    actor_service_number: 'KPS-238914',
    actor_role: 'OCS',
    ip_address: '10.0.0.1',
    previous_log_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    log_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    recorded_at: '2026-10-27T00:05:00Z',
    justification: 'One-time setup secret redeemed. Station Commander account activated.',
  },
];

const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: 'app-000001',
    station_id: INITIAL_STATION.id,
    action_type: 'ROLE_CHANGE',
    target_resource_type: 'officers',
    target_resource_id: '00000000-0000-0000-0000-000000000003',
    requested_by: '00000000-0000-0000-0000-000000000001',
    requester_name: 'Senior Supt. Joseph Mwangi',
    requester_service_number: 'KPS-238914',
    requested_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    justification: 'Promotion of Sgt. Peter Kamau to Senior Duty Watch Commander.',
    status: 'PENDING',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationModule>('OB_ENTRIES');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Justification-Gated PII Reveal State
  const [piiModalConfig, setPiiModalConfig] = useState<{
    isOpen: boolean;
    targetField: string;
    targetSubject: string;
    onSuccess?: () => void;
  }>({
    isOpen: false,
    targetField: '',
    targetSubject: '',
  });

  // Core Data State
  const [officers, setOfficers] = useState<Officer[]>(INITIAL_OFFICERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [stationSettings, setStationSettings] = useState<StationSettingsData>(INITIAL_STATION);
  const [isSetupComplete, setIsSetupComplete] = useState(true);

  // Phase 2 Data State
  const [obEntries, setObEntries] = useState<OBEntry[]>(INITIAL_OB_ENTRIES);
  const [persons, setPersons] = useState<Person[]>(INITIAL_PERSONS);
  const [cells, setCells] = useState<Cell[]>(INITIAL_CELLS);
  const [custodyRecords, setCustodyRecords] = useState<CustodyRecord[]>(INITIAL_CUSTODY_RECORDS);
  const [propertyItems, setPropertyItems] = useState<PropertyItem[]>(INITIAL_PROPERTY_ITEMS);
  const [welfareLogs, setWelfareLogs] = useState<WelfareLog[]>(INITIAL_WELFARE_LOGS);

  // Phase 3 Data State
  const [cases, setCases] = useState<CaseRecord[]>(INITIAL_CASES);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>(INITIAL_CASE_NOTES);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(INITIAL_EVIDENCE_ITEMS);
  const [evidenceTransfers, setEvidenceTransfers] = useState<EvidenceTransfer[]>(INITIAL_EVIDENCE_TRANSFERS);
  const [bailRecords, setBailRecords] = useState<BailRecord[]>(INITIAL_BAIL_RECORDS);
  const [payments, setPayments] = useState<CashlessPayment[]>(INITIAL_PAYMENTS);
  const [weapons, setWeapons] = useState<ArmoryWeapon[]>(INITIAL_ARMORY_WEAPONS);
  const [vehicles, setVehicles] = useState<PatrolVehicle[]>(INITIAL_PATROL_VEHICLES);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(INITIAL_FUEL_LOGS);

  // Preselected OB Entry for direct Book-In navigation
  const [preselectedOBForBookIn, setPreselectedOBForBookIn] = useState<OBEntry | null>(null);

  // Global Forensic Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active session state (Deny by default)
  const [activeOfficerId, setActiveOfficerId] = useState<string>('');
  const activeOfficer = officers.find((o) => o.id === activeOfficerId) || officers[0];
  const activeRole: RoleName = activeOfficer?.role_name || 'DUTY_OFFICER_OB_CLERK';

  // Authentication & RLS & Neon session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [, setCsrfToken] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isMfaOpen, setIsMfaOpen] = useState<boolean>(false);

  // Live session timeout countdown (15 min)
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  const resetSessionTimer = () => setSecondsRemaining(15 * 60);

  // Check active server session on mount (GET /api/auth/me)
  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setActiveOfficerId(data.user.id);
            setCsrfToken(data.csrfToken || '');
            setIsAuthenticated(true);
            if (data.isLocked) {
              setIsTerminalLocked(true);
            }
            resetSessionTimer();
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }
    verifySession();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isTerminalLocked) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsAuthenticated(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isAuthenticated, isTerminalLocked]);

  // Global Hotkeys: Ctrl+K (Copilot) & Ctrl+L (Walk-Away Lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsTerminalLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PII Unmasking Audit Handler (KDPA Sec 41 Compliance)
  const handleConfirmPIIReveal = (reason: string, notes: string) => {
    appendAuditLog(
      'READ_SENSITIVE_PII',
      `Officer unmasked protected PII for ${piiModalConfig.targetSubject} (${piiModalConfig.targetField}). Statutory purpose: ${reason}. Justification: ${notes}`,
      'privacy_unmask_logs',
      crypto.randomUUID()
    );
    if (piiModalConfig.onSuccess) {
      piiModalConfig.onSuccess();
    }
  };

  const handleLoginSuccess = (officer: Officer, token: string) => {
    setActiveOfficerId(officer.id);
    setCsrfToken(token);
    setIsAuthenticated(true);
    resetSessionTimer();
    appendAuditLog(
      'OFFICER_AUTHENTICATED',
      `Officer ${officer.full_name} (${officer.service_number}) authenticated via Hardware/App TOTP MFA.`,
      'officers',
      officer.id
    );
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    appendAuditLog(
      'OFFICER_LOGGED_OUT',
      `Officer ${activeOfficer.full_name} (${activeOfficer.service_number}) terminated terminal session.`,
      'officers',
      activeOfficer.id
    );
    setIsAuthenticated(false);
    setActiveOfficerId('');
    setCsrfToken('');
  };

  // Helper to chain a new audit log record
  const appendAuditLog = (action: string, justification: string, tableName?: string, recordId?: string) => {
    const lastLog = auditLogs[auditLogs.length - 1];
    const newSeq = auditLogs.length + 1;
    const prevHash = lastLog ? lastLog.log_hash : '0000000000000000000000000000000000000000000000000000000000000000';

    const raw = `${newSeq}:${action}:${activeOfficer.service_number}:${prevHash}:${justification}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0') + 'b8f920bc4d81e35a9012';

    const newLog: AuditLogEntry = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      seq_number: newSeq,
      action_type: action,
      table_name: tableName,
      record_id: recordId,
      actor_id: activeOfficer.id,
      actor_service_number: activeOfficer.service_number,
      actor_role: activeOfficer.role_name,
      ip_address: '10.0.0.12',
      previous_log_hash: prevHash,
      log_hash: hex,
      recorded_at: new Date().toISOString(),
      justification,
    };

    setAuditLogs((prev) => [...prev, newLog]);
  };

  /* =========================================================================
     PHASE 2 HANDLERS: OB, CUSTODY, BOOK-IN, PROPERTY, WELFARE, SEARCH
     ========================================================================= */

  // 1. Add OB Entry
  const handleAddOBEntry = (newEntry: OBEntry) => {
    setObEntries((prev) => [...prev, newEntry]);
    appendAuditLog(
      'OB_ENTRY_CREATED',
      `Occurrence Book entry sealed: OB No. ${newEntry.ob_number} (${newEntry.category}) - ${newEntry.subject}`,
      'ob_entries',
      newEntry.id
    );
  };

  // 2. Submit Linked OB Amendment (Creates Four-Eyes Approval)
  const handleSubmitOBAmendment = ({
    obEntryId,
    amendmentObNumber,
    reason,
    amendmentNarrative,
  }: {
    obEntryId: string;
    amendmentObNumber: string;
    reason: string;
    amendmentNarrative: string;
    entryHash: string;
  }) => {
    const originalOB = obEntries.find((o) => o.id === obEntryId);

    const newApproval: ApprovalRequest = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      action_type: 'OB_AMENDMENT',
      target_resource_type: 'ob_entries',
      target_resource_id: obEntryId,
      requested_by: activeOfficer.id,
      requester_name: activeOfficer.full_name,
      requester_service_number: activeOfficer.service_number,
      requested_at: new Date().toISOString(),
      justification: `Formal OB Amendment (${amendmentObNumber}) for ${originalOB?.ob_number}: Reason: ${reason} | Narrative: ${amendmentNarrative}`,
      status: 'PENDING',
    };

    setApprovals((prev) => [newApproval, ...prev]);

    setObEntries((prev) =>
      prev.map((o) => (o.id === obEntryId ? { ...o, is_amended: true, status: 'AMENDED' } : o))
    );

    appendAuditLog(
      'OB_AMENDMENT_PROPOSED',
      `Four-Eyes amendment authorization requested for ${originalOB?.ob_number} by ${activeOfficer.service_number}`,
      'ob_amendments',
      newApproval.id
    );
  };

  // 3. Navigate from OB entry to Book-In Flow
  const handleNavigateToBookInFromOB = (obEntry: OBEntry) => {
    setPreselectedOBForBookIn(obEntry);
    setActiveTab('BOOK_IN');
  };

  // 4. Complete Person Book-In Flow
  const handleCompleteBookIn = ({
    person,
    custodyRecord,
    propertyItems: newProps,
  }: {
    person: Person;
    custodyRecord: CustodyRecord;
    propertyItems: PropertyItem[];
  }) => {
    setPersons((prev) => {
      const exists = prev.find((p) => p.id === person.id);
      if (exists) {
        return prev.map((p) => (p.id === person.id ? person : p));
      }
      return [person, ...prev];
    });

    setCustodyRecords((prev) => [custodyRecord, ...prev]);

    if (newProps.length > 0) {
      setPropertyItems((prev) => [...newProps, ...prev]);
    }

    setCells((prev) =>
      prev.map((cell) =>
        cell.cell_number === custodyRecord.cell_number
          ? { ...cell, current_occupants: cell.current_occupants + 1 }
          : cell
      )
    );

    appendAuditLog(
      'PERSON_BOOKED_INTO_CUSTODY',
      `Detainee ${person.full_name} lodged into Cell ${custodyRecord.cell_number} under OB ${custodyRecord.ob_number}. 24-Hour Constitutional clock activated.`,
      'custody_records',
      custodyRecord.id
    );

    setPreselectedOBForBookIn(null);
    setActiveTab('CUSTODY');
  };

  // 5. Complete Custody Exit / Discharge
  const handleCompleteCustodyExit = ({
    custodyRecordId,
    exitReason,
    notes,
    requiresFourEyes,
  }: {
    custodyRecordId: string;
    exitReason: ExitReason;
    notes: string;
    requiresFourEyes?: boolean;
  }) => {
    const targetCustody = custodyRecords.find((c) => c.id === custodyRecordId);
    if (!targetCustody) return;

    if (exitReason === 'RELEASED_WITHOUT_CHARGE' || requiresFourEyes) {
      const newApproval: ApprovalRequest = {
        id: crypto.randomUUID(),
        station_id: stationSettings.id,
        action_type: 'RELEASE_WITHOUT_CHARGE',
        target_resource_type: 'custody_records',
        target_resource_id: custodyRecordId,
        requested_by: activeOfficer.id,
        requester_name: activeOfficer.full_name,
        requester_service_number: activeOfficer.service_number,
        requested_at: new Date().toISOString(),
        justification: `Release without charge for ${targetCustody.person.full_name} (${targetCustody.ob_number}): ${notes}`,
        status: 'PENDING',
      };

      setApprovals((prev) => [newApproval, ...prev]);

      appendAuditLog(
        'RELEASE_WITHOUT_CHARGE_REQUESTED',
        `Four-Eyes authorization requested by ${activeOfficer.service_number} to discharge detainee without charge: ${notes}`,
        'approvals',
        newApproval.id
      );
      return;
    }

    setCustodyRecords((prev) =>
      prev.map((c) =>
        c.id === custodyRecordId
          ? {
              ...c,
              is_in_custody: false,
              exit_time: new Date().toISOString(),
              exit_reason: exitReason,
              exit_notes: notes,
              exit_authorized_by: activeOfficer.id,
              exit_authorized_by_service_no: activeOfficer.service_number,
            }
          : c
      )
    );

    setCells((prev) =>
      prev.map((cell) =>
        cell.cell_number === targetCustody.cell_number
          ? { ...cell, current_occupants: Math.max(0, cell.current_occupants - 1) }
          : cell
      )
    );

    appendAuditLog(
      'CUSTODY_DISCHARGED',
      `Detainee ${targetCustody.person.full_name} discharged from Cell ${targetCustody.cell_number} under grounds: ${exitReason}. Notes: ${notes}`,
      'custody_records',
      custodyRecordId
    );
  };

  // 6. Property Register Handlers
  const handleAddPropertyItem = (newItem: PropertyItem) => {
    setPropertyItems((prev) => [newItem, ...prev]);
    setCustodyRecords((prev) =>
      prev.map((c) =>
        c.id === newItem.custody_record_id ? { ...c, property_items_count: c.property_items_count + 1 } : c
      )
    );
    appendAuditLog(
      'PROPERTY_ITEM_INTAKE',
      `Property intake: ${newItem.item_description} (${newItem.category}) logged by ${activeOfficer.service_number}`,
      'property_items',
      newItem.id
    );
  };

  const handleReturnPropertyItem = (itemId: string, unreturnedReason?: string) => {
    setPropertyItems((prev) =>
      prev.map((p) =>
        p.id === itemId
          ? {
              ...p,
              status: unreturnedReason ? 'UNRETURNED_FLAGGED' : 'RETURNED',
              return_time: new Date().toISOString(),
              returned_by_service_no: activeOfficer.service_number,
              unreturned_reason: unreturnedReason,
            }
          : p
      )
    );
    appendAuditLog(
      'PROPERTY_ITEM_RETURNED',
      `Property return logged for item ID ${itemId} by ${activeOfficer.service_number}. Reason/Notes: ${unreturnedReason || 'Returned in full'}`,
      'property_items',
      itemId
    );
  };

  // 7. Welfare Log Handlers
  const handleAddWelfareLog = (newLog: WelfareLog) => {
    setWelfareLogs((prev) => [newLog, ...prev]);
    setCustodyRecords((prev) =>
      prev.map((c) =>
        c.id === newLog.custody_record_id ? { ...c, welfare_logs_count: c.welfare_logs_count + 1 } : c
      )
    );
    appendAuditLog(
      'WELFARE_EVENT_LOGGED',
      `Welfare logged: ${newLog.log_type} for custody ${newLog.custody_record_id} by ${activeOfficer.service_number}`,
      'welfare_logs',
      newLog.id
    );
  };

  // 8. Global Forensic Search Query Audit Logging
  const handleLogAuditSearch = (searchQuery: string, resultCount: number) => {
    appendAuditLog(
      'FORENSIC_SEARCH_QUERY',
      `KDPA Section 41 Audited Query: Officer executed forensic search for term: "${searchQuery}". Returned ${resultCount} matching records.`,
      'audit_log'
    );
  };

  /* =========================================================================
     PHASE 3 HANDLERS: CASES, EVIDENCE, CASHLESS BAIL, ARMORY & LOGISTICS
     ========================================================================= */

  // 1. Cases Handlers
  const handleCreateCase = (newCase: CaseRecord) => {
    setCases((prev) => [newCase, ...prev]);
    appendAuditLog(
      'CASE_REGISTERED',
      `Formal CID case file opened: ${newCase.case_number} (${newCase.crime_category}) linked to OB ${newCase.ob_number}`,
      'cases',
      newCase.id
    );
  };

  const handleAssignIO = ({
    caseId,
    ioId,
    ioName,
    ioServiceNo,
    method,
    overrideReason,
  }: {
    caseId: string;
    ioId: string;
    ioName: string;
    ioServiceNo: string;
    method: 'RANDOM_FAIR' | 'OCS_OVERRIDE';
    overrideReason?: string;
  }) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: 'ASSIGNED',
              assigned_io_id: ioId,
              assigned_io_name: ioName,
              assigned_io_service_no: ioServiceNo,
              assigned_at: new Date().toISOString(),
              assignment_method: method,
              ocs_override_reason: overrideReason,
            }
          : c
      )
    );

    appendAuditLog(
      method === 'RANDOM_FAIR' ? 'IO_ASSIGNED_RANDOM_FAIR' : 'IO_ASSIGNED_OCS_OVERRIDE',
      `Case ${caseId} assigned to ${ioName} (${ioServiceNo}) via ${method}.${overrideReason ? ` Reason: ${overrideReason}` : ''}`,
      'cases',
      caseId
    );
  };

  const handleAddCaseNote = (newNote: CaseNote) => {
    setCaseNotes((prev) => [newNote, ...prev]);
    setCases((prev) =>
      prev.map((c) =>
        c.id === newNote.case_id ? { ...c, notes_count: c.notes_count + 1 } : c
      )
    );
    appendAuditLog(
      'CASE_NOTE_RECORDED',
      `Investigation note (${newNote.note_type}) added to Case ${newNote.case_id} by ${newNote.author_service_no}`,
      'case_notes',
      newNote.id
    );
  };

  const handleUpdateCaseStatus = (caseId: string, status: CaseStatus) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status } : c))
    );
    appendAuditLog(
      'CASE_STATUS_UPDATED',
      `Case ${caseId} status updated to ${status} by ${activeOfficer.service_number}`,
      'cases',
      caseId
    );
  };

  // 2. Evidence Handlers
  const handleAddEvidence = (newEvidence: EvidenceItem) => {
    setEvidenceItems((prev) => [newEvidence, ...prev]);
    setCases((prev) =>
      prev.map((c) =>
        c.id === newEvidence.case_id ? { ...c, evidence_count: c.evidence_count + 1 } : c
      )
    );
    appendAuditLog(
      'EXHIBIT_REGISTERED',
      `Exhibit ${newEvidence.exhibit_number} (${newEvidence.category}) sealed with QR ${newEvidence.qr_code_identifier}. Custodian: ${newEvidence.current_custodian_service_no}`,
      'evidence_items',
      newEvidence.id
    );
  };

  const handleTransferEvidence = (
    transfer: EvidenceTransfer,
    updatedStatus: EvidenceStatus,
    newLocation?: string
  ) => {
    setEvidenceTransfers((prev) => [transfer, ...prev]);
    setEvidenceItems((prev) =>
      prev.map((e) =>
        e.id === transfer.evidence_id
          ? {
              ...e,
              current_custodian_id: transfer.transferred_to_id,
              current_custodian_name: transfer.transferred_to_name,
              current_custodian_service_no: transfer.transferred_to_service_no,
              status: updatedStatus,
              storage_location: newLocation || e.storage_location,
              transfers_count: e.transfers_count + 1,
            }
          : e
      )
    );
    appendAuditLog(
      'EXHIBIT_CUSTODY_TRANSFERRED',
      `Exhibit custody transferred from ${transfer.transferred_from_service_no} to ${transfer.transferred_to_service_no}. Reason: ${transfer.transfer_reason}`,
      'evidence_transfers',
      transfer.id
    );
  };

  const handleRequestDisposal = (evidenceId: string, courtOrderRef: string, reason: string) => {
    const item = evidenceItems.find((e) => e.id === evidenceId);
    const newApproval: ApprovalRequest = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      action_type: 'EVIDENCE_DISPOSAL',
      target_resource_type: 'evidence_items',
      target_resource_id: evidenceId,
      requested_by: activeOfficer.id,
      requester_name: activeOfficer.full_name,
      requester_service_number: activeOfficer.service_number,
      requested_at: new Date().toISOString(),
      justification: `Court-ordered disposal request for Exhibit ${item?.exhibit_number} under Court Order Ref: ${courtOrderRef}. Justification: ${reason}`,
      status: 'PENDING',
    };

    setApprovals((prev) => [newApproval, ...prev]);
    setEvidenceItems((prev) =>
      prev.map((e) =>
        e.id === evidenceId
          ? { ...e, status: 'DISPOSAL_PENDING_APPROVAL', court_order_ref: courtOrderRef }
          : e
      )
    );
    appendAuditLog(
      'EXHIBIT_DISPOSAL_REQUESTED',
      `Four-Eyes disposal authorization requested for ${item?.exhibit_number}. Court Order: ${courtOrderRef}`,
      'approvals',
      newApproval.id
    );
  };

  // 3. Cashless Bail Handlers
  const handleProcessPayment = (payment: CashlessPayment, updatedBail: BailRecord) => {
    setPayments((prev) => [payment, ...prev]);
    setBailRecords((prev) =>
      prev.map((b) => (b.id === updatedBail.id ? updatedBail : b))
    );
    appendAuditLog(
      'CASHLESS_BAIL_SETTLED',
      `Cashless bail of KES ${payment.amount} settled via ${payment.gateway} (M-Pesa: ${payment.mpesa_receipt_number}, Txn: ${payment.transaction_reference}) for detainee ${updatedBail.detainee_name} (OB ${updatedBail.ob_number}). Credited to Paybill 522123.`,
      'payments',
      payment.id
    );
  };

  const handleRequestBailWaiver = (bailId: string, reason: string) => {
    const bail = bailRecords.find((b) => b.id === bailId);
    const newApproval: ApprovalRequest = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      action_type: 'BAIL_WAIVER',
      target_resource_type: 'bail_records',
      target_resource_id: bailId,
      requested_by: activeOfficer.id,
      requester_name: activeOfficer.full_name,
      requester_service_number: activeOfficer.service_number,
      requested_at: new Date().toISOString(),
      justification: `Article 49 indigent bail waiver request for ${bail?.detainee_name} (OB ${bail?.ob_number}): ${reason}`,
      status: 'PENDING',
    };

    setApprovals((prev) => [newApproval, ...prev]);
    setBailRecords((prev) =>
      prev.map((b) =>
        b.id === bailId ? { ...b, status: 'WAIVER_REQUESTED', waiver_reason: reason } : b
      )
    );
    appendAuditLog(
      'BAIL_WAIVER_REQUESTED',
      `Indigent bail waiver routed for OCS Four-Eyes authorization: ${bail?.detainee_name}. Grounds: ${reason}`,
      'approvals',
      newApproval.id
    );
  };

  const handleCreateBailRecord = (newBail: BailRecord) => {
    setBailRecords((prev) => [newBail, ...prev]);
    appendAuditLog(
      'BAIL_RECORD_CREATED',
      `Police cash bail set at KES ${newBail.amount} for detainee ${newBail.detainee_name} (OB ${newBail.ob_number})`,
      'bail_records',
      newBail.id
    );
  };

  // 4. Logistics & Armory Handlers
  const handleIssueWeapon = (
    weaponId: string,
    officerId: string,
    officerName: string,
    serviceNo: string,
    rounds: number
  ) => {
    setWeapons((prev) =>
      prev.map((w) =>
        w.id === weaponId
          ? {
              ...w,
              status: 'ISSUED',
              issued_to_officer_id: officerId,
              issued_to_officer_name: officerName,
              issued_to_service_no: serviceNo,
              issued_at: new Date().toISOString(),
              issued_rounds: rounds,
              returned_rounds: 0,
              armorer_service_no: activeOfficer.service_number,
              shift_end_reconciled: false,
              discrepancy_flagged: false,
            }
          : w
      )
    );
    appendAuditLog(
      'WEAPON_ISSUED_SHIFT',
      `Firearm ${weaponId} issued to ${officerName} (${serviceNo}) with ${rounds} live rounds by Armorer ${activeOfficer.service_number}`,
      'armory_weapons',
      weaponId
    );
  };

  const handleReturnWeapon = (
    weaponId: string,
    returnedRounds: number,
    justification?: string
  ) => {
    const targetWeapon = weapons.find((w) => w.id === weaponId);
    const deficit = targetWeapon ? targetWeapon.issued_rounds - returnedRounds : 0;
    const hasAnomaly = deficit > 0 && !justification;

    setWeapons((prev) =>
      prev.map((w) =>
        w.id === weaponId
          ? {
              ...w,
              status: 'IN_ARMORY',
              returned_rounds: returnedRounds,
              returned_at: new Date().toISOString(),
              shift_end_reconciled: true,
              discrepancy_flagged: hasAnomaly || (deficit > 0 && !justification),
            }
          : w
      )
    );

    if (deficit > 0) {
      appendAuditLog(
        'ARMORY_AMMUNITION_DEFICIT',
        `AMMUNITION RECONCILIATION: ${deficit} rounds expended/missing for ${targetWeapon?.weapon_type} (S/N: ${targetWeapon?.serial_number}). Fired rounds report: ${justification || 'CRITICAL: NO REPORT FILED - ANOMALY FLAGGED'}`,
        'armory_weapons',
        weaponId
      );
    } else {
      appendAuditLog(
        'WEAPON_RETURNED_RECONCILED',
        `Firearm ${targetWeapon?.serial_number} returned with 100% round reconciliation (${returnedRounds}/${targetWeapon?.issued_rounds} rounds verified)`,
        'armory_weapons',
        weaponId
      );
    }
  };

  const handleLogFuel = (newLog: FuelLog, updatedMileage: number) => {
    setFuelLogs((prev) => [newLog, ...prev]);
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === newLog.vehicle_id ? { ...v, current_mileage: updatedMileage } : v
      )
    );
    appendAuditLog(
      'VEHICLE_FUELED',
      `Fuel consumption recorded for ${newLog.vehicle_reg}: ${newLog.fuel_litres}L (KES ${newLog.cost_kes}) at Odo ${newLog.mileage_at_fueling} KM. Station: ${newLog.fuel_station} (Rec: ${newLog.receipt_number})`,
      'fuel_logs',
      newLog.id
    );
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: PatrolVehicle['status']) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status } : v))
    );
    appendAuditLog(
      'VEHICLE_STATUS_CHANGED',
      `Vehicle ${vehicleId} dispatch status updated to ${status} by ${activeOfficer.service_number}`,
      'patrol_vehicles',
      vehicleId
    );
  };

  // Approvals Inbox Handlers (Four-Eyes dual controls)
  const handleApproveApproval = (approvalId: string, notes: string) => {
    const targetApproval = approvals.find((a) => a.id === approvalId);

    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'APPROVED',
              approved_by: activeOfficer.id,
              approver_name: activeOfficer.full_name,
              approved_at: new Date().toISOString(),
            }
          : a
      )
    );

    // If approval is for RELEASE_WITHOUT_CHARGE, finalize detainee release
    if (targetApproval?.action_type === 'RELEASE_WITHOUT_CHARGE') {
      setCustodyRecords((prev) =>
        prev.map((c) =>
          c.id === targetApproval.target_resource_id
            ? {
                ...c,
                is_in_custody: false,
                exit_time: new Date().toISOString(),
                exit_reason: 'RELEASED_WITHOUT_CHARGE',
                exit_notes: `Four-Eyes release approved by ${activeOfficer.full_name}: ${notes}`,
                exit_authorized_by: activeOfficer.id,
                exit_authorized_by_service_no: activeOfficer.service_number,
              }
            : c
        )
      );

      const dischargedCustody = custodyRecords.find((c) => c.id === targetApproval.target_resource_id);
      if (dischargedCustody) {
        setCells((prev) =>
          prev.map((cell) =>
            cell.cell_number === dischargedCustody.cell_number
              ? { ...cell, current_occupants: Math.max(0, cell.current_occupants - 1) }
              : cell
          )
        );
      }
    }

    // If approval is for EVIDENCE_DISPOSAL
    if (targetApproval?.action_type === 'EVIDENCE_DISPOSAL') {
      setEvidenceItems((prev) =>
        prev.map((e) =>
          e.id === targetApproval.target_resource_id
            ? { ...e, status: 'DISPOSED' }
            : e
        )
      );
    }

    // If approval is for BAIL_WAIVER
    if (targetApproval?.action_type === 'BAIL_WAIVER') {
      setBailRecords((prev) =>
        prev.map((b) =>
          b.id === targetApproval.target_resource_id
            ? {
                ...b,
                status: 'WAIVED',
                waiver_approved_by: activeOfficer.id,
                waiver_approval_id: approvalId,
              }
            : b
        )
      );
    }

    appendAuditLog(
      'FOUR_EYES_APPROVED',
      `Four-eyes authorization granted by ${activeOfficer.service_number} for request ${approvalId}. Notes: ${notes || 'Verified compliant'}`,
      'approvals',
      approvalId
    );
  };

  const handleRejectApproval = (approvalId: string, reason: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'REJECTED',
              approved_by: activeOfficer.id,
              approver_name: activeOfficer.full_name,
              approved_at: new Date().toISOString(),
              rejection_reason: reason,
            }
          : a
      )
    );
    appendAuditLog(
      'APPROVAL_REJECTED',
      `Four-eyes authorization declined by ${activeOfficer.service_number}: ${reason}`,
      'approvals',
      approvalId
    );
  };

  // Staff handlers
  const handleOnboardOfficer = (newOfficer: Officer) => {
    setOfficers((prev) => [newOfficer, ...prev]);
    appendAuditLog(
      'OFFICER_INVITED',
      `OCS generated 48h onboarding invite for ${newOfficer.full_name} (${newOfficer.service_number})`,
      'officers',
      newOfficer.id
    );
  };

  const handleSuspendOfficer = (officerId: string, reason: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, status: 'SUSPENDED', is_active: false } : o))
    );
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'OFFICER_SUSPENDED',
      `Officer ${target?.full_name} (${target?.service_number}) suspended by OCS. Reason: ${reason}`,
      'officers',
      officerId
    );
  };

  const handleReactivateOfficer = (officerId: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, status: 'ACTIVE', is_active: true } : o))
    );
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'OFFICER_REACTIVATED',
      `Officer ${target?.full_name} (${target?.service_number}) restored to active duty`,
      'officers',
      officerId
    );
  };

  const handleRevokeSession = (officerId: string) => {
    appendAuditLog(
      'SESSION_REVOKED',
      `Active JWT and TOTP session killed by OCS for officer ${officerId}`,
      'officers',
      officerId
    );
  };

  const handleRequestRoleChange = (officerId: string) => {
    const target = officers.find((o) => o.id === officerId);
    const newReq: ApprovalRequest = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      action_type: 'ROLE_CHANGE',
      target_resource_type: 'officers',
      target_resource_id: officerId,
      requested_by: activeOfficer.id,
      requester_name: activeOfficer.full_name,
      requester_service_number: activeOfficer.service_number,
      requested_at: new Date().toISOString(),
      justification: `Requested role escalation review for ${target?.full_name} (${target?.service_number})`,
      status: 'PENDING',
    };
    setApprovals((prev) => [newReq, ...prev]);
    appendAuditLog(
      'APPROVAL_REQUESTED',
      `Role change request submitted for ${target?.service_number}`,
      'approvals',
      newReq.id
    );
    setActiveTab('APPROVALS');
  };

  const handleSaveSettings = (updated: StationSettingsData, justification: string) => {
    setStationSettings(updated);
    appendAuditLog('STATION_CONFIG_UPDATED', justification, 'stations', updated.id);
  };

  const handleCompleteSetup = (token: string, ocsEmail: string): boolean => {
    if (token === 'ROCKPORT-OCS-INITIAL-SETUP-SECRET-2026') {
      setIsSetupComplete(true);
      appendAuditLog(
        'OCS_BOOTSTRAP',
        `First-run setup token successfully redeemed for ${ocsEmail}. Setup route permanently locked.`,
        'station_setup_tokens'
      );
      return true;
    }
    return false;
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300 font-mono text-xs">
        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-100 font-bold uppercase tracking-widest text-[11px]">
          Verifying Station Security Session...
        </div>
        <div className="text-slate-500 text-[10px] mt-1">
          Zero-Trust Server Gate Active • Kenya Police Service
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} availableOfficers={officers} />;
  }

  const MODULE_NAMES: Record<NavigationModule, string> = {
    OB_ENTRIES: 'Occurrence Book (OB)',
    BOOK_IN: 'Detainee Book-In Desk',
    CUSTODY: '24h Custody Sentinel',
    CASES: 'CID Case Files & Allocation',
    AI_GRAPH: 'Sentinel Criminal Intelligence Graph',
    EVIDENCE: 'Exhibits & Custody Chain',
    BAIL: 'Cashless Bail Desk',
    LOGISTICS: 'Armory & Fleet Dispatch',
    OFFICERS: 'Station Roster & Personnel',
    APPROVALS: 'Four-Eyes Approvals Inbox',
    AUDIT: 'Audit Trail',
    ROLES: 'Roles & Access',
    SETTINGS: 'Station Parameters',
    SETUP: 'Authority Setup',
  };

  const activeInCustodyCount = custodyRecords.filter((c) => c.is_in_custody).length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const armoryDiscrepancies = weapons.filter(
    (w) => w.discrepancy_flagged || (w.status === 'ISSUED' && !w.shift_end_reconciled)
  ).length;
  const vehiclesOnPatrol = vehicles.filter((v) => v.status === 'PATROL').length;
  const custodyBreachRisk = custodyRecords.some((c) => {
    if (!c.is_in_custody) return false;
    const hours = (Date.now() - new Date(c.book_in_time).getTime()) / (1000 * 60 * 60);
    return hours >= 20;
  });

  const sidebarCounts = {
    ob: obEntries.length,
    custody: activeInCustodyCount,
    cases: cases.length,
    exhibits: evidenceItems.length,
    bail: bailRecords.length,
    officers: officers.length,
    approvals: pendingApprovalsCount,
    armoryDeficits: armoryDiscrepancies,
    vehiclesOnPatrol: vehiclesOnPatrol,
    custodyBreachRisk: custodyBreachRisk,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Institutional Top Header */}
      <TopHeader
        activeOfficer={activeOfficer}
        secondsRemaining={secondsRemaining}
        onResetTimer={resetSessionTimer}
        onOpenCommandSearch={() => setIsCopilotOpen(true)}
        onLockTerminal={async () => {
          try {
            await fetch('/api/auth/lock', { method: 'POST', credentials: 'include' });
          } catch {}
          setIsTerminalLocked(true);
        }}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        activeModuleName={MODULE_NAMES[activeTab] || 'Station Command'}
      />

      {/* Session Inactivity Timeout Warning Banner (<= 60s) */}
      {isAuthenticated && !isTerminalLocked && secondsRemaining <= 60 && secondsRemaining > 0 && (
        <div className="bg-amber-950/90 border-b border-amber-600/60 px-4 py-2 flex items-center justify-between text-xs font-mono text-amber-200 z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>SESSION TIMEOUT WARNING: Terminal session will automatically terminate in {secondsRemaining} seconds due to inactivity.</span>
          </div>
          <button
            onClick={resetSessionTimer}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded text-xs transition"
          >
            Extend Session (+15m)
          </button>
        </div>
      )}

      {/* Main Container: Collapsible Sidebar + Content Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Palantir-Grade Left Command Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            resetSessionTimer();
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          activeRole={activeRole}
          counts={sidebarCounts}
        />

        {/* Tactical Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Module 1: Digital Occurrence Book */}
            {activeTab === 'OB_ENTRIES' && (
              <DigitalOccurrenceBook
                entries={obEntries}
                activeOfficer={activeOfficer}
                onAddEntry={handleAddOBEntry}
                onSubmitAmendment={handleSubmitOBAmendment}
                onNavigateToBookIn={handleNavigateToBookInFromOB}
              />
            )}

            {/* Module 2: Custody & 24h Clock */}
            {activeTab === 'CUSTODY' && (
              <CustodyManagement
                custodyRecords={custodyRecords}
                cells={cells}
                propertyItems={propertyItems}
                welfareLogs={welfareLogs}
                activeOfficer={activeOfficer}
                onNavigateToBookIn={() => setActiveTab('BOOK_IN')}
                onCompleteExit={handleCompleteCustodyExit}
                onAddPropertyItem={handleAddPropertyItem}
                onReturnPropertyItem={handleReturnPropertyItem}
                onAddWelfareLog={handleAddWelfareLog}
              />
            )}

            {/* Module 3: Person Book-In Flow */}
            {activeTab === 'BOOK_IN' && (
              <PersonBookInFlow
                activeOfficer={activeOfficer}
                cells={cells}
                obEntries={obEntries}
                existingPersons={persons}
                preselectedOBEntry={preselectedOBForBookIn}
                onCancel={() => {
                  setPreselectedOBForBookIn(null);
                  setActiveTab('CUSTODY');
                }}
                onCompleteBookIn={handleCompleteBookIn}
              />
            )}

            {/* Module 4: CID Case Management */}
            {activeTab === 'CASES' && (
              <CaseManagement
                cases={cases}
                notes={caseNotes}
                obEntries={obEntries}
                officers={officers}
                activeOfficer={activeOfficer}
                onCreateCase={handleCreateCase}
                onAssignIO={handleAssignIO}
                onAddNote={handleAddCaseNote}
                onUpdateCaseStatus={handleUpdateCaseStatus}
              />
            )}

            {/* Module 5: Sentinel AI Graph View */}
            {activeTab === 'AI_GRAPH' && (
              <SentinelAIGraph
                cases={cases}
                obEntries={obEntries}
                currentOfficer={activeOfficer}
                onNavigateToCase={(_caseId) => {
                  setActiveTab('CASES');
                }}
              />
            )}

            {/* Module 6: Evidence Store & Cryptographic QR */}
            {activeTab === 'EVIDENCE' && (
              <EvidenceRegistry
                evidenceItems={evidenceItems}
                transfers={evidenceTransfers}
                cases={cases}
                activeOfficers={officers}
                currentOfficer={activeOfficer}
                onAddEvidence={handleAddEvidence}
                onTransferEvidence={handleTransferEvidence}
                onRequestDisposal={handleRequestDisposal}
              />
            )}

            {/* Module 7: Cashless Bail Desk */}
            {activeTab === 'BAIL' && (
              <CashlessBailCheckout
                bailRecords={bailRecords}
                payments={payments}
                custodyRecords={custodyRecords}
                currentOfficer={activeOfficer}
                onProcessPayment={handleProcessPayment}
                onRequestWaiver={handleRequestBailWaiver}
                onCreateBailRecord={handleCreateBailRecord}
              />
            )}

            {/* Module 8: Armory & Patrol Fleet */}
            {activeTab === 'LOGISTICS' && (
              <ArmoryAndVehicles
                weapons={weapons}
                vehicles={vehicles}
                fuelLogs={fuelLogs}
                activeOfficers={officers}
                currentOfficer={activeOfficer}
                onIssueWeapon={handleIssueWeapon}
                onReturnWeapon={handleReturnWeapon}
                onLogFuel={handleLogFuel}
                onUpdateVehicleStatus={handleUpdateVehicleStatus}
              />
            )}

            {/* Module 9: Staff Directory */}
            {activeTab === 'OFFICERS' && (
              <div className="space-y-4">
                {activeRole === 'OCS' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsOnboardingOpen(true)}
                      className="flex items-center gap-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-2 text-xs font-medium transition"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Onboard Officer</span>
                    </button>
                  </div>
                )}
                <OfficerList
                  officers={officers}
                  onSuspend={handleSuspendOfficer}
                  onReactivate={handleReactivateOfficer}
                  onRevokeSession={handleRevokeSession}
                  onRequestRoleChange={handleRequestRoleChange}
                  activeRole={activeRole}
                />
              </div>
            )}

            {/* Module 10: Four-Eyes Approvals */}
            {activeTab === 'APPROVALS' && (
              <ApprovalsInbox
                approvals={approvals}
                onApprove={handleApproveApproval}
                onReject={handleRejectApproval}
                activeOfficerId={activeOfficer.id}
                activeRole={activeRole}
              />
            )}

            {/* Module 11: Immutable Audit Log */}
            {activeTab === 'AUDIT' && (
              <LiveAuditLogViewer
                auditLogs={auditLogs}
                stationId={stationSettings.id}
              />
            )}

            {/* Module 12: RBAC Matrix */}
            {activeTab === 'ROLES' && <RolesPermissionsView />}

            {/* Module 13: Station Settings */}
            {activeTab === 'SETTINGS' && (
              <StationSettings
                settings={stationSettings}
                onSave={handleSaveSettings}
                activeRole={activeRole}
              />
            )}

            {/* Module 14: First Run Bootstrap */}
            {activeTab === 'SETUP' && (
              <FirstRunSetup
                isSetupComplete={isSetupComplete}
                onCompleteSetup={handleCompleteSetup}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <CommandCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        obEntries={obEntries}
        cases={cases}
        custodyRecords={custodyRecords}
        officers={officers}
        approvals={approvals}
        weapons={weapons}
        currentOfficer={activeOfficer}
        onNavigate={(mod) => {
          setActiveTab(mod as NavigationModule);
          setIsCopilotOpen(false);
        }}
      />

      <TerminalLockScreen
        isLocked={isTerminalLocked}
        activeOfficer={activeOfficer}
        onUnlock={() => {
          setIsTerminalLocked(false);
          resetSessionTimer();
        }}
        onLogout={handleLogout}
      />

      <PIIRevealModal
        isOpen={piiModalConfig.isOpen}
        onClose={() => setPiiModalConfig((prev) => ({ ...prev, isOpen: false }))}
        targetField={piiModalConfig.targetField}
        targetSubject={piiModalConfig.targetSubject}
        currentOfficer={activeOfficer}
        onConfirmReveal={handleConfirmPIIReveal}
      />

      <GlobalForensicSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        obEntries={obEntries}
        persons={persons}
        custodyRecords={custodyRecords}
        officers={officers}
        activeOfficer={activeOfficer}
        onSelectResult={(type, _id) => {
          setIsSearchOpen(false);
          if (type === 'OB') setActiveTab('OB_ENTRIES');
          else if (type === 'CUSTODY' || type === 'PERSON') setActiveTab('CUSTODY');
          else if (type === 'OFFICER') setActiveTab('OFFICERS');
        }}
        onLogAuditSearch={handleLogAuditSearch}
      />

      <OfficerOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOnboard={handleOnboardOfficer}
        stationId={stationSettings.id}
      />

      <MfaSetupModal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        onMfaActivated={() => {
          setOfficers((prev) =>
            prev.map((o) => (o.id === activeOfficer.id ? { ...o, mfa_enabled: true } : o))
          );
          appendAuditLog(
            'MFA_ACTIVATED',
            `Mandatory TOTP MFA activated for officer ${activeOfficer.service_number}`,
            'officers',
            activeOfficer.id
          );
        }}
        serviceNumber={activeOfficer.service_number}
      />
    </div>
  );
}

export default App;
