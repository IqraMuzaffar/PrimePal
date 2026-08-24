# CareBot — HIPAA Compliance Notes

This document covers what the demo implementation gets right from a HIPAA/healthcare data perspective and what a production deployment would need to add before handling real patient PHI (Protected Health Information).

> **Important:** CareBot is a portfolio/demo project. It is NOT HIPAA-certified and must NOT be used to process real patient data without the production controls listed below.

---

## What the Demo Does Right

### Audit Logging
**Status: Done**

Every patient and staff action is recorded in the `audit_logs` table with:
- Timestamp (UTC)
- User type and user ID
- Action name (e.g., `book_appointment`, `chat_tool_call`, `cancel_appointment`)
- Resource identifier
- Details JSON

This satisfies the HIPAA requirement for access logs and audit controls (45 CFR § 164.312(b)). In production, this table should be append-only with no UPDATE or DELETE permissions for application-level users.

---

### Role-Based Access Control
**Status: Done**

Three distinct roles are enforced at the API level:
- **Patient** — can only access their own data via JWT claims
- **Staff (Receptionist)** — access to appointments and patient lookup
- **Staff (Admin)** — full admin dashboard, lab management, audit log
- **Staff (Lab Technician)** — lab order and result entry

All admin routes are protected by `get_current_staff` dependency. Patient routes verify `patient_id` matches the JWT subject. Cross-patient data access is blocked at the query level.

---

### AI Safety Guardrails
**Status: Done**

The AI system includes three safety layers:
1. **Emergency detection** — keywords like "chest pain", "can't breathe", "suicidal" trigger an immediate emergency services redirect instead of triage
2. **No-diagnosis rule** — Claude's system prompt explicitly prohibits diagnosing conditions; triage output always includes the disclaimer: *"This is AI triage, not a medical diagnosis. Please consult a doctor."*
3. **Scope restriction** — Claude is instructed to decline non-clinic requests and redirect to clinic staff for anything outside its defined tool set

---

### JWT Authentication
**Status: Done**

- Patient tokens: issued by the backend with `patient_id`, `clinic_id`, and expiry claims (PyJWT)
- Staff tokens: separate token with `staff_id`, `clinic_id`, and `role`
- Tokens are required on all non-public endpoints
- No cross-role token acceptance

---

## What Production Needs

### Encryption at Rest
**Status: Not implemented**

**Requirement:** PHI stored in PostgreSQL (patient demographics, diagnoses, prescriptions, lab results, chat messages) must be encrypted at rest.

**What to do:**
- Enable PostgreSQL Transparent Data Encryption (TDE) or use AWS RDS with encryption enabled
- Encrypt the `details` JSONB column in `audit_logs` if it contains PHI
- Use encrypted storage volumes (AWS EBS with KMS, or equivalent)
- Encrypt backup files

**Relevant regulation:** 45 CFR § 164.312(a)(2)(iv) — Encryption and Decryption

---

### Business Associate Agreement (BAA) with Cloud Providers
**Status: Not implemented**

**Requirement:** Any cloud provider (AWS, Azure, GCP, Heroku, Anthropic) that processes or stores PHI must sign a BAA with the covered entity.

**What to do:**
- Sign AWS HIPAA BAA (available for EC2, RDS, S3, CloudWatch, and other eligible services)
- Sign Anthropic BAA before sending real patient data to the Claude API — patient names, symptoms, and lab values sent to Claude are PHI
- Sign any email/SMS provider BAA (Twilio, SendGrid, etc.)
- Document all BAAs in the organization's vendor management records

**Note:** The Claude API terms of service do not currently include a BAA by default. This is the single most critical blocker for production use.

---

### PHI Retention and Deletion Policies
**Status: Not implemented**

**Requirement:** Patient records must be retained for the legally required period (typically 6 years from creation or last use under HIPAA; state law may require longer) and then securely deleted.

**What to do:**
- Add a `retention_expires_at` field to `patients`, `chat_sessions`, and `chat_messages` tables
- Build a scheduled job to soft-delete and then hard-delete records after the retention period
- Implement patient "right to access" export (provide a copy of all their data on request)
- Implement patient "right to delete" where legally permitted
- Document the retention schedule in a formal policy

---

### Penetration Testing and Security Audit
**Status: Not implemented**

