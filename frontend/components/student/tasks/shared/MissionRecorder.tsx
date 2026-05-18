'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MissionRecorderProps {
  expectedText: string;
  pillar?: string;
  onResult: (isCorrect: boolean, transcription: string, similarity: number) => void;
  disabled: boolean;
}

type RecorderState = 'idle' | 'recording' | 'evaluating' | 'retry' | 'giving_up';

type SpeechRecognitionType = typeof window extends { webkitSpeechRecognition: infer T } ? T : never;

const MAX_ATTEMPTS = 3;

export default function MissionRecorder({ expectedText, pillar = 'speaking', onResult, disabled }: MissionRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [retryMessage, setRetryMessage] = useState('');
  const [lastTranscription, setLastTranscription] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const startLiveTranscription = useCallback(() => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new (SpeechRecognition as new () => SpeechRecognitionType)();
    (recognition as Record<string, unknown>).continuous = true;
    (recognition as Record<string, unknown>).interimResults = true;
    (recognition as Record<string, unknown>).lang = 'en-US';

    (recognition as Record<string, unknown>).onresult = (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        interim += result[0].transcript;
      }
      setLiveTranscript(interim);
    };

    (recognition as Record<string, unknown>).onerror = () => { /* ignore — audio recording is primary */ };
    (recognition as { start: () => void }).start();
    recognitionRef.current = recognition;
  }, []);

  const stopLiveTranscription = useCallback(() => {
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      recognitionRef.current = null;
    }
  }, []);

  async function startRecording() {
    try {
      setLastTranscription('');
      setLiveTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstart = () => {
        setRecorderState('recording');
        startLiveTranscription();
      };
      recorder.start();
    } catch {
      onResult(false, '', 0);
    }
  }

  function stopAndSubmit() {
    if (!mediaRecorderRef.current || recorderState !== 'recording') return;
    stopLiveTranscription();
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

          // Capture what we heard
          if (data.transcription) {
            setLastTranscription(data.transcription);
          }

          // Handle retry status
          if (data.status === 'retry') {
            // If we got a transcription back, Whisper heard them but answer was wrong.
            // If no transcription, audio was garbled.
            const msg = data.transcription
              ? "Not quite — try again! Say it clearly. 💪"
              : "I couldn't hear you clearly — let's try again! 🎤";
            setRetryMessage(msg);
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
    setLastTranscription('');
    setLiveTranscript('');
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
        {lastTranscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 w-full max-w-xs text-center"
          >
            <p className="text-xs font-semibold text-amber-600 mb-1">We heard:</p>
            <p className="text-base font-bold text-amber-900 italic">&ldquo;{lastTranscription}&rdquo;</p>
          </motion.div>
        )}
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
        {lastTranscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 w-full max-w-xs text-center"
          >
            <p className="text-xs font-semibold text-rose-500 mb-1">We heard:</p>
            <p className="text-base font-bold text-rose-800 italic">&ldquo;{lastTranscription}&rdquo;</p>
          </motion.div>
        )}
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
        <>
          <motion.button
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            onClick={stopAndSubmit}
            disabled={disabled}
            className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
          >
            <MicOff size={32} />
          </motion.button>
          {/* Live transcription display */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm min-h-[48px] bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-4 py-3 text-center"
            >
              {liveTranscript ? (
                <p className="text-base font-semibold text-indigo-900">
                  {liveTranscript.split(' ').map((word, i) => (
                    <motion.span
                      key={`${i}-${word}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="inline-block mr-1"
                    >
                      {word}
                    </motion.span>
                  ))}
                </p>
              ) : (
                <p className="text-sm text-indigo-400 italic">Listening...</p>
              )}
            </motion.div>
          </AnimatePresence>
        </>
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
