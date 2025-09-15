import type { NotificationType } from '@/types';

// Type assertion necesaria para servicio dinámicamente cargado
export default class NotificationTester {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public notificationService: any = null;

  constructor() {
    // Importar dinámicamente para evitar problemas de inicialización
    import('@/lib/notification-service')
      .then(module => {
        this.notificationService = module.NotificationService.getInstance();
      })
      // eslint-disable-next-line no-console
      .catch(console.error);
  }

  async runFullTest(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      '🧪 Iniciando prueba completa del sistema de notificaciones...'
    );

    const types: NotificationType[] = [
      'new_user',
      'user_removed',
      'schedule_change',
      'assignment_change',
      'route_update',
      'service_start',
      'service_end',
      'system_message',
      'reminder',
      'urgent',
      'holiday_update',
    ];

    const soundFileMap: Record<NotificationType, string> = {
      new_user: 'notification-user_added_new.wav',
      user_removed: 'notification-user_removed_new.wav',
      schedule_change: 'notification-schedule_changed_new.wav',
      assignment_change: 'notification-assignment_changed_new.wav',
      route_update: 'notification-route_update_new.wav',
      service_start: 'notification-service_start_new.wav',
      service_end: 'notification-service_end_new.wav',
      system_message: 'notification-system_new.wav',
      reminder: 'notification-reminder_new.wav',
      urgent: 'notification-urgent_new.wav',
      holiday_update: 'notification-holiday_update_new.wav',
    };

    // eslint-disable-next-line no-console
    console.log('🔊 Probando sonidos de notificación...');

    types.forEach((type, index) => {
      setTimeout(
        () =>
          void (async () => {
            const soundFile =
              soundFileMap[type] || 'notification-default_new.wav';

            try {
              // eslint-disable-next-line no-console
              console.log(`🔊 Intentando reproducir: ${type} -> ${soundFile}`);

              const audio = new Audio();
              audio.volume = 0.8; // Volumen alto para pruebas (80%)
              audio.src = `/sounds/${soundFile}`;

              // Esperar a que el audio esté listo
              await new Promise<void>((resolve, reject) => {
                audio.oncanplaythrough = () => {
                  // eslint-disable-next-line no-console
                  console.log(
                    `📁 Archivo ${soundFile} cargado correctamente (${audio.duration.toFixed(
                      1
                    )}s)`
                  );
                  resolve();
                };
                audio.onerror = () =>
                  reject(new Error(`Error al cargar ${soundFile}`));
                audio.load();
              });

              // Intentar reproducir con manejo de políticas de autoplay
              try {
                // eslint-disable-next-line no-console
                console.log(`▶️ Reproduciendo sonido ${type}...`);
                await audio.play();
                // eslint-disable-next-line no-console
                console.log(
                  `✅ Sonido ${type} (${soundFile}): Reproducción exitosa - Volumen: ${(
                    audio.volume * 100
                  ).toFixed(0)}%`
                );

                // Agregar listener para confirmar que el audio terminó
                audio.onended = () => {
                  // eslint-disable-next-line no-console
                  console.log(`🔊 Sonido ${type} finalizado`);
                };
              } catch {
                // Manejar error de autoplay - común en navegadores modernos
                // eslint-disable-next-line no-console
                console.log(
                  `⚠️ Sonido ${type} (${soundFile}): Bloqueado por política de autoplay`
                );
                // eslint-disable-next-line no-console
                console.log(
                  '💡 Para activar sonidos: Usa el botón "Activar Sonidos" o haz clic en cualquier lugar de la página'
                );
              }
            } catch (error) {
              const errorMessage = String(error);
              // eslint-disable-next-line no-console
              console.log(`❌ Sonido ${type} (${soundFile}): ${errorMessage}`);

              if (errorMessage.includes('Error al cargar')) {
                // eslint-disable-next-line no-console
                console.log(
                  `🔍 Verifica que el archivo ${soundFile} existe en /public/sounds/`
                );
              }
            }
          })(),
        index * 2000
      ); // Espaciar los sonidos 2 segundos para mejor separación
    });