**Requirement:** HIPAA requires administrative safeguards including regular security evaluation (45 CFR § 164.308(a)(8)).

**What to do:**
- Commission a third-party penetration test before launch
- Run OWASP Top 10 checks against the API (SQL injection, broken auth, SSRF, etc.)
- Audit JWT implementation for algorithm confusion attacks (verify `alg` header is validated)
- Check for insecure direct object reference (IDOR) on patient endpoints
- Implement rate limiting on login and chat endpoints to prevent credential stuffing
- Add Content Security Policy headers on the frontend

---

### Real SMS/Email Notifications
**Status: Not implemented (in-system notifications only)**

**Requirement:** Appointment reminders and prescription notifications sent via SMS or email must be transmitted securely and through BAA-covered providers.

**What to do:**
- Integrate a HIPAA-eligible SMS provider (Twilio with BAA, or equivalent)
- Integrate a HIPAA-eligible email provider (AWS SES with BAA, or SendGrid with BAA)
- Do not include PHI in SMS bodies — link to a secure patient portal instead
- Log all outbound notifications in the audit trail
- Implement opt-out handling for marketing communications (separate from clinical notifications)

---

### Password Hashing with bcrypt
**Status: Placeholder in demo — not production-ready**

The demo seed data uses `'$2b$12$placeholder_hash_for_demo'` as the password hash for all staff accounts. This means the actual bcrypt comparison in the login endpoint will fail against real passwords.

**What to do:**
- Replace seed data with properly hashed passwords using bcrypt (cost factor 12 minimum)
- Enforce minimum password complexity: 8+ characters, uppercase, lowercase, number, symbol
- Implement account lockout after 5 failed login attempts
- Add password reset via verified email (not SMS for admin accounts)
- Consider MFA (TOTP or hardware key) for admin and staff accounts

**Python command to generate a real hash:**
```python
import bcrypt
print(bcrypt.hashpw(b"YourPassword123!", bcrypt.gensalt(rounds=12)).decode())
```

---

### Additional Production Controls

| Control | Status | Notes |
|---------|--------|-------|
| HTTPS / TLS 1.3 | Not configured | Required for all PHI in transit. Use Let's Encrypt or ACM. |
| Database connection SSL | Not enforced | Add `sslmode=require` to DATABASE_URL |
| Secrets management | `.env` file | Use AWS Secrets Manager or HashiCorp Vault in production |
| Log access controls | Not configured | Audit logs must not be accessible to application-level DB users |
| Session timeout | Not implemented | Patient sessions should expire after 15 minutes of inactivity |
| Error message sanitization | Partial | Stack traces and SQL errors must not reach the client in production |
| Input validation | Partial | Full Pydantic validation exists; add max-length limits on free text to prevent injection |
| Dependency scanning | Not configured | Add Dependabot or `pip-audit` + `npm audit` to CI/CD |
| Incident response plan | None | HIPAA requires a documented breach notification procedure (45 CFR § 164.308(a)(6)) |

---

## Compliance Summary

| Requirement | Demo Status | Production Status |
|-------------|-------------|-------------------|
| Audit logging | Done | Needs append-only enforcement |
| Role-based access control | Done | Needs MFA for staff |
| AI safety guardrails | Done | Periodic review needed |
| JWT authentication | Done | Needs token revocation (blacklist) |
| Encryption at rest | Not implemented | Required before launch |
| BAA with cloud providers | Not implemented | Critical blocker |
| PHI retention policies | Not implemented | Required before launch |
| Penetration testing | Not implemented | Required before launch |
| Real SMS/email notifications | Not implemented | Required for patient comms |
| Password hashing (bcrypt) | Placeholder only | Fix before any real user accounts |
| HTTPS/TLS | Not configured | Required for all deployments |
| Secrets management | .env file | Upgrade to vault solution |
| Breach notification plan | None | HIPAA mandates 60-day notification |

---

## References

- HIPAA Security Rule: 45 CFR Part 164, Subpart C
- HHS Guidance on Cloud Computing: https://www.hhs.gov/hipaa/for-professionals/special-topics/cloud-computing/index.html
- Anthropic Usage Policy: https://www.anthropic.com/legal/usage-policy
- OWASP Healthcare Security: https://owasp.org/www-project-top-10/
