'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import SpeakingPronunciationFeedback from '@/components/student/SpeakingPronunciationFeedback';
import { useSpeakingPrompts } from '@/lib/hooks/queries';

interface PronunciationWord {
  word: string;
  status: 'correct' | 'incorrect' | 'omitted';
}

interface EvaluateProResponse {
  score: number;
  feedback: string;
  pronunciation_score: number;
  pronunciation_data: PronunciationWord[];
  points_awarded: number;
  new_total: number;
  status: 'final' | 'retry' | 'give_up';
  noise_flagged: boolean;
}

type GameState = 'loading' | 'intro' | 'recording' | 'reviewing' | 'result' | 'retry' | 'finished';

const AudioAPI = typeof window !== 'undefined' && navigator.mediaDevices;
const _SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export default function SpeakingPage() {
  const router = useRouter();
  const { data: promptsData, isLoading: promptsLoading, error: promptsError } = useSpeakingPrompts();

  const [gameState, setGameState] = useState<GameState>('loading');
  const [prompts, setPrompts] = useState<Array<{ id: number; prompt: string; hint: string }>>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState({ completed: 0, totalPoints: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<EvaluateProResponse | null>(null);
  const [topic, setTopic] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [retryMessage, setRetryMessage] = useState('');
  const [noiseToastShown, setNoiseToastShown] = useState(false);
  const [showNoiseToast, setShowNoiseToast] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const _recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const recordingTimeRef = useRef(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('primepal_student_token');
  }

  useEffect(() => {
    if (!AudioAPI) {
      setBrowserSupported(false);
    }
  }, []);

  // Initialise game once query data arrives
  useEffect(() => {
    if (promptsLoading) return;
    if (promptsError) {
      setError('Failed to load prompts. Please try again.');
      return;
    }
    if (promptsData && !gameStarted) {
      const token = getToken();
      if (!token) { router.push('/student/play'); return; }
      setPrompts(promptsData.prompts);
      setTopic(promptsData.topic);
      setGameState('intro');
      setCurrentPromptIndex(0);
      setTranscript('');
      setScore({ completed: 0, totalPoints: 0 });
      setFeedback(null);
      setGameStarted(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptsLoading, promptsData, promptsError]);

  async function startRecording() {
    if (!AudioAPI || !browserSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      recordingTimeRef.current = 0;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setGameState('recording');
        setTranscript('Recording in progress... (will process after you stop)');
        recordingTimeRef.current = 0;

        // Update recording time display
        recordingIntervalRef.current = setInterval(() => {
          recordingTimeRef.current += 1;
        }, 1000);
      };

      mediaRecorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        setError(`Recording error: ${event.error}`);
        stopRecording();
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to access microphone:', err);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        audioBlobRef.current = audioBlob;

        // Stop all audio tracks
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;

        setIsRecording(false);
        setGameState('reviewing');
        setTranscript(`Audio recorded (${recordingTimeRef.current}s)`);
      };
    }
  }

  async function submitTranscript() {
    if (!audioBlobRef.current || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const token = getToken();
      const currentPrompt = prompts[currentPromptIndex];

      // Use the stored audio blob from the recording
      const audioBlob = audioBlobRef.current;

      // Create FormData for multipart file upload
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('prompt_id', String(currentPrompt.id));
      formData.append('prompt_text', currentPrompt.prompt);
      formData.append('attempt_number', String(attemptNumber));

      // Send to new /speaking/evaluate-pro endpoint
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE}/speaking/evaluate-pro`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`);
      }

      const result: EvaluateProResponse = await response.json();

      // Handle noise flag toast (only once per session)
      if (result.noise_flagged && !noiseToastShown) {
        setNoiseToastShown(true);
        setShowNoiseToast(true);
        setTimeout(() => setShowNoiseToast(false), 3000);
      }

      // Handle retry / give_up statuses
      if (result.status === 'retry') {
        setRetryMessage(result.feedback);
        setAttemptNumber((prev) => prev + 1);
        setGameState('retry');
        return;
      }

      if (result.status === 'give_up') {
        setRetryMessage(result.feedback);
        setGameState('retry');
        // Auto-advance after 2 seconds
        setTimeout(() => {
          setAttemptNumber(1);
          advanceToNextPrompt();
        }, 2000);
        return;
      }

      // Normal final result
      setFeedback(result);
      setScore((prev) => ({
        completed: prev.completed + 1,
        totalPoints: prev.totalPoints + result.points_awarded,
      }));
      setAttemptNumber(1);

      setGameState('result');
      setTimeout(() => advanceToNextPrompt(), 4000); // Longer delay for animations
    } catch (err) {
      console.error('Failed to evaluate:', err);
      setError('Failed to evaluate. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  }

  function advanceToNextPrompt() {
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    recordingTimeRef.current = 0;

    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
      setTranscript('');
      setFeedback(null);
      setGameState('intro');
    } else {
      setGameState('finished');
    }
  }

  if (!browserSupported && gameState !== 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-rose-50 to-red-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-semibold mb-4">
            Voice recording requires Chrome, Edge, or similar browser.
          </p>
          <button
            onClick={() => router.push('/student/home')}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-rose-50 to-red-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🎤</div>
          <p className="text-gray-600 font-semibold">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-rose-50 to-red-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/student/home')}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  if (!prompts.length) {
    return null;
  }

  const currentPrompt = prompts[currentPromptIndex];
  const progress = Math.round(((currentPromptIndex + 1) / prompts.length) * 100);

  if (gameState === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-rose-50 to-red-50 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl border-4 border-rose-300 p-8 max-w-md text-center"
        >
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Speaking Done!</h1>
          <p className="text-gray-600 mb-6">
            You completed <span className="font-bold text-rose-600">{score.completed} / {prompts.length}</span> prompts
          </p>
          <div className="bg-rose-50 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-gray-600 mb-1">Stars earned today</p>
            <p className="text-4xl font-bold text-rose-600">{score.totalPoints} ⭐</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                audioChunksRef.current = [];
                audioBlobRef.current = null;
                recordingTimeRef.current = 0;
                setScore({ completed: 0, totalPoints: 0 });
                window.location.reload();
              }}
              className="flex-1 px-4 py-3 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push('/student/home')}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              🏠 Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-red-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/student/home')}
            className="flex items-center gap-2 text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🎤 Speaking Practice</h1>
              <p className="text-sm text-white/80">{topic}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/80">Score</p>
              <p className="text-3xl font-bold">{score.totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {gameState === 'intro' && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Prompt {currentPromptIndex + 1} of {prompts.length}
              </span>
              <span className="text-sm text-rose-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-rose-500 to-red-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Prompt card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-widest">Your Prompt</p>
            <p className="text-2xl font-bold text-gray-900 mb-6">{currentPrompt.prompt}</p>

            <div className="bg-rose-50 rounded-xl p-4 mb-6 border border-rose-100">
              <p className="text-sm font-semibold text-rose-700 mb-1">💡 Hint:</p>
              <p className="text-sm text-rose-700">{currentPrompt.hint}</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold text-lg rounded-xl hover:from-rose-600 hover:to-red-600 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Mic size={24} />
              🎤 Start Speaking
            </motion.button>
          </motion.div>
        </div>
      )}

      {gameState === 'recording' && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Recording card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm"
          >
            {/* Pulsing mic */}
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center shadow-lg"
              >
                <Mic size={48} className="text-white" />
              </motion.div>
            </div>

            <p className="text-center text-sm font-semibold text-gray-600 mb-4 uppercase">
              Listening... <span className="text-rose-600 font-bold">{recordingTimeRef.current}s</span>
            </p>

            {/* Recording status */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Status:</p>
              <p className="text-gray-700 text-base font-medium">{transcript}</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="w-full py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold text-lg rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <MicOff size={24} />
              ⏹ Stop Recording
            </motion.button>
          </motion.div>
        </div>
      )}

      {gameState === 'reviewing' && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Review card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm space-y-6"
          >
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2 uppercase">The prompt was:</p>
              <p className="text-lg font-bold text-gray-900">{currentPrompt.prompt}</p>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm font-semibold text-gray-600 mb-3 uppercase">What you said:</p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-gray-700 text-base italic">{transcript}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  audioChunksRef.current = [];
                  audioBlobRef.current = null;
                  recordingTimeRef.current = 0;
                  setTranscript('');
                  setGameState('intro');
                  await startRecording();
                }}
                className="flex-1 py-3 bg-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-300 transition-colors"
              >
                🔄 Try Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitTranscript}
                disabled={isEvaluating || !audioBlobRef.current}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-red-600 transition-all disabled:opacity-50"
              >
                {isEvaluating ? 'Analyzing...' : 'Submit →'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {gameState === 'result' && feedback && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Word-level Pronunciation Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm"
          >
            <SpeakingPronunciationFeedback
              pronunciationData={feedback.pronunciation_data}
              pronunciationScore={feedback.pronunciation_score}
              feedback={feedback.feedback}
              pointsAwarded={feedback.points_awarded}
            />
          </motion.div>

          <p className="text-xs text-gray-500 text-center">Next prompt in a moment...</p>
        </div>
      )}

      {gameState === 'retry' && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border-2 border-amber-200 p-8 shadow-sm text-center space-y-6"
          >
            {/* Pulsing microphone */}
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center shadow-lg"
            >
              <Mic size={40} className="text-white" />
            </motion.div>

            <p className="text-xl font-bold text-gray-800">{retryMessage}</p>

            {attemptNumber <= 3 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  audioChunksRef.current = [];
                  audioBlobRef.current = null;
                  recordingTimeRef.current = 0;
                  setTranscript('');
                  setGameState('intro');
                }}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
              >
                Try Again
              </motion.button>
            )}

            <p className="text-xs text-gray-400">
              Attempt {Math.min(attemptNumber, 3)} of 3
            </p>
          </motion.div>
        </div>
      )}

      {/* Noise toast */}
      {showNoiseToast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium z-50"
        >
          Try moving to a quieter spot! 🤫
        </motion.div>
      )}
    </div>
  );
}
