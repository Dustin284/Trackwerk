import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './button';
import { Slider } from './slider';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import { decompressWaveform } from '../../utils/waveformGenerator';
import { Play, Pause, SkipBack, SkipForward, StopCircle, Volume2 } from 'lucide-react';

/**
 * AudioPlayer-Komponente für die Steuerung der Musikwiedergabe
 * 
 * @param {Object} props - Komponenteneigenschaften
 * @param {Object} props.currentSong - Aktuell ausgewählter Song
 * @param {boolean} props.isPlaying - Wiedergabestatus
 * @param {number} props.volume - Aktuelle Lautstärke (0-1)
 * @param {number} props.progress - Aktuelle Abspielposition in Sekunden
 * @param {number} props.duration - Gesamtlänge des Songs in Sekunden
 * @param {Function} props.onPlayPause - Callback für Play/Pause
 * @param {Function} props.onStop - Callback für Stop
 * @param {Function} props.onVolumeChange - Callback für Lautstärkeänderung
 * @param {Function} props.onSeek - Callback für Sprung zu Position
 * @param {Function} props.onPrevious - Callback für vorheriger Song
 * @param {Function} props.onNext - Callback für nächster Song
 */
const AudioPlayer = React.memo(function AudioPlayer({
  currentSong,
  isPlaying,
  volume = 0.5,
  progress = 0,
  duration = 0,
  onPlayPause,
  onStop,
  onVolumeChange,
  onSeek,
  onPrevious,
  onNext
}) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);

  // Synchronisiere lokalen Fortschritt mit externem Fortschritt (außer beim Ziehen)
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  // Keine Anzeige, wenn kein Song ausgewählt ist
  if (!currentSong) {
    return null;
  }

  // Berechne die Position für die Anzeige des Fortschritts in der Wellenform
  const progressPosition = duration > 0 ? progress / duration : 0;

  // Formatiere Zeit optimiert mit useCallback
  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) {
      return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Waveform-Daten und SVG-Pfad generieren - nur wenn sich der Song ändert
  const { waveformData, waveformPath } = useMemo(() => {
    let data = [];
    
    try {
      if (currentSong?.waveform && typeof currentSong.waveform === 'string') {
        data = decompressWaveform(currentSong.waveform);
      } else {
        data = generateRealisticWaveform(500, duration);
      }
    } catch (error) {
      console.error("Fehler beim Dekomprimieren der Wellenform:", error);
      data = generateRealisticWaveform(500, duration);
    }

    // Bei fehlenden Daten immer zuverlässig generieren
    if (!data || data.length === 0) {
      data = generateRealisticWaveform(500, duration);
    }
    
    // SVG-Pfad für die Wellenform vorberechnen
    const path = generateWaveformPath(data, 100, 'full');
    
    return { waveformData: data, waveformPath: path };
  }, [currentSong?.id, currentSong?.waveform]); // Nur neu berechnen, wenn sich der Song ändert

  // Memoize die Click-Handler für bessere Performance
  const handleSeekClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;
    if (onSeek) onSeek(newTime);
  }, [duration, onSeek]);
  
  const handleVolumeChange = useCallback(([v]) => {
    if (onVolumeChange) onVolumeChange(v / 100);
  }, [onVolumeChange]);

  // Eindeutige ID für clipPath, die pro Song konstant bleibt
  const clipPathId = useMemo(() => 
    `waveform-progress-clip-${currentSong?.id || `current-${Math.random().toString(36).substring(2, 5)}`}`,
    [currentSong?.id]
  );

  return (
    <div className="w-full border-t border-gray-200 bg-white/90 backdrop-blur-md p-4">
      <div className="max-w-7xl mx-auto space-y-2">
        {/* Wellenform mit Fortschrittsanzeige */}
        <div className="h-24 relative cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-200"
          onClick={handleSeekClick}
        >
          {/* Durchgehende Wellenform */}
          <div className="absolute inset-0">
            {/* Wir verwenden nur ein SVG-Element mit zwei Pfaden und einem clipPath */}
            <svg 
              width="100%" 
              height="100%" 
              preserveAspectRatio="none" 
              viewBox="0 0 100 100"
            >
              <defs>
                <clipPath id={clipPathId}>
                  <rect x="0" y="0" width={`${progressPosition * 100}%`} height="100%" />
                </clipPath>
              </defs>
              
              {/* Nicht abgespielter Teil (grau) */}
              <path 
                d={waveformPath} 
                stroke="none" 
                fill="rgba(107, 114, 128, 0.7)"
              />
              
              {/* Abgespielter Teil */}
              <path 
                d={waveformPath} 
                stroke="none" 
                fill="#2563EB"
                clipPath={`url(#${clipPathId})`}
              />
            </svg>
          </div>

          {/* Zeitanzeige */}
          <div className="absolute left-2 bottom-1 text-xs font-medium text-gray-700 bg-white/80 px-1 rounded">
            {formatTime(progress)}
          </div>
          <div className="absolute right-2 bottom-1 text-xs font-medium text-gray-700 bg-white/80 px-1 rounded">
            {formatTime(duration)}
          </div>
        </div>

        {/* Steuerelemente */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-medium text-gray-900 text-lg truncate max-w-[250px] sm:max-w-sm">
              {currentSong.name}
            </p>
            <p className="text-sm text-gray-600">{currentSong.artist}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              onClick={onPrevious} 
              variant="ghost" 
              size="icon" 
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            >
              <SkipBack />
            </Button>
            <Button 
              onClick={onStop} 
              variant="ghost" 
              size="icon" 
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            >
              <StopCircle />
            </Button>
            <Button 
              onClick={onPlayPause} 
              size="icon" 
              variant="default" 
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-full h-10 w-10 sm:h-12 sm:w-12"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button 
              onClick={onNext} 
              variant="ghost" 
              size="icon" 
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            >
              <SkipForward />
            </Button>
            <div className="w-20 sm:w-32 flex items-center">
              <Volume2 className="text-gray-800 mr-2" />
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="py-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - nur neu rendern, wenn wichtige Props sich ändern
  if (prevProps.currentSong?.id !== nextProps.currentSong?.id) return false; // Neuer Song, immer rendern
  if (prevProps.isPlaying !== nextProps.isPlaying) return false; // Play/Pause Status geändert
  
  // Bei Fortschrittsänderungen nur alle 500ms neu rendern (für flüssige Anzeige)
  const progressDiff = Math.abs(prevProps.progress - nextProps.progress);
  if (progressDiff > 0.5) return false;
  
  // Alle anderen Props vergleichen
  if (prevProps.volume !== nextProps.volume) return false;
  if (prevProps.duration !== nextProps.duration) return false;
  
  // Keine relevanten Änderungen, kein Re-rendering nötig
  return true;
});

