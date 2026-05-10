# Juicy Audio & Music Engine — Implementation Guide

## Overview

PrimePal now features an immersive, game-like soundscape using **use-sound** (Howler.js) for optimal audio performance. The system includes:

- 🎵 **Background Music (BGM)** — Seamless looping across page transitions
- 🔊 **Tactile Sound Effects** — Interactive element feedback (pop, chime, error)
- ⏱️ **Dynamic Timer Tension** — Heartbeat/tick-tock when 5 seconds remain
- 🔇 **Global Mute State** — Persisted to localStorage for student preference

---

## Architecture

### 1. Dependencies Installed

```bash
npm install use-sound
```

**use-sound** is a React hook wrapper around **Howler.js**, providing:
- Minimal bundle size (~3KB)
- Cross-browser audio support
- Excellent performance for game audio
- Volume, looping, and playback control

---

## Step 1: Global Audio Context

### File: `frontend/components/student/AudioProvider.tsx`

**Exports:**
- `AudioProvider` — Context wrapper
- `useAudio()` — Hook to access audio state (`isMuted`, `toggleMute`)

**Features:**
- Manages global `isMuted` state (persisted to localStorage)
- Plays looping BGM at 40% volume
- Automatically pauses/resumes BGM based on mute state
- Gracefully handles client-side initialization

**BGM Settings:**
```javascript
useSound("/sounds/bgm.mp3", {
  loop: true,          // Seamless looping
  volume: 0.4,         // 40% for background
  interrupt: true,     // Stop previous if retriggered
})
```

### Where It's Integrated

**File:** `frontend/app/student/layout.tsx`

```typescript
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </AudioProvider>
  );
}
```

**Result:** BGM plays seamlessly across ALL student pages (home, missions, chat, etc.)

### Mute Toggle Button

Added to student header (top-right):
- **Unmuted:** 🔊 Volume2 icon (indigo)
- **Muted:** 🔇 VolumeX icon (red)
- **Persistent:** Preference saved to localStorage

---

## Step 2: Custom Sound Effects Hook

### File: `frontend/hooks/usePrimeSounds.ts`

**Exported Functions:**

| Function | Sound File | Use Case | Volume |
|----------|-----------|----------|--------|
| `playPop()` | `/sounds/pop.mp3` | Clicking buttons, pillars, avatars | 0.6 |
| `playChime()` | `/sounds/chime.mp3` | Correct answer submitted | 0.7 |
| `playError()` | `/sounds/error.mp3` | Incorrect answer | 0.5 |
| `playTick()` | `/sounds/tick.mp3` | Timer tension (5s remaining) | 0.8 |
| `playWhoosh()` | `/sounds/whoosh.mp3` | Page transitions | 0.5 |

**Special Methods:**
- `stopTickSound()` — Stop timer sound immediately
- `pauseTickSound()` — Pause without stopping
- `isMuted` — Current mute state (read-only)

**Respects Global Mute State:**
```typescript
const playPop = () => {
  if (!isMuted) {
    playPopSound();
  }
};
```

### Usage Example

```typescript
import { usePrimeSounds } from "@/hooks/usePrimeSounds";

export function MyComponent() {
  const { playPop, playChime, playError } = usePrimeSounds();

  return (
    <button onClick={() => playPop()}>Click me!</button>
  );
}
```

---

## Step 3: Sound Effects Integration

### Home Dashboard (`frontend/app/student/home/page.tsx`)

Sound effects added to:

1. **Edit Character Button** → `playPop()`
2. **Daily Missions Card** → `playPop()`
3. **Chat Card** → `playPop()`
4. **Spelling Bee Card** → `playPop()`
5. **Leaderboard Card** → `playPop()`
6. **Locked Cards (Coming Soon)** → `playPop()` on shake attempt

**Pattern:**
```typescript
<button onClick={() => {
  playPop();
  router.push("/student/missions");
}}>
  Click me
</button>
```

### Ready for Integration (Not Yet Implemented)

These components should use sound effects when you build them:

| Location | Sound | Trigger |
|----------|-------|---------|
| `missions/[pillar]/page.tsx` | `playChime` | Correct answer |
| `missions/[pillar]/page.tsx` | `playError` | Wrong answer |
| `missions/[pillar]/page.tsx` | `playTick` / `stopTick` | Timer tension (5s) |
| `play/avatar-select.tsx` | `playPop` | Avatar selection |
| `missions/` (all) | MC buttons | `playPop` on click |

---

## Step 4: Placeholder Assets Setup

### Required Audio Files

Place these in `frontend/public/sounds/`:

