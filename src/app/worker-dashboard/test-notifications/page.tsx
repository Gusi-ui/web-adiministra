'use client';

import { useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationType, WorkerNotificationInsert } from '@/types';
import NotificationTester from '@/utils/test-notifications';

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      new_user: 'Nuevo Usuario',
      user_removed: 'Usuario Eliminado',
      schedule_change: 'Cambio de Horario',
      assignment_change: 'Cambio de Asignación',
      route_update: 'Actualización de Ruta',
      service_start: 'Inicio de Servicio',
      service_end: 'Fin de Servicio',
      system_message: 'Mensaje del Sistema',
      reminder: 'Recordatorio',
      urgent: 'Urgente',
      holiday_update: 'Actualización de Festivos',
    };
    return labels[type];
  };

  const runFullTest = async () => {
    if (user?.id === null || user?.id === undefined) {
      addLog('❌ Error: Usuario no autenticado');
      return;
    }

    setIsRunning(true);
    setTestResults({});
    setLogs([]);

    addLog('🚀 Iniciando prueba completa del sistema...');

    try {
      const tester = new NotificationTester();

      // Interceptar console.log para mostrar en la UI
      // eslint-disable-next-line no-console
      const originalLog = console.log;
      const interceptLog = (...args: unknown[]) => {
        addLog(args.map(arg => String(arg)).join(' '));
        // Log intercepted for UI display - intentionally not logging to console
      };
      // eslint-disable-next-line no-console
      console.log = interceptLog;

      await tester.runFullTest();

      // Restaurar console.log
      // eslint-disable-next-line no-console
      console.log = originalLog;

      addLog('✅ Prueba completa finalizada');
    } catch (error) {
      addLog(`❌ Error durante las pruebas: ${String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testSingleNotification = async (type: NotificationType) => {
    if (user?.id === null || user?.id === undefined) {
      addLog('❌ Error: Usuario no autenticado');
      return;
    }

    addLog(`🧪 Probando notificación tipo: ${type}`);

    try {
      const tester = new NotificationTester();

      const notification: Omit<WorkerNotificationInsert, 'worker_id'> = {
        type,
        title: `Prueba ${getTypeLabel(type)}`,
        body: `Notificación de prueba para tipo: ${type}`,
        priority: 'normal',
      };

      if (tester.notificationService === null) {
        throw new Error('Notification service not available');
      }

      // Type assertion necesaria para Supabase - servicio dinámicamente cargado
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = await (
        tester.notificationService as any
      ).createAndSendNotification(user.id, notification);
      /* eslint-enable @typescript-eslint/no-explicit-any */

      const success = result !== null && result !== undefined;
      setTestResults(prev => ({ ...prev, [type]: success }));
      addLog(
        `${success ? '✅' : '❌'} Notificación ${type}: ${success ? 'OK' : 'Error'}`
      );
    } catch (error) {
      addLog(`❌ Error probando ${type}: ${String(error)}`);
      setTestResults(prev => ({ ...prev, [type]: false }));
    }
  };

  const testSounds = async () => {
    addLog('🔊 Probando sonidos de notificación...');
    addLog(
      '💡 Si los sonidos no se reproducen, haz clic en cualquier lugar de la página para activar los sonidos (política de autoplay del navegador)'
    );
    addLog(
      '🔊 Los sonidos ahora tienen volumen al 80% - deberías escucharlos claramente'
    );

    const tester = new NotificationTester();
    await tester.testNotificationSounds();
    addLog('✅ Prueba de sonidos iniciada correctamente');
  };

  const testLongSound = async () => {
    addLog('🔊 PRUEBA LARGA: Reproduciendo sonido 10 veces seguidas...');
    addLog(
      '🔊 Volumen al 100% - Deberías escuchar un sonido continuo de ~2 segundos'
    );

    const tester = new NotificationTester();
    await tester.testLongSound();

    addLog('✅ Prueba larga completada');
  };

  const testLoudSound = async () => {
    addLog('🔊 PRUEBA FUERTE: Reproduciendo sonido con volumen máximo...');
    addLog(
      '🔊 15 repeticiones rápidas - Sonido CONTINUO y potente de ~2.5 segundos'
    );

    const tester = new NotificationTester();
    await tester.testLoudSound();

    addLog('✅ Prueba fuerte completada');
  };

  const testSimpleAudio = async () => {
    addLog('🎵 PRUEBA SIMPLE: 1 sonido fuerte y claro...');
    addLog(
      '🔊 Volumen máximo - Si no lo escuchas, revisa el volumen de tu sistema'
    );

    const tester = new NotificationTester();
    await tester.testSimpleAudio();

    addLog('✅ Prueba simple completada');
  };

  const testSyntheticAudio = async () => {
    addLog('🔊 PRUEBA SINTÉTICA: Generando tono audible...');
    addLog('💡 Este test genera un tono de 1000 Hz usando Web Audio API');

    const tester = new NotificationTester();
    await tester.testSyntheticAudio();
    addLog('✅ Prueba sintética completada');
    addLog('🔊 ¡ESCUCHA! Deberías oír un tono agudo durante 2 segundos');
  };

  const testWavAudio = async () => {
    addLog('🔊 PRUEBA WAV: Reproduciendo archivo de audio audible...');
    addLog(
      '💡 Este test reproduce un archivo WAV de 1 segundo con tono continuo'
    );

    const tester = new NotificationTester();
    await tester.testWavAudio();
    addLog('✅ Prueba WAV completada');
    addLog('🔊 ¡ESCUCHA! Deberías oír un tono continuo durante 1 segundo');
  };

  const forceActivateAudio = async () => {
    try {
      addLog('🎵 FORZANDO activación de audio...');

      // Crear múltiples instancias de audio para asegurar activación
      for (let i = 1; i <= 5; i++) {
        const audio = new Audio('/sounds/notification-default.mp3');
        audio.volume = 0.8 + i * 0.04; // Volumen progresivamente más alto

        try {
          await audio.play();
          addLog(`✅ Audio ${i}/5 activado correctamente`);

          // Esperar un poco entre activaciones
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (playError) {
          addLog(`⚠️ Audio ${i}/5 falló: ${String(playError)}`);
        }
      }

      addLog('🎵 ¡Activación forzada completada!');
      addLog('🔊 Ahora intenta probar los sonidos nuevamente');
    } catch (error) {
      addLog('❌ Error al forzar activación:');
      addLog(String(error));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  const activateSounds = async () => {
    try {
      addLog('🎵 Activando audio del navegador...');

      // Crear y reproducir un audio muy corto para activar el autoplay
      const testAudio = new Audio('/sounds/notification-default.mp3');
      testAudio.volume = 0.7; // Volumen alto para activación

      await testAudio.play();
      addLog('✅ Audio activado correctamente');
      addLog('🎵 Ahora puedes probar los sonidos sin problemas de autoplay');
    } catch {
      addLog(
        '❌ Error al activar audio: Haz clic en cualquier lugar de la página primero'
      );
      addLog('💡 Si no funciona, usa "Forzar Activación de Audio"');
      addLog(
        '💡 Los navegadores modernos requieren interacción del usuario para reproducir audio'
      );
    }
  };

  const notificationTypes: NotificationType[] = [
    'new_user',
    'user_removed',
    'schedule_change',
    'assignment_change',
    'route_update',
    'system_message',
    'reminder',
    'urgent',
    'holiday_update',
  ];

  const getTypeIcon = (type: NotificationType) => {
    const icons: Record<NotificationType, string> = {
      new_user: '👤',
      user_removed: '🗑️',
      schedule_change: '📅',
      assignment_change: '📋',
      route_update: '🗺️',
      service_start: '▶️',
      service_end: '⏹️',
      system_message: '💬',
      reminder: '⏰',
      urgent: '🚨',
      holiday_update: '🎉',
    };
    return icons[type];
  };

  if (!user) {
    return (
      <div className='container mx-auto p-6'>
        <Card>
          <div className='p-6'>
            <p className='text-center text-gray-600'>
              Debes estar autenticado para acceder a las pruebas de
              notificaciones.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center gap-3'>
        <span className='text-4xl'>🧪</span>
        <div>
          <h1 className='text-3xl font-bold'>Pruebas de Notificaciones</h1>
          <p className='text-gray-600'>
            Herramientas para probar el sistema de notificaciones
          </p>
        </div>
      </div>

      {/* Controles principales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <div className='p-6'>
            <h3 className='text-lg font-semibold mb-2 flex items-center gap-2'>
              <span>⚡</span>
              Prueba Completa
            </h3>
            <p className='text-sm text-gray-600 mb-4'>
              Ejecuta todas las pruebas del sistema
            </p>
            <Button
              onClick={() => void runFullTest()}
              disabled={isRunning}
              className='w-full'
            >
              {isRunning ? 'Ejecutando...' : 'Ejecutar Prueba Completa'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className='p-6'>
            <h3 className='text-lg font-semibold mb-2 flex items-center gap-2'>
              <span>🔊</span>
              Prueba de Sonidos
            </h3>
            <p className='text-sm text-gray-600 mb-4'>
              Reproduce todos los sonidos de notificación disponibles
            </p>
            <p className='text-xs text-gray-500 mb-4'>
              💡 Los navegadores modernos requieren activar el audio primero
            </p>
            <p className='text-xs text-green-600 mb-4'>
              🔊 Activar Sonidos: Activación básica del audio
            </p>
            <p className='text-xs text-orange-600 mb-4'>
              🔊 Forzar Activación: 5 sonidos progresivos para asegurar
              activación
            </p>
            <p className='text-xs text-blue-600 mb-4'>
              🔊 Volumen aumentado al 80% para mejor audibilidad
            </p>
            <p className='text-xs text-purple-600 mb-4'>
              🔊 Sonido Largo: 5 repeticiones consecutivas para mayor duración
            </p>
            <p className='text-xs text-red-600 mb-4'>
              🔊 Sonido FUERTE: 15 repeticiones rápidas para sonido CONTINUO y
              potente
            </p>
            <p className='text-xs text-blue-600 mb-4'>
              🔊 Prueba Simple: Solo 1 sonido con volumen máximo para
              diagnóstico claro
            </p>
            <p className='text-xs text-cyan-600 mb-4'>
              🎵 Prueba Sintética: Tono generado de 1000 Hz para verificar Web
              Audio API
            </p>
            <p className='text-xs text-emerald-600 mb-4'>
              🎵 Prueba WAV: Archivo de audio de 1 segundo con tono continuo
              audible
            </p>
            <div className='space-y-2'>
              <Button
                onClick={() => void activateSounds()}
                className='w-full bg-green-600 hover:bg-green-700'
              >
                <span className='mr-2'>🔊</span>
                Activar Sonidos
              </Button>
              <Button
                onClick={() => void forceActivateAudio()}
                className='w-full bg-orange-600 hover:bg-orange-700'
              >
                <span className='mr-2'>🔊</span>
                Forzar Activación Audio
              </Button>
              <Button
                onClick={() => void testSounds()}
                className='w-full bg-gray-600 hover:bg-gray-700'
              >
                <span className='mr-2'>▶️</span>
                Probar Sonidos
              </Button>
              <Button
                onClick={() => void testLongSound()}
                className='w-full bg-purple-600 hover:bg-purple-700'
              >
                <span className='mr-2'>🔊</span>
                Probar Sonido Largo
              </Button>
              <Button
                onClick={() => void testLoudSound()}
                className='w-full bg-red-600 hover:bg-red-700'
              >
                <span className='mr-2'>🔊</span>
                Probar Sonido FUERTE
              </Button>
              <Button
                onClick={() => void testSimpleAudio()}
                className='w-full bg-blue-600 hover:bg-blue-700'
              >
                <span className='mr-2'>🔊</span>
                Prueba Simple (1 sonido)
              </Button>
              <Button
                onClick={() => void testSyntheticAudio()}
                className='w-full bg-cyan-600 hover:bg-cyan-700'
              >
                <span className='mr-2'>🎵</span>
                Prueba Sintética (Tono)
              </Button>
              <Button
                onClick={() => void testWavAudio()}
                className='w-full bg-emerald-600 hover:bg-emerald-700'
              >
                <span className='mr-2'>🎵</span>
                Prueba WAV (1 segundo)
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className='p-6'>
            <h3 className='text-lg font-semibold mb-2 flex items-center gap-2'>
              <span>🔔</span>
              Limpiar Logs
            </h3>
            <p className='text-sm text-gray-600 mb-4'>
              Borra el historial de pruebas
            </p>
            <Button
              onClick={clearLogs}
              className='w-full bg-red-600 hover:bg-red-700'
            >
              Limpiar
            </Button>
          </div>
        </Card>
      </div>

      {/* Pruebas individuales por tipo */}
      <Card>
        <div className='p-6'>
          <h2 className='text-xl font-semibold mb-2'>
            Pruebas por Tipo de Notificación
          </h2>
          <p className='text-gray-600 mb-4'>
            Prueba cada tipo de notificación individualmente
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {notificationTypes.map(type => (
              <Button
                key={type}
                onClick={() => void testSingleNotification(type)}
                disabled={isRunning}
                className='flex items-center justify-between p-4 h-auto bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
              >
                <div className='flex items-center gap-2'>
                  <span className='text-lg'>{getTypeIcon(type)}</span>
                  <span className='text-sm'>{getTypeLabel(type)}</span>
                </div>
                {testResults[type] !== null &&
                  testResults[type] !== undefined && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        testResults[type]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {testResults[type] === true ? '✅' : '❌'}
                    </span>
                  )}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Logs de pruebas */}
      <Card>
        <div className='p-6'>
          <h2 className='text-xl font-semibold mb-2'>Logs de Pruebas</h2>
          <p className='text-gray-600 mb-4'>
            Resultados en tiempo real de las pruebas ejecutadas
          </p>
          <div className='bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto'>
            {logs.length === 0 ? (
              <p className='text-gray-500'>
                No hay logs disponibles. Ejecuta una prueba para ver los
                resultados.
              </p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className='mb-1'>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Información del usuario */}
      <Card>
        <div className='p-6'>
          <h2 className='text-xl font-semibold mb-4'>Información de Prueba</h2>
          <div className='space-y-2 text-sm'>
            <p>
              <strong>Usuario ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
