# Production Checklist

Pre-deployment verification checklist for PrimePal. Items are organized by category. Related audit tickets from `TICKETS/` are referenced where applicable.

## Secrets and Configuration

- [ ] Change `SECRET_KEY` from default `"change-me-in-production"` to a strong random value
- [ ] Change `STUDENT_JWT_SECRET` from default `"change-student-secret-in-production"` to a strong random value
- [ ] Set `APP_ENV` to `"production"`
- [ ] Rotate all Supabase keys (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) if they were previously exposed
- [ ] Rotate `OPENAI_API_KEY` if it was committed to version control
- [ ] Remove or restrict `.env` files from production filesystem -- use a secrets manager (AWS Secrets Manager, Vault, etc.)
- [ ] Verify `frontend/.env.local` does not contain `SUPABASE_SERVICE_ROLE_KEY` (frontend must only have anon key)
- [ ] Ensure `.env` files are excluded from Docker build context (check `.dockerignore`)

_Ref: TICKETS/05-SECURITY-HARDENING.md -- "Secrets on Disk"_

## CORS and URLs

- [ ] Set `ALLOWED_ORIGINS` to the production frontend URL(s) only -- never `["*"]`
- [ ] Set `NEXT_PUBLIC_API_URL` to the production backend URL
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for production Supabase project
- [ ] Verify no hardcoded `localhost` URLs remain in backend or frontend

_Ref: TICKETS/01-HARDCODED-URLS-AND-CORS.md_

## Database

- [ ] Run all Supabase migrations (`cd supabase && supabase db push`)
- [ ] Verify Row Level Security (RLS) policies are enabled on all tables
- [ ] Verify `snc_knowledge_base` table has pgvector extension and vector index
- [ ] Create database backups or verify Supabase automatic backup schedule
- [ ] Verify `DATABASE_URL` uses SSL (`?sslmode=require`)

## Authentication

- [ ] Verify Supabase GoTrue is configured for production (email confirmation, rate limits)
- [ ] Verify student JWT tokens have appropriate expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`)
- [ ] Test student PIN login flow end-to-end
- [ ] Test teacher email/password login flow end-to-end
- [ ] Test admin invite code flow end-to-end

## Security

- [ ] Add rate limiting to LLM-calling endpoints: `/chat`, `/missions/daily`, `/missions/pillar`, `/spelling-bee/words`, `/story-time/story`, `/speaking/prompts`, `/speaking/evaluate`, `/speaking/evaluate-pro`, `/announcements`
- [ ] Add file upload size limits to `/curriculum/upload` (PDF) and `/speaking/evaluate-pro`, `/missions/submit-speaking` (audio)
- [ ] Verify points updates use atomic operations (`increment_student_points` RPC) to prevent race conditions
- [ ] Sanitize error messages in admin endpoints -- do not expose `str(e)` to clients
- [ ] Verify `correct_answer` is stripped from all mission/evaluation question responses sent to students
- [ ] Review unauthenticated endpoints for data exposure: `/auth/classroom/{class_code}/avatars`, `/announcements/active/{classroom_id}`
- [ ] Consider hashing student PINs instead of storing/comparing in plaintext
- [ ] Verify frontend JWT decoding does not skip signature verification

_Ref: TICKETS/05-SECURITY-HARDENING.md_

## Performance

- [ ] Verify Redis is running and accessible from the backend
- [ ] Verify LLM response caching is working (check Redis key creation for missions, stories, spelling)
- [ ] Set Redis `maxmemory` and eviction policy for production workloads
- [ ] Verify Supabase client is cached as a module-level singleton (not re-created per request)
- [ ] Review N+1 query patterns in classroom and evaluator reports (should use batch `in_()` queries)
- [ ] Frontend: verify heavy libraries (jsPDF) use dynamic imports
- [ ] Frontend: verify all images use `next/image` for optimization

_Ref: TICKETS/07-OPTIMIZATION.md (DONE)_

## OpenAI Cost Controls

- [ ] Verify Redis caching is active for all LLM endpoints to prevent duplicate API calls
- [ ] Set appropriate cache TTLs (current defaults: missions 1h, profiles 5min, leaderboard 10min, daily plans 6h)
- [ ] Monitor OpenAI API usage dashboard after launch
- [ ] Consider setting OpenAI API spending limits
- [ ] Verify `CHAT_MODEL` is set to `gpt-4o-mini` (90% cheaper than gpt-4o) for non-critical completions

## Infrastructure

- [ ] Set up TLS/HTTPS termination (reverse proxy: Nginx, Caddy, or cloud load balancer)
- [ ] Configure Docker container restart policies (`restart: always`)
- [ ] Set up container health check monitoring (alert on unhealthy backend or Redis)
- [ ] Configure log aggregation (stdout from Docker containers)
- [ ] Set up Supabase webhook or monitoring for database health

## Data and Migrations

- [ ] Seed SNC topics table (`snc_topics`) with grade 1-5 topic data
- [ ] Seed achievements table with badge definitions
- [ ] Upload initial SNC curriculum PDFs via admin curriculum upload
- [ ] Verify evaluation questions are seeded for pre/post tests
- [ ] Create initial admin account (first admin must be manually inserted or created via Supabase dashboard)

## Smoke Tests

After deployment, verify these critical flows:

- [ ] `GET /health` returns 200
- [ ] Student login: enter class code, select avatar, enter PIN, receive JWT
- [ ] Student mission flow: GET `/missions/daily`, answer questions, POST `/missions/complete`
- [ ] Student chat: POST `/chat` with a message, receive bilingual reply
- [ ] Teacher login: email/password via Supabase auth
- [ ] Teacher dashboard: classroom list loads, student roster loads
- [ ] Teacher report: student insight report generates (LLM call succeeds)
- [ ] Admin: curriculum PDF upload triggers RAG pipeline (extract, chunk, embed)
- [ ] Admin: data export endpoints return CSV/JSON

## Mock Data Removal

- [ ] Verify no hardcoded mock data remains in API responses
- [ ] Verify all dashboard statistics come from real database queries (not static values)

_Ref: TICKETS/03-MOCK-DATA-REMOVAL.md_

## Ticket Status Reference

| Ticket | Status | Notes |
|--------|--------|-------|
| 01 - Hardcoded URLs and CORS | Partial | Frontend URLs fixed; backend CORS/Redis URL needs discussion |
| 02 - Broken Endpoints | Done | |
| 03 - Mock Data Removal | TODO | Needs discussion |
| 04 - Dead Code Cleanup | Done | |
| 05 - Security Hardening | TODO | Rate limiting, file size limits, PIN hashing, error sanitization |
| 06 - Frontend Bugs | Done | |
| 07 - Optimization | Done | Singleton client, N+1 fix, dynamic imports |
| 08 - Deprecations and Consistency | Done | |

## Post-Launch Monitoring

- [ ] Monitor OpenAI API costs daily for the first week
- [ ] Monitor Supabase database usage (connections, storage, bandwidth)
- [ ] Monitor Redis memory usage
- [ ] Watch for 5xx error rates in backend logs
- [ ] Track student login success/failure rates