export { AudioPlayer };

// Helfer-Funktion zum Erzeugen einer realistischeren Wellenform
function generateRealisticWaveform(length = 500, songDuration = 0) {
  const data = [];
  
  // Höhere Anzahl von Punkten für glattere Darstellung
  // Falls die Songdauer bekannt ist, verwenden wir 10 Samples pro Sekunde
  const samplesPerSecond = 10;
  const durationBasedLength = songDuration > 0 ? 
    Math.max(length, Math.ceil(songDuration * samplesPerSecond)) : 
    length * 3;
  
  // Verwende die höhere Längenvorgabe
  const actualLength = Math.max(length, durationBasedLength);
  
  console.log(`Generiere realistische Wellenform mit ${actualLength} Samples für ${songDuration}s Songlänge`);
  
  let prevValue = 0.5;
  let trend = 0;
  
  // Natürlichere Wellenform mit Übergängen für den ganzen Song
  for (let i = 0; i < actualLength; i++) {
    // Normalisierte Position im Song (0-1)
    const songPosition = i / (actualLength - 1);
    
    // Basis-Zufallswert - basierend auf Index statt Zufallszahl für Konsistenz
    let randomComponent = ((i % 100) / 100 - 0.5) * 0.1;
    
    // Trend-basierte Kontinuität (damit die Werte nicht zu stark springen)
    trend = trend * 0.95 + randomComponent * 0.05;
    
    // Wert basierend auf vorherigem Wert und Trend berechnen
    let newValue = prevValue + trend;
    
    // Periodische Komponenten basierend auf der Songposition
    // Simulieren verschiedener Frequenzen im Audiospektrum
    const beatFrequency = songDuration > 0 ?
      // Bei bekannter Dauer: Beats basierend auf typischer BPM (120)
      120 / 60 * songDuration * songPosition :
      // Fallback: Generische Periodizität
      i * 0.1;
    
    // Verschiedene Frequenzkomponenten
    const periodicHigh = Math.sin(beatFrequency * 2.5) * 0.1;  // Höhere Frequenzen (Hi-Hats, etc.)
    const periodicMid = Math.sin(beatFrequency * 1.1) * 0.15;  // Mittlere Frequenzen (Vocals, etc.)
    const periodicLow = Math.sin(beatFrequency * 0.4) * 0.2;   // Niedrige Frequenzen (Bass, etc.)
    
    // Songstruktur-Komponente (typischerweise haben Songs 3-4 Hauptteile)
    const songStructure = Math.sin(songPosition * Math.PI * 3) * 0.1;
    
    // Kombiniere alle Komponenten
    newValue += periodicHigh + periodicMid + periodicLow + songStructure;
    
    // Begrenzen auf sinnvollen Bereich (0.1 bis 0.9)
    newValue = Math.max(0.1, Math.min(0.9, newValue));
    
    // Scharfe Peaks für Beats/Drums an strukturell wichtigen Stellen
    if (Math.sin(songPosition * Math.PI * 16) > 0.8 && (i % 10 === 0)) {
      newValue = 0.7 + (i % 20) / 100;
    }
    
    // Refrains sind typischerweise lauter (bei 25%, 50%, 75% des Songs)
    for (let refrain = 0.25; refrain < 1; refrain += 0.25) {
      const distance = Math.abs(songPosition - refrain);
      if (distance < 0.05) { // In der Nähe eines Refrains
        newValue *= (1 + (0.05 - distance) * 3);  // Höhere Amplitude
        newValue = Math.min(0.9, newValue);       // Nicht zu hoch
      }
    }
    
    data.push(newValue);
    prevValue = newValue;
  }
  
  return data;
}

