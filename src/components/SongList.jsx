import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { useDrag } from 'react-dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { Waveform } from './ui/Waveform';
import { decompressWaveform, getOrCreateWaveform, drawWaveform } from '../utils/waveformGenerator';
import { Icon } from './ui/icon';

// Konstante für die Virtualisierung
const SONG_ROW_HEIGHT = 100; // Geschätzte Höhe einer Zeile in Pixeln
const BUFFER_ITEMS = 5; // Zusätzliche Elemente über/unter dem sichtbaren Bereich

export default function SongList({ 
  songs, 
  currentSong, 
  isPlaying, 
  onPlay, 
  favorites, 
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  onGenerateWaveform,
  availableTags = [],
  progress = 0,
  duration = 0
}) {
  const { t } = useLanguage();
  
  // State für Virtualisierung
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef(null);
  
  // Formatierung der Zeit in mm:ss
  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

  // Formatierung des Datums
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('de-DE', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return "";
    }
  }, []);

  // Generiere Placeholder für Album-Cover - Memoized für bessere Performance
  const getAlbumCoverPlaceholder = useCallback((song) => {
    const initials = ((song.artist?.[0] || '') + (song.name?.[0] || '')).toUpperCase();
    // Zufällige Hintergrundfarbe basierend auf dem Song-Namen
    const hue = song.name ? song.name.charCodeAt(0) % 360 : 200;
    return (
      <div 
        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: `hsl(${hue}, 70%, 60%)` }}
      >
        {initials}
      </div>
    );
  }, []);
  
  // Scroll-Handler für Virtualisierung
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    setScrollPosition(scrollTop);
    
    // Berechne den sichtbaren Bereich basierend auf der Scroll-Position
    const visibleStart = Math.floor(scrollTop / SONG_ROW_HEIGHT);
    const visibleItems = Math.ceil(containerRef.current.clientHeight / SONG_ROW_HEIGHT);
    
    // Füge Buffer-Items hinzu, um flüssiges Scrollen zu ermöglichen
    const start = Math.max(0, visibleStart - BUFFER_ITEMS);
    const end = Math.min(songs.length, visibleStart + visibleItems + BUFFER_ITEMS);
    
    setVisibleRange({ start, end });
  }, [songs.length]);
  
  // Aktualisiere die Virtualisierung beim Mounting und wenn sich die Songs-Liste ändert
  useEffect(() => {
    if (!containerRef.current) return;
    
    setContainerHeight(songs.length * SONG_ROW_HEIGHT);
    handleScroll();
    
    // Event-Listener für Scrollen
    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    // Resize-Observer für Größenänderungen
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });
    
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [songs.length, handleScroll]);
  
  if (!songs || songs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-600">{t('noSongsFound')}</p>
      </div>
    );
  }

  // Memoized visible songs für bessere Performance
  const visibleSongs = useMemo(() => {
    return songs.slice(visibleRange.start, visibleRange.end);
  }, [songs, visibleRange]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
      {/* Tabellenkopf */}
      <div className="grid grid-cols-[auto_2fr_2fr_1fr_1fr_2fr_1fr] px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 sticky top-0 z-10">
        <div className="px-2"></div>
        <div className="px-2">{t('songName')}</div>
        <div className="px-2">{t('artist')}</div>
        <div className="px-2">{t('duration')}</div>
        <div className="px-2">{t('createdAt')}</div>
        <div className="px-2">{t('tags')}</div>
        <div className="px-2">{t('actions')}</div>
      </div>

      {/* Virtualisierte Songliste */}
      <div 
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight: '70vh' }}
      >
        {/* Container mit voller Höhe für den Scrollbar */}
        <div style={{ height: `${containerHeight}px`, position: 'relative' }}>
          {/* Nur die sichtbaren Elemente werden gerendert */}
          {visibleSongs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              currentSong={currentSong}
              isPlaying={isPlaying}
              isFavorite={favorites && favorites.some(f => f.id === song.id)}
              onPlay={onPlay}
              onToggleFavorite={onToggleFavorite}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onGenerateWaveform={onGenerateWaveform}
              availableTags={availableTags}
              formatDuration={formatDuration}
              formatDate={formatDate}
              getAlbumCoverPlaceholder={getAlbumCoverPlaceholder}
              progress={progress}
              duration={duration}
              style={{ 
                position: 'absolute', 
                top: `${(visibleRange.start + index) * SONG_ROW_HEIGHT}px`,
                width: '100%'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Optimierte SongRow-Komponente mit React.memo für weniger Re-Renderings
const SongRow = React.memo(function SongRow({ 
  song, 
  currentSong, 
  isPlaying, 
  isFavorite, 
  onPlay, 
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  onGenerateWaveform,
  availableTags,
  formatDuration,
  formatDate,
  getAlbumCoverPlaceholder,
  progress = 0,
  duration = 0,
  style = {}
}) {
  const { t } = useLanguage();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'SONG',
    item: { song },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [comment, setComment] = useState(song.comment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [waveformError, setWaveformError] = useState(false);
  const waveformRef = useRef(null); // Referenz für den Waveform-Container
  
  const isCurrentSong = currentSong && currentSong.id === song.id;

  // Speichere Kommentar wenn Bearbeitungsmodus verlassen wird
  useEffect(() => {
    if (!isEditing && comment !== song.comment) {
      // Hier würde die Funktion zum Speichern des Kommentars aufgerufen
      console.log(`Kommentar für Song ${song.id} gespeichert: ${comment}`);
    }
  }, [isEditing, comment, song]);

  // Wellenform-Daten dekomprimieren - nur einmal mit useMemo
  const waveformData = useMemo(() => {
    if (song.waveform) {
      try {
        return decompressWaveform(song.waveform);
      } catch (error) {
        console.error("Fehler beim Dekomprimieren der Wellenform:", error);
        setWaveformError(true);
        return [];
      }
    }
    return [];
  }, [song.waveform]); // Nur neu berechnen, wenn sich die Wellenform ändert

  // Berechne die aktuelle Position für die Waveform, falls dieser Song gerade abgespielt wird
  const waveformProgress = useMemo(() => {
    if (isCurrentSong && duration > 0) {
      return progress / duration;
    }
    return 0;
  }, [isCurrentSong, progress, duration]);

  // useEffect zur effizienten Steuerung des Waveform-Updates
  useEffect(() => {
    // Nur zeichnen wenn Daten und Container vorhanden sind
    if (waveformData.length > 0 && waveformRef.current) {
      // Cache-ID für diesen Song erstellen
      const cacheId = `song-${song.id}`;
      
      // Container-Dimensionen ermitteln
      const container = waveformRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || 32; // Fallback-Höhe
      
      // Waveform zeichnen mit dem neuen System
      drawWaveform({
        container,
        waveformData,
        cacheId,
        width: containerWidth,
        height: containerHeight,
        progress: waveformProgress,
        type: 'svg', // SVG-Renderer verwenden
        activeColor: '#2563EB',
        inactiveColor: 'rgba(107, 114, 128, 0.7)'
      });
    }
  }, [waveformData, waveformProgress, song.id]);

  // Direkt den Song abspielen, wenn auf die Zeile geklickt wird
  const handleRowClick = (e) => {
    // Verhindere das Abspielen, wenn auf bestimmte interaktive Elemente geklickt wird
    if (e.target.closest('.no-play-trigger')) {
      return;
    }
    
    // Löse die onPlay-Funktion aus
    if (onPlay) {
      onPlay(song);
    }
  };

  // Tag-Eingabe verarbeiten
  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTag.trim()) {
      onAddTag(song.id, newTag.trim());
      setNewTag('');
    }
  };

  // Funktion zum Generieren der Wellenform für diesen Song
  const handleGenerateWaveform = (e) => {
    e.stopPropagation(); // Verhindert, dass der Song abgespielt wird
    if (onGenerateWaveform) {
      onGenerateWaveform(song);
    }
  };

  // Optimierte Rendering-Entscheidung für die Waveform
  const renderWaveform = !!waveformData.length && (
    <div 
      ref={waveformRef}
      className="w-full h-8 rounded-md overflow-hidden mt-1" 
    />
  );

  return (
    <div 
      ref={drag}
      className={`grid grid-cols-[auto_2fr_2fr_1fr_1fr_2fr_1fr] px-4 py-3 ${
        isCurrentSong ? 'bg-blue-50' : isDragging ? 'opacity-50' : 'hover:bg-gray-50'
      } transition-colors duration-150 cursor-pointer`}
      onClick={handleRowClick}
      style={style}
    >
      {/* Album Cover */}
      <div className="px-2 flex items-center">
        {song.albumCover ? (
          <img 
            src={song.albumCover} 
            alt={song.album || t('unknownAlbum')} 
            className="w-10 h-10 rounded object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.appendChild(getAlbumCoverPlaceholder(song));
            }}
          />
        ) : getAlbumCoverPlaceholder(song)}
      </div>

      {/* Song Name */}
      <div className="px-2 flex items-center">
        <div className="flex flex-col w-full">
          <span className={`truncate font-medium ${isCurrentSong ? 'text-blue-700' : 'text-gray-900'}`}>
            {song.name || t('unknownTitle')}
          </span>
          <span className="text-xs text-gray-500">{song.album || ''}</span>
          
          {/* Waveform-Anzeige (wenn Daten vorhanden) */}
          {renderWaveform}
        </div>
      </div>

      {/* Artist */}
      <div className="px-2 flex items-center">
        <span className="truncate text-gray-700">{song.artist || t('unknownArtist')}</span>
      </div>

      {/* Duration */}
      <div className="px-2 flex items-center text-sm text-gray-600">
        {formatDuration(song.duration)}
      </div>

      {/* Creation Date */}
      <div className="px-2 flex items-center text-sm text-gray-600">
        {formatDate(song.createdAt)}
      </div>

      {/* Tags */}
      <div className="px-2 flex items-center overflow-hidden relative">
        <div className="flex flex-wrap gap-1 no-play-trigger">
          {song.tags && song.tags.map(tag => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs group flex items-center bg-gray-100 text-gray-700 border-gray-200 font-normal rounded-full px-2"
            >
              <span className="truncate max-w-20">{tag}</span>
              <button 
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag && onRemoveTag(song.id, tag);
                }}
              >
                <Icon name="close" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          <div className="relative no-play-trigger">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-5 w-5 rounded-full p-0 text-xs bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                setShowTagMenu(!showTagMenu);
              }}
            >
              <Icon name="add" className="h-3 w-3" />
            </Button>
            
            {showTagMenu && (
              <div className="absolute z-50 mt-1 w-48 rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm p-2 shadow-lg left-0 top-full">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {availableTags
                      .filter(tag => !song.tags?.includes(tag))
                      .map(tag => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="cursor-pointer bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 font-normal rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddTag && onAddTag(song.id, tag);
                            setShowTagMenu(false);
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={t('tagNamePlaceholder')}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-full text-gray-800 font-normal bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      onClick={(e) => e.stopPropagation()}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newTag.trim()) {
                          e.stopPropagation();
                          onAddTag && onAddTag(song.id, newTag.trim());
                          setNewTag('');
                          setShowTagMenu(false);
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      variant="outline"
                      className="bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-full font-normal h-6 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (newTag.trim()) {
                          onAddTag && onAddTag(song.id, newTag.trim());
                          setNewTag('');
                          setShowTagMenu(false);
                        }
                      }}
                    >
                      {t('addTagButton')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 flex items-center justify-end space-x-2 no-play-trigger">
        {!waveformData.length && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGenerateWaveform}
            className="h-8 w-8 no-play-trigger bg-gray-200 hover:bg-gray-300 text-gray-800"
            title={t('generatingWaveform')}
          >
            <Icon name="audioWaveform" className="h-4 w-4 text-gray-800" size={16} strokeWidth={2} color="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
            <Icon name="music" className="ml-1 h-4 w-4 text-gray-800" size={16} strokeWidth={2} color="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(song.id);
          }}
          className="h-8 w-8 no-play-trigger bg-gray-200 hover:bg-gray-300 text-gray-800"
          title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
          {isFavorite ? (
            <Icon name="heart" className="h-4 w-4 text-red-500 fill-current" />
          ) : (
            <Icon name="heart" className="h-4 w-4 text-gray-800" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setShowTagMenu(!showTagMenu);
          }}
          className="h-8 w-8 no-play-trigger bg-gray-200 hover:bg-gray-300 text-gray-800"
          title={t('addTagToSong')}
        >
          <Icon name="tag" className="h-4 w-4 text-gray-800" />
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function für React.memo
  // Nur neu rendern, wenn sich wichtige Props ändern
  return (
    prevProps.song.id === nextProps.song.id &&
    prevProps.isCurrentSong === nextProps.isCurrentSong &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isFavorite === nextProps.isFavorite &&
    (prevProps.isCurrentSong ? prevProps.progress === nextProps.progress : true)
  );
}); 