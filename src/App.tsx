import { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  CheckSquare, 
  FileText, 
  Settings, 
  KeyRound, 
  ShieldCheck, 
  Clock, 
  UserPlus, 
  LogOut, 
  Database, 
  BookOpen, 
  Search 
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
  ExitReason
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
import { RlsStatusModal } from '@/components/admin/RlsStatusModal';

// Phase 2 Components
import { DigitalOccurrenceBook } from '@/components/ob/DigitalOccurrenceBook';
import { PersonBookInFlow } from '@/components/custody/PersonBookInFlow';
import { CustodyManagement } from '@/components/custody/CustodyManagement';
import { GlobalForensicSearch } from '@/components/search/GlobalForensicSearch';

// Seed Data
import { 
  INITIAL_CELLS, 
  INITIAL_OB_ENTRIES, 
  INITIAL_PERSONS, 
  INITIAL_CUSTODY_RECORDS, 
  INITIAL_PROPERTY_ITEMS, 
  INITIAL_WELFARE_LOGS 
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
  const [activeTab, setActiveTab] = useState<
    'OB_ENTRIES' | 'CUSTODY' | 'BOOK_IN' | 'OFFICERS' | 'APPROVALS' | 'AUDIT' | 'ROLES' | 'SETTINGS' | 'SETUP'
  >('OB_ENTRIES');

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

  // Preselected OB Entry for direct Book-In navigation
  const [preselectedOBForBookIn, setPreselectedOBForBookIn] = useState<OBEntry | null>(null);

  // Global Forensic Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active session state (Default OCS)
  const [activeOfficerId, setActiveOfficerId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const activeOfficer = officers.find((o) => o.id === activeOfficerId) || officers[0];
  const activeRole: RoleName = activeOfficer.role_name;

  // Authentication & RLS session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isRlsOpen, setIsRlsOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isMfaOpen, setIsMfaOpen] = useState<boolean>(false);

  // Live session timeout countdown (15 min)
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K to open Forensic Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetSessionTimer = () => setSecondsRemaining(15 * 60);

  const handleLoginSuccess = (officer: Officer) => {
    setActiveOfficerId(officer.id);
    setIsAuthenticated(true);
    resetSessionTimer();
    appendAuditLog(
      'OFFICER_AUTHENTICATED',
      `Officer ${officer.full_name} (${officer.service_number}) authenticated via Hardware/App TOTP MFA.`,
      'officers',
      officer.id
    );
  };

  const handleLogout = () => {
    appendAuditLog(
      'OFFICER_LOGGED_OUT',
      `Officer ${activeOfficer.full_name} (${activeOfficer.service_number}) terminated terminal session.`,
      'officers',
      activeOfficer.id
    );
    setIsAuthenticated(false);
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

    // Create Four-Eyes Approval Request
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

    // Mark original OB as under amendment review
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
    setPersons((prev) => [person, ...prev]);
    setCustodyRecords((prev) => [custodyRecord, ...prev]);
    setPropertyItems((prev) => [...newProps, ...prev]);

    // Increment cell occupants
    setCells((prev) =>
      prev.map((c) => (c.id === custodyRecord.cell_id ? { ...c, current_occupants: c.current_occupants + 1 } : c))
    );

    appendAuditLog(
      'PERSON_BOOKED_IN',
      `Detainee ${person.full_name} booked into Cell ${custodyRecord.cell_number}. Article 49 24-hour countdown engaged.`,
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
    requiresFourEyes: boolean;
  }) => {
    const targetCustody = custodyRecords.find((c) => c.id === custodyRecordId);
    if (!targetCustody) return;

    if (requiresFourEyes) {
      // Create Four-Eyes Approval Request
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

    // Direct release (Bail, Charged to Court, Hospital, Transfer)
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

    // Decrement cell occupants
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
    // Increment count on custody record
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

  // Approvals Inbox Handlers
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
      `Suspension ordered for ${target?.full_name} (${target?.service_number}): ${reason}`,
      'officers',
      officerId
    );
  };

  const handleReactivateOfficer = (officerId: string, reason: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, status: 'ACTIVE', is_active: true } : o))
    );
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'OFFICER_REACTIVATED',
      `Reactivation authorized for ${target?.full_name} (${target?.service_number}): ${reason}`,
      'officers',
      officerId
    );
  };

  const handleRevokeSession = (officerId: string, reason: string) => {
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'SESSION_REVOKED',
      `Remote terminal session invalidated for ${target?.full_name} (${target?.service_number}): ${reason}`,
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

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} availableOfficers={officers} />;
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const activeInCustodyCount = custodyRecords.filter((c) => c.is_in_custody).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Institutional Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Station Identity & Crest */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/crest.jpg"
                alt="Rockport Police Crest"
                className="h-10 w-10 rounded-full border border-amber-500/80 object-cover shadow-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">
                  Rockport Police Station
                </h1>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded">
                  RPS-001
                </span>
                <span className="hidden sm:inline bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 px-1.5 py-0.2 text-[10px] font-mono rounded">
                  KENYA POLICE SERVICE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Occurrence Book Management & Anti-Corruption Security Core
              </p>
            </div>
          </div>

          {/* Right Session Controls & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Forensic Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              title="Forensic Universal Search across all registers (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Search Registers...</span>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-900 border border-slate-700 px-1 rounded">
                Ctrl+K
              </span>
            </button>

            {/* Live Session Timer */}
            <div 
              onClick={resetSessionTimer} 
              title="Click to reset 15-minute activity timer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 cursor-pointer hover:border-slate-700"
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Session: </span>
              <strong className={secondsRemaining < 180 ? 'text-red-400' : 'text-emerald-400'}>
                {formatCountdown(secondsRemaining)}
              </strong>
            </div>

            {/* Active Officer Identity Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{activeOfficer.full_name}</div>
                <div className="text-[10px] font-mono text-amber-400 flex items-center justify-end gap-1">
                  <span>{activeOfficer.service_number}</span>
                  <span className="text-slate-500">•</span>
                  <span>{activeOfficer.role_name}</span>
                </div>
              </div>

              {/* Role Switcher for verification */}
              <select
                value={activeOfficerId}
                onChange={(e) => {
                  setActiveOfficerId(e.target.value);
                  resetSessionTimer();
                }}
                title="Switch active logged-in officer profile (To verify RLS & permissions)"
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.role_name}: {o.full_name.split(' ')[0]} ({o.service_number})
                  </option>
                ))}
              </select>
            </div>

            {/* RLS Status Inspector Button */}
            <button
              onClick={() => setIsRlsOpen(true)}
              className="flex items-center gap-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/50 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition-colors"
              title="Inspect PostgreSQL Row-Level Security Status across all 34 tables"
            >
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">RLS Active (34/34)</span>
            </button>

            {/* MFA Setup Trigger */}
            <button
              onClick={() => setIsMfaOpen(true)}
              className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 p-1.5 text-slate-300 hover:text-white transition-colors"
              title="Configure Mandatory TOTP MFA"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 p-1.5 text-red-400 hover:text-red-200 transition-colors"
              title="Sign Out of Police Terminal Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {/* 1. Digital Occurrence Book (OB) */}
            <button
              onClick={() => setActiveTab('OB_ENTRIES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'OB_ENTRIES'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Occurrence Book ({obEntries.length})</span>
            </button>

            {/* 2. Custody & 24h Clock */}
            <button
              onClick={() => setActiveTab('CUSTODY')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors relative ${
                activeTab === 'CUSTODY'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Custody & 24h Clock</span>
              {activeInCustodyCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'CUSTODY' ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-red-500 text-white font-bold'
                }`}>
                  {activeInCustodyCount}
                </span>
              )}
            </button>

            {/* 3. Book-In Desk */}
            <button
              onClick={() => setActiveTab('BOOK_IN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'BOOK_IN'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Book-In Desk</span>
            </button>

            {/* 4. Officers & Staff */}
            <button
              onClick={() => setActiveTab('OFFICERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'OFFICERS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Officers ({officers.length})</span>
            </button>

            {/* 5. Four-Eyes Approvals */}
            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors relative ${
                activeTab === 'APPROVALS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Four-Eyes Inbox</span>
              {pendingApprovalsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'APPROVALS' ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-amber-500 text-slate-950 font-bold'
                }`}>
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* 6. Immutable Audit Log */}
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Audit Ledger</span>
            </button>

            {/* 7. RBAC Matrix */}
            <button
              onClick={() => setActiveTab('ROLES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'ROLES'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>RBAC</span>
            </button>

            {/* 8. Station Settings */}
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'SETTINGS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

            {/* 9. First-Run Setup */}
            <button
              onClick={() => setActiveTab('SETUP')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'SETUP'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Bootstrap</span>
            </button>
          </nav>

          {/* Contextual Action Button */}
          {activeTab === 'OFFICERS' && activeRole === 'OCS' && (
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-2 rounded bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 transition-colors shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Onboard Officer</span>
            </button>
          )}
        </div>

        {/* View Switcher based on Active Tab */}
        <main>
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

          {/* Module 3: Custody & 24h Clock */}
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

          {/* Module 2: Person Book-In Flow */}
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

          {/* Staff Directory */}
          {activeTab === 'OFFICERS' && (
            <OfficerList
              officers={officers}
              onSuspend={handleSuspendOfficer}
              onReactivate={handleReactivateOfficer}
              onRevokeSession={handleRevokeSession}
              onRequestRoleChange={handleRequestRoleChange}
              activeRole={activeRole}
            />
          )}

          {/* Four-Eyes Approvals */}
          {activeTab === 'APPROVALS' && (
            <ApprovalsInbox
              approvals={approvals}
              onApprove={handleApproveApproval}
              onReject={handleRejectApproval}
              activeOfficerId={activeOfficer.id}
              activeRole={activeRole}
            />
          )}

          {/* Immutable Audit Log */}
          {activeTab === 'AUDIT' && (
            <LiveAuditLogViewer
              auditLogs={auditLogs}
              stationId={stationSettings.id}
            />
          )}

          {/* RBAC Matrix */}
          {activeTab === 'ROLES' && <RolesPermissionsView />}

          {/* Station Settings */}
          {activeTab === 'SETTINGS' && (
            <StationSettings
              settings={stationSettings}
              onSave={handleSaveSettings}
              activeRole={activeRole}
            />
          )}

          {/* First Run Bootstrap */}
          {activeTab === 'SETUP' && (
            <FirstRunSetup
              isSetupComplete={isSetupComplete}
              onCompleteSetup={handleCompleteSetup}
            />
          )}
        </main>
      </div>

      {/* Global Forensic Search Modal */}
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

      {/* Onboarding Modal */}
      <OfficerOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOnboard={handleOnboardOfficer}
        stationId={stationSettings.id}
      />

      {/* MFA Modal */}
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

      {/* RLS Inspector Modal */}
      <RlsStatusModal
        isOpen={isRlsOpen}
        onClose={() => setIsRlsOpen(false)}
        activeRole={activeRole}
        activeServiceNumber={activeOfficer.service_number}
      />
    </div>
  );
}

export default App;
