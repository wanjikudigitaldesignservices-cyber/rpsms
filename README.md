# Rockport Police Station Management System (RPSMS)
**Institutional Code:** `RPS-001` | **National Service:** Kenya Police Service (KPS)  
**Standard:** Zero-Trust Security Architecture, Kenya Data Protection Act 2019, Article 49 Compliance  

---

## System Overview
RPSMS is a production-grade, multi-station-ready Police Station Management System built for **Rockport Police Station**, featuring an immutable digital Occurrence Book (OB), four-eyes dual-authorization anti-corruption engine, mandatory TOTP hardware/app MFA, and strict PostgreSQL Row-Level Security (RLS) across all 34 normalized tables.

---

## Architecture & Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS 4, Lucide Icons, OTPAuth
- **Backend & Database:** Supabase (PostgreSQL 16, Auth, Storage, Edge Functions, Row-Level Security)
- **Security Engine:** SHA-256 Cryptographic Hash Chaining, Hardware/App TOTP MFA, 15-minute Session Timeout Policy, Blind-Index Search Hashes for Encrypted PII
- **Cashless Bail:** IntaSend M-Pesa Gateway integration (Zero cash handling policy)
- **CI/CD & Deployment:** GitHub Actions CI (`.github/workflows/ci.yml`), Vercel Preview Deployments (`vercel.json`)

---

## Zero-Trust Security & RBAC Matrix
Row-Level Security is strictly **ENABLED and FORCED** across all 34 database tables with a default-deny rule:

| System Role | Authority & Access Scope |
|---|---|
| **OCS (Super Admin)** | Station Commander. Onboards/suspends officers, assigns roles, approves sensitive operations, inspects station risk dashboard. |
| **Deputy OCS** | Second-in-Command. Operational authority across the station; cannot onboard officers or modify station settings. |
| **Duty Officer / OB Clerk** | Front desk inquiry. Logs digital OB entries, books in brought-in persons, captures mugshots and property intake. |
| **Investigating Officer (IO)** | Case investigations. Strict row-level isolation to assigned cases, evidence uploads, case notes, and court outcomes. |
| **Cell Sergeant** | Custody register. Controls cell allocation, monitors the 24-hour statutory countdown clock, prisoner welfare, and meals. |
| **Records Clerk** | Official records registry. Search and print official records. Strictly read-only; zero editing or deletion privileges. |
| **Auditor (IPOA / Oversight)** | Independent external oversight. Read-only station-wide access to audit logs, anomaly flags, and public complaints against the OCS. |
| **Admin Super-Owner** | Technical break-glass only. Zero access to operational case files or Occurrence Book records. Actions logged separately. |

---

## Anti-Corruption Engine
1. **Append-Only Occurrence Book:** Modification and deletion of OB entries are blocked by database triggers (`prevent_ob_entry_modification`). All corrections require linked amendment entries with mandatory justifications.
2. **Gap-Free Numbering & Cryptographic Chain:** Concurrency-safe OB numbering format `{seq}/{DD}/{MM}/{YYYY}` where each entry is SHA-256 hashed with the previous record's hash.
3. **Four-Eyes Dual Control:** Sensitive actions (role changes, amendments, discharges without charge) enforce `requested_by != approved_by` via database CHECK constraints and RLS policies.
4. **Complaint Routing Shield:** Complaints filed against the OCS are permanently suppressed from the OCS view and routed exclusively to independent oversight (Auditor).
5. **Immutable Hash-Chained Audit Log:** `UPDATE` and `DELETE` revoked at the database engine level. Stored procedure `verify_audit_log_chain(p_station_id)` verifies cryptographic integrity.

---

## Database Schema (34 Core Tables)
- `stations`, `officers`, `roles`, `officer_invites`, `ob_entries`, `ob_amendments`
- `persons`, `person_identifiers`, `mugshots`, `next_of_kin`
- `cells`, `custody_records`, `property_items`, `welfare_logs`, `visitor_logs`
- `cases`, `case_assignments`, `case_notes`, `evidence_items`, `evidence_transfers`
- `bail_records`, `payments`, `complaints`, `complaint_updates`
- `duty_roster`, `arms_register`, `vehicles`, `fuel_logs`
- `approvals`, `anomaly_flags`, `notifications`, `audit_log`, `station_setup_tokens`, `attachments`

---

## Verification & Test Commands
Run the automated test suites using the embedded PostgreSQL 16 WASM engine:

```bash
# 1. Typecheck and compile production bundle
npm run build

# 2. Verify all 5 database migrations & table definitions
npm run test:migrations

# 3. Run full 8-suite zero-trust RLS & anti-corruption tests (22/22 pass)
npm run verify:rls

# 4. Verify cryptographic SHA-256 audit log hash chain integrity
npm run verify:audit
```

---

## Local Development Server
```bash
npm install
npm run dev
```
Navigate to `http://127.0.0.1:5173/` to launch the OCS Admin Dashboard.
