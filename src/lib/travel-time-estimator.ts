'use client';

/**
 * Sistema de estimación de tiempo de viaje sin dependencia de geocodificación
 * Utiliza cálculos aproximados basados en distancia estimada y velocidades promedio
 */

interface TravelEstimate {
  estimatedDuration: number; // en segundos
  estimatedDistance: number; // en metros
  confidence: 'high' | 'medium' | 'low';
  method: 'postal_code' | 'city_distance' | 'default';
}

interface AddressInfo {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

// Velocidades promedio por modo de transporte (km/h)
const AVERAGE_SPEEDS = {
  DRIVING: 30, // velocidad promedio en ciudad
  WALKING: 5, // velocidad promedio caminando
  TRANSIT: 20, // velocidad promedio transporte público
} as const;

// Tiempo base mínimo por segmento (minutos)
const BASE_TIME_MINUTES = {
  DRIVING: 5,
  WALKING: 10,
  TRANSIT: 15,
} as const;

/**
 * Extrae código postal de una dirección
 */
function extractPostalCode(address: string): string | null {
  // Buscar patrones de código postal español (5 dígitos)
  const postalCodeMatch = address.match(/\b(\d{5})\b/);
  return postalCodeMatch?.[1] ?? null;
}

/**
 * Extrae ciudad de una dirección
 */
function extractCity(address: string): string | null {
  // Buscar ciudad después de coma o al final
  const parts = address.split(',').map(part => part.trim());
  if (parts.length >= 2) {
    // Tomar la penúltima parte como ciudad (antes del código postal)
    const city = parts[parts.length - 2];
    return city ?? null;
  }
  return null;
}

/**
 * Calcula distancia aproximada entre códigos postales
 */
function estimateDistanceByPostalCode(
  fromPostal: string,
  toPostal: string
): number {
  // Estimación muy básica basada en diferencia de códigos postales
  const fromNum = parseInt(fromPostal);
  const toNum = parseInt(toPostal);

  if (isNaN(fromNum) || isNaN(toNum)) {
    return 5000; // 5km por defecto
  }

  const diff = Math.abs(fromNum - toNum);

  // Estimación: cada 100 unidades de diferencia ≈ 10km
  if (diff === 0) return 1000; // mismo código postal: 1km
  if (diff < 10) return 2000; // códigos cercanos: 2km
  if (diff < 100) return 5000; // misma zona: 5km
  if (diff < 1000) return 15000; // zonas cercanas: 15km

  return Math.min(diff * 100, 50000); // máximo 50km
}

/**
 * Calcula distancia aproximada entre ciudades
 */
function estimateDistanceByCities(fromCity: string, toCity: string): number {
  const city1 = fromCity.toLowerCase().trim();
  const city2 = toCity.toLowerCase().trim();

  if (city1 === city2) {
    return 3000; // misma ciudad: 3km promedio
  }

  // Distancias conocidas entre ciudades principales de Cataluña
  const cityDistances: Record<string, Record<string, number>> = {
    barcelona: {
      mataró: 30000,
      badalona: 10000,
      sabadell: 25000,
      terrassa: 30000,
      girona: 100000,
      lleida: 160000,
      tarragona: 100000,
    },
    mataró: {
      barcelona: 30000,
      badalona: 20000,
      girona: 70000,
    },
    badalona: {
      barcelona: 10000,
      mataró: 20000,
    },
  };

  // Buscar distancia conocida
  if (cityDistances[city1]?.[city2] !== undefined) {
    return cityDistances[city1][city2];
  }
  if (cityDistances[city2]?.[city1] !== undefined) {
    return cityDistances[city2][city1];
  }

  // Distancia por defecto entre ciudades diferentes
  return 20000; // 20km
}

/**
 * Estima tiempo de viaje entre dos direcciones
 */
export function estimateTravelTime(
  fromAddress: AddressInfo,
  toAddress: AddressInfo,
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
): TravelEstimate {
  const speed = AVERAGE_SPEEDS[travelMode];
  const baseTime = BASE_TIME_MINUTES[travelMode];

  let estimatedDistance = 5000; // 5km por defecto
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let method: 'postal_code' | 'city_distance' | 'default' = 'default';

  // Intentar extraer información de las direcciones
  const fromPostal =
    fromAddress.postalCode ?? extractPostalCode(fromAddress.address ?? '');
  const toPostal =
    toAddress.postalCode ?? extractPostalCode(toAddress.address ?? '');

  const fromCity = fromAddress.city ?? extractCity(fromAddress.address ?? '');
  const toCity = toAddress.city ?? extractCity(toAddress.address ?? '');

  // Método 1: Comparar códigos postales (más preciso)
  if (
    fromPostal !== null &&
    fromPostal.length > 0 &&
    toPostal !== null &&
    toPostal.length > 0
  ) {
    estimatedDistance = estimateDistanceByPostalCode(fromPostal, toPostal);
    confidence = 'high';
    method = 'postal_code';
  } // Método 2: Comparar ciudades
  else if (
    fromCity !== null &&
    fromCity.length > 0 &&
    toCity !== null &&
    toCity.length > 0
  ) {
    estimatedDistance = estimateDistanceByCities(fromCity, toCity);
    confidence = 'medium';
    method = 'city_distance';
  }
  // Calcular tiempo basado en distancia y velocidad
  const timeHours = estimatedDistance / 1000 / speed;
  const timeMinutes = Math.max(timeHours * 60, baseTime);
  const estimatedDuration = Math.round(timeMinutes * 60); // convertir a segundos

  return {
    estimatedDuration,
    estimatedDistance,
    confidence,
    method,
  };
}

/**
 * Estima tiempo total para una ruta con múltiples paradas
 */
export function estimateRouteTime(
  stops: Array<{
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
  }>,
  travelMode: 'DRIVING' | 'WALKING' | 'TRANSIT' = 'DRIVING'
): {
  segments: Array<TravelEstimate & { from: number; to: number }>;
  totalDuration: number;
  totalDistance: number;
  averageConfidence: 'high' | 'medium' | 'low';
} {
  const segments: Array<TravelEstimate & { from: number; to: number }> = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    if (from === null || from === undefined || to === null || to === undefined)
      continue;
    const estimate = estimateTravelTime(from, to, travelMode);
    segments.push({
      ...estimate,
      from: i,
      to: i + 1,
    });
  }

  const totalDuration = segments.reduce(
    (sum, seg) => sum + seg.estimatedDuration,
    0
  );
  const totalDistance = segments.reduce(
    (sum, seg) => sum + seg.estimatedDistance,
    0
  );

  // Calcular confianza promedio
  const confidenceScores = segments.map(seg => {
    switch (seg.confidence) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 1;
    }
  });

  const avgScore =
    confidenceScores.reduce((sum, score) => sum + score, 0) /
    confidenceScores.length;
  const averageConfidence: 'high' | 'medium' | 'low' =
    avgScore >= 2.5 ? 'high' : avgScore >= 1.5 ? 'medium' : 'low';
  return {
    segments,
    totalDuration,
    totalDistance,
    averageConfidence,
  };
}

/**
 * Formatea duración en texto legible
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Formatea distancia en texto legible
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}