```
public/
├── sounds/
│   ├── bgm.mp3           (Background music, ~30-60s looping)
│   ├── pop.mp3           (Short, punchy click sound)
│   ├── chime.mp3         (Cheerful correct-answer sound)
│   ├── error.mp3         (Soft buzzer/error sound)
│   ├── tick.mp3          (Fast tick-tock or heartbeat)
│   └── whoosh.mp3        (Smooth page transition sound)
```

### Current Status: Placeholder Paths Set

All paths are configured in `usePrimeSounds.ts`:
```typescript
useSound("/sounds/pop.mp3", { ... })
useSound("/sounds/chime.mp3", { ... })
// etc.
```

**No runtime errors** if files missing — Howler.js silently skips playback when files not found.

**Action Required:** Drop actual .mp3 files into `public/sounds/` when ready.

---

## Step 5: Timer Tension Integration (Not Yet Implemented)

### File: `frontend/app/student/missions/[pillar]/page.tsx`

**Implementation Pattern:**

```typescript
const { playTick, stopTickSound } = usePrimeSounds();
const [timeLeft, setTimeLeft] = useState(15);

useEffect(() => {
  if (timeLeft === 5) {
    playTick(); // Start tension sound at 5 seconds
  }

  if (timeLeft === 0 || answerSubmitted) {
    stopTickSound(); // Stop immediately
  }
}, [timeLeft, answerSubmitted, playTick, stopTickSound]);
```

**Behavior:**
- Tick sound **starts** when `timeLeft === 5`
- Tick sound **stops** if student answers or timer hits 0
- Only plays once per timer (even if already playing)

---

## Data Flow

```
Student visits /student/* page
     ↓
<AudioProvider> mounts
     ↓
BGM starts playing at 40% volume (loop)
     ↓
Student navigates (page transition)
     ↓
BGM continues seamlessly (no restart)
     ↓
Student clicks interactive element
     ↓
playPop() → checks isMuted
     ↓
If !isMuted: pop.mp3 plays (0.6 volume)
     ↓
Student mutes via header toggle
     ↓
isMuted = true → localStorage saved
     ↓
All future sounds suppressed until unmuted
```

---

## Component Hierarchy

```
StudentLayout
├── <AudioProvider>          ← Creates audio context
│   └── StudentLayoutContent
│       ├── Header
│       │   └── Mute Toggle Button (🔊/🔇)
│       └── <main>
│           ├── HomePage
│           │   ├── playPop on card clicks
│           │   └── LockedCard (playPop on shake)
│           ├── MissionsPage
│           │   ├── playChime on correct
│           │   ├── playError on incorrect
│           │   └── playTick/stopTick on timer
│           ├── ChatPage
│           └── ... (other student pages)
```

---

## Testing Checklist

### 1. Audio Provider Initialization
- [ ] Visit `/student/home`
- [ ] **Expected:** BGM starts playing (faint background)
- [ ] Audio plays continuously across page navigation
- [ ] No errors in browser console

### 2. Mute Toggle
- [ ] Click 🔊 icon in header
- [ ] **Expected:** Icon changes to 🔇 (red)
- [ ] BGM stops
- [ ] Refresh page → Muted state persists
- [ ] Click again → Icon changes to 🔊, BGM resumes

### 3. Pop Sound Effects
- [ ] Click "Daily Missions" card on home page
- [ ] **Expected:** Pop sound plays (short, punchy)
- [ ] Mute sounds, click again
- [ ] **Expected:** No pop sound plays
- [ ] Unmute, verify pop sound returns

### 4. File Paths
- [ ] Open browser DevTools → Network tab
- [ ] Click a button that triggers sound
- [ ] **Expected:** Network requests to `/sounds/pop.mp3` (or 404 if file missing)
- [ ] No JavaScript errors

### 5. Future: Timer Tension
- [ ] (After timer integration) Start a mission
- [ ] Wait until 5 seconds remaining on timer
- [ ] **Expected:** Tick/heartbeat sound starts looping
- [ ] Answer question or timer hits 0
- [ ] **Expected:** Tick sound stops immediately

---

## Audio Files Specifications

### BGM (Background Music)
- Format: MP3
- Duration: 30-60 seconds (will loop)
- Volume: Should be background-level (we scale to 40% in code)
- Recommendation: Uplifting, game-like, no jarring endpoints
- Suggested: Lofi beat or ambient game music

### Pop
- Format: MP3
- Duration: 100-200ms (short click)
- Volume: Punchy but not harsh
- Example: Coin pickup, button click sound

