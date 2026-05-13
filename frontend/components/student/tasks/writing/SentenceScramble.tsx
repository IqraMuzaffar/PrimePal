'use client';

import { useState, useMemo } from 'react';
import {
  DndContext, closestCenter, DragEndEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';

interface IndexedWord {
  id: string;
  text: string;
}

function SortableWord({ id, word, disabled }: { id: string; word: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`px-4 py-2 bg-white border-2 border-indigo-200 rounded-lg font-semibold text-sm text-gray-800 touch-none select-none ${
        disabled ? 'opacity-60 cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'z-10 shadow-lg border-indigo-400' : ''}`}
    >
      {word}
    </div>
  );
}

export default function SentenceScramble({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const initialWords = useMemo(() => {
    const bank = question.word_bank ?? [];
    const indexed: IndexedWord[] = bank.map((word, i) => ({ id: `${word}_${i}`, text: word }));
    return [...indexed].sort(() => Math.random() - 0.5);
  }, [question.word_bank]);

  const [words, setWords] = useState<IndexedWord[]>(initialWords);
  const [submitted, setSubmitted] = useState(false);

  // MouseSensor for desktop, TouchSensor for mobile (uses non-passive listeners to prevent scroll conflict)
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const isLocked = disabled || showFeedback || submitted;

  const handleDragEnd = (event: DragEndEvent) => {
    if (isLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = words.findIndex(w => w.id === active.id);
    const newIndex = words.findIndex(w => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setWords(arrayMove(words, oldIndex, newIndex));
    }
  };

  const handleSubmit = () => {
    if (isLocked) return;
    setSubmitted(true);
    const correctOrder = question.correct_order ?? [];
    const correctSentence = (question.correct_answer ?? '').toLowerCase().trim();
    const texts = words.map(w => w.text);
    const studentSentence = texts.join(' ').toLowerCase().trim();

    const orderMatch = texts.length === correctOrder.length &&
      texts.every((w, i) => w.toLowerCase().trim() === (correctOrder[i] ?? '').toLowerCase().trim());
    const sentenceMatch = correctSentence.length > 0 && studentSentence === correctSentence;

    onAnswer(texts.join(' '), orderMatch || sentenceMatch);
  };

  const correctOrder = question.correct_order ?? [];
  const currentTexts = words.map(w => w.text);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <p className="text-sm text-gray-500 mb-4">Drag the words into the correct order.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={words.map(w => w.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 justify-center mb-6 min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            {words.map((item) => (
              <SortableWord key={item.id} id={item.id} word={item.text} disabled={isLocked} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showFeedback && (
        <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${
          currentTexts.every((w, i) => w === correctOrder[i]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          Correct order: {correctOrder.join(' ')}
        </div>
      )}

      {!showFeedback && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLocked}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Answer
        </motion.button>
      )}
    </div>
  );
}
