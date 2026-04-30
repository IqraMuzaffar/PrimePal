'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MissionRecorderProps {
  expectedText: string;
  pillar?: string;
  onResult: (isCorrect: boolean, transcription: string, similarity: number) => void;
  disabled: boolean;
}

type RecorderState = 'idle' | 'recording' | 'evaluating' | 'retry' | 'giving_up';

const MAX_ATTEMPTS = 3;

export default function MissionRecorder({ expectedText, pillar = 'speaking', onResult, disabled }: MissionRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [retryMessage, setRetryMessage] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstart = () => setRecorderState('recording');
      recorder.start();
    } catch {
      onResult(false, '', 0);
    }
  }

  function stopAndSubmit() {
    if (!mediaRecorderRef.current || recorderState !== 'recording') return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

    mediaRecorderRef.current.onstop = async () => {
      setRecorderState('evaluating');
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        const token = localStorage.getItem('primepal_student_token');
        const formData = new FormData();
        formData.append('audio_file', blob, 'recording.webm');
        formData.append('expected_text', expectedText);
        formData.append('pillar', pillar);
        formData.append('attempt_number', String(attemptNumber));

        const res = await fetch(`${API_BASE}/missions/submit-speaking`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();

          // Handle retry status
          if (data.status === 'retry') {
            setRetryMessage("I couldn't hear you clearly — let's try again! 🎤");
            setAttemptNumber((prev) => prev + 1);
            setRecorderState('retry');
            return;
          }

          // Handle give_up status
          if (data.status === 'give_up') {
            setRetryMessage("No worries! Let's try the next one. 😊");
            setRecorderState('giving_up');
            // After a brief pause, report failure gently
            setTimeout(() => {
              setRecorderState('idle');
              setAttemptNumber(1);
              onResult(false, '', 0);
            }, 2000);
            return;
          }

          // Normal final result
          setRecorderState('idle');
          setAttemptNumber(1);
          onResult(data.is_correct, data.transcription, data.similarity_score);
        } else {
          setRecorderState('idle');
          onResult(false, '', 0);
        }
      } catch {
        setRecorderState('idle');
        onResult(false, '', 0);
      } finally {
        mediaRecorderRef.current = null;
      }
    };
  }

  function handleRetryTap() {
    chunksRef.current = [];
    setRecorderState('idle');
  }

  if (recorderState === 'evaluating') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-gray-600 font-medium">Listening to you...</p>
      </div>
    );
  }

  if (recorderState === 'retry') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center shadow-lg"
        >
          <Mic size={28} className="text-white" />
        </motion.div>
        <p className="text-sm font-semibold text-gray-700 text-center px-4">{retryMessage}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRetryTap}
          className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors text-sm"
        >
          Try Again
        </motion.button>
        <p className="text-xs text-gray-400">Attempt {attemptNumber} of {MAX_ATTEMPTS}</p>
      </div>
    );
  }

  if (recorderState === 'giving_up') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm font-semibold text-gray-700 text-center px-4">{retryMessage}</p>
          <p className="text-xs text-gray-400 text-center mt-2">Moving on...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {recorderState === 'recording' ? (
        <motion.button
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          onClick={stopAndSubmit}
          disabled={disabled}
          className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
        >
          <MicOff size={32} />
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={startRecording}
          disabled={disabled}
          className="w-20 h-20 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-600 disabled:opacity-50"
        >
          <Mic size={32} />
        </motion.button>
      )}
      <p className="text-xs text-gray-500">
        {recorderState === 'recording' ? 'Tap to stop' : 'Tap to speak'}
      </p>
    </div>
  );
}
