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

export default function MissionRecorder({ expectedText, pillar = 'speaking', onResult, disabled }: MissionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstart = () => setIsRecording(true);
      recorder.start();
    } catch {
      onResult(false, '', 0);
    }
  }

  function stopAndSubmit() {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

    mediaRecorderRef.current.onstop = async () => {
      setIsRecording(false);
      setIsEvaluating(true);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        const token = localStorage.getItem('primepal_student_token');
        const formData = new FormData();
        formData.append('audio_file', blob, 'recording.webm');
        formData.append('expected_text', expectedText);
        formData.append('pillar', pillar);

        const res = await fetch(`${API_BASE}/missions/submit-speaking`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          onResult(data.is_correct, data.transcription, data.similarity_score);
        } else {
          onResult(false, '', 0);
        }
      } catch {
        onResult(false, '', 0);
      } finally {
        setIsEvaluating(false);
        mediaRecorderRef.current = null;
      }
    };
  }

  if (isEvaluating) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-gray-600 font-medium">Listening to you...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {isRecording ? (
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
        {isRecording ? 'Tap to stop' : 'Tap to speak'}
      </p>
    </div>
  );
}
