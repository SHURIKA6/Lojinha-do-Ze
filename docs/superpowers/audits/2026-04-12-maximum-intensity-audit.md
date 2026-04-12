# Maximum Intensity Audit (MIA) - 2026-04-12

## Findings Log
| ID | Category | Risk Level | Description | PoC/Code Snippet | Recommendation |
|----|----------|------------|-------------|------------------|-----------------|
| SEC-01 | Security | Medium | Lack of Zod validation in login route. Manual checks are used instead of standard zod schemas. | `backend/src/routes/auth.ts:26` - `if (!email || !password)` | Implement `zValidator` with a dedicated login schema. |
| SEC-02 | Security | Low | Password hashing uses PBKDF2 instead of bcryptjs. | `backend/src/utils/crypto.ts:37` - `PBKDF2` implementation | Maintain PBKDF2 (it is secure) but update documentation to reflect actual implementation. |

