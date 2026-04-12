# Maximum Intensity Audit - 2026-04-12

## Testing & QA Audit Pillar Findings

### TEST-01: Server-Side Request Forgery (SSRF)
- **Location**: `frontend/src/app/api/debug/route.ts`
- **Severity**: High
- **Description**: The `/api/debug` endpoint accepts a `path` query parameter which is directly appended to the `BACKEND_URL`. An attacker can use path traversal (e.g., `?path=../../admin/secret`) to access arbitrary endpoints on the backend API, potentially bypassing frontend restrictions or accessing internal-only diagnostics.
- **Recommendation**: Implement a strict allow-list of permitted paths or use a mapping of keys to paths instead of direct concatenation.

### TEST-02: ID Enumeration
- **Location**: `backend/src/routes/orders.ts`, `backend/src/routes/payments.ts`
- **Severity**: Low
- **Description**: Orders and payments use sequential integer IDs. This allows an attacker to enumerate existing orders and payments. Although access to specific details is guarded by phone number verification or user sessions, the predictability of IDs simplifies targeting and information gathering.
- **Recommendation**: Transition to UUIDs for public-facing identifiers.

### TEST-03: Honeypot Distribution
- **Location**: `frontend/src/app/` (multiple routes)
- **Severity**: Info
- **Description**: The application deploys several honeypot routes (e.g., `/backup.sql`, `/phpmyadmin`, `/wp-admin`) to distract and identify scanners/attackers.
- **Recommendation**: Ensure these routes are logged and integrated into an alerting system to identify active reconnaissance.

---
**Audit Status**: DONE
**Implementer**: OpenClaude (Testing & QA Audit Pillar)
