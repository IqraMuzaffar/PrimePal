'use client';

import { useState, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';

interface IndexedWord {
  id: string;
  text: string;
}

function SortableWord({ id, word, disabled }: { id: string; word: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-4 py-2 bg-white border-2 border-indigo-200 rounded-lg font-semibold text-sm text-gray-800 cursor-grab active:cursor-grabbing touch-manipulation select-none"
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = words.findIndex(w => w.id === active.id);
    const newIndex = words.findIndex(w => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setWords(arrayMove(words, oldIndex, newIndex));
    }
  };

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    const correctOrder = question.correct_order ?? [];
    const texts = words.map(w => w.text);
    const isCorrect = texts.length === correctOrder.length && texts.every((w, i) => w === correctOrder[i]);
    onAnswer(texts.join(' '), isCorrect);
  };

  const correctOrder = question.correct_order ?? [];
  const currentTexts = words.map(w => w.text);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <p className="text-sm text-gray-500 mb-4">Drag the words into the correct order.</p>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={words.map(w => w.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 justify-center mb-6 min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            {words.map((item) => (
              <SortableWord key={item.id} id={item.id} word={item.text} disabled={disabled || showFeedback} />
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
          disabled={disabled || submitted}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Answer
        </motion.button>
      )}
    </div>
  );
}