// Helfer-Funktion zur Generierung des SVG-Pfads für die Wellenform
function generateWaveformPath(data, height, type = 'full') {
  if (!data || data.length === 0) {
    return 'M 0,50 L 100,50';  // Horizontale Linie als Fallback
  }
  
  const width = 100; // Prozentangabe
  const middle = height / 2;
  
  // Für eine vertikalere Stilart erstellen wir direkt einzelne Linien
  // anstelle eines durchgehenden Pfades
  let path = '';
  
  // Exakten Schritt berechnen - dünnere Linien für feineres Aussehen
  const exactStep = width / data.length;
  // Deutlich dünnere Linien für feineres Aussehen - max. 0.2 Einheiten Breite
  const lineWidth = Math.min(0.2, exactStep * 0.5); 
  
  // Generiere für jeden Datenpunkt einen vertikalen Strich
  for (let i = 0; i < data.length; i++) {
    const x = i * exactStep + lineWidth / 2; // Mittige Position plus halbe Linienbreite
    
    // Skaliere die Amplitude - milderer Faktor für natürlicheres Aussehen
    const amplitudeFactor = 3.5;
    
    // Deterministische Variation basierend auf dem Index
    const variationFactor = (i % 5) * 0.01;
    let value = data[i] + variationFactor;
    value = Math.max(0, Math.min(1, value)); // Auf 0-1 begrenzen
    
    let amplitude = value * (height) * amplitudeFactor;
    
    // Natürlichere Verstärkung kleiner Werte
    if (amplitude < height * 0.15) {
      amplitude = Math.max(height * 0.03, amplitude * 1.2);
    }
    
    // Amplitude begrenzen
    const clampedAmplitude = Math.min(height - 2, amplitude);
    
    // Erzeuge einen vertikalen Strich vom mittleren Punkt nach oben und unten
    // Wir verwenden ein Rechteck für jeden Strich
    const y1 = middle - clampedAmplitude / 2;
    const y2 = middle + clampedAmplitude / 2;
    
    // Rechteck für den vertikalen Strich erzeugen (M=move, L=line, Z=close)
    path += `M ${x - lineWidth/2},${y1} L ${x + lineWidth/2},${y1} L ${x + lineWidth/2},${y2} L ${x - lineWidth/2},${y2} Z `;
  }
  
  return path;
} 