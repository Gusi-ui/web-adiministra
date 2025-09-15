'use client';

import { Clock, MapPin, Route } from 'lucide-react';

import React from 'react';

interface RouteSegment {
  id: string;
  from: string;
  to: string;
  fromAddress?: string;
  toAddress?: string;
  duration: number; // en segundos
  distance: number; // en metros
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT';
  billableTime: number; // tiempo facturable en minutos
}

interface RouteSegmentDetailsProps {
  segments: RouteSegment[];
}

const RouteSegmentDetails = ({
  segments,
}: RouteSegmentDetailsProps): React.JSX.Element => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const getTravelModeIcon = (mode: string): string => {
    switch (mode) {
      case 'DRIVING':
        return '🚗';
      case 'WALKING':
        return '🚶';
      case 'TRANSIT':
        return '🚌';
      default:
        return '📍';
    }
  };

  const getTravelModeText = (mode: string): string => {
    switch (mode) {
      case 'DRIVING':
        return 'En coche';
      case 'WALKING':
        return 'A pie';
      case 'TRANSIT':
        return 'Transporte público';
      default:
        return 'Desconocido';
    }
  };

  const calculateTotalBillableTime = (): number =>
    segments.reduce((total, segment) => total + segment.billableTime, 0);

  const totalBillableTime = calculateTotalBillableTime();

  if (segments.length === 0) {
    return (
      <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
        <div className='text-center text-gray-500'>
          <Route className='w-12 h-12 mx-auto mb-3 text-gray-300' />
          <p>No hay segmentos de ruta disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
              <Route className='w-5 h-5 text-blue-600' />
              Detalles de Ruta
            </h3>
            <p className='text-sm text-gray-600'>
              {segments.length} segmentos • Tiempo facturable total:{' '}
              {Math.floor(totalBillableTime / 60)}h {totalBillableTime % 60}min
            </p>
          </div>
        </div>
      </div>

      {/* Segments List */}
      <div className='divide-y divide-gray-100'>
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className='p-4 hover:bg-gray-50 transition-colors'
          >
            <div className='flex items-start gap-4'>
              {/* Segment Number */}
              <div className='flex-shrink-0'>
                <div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium'>
                  {index + 1}
                </div>
              </div>

              {/* Segment Details */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-lg'>
                    {getTravelModeIcon(segment.travelMode)}
                  </span>
                  <span className='text-sm font-medium text-gray-700'>
                    {getTravelModeText(segment.travelMode)}
                  </span>
                </div>

                {/* From/To */}
                <div className='space-y-1 mb-3'>
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='w-4 h-4 text-green-500' />
                    <span className='font-medium'>{segment.from}</span>
                    {Boolean(segment.fromAddress) && (
                      <span className='text-gray-500 text-xs'>
                        ({segment.fromAddress})
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='w-4 h-4 text-red-500' />
                    <span className='font-medium'>{segment.to}</span>
                    {Boolean(segment.toAddress) && (
                      <span className='text-gray-500 text-xs'>
                        ({segment.toAddress})
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3 text-sm'>
                  <div className='flex items-center gap-1'>
                    <Clock className='w-4 h-4 text-blue-500' />
                    <span className='text-gray-600'>Duración:</span>
                    <span className='font-medium'>
                      {formatDuration(segment.duration)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Route className='w-4 h-4 text-purple-500' />
                    <span className='text-gray-600'>Distancia:</span>
                    <span className='font-medium'>
                      {formatDistance(segment.distance)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Clock className='w-4 h-4 text-orange-500' />
                    <span className='text-gray-600'>Facturable:</span>
                    <span className='font-medium text-orange-600'>
                      {segment.billableTime}min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      {segments.length > 1 && (
        <div className='p-4 bg-gray-50 border-t border-gray-200'>
          <div className='flex items-center justify-center'>
            <div className='text-sm text-gray-600'>
              <span className='font-medium'>Tiempo total facturable:</span>
              <span className='ml-2 text-lg font-bold text-blue-600'>
                {Math.floor(totalBillableTime / 60)}h {totalBillableTime % 60}
                min
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteSegmentDetails;
export type { RouteSegment, RouteSegmentDetailsProps };
