/**
 * Network Queue — stores pending mission answers in localStorage
 * when the student is offline, and flushes them when connectivity returns.
 */

const STORAGE_KEY = 'primepal_pending_answers';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

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

export function addPendingAnswer(answer: PendingAnswer): void {
  const queue = getPendingAnswers();
  queue.push(answer);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

export function getPendingAnswers(): PendingAnswer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPendingAnswers(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Attempt to submit all pending answers to the server as a single batch.
 * Uses exponential backoff: 1s -> 2s -> 4s (max 3 retries).
 * On success, clears the queue.
 * On failure after 3 retries, leaves the queue for next attempt.
 */
export async function flushPendingAnswers(
  token: string
): Promise<{ flushed: number; remaining: number }> {
  const queue = getPendingAnswers();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const payload = {
    answers: queue.map((answer) => ({
      question_correct: answer.question_correct,
      task_type: answer.task_type,
      pillar: answer.pillar,
      points_value: answer.points_value,
      submitted_at: answer.timestamp,
    })),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/missions/submit-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        clearPendingAnswers();
        return { flushed: queue.length, remaining: 0 };
      }

      // Don't retry on 4xx client errors (except 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // Server rejected the batch — clear queue to avoid infinite retries
        clearPendingAnswers();
        return { flushed: queue.length, remaining: 0 };
      }
    } catch {
      // Network error — will retry
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  // All retries exhausted — leave queue intact for next attempt
  return { flushed: 0, remaining: queue.length };
}
