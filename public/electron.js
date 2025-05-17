const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Für Entwicklungszwecke: Die URL der Entwicklungsumgebung
  const devUrl = 'http://localhost:5173';
  
  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || devUrl || url.format({
    pathname: path.join(__dirname, '../dist/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  console.log('Lade URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Immer DevTools öffnen, damit wir Fehler sehen können
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

/**
 * Rekursive Funktion um alle Audiodateien mit einfachen Metadaten in einem Verzeichnis und Unterverzeichnissen zu finden
 * 
 * @param {string} directoryPath - Pfad zum Verzeichnis
 * @param {boolean} includeSubdirectories - Ob Unterverzeichnisse durchsucht werden sollen
 * @returns {Array<Object>} - Array von Objekten mit relativem und absolutem Pfad sowie einfachen Metadaten
 */
function findAudioFilesRecursively(directoryPath, includeSubdirectories = false) {
  let audioFiles = [];
  
  try {
    const items = fs.readdirSync(directoryPath);
    
    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && includeSubdirectories) {
        // Rekursiv Unterverzeichnisse durchsuchen
        const subDirFiles = findAudioFilesRecursively(itemPath, true);
        audioFiles = [...audioFiles, ...subDirFiles];
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext)) {
          // Einfache Metadaten extrahieren (basierend auf Dateiname und Pfad)
          const metadata = extractBasicMetadata(itemPath, item);
          
          // Relativen Pfad (basierend auf dem Hauptverzeichnis) und absoluten Pfad speichern
          const relativePath = path.relative(directoryPath, itemPath);
          audioFiles.push({
            filename: item,
            relativePath: relativePath,
            absolutePath: itemPath,
            ...metadata
          });
        }
      }
    }
  } catch (error) {
    console.error(`Fehler beim Scannen des Verzeichnisses ${directoryPath}:`, error);
  }
  
  return audioFiles;
}

/**
 * Extrahiert einfache Metadaten aus Dateinamen und -pfad
 * 
 * @param {string} filePath - Pfad zur Audiodatei
 * @param {string} fileName - Name der Audiodatei
 * @returns {Object} - Extrahierte Metadaten
 */
function extractBasicMetadata(filePath, fileName) {
  try {
    // Dateiname ohne Erweiterung
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    
    // Statistiken der Datei
    const stats = fs.statSync(filePath);
    const createdAt = stats.birthtime;
    const fileSize = stats.size;
    
    // Versuche, Künstler und Titel aus dem Dateinamen zu extrahieren (Format: "Künstler - Titel")
    let artist = '';
    let title = nameWithoutExt;
    
    const splitPattern = /\s*[-–—]\s*/;
    if (splitPattern.test(nameWithoutExt)) {
      const parts = nameWithoutExt.split(splitPattern);
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    }
    
    // Versuche, das Album aus dem übergeordneten Verzeichnisnamen zu extrahieren
    const parentDir = path.basename(path.dirname(filePath));
    const album = parentDir !== path.basename(path.dirname(path.dirname(filePath))) ? parentDir : '';
    
    // Suche nach einem Album-Cover im selben Verzeichnis
    const albumCoverPath = findAlbumCover(path.dirname(filePath));
    
    return {
      title,
      artist,
      album,
      duration: 0, // Ohne echte Metadaten-Extraktion können wir die Dauer nicht bestimmen
      fileSize,
      createdAt: createdAt.toISOString(),
      albumCoverPath
    };
  } catch (error) {
    console.error(`Fehler beim Extrahieren der einfachen Metadaten für ${filePath}:`, error);
    return {
      title: fileName.replace(/\.[^/.]+$/, ""),
      artist: '',
      album: '',
      duration: 0,
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Sucht nach einem Album-Cover im angegebenen Verzeichnis
 * 
 * @param {string} dirPath - Pfad zum Verzeichnis
 * @returns {string|null} - Pfad zum Album-Cover oder null, wenn keines gefunden wurde
 */
function findAlbumCover(dirPath) {
  try {
    if (!dirPath || dirPath === '') {
      console.warn('Ungültiger Verzeichnispfad für Album-Cover-Suche');
      return null;
    }
    
    console.log(`Suche nach Album-Cover im Verzeichnis: ${dirPath}`);
    
    // Prüfen, ob das Verzeichnis existiert
    if (!fs.existsSync(dirPath)) {
      console.warn(`Verzeichnis existiert nicht: ${dirPath}`);
      return null;
    }
    
    const files = fs.readdirSync(dirPath);
    console.log(`${files.length} Dateien im Verzeichnis gefunden`);
    
    // Typische Namen für Album-Cover (erweiterte Liste)
    const coverNames = [
      'cover', 'folder', 'album', 'front', 'artwork', 'albumart',
      'art', 'thumbnail', 'cd', 'case', 'inlay', 'booklet',
      'scan', 'image', 'cover art'
    ];
    
    // Typische Bildformate
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
    
    // Suche nach Dateien mit bestimmten Namen (prüfe zuerst)
    for (const name of coverNames) {
      for (const ext of imageExtensions) {
        // Kleinbuchstaben-Variante
        const fileNameLower = `${name}${ext}`;
        if (files.some(f => f.toLowerCase() === fileNameLower)) {
          const matchedFile = files.find(f => f.toLowerCase() === fileNameLower);
          const foundPath = path.join(dirPath, matchedFile);
          console.log(`Album-Cover mit typischem Namen gefunden: ${foundPath}`);
          return foundPath;
        }
        
        // Großbuchstaben-Variante
        const fileNameUpper = `${name.charAt(0).toUpperCase() + name.slice(1)}${ext}`;
        if (files.some(f => f.toLowerCase() === fileNameUpper.toLowerCase())) {
          const matchedFile = files.find(f => f.toLowerCase() === fileNameUpper.toLowerCase());
          const foundPath = path.join(dirPath, matchedFile);
          console.log(`Album-Cover mit typischem Namen (Großbuchstaben) gefunden: ${foundPath}`);
          return foundPath;
        }
      }
    }
    
    // Suche nach Bilddateien mit bestimmten Wörtern im Namen
    const keywordMatches = files.filter(file => {
      const fileLower = file.toLowerCase();
      return imageExtensions.some(ext => fileLower.endsWith(ext)) && 
             coverNames.some(name => fileLower.includes(name));
    });
    
    if (keywordMatches.length > 0) {
      const foundPath = path.join(dirPath, keywordMatches[0]);
      console.log(`Album-Cover mit Keyword im Namen gefunden: ${foundPath}`);
      return foundPath;
    }
    
    // Wenn kein spezifisches Cover gefunden wurde, suche nach jeder Bilddatei
    // Bevorzuge größere Dateien, da diese wahrscheinlich Albumcover sind
    const imageFiles = files
      .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          return { 
            path: filePath, 
            size: stats.size,
            name: file.toLowerCase()  // Name für Sortieren nach "Cover"-ähnlichen Namen
          };
        } catch (e) {
          return { path: filePath, size: 0, name: file.toLowerCase() };
        }
      })
      // Sortiere nach Größe (absteigend) und bevorzuge Dateien mit "cover" im Namen
      .sort((a, b) => {
        // Prüfe, ob einer der Dateinamen ein Cover-Keyword enthält
        const aHasKeyword = coverNames.some(keyword => a.name.includes(keyword));
        const bHasKeyword = coverNames.some(keyword => b.name.includes(keyword));
        
        if (aHasKeyword && !bHasKeyword) return -1;
        if (!aHasKeyword && bHasKeyword) return 1;
        
        // Wenn beide oder keiner ein Keyword hat, sortiere nach Größe
        return b.size - a.size;
      });
    
    if (imageFiles.length > 0) {
      console.log(`Allgemeine Bilddatei als Album-Cover gewählt: ${imageFiles[0].path}`);
      return imageFiles[0].path;
    }
    
    console.log('Kein Album-Cover gefunden');
    return null;
  } catch (error) {
    console.error(`Fehler beim Suchen nach Album-Cover in ${dirPath}:`, error);
    return null;
  }
}

// IPC handlers for file system operations
ipcMain.handle('list-songs', async (event, directoryPath, includeSubdirectories = false) => {
  try {
    const files = findAudioFilesRecursively(directoryPath, includeSubdirectories);
    return files;
  } catch (error) {
    console.error('Error listing songs:', error);
    throw error;
  }
});

// Ordnerauswahl-Dialog
ipcMain.handle('select-directory', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Musikordner auswählen',
      buttonLabel: 'Ordner auswählen'
    });

    if (result.canceled) {
      return null;
    }

    return {
      path: result.filePaths[0],
      includeSubdirectories: options.includeSubdirectories || false
    };
  } catch (error) {
    console.error('Fehler beim Öffnen des Verzeichnisdialogs:', error);
    throw error;
  }
});

// IPC-Handler für die Überprüfung, ob ein Dateipfad existiert
ipcMain.handle('check-path-exists', async (event, filePath) => {
  try {
    const exists = fs.existsSync(filePath);
    console.log(`Pfadexistenz-Check: ${filePath} existiert: ${exists}`);
    return exists;
  } catch (error) {
    console.error('Fehler beim Überprüfen des Pfads:', error);
    return false;
  }
});

// IPC-Handler für das Laden von Audiodateien
ipcMain.handle('load-audio-file', async (event, filePath) => {
  try {
    console.log("Lade Audiodatei:", filePath);
    
    // Pfadexistenz-Check
    const exists = fs.existsSync(filePath);
    console.log(`Pfadexistenz-Check: ${filePath} existiert: ${exists}`);
    
    if (!exists) {
      return { success: false, error: 'Datei existiert nicht.' };
    }
    
    // Dateistatistik lesen
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { success: false, error: 'Pfad ist keine Datei.' };
    }
    
    // Dateiinhalt als BASE64 kodieren
    const data = fs.readFileSync(filePath);
    const base64data = data.toString('base64');
    
    // MIME-Typ bestimmen
    const mimeType = getMimeType(filePath);
    
    // Datenurl zurückgeben
    const dataUrl = `data:${mimeType};base64,${base64data}`;
    
    return { 
      success: true, 
      dataUrl,
      fileName: path.basename(filePath),
      size: stats.size
    };
  } catch (error) {
    console.error(`Fehler beim Laden der Audiodatei: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// IPC-Handler für das Laden von vollständigen Metadaten mit Album-Cover
ipcMain.handle('load-song-metadata', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Datei existiert nicht.' };
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { success: false, error: 'Pfad ist keine Datei.' };
    }
    
    const fileName = path.basename(filePath);
    const dirPath = path.dirname(filePath);
    
    // Grundlegende Metadaten extrahieren
    const metadata = extractBasicMetadata(filePath, fileName);
    
    // Album-Cover suchen und laden
    const coverPath = findAlbumCover(dirPath);
    let albumCover = null;
    
    console.log(`Suche nach Album-Cover für "${fileName}" in: ${dirPath}`);
    console.log(`Gefundener Album-Cover-Pfad: ${coverPath || "keins gefunden"}`);
    
    if (coverPath) {
      try {
        // Dateiinhalt als BASE64 kodieren
        const data = fs.readFileSync(coverPath);
        const base64data = data.toString('base64');
        
        // MIME-Typ basierend auf Dateierweiterung bestimmen
        const ext = path.extname(coverPath).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif'
        };
        const mimeType = mimeTypes[ext] || 'image/jpeg';
        
        // Daten-URL erstellen
        albumCover = `data:${mimeType};base64,${base64data}`;
        console.log(`Album-Cover erfolgreich geladen: ${path.basename(coverPath)}`);
      } catch (error) {
        console.error(`Fehler beim Laden des Album-Covers: ${error.message}`);
      }
    }
    
    // Dauer der Audiodatei ermitteln (sofern möglich)
    let duration = 0;
    
    // Ergebnis zurückgeben
    return {
      success: true,
      metadata: {
        ...metadata,
        albumCover,
        albumCoverPath: coverPath,
        duration,
        filePath,
        fileName,
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      }
    };
  } catch (error) {
    console.error(`Fehler beim Laden der Metadaten: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// IPC-Handler für die Bereitstellung von Album-Covers
ipcMain.handle('load-album-cover', async (event, coverPath) => {
  try {
    if (!coverPath || !fs.existsSync(coverPath)) {
      return { success: false, error: 'Datei existiert nicht.' };
    }
    
    // Dateistatistik lesen
    const stats = fs.statSync(coverPath);
    if (!stats.isFile()) {
      return { success: false, error: 'Pfad ist keine Datei.' };
    }
    
    // Dateiinhalt als BASE64 kodieren
    const data = fs.readFileSync(coverPath);
    const base64data = data.toString('base64');
    
    // MIME-Typ basierend auf Dateierweiterung bestimmen
    const ext = path.extname(coverPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    
    // Datenurl zurückgeben
    const dataUrl = `data:${mimeType};base64,${base64data}`;
    return { 
      success: true, 
      dataUrl,
      fileName: path.basename(coverPath),
      size: stats.size
    };
  } catch (error) {
    console.error(`Fehler beim Laden des Album-Covers: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Hilfsfunktion zur Bestimmung des MIME-Typs anhand der Dateiendung
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// IPC-Handler für die Generierung von Waveform-Daten
ipcMain.handle('generate-waveform', async (event, { songPath, width = 400 }) => {
  try {
    console.log(`Generiere Waveform für: ${songPath}, Breite: ${width}`);
    
    if (!songPath || !fs.existsSync(songPath)) {
      console.error(`Datei existiert nicht: ${songPath}`);
      return { 
        success: false, 
        error: 'Die Audiodatei existiert nicht.' 
      };
    }
    
    // Hier würde normalerweise eine echte Audio-Analyse stattfinden
    // Da wir keine externe Bibliothek einbinden können, erzeugen wir
    // stattdessen eine deterministische, aber simulierte Waveform
    
    // Erstelle eine deterministische Waveform basierend auf dem Dateinamen
    const fileName = path.basename(songPath);
    const seed = fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Generiere die simulierte Waveform-Daten
    const waveformData = generateSimulatedWaveformData(seed, width);
    
    console.log(`Waveform für "${fileName}" generiert, ${waveformData.length} Samples`);
    
    return {
      success: true,
      data: waveformData,
      fileName
    };
  } catch (error) {
    console.error(`Fehler bei der Waveform-Generierung: ${error.message}`);
    return { 
      success: false, 
      error: error.message || 'Unbekannter Fehler bei der Waveform-Generierung'
    };
  }
});

/**
 * Generiert eine simulierte Waveform mit deterministischen, aber realistisch aussehenden Daten.
 * 
 * @param {number} seed - Ein Seed-Wert für die deterministische Generierung
 * @param {number} width - Die Anzahl der zu generierenden Samples
 * @returns {number[]} - Array von Amplitudenwerten zwischen 0 und 1
 */
function generateSimulatedWaveformData(seed, width) {
  const waveform = [];
  let prevValue = 0.5;
  let trend = 0;
  
  // Faktor für die Variabilität basierend auf dem Seed
  const variabilityFactor = (seed % 10) / 10 + 0.5;
  
  // Generiere die Waveform-Daten
  for (let i = 0; i < width; i++) {
    // Pseudo-Zufallswert basierend auf dem Seed und der Position
    const pseudoRandom = Math.sin(seed * 0.1 + i * 0.3) * 0.5 + 0.5;
    const randomComponent = (pseudoRandom - 0.5) * 0.1 * variabilityFactor;
    
    // Trend-basierte Kontinuität für natürlichere Übergänge
    trend = trend * 0.95 + randomComponent * 0.05;
    
    // Wert basierend auf vorherigem Wert und Trend berechnen
    let newValue = prevValue + trend;
    
    // Periodische Komponenten für ein musikalisches Gefühl
    const timeFactor = i / 8;
    const beat = Math.sin(timeFactor * 2.5) * 0.1; // Grundrythmus
    const melody = Math.sin(timeFactor * 1.5 + seed * 0.05) * 0.15; // Melodie-Komponente
    const bass = Math.sin(timeFactor * 0.8) * 0.1; // Bass-Komponente
    
    newValue += beat + melody + bass;
    
    // Begrenzen auf sinnvollen Bereich (0.1 bis 0.9)
    newValue = Math.max(0.1, Math.min(0.9, newValue));
    
    // Scharfe Peaks für Drums/Beats hinzufügen
    if (i % Math.max(8, Math.floor(16 + (seed % 8))) === 0 && pseudoRandom > 0.6) {
      newValue = 0.7 + pseudoRandom * 0.2;
    }
    
    waveform.push(newValue);
    prevValue = newValue;
  }
  
  return waveform;
} 