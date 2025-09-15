'use client';

import { Calendar, Clock, Download, FileText, MapPin } from 'lucide-react';

import React from 'react';

import { Button } from '@/components/ui';

import type { RouteSegment } from './RouteSegmentDetails';

interface RouteExportSummaryProps {
  segments: RouteSegment[];
  workerName?: string;
  date?: string;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
}

const RouteExportSummary = ({
  segments,
  workerName = 'Trabajadora',
  date = new Date().toLocaleDateString('es-ES'),
  onExport,
}: RouteExportSummaryProps): React.JSX.Element => {
  const totalBillableTime = segments.reduce(
    (total, segment) => total + segment.billableTime,
    0
  );
  const totalDistance = segments.reduce(
    (total, segment) => total + segment.distance,
    0
  );

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
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

  const generateCSVData = (): string => {
    const headers = [
      'Segmento',
      'Desde',
      'Hasta',
      'Modo de Transporte',
      'Duración (min)',
      'Distancia (m)',
      'Tiempo Facturable (min)',
    ];

    const rows = segments.map((segment, index) => [
      (index + 1).toString(),
      segment.from,
      segment.to,
      getTravelModeText(segment.travelMode),
      Math.round(segment.duration / 60).toString(),
      segment.distance.toString(),
      segment.billableTime.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `'${cell}'`).join(','))
      .join('\n');

    return csvContent;
  };

  const generateJSONData = (): string => {
    const data = {
      worker: workerName,
      date,
      summary: {
        totalSegments: segments.length,
        totalBillableTime,
        totalDistance,
      },
      segments: segments.map((segment, index) => ({
        segmentNumber: index + 1,
        from: segment.from,
        to: segment.to,
        fromAddress: segment.fromAddress,
        toAddress: segment.toAddress,
        travelMode: segment.travelMode,
        duration: segment.duration,
        distance: segment.distance,
        billableTime: segment.billableTime,
      })),
    };

    return JSON.stringify(data, null, 2);
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'csv' | 'json'): void => {
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = `ruta-${workerName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}`;

    switch (format) {
      case 'csv':
        downloadFile(
          generateCSVData(),
          `${baseFilename}.csv`,
          'text/csv;charset=utf-8;'
        );
        break;
      case 'json':
        downloadFile(
          generateJSONData(),
          `${baseFilename}.json`,
          'application/json;charset=utf-8;'
        );
        break;
    }

    if (onExport) {
      onExport(format);
    }
  };

  const generatePrintableReport = (): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Ruta - ${workerName} - ${date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .segments { margin-top: 20px; }
            .segment { border: 1px solid #ddd; margin-bottom: 10px; padding: 15px; border-radius: 5px; }
            .segment-header { font-weight: bold; margin-bottom: 10px; }
            .segment-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .total { background: #e8f5e8; padding: 15px; margin-top: 20px; border-radius: 5px; text-align: center; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class='header'>
            <h1>Reporte de Ruta Diaria</h1>
            <p><strong>Trabajadora:</strong> ${workerName}</p>
            <p><strong>Fecha:</strong> ${date}</p>
          </div>

          <div class='summary'>
            <h3>Resumen</h3>
            <p><strong>Total de segmentos:</strong> ${segments.length}</p>
            <p><strong>Distancia total:</strong> ${formatDistance(totalDistance)}</p>
            <p><strong>Tiempo facturable total:</strong> ${Math.floor(totalBillableTime / 60)}h ${totalBillableTime % 60}min</p>
          </div>

          <div class='segments'>
            <h3>Detalles de Segmentos</h3>
            ${segments
              .map(
                (segment, index) => `
              <div class='segment'>
                <div class='segment-header'>Segmento ${index + 1}: ${segment.from} → ${segment.to}</div>
                <div class='segment-details'>
                  <div><strong>Modo:</strong> ${getTravelModeText(segment.travelMode)}</div>
                  <div><strong>Duración:</strong> ${Math.round(segment.duration / 60)} min</div>
                  <div><strong>Distancia:</strong> ${formatDistance(segment.distance)}</div>
                  <div><strong>Tiempo facturable:</strong> ${segment.billableTime} min</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>

        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (segments.length === 0) {
    return (
      <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
        <div className='text-center text-gray-500'>
          <FileText className='w-12 h-12 mx-auto mb-3 text-gray-300' />
          <p>No hay datos de ruta para exportar</p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
              <FileText className='w-5 h-5 text-green-600' />
              Resumen de Facturación
            </h3>
            <p className='text-sm text-gray-600'>
              Reporte de desplazamientos • {date}
            </p>
          </div>
          <div className='text-right'>
            <div className='text-2xl font-bold text-blue-600'>
              {Math.floor(totalBillableTime / 60)}h {totalBillableTime % 60}min
            </div>
            <div className='text-xs text-gray-500'>Tiempo total</div>
          </div>
        </div>
      </div>

      {/* Summary Stats - Optimizado para Móvil */}
      <div className='p-3 sm:p-4 bg-gray-50'>
        {/* Versión Móvil - Tarjetas apiladas */}
        <div className='sm:hidden space-y-3'>
          <div className='bg-white rounded-lg p-3 border border-gray-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <Calendar className='w-4 h-4 text-blue-500' />
                <span className='text-xs text-gray-600 font-medium'>
                  Trabajadora
                </span>
              </div>
              <span className='text-sm font-bold text-blue-600 truncate max-w-32'>
                {workerName}
              </span>
            </div>
          </div>

          <div className='bg-white rounded-lg p-3 border border-gray-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <MapPin className='w-4 h-4 text-purple-500' />
                <span className='text-xs text-gray-600 font-medium'>
                  Segmentos
                </span>
              </div>
              <span className='text-lg font-bold text-purple-600'>
                {segments.length}
              </span>
            </div>
          </div>

          <div className='bg-white rounded-lg p-3 border border-gray-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <Clock className='w-4 h-4 text-orange-500' />
                <span className='text-xs text-gray-600 font-medium'>
                  Tiempo total
                </span>
              </div>
              <span className='text-sm font-bold text-orange-600'>
                {Math.floor(totalBillableTime / 60)}h {totalBillableTime % 60}
                min
              </span>
            </div>
          </div>
        </div>

        {/* Versión Desktop/Tablet - Grid original */}
        <div className='hidden sm:block'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4 text-blue-500' />
              <div>
                <div className='text-gray-600'>Trabajadora</div>
                <div className='font-medium'>{workerName}</div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <MapPin className='w-4 h-4 text-purple-500' />
              <div>
                <div className='text-gray-600'>Segmentos</div>
                <div className='font-medium'>{segments.length}</div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-orange-500' />
              <div>
                <div className='text-gray-600'>Tiempo total</div>
                <div className='font-medium'>
                  {Math.floor(totalBillableTime / 60)}h {totalBillableTime % 60}
                  min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options - Optimizado para Móvil */}
      <div className='p-3 sm:p-4'>
        <div className='flex items-center justify-between mb-3 sm:mb-4'>
          <h4 className='text-sm sm:text-base font-medium text-gray-900'>
            <span className='sm:hidden'>Exportar</span>
            <span className='hidden sm:inline'>Exportar reporte</span>
          </h4>
          <div className='sm:hidden text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full'>
            💡 Reportes
          </div>
        </div>

        {/* Versión Móvil - Botones en columna */}
        <div className='sm:hidden space-y-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={generatePrintableReport}
            className='w-full flex items-center justify-center gap-2 py-3'
          >
            <FileText className='w-4 h-4' />
            <span className='font-medium'>Imprimir/PDF</span>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => handleExport('csv')}
            className='w-full flex items-center justify-center gap-2 py-3'
          >
            <Download className='w-4 h-4' />
            <span className='font-medium'>Descargar CSV</span>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => handleExport('json')}
            className='w-full flex items-center justify-center gap-2 py-3'
          >
            <Download className='w-4 h-4' />
            <span className='font-medium'>Descargar JSON</span>
          </Button>
        </div>

        {/* Versión Desktop/Tablet - Botones en fila */}
        <div className='hidden sm:block'>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={generatePrintableReport}
              className='flex items-center gap-2'
            >
              <FileText className='w-4 h-4' />
              Imprimir/PDF
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleExport('csv')}
              className='flex items-center gap-2'
            >
              <Download className='w-4 h-4' />
              Descargar CSV
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleExport('json')}
              className='flex items-center gap-2'
            >
              <Download className='w-4 h-4' />
              Descargar JSON
            </Button>
          </div>
        </div>

        {/* Información adicional - Optimizada para móvil */}
        <div className='mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200'>
          <div className='flex items-start space-x-2'>
            <div className='w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0'>💡</div>
            <div className='text-xs sm:text-sm text-blue-800'>
              <div className='font-medium mb-1'>💡 Consejos de uso:</div>
              <div className='sm:hidden space-y-1'>
                <div>
                  • <strong>PDF:</strong> Para presentaciones
                </div>
                <div>
                  • <strong>CSV:</strong> Para Excel/facturación
                </div>
                <div>
                  • <strong>JSON:</strong> Para sistemas
                </div>
              </div>
              <div className='hidden sm:block'>
                Usa el reporte impreso o PDF para presentar a la empresa. Los
                archivos CSV/JSON son útiles para sistemas de facturación.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteExportSummary;
export type { RouteExportSummaryProps };
