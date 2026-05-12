# Listening Module Performance Optimization

**Date:** 2026-05-12
**Status:** Approved

## Problem

The Listening module has 3-20 second perceived load times due to:
- LLM generation on cache miss (4-15s, up to 60s with fallback chain)
- Browser TTS voice initialization per component (1s fallback timer)
- No prefetching of pillar data from dashboard
- No pre-synthesis of upcoming question audio

## Changes

### Frontend

#### 1. Global Voice Preloader (VoiceProvider)
- Create `VoiceContext` + `VoiceProvider` wrapping the student layout
- On mount, call `speechSynthesis.getVoices()` and select the `en-IN` voice (fallback to any `en-*`)
- Expose `{ voice, voicesReady, speak(text, rate?) }` via context
- Update `AudioPlayButton`, `spelling-bee/page.tsx`, `story-time/page.tsx` to consume the context instead of initializing voices independently
- Eliminates: 1s fallback timer per component, redundant voice lookups

#### 2. Audio Pre-synthesis in MissionGameplay
- When rendering question N, look ahead to question N+1
- If N+1 has `audio_text`, call `speak()` with volume 0 (or use SpeechSynthesis to queue and immediately cancel after synthesis starts) to warm the browser cache
- Use `useEffect` triggered on `currentQuestionIndex` change
- Eliminates: 2-3s audio synthesis delay between questions

#### 3. Prefetch Pillar Data from Missions Dashboard
- In missions dashboard page, call `queryClient.prefetchQuery` for all 4 pillars on mount
- Uses existing `queryKeys.missionPillar(pillar)` and `studentFetch`
- Data is cached in React Query (5min staleTime already set)
- Eliminates: full loading spinner when entering any pillar

### Backend

#### 4. Serve Partial Results (Remove Fallback Chain)
- In `get_pillar_missions()`, after bank pull + first LLM call:
  - If merged >= 6 questions: serve them, skip emergency fallbacks
  - If merged < 6: attempt ONE more bank pull only (no more LLM calls)
  - Trigger background task to refill question bank
- Eliminates: 40-60s worst-case from 3 sequential LLM fallback calls

#### 5. Increase Question Bank Pull
- Change bank pull count from 5 to 8 in `get_pillar_missions()`
- LLM only needs to generate 2 questions (down from 5)
- Reduces LLM latency from 4-12s to 1-4s on cache miss

## Files Modified

- `frontend/components/student/VoiceProvider.tsx` (new)
- `frontend/components/student/tasks/shared/AudioPlayButton.tsx`
- `frontend/app/student/spelling-bee/page.tsx`
- `frontend/app/student/story-time/page.tsx`
- `frontend/app/student/missions/page.tsx` (or equivalent dashboard)
- `frontend/components/student/tasks/MissionGameplay.tsx`
- `backend/app/api/v1/endpoints/missions.py`

## Expected Impact

| Scenario | Before | After |
|----------|--------|-------|
| Pillar cold start (cache miss) | 8-20s | 2-5s |
| Pillar warm start (cache hit) | 3-5s | <1s (prefetched) |
| Between-question audio delay | 2-3s | <0.5s |
| Worst-case fallback chain | 60s+ | 15s max |
