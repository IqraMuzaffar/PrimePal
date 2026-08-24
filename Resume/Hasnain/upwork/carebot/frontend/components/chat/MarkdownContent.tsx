'use client';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
    <ReactMarkdown
      components={{
        strong: ({ children }) => (
          <strong className="font-semibold text-inherit">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-inherit leading-relaxed">{children}</li>
        ),
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-inherit mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-semibold text-inherit mt-2 mb-1">{children}</h4>
        ),
        code: ({ children }) => (
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
        th: ({ children }) => (
          <th className="px-3 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 border-b border-gray-100">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-teal-400 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
