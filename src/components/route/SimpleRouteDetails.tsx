'use client';

import { AlertTriangle, CheckCircle, Clock, Info, MapPin } from 'lucide-react';

import React from 'react';

import type { RouteSegment } from '@/components/route/RouteSegmentDetails';
import { formatDistance, formatDuration } from '@/lib/real-travel-time';

interface SimpleRouteDetailsProps {
  segments: RouteSegment[];
  isLoading: boolean;
  error: string | null;
  totalBillableTime: number;
  totalDistance: number;
  confidence: 'high' | 'medium' | 'low';
  onRefresh?: () => void;
}

const SimpleRouteDetails: React.FC<SimpleRouteDetailsProps> = ({
  segments,
  isLoading,
  error,
  totalBillableTime,
  totalDistance,
  confidence,
  onRefresh,
}) => {
  const getConfidenceColor = (conf: 'high' | 'medium' | 'low') => {
    switch (conf) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConfidenceIcon = (conf: 'high' | 'medium' | 'low') => {
    switch (conf) {
      case 'high':
        return <CheckCircle className='w-4 h-4' />;
      case 'medium':
        return <Info className='w-4 h-4' />;
      case 'low':
        return <AlertTriangle className='w-4 h-4' />;
      default:
        return <Info className='w-4 h-4' />;
    }
  };

  const getConfidenceText = (conf: 'high' | 'medium' | 'low') => {
    switch (conf) {
      case 'high':
        return 'Estimación precisa';
      case 'medium':
        return 'Estimación aproximada';
      case 'low':
        return 'Estimación básica';
      default:
        return 'Estimación desconocida';
    }
  };

  if (isLoading) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-6'>
        <div className='flex items-center justify-center space-x-2'>
          <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600'></div>
          <span className='text-gray-600'>
            Calculando tiempos de desplazamiento...
          </span>
        </div>
      </div>
    );
  }

  // Filtrar segmentos exitosos para mostrar
  const successfulSegments = segments.filter(
    segment => segment.duration > 0 && segment.distance > 0
  );

  // Si hay error pero no hay segmentos exitosos, mostrar solo el error
  if (Boolean(error) && successfulSegments.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-6'>
        <div className='flex items-center space-x-2 text-red-600 mb-4'>
          <AlertTriangle className='w-5 h-5' />
          <span className='font-medium'>Error en el cálculo</span>
        </div>
        <p className='text-gray-700 mb-4'>{error}</p>
        <div className='bg-blue-50 border border-blue-200 rounded-md p-3 mb-4'>
          <p className='text-sm text-blue-800'>
            <strong>Nota:</strong> Todos los cálculos fallaron. Esto puede
            deberse a:
          </p>
          <ul className='text-sm text-blue-700 mt-2 ml-4 list-disc'>
            <li>Direcciones incompletas o incorrectas</li>
            <li>Límites temporales de la API de Google Maps</li>
            <li>Problemas de conectividad</li>
          </ul>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (successfulSegments.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-6'>
        <div className='text-center text-gray-500'>
          <MapPin className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p>No hay segmentos de ruta para mostrar</p>
          <p className='text-sm mt-1'>
            Asegúrate de que las direcciones estén completas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Mostrar advertencia si hay error pero también segmentos exitosos */}
      {Boolean(error) && successfulSegments.length > 0 && (
        <div className='bg-white rounded-lg shadow-sm border p-6'>
          <div className='flex items-center space-x-2 text-orange-600 mb-4'>
            <AlertTriangle className='w-5 h-5' />
            <span className='font-medium'>Advertencia en el cálculo</span>
          </div>
          <p className='text-gray-700 mb-4'>{error}</p>
          <div className='bg-blue-50 border border-blue-200 rounded-md p-3 mb-4'>
            <p className='text-sm text-blue-800'>
              <strong>Nota:</strong> Algunos cálculos pueden fallar debido a:
            </p>
            <ul className='text-sm text-blue-700 mt-2 ml-4 list-disc'>
              <li>Direcciones incompletas o incorrectas</li>
              <li>Límites temporales de la API de Google Maps</li>
              <li>Problemas de conectividad</li>
            </ul>
            <p className='text-sm text-blue-700 mt-2'>
              Los cálculos exitosos se muestran abajo.
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Mostrar datos exitosos */}
      <div className='bg-white rounded-lg shadow-sm border'>
        {/* Encabezado con resumen - Optimizado para Móvil */}
        <div className='p-3 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sm:bg-gray-50'>
          {/* Header principal */}
          <div className='flex items-center justify-between mb-3 sm:mb-4'>
            <div className='flex items-center space-x-2'>
              <div className='w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center'>
                <MapPin className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600' />
              </div>
              <h3 className='text-sm sm:text-lg font-semibold text-gray-900'>
                <span className='sm:hidden'>Detalles</span>
                <span className='hidden sm:inline'>Detalles de Ruta</span>
              </h3>
            </div>
            {/* Indicador de confianza - Compacto en móvil */}
            <div
              className={`flex items-center space-x-1 ${getConfidenceColor(confidence)}`}
            >
              {getConfidenceIcon(confidence)}
              <span className='text-xs sm:text-sm font-medium'>
                <span className='sm:hidden'>
                  {confidence === 'high' && 'Preciso'}
                  {confidence === 'medium' && 'Aprox.'}
                  {confidence === 'low' && 'Básico'}
                </span>
                <span className='hidden sm:inline'>
                  {getConfidenceText(confidence)}
                </span>
              </span>
            </div>
          </div>

          {/* Versión Móvil - Tarjetas apiladas */}
          <div className='sm:hidden space-y-3'>
            <div className='bg-white rounded-lg p-3 border border-blue-200'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Clock className='w-4 h-4 text-blue-500' />
                  <span className='text-xs text-gray-600 font-medium'>
                    Tiempo total
                  </span>
                </div>
                <span className='text-lg font-bold text-blue-600'>
                  {formatDuration(totalBillableTime * 60)}
                </span>
              </div>
            </div>

            <div className='bg-white rounded-lg p-3 border border-green-200'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <MapPin className='w-4 h-4 text-green-500' />
                  <span className='text-xs text-gray-600 font-medium'>
                    Distancia total
                  </span>
                </div>
                <span className='text-lg font-bold text-green-600'>
                  {formatDistance(totalDistance)}
                </span>
              </div>
            </div>
          </div>

          {/* Versión Desktop/Tablet - Grid original */}
          <div className='hidden sm:block'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-blue-600'>
                  {formatDuration(totalBillableTime * 60)}
                </div>
                <div className='text-sm text-gray-600'>Tiempo total</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-600'>
                  {formatDistance(totalDistance)}
                </div>
                <div className='text-sm text-gray-600'>Distancia total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de segmentos - Optimizada para Móvil */}
        <div className='p-3 sm:p-6'>
          <div className='flex items-center justify-between mb-3 sm:mb-4'>
            <h4 className='text-sm sm:text-md font-medium text-gray-900 flex items-center'>
              <span className='sm:hidden'>Viajes</span>
              <span className='hidden sm:inline'>Segmentos de viaje</span>
            </h4>
            <div className='sm:hidden bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium'>
              {successfulSegments.length} viajes
            </div>
          </div>

          <div className='space-y-2 sm:space-y-4'>
            {successfulSegments.map((segment, index) => (
              <div key={segment.id}>
                {/* Versión Móvil - Compacta */}
                <div className='sm:hidden bg-gray-50 rounded-lg p-3 border border-gray-200'>
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex items-center space-x-2 flex-1 min-w-0'>
                      <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                        {index + 1}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium text-gray-900 truncate'>
                          {segment.from}
                        </div>
                        <div className='flex items-center space-x-1 text-xs text-gray-500'>
                          <span>→</span>
                          <span className='truncate'>{segment.to}</span>
                        </div>
                      </div>
                    </div>
                    <div className='text-right ml-2'>
                      <div className='text-sm font-bold text-blue-600'>
                        {formatDuration(segment.duration)}
                      </div>
                      <div className='text-xs text-gray-500'>
                        {formatDistance(segment.distance)}
                      </div>
                    </div>
                  </div>

                  {/* Direcciones en móvil - Solo si son relevantes */}
                  {(Boolean(segment.fromAddress) ||
                    Boolean(segment.toAddress)) && (
                    <div className='mt-2 pt-2 border-t border-gray-200'>
                      <div className='text-xs text-gray-500 space-y-1'>
                        {Boolean(segment.fromAddress) && (
                          <div className='flex items-start space-x-1'>
                            <span className='font-medium w-10 flex-shrink-0'>
                              Desde:
                            </span>
                            <span className='flex-1 break-words'>
                              {segment.fromAddress}
                            </span>
                          </div>
                        )}
                        {Boolean(segment.toAddress) && (
                          <div className='flex items-start space-x-1'>
                            <span className='font-medium w-10 flex-shrink-0'>
                              Hasta:
                            </span>
                            <span className='flex-1 break-words'>
                              {segment.toAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Versión Desktop/Tablet - Original mejorada */}
                <div className='hidden sm:block'>
                  <div className='flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors'>
                    <div className='flex-shrink-0'>
                      <div className='w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium'>
                        {index + 1}
                      </div>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2 mb-1'>
                        <MapPin className='w-4 h-4 text-gray-400' />
                        <span className='text-sm font-medium text-gray-900'>
                          {segment.from} → {segment.to}
                        </span>
                      </div>

                      {(Boolean(segment.fromAddress) ||
                        Boolean(segment.toAddress)) && (
                        <div className='text-xs text-gray-500 ml-6'>
                          {Boolean(segment.fromAddress) && (
                            <div>Desde: {segment.fromAddress}</div>
                          )}
                          {Boolean(segment.toAddress) && (
                            <div>Hasta: {segment.toAddress}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className='flex items-center space-x-4 text-sm'>
                      <div className='flex items-center space-x-1'>
                        <Clock className='w-4 h-4 text-gray-400' />
                        <span className='text-gray-700'>
                          {formatDuration(segment.duration)}
                        </span>
                      </div>

                      <div className='text-gray-700'>
                        {formatDistance(segment.distance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota informativa */}
        <div className='p-4 bg-blue-50 border-t'>
          <div className='flex items-start space-x-2'>
            <Info className='w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0' />
            <div className='text-sm text-blue-800'>
              <p className='font-medium mb-1'>
                Información sobre las estimaciones:
              </p>
              <ul className='text-xs space-y-1 text-blue-700'>
                <li>
                  • Los tiempos se calculan basándose en distancias aproximadas
                  y velocidades promedio
                </li>
                <li>
                  • Las estimaciones pueden variar según el tráfico, condiciones
                  meteorológicas y otros factores
                </li>
                <li>
                  • Para mayor precisión, considera usar herramientas de
                  navegación en tiempo real
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleRouteDetails;
