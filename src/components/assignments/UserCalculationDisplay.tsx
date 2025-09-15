import React from 'react';

import Card from '@/components/ui/Card';
import type { UserCalculation } from '@/lib/user-calculations';

interface UserCalculationDisplayProps {
  calculation: UserCalculation;
  monthlyCalculation?: {
    totalDays: number;
    workingDays: number;
    holidays: number;
    totalHours: number;
    difference: number;
  };
}

export const UserCalculationDisplay: React.FC<UserCalculationDisplayProps> = ({
  calculation,
  monthlyCalculation,
}) => {
  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDifferenceText = (difference: number) => {
    if (difference > 0) return `+${difference.toFixed(1)}h (exceso)`;
    if (difference < 0) return `${difference.toFixed(1)}h (déficit)`;
    return '0h (perfecto)';
  };

  return (
    <Card className='p-6'>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>
            📊 Cálculo de Horas - {calculation.userName}{' '}
            {calculation.userSurname}
          </h3>
          <div className='text-sm text-gray-500'>
            {calculation.totalWorkers} trabajadora
            {calculation.totalWorkers !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Horas asignadas por tipo */}
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          {calculation.calculationDetails.laborablesHours > 0 && (
            <div className='bg-blue-50 p-3 rounded-lg'>
              <div className='text-sm font-medium text-blue-800'>
                Laborables
              </div>
              <div className='text-lg font-bold text-blue-900'>
                {calculation.calculationDetails.laborablesHours}h
              </div>
            </div>
          )}

          {calculation.calculationDetails.festivosHours > 0 && (
            <div className='bg-green-50 p-3 rounded-lg'>
              <div className='text-sm font-medium text-green-800'>Festivos</div>
              <div className='text-lg font-bold text-green-900'>
                {calculation.calculationDetails.festivosHours}h
              </div>
            </div>
          )}

          {calculation.calculationDetails.flexibleHours > 0 && (
            <div className='bg-purple-50 p-3 rounded-lg'>
              <div className='text-sm font-medium text-purple-800'>
                Flexible
              </div>
              <div className='text-lg font-bold text-purple-900'>
                {calculation.calculationDetails.flexibleHours}h
              </div>
            </div>
          )}

          {calculation.calculationDetails.completaHours > 0 && (
            <div className='bg-orange-50 p-3 rounded-lg'>
              <div className='text-sm font-medium text-orange-800'>
                Completa
              </div>
              <div className='text-lg font-bold text-orange-900'>
                {calculation.calculationDetails.completaHours}h
              </div>
            </div>
          )}

          {calculation.calculationDetails.personalizadaHours > 0 && (
            <div className='bg-indigo-50 p-3 rounded-lg'>
              <div className='text-sm font-medium text-indigo-800'>
                Personalizada
              </div>
              <div className='text-lg font-bold text-indigo-900'>
                {calculation.calculationDetails.personalizadaHours}h
              </div>
            </div>
          )}
        </div>

        {/* Total de horas asignadas */}
        <div className='bg-gray-50 p-4 rounded-lg'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm font-medium text-gray-700'>
                Total Horas Asignadas
              </div>
              <div className='text-2xl font-bold text-gray-900'>
                {calculation.totalAssignedHours}h
              </div>
            </div>
            <div className='text-right'>
              <div className='text-sm text-gray-500'>
                Todas las trabajadoras
              </div>
              <div className='text-sm font-medium text-gray-700'>
                {calculation.assignments.map(a => a.worker?.name).join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Cálculo mensual si está disponible */}
        {monthlyCalculation && (
          <div className='bg-yellow-50 p-4 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-medium text-yellow-800'>
                  Horas Necesarias (Mes)
                </div>
                <div className='text-lg font-bold text-yellow-900'>
                  {monthlyCalculation.totalHours.toFixed(1)}h
                </div>
                <div className='text-xs text-yellow-700'>
                  {monthlyCalculation.workingDays} días laborables -{' '}
                  {monthlyCalculation.holidays} festivos
                </div>
              </div>
              <div className='text-right'>
                <div className='text-sm text-gray-500'>Diferencia</div>
                <div
                  className={`text-lg font-bold ${getDifferenceColor(monthlyCalculation.difference)}`}
                >
                  {getDifferenceText(monthlyCalculation.difference)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de asignaciones */}
        <div>
          <h4 className='font-medium text-gray-900 mb-3'>
            Asignaciones del Usuario
          </h4>
          <div className='space-y-2'>
            {calculation.assignments.map(assignment => (
              <div
                key={assignment.id}
                className='flex items-center justify-between p-3 bg-white border rounded-lg'
              >
                <div className='flex items-center space-x-3'>
                  <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
                    <span className='text-xs font-medium text-blue-600'>
                      {assignment.worker?.name?.charAt(0)}
                      {assignment.worker?.surname?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className='text-sm font-medium text-gray-900'>
                      {assignment.worker?.name} {assignment.worker?.surname}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {assignment.assignment_type} - {assignment.monthly_hours}h
                    </div>
                  </div>
                </div>
                <div className='text-sm text-gray-500'>
                  {assignment.status === 'active' ? 'Activa' : 'Inactiva'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
