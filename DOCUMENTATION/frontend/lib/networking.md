# Networking and Offline Support

Modules for offline queue management, network status detection, and the Supabase client.

---

## Offline Queue -- `frontend/lib/network-queue.ts`

Stores pending mission answers in localStorage when the student is offline, then batch-flushes them when connectivity returns.

### Storage

- **Key:** `primepal_pending_answers` in localStorage
- **Format:** JSON array of `PendingAnswer` objects

### Interface

```typescript
export interface PendingAnswer {
  student_id: string;
  question_id: number;
  answer_data: any;
  pillar: string;
  task_type: string;
  points_value: number;
  question_correct: boolean;
  timestamp: string;
}
```

### Functions

#### `addPendingAnswer(answer: PendingAnswer): void`

Appends an answer to the localStorage queue. SSR-safe (no-ops if `window` is undefined).

#### `getPendingAnswers(): PendingAnswer[]`

Reads and parses the queue from localStorage. Returns `[]` on SSR or parse errors.

#### `clearPendingAnswers(): void`

Removes the queue from localStorage.

#### `flushPendingAnswers(token: string): Promise<{ flushed: number; remaining: number }>`

Attempts to submit all pending answers to the server as a single batch.

- **Endpoint:** `POST /missions/submit-batch`
- **Auth:** Bearer token passed as argument
- **Payload:** Maps each `PendingAnswer` to `{ question_correct, task_type, pillar, points_value, submitted_at }`.
- **Retry strategy:** Exponential backoff -- 1s, 2s, 4s (max 3 attempts).
- **On success:** Clears the queue, returns `{ flushed: N, remaining: 0 }`.
- **On 4xx client error (except 429):** Clears the queue to avoid infinite retries.
- **On all retries exhausted:** Leaves the queue intact for the next attempt, returns `{ flushed: 0, remaining: N }`.

---

## Network Status Hook -- `frontend/lib/use-network-status.ts`

```typescript
export function useNetworkStatus(): { isOnline: boolean }
```

React hook that tracks browser online/offline status in real time.

- SSR-safe: defaults to `true` during server rendering.
- On mount, reads `navigator.onLine` and attaches `online`/`offline` event listeners.
- Cleans up listeners on unmount.

### Usage

```typescript
const { isOnline } = useNetworkStatus();
// Use with network-queue.ts to flush pending answers when back online
```

---

## Supabase Client -- `frontend/lib/supabase/client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Browser-side Supabase client used in Client Components for teacher/admin authentication (`signInWithPassword`, `signOut`, `getSession`, etc.).

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both are required. The `!` non-null assertion is used, so missing values will cause a runtime error.
