'use client';

import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BalanceChartMonth {
  month: number;
  laborables: number;
  holidays: number;
  assigned: number;
  cumulative: number;
}

interface BalanceChartProps {
  data: BalanceChartMonth[];
  title?: string;
}

const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const BalanceChart: React.FC<BalanceChartProps> = ({
  data,
  title = 'Evolución mensual de horas',
}) => {
  const chartData = data.map(d => ({
    name: MONTH_NAMES_SHORT[d.month - 1] ?? `M${d.month}`,
    Laborables: Number(d.laborables.toFixed(1)),
    Festivos: Number(d.holidays.toFixed(1)),
    Asignadas: Number(d.assigned.toFixed(1)),
    Saldo: Number(d.cumulative.toFixed(1)),
  }));

  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <h3 className='text-sm font-semibold text-gray-900 mb-4'>{title}</h3>
      <ResponsiveContainer width='100%' height={260}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
          <XAxis
            dataKey='name'
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId='hours'
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            unit='h'
          />
          <YAxis
            yAxisId='balance'
            orientation='right'
            tick={{ fontSize: 11, fill: '#8b5cf6' }}
            axisLine={false}
            tickLine={false}
            unit='h'
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}h`, name]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType='circle'
            iconSize={8}
          />
          <Bar
            yAxisId='hours'
            dataKey='Laborables'
            stackId='total'
            fill='#22c55e'
            radius={[0, 0, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            yAxisId='hours'
            dataKey='Festivos'
            stackId='total'
            fill='#f59e0b'
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId='hours'
            type='monotone'
            dataKey='Asignadas'
            stroke='#6b7280'
            strokeWidth={2}
            strokeDasharray='4 2'
            dot={false}
          />
          <Line
            yAxisId='balance'
            type='monotone'
            dataKey='Saldo'
            stroke='#8b5cf6'
            strokeWidth={2}
            dot={{ r: 3, fill: '#8b5cf6' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className='flex flex-wrap gap-4 mt-3 text-xs text-gray-500'>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-green-500 inline-block' />
          Laborables
        </span>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-amber-400 inline-block' />
          Festivos
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='w-5 h-0.5 bg-gray-400 inline-block'
            style={{ borderTop: '2px dashed #9ca3af' }}
          />
          Asignadas (objetivo)
        </span>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-purple-500 inline-block' />
          Saldo acumulado
        </span>
      </div>
    </div>
  );
};

export default BalanceChart;
