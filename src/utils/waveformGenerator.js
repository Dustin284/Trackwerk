/**
 * Waveform Generator und Cache
 * Erzeugt effiziente, komprimierte Wellenformen aus Audiodateien und speichert sie im Cache
 */

// In-Memory-Cache für Waveforms während der Laufzeit
const waveformCache = new Map();

/**
 * Berechnet die optimale Anzahl der Samples für eine Wellenform basierend auf der Songlänge
 * und/oder der Containergröße
 * 
 * @param {string} songPath - Pfad zur Audio-Datei
 * @param {number} containerWidth - Breite des Containers in Pixeln 
 * @param {number} songDuration - Optional: bereits bekannte Songlänge in Sekunden
 * @returns {Promise<number>} Die optimale Anzahl der Samples
 */
export async function computeWaveformWidth(songPath, containerWidth = 2000, songDuration = 0) {
  try {
    // Wenn keine Songdauer angegeben wurde, versuchen wir sie über die API zu bekommen
    if (songDuration <= 0 && window.api && window.api.getAudioDuration) {
      try {
        songDuration = await window.api.getAudioDuration(songPath);
        console.log(`Ermittelte Songdauer für Waveform: ${songDuration}s`);
      } catch (error) {
        console.warn(`Konnte Audiodauer nicht ermitteln: ${error.message}`);
      }
    }
    
    // Wenn wir die Songdauer haben, berechnen wir Samples pro Sekunde
    if (songDuration > 0) {
      // Wir möchten etwa 5 Samples pro Sekunde für ein gutes Verhältnis
      // aber mindestens so viele Samples wie Pixel im Container
      const samplesPerSecond = 5;
      const durationBasedSamples = Math.ceil(songDuration * samplesPerSecond);
      
      // Wir nehmen den höheren Wert, damit wir mindestens einen Datenpunkt pro Pixel haben
      return Math.max(containerWidth, durationBasedSamples);
    }
    
    // Fallback: 2 Samples pro Pixel im Container
    return containerWidth * 2;
  } catch (error) {
    console.error('Fehler bei der Berechnung der Waveform-Breite:', error);
    return 2000; // Standardwert zurückgeben
  }
}

/**
 * Initialisiert die Wellenform-Anzeige für einen Song
 * 
 * @param {string} songPath - Pfad zur Audio-Datei
 * @param {HTMLElement} containerElement - DOM-Element, in dem die Wellenform angezeigt wird
 * @param {number} songDuration - Optional: bereits bekannte Songlänge in Sekunden
 * @returns {Promise<number[]>} Die generierten Wellenform-Daten
 */
export async function initWaveformDisplay(songPath, containerElement, songDuration = 0) {
  // 1) Breite des Containers ermitteln
  const containerWidth = containerElement ? containerElement.clientWidth : 2000;

  // 2) Songdauer abfragen (oder aus dem Metadaten-Objekt ziehen, wenn schon bekannt)
  if (songDuration <= 0 && window.api && window.api.getAudioDuration) {
    try {
      songDuration = await window.api.getAudioDuration(songPath) || 0;
    } catch {
      // Kein Problem, wir simulieren einfach ohne Dauer
      console.log("Konnte Songdauer nicht ermitteln, verwende Simulation");
    }
  }

  // 3) Optimale Samplezahl berechnen
  const width = await computeWaveformWidth(songPath, containerWidth, songDuration);

  // 4) Aus Cache laden oder neu erstellen
  const data = await getOrCreateWaveform(songPath, containerWidth, songDuration);

  // 5) Wenn ein Container übergeben wurde, auch gleich zeichnen
  if (containerElement) {
    drawWaveform(data, containerElement);
  }

  return data;
}

/**
 * Lädt eine Wellenform aus dem Cache oder erstellt sie neu
 * 
 * @param {string} songPath - Pfad zur Audio-Datei
 * @param {number} containerWidth - Breite des Containers in Pixeln
 * @param {number} songDuration - Songlänge in Sekunden
 * @returns {Promise<number[]>} Die Wellenform-Daten
 */
