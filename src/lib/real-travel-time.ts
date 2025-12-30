'use client';

import {
  calculateTravelTime,
  isGoogleMapsAvailable,
  loadGoogleMapsAPI,
  type TravelTimeResult,
} from '@/lib/google-maps';
import { estimateTravelTime } from '@/lib/travel-time-estimator';

/**
 * Interfaz para el resultado del cálculo de tiempo de viaje real
 */
export interface RealTravelTimeResult {
  duration: number; // en segundos
  distance: number; // en metros
  success: boolean;
  errorMessage?: string;
  isEstimated?: boolean; // true si se usó estimación local en vez de Google Maps
}

export interface AddressInfo {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

// Flag para habilitar Google Maps Directions API (requiere facturación)
// Cambiar a false si no tienes facturación habilitada en Google Cloud
const USE_GOOGLE_MAPS_DIRECTIONS = true;

/**
 * Construye una dirección completa a partir de la información disponible
 */
function buildFullAddress(addressInfo: AddressInfo): string {
  const parts: string[] = [];

  if (addressInfo.address != null && addressInfo.address.trim().length > 0) {
    parts.push(addressInfo.address.trim());
  }

  if (
    addressInfo.postalCode != null &&
    addressInfo.postalCode.trim().length > 0
  ) {
    parts.push(addressInfo.postalCode.trim());
  }

  if (addressInfo.city != null && addressInfo.city.trim().length > 0) {
    parts.push(addressInfo.city.trim());
  }

  // Si no hay información suficiente, usar Mataró como ciudad por defecto
  if (parts.length === 0) {
    return 'Mataró, España';
  }

  // Asegurar que incluya España para mejor geocodificación
  const fullAddress = parts.join(', ');
  if (!fullAddress.toLowerCase().includes('españa')) {
    return `${fullAddress}, España`;
  }

  return fullAddress;
}

/**
 * Calcula el tiempo de viaje usando estimación local (sin Google Maps Directions API)
 * Esta función NO requiere facturación de Google Cloud
 */
function calculateLocalEstimate(
  fromAddress: AddressInfo,
  toAddress: AddressInfo,
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
): RealTravelTimeResult {
  const estimate = estimateTravelTime(fromAddress, toAddress, travelMode);

  return {
    duration: estimate.estimatedDuration,
    distance: estimate.estimatedDistance,
    success: true,
    isEstimated: true,
  };
}

/**
 * Calcula el tiempo de viaje real entre dos direcciones
 * Usa estimación local por defecto (no requiere facturación)
 * Si USE_GOOGLE_MAPS_DIRECTIONS es true, intentará usar Google Maps primero
 */
export async function calculateRealTravelTime(
  fromAddress: AddressInfo,
  toAddress: AddressInfo,
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
): Promise<RealTravelTimeResult> {
  // Si Google Maps Directions está deshabilitado, usar estimación local directamente
  if (!USE_GOOGLE_MAPS_DIRECTIONS) {
    return calculateLocalEstimate(fromAddress, toAddress, travelMode);
  }

  // Intentar usar Google Maps Directions API (requiere facturación)
  try {
    await loadGoogleMapsAPI();

    // Verificar si Google Maps está disponible
    if (!isGoogleMapsAvailable()) {
      // Fallback a estimación local
      return calculateLocalEstimate(fromAddress, toAddress, travelMode);
    }

    const fromFullAddress = buildFullAddress(fromAddress);
    const toFullAddress = buildFullAddress(toAddress);

    // Validar que las direcciones no estén vacías
    if (!fromFullAddress || fromFullAddress.trim() === 'Mataró, España') {
      return calculateLocalEstimate(fromAddress, toAddress, travelMode);
    }

    if (!toFullAddress || toFullAddress.trim() === 'Mataró, España') {
      return calculateLocalEstimate(fromAddress, toAddress, travelMode);
    }

    const result: TravelTimeResult = await calculateTravelTime(
      fromFullAddress,
      toFullAddress,
      travelMode
    );

    if (result.status === 'OK' && result.duration && result.distance) {
      return {
        duration: result.duration,
        distance: result.distance,
        success: true,
        isEstimated: false,
      };
    }

    // Si Google Maps falla, usar estimación local como fallback
    return calculateLocalEstimate(fromAddress, toAddress, travelMode);
  } catch {
    // Si hay cualquier error con Google Maps, usar estimación local
    return calculateLocalEstimate(fromAddress, toAddress, travelMode);
  }
}

/**
 * Calcula los tiempos de viaje para una ruta completa
 */
export async function calculateRouteRealTravelTime(
  stops: AddressInfo[],
  workerStartAddress?: AddressInfo,
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
): Promise<{
  segments: Array<{
    from: number;
    to: number;
    duration: number;
    distance: number;
    success: boolean;
    errorMessage?: string;
  }>;
  totalDuration: number;
  totalDistance: number;
  successfulSegments: number;
  totalSegments: number;
}> {
  const segments: Array<{
    from: number;
    to: number;
    duration: number;
    distance: number;
    success: boolean;
    errorMessage?: string;
  }> = [];
  let totalDuration = 0;
  let totalDistance = 0;
  let successfulSegments = 0;

  // Crear lista completa de paradas
  const allStops = workerStartAddress ? [workerStartAddress, ...stops] : stops;

  // Calcular ruta entre todas las paradas

  // Calcular segmentos consecutivos
  for (let i = 0; i < allStops.length - 1; i++) {
    const fromStop = allStops[i];
    const toStop = allStops[i + 1];

    if (fromStop === undefined || toStop === undefined) {
      continue;
    }

    const result = await calculateRealTravelTime(fromStop, toStop, travelMode);

    const baseSegment = {
      from: i,
      to: i + 1,
      duration: result.duration,
      distance: result.distance,
      success: result.success,
    };

    if (result.errorMessage != null) {
      segments.push({ ...baseSegment, errorMessage: result.errorMessage });
    } else {
      segments.push(baseSegment);
    }

    if (result.success) {
      // Solo incluir en el total si NO es el primer segmento (casa al primer servicio)
      // El primer segmento es cuando workerStartAddress existe y i === 0
      const isFirstSegmentFromHome = Boolean(workerStartAddress) && i === 0;

      if (!isFirstSegmentFromHome) {
        totalDuration += result.duration;
        totalDistance += result.distance;
      }
      successfulSegments++;
    }
  }

  return {
    segments,
    totalDuration,
    totalDistance,
    successfulSegments,
    totalSegments: segments.length,
  };
}

/**
 * Formatea la duración en segundos a un formato legible
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${Math.round(remainingSeconds)}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Formatea la distancia en metros a un formato legible
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  const kilometers = meters / 1000;
  return `${kilometers.toFixed(1)}km`;
}
