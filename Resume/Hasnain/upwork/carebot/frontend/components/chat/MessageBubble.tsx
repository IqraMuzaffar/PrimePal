'use client';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  emergency?: boolean;
  toolsUsed?: string[];
}

export function MessageBubble({ role, content, emergency, toolsUsed }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600/10 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-teal-600" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow',
          isUser
            ? 'bg-gradient-to-br from-teal-600 to-teal-400 text-white rounded-br-md shadow-lg shadow-teal-600/10'
            : 'bg-white border border-gray-100 rounded-xl shadow-sm text-gray-900 rounded-bl-md',
          emergency && 'border-2 border-red-500 bg-red-50 text-red-900 shadow-red-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <MarkdownContent content={content} className={cn(emergency && '[&_*]:text-red-900')} />
        )}
        {toolsUsed && toolsUsed.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
            {toolsUsed.map((tool) => (
              <span key={tool} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-600 border border-teal-100">
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}
