'use client';

import { Download } from 'lucide-react';

import React from 'react';

import { Button } from '@/components/ui';
import type { UserAnnualMonthRow } from '@/lib/user-calculations';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface AnnualSummaryProps {
  rows: UserAnnualMonthRow[];
  year: number;
  userName?: string;
}

const formatHours = (h: number): string => {
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  if (mm === 0) return `${h < 0 ? '-' : ''}${hh}h`;
  return `${h < 0 ? '-' : ''}${hh}h ${mm}m`;
};

const AnnualSummary: React.FC<AnnualSummaryProps> = ({
  rows,
  year,
  userName,
}) => {
  const totals = rows.reduce(
    (acc, r) => ({
      assigned: acc.assigned + r.assigned,
      theoretical: acc.theoretical + r.theoretical,
      laborables: acc.laborables + r.laborables,
      holidays: acc.holidays + r.holidays,
      difference: acc.difference + r.difference,
    }),
    { assigned: 0, theoretical: 0, laborables: 0, holidays: 0, difference: 0 }
  );

  const handleExportCSV = () => {
    const headers = [
      'Mes',
      'Laborables (h)',
      'Festivos (h)',
      'Total teóricas (h)',
      'Asignadas (h)',
      'Saldo mes (h)',
      'Saldo acumulado (h)',
    ];

    const dataRows = rows.map(r => [
      MONTH_NAMES[r.month - 1] ?? `Mes ${r.month}`,
      r.laborables.toFixed(2),
      r.holidays.toFixed(2),
      r.theoretical.toFixed(2),
      r.assigned.toFixed(2),
      r.difference.toFixed(2),
      r.cumulative.toFixed(2),
    ]);

    const totalsRow = [
      'TOTAL',
      totals.laborables.toFixed(2),
      totals.holidays.toFixed(2),
      totals.theoretical.toFixed(2),
      totals.assigned.toFixed(2),
      totals.difference.toFixed(2),
      '',
    ];

    const csvContent = [headers, ...dataRows, totalsRow]
      .map(row => row.map(c => `"${c}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-anual-${userName ? userName.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
      <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900'>
            Resumen anual {year}
            {userName != null && userName !== '' && (
              <span className='ml-2 text-gray-500 font-normal'>
                — {userName}
              </span>
            )}
          </h3>
          <p className='text-xs text-gray-500 mt-0.5'>
            Horas teóricas vs asignadas por mes
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleExportCSV}
          className='flex items-center gap-1 text-xs'
        >
          <Download className='w-3 h-3' />
          CSV
        </Button>
      </div>

      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap'>
                Mes
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-green-600 uppercase whitespace-nowrap'>
                Laborables
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-amber-600 uppercase whitespace-nowrap'>
                Festivos
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-blue-600 uppercase whitespace-nowrap'>
                Total teóricas
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap'>
                Asignadas
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap'>
                Saldo mes
              </th>
              <th className='px-3 py-2 text-right text-xs font-medium text-purple-600 uppercase whitespace-nowrap'>
                Saldo acum.
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {rows.map(r => {
              const isDeficit = r.difference < -5;
              const isBigDeficit = r.difference < -10;
              return (
                <tr
                  key={r.month}
                  className={
                    isBigDeficit
                      ? 'bg-red-50'
                      : isDeficit
                        ? 'bg-amber-50'
                        : 'hover:bg-gray-50'
                  }
                >
                  <td className='px-3 py-2 font-medium text-gray-900 whitespace-nowrap'>
                    {MONTH_NAMES[r.month - 1]}
                  </td>
                  <td className='px-3 py-2 text-right text-gray-700'>
                    {formatHours(r.laborables)}
                  </td>
                  <td className='px-3 py-2 text-right text-gray-700'>
                    {formatHours(r.holidays)}
                  </td>
                  <td className='px-3 py-2 text-right font-medium text-gray-900'>
                    {formatHours(r.theoretical)}
                  </td>
                  <td className='px-3 py-2 text-right text-gray-600'>
                    {formatHours(r.assigned)}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    <span
                      className={`font-medium ${
                        r.difference > 0
                          ? 'text-green-700'
                          : r.difference < 0
                            ? 'text-red-700'
                            : 'text-gray-500'
                      }`}
                    >
                      {r.difference > 0 ? '+' : ''}
                      {formatHours(r.difference)}
                    </span>
                    {isBigDeficit && (
                      <span className='ml-1 text-xs text-red-500'>●</span>
                    )}
                    {isDeficit && !isBigDeficit && (
                      <span className='ml-1 text-xs text-amber-500'>●</span>
                    )}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    <span
                      className={`font-semibold ${
                        r.cumulative > 0
                          ? 'text-purple-700'
                          : r.cumulative < 0
                            ? 'text-red-700'
                            : 'text-gray-500'
                      }`}
                    >
                      {r.cumulative > 0 ? '+' : ''}
                      {formatHours(r.cumulative)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className='bg-gray-50 border-t-2 border-gray-200'>
            <tr>
              <td className='px-3 py-2 font-bold text-gray-900 uppercase text-xs'>
                Total
              </td>
              <td className='px-3 py-2 text-right font-bold text-green-700'>
                {formatHours(totals.laborables)}
              </td>
              <td className='px-3 py-2 text-right font-bold text-amber-700'>
                {formatHours(totals.holidays)}
              </td>
              <td className='px-3 py-2 text-right font-bold text-blue-700'>
                {formatHours(totals.theoretical)}
              </td>
              <td className='px-3 py-2 text-right font-bold text-gray-700'>
                {formatHours(totals.assigned)}
              </td>
              <td className='px-3 py-2 text-right font-bold'>
                <span
                  className={
                    totals.difference >= 0 ? 'text-green-700' : 'text-red-700'
                  }
                >
                  {totals.difference > 0 ? '+' : ''}
                  {formatHours(totals.difference)}
                </span>
              </td>
              <td className='px-3 py-2' />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className='px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-500'>
        <span>
          <span className='text-amber-500 mr-1'>●</span>&gt;5h déficit
        </span>
        <span>
          <span className='text-red-500 mr-1'>●</span>&gt;10h déficit crítico
        </span>
      </div>
    </div>
  );
};

export default AnnualSummary;
