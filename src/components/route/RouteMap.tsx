'use client';

import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui';
import useSimpleRouteSegments from '@/hooks/useSimpleRouteSegments';
import { formatDistance, formatDuration } from '@/lib/real-travel-time';

import RouteExportSummary from './RouteExportSummary';
import SimpleRouteDetails from './SimpleRouteDetails';

interface RouteStop {
  assignmentId: string;
  userLabel: string;
  start: string;
  end: string;
  order: number;
  address?: string | null | undefined;
  postalCode?: string | null;
  city?: string | null;
}

interface RouteMapProps {
  routeStops: RouteStop[];
  workerInfo?: {
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
  } | null;
  workerName?: string;
  date?: string;
}

const RouteMap = ({
  routeStops,
  workerInfo,
  workerName = 'Trabajadora',
  date,
}: RouteMapProps): React.JSX.Element => {
  const [travelMode, setTravelMode] = useState<
    'DRIVING' | 'WALKING' | 'TRANSIT'
  >(() => {
    if (typeof window === 'undefined') return 'DRIVING';
    const saved = window.localStorage.getItem('route_travel_mode');
    return saved === 'WALKING' || saved === 'TRANSIT' ? saved : 'DRIVING';
  });

  const [showStopsList, setShowStopsList] = useState(true);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);
  const [showExportSummary, setShowExportSummary] = useState(false);

  // Memoizar workerInfo para evitar recreaciones innecesarias
  const memoizedWorkerInfo = useMemo(() => {
    if (workerInfo) {
      const info: {
        address?: string | null;
        postalCode?: string | null;
        city?: string | null;
      } = {};
      if (workerInfo.address !== undefined) info.address = workerInfo.address;
      if (workerInfo.postalCode !== undefined)
        info.postalCode = workerInfo.postalCode;
      if (workerInfo.city !== undefined) info.city = workerInfo.city;
      return info;
    }
    return null;
  }, [workerInfo]);

  // Hook para calcular segmentos de ruta usando Google Maps API
  const {
    segments,
    isLoading: segmentsLoading,
    error: segmentsError,
    totalBillableTime,
    totalDistance,
    confidence,
    refreshSegments,
  } = useSimpleRouteSegments({
    routeStops,
    workerInfo: memoizedWorkerInfo,
    travelMode,
  });

  const handleTravelModeChange = (mode: 'DRIVING' | 'WALKING' | 'TRANSIT') => {
    setTravelMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('route_travel_mode', mode);
    }
  };

  const handleToggleStopsList = () => {
    setShowStopsList(!showStopsList);
  };

  const handleToggleSegmentDetails = () => {
    setShowSegmentDetails(!showSegmentDetails);
  };

  const handleToggleExportSummary = () => {
    setShowExportSummary(!showExportSummary);
  };

  if (routeStops.length === 0) {
    return (
      <div className='p-4 text-center text-gray-500'>
        <p>No hay paradas programadas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className='w-full space-y-4'>
      {/* Panel de paradas numeradas */}
      <div className='bg-white rounded-lg border border-gray-200'>
        <button
          onClick={handleToggleStopsList}
          className='w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors'
        >
          <h3 className='text-sm font-semibold text-gray-900'>
            📍 Paradas ({routeStops.length})
          </h3>
          <span className='text-gray-400 text-xs'>
            {showStopsList ? '▲ Ocultar' : '▼ Mostrar'}
          </span>
        </button>
        {showStopsList && (
          <div className='px-4 pb-4 space-y-2'>
            {routeStops.map((stop, index) => (
              <div
                key={`${stop.assignmentId}-${index}`}
                className='flex items-start gap-3'
              >
                <div className='flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5'>
                  {index + 1}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-900 truncate'>
                    {stop.userLabel}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {stop.start} – {stop.end}
                    {stop.address != null && stop.address !== '' && (
                      <span className='ml-2 text-gray-400 truncate'>
                        · {stop.address}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controles de modo de viaje - Sin label para mejor legibilidad */}
      <div className='flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg'>
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            <Button
              variant={travelMode === 'DRIVING' ? 'primary' : 'outline'}
              size='sm'
              onClick={() => handleTravelModeChange('DRIVING')}
            >
              🚗 Conducir
            </Button>
            <Button
              variant={travelMode === 'WALKING' ? 'primary' : 'outline'}
              size='sm'
              onClick={() => handleTravelModeChange('WALKING')}
            >
              🚶 Caminar
            </Button>
            <Button
              variant={travelMode === 'TRANSIT' ? 'primary' : 'outline'}
              size='sm'
              onClick={() => handleTravelModeChange('TRANSIT')}
            >
              🚌 Transporte
            </Button>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={refreshSegments}
          disabled={segmentsLoading}
        >
          {segmentsLoading ? '⏳ Calculando...' : '🔄 Recalcular'}
        </Button>
      </div>

      {/* Detalles de la ruta */}
      <SimpleRouteDetails
        segments={segments}
        isLoading={segmentsLoading}
        error={segmentsError}
        totalBillableTime={totalBillableTime}
        totalDistance={totalDistance}
        confidence={confidence}
        onRefresh={refreshSegments}
      />

      {/* Controles adicionales - Optimizados para móvil */}
      <div className='flex gap-2 flex-wrap sm:flex-nowrap'>
        <Button
          variant='outline'
          size='sm'
          onClick={handleToggleSegmentDetails}
          className='flex-1 sm:flex-none text-xs sm:text-sm'
        >
          {showSegmentDetails ? '👁️ Ocultar' : '👁️ Mostrar'} detalles
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={handleToggleExportSummary}
          className='flex-1 sm:flex-none text-xs sm:text-sm'
        >
          {showExportSummary ? '📊 Ocultar' : '📊 Mostrar'} exportar
        </Button>
      </div>

      {/* Detalles de segmentos */}
      {showSegmentDetails && (
        <div className='bg-white rounded-lg shadow-sm border p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Detalles Completos de Segmentos
          </h3>
          <div className='space-y-4'>
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className='border rounded-lg p-4 bg-gray-50'
              >
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='font-medium text-gray-900'>
                    Segmento {index + 1}: {segment.from} → {segment.to}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      segment.duration > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {segment.duration > 0 ? 'Calculado' : 'Error'}
                  </span>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <p className='text-gray-600 mb-1'>Direcciones:</p>
                    <p className='text-gray-900'>
                      Desde: {segment.fromAddress ?? 'No especificada'}
                    </p>
                    <p className='text-gray-900'>
                      Hasta: {segment.toAddress ?? 'No especificada'}
                    </p>
                  </div>

                  <div>
                    <p className='text-gray-600 mb-1'>Métricas:</p>
                    <p className='text-gray-900'>
                      Tiempo: {formatDuration(segment.duration)}
                    </p>
                    <p className='text-gray-900'>
                      Distancia: {formatDistance(segment.distance)}
                    </p>
                    <p className='text-gray-900'>
                      Tiempo facturable: {segment.billableTime} min
                    </p>
                    <p className='text-gray-900'>
                      Modo:{' '}
                      {segment.travelMode === 'DRIVING'
                        ? 'Conducir'
                        : segment.travelMode === 'WALKING'
                          ? 'Caminar'
                          : 'Transporte público'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de exportación */}
      {showExportSummary && (
        <RouteExportSummary
          segments={segments}
          workerName={workerName}
          date={date ?? new Date().toLocaleDateString('es-ES')}
          confidence={confidence}
        />
      )}

      {/* Información adicional */}
      <div className='p-4 bg-blue-50 rounded-lg'>
        <h3 className='font-medium text-blue-900 mb-2'>
          Información del sistema
        </h3>
        <div className='text-sm text-blue-700 space-y-1'>
          <p>• Trabajadora: {workerName}</p>
          <p>• Total de paradas: {routeStops.length}</p>
          <p>
            • Modo de viaje:{' '}
            {travelMode === 'DRIVING'
              ? 'Conducir'
              : travelMode === 'WALKING'
                ? 'Caminar'
                : 'Transporte público'}
          </p>
          <p>
            • Origen de datos:{' '}
            {confidence === 'high'
              ? 'Google Maps API (tiempo real)'
              : confidence === 'medium'
                ? 'Estimación parcial con Google Maps'
                : 'Estimación local (sin API)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