    // eslint-disable-next-line no-console
    console.log('🔊 Iniciando carga y reproducción de sonidos WAV nuevos...');
    // eslint-disable-next-line no-console
    console.log(
      '🔊 Todos los sonidos tienen volumen al 80% - deberías escucharlos claramente'
    );
  }

  async testNotificationSounds(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🔊 PRUEBA SINTÉTICA: Generando tono audible...');

    // Crear contexto de audio
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ??
      AudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configurar tono (1000 Hz - tono claro y audible)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.type = 'sine';

    // Configurar volumen (0.3 para que sea audible pero no ensordecedor)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    // Conectar nodos
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Reproducir por 2 segundos
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 2);

    // eslint-disable-next-line no-console
    console.log('✅ Tono sintético de 1000Hz generado por 2 segundos');
  }

  async testLongSound(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      '🔊 PRUEBA LARGA: Reproduciendo sonido 10 veces seguidas con volumen máximo...'
    );

    const soundFile = 'notification-user_added_new.wav';

    for (let i = 0; i < 10; i++) {
      try {
        const audio = new Audio();
        audio.volume = 1.0; // Volumen máximo
        audio.src = `/sounds/${soundFile}`;

        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => reject(new Error('Error loading'));
          audio.load();
        });

        await audio.play();

        // Esperar menos tiempo entre sonidos para crear un sonido continuo más largo
        await new Promise(resolve => setTimeout(resolve, 150));

        // eslint-disable-next-line no-console
        console.log(`✅ Sonido ${i + 1}/10 reproducido (Volumen: 100%)`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`❌ Error en sonido ${i + 1}:`, error);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      '🎵 Prueba larga completada - Deberías haber escuchado un sonido continuo de ~2 segundos'
    );
  }

  async testLoudSound(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      '🔊 PRUEBA FUERTE: Reproduciendo sonido con volumen máximo y repetición rápida...'
    );

    const soundFile = 'notification-urgent_new.wav';

    for (let i = 0; i < 15; i++) {
      try {
        const audio = new Audio();
        audio.volume = 1.0; // Volumen máximo
        audio.src = `/sounds/${soundFile}`;

        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => reject(new Error('Error loading'));
          audio.load();
        });

        await audio.play();

        // Reproducción casi continua para sonido fuerte y largo
        await new Promise(resolve => setTimeout(resolve, 100));

        // eslint-disable-next-line no-console
        console.log(
          `🔊 Sonido FUERTE ${i + 1}/15 - ¡Deberías escucharlo claramente!`
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`❌ Error en sonido fuerte ${i + 1}:`, error);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      '🎵 Prueba fuerte completada - Sonido de ~2.5 segundos con volumen máximo'
    );
  }

  async testSimpleAudio(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🎵 PRUEBA SIMPLE: 1 sonido fuerte y claro...');

    try {
      const audio = new Audio();
      audio.volume = 1.0; // Volumen máximo
      audio.src = '/sounds/notification-system_new.wav';

      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => {
          // eslint-disable-next-line no-console
          console.log('✅ Audio cargado correctamente');
          resolve();
        };
        audio.onerror = () => reject(new Error('Error loading'));
        audio.load();
      });

      await audio.play();
      // eslint-disable-next-line no-console
      console.log(
        '🔊 ¡Sonido reproducido! Si no lo escuchaste, revisa el volumen de tu sistema'
      );

      audio.onended = () => {
        // eslint-disable-next-line no-console
        console.log('✅ Prueba simple completada exitosamente');
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('❌ Error en prueba simple:', error);
    }
  }

  testSyntheticAudio(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🎵 PRUEBA SINTÉTICA: Generando tono audible...');

    // Crear contexto de audio
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ??
      AudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configurar tono (1000 Hz - tono claro y audible)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.type = 'sine';

    // Configurar volumen (0.3 para que sea audible pero no ensordecedor)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    // Conectar nodos
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Reproducir por 2 segundos
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 2);

    // eslint-disable-next-line no-console
    console.log('✅ Tono sintético de 1000Hz generado por 2 segundos');

    return Promise.resolve();
  }

  testWavAudio(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🎵 PRUEBA WAV: Reproduciendo archivo WAV de 1 segundo...');

    return new Promise(resolve => {
      const audio = new Audio();
      audio.volume = 1.0; // Volumen máximo
      audio.src = '/sounds/notification-user_added_new.wav';

      audio.oncanplaythrough = () => {
        // eslint-disable-next-line no-console
        console.log('✅ Archivo WAV cargado correctamente');
        audio.play().catch(() => {
          // eslint-disable-next-line no-console
          console.log('⚠️ Reproducción bloqueada por política de autoplay');
        });
      };

      audio.onended = () => {
        // eslint-disable-next-line no-console
        console.log('✅ Prueba WAV completada');
        resolve();
      };

      audio.onerror = () => {
        // eslint-disable-next-line no-console
        console.log('❌ Error al cargar archivo WAV');
        resolve();
      };

      audio.load();
    });
  }
}

// Funciones globales para testing desde la consola del navegador
// Solo inicializar si no existen ya para evitar problemas de hidratación
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if ((window as any).testNotifications === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).testNotifications = async () => {
      const tester = new NotificationTester();
      await tester.runFullTest();
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if ((window as any).testSounds === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).testSounds = () => {
      const tester = new NotificationTester();
      return tester.testNotificationSounds();
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if ((window as any).testSoundMaxVolume === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).testSoundMaxVolume = async () => {
      const tester = new NotificationTester();
      await tester.testLongSound();
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if ((window as any).testLoudSound === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).testLoudSound = async () => {
      const tester = new NotificationTester();
      await tester.testLoudSound();
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if ((window as any).testSimpleAudio === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).testSimpleAudio = async () => {
      const tester = new NotificationTester();
      await tester.testSimpleAudio();
    };
  }
}