export async function getOrCreateWaveform(songPath, containerWidth, songDuration = 0) {
  const cacheKey = `${songPath}:${containerWidth}:${Math.floor(songDuration)}`;
  
  // Versuche, aus dem Cache zu laden
  let waveform = getWaveformFromCache(cacheKey);
  
  // Falls nicht im Cache, neu generieren
  if (!waveform || waveform.length === 0) {
    const width = await computeWaveformWidth(songPath, containerWidth, songDuration);
    console.log(`Generiere neue Waveform für ${songPath} mit ${width} Samples`);
    waveform = await generateWaveform(songPath, width);
    saveWaveformToCache(cacheKey, waveform);
  } else {
    console.log(`Waveform aus Cache geladen: ${songPath}`);
  }
  
  return waveform;
}

/**
 * Zeichnet eine Wellenform in einen Container
 * 
 * @param {number[]} waveform - Array mit Amplitudenwerten zwischen 0 und 1
 * @param {HTMLElement} container - DOM-Element, in dem die Wellenform gezeichnet wird
 * @param {Object} options - Optionen für das Zeichnen
 */
export function drawWaveform(waveform, container, options = {}) {
  if (!container || !waveform || waveform.length === 0) return;
  
  const {
    type = 'canvas', // 'canvas', 'svg', oder 'bars'
    color = '#4f46e5',  // Standard-Farbe
    backgroundColor = 'transparent',
    progressColor = '#3730a3', // Farbe für den bereits abgespielten Teil
    progress = 0, // Fortschritt zwischen 0 und 1
  } = options;
  
  // Breite und Höhe des Containers
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Je nach Typ unterschiedliche Zeichenmethoden
  if (type === 'canvas') {
    // Canvas-basierte Darstellung
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
    }
    
    // Canvas-Größe setzen (ggf. mit devicePixelRatio für hochauflösende Displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    
    // Hintergrund zeichnen, falls gewünscht
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Waveform zeichnen
    const middle = height / 2;
    
    // Nicht abgespielter Teil
    ctx.beginPath();
    waveform.forEach((amp, i) => {
      const x = (i / (waveform.length - 1)) * width;
      const amplitude = amp * height * 0.8; // 80% der Höhe nutzen
      
      // Von der Mitte nach oben und unten
      if (i === 0) {
        ctx.moveTo(x, middle - amplitude / 2);
      } else {
        ctx.lineTo(x, middle - amplitude / 2);
      }
    });
    
    // Zurück von rechts nach links für die untere Hälfte
    for (let i = waveform.length - 1; i >= 0; i--) {
      const x = (i / (waveform.length - 1)) * width;
      const amplitude = waveform[i] * height * 0.8;
      ctx.lineTo(x, middle + amplitude / 2);
    }
    
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Abgespielter Teil mit Clipping
    if (progress > 0) {
      const progressWidth = width * progress;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, progressWidth, height);
      ctx.clip();
      
      // Waveform zeichnen (nur im abgespielten Bereich)
      ctx.beginPath();
      waveform.forEach((amp, i) => {
        const x = (i / (waveform.length - 1)) * width;
        const amplitude = amp * height * 0.8;
        
        if (i === 0) {
          ctx.moveTo(x, middle - amplitude / 2);
        } else {
          ctx.lineTo(x, middle - amplitude / 2);
        }
      });
      
      // Zurück von rechts nach links für die untere Hälfte
      for (let i = waveform.length - 1; i >= 0; i--) {
        const x = (i / (waveform.length - 1)) * width;
        const amplitude = waveform[i] * height * 0.8;
        ctx.lineTo(x, middle + amplitude / 2);
      }
      
      ctx.closePath();
      ctx.fillStyle = progressColor;
      ctx.fill();
      
      ctx.restore();
    }
  } else if (type === 'svg') {
    // SVG-basierte Darstellung
    let svg = container.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'none');
      container.appendChild(svg);
    } else {
      // Alle vorhandenen Elemente entfernen
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
    }
    
    // Clip-Path für den Fortschritt
    const clipPathId = `clip-path-${Math.random().toString(36).substring(2, 9)}`;
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipPathId);
    
    const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    clipRect.setAttribute('x', '0');
    clipRect.setAttribute('y', '0');
    clipRect.setAttribute('width', `${progress * 100}%`);
    clipRect.setAttribute('height', '100%');
    
    clipPath.appendChild(clipRect);
    
    // Defs-Element für Definitionen
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.appendChild(clipPath);
    svg.appendChild(defs);
    
    // Pfad für die Wellenform erstellen
    const middle = height / 2;
    let pathData = '';
    
    // Von links nach rechts für obere Hälfte
    waveform.forEach((amp, i) => {
      const x = (i / (waveform.length - 1)) * width;
      const amplitude = amp * height * 0.8;
      const y = middle - amplitude / 2;
      
      if (i === 0) {
        pathData += `M ${x},${y} `;
      } else {
        pathData += `L ${x},${y} `;
      }
    });
    
    // Von rechts nach links für untere Hälfte
    for (let i = waveform.length - 1; i >= 0; i--) {
      const x = (i / (waveform.length - 1)) * width;
      const amplitude = waveform[i] * height * 0.8;
      const y = middle + amplitude / 2;
      pathData += `L ${x},${y} `;
    }
    
    pathData += 'Z'; // Pfad schließen
    
    // Hintergrund-Waveform
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', color);
    svg.appendChild(path);
    
    // Fortschritts-Waveform
    if (progress > 0) {
      const progressPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      progressPath.setAttribute('d', pathData);
      progressPath.setAttribute('fill', progressColor);
      progressPath.setAttribute('clip-path', `url(#${clipPathId})`);
      svg.appendChild(progressPath);
    }
  } else if (type === 'bars') {
    // Balken-basierte Darstellung
    container.innerHTML = ''; // Container leeren
    
    const barContainer = document.createElement('div');
    barContainer.style.display = 'flex';
    barContainer.style.alignItems = 'center';
    barContainer.style.height = '100%';
    barContainer.style.width = '100%';
    
    // Maximale Anzahl von Balken basierend auf der Containerbreite
    const maxBars = Math.min(width / 2, waveform.length);
    const step = waveform.length / maxBars;
    
    // Balken erzeugen
    for (let i = 0; i < maxBars; i++) {
      const dataIndex = Math.floor(i * step);
      const value = waveform[dataIndex];
      
      const bar = document.createElement('div');
      bar.style.flex = '1';
      bar.style.height = `${value * 100}%`;
      bar.style.margin = '0 1px';
      
      // Fortschritt darstellen
      const isPlayed = i / maxBars <= progress;
      bar.style.backgroundColor = isPlayed ? progressColor : color;
      
      barContainer.appendChild(bar);
    }
    
    container.appendChild(barContainer);
  }
}

