# Ticket 06: Frontend Bugs

**Priority:** 6
**Status:** TODO
**Impact:** Broken features, double-firing, missing assets

## Issues

### QuestionTimer double-fires onTimeUp

- [ ] `frontend/components/student/QuestionTimer.tsx:14,21` — useEffect and setInterval both call `onTimeUp()` when timer hits 0
- **Fix:** Remove the `onTimeUp()` call from inside setInterval, let useEffect handle it

### Missing sound file

- [ ] `frontend/components/student/AudioProvider.tsx:28` — references `/sounds/bgm.mp3` but only `bgm.wav` exists
- **Fix:** Either rename the file or update the reference

### Missing avatar fallback

- [ ] `frontend/lib/avatarHelper.ts:7,20` — references `/avatars/default.svg` but `public/avatars/` doesn't exist
- **Fix:** Create the directory and add a default avatar SVG

### Admin layout SSR mismatch

- [ ] `frontend/app/admin/layout.tsx:59` — `window.location.pathname` used for tab detection, always `""` on server
- **Fix:** Use `usePathname()` from `next/navigation`

### Admin signup flow broken

- [ ] `frontend/app/admin/login/page.tsx:48-91` — creates account without password, then tries `signInWithPassword`
- **Fix:** Include password in the account creation request, or use a different auth flow