### Chime
- Format: MP3
- Duration: 300-500ms (celebratory)
- Volume: Cheerful and encouraging
- Example: Gold chime, success bell

### Error
- Format: MP3
- Duration: 200-400ms (buzzer)
- Volume: Soft and gentle (not jarring for learning)
- Example: Soft error buzz, wrong-answer sound

### Tick (Timer)
- Format: MP3
- Duration: 100-200ms
- Volume: Medium (noticeable but not overwhelming)
- Example: Heartbeat, fast tick-tock
- **Important:** Should feel urgent but not stressful

### Whoosh
- Format: MP3
- Duration: 200-400ms (transition)
- Volume: Medium
- Example: Smooth woosh, page slide sound

---

## Performance Notes

### Bundle Impact
- `use-sound` + `howler.js` adds ~3KB gzipped
- Audio files must be optimized MP3s (compressed)
- Howler.js uses Web Audio API (native performance)

### Memory Usage
- BGM plays once, loops indefinitely (1 active sound)
- SFX created on-demand, cleaned up after playback
- Total memory: ~1-2MB for all audio loaded

### Browser Support
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Falls back gracefully if audio not supported
- No additional polyfills needed

---

## Known Limitations

1. **Mobile Audio Autoplay:**
   - Most mobile browsers require user gesture before audio plays
   - First touch/click will start BGM
   - After that, BGM plays seamlessly

2. **Audio Context Suspend (Safari/Chrome):**
   - If tab is silent for too long, audio context may suspend
   - Howler.js handles this automatically, but there may be brief silence

3. **Simultaneous Playback:**
   - Multiple SFX can play at once (not interrupted)
   - Timer sound and SFX can overlap (intended)
   - BGM never interrupts (set volume: 0.4 for this reason)

---

## Customization

### Adjust BGM Volume
**File:** `frontend/components/student/AudioProvider.tsx`

```typescript
useSound("/sounds/bgm.mp3", {
  loop: true,
  volume: 0.4, // ← Change this (0-1 scale)
  ...
})
```

### Adjust SFX Volume
**File:** `frontend/hooks/usePrimeSounds.ts`

```typescript
useSound("/sounds/pop.mp3", {
  volume: 0.6, // ← Change this per sound
  ...
})
```

### Add New Sound
```typescript
const [playNewSound] = useSound("/sounds/newsound.mp3", {
  volume: 0.5,
  interrupt: true,
});

const playNew = () => {
  if (!isMuted) {
    playNewSound();
  }
};

// Export from hook
return {
  ...existing,
  playNew,
};
```

---

## Future Enhancements

1. **Sound Settings Page** — Let students adjust individual sound volumes
2. **Accessibility Options** — Visual indicators for muted sounds (screen reader)
3. **Dynamic Music** — Different BGM per dashboard section
4. **Voice-Over** — Narrator for missions/instructions
5. **Haptic Feedback** — Vibration on mobile (paired with sounds)
6. **Analytics** — Track which sounds are most engaging

---

## Troubleshooting

### "No sound plays"
1. Check if muted (header icon should show 🔇)
2. Check browser volume (system level)
3. Check DevTools Network → `/sounds/*.mp3` requests (404 = file missing)
4. Check DevTools Console for JS errors

### "Sound cuts off or stutters"
1. Audio file may be corrupted — re-export as MP3
2. File may be too large — compress further
3. Check if browser tab is backgrounded (autoplay restrictions)

### "Sound plays even when muted"
1. Verify you're using `usePrimeSounds()` hook
2. Check that all `playXxx()` calls respect `isMuted`
3. Manually check localStorage: `localStorage.getItem("primepal_audio_muted")`

---

## Files Changed

| File | Change | Type |
|------|--------|------|
| `frontend/components/student/AudioProvider.tsx` | NEW | Context provider |
| `frontend/hooks/usePrimeSounds.ts` | NEW | Sound effects hook |
| `frontend/app/student/layout.tsx` | Updated | Wrap with AudioProvider, add mute button |
| `frontend/app/student/home/page.tsx` | Updated | Add playPop to interactive elements |
| `package.json` | Updated | Added `use-sound` dependency |

---

## Installation Complete ✅

**Next Steps:**
1. Add audio files to `public/sounds/` (see specifications above)
2. Integrate timer tension into `missions/[pillar]/page.tsx`
3. Add sound effects to multiple-choice buttons (MC missions)
4. Test on mobile (verify autoplay after first gesture)

**Optional:**
- Create sound settings page for volume customization
- Add visual feedback (pulse animation) when sound plays
- Implement haptic feedback for mobile

