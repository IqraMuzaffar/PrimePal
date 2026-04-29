# Ticket 04: Dead Code Cleanup

**Priority:** 4
**Status:** TODO
**Impact:** Bloated codebase, confusing routing, unused dependencies

## Backend — Unused Dependencies (requirements.txt)

- [ ] `python-jose[cryptography]==3.3.0` (line 8) — never imported, PyJWT used instead
- [ ] `passlib[bcrypt]==1.7.4` (line 9) — never imported
- [ ] `sqlalchemy[asyncio]==2.0.30` (line 15) — models exist but never used
- [ ] `asyncpg==0.30.0` (line 16) — never imported
- [ ] `alembic==1.13.1` (line 17) — never imported, no migrations dir
- [ ] `qdrant-client==1.9.1` (line 24) — never imported
- [ ] `tiktoken==0.8.0` (line 37) — never imported
- [ ] `httpx==0.27.0` — duplicate entry (lines 40 and 48)

## Backend — Dead Files

- [ ] `backend/app/models/user.py` — SQLAlchemy model, never imported
- [ ] `backend/app/models/classroom.py` — SQLAlchemy model, never imported
- [ ] `backend/app/models/interaction.py` — SQLAlchemy model, never imported
- [ ] `backend/app/schemas/auth.py` — schemas never imported
- [ ] `backend/app/agents/tutor_agent/quest_generator.py` — stub, never imported
- [ ] `backend/app/agents/evaluator_agent/report_builder.py` — stub, never imported
- [ ] `backend/app/services/rag/__init__.py` — empty placeholder
- [ ] `backend/app/services/__init__.py` — empty placeholder

## Backend — Dead Code in Files

- [ ] `backend/app/utils/code_generation.py:66-98` — `validate_code_format()` and `extract_code_info()` never called
- [ ] `backend/app/api/v1/endpoints/auth.py:11,20` — `logging` imported but `logger` never used
- [ ] `backend/app/core/config.py:34` — `ACCESS_TOKEN_EXPIRE_MINUTES` never used (security.py has its own constant)

## Backend — TODO Comments

- [ ] `backend/app/agents/tutor_agent/quest_generator.py:8`
- [ ] `backend/app/agents/evaluator_agent/report_builder.py:8,13`
- [ ] `backend/app/api/v1/endpoints/tutor.py:14,20,26,32`

## Frontend — Dead Route Groups

- [ ] `frontend/app/(auth)/` — 3 files, duplicates of active auth routes
- [ ] `frontend/app/(student)/` — 10 files, duplicates of active student routes
- [ ] `frontend/app/(teacher)/` — 7 files, duplicates of active teacher routes
- [ ] `frontend/app/auth/` — 3 files, identical TODO stubs

## Frontend — Dead Files

- [ ] `frontend/lib/useProgressiveHydration.ts` — exported but never imported
- [ ] `frontend/lib/avatarGenerator.ts` — exported but never imported
- [ ] `frontend/components/student/AvatarShowcase.tsx` — marked "remove in production"
- [ ] `frontend/components/student/PrimePalAvatar.tsx` — only used by AvatarShowcase
- [ ] `frontend/app/student/quests/page.tsx` — empty TODO stub
- [ ] `frontend/app/(student)/quests/page.tsx` — empty TODO stub

## Frontend — Dead Imports

- [ ] `frontend/app/page.tsx:10` — unused `BarChart3` from lucide-react
- [ ] `frontend/app/admin/dashboard/hierarchy/page.tsx` — unused `ChevronDown` import

## Frontend — Misc

- [ ] `frontend/tailwind.config.ts:5` — unused content path `./pages/**/*`
- [ ] `frontend/app/globals.css` — dark mode CSS vars defined but never effective (all hardcoded Tailwind colors)
- [ ] `frontend/app/teacher/settings/page.tsx` — orphaned page, unreachable from nav
- [ ] `frontend/__tests__/classroom-settings.test.tsx` — stale test referencing removed features
- [ ] `@testing-library/react` in dependencies instead of devDependencies
