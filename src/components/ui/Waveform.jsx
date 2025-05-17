import { useMemo, useRef, useEffect } from 'react';
import { drawWaveform } from '../../utils/waveformGenerator';

/**
 * Wellenform-Komponente zum Anzeigen von Audio-Visualisierungen
 * 
 * @param {Object} props - Komponenteneigenschaften
 * @param {Array<number>} props.data - Array mit Wellenform-Daten (Werte zwischen 0 und 1)
 * @param {number} props.currentTime - Aktuelle Abspielposition (zwischen 0 und 1)
 * @param {string} props.className - Zusätzliche CSS-Klassen
 * @param {boolean} props.interactive - Ob die Wellenform mit Klick interagieren soll
 * @param {Function} props.onSeek - Callback für Klick auf Position (wenn interactive=true)
 * @param {string} props.activeColor - Farbe für den aktiven Bereich
 * @param {string} props.inactiveColor - Farbe für den inaktiven Bereich
 * @param {boolean} props.useSvg - Ob SVG statt Balken verwendet werden soll
 * @param {string} props.cacheId - Optionale ID für das Caching der Wellenform
 */
export function Waveform({ 
  data = [], 
  currentTime = 0,
  className = '',
  interactive = false,
  onSeek,
  activeColor = '#333333',
  inactiveColor = 'rgba(120, 120, 120, 0.5)',
  useSvg = false,
  cacheId = null
}) {
  const containerRef = useRef(null);
  
  // Wenn keine Daten vorhanden sind, zeige eine leere Wellenform
  if (!data || data.length === 0) {
    return (
      <div className={`h-10 w-full bg-gray-100 rounded-lg ${className}`}>
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-xs text-gray-400">Keine Wellenform verfügbar</span>
        </div>
      </div>
    );
  }

  // Klick-Handler für interaktives Suchen
  const handleClick = (event) => {
    if (!interactive || !onSeek) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = x / rect.width;
    
    // Position zwischen 0 und 1
    const seekPosition = Math.max(0, Math.min(1, position));
    onSeek(seekPosition);
  };
  
  // Daten für die Anzeige vorbereiten - nur einmal mit useMemo
  const processedData = useMemo(() => {
    // Maximale Anzahl von Datenpunkten für die Darstellung
    const maxPoints = 1000;
    
    // Wenn wir zu viele Daten haben, reduzieren wir sie
    if (data.length > maxPoints) {
      let result = [];
      const step = data.length / maxPoints;
      
      // Intelligentes Downsampling, um ein gleichmäßiges Bild der gesamten Waveform zu erhalten
      for (let i = 0; i < maxPoints; i++) {
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(Math.floor((i + 1) * step), data.length);
        
        // Wir suchen den Maximalwert im Bereich, um wichtige Peaks zu behalten
        let maxValue = 0;
        for (let j = startIdx; j < endIdx; j++) {
          maxValue = Math.max(maxValue, data[j]);
        }
        
        result.push(maxValue);
      }
      return result;
    }
    
    // Wenn die Daten bereits passend sind, verwenden wir sie direkt
    return data;
  }, [data]);
  
  // Effekt zum Zeichnen der Wellenform, wenn sich relevante Props ändern
  useEffect(() => {
    if (containerRef.current && processedData.length > 0) {
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Nur zeichnen, wenn Container-Dimensionen gültig sind
      if (width > 0 && height > 0) {
        // Cache-ID generieren, falls nicht bereitgestellt
        const effectiveCacheId = cacheId || `waveform-${Math.random().toString(36).substr(2, 9)}`;
        
        // Wellenform mit der optimierten Funktion zeichnen
        drawWaveform({
          container,
          waveformData: processedData,
          cacheId: effectiveCacheId,
          width,
          height,
          progress: currentTime,
          type: useSvg ? 'svg' : 'bars',
          activeColor,
          inactiveColor
        });
      }
    }
  }, [processedData, currentTime, useSvg, activeColor, inactiveColor, cacheId]);

  // Aufräumen beim Unmount
  useEffect(() => {
    return () => {
      // Hier könnte Cleanup-Code hinzugefügt werden, wenn nötig
    };
  }, []);
  
  // Container-Stil
  const containerStyle = `relative h-12 w-full bg-white rounded-lg overflow-hidden ${className} ${interactive ? 'cursor-pointer' : ''}`;
  
  // Render-Container - einfacher DIV ohne zusätzliche Elemente für maximale Performance
  return (
    <div
      ref={containerRef}
      className={containerStyle}
      onClick={handleClick}
    />
  );
} 