/**
 * Generiert eine Waveform-Darstellung für einen Song
 * @param {string} songPath - Pfad zur Audio-Datei
 * @param {number} width - Breite der Waveform (Anzahl der Samples)
 * @returns {Promise<number[]>} Ein Array von Amplitudenwerten zwischen 0 und 1
 */
export async function generateWaveform(songPath, width = 2000) {
  console.log(`Generiere echte Waveform für: ${songPath} mit ${width} Samples`);
  
  try {
    // Lade Audiodaten über die Electron-Bridge
    const result = await window.api.generateWaveformData(songPath, width);
    
    if (result.success) {
      console.log(`Waveform erfolgreich generiert, ${result.data.length} Samples`);
      return result.data;
    } else {
      console.error('Waveform-Generierung fehlgeschlagen:', result.error);
      // Fallback zu simulierter Waveform
      return generateSimulatedWaveform(songPath, width);
    }
  } catch (error) {
    console.error('Fehler bei der Waveform-Generierung:', error);
    // Fallback zu simulierter Waveform
    return generateSimulatedWaveform(songPath, width);
  }
}

/**
 * Generiert eine simulierte Waveform basierend auf dem Dateinamen
 * @param {string} songPath - Pfad zur Audio-Datei 
 * @param {number} width - Breite der Waveform (Anzahl der Samples)
 * @param {number} songDuration - Optional: Songlänge in Sekunden
 * @returns {number[]} Ein Array von simulierten Amplitudenwerten zwischen 0 und 1
 */
