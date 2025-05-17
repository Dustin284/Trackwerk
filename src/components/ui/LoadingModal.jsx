import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Modal-Komponente zur Anzeige des Ladevorgangs
 * 
 * @param {Object} props - Komponenten-Properties
 * @param {boolean} props.isOpen - Bestimmt, ob das Modal angezeigt wird
 * @param {number} props.progress - Fortschritt des Ladevorgangs (0-1)
 * @param {Object} props.currentSong - Aktueller Song, der verarbeitet wird
 * @param {number} props.totalSongs - Gesamtzahl der zu verarbeitenden Songs
 * @param {number} props.currentIndex - Aktueller Index des verarbeiteten Songs
 */
export function LoadingModal({ 
  isOpen, 
  progress = 0, 
  currentSong = null, 
  totalSongs = 0, 
  currentIndex = 0 
}) {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [statusMessages, setStatusMessages] = useState([]);
  
  // Status-Meldungen verwalten
  useEffect(() => {
    if (currentSong && isOpen) {
      // Erstellt eine neue Status-Meldung basierend auf dem aktuellen Song
      let newMessage = '';
      
      if (currentSong.action === 'generateWaveform') {
        // Spezielle Nachricht für Waveform-Generierung
        newMessage = `${t('generatingWaveform')}: ${currentSong.name} (${currentSong.processed}/${currentSong.total})`;
      } else if (currentSong.name) {
        // Standard-Nachricht für andere Aktionen
        newMessage = `${currentIndex}/${totalSongs}: ${currentSong.name} ${currentSong.processed ? `(${currentSong.processed}/${currentSong.total})` : ''}`;
      } else {
        newMessage = currentSong.name;
      }
      
      // Fügt die Meldung zum Status-Log hinzu
      setStatusMessages(prev => {
        const messages = [...prev, newMessage];
        // Begrenzt die Anzahl der Meldungen auf die letzten 5
        return messages.slice(-5);
      });
    }
  }, [currentSong, isOpen, currentIndex, totalSongs, t]);

  // Berechnet den Fortschritt in Prozent
  const percentProgress = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {currentSong?.action === 'generateWaveform' 
                ? t('generatingWaveform') 
                : t('loadingLibrary')}
            </h3>
            
            <div className="space-y-4">
              {/* Hauptstatus-Anzeige */}
              <div className="text-gray-700">
                {currentSong?.action === 'generateWaveform' ? (
                  // Anzeige für Waveform-Generierung 
                  <p className="mb-2">
                    {currentSong.name} {currentSong.processed && currentSong.total && 
                      `(${currentSong.processed} / ${currentSong.total})`}
                  </p>
                ) : currentSong?.path ? (
                  // Anzeige für Verzeichnis-Scan
                  <p className="mb-2">{t('scanningDirectory')}: <span className="font-medium">{currentSong.path}</span></p>
                ) : (
                  // Allgemeine Anzeige
                  <p className="mb-2">
                    {currentSong?.name || t('preparingFiles')}
                  </p>
                )}
                
                {currentSong && currentIndex > 0 && (
                  <p className="text-sm mb-1">
                    {currentIndex} / {totalSongs} {t('songs')}
                  </p>
                )}
              </div>
              
              {/* Fortschrittsanzeige */}
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {percentProgress}%
                    </span>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {showDetails ? t('hideDetails') : t('showDetails')}
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-blue-200">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${percentProgress}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
                  />
                </div>
              </div>
              
              {/* Detail-Ansicht mit Status-Meldungen */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 bg-gray-100 rounded-lg p-3 max-h-40 overflow-y-auto text-sm">
                      <p className="font-medium mb-1">{t('processingStatus')}:</p>
                      {statusMessages.length > 0 ? (
                        <ul className="space-y-1">
                          {statusMessages.map((msg, idx) => (
                            <li key={idx} className="text-gray-600">{msg}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">{t('waitingForProcess')}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Hinweis */}
              <p className="text-sm text-gray-500 mt-3">
                {currentSong?.action === 'generateWaveform' 
                  ? t('waveformGenerationSuccess')
                  : t('loadingHint')}
              </p>
              
              <div className="flex justify-center mt-4">
                {currentSong?.action === 'generateWaveform' ? (
                  // Wellenform-Animation für Waveform-Generierung
                  <div className="w-32 h-10">
                    <WaveformAnimation progress={progress} />
                  </div>
                ) : (
                  // Standard-Ladeanimation
                  <div className="relative w-8 h-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-t-2 border-blue-600 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simulierte Wellenform-Animation
function WaveformAnimation({ progress }) {
  const bars = 32; // Anzahl der Balken in der Wellenform
  
  return (
    <div className="h-full w-full flex items-end justify-center gap-0.5 p-1">
      {[...Array(bars)].map((_, index) => {
        // Zufällige Höhe für jeden Balken, mit höherer Wahrscheinlichkeit für höhere Balken
        // im Bereich des aktuellen Fortschritts
        const isInProgressRange = index / bars <= progress;
        const height = isInProgressRange 
          ? Math.random() * 0.8 + 0.2 // 20%-100% Höhe für verarbeitete Bereiche
          : Math.random() * 0.2; // 0-20% Höhe für nicht verarbeitete Bereiche
          
        return (
          <motion.div
            key={index}
            className="bg-blue-500 rounded-sm w-full"
            initial={{ height: 0 }}
            animate={{ height: `${height * 100}%` }}
            transition={{ 
              duration: 0.4, 
              repeat: isInProgressRange ? Infinity : 0,
              repeatType: "reverse",
              delay: index * 0.02,
            }}
          />
        );
      })}
    </div>
  );
} 