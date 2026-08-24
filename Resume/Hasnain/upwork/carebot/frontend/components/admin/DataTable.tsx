'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg w-full rounded-2xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-white/30">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg w-full rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="text-xs uppercase tracking-wider text-teal-400/80 font-semibold px-5 py-4"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-white/30"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="border-white/[0.06] hover:bg-white/[0.03] transition-colors"
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-white px-5 py-3.5">
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as ReactNode) ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