export function generateSimulatedWaveform(songPath, width = 2000, songDuration = 0) {
  console.log(`Generiere simulierte Waveform für: ${songPath} mit ${width} Samples`);
  
  // Verwende den Dateinamen als Seed für die Simulation
  const fileName = songPath.split('/').pop();
  const seed = fileName ? 
    fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 
    Math.random() * 10000;
  
  // Wir generieren genau width Samples, um den ganzen Song abzudecken
  // ohne zusätzliches Downsampling
  const waveform = new Array(width);
  let prevValue = 0.5;
  let trend = 0;
  
  // Songdauer in die Generierung einbeziehen, falls bekannt
  const hasDuration = songDuration > 0;
  
  // Generiere eine deterministische, aber natürlich aussehende Wellenform
  for (let i = 0; i < width; i++) {
    // Normalisierte Position im Song (0-1)
    const songPosition = i / (width - 1);
    
    // Pseudo-Zufallswert basierend auf dem Seed und der Position
    const pseudoRandom = Math.sin(seed * 0.1 + i * 0.3) * 0.5 + 0.5;
    const randomComponent = (pseudoRandom - 0.5) * 0.1;
    
    // Trend-basierte Kontinuität (damit die Werte nicht zu stark springen)
    trend = trend * 0.95 + randomComponent * 0.05;
    
    // Wert basierend auf vorherigem Wert und Trend berechnen
    let newValue = prevValue + trend;
    
    // Periodische Komponenten für ein musikalisches Gefühl
    // Skalieren der Taktfrequenz basierend auf der tatsächlichen Songposition
    const beatFrequency = hasDuration ? 
      // Bei bekannter Dauer: Beats basierend auf typischer BPM (120)
      120 / 60 * songDuration * songPosition :
      // Fallback: Generische Periodizität
      i * 0.1;
      
    // Verschiedene Frequenzen für verschiedene musikalische Elemente
    const beat = Math.sin(beatFrequency * 2.5) * 0.1; // Grundrhythmus 
    const melody = Math.sin(beatFrequency * 1.5 + seed * 0.05) * 0.15; // Melodie-Komponente
    const bass = Math.sin(beatFrequency * 0.8) * 0.1; // Bass-Komponente
    
    // Längerfristige Muster für Songstrukturen (sehr langsam)
    // Typischerweise hat ein Song 2-4 Hauptteile (Intro, Strophen, Refrain, Outro)
    const songParts = 3;
    const songStructure = Math.sin(songPosition * Math.PI * 2 * songParts) * 0.1;
    
    // Kombiniere alle Komponenten
    newValue += beat + melody + bass + songStructure;
    
    // Begrenzen auf sinnvollen Bereich (0.1 bis 0.9)
    newValue = Math.max(0.1, Math.min(0.9, newValue));
    
    // Scharfe Peaks für Drums/Beats hinzufügen
    // Basierend auf der Songposition - mehr Drums an strukturell wichtigen Stellen
    if (Math.sin(songPosition * Math.PI * 16) > 0.8 && pseudoRandom > 0.7) {
      newValue = 0.7 + pseudoRandom * 0.2;
    }
    
    // Mehr Variation für bestimmte Songabschnitte
    // Typischerweise sind Refrains lauter (etwa bei 25%, 50%, 75% des Songs)
    for (let refrain = 0.25; refrain < 1; refrain += 0.25) {
      const distance = Math.abs(songPosition - refrain);
      if (distance < 0.05) { // In der Nähe eines Refrains
        newValue *= (1 + (0.05 - distance) * 3); // Höhere Amplitude für Refrains
        newValue = Math.min(0.9, newValue); // Aber nicht zu hoch
      }
    }
    
    waveform[i] = newValue;
    prevValue = newValue;
  }
  
  console.log(`Simulierte Waveform für kompletten Song generiert: ${waveform.length} Samples`);
  return waveform;
}

/**
 * Komprimiert Waveform-Daten für die Speicherung
 * @param {number[]} waveform - Waveform-Daten als Array von Floats
 * @returns {string} Komprimierte Waveform als String
 */
export function compressWaveform(waveform) {
  if (!waveform || !Array.isArray(waveform)) {
    console.error('Ungültige Waveform-Daten zum Komprimieren');
    return '';
  }
  
  try {
    // Skaliere auf Werte zwischen 0-99 und konvertiere in Zeichen
    const compressed = waveform.map(value => {
      const scaled = Math.round(value * 99);
      const clamped = Math.max(0, Math.min(99, scaled));
      return String.fromCharCode(33 + clamped); // ASCII 33 (!) bis 132
    }).join('');
    
    return compressed;
  } catch (error) {
    console.error('Fehler beim Komprimieren der Waveform:', error);
    return '';
  }
}

/**
 * Dekomprimiert gespeicherte Waveform-Daten
 * @param {string} compressed - Komprimierte Waveform als String
 * @returns {number[]} Dekomprimierte Waveform als Array von Floats
 */
export function decompressWaveform(compressed) {
  if (!compressed || typeof compressed !== 'string') {
    console.error('Ungültige komprimierte Waveform-Daten');
    return [];
  }
  
  try {
    const waveform = Array.from(compressed).map(char => {
      const charCode = char.charCodeAt(0) - 33; // ASCII zurück zu 0-99
      return charCode / 99; // Skaliere zurück zu 0-1
    });
    
    return waveform;
  } catch (error) {
    console.error('Fehler beim Dekomprimieren der Waveform:', error);
    return [];
  }
}

/**
 * Versucht eine Waveform aus dem Cache zu laden
 * @param {string} cacheKey - Schlüssel für den Cache
 * @returns {number[]|null} Die Waveform-Daten oder null, wenn nicht im Cache
 */
export function getWaveformFromCache(cacheKey) {
  if (!cacheKey) return null;
  
  // Zuerst im In-Memory-Cache nachsehen
  if (waveformCache.has(cacheKey)) {
    return waveformCache.get(cacheKey);
  }
  
  // Dann im localStorage (falls verfügbar)
  try {
    if (typeof localStorage !== 'undefined') {
      const storageKey = `waveform:${cacheKey}`;
      const compressed = localStorage.getItem(storageKey);
      if (compressed) {
        const data = decompressWaveform(compressed);
        // Auch im In-Memory-Cache speichern für schnelleren Zugriff
        waveformCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (error) {
    console.warn('Konnte nicht auf localStorage zugreifen:', error);
  }
  
  return null;
}

/**
 * Speichert eine Wellenform im Cache
 * 
 * @param {string} cacheKey - Schlüssel für den Cache
 * @param {Array<number>} waveform - Wellenformdaten
 */
export function saveWaveformToCache(cacheKey, waveform) {
  if (!cacheKey || !waveform || !Array.isArray(waveform)) return;
  
  // In-Memory-Cache aktualisieren
  waveformCache.set(cacheKey, waveform);
  
  // Auch im localStorage speichern (falls verfügbar)
  try {
    if (typeof localStorage !== 'undefined') {
      const storageKey = `waveform:${cacheKey}`;
      const compressed = compressWaveform(waveform);
      localStorage.setItem(storageKey, compressed);
    }
  } catch (error) {
    console.warn('Konnte nicht in localStorage speichern:', error);
  }
}

/**
 * Löscht eine Wellenform aus dem Cache
 * 
 * @param {string} cacheKey - Schlüssel für den Cache
 */
export function removeWaveformFromCache(cacheKey) {
  if (!cacheKey) return;
  
  // Aus In-Memory-Cache entfernen
  waveformCache.delete(cacheKey);
  
  // Auch aus localStorage entfernen (falls verfügbar)
  try {
    if (typeof localStorage !== 'undefined') {
      const storageKey = `waveform:${cacheKey}`;
      localStorage.removeItem(storageKey);
    }
  } catch (error) {
    console.warn('Konnte nicht aus localStorage entfernen:', error);
  }
} 