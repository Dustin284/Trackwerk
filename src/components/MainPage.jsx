import { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Howl } from 'howler';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion } from 'framer-motion';
import SongList from './SongList';
import TrackWerkLogo from '../assets/logo';
import SettingsPage from './SettingsPage';
import { useLanguage } from '../i18n/LanguageContext';
import { LoadingModal } from './ui/LoadingModal';
import { 
  Search, 
  Settings, 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  Volume2, 
  AudioWaveform
} from 'lucide-react';
import { 
  decompressWaveform, 
  compressWaveform, 
  computeWaveformWidth,
  initWaveformDisplay,
  getOrCreateWaveform,
  drawWaveform
} from '../utils/waveformGenerator';
import { AudioPlayer } from './ui/AudioPlayer';

// Simple function to generate unique IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper-Funktionen für LocalStorage-Interaktionen
const storageKeys = {
  FAVORITES: 'trackwerk_favorites',
  RECENTLY_PLAYED: 'trackwerk_recently_played',
  TAGS: 'trackwerk_tags',
  SONGS: 'trackwerk_songs',
  MUSIC_PATH: 'trackwerk_music_path',
  VOLUME: 'trackwerk_volume',
  SETTINGS: 'trackwerk_settings',
  WAVEFORMS: 'trackwerk-waveforms',
  START_POSITION: 'trackwerk_start_position'
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern von ${key}:`, error);
    return false;
  }
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Fehler beim Laden von ${key}:`, error);
    return defaultValue;
  }
};

export default function MainPage() {
  const { t } = useLanguage();
  const [songs, setSongs] = useState(() => loadFromStorage(storageKeys.SONGS, []));
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState([]);
  const [current, setCurrent] = useState(null);
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => loadFromStorage(storageKeys.VOLUME, 0.75));
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recent, setRecent] = useState(() => loadFromStorage(storageKeys.RECENTLY_PLAYED, []));
  const [favs, setFavs] = useState(() => loadFromStorage(storageKeys.FAVORITES, []));
  const [musicLibraryPath, setMusicLibraryPath] = useState(() => loadFromStorage(storageKeys.MUSIC_PATH, ''));
  const [showSettings, setShowSettings] = useState(false);
  const [availableTags, setAvailableTags] = useState(() => loadFromStorage(storageKeys.TAGS, []));
  
  // Neue State-Variable für die Startposition (in Prozent)
  const [startPositionPercent, setStartPositionPercent] = useState(() => loadFromStorage(storageKeys.START_POSITION, 0));
  
  // Loading und Waveform state
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentLoadingSong, setCurrentLoadingSong] = useState(null);
  const [totalSongsToLoad, setTotalSongsToLoad] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const waveformsRef = useRef(loadFromStorage(storageKeys.WAVEFORMS, {}));

  // Neue State-Variablen für die Audiowiedergabe
  const [audioElement, setAudioElement] = useState(null);
  
  // Playlist-Management
  const [playlist, setPlaylist] = useState([]);

  // Neue State-Variable für den Waveform-Generierungs-Prozess
  const [generatingWaveforms, setGeneratingWaveforms] = useState(false);
  const [waveformGenerationProgress, setWaveformGenerationProgress] = useState(0);

  // Load & filter
  useEffect(() => {
    if (musicLibraryPath) {
      loadSongs();
    }
  }, [musicLibraryPath]);
  
  useEffect(() => {
    let list = songs;
    if (search) {
      const sq = search.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(sq) ||
        s.artist.toLowerCase().includes(sq) ||
        s.tags.some(t => t.toLowerCase().includes(sq))
      );
    }
    if (tags.length) {
      list = list.filter(s => tags.every(t => s.tags.includes(t)));
    }
    setFiltered(list);
  }, [search, tags, songs]);

  // Progress updater
  useEffect(() => {
    if (!sound || !playing) return;
    const id = setInterval(() => setProgress(sound.seek()), 500);
    return () => clearInterval(id);
  }, [sound, playing]);

  // Save data when it changes
  useEffect(() => {
    saveToStorage(storageKeys.FAVORITES, favs);
  }, [favs]);
  
  useEffect(() => {
    saveToStorage(storageKeys.RECENTLY_PLAYED, recent);
  }, [recent]);
  
  useEffect(() => {
    saveToStorage(storageKeys.TAGS, availableTags);
  }, [availableTags]);
  
  useEffect(() => {
    saveToStorage(storageKeys.SONGS, songs);
  }, [songs]);
  
  useEffect(() => {
    saveToStorage(storageKeys.MUSIC_PATH, musicLibraryPath);
  }, [musicLibraryPath]);
  
  useEffect(() => {
    saveToStorage(storageKeys.VOLUME, volume);
  }, [volume]);

  // Save waveforms when they change
  useEffect(() => {
    if (Object.keys(waveformsRef.current).length > 0) {
      saveToStorage(storageKeys.WAVEFORMS, waveformsRef.current);
    }
  }, [songs]);

  // Speichere startPositionPercent im LocalStorage, wenn es sich ändert
  useEffect(() => {
    saveToStorage(storageKeys.START_POSITION, startPositionPercent);
  }, [startPositionPercent]);

  // Audio-Element beim ersten Laden initialisieren
  useEffect(() => {
    console.log("Initialisiere Audio-Element...");
    const audio = new Audio();
    audio.volume = volume;
    
    // Event-Listener für Audio-Updates
    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime);
    });
    
    audio.addEventListener('loadedmetadata', () => {
      console.log("Metadaten geladen, Dauer:", audio.duration);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        
        // Dauer im Song-Objekt aktualisieren, wenn ein aktueller Song vorhanden ist
        if (current) {
          const updatedSong = { ...current, duration: audio.duration };
          setCurrent(updatedSong);
          
          // Aktualisiere auch die Song-Liste
          setSongs(prevSongs => 
            prevSongs.map(song => 
              song.id === current.id ? updatedSong : song
            )
          );
        }
      } else {
        console.warn("Ungültige Audiodauer erhalten:", audio.duration);
      }
    });
    
    audio.addEventListener('durationchange', () => {
      console.log("Dauer geändert:", audio.duration);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    });
    
    audio.addEventListener('canplay', () => {
      console.log("Audio kann abgespielt werden, Dauer:", audio.duration);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    });
    
    audio.addEventListener('error', (e) => {
      console.error("Audio-Fehler:", e);
    });
    
    audio.addEventListener('ended', () => {
      console.log("Song beendet, spiele nächsten");
      handleNext();
    });
    
    setAudioElement(audio);
    
    // Cleanup beim Unmount
    return () => {
      console.log("Audio-Element wird entfernt");
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('durationchange', () => {});
      audio.removeEventListener('canplay', () => {});
      audio.removeEventListener('error', () => {});
      audio.removeEventListener('ended', () => {});
    };
  }, []);

  const loadSongs = async () => {
    try {
      if (!musicLibraryPath) return;
      
      // Lade-Status aktivieren
      setLoading(true);
      setLoadingProgress(0);
      setCurrentSongIndex(0);
      setCurrentLoadingSong({ name: t('preparingLibrary') });
      
      saveToStorage(storageKeys.MUSIC_PATH, musicLibraryPath);
      
      // Bestehende Songs merken, um Tags zu erhalten
      const existingSongs = loadFromStorage(storageKeys.SONGS, []);
      const songMap = {};
      existingSongs.forEach(song => {
        // Verwenden des vollständigen Pfades als Schlüssel
        songMap[song.path] = song;
      });
      
      // Lade gespeicherte Wellenformen
      waveformsRef.current = loadFromStorage(storageKeys.WAVEFORMS, {});
      
      // Musikpfade durch Semikolon trennen und verarbeiten
      const pathsArray = musicLibraryPath.split(';').filter(path => path.trim() !== '');
      let allSongs = [];
      
      // Für jeden Pfad Songs laden
      for (const pathEntry of pathsArray) {
        if (!pathEntry.trim()) continue;
        
        // Prüfen, ob Unterordner eingeschlossen werden sollen
        const includeSubdirectories = pathEntry.startsWith("[sub]");
        const cleanPath = includeSubdirectories ? pathEntry.substring(5) : pathEntry;
        
        if (!cleanPath.trim()) continue;
        
        try {
          console.log(`Verarbeite Pfad: ${cleanPath} (mit Unterordnern: ${includeSubdirectories})`);
          setCurrentLoadingSong({ 
            name: t('scanningDirectory'), 
            path: cleanPath, 
            includeSubdirectories 
          });
          
          // Neue API aufrufen, die strukturierte Dateiobjekte und Metadaten zurückgibt
          const files = await window.api.listSongs(cleanPath.trim(), includeSubdirectories);
          
          if (!files || !Array.isArray(files)) {
            console.error(`Keine Dateien gefunden für Pfad: ${cleanPath}`);
            continue;
          }
          
          console.log(`${files.length} Dateien gefunden in: ${cleanPath}`);
          
          const songsFromPath = files.map(file => {
            // Extrahiere den Dateinamen ohne Erweiterung oder verwende den Titel aus den Metadaten
            const fileName = file.filename.replace(/\.[^/.]+$/, "");
            const fullPath = file.absolutePath;
            
            // Prüfe, ob der Song bereits existiert
            const existingSong = songMap[fullPath];
            
            // Album-Cover-URL, falls vorhanden
            let albumCover = existingSong?.albumCover || null;
            
            // Metadaten verwenden oder Fallback zu bestehenden Werten oder Defaults
            return {
              id: existingSong?.id || generateId(),
              name: file.title || existingSong?.name || fileName,
              artist: file.artist || existingSong?.artist || t('artist'),
              album: file.album || existingSong?.album || '',
              path: fullPath,
              duration: file.duration || existingSong?.duration || 0,
              year: file.year || existingSong?.year || '',
              genre: file.genre || existingSong?.genre || '',
              createdAt: file.createdAt || existingSong?.createdAt || new Date().toISOString(),
              albumCoverPath: file.albumCoverPath || existingSong?.albumCoverPath || null,
              albumCover: albumCover,
              tags: existingSong?.tags || [],
              waveform: existingSong?.waveform || null
            };
          });
          
          allSongs = [...allSongs, ...songsFromPath];
        } catch (error) {
          console.error(`Fehler beim Laden von Songs aus ${cleanPath}:`, error);
        }
      }
      
      // Setze Gesamtzahl der zu ladenden Songs
      setTotalSongsToLoad(allSongs.length);
      
      // Fortschritt initialisieren
      let processedSongs = 0;
      const totalSongs = allSongs.length;
      console.log(`Verarbeite ${totalSongs} Songs...`);
      
      // Für jeden Song Wellenform generieren und Album-Cover laden
      for (let i = 0; i < allSongs.length; i++) {
        const song = allSongs[i];
        processedSongs++;
        setCurrentSongIndex(processedSongs);
        
        // Aktualisiere Laden-Status und zeige aktuellen Song an
        setCurrentLoadingSong({
          ...song,
          processed: processedSongs,
          total: totalSongs
        });
        setLoadingProgress(processedSongs / totalSongs);
        
        // Lade Album-Cover, falls ein Pfad vorhanden ist
        if (song.albumCoverPath && !song.albumCover) {
          try {
            console.log(`Lade Album-Cover für "${song.name}" von: ${song.albumCoverPath}`);
            const coverResult = await window.api.loadAlbumCover(song.albumCoverPath);
            if (coverResult.success) {
              console.log(`Album-Cover erfolgreich geladen: ${coverResult.fileName}`);
              allSongs[i] = { ...allSongs[i], albumCover: coverResult.dataUrl };
            } else {
              console.warn(`Album-Cover konnte nicht geladen werden: ${coverResult.error}`);
            }
          } catch (error) {
            console.error(`Fehler beim Laden des Album-Covers für ${song.name}:`, error);
          }
        } else if (!song.albumCoverPath) {
          try {
            // Wenn kein Album-Cover-Pfad vorhanden ist, laden wir die Metadaten
            // und prüfen, ob dort ein Album-Cover gefunden werden kann
            console.log(`Versuche Album-Cover über Metadaten zu laden für "${song.name}"`);
            const metadataResult = await window.api.loadSongMetadata(song.path);
            
            if (metadataResult.success && metadataResult.metadata?.albumCover) {
              console.log(`Album-Cover aus Metadaten geladen für "${song.name}"`);
              allSongs[i] = { 
                ...allSongs[i], 
                albumCover: metadataResult.metadata.albumCover,
                albumCoverPath: metadataResult.metadata.albumCoverPath
              };
            }
          } catch (metaError) {
            console.error(`Fehler beim Laden der Metadaten für Album-Cover: ${metaError}`);
          }
        }
        
        // Prüfen, ob Wellenform bereits existiert
        if (!song.waveform && !waveformsRef.current[song.id]) {
          try {
            console.log(`Generiere Wellenform für "${song.name}"`);
            
            // Berechne optimale Sampleanzahl basierend auf der Songdauer
            const containerWidth = 2000;
            const sampleCount = await computeWaveformWidth(song.path, containerWidth, song.duration || 0);
            console.log(`Optimale Sampleanzahl für "${song.name}": ${sampleCount} (Dauer: ${song.duration}s)`);
            
            // Verwende die Song-Dauer für eine bessere Wellenform
            const waveformData = generateDetailedWaveform(sampleCount, song.name, song.duration);
            
            // Simuliere den Fortschritt der Wellenform-Generierung
            for (let progress = 0; progress <= 1; progress += 0.1) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Komprimiere und speichere Wellenform
            const compressed = compressWaveform(waveformData);
            waveformsRef.current[song.id] = compressed;
            allSongs[i] = { ...allSongs[i], waveform: compressed };
            
            // Cache aktualisieren
            saveToStorage(storageKeys.WAVEFORMS, waveformsRef.current);
            
            console.log(`Wellenform für "${song.name}" erfolgreich erstellt und gespeichert (${waveformData.length} Samples)`);
          } catch (error) {
            console.error(`Fehler bei Generierung der Wellenform für ${song.name}:`, error);
          }
        } else if (waveformsRef.current[song.id] && !song.waveform) {
          // Nutze bereits gespeicherte Wellenform
          console.log(`Verwende gespeicherte Wellenform für "${song.name}"`);
          allSongs[i] = { ...allSongs[i], waveform: waveformsRef.current[song.id] };
        }
        
        // Kurze Pause zwischen Songs, um UI-Updates zu ermöglichen
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`${processedSongs} Songs erfolgreich verarbeitet`);
      setSongs(allSongs);
      setFiltered(allSongs);
      saveToStorage(storageKeys.SONGS, allSongs);
      
      // Lade-Status deaktivieren
      setTimeout(() => {
        setLoading(false);
        setCurrentLoadingSong(null);
      }, 500);
    } catch (error) {
      console.error('Error loading songs:', error);
      setLoading(false);
    }
  };

  // Funktion zur Generierung einer detaillierten Wellenform basierend auf dem Song-Namen
  function generateDetailedWaveform(length = 2000, songName = '', songDuration = 0) {
    // Verwende den Song-Namen als Seed für eine deterministische Wellenform
    const seed = songName ? 
      songName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 
      Math.random() * 10000;
    
    console.log(`Erstelle Wellenform für '${songName}' mit ${length} Samples für ${songDuration} Sekunden`);
    
    // Wir generieren genau die angeforderte Anzahl von Samples für den ganzen Song
    // ohne zusätzliches Downsampling oder Erweiterung
    const waveform = new Array(length);
    let prevValue = 0.5;
    let trend = 0;
    
    // Generiere eine deterministische, aber natürlich aussehende Wellenform
    for (let i = 0; i < length; i++) {
      // Position im Song (0-1)
      const songPosition = i / (length - 1);
      
      // Pseudo-Zufallswert basierend auf dem Seed und der Position
      const pseudoRandom = Math.sin(seed * 0.1 + i * 0.3) * 0.5 + 0.5;
      const randomComponent = (pseudoRandom - 0.5) * 0.1;
      
      // Trend-basierte Kontinuität (damit die Werte nicht zu stark springen)
      trend = trend * 0.95 + randomComponent * 0.05;
      
      // Wert basierend auf vorherigem Wert und Trend berechnen
      let newValue = prevValue + trend;
      
      // Periodische Komponenten für ein musikalisches Gefühl basierend auf der Songposition
      const hasDuration = songDuration > 0;
      
      // Taktfrequenz basierend auf der Songposition berechnen
      const beatFrequency = hasDuration ? 
        // Bei bekannter Dauer: Beats basierend auf typischer BPM (120)
        120 / 60 * songDuration * songPosition :
        // Fallback: Generische Periodizität
        i * 0.1;
      
      // Verschiedene Frequenzen für verschiedene musikalische Elemente
      const beat = Math.sin(beatFrequency * 2.5) * 0.1; // Grundrhythmus 
      const melody = Math.sin(beatFrequency * 1.5 + seed * 0.05) * 0.15; // Melodie
      const bass = Math.sin(beatFrequency * 0.8) * 0.1; // Bass
      
      // Längerfristige Muster für Songstrukturen (sehr langsam)
      // Typischerweise hat ein Song 2-4 Hauptteile (Intro, Strophen, Refrain, Outro)
      const songParts = 3;
      const songStructure = Math.sin(songPosition * Math.PI * 2 * songParts) * 0.1;
      
      // Kombiniere alle Komponenten
      newValue += beat + melody + bass + songStructure;
      
      // Begrenzen auf sinnvollen Bereich (0.1 bis 0.9)
      newValue = Math.max(0.1, Math.min(0.9, newValue));
      
      // Scharfe Peaks für Drums/Beats basierend auf der Position im Song
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
    
    console.log(`Wellenform für '${songName}' fertig: ${waveform.length} Samples für den gesamten Song`);
    return waveform;
  }

  // Song abspielen
  const playSong = async (song) => {
    if (!song) return;
    
    console.log("Versuche Song abzuspielen:", song.name, "Pfad:", song.path);
    
    // Update recently played
    const updatedRecent = [song, ...recent.filter(x => x.id !== song.id)].slice(0, 10);
    setRecent(updatedRecent);
    saveToStorage(storageKeys.RECENTLY_PLAYED, updatedRecent);
    
    // Wenn der gleiche Song geklickt wird, Play/Pause umschalten
    if (current && current.id === song.id) {
      console.log("Gleicher Song, umschalten zwischen Play/Pause");
      handlePlayPause();
      return;
    }
    
    // Überprüfen, ob der Song-Pfad korrekt ist
    if (!song.path) {
      console.error("Song hat keinen gültigen Pfad:", song);
      alert("Dieser Song hat keinen gültigen Pfad und kann nicht abgespielt werden.");
      return;
    }
    
    // Prüfen, ob der Pfad existiert
    try {
      const exists = await window.api.checkPathExists(song.path);
      console.log(`Pfad ${song.path} existiert: ${exists}`);
      
      if (!exists) {
        console.warn("Song-Datei existiert nicht!");
        alert(`Die Datei "${song.name}" existiert nicht mehr am angegebenen Pfad.`);
        return;
      }
      
      // Aktuelle Playlist-Position aktualisieren
      const newIndex = playlist.findIndex(s => s.id === song.id);
      if (newIndex !== -1) {
        setCurrentSongIndex(newIndex);
      } else {
        // Neue Playlist aus gefilterten Songs erstellen, beginnend mit dem gewählten Song
        const startIndex = filtered.findIndex(s => s.id === song.id);
        if (startIndex !== -1) {
          const newPlaylist = [
            ...filtered.slice(startIndex),
            ...filtered.slice(0, startIndex)
          ];
          setPlaylist(newPlaylist);
          setCurrentSongIndex(0);
        }
      }
      
      // Aktuelle Wiedergabe stoppen, falls ein Song abgespielt wird
      if (playing && audioElement) {
        console.log("Stoppe aktuelle Wiedergabe");
        audioElement.pause();
      }
      
      // Song-Informationen setzen und abspielen
      setCurrent(song);
      setProgress(0);
      setDuration(song.duration || 0);
      
      // Audio-Element nur einmal erstellen, wenn notwendig
      if (!audioElement) {
        console.log("Erstelle neues Audio-Element");
        const newAudio = new Audio();
        newAudio.volume = volume;
        setAudioElement(newAudio);
      }
      
      // Lade die Audiodatei über die API
      console.log("Lade Audiodatei über API:", song.path);
      const result = await window.api.loadAudioFile(song.path);
      
      if (!result.success) {
        console.error("Fehler beim Laden der Audiodatei:", result.error);
        alert(`Fehler beim Laden der Audiodatei: ${result.error}`);
        return;
      }
      
      console.log("Audiodatei erfolgreich geladen, Größe:", result.size, "Byte");
      
      // Setze die dataURL als Quelle und starte die Wiedergabe
      console.log("Setze Audioquelle");
      audioElement.src = result.dataUrl;
      audioElement.load();
      
      // Lade zusätzliche Metadaten, falls verfügbar
      try {
        const metadataResult = await window.api.loadSongMetadata(song.path);
        if (metadataResult.success && metadataResult.metadata) {
          console.log("Zusätzliche Metadaten geladen:", metadataResult.metadata);
          
          // Aktualisiere den Song mit den zusätzlichen Metadaten
          const updatedSong = { 
            ...song,
            duration: metadataResult.metadata.duration || song.duration,
            albumCover: metadataResult.metadata.albumCover || song.albumCover,
            // Speichere den Album-Cover-Pfad für zukünftige Verwendung
            albumCoverPath: metadataResult.metadata.albumCoverPath || song.albumCoverPath
          };
          
          // Aktualisiere den aktuellen Song
          setCurrent(updatedSong);
          
          // Aktualisiere auch in der Song-Liste
          setSongs(prevSongs => 
            prevSongs.map(s => s.id === song.id ? updatedSong : s)
          );
          
          // Speichere die aktualisierte Liste
          saveToStorage(storageKeys.SONGS, songs);
        }
      } catch (error) {
        console.warn("Fehler beim Laden zusätzlicher Metadaten:", error);
      }
      
      // Überprüfe, ob ein benutzerdefinierter Startpunkt verwendet werden soll
      if (startPositionPercent > 0) {
        // Erst wenn die Metadaten geladen sind, können wir die Dauer verwenden
        audioElement.addEventListener('loadedmetadata', () => {
          if (audioElement.duration && !isNaN(audioElement.duration)) {
            // Berechne die Startposition basierend auf dem Prozentsatz und der Dauer
            const startTime = (audioElement.duration * startPositionPercent) / 100;
            console.log(`Starte Song bei ${startPositionPercent}% (${startTime.toFixed(2)} Sekunden)`);
            audioElement.currentTime = startTime;
            
            // Setze den Fortschritt entsprechend
            setProgress(startTime);
          } else {
            console.warn("Konnte Song nicht an benutzerdefinierter Position starten: Dauer nicht verfügbar");
          }
        }, { once: true });
      }
      
      console.log("Starte Wiedergabe");
      try {
        const playPromise = audioElement.play();
        playPromise.then(() => {
          console.log("Song wird erfolgreich abgespielt:", song.name);
          setPlaying(true);
          
          // Setze die Dauer, wenn sie verfügbar wird
          if (audioElement.duration && !isNaN(audioElement.duration)) {
            console.log("Dauer erkannt:", audioElement.duration);
            setDuration(audioElement.duration);
            
            // Aktualisiere auch den Song
            const updatedSong = { ...song, duration: audioElement.duration };
            setCurrent(updatedSong);
            
            // Aktualisiere in der Song-Liste
            setSongs(prevSongs => 
              prevSongs.map(s => s.id === song.id ? updatedSong : s)
            );
          }
        }).catch(error => {
          console.error("Fehler beim Abspielen:", error);
          alert(`Fehler beim Abspielen: ${error.message}`);
          setPlaying(false);
        });
      } catch (error) {
        console.error("Unerwarteter Fehler beim Abspielen:", error);
        alert(`Unerwarteter Fehler: ${error.message}`);
      }
      
    } catch (error) {
      console.error("Fehler beim Überprüfen oder Laden des Songs:", error);
      alert(`Fehler: ${error.message}`);
    }
  };
  
  // Wiedergabe starten/pausieren
  const handlePlayPause = () => {
    if (!audioElement || !current) {
      console.error("Kann nicht play/pause aufrufen: kein Audio-Element oder kein Song ausgewählt");
      return;
    }
    
    console.log("Play/Pause umschalten, aktueller Status:", playing);
    
    if (playing) {
      console.log("Pausiere Audio");
      try {
        audioElement.pause();
        setPlaying(false);
      } catch (error) {
        console.error("Fehler beim Pausieren:", error);
      }
    } else {
      console.log("Starte Wiedergabe");
      try {
        // Überprüfe, ob die Audioquelle gesetzt ist
        if (!audioElement.src || audioElement.src === '') {
          console.log("Audio-Element hat keine Quelle, lade Song neu:", current.path);
          // Lade den Song erneut
          playSong(current);
          return;
        }
        
        const playPromise = audioElement.play();
        playPromise.then(() => {
          console.log("Wiedergabe erfolgreich gestartet");
          setPlaying(true);
        }).catch(error => {
          console.error("Fehler beim Starten der Wiedergabe:", error);
          alert(`Fehler beim Abspielen: ${error.message}`);
        });
      } catch (error) {
        console.error("Unerwarteter Fehler beim Abspielen:", error);
        alert(`Unerwarteter Fehler: ${error.message}`);
      }
    }
  };
  
  // Wiedergabe stoppen
  const handleStop = () => {
    if (!audioElement) return;
    
    audioElement.pause();
    audioElement.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  };
  
  // Lautstärke ändern
  const handleVolumeChange = (newVolume) => {
    if (!audioElement) return;
    
    audioElement.volume = newVolume;
    setVolume(newVolume);
  };
  
  // Zu Position springen
  const handleSeek = (newTime) => {
    if (!audioElement) return;
    
    audioElement.currentTime = newTime;
    setProgress(newTime);
  };
  
  // Zum vorherigen Song
  const handlePrevious = () => {
    if (playlist.length === 0 || currentSongIndex < 0) return;
    
    // Wenn mehr als 3 Sekunden abgespielt wurden, zum Anfang des aktuellen Songs springen
    if (progress > 3) {
      handleSeek(0);
      return;
    }
    
    const prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    const prevSong = playlist[prevIndex];
    
    setCurrentSongIndex(prevIndex);
    playSong(prevSong);
  };
  
  // Zum nächsten Song
  const handleNext = () => {
    if (playlist.length === 0 || currentSongIndex < 0) return;
    
    const nextIndex = (currentSongIndex + 1) % playlist.length;
    const nextSong = playlist[nextIndex];
    
    setCurrentSongIndex(nextIndex);
    playSong(nextSong);
  };

  // Aktualisiere die Playlist bei Änderungen der gefilterten Songs
  useEffect(() => {
    if (filtered.length > 0 && playlist.length === 0) {
      setPlaylist(filtered);
    }
  }, [filtered]);

  const toggleFavorite = (songId) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    
    const updatedFavs = favs.some(f => f.id === songId)
      ? favs.filter(f => f.id !== songId)
      : [...favs, song];
      
    setFavs(updatedFavs);
    saveToStorage(storageKeys.FAVORITES, updatedFavs);
  };

  const addTagToSong = (songId, tag) => {
    // Add to available tags if not already there
    if (!availableTags.includes(tag)) {
      const updatedTags = [...availableTags, tag];
      setAvailableTags(updatedTags);
      saveToStorage(storageKeys.TAGS, updatedTags);
    }
    
    // Update song tags
    const updatedSongs = songs.map(song => 
      song.id === songId && !song.tags.includes(tag)
        ? { ...song, tags: [...song.tags, tag] }
        : song
    );
    
    setSongs(updatedSongs);
    saveToStorage(storageKeys.SONGS, updatedSongs);
  };

  const removeTagFromSong = (songId, tag) => {
    const updatedSongs = songs.map(song => 
      song.id === songId
        ? { ...song, tags: song.tags.filter(t => t !== tag) }
        : song
    );
    
    setSongs(updatedSongs);
    saveToStorage(storageKeys.SONGS, updatedSongs);
  };

  const removeTagFromAllSongs = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
    
    const updatedSongs = songs.map(song => ({
      ...song,
      tags: song.tags.filter(t => t !== tag)
    }));
    
    setSongs(updatedSongs);
    saveToStorage(storageKeys.SONGS, updatedSongs);
  };

  // Exportieren aller Daten
  const exportData = () => {
    try {
      const data = {
        songs: songs,
        favorites: favs,
        recentlyPlayed: recent,
        tags: availableTags,
        settings: {
          musicLibraryPath,
          volume
        },
        waveforms: waveformsRef.current,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackwerk-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Exportieren der Daten:', error);
    }
  };

  // Importieren von Daten
  const importData = (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.songs) {
        // Prüfe, ob Songs Wellenform-Daten haben
        const songsWithWaveforms = data.songs.map(song => {
          if (song.waveform) {
            // Speichere Wellenform im Cache
            waveformsRef.current[song.id] = song.waveform;
          }
          return song;
        });
        
        setSongs(songsWithWaveforms);
        saveToStorage(storageKeys.SONGS, songsWithWaveforms);
      }
      
      if (data.favorites) {
        setFavs(data.favorites);
        saveToStorage(storageKeys.FAVORITES, data.favorites);
      }
      
      if (data.recentlyPlayed) {
        setRecent(data.recentlyPlayed);
        saveToStorage(storageKeys.RECENTLY_PLAYED, data.recentlyPlayed);
      }
      
      if (data.tags) {
        setAvailableTags(data.tags);
        saveToStorage(storageKeys.TAGS, data.tags);
      }
      
      if (data.waveforms) {
        waveformsRef.current = { ...waveformsRef.current, ...data.waveforms };
        saveToStorage(storageKeys.WAVEFORMS, waveformsRef.current);
      }
      
      if (data.settings) {
        if (data.settings.musicLibraryPath) {
          setMusicLibraryPath(data.settings.musicLibraryPath);
          saveToStorage(storageKeys.MUSIC_PATH, data.settings.musicLibraryPath);
        }
        
        if (data.settings.volume) {
          setVolume(data.settings.volume);
          saveToStorage(storageKeys.VOLUME, data.settings.volume);
        }
      }
    } catch (error) {
      console.error('Fehler beim Importieren der Daten:', error);
    }
  };

  const clearAllSongs = () => {
    try {
      // Setze alle Song-bezogenen Zustände zurück
      setSongs([]);
      setFiltered([]);
      setCurrent(null);
      setRecent([]);
      
      // Stoppe aktuelle Wiedergabe falls vorhanden
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      setPlaying(false);
      setProgress(0);
      setDuration(0);
      
      // Lösche auch die Songs aus dem LocalStorage
      localStorage.removeItem(storageKeys.SONGS);
      localStorage.removeItem(storageKeys.RECENTLY_PLAYED);
      
      // Waveforms zurücksetzen
      waveformsRef.current = {};
      localStorage.removeItem(storageKeys.WAVEFORMS);
      
      // Zeige Erfolgsmeldung
      alert(t('clearAllSongsSuccess'));
    } catch (error) {
      console.error('Fehler beim Entfernen aller Songs:', error);
    }
  };

  /**
   * Generiert Wellenformen für alle Songs in der Liste
   * 
   * @param {Array<Object>} songs - Liste der Songs, für die Wellenformen generiert werden sollen
   * @return {Promise<Object>} Ein Objekt mit Song-IDs als Schlüssel und komprimierten Wellenformen
   */
  const generateWaveformsForSongs = async (songs) => {
    if (!songs || songs.length === 0) return {};
    
    setLoading(true);
    setLoadingProgress(0);
    
    // Kopie des aktuellen Song-Arrays erstellen, die wir bei Bedarf aktualisieren können
    const updatedSongs = [...songs];
    
    try {
      // Wellenformen für jeden Song generieren
      for (const song of songs) {
        if (!song.path) continue;
        
        try {
          console.log(`Generiere Wellenform für "${song.name}" über API`);
          
          // Suche den Song-Index im Haupt-Array
          const songIndex = updatedSongs.findIndex(s => s.id === song.id);
          if (songIndex === -1) continue;
          
          // Virtuelle Containergröße festlegen (da wir keinen echten DOM-Container haben)
          const containerWidth = 2000;
          
          // Die initWaveformDisplay-Funktion verwenden, die sowohl die Breite als auch die Dauer berücksichtigt
          const waveformData = await initWaveformDisplay(song.path, null, song.duration || 0);
          
          // Komprimiere und speichere Wellenform
          if (waveformData && waveformData.length > 0) {
            console.log(`Waveform für "${song.name}" erfolgreich generiert (${waveformData.length} Samples)`);
            
            const compressed = compressWaveform(waveformData);
            waveformsRef.current[song.id] = compressed;
            updatedSongs[songIndex] = { ...updatedSongs[songIndex], waveform: compressed };
          } else {
            console.error(`Keine Waveform-Daten für "${song.name}" erhalten`);
          }
        } catch (error) {
          console.error(`Fehler bei der Waveform-Generierung für "${song.name}":`, error);
        }
      }
      
      // Aktualisiere die Songs im State, wenn wir Änderungen vorgenommen haben
      if (updatedSongs !== songs) {
        setSongs(updatedSongs);
      }
      
      console.log(`Wellenform-Generierung für ${songs.length} Songs abgeschlossen.`);
      return waveformsRef.current;
    } catch (error) {
      console.error('Fehler bei der Wellenform-Generierung:', error);
      return waveformsRef.current;
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Handler für das manuelle Generieren einer Wellenform für einen einzelnen Song
  const handleGenerateWaveform = async (song) => {
    if (!song || !song.path) {
      toast({
        title: t('errorTitle'),
        description: t('invalidSongError'),
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setLoadingProgress(0);
    
    try {
      console.log(`Manuelles Generieren der Wellenform für "${song.name}" gestartet`);
      
      // Virtueller Container mit fester Breite (da wir keinen DOM-Element haben)
      const containerWidth = 2000;
      
      // Verwenden der optimierten Funktion
      const waveformData = await initWaveformDisplay(song.path, null, song.duration || 0);
      
      if (waveformData && waveformData.length > 0) {
        // Wellenform komprimieren und speichern
        const compressed = compressWaveform(waveformData);
        
        // In-Memory-Referenz aktualisieren
        waveformsRef.current[song.id] = compressed;
        
        // Song im State aktualisieren
        setSongs(prevSongs => {
          return prevSongs.map(s => {
            if (s.id === song.id) {
              return { ...s, waveform: compressed };
            }
            return s;
          });
        });
        
        console.log(`Wellenform für "${song.name}" erfolgreich generiert mit ${waveformData.length} Samples`);
        
        toast({
          title: t('success'),
          description: t('waveformGeneratedSuccess'),
        });
      } else {
        console.error(`Keine Wellenform-Daten für "${song.name}" erhalten`);
        
        toast({
          title: t('error'),
          description: t('waveformGenerationError'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Fehler bei der Wellenform-Generierung:', error);
      
      toast({
        title: t('errorTitle'),
        description: t('waveformGenerationError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showSettings) {
    return (
      <SettingsPage
        musicLibraryPath={musicLibraryPath}
        setMusicLibraryPath={setMusicLibraryPath}
        loadSongs={loadSongs}
        availableTags={availableTags}
        setAvailableTags={setAvailableTags}
        removeTagFromAllSongs={removeTagFromAllSongs}
        onBackToMain={() => setShowSettings(false)}
        onExportData={exportData}
        onImportData={importData}
        onClearAllSongs={clearAllSongs}
        startPositionPercent={startPositionPercent}
        setStartPositionPercent={setStartPositionPercent}
      />
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {/* Ladeindikator */}
        <LoadingModal 
          isOpen={loading}
          progress={loadingProgress}
          currentSong={currentLoadingSong}
          totalSongs={totalSongsToLoad}
          currentIndex={currentSongIndex}
        />
        
        <header className="bg-white/70 backdrop-blur-lg p-5 shadow-sm ring-1 ring-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <TrackWerkLogo className="h-10 w-auto mr-3 text-gray-800" />
              <h1 className="text-2xl font-semibold text-gray-900">TrackWerk</h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => generateWaveformsForSongs(songs)}
                variant="outline"
                className="text-gray-700 border-gray-300 hover:bg-gray-100 rounded-full px-5"
                disabled={generatingWaveforms || songs.length === 0}
              >
                <AudioWaveform 
                  className="h-4 w-4 mr-2" 
                  size={16} 
                  strokeWidth={2}
                  color="currentColor"
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                /> 
                {t('generateWaveforms')}
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="text-gray-700 border-gray-300 hover:bg-gray-100 rounded-full px-5"
              >
                <Settings className="h-4 w-4 mr-2" /> {t('settings')}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative">
              <div className="flex items-center bg-white rounded-full px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-gray-400 focus-within:border-transparent transition-all duration-200">
                <Search className="h-5 w-5 text-gray-500 mr-2" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    filterSongs(e.target.value, 'all');
                  }}
                  className="flex-1 border-none focus:outline-none bg-transparent text-gray-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className={`
                    cursor-pointer
                    ${tags.includes(tag) 
                      ? 'bg-gray-900 text-white hover:bg-gray-800' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}
                    rounded-full px-3 py-1
                  `}
                  onClick={() => {
                    setTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag) 
                        : [...prev, tag]
                    )
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-gray-100 rounded-full p-1 mb-6">
                <TabsTrigger 
                  value="all" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-5"
                >
                  {t('allTab')}
                </TabsTrigger>
                <TabsTrigger 
                  value="recent" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-5"
                >
                  {t('recentTab')}
                </TabsTrigger>
                <TabsTrigger 
                  value="favs" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-5"
                >
                  {t('favsTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('allTab')}</h2>
                {filtered.length > 0 ? (
                  <SongList 
                    songs={filtered}
                    currentSong={current}
                    isPlaying={playing}
                    onPlay={playSong}
                    favorites={favs}
                    onToggleFavorite={toggleFavorite}
                    onAddTag={addTagToSong}
                    onRemoveTag={removeTagFromSong}
                    onGenerateWaveform={generateWaveformsForSongs}
                    availableTags={availableTags}
                    progress={progress}
                    duration={duration}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-4 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <p className="text-center text-gray-700 font-normal text-lg">
                      {musicLibraryPath ? t('noSongsFound') : t('setMusicLibraryPrompt')}
                    </p>
                    <Button 
                      onClick={() => setShowSettings(true)}
                      variant="outline"
                      className="bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-full px-6"
                    >
                      {t('openSettings')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('recentTab')}</h2>
                {recent.length > 0 ? (
                  <SongList 
                    songs={recent}
                    currentSong={current}
                    isPlaying={playing}
                    onPlay={playSong}
                    favorites={favs}
                    onToggleFavorite={toggleFavorite}
                    onAddTag={addTagToSong}
                    onRemoveTag={removeTagFromSong}
                    onGenerateWaveform={generateWaveformsForSongs}
                    availableTags={availableTags}
                    progress={progress}
                    duration={duration}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <p className="text-center text-gray-700 font-normal text-lg">{t('noRecentSongs')}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favs">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('favsTab')}</h2>
                {favs.length > 0 ? (
                  <SongList 
                    songs={favs}
                    currentSong={current}
                    isPlaying={playing}
                    onPlay={playSong}
                    favorites={favs}
                    onToggleFavorite={toggleFavorite}
                    onAddTag={addTagToSong}
                    onRemoveTag={removeTagFromSong}
                    onGenerateWaveform={generateWaveformsForSongs}
                    availableTags={availableTags}
                    progress={progress}
                    duration={duration}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <p className="text-center text-gray-700 font-normal text-lg">{t('noFavoriteSongs')}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Audio-Player (nur anzeigen, wenn ein Song ausgewählt ist) */}
        {current && (
          <div className="fixed bottom-0 left-0 right-0 z-10">
            <AudioPlayer
              currentSong={current}
              isPlaying={playing}
              volume={volume}
              progress={progress}
              duration={duration}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onVolumeChange={handleVolumeChange}
              onSeek={handleSeek}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </div>
        )}

        <footer className="p-4 border-t border-gray-200 bg-white/80 backdrop-blur-md text-center text-gray-600">
          {t('copyright')} &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </DndProvider>
  );
}
