import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { useDrag } from 'react-dnd';

export default function SongList({ 
  songs, 
  currentSong, 
  isPlaying, 
  onPlay, 
  favorites, 
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  availableTags = []
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          currentSong={currentSong}
          isPlaying={isPlaying}
          isFavorite={favorites.some(f => f.id === song.id)}
          onPlay={onPlay}
          onToggleFavorite={onToggleFavorite}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          availableTags={availableTags}
        />
      ))}
    </div>
  );
}

function SongCard({ 
  song, 
  currentSong, 
  isPlaying, 
  isFavorite, 
  onPlay, 
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  availableTags
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'SONG',
    item: { song },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [customTag, setCustomTag] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);

  return (
    <motion.div 
      ref={drag}
      layout 
      whileHover={{ scale: 1.02 }} 
      whileTap={{ scale: 0.98 }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Card className={`${currentSong?.id === song.id ? 'border-blue-500' : ''}`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <CardTitle className="truncate">{song.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(song.id)}
            className="h-8 w-8 text-gray-700"
          >
            {isFavorite ? <HeartFilledIcon /> : <HeartIcon />}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-2">{song.artist}</p>
          <div className="flex flex-wrap gap-1">
            {song.tags.map(tag => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs group flex items-center gap-1 bg-transparent"
              >
                {tag}
                <button 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveTag(song.id, tag)}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-5 w-5 rounded-full p-0 text-xs bg-transparent"
                onClick={() => setShowTagMenu(!showTagMenu)}
              >
                <PlusIcon className="h-3 w-3" />
              </Button>
              
              {showTagMenu && (
                <div className="absolute z-50 mt-1 w-60 rounded-md border bg-white p-2 shadow-md">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Add Tags</h4>
                    
                    {availableTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {availableTags
                          .filter(tag => !song.tags.includes(tag))
                          .map(tag => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="cursor-pointer bg-transparent hover:bg-gray-100"
                              onClick={() => {
                                onAddTag(song.id, tag);
                                setShowTagMenu(false);
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder="Custom tag..."
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <Button 
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => {
                          if (customTag.trim()) {
                            onAddTag(song.id, customTag.trim());
                            setCustomTag('');
                            setShowTagMenu(false);
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => onPlay(song)}
            variant={currentSong?.id === song.id && isPlaying ? 'default' : 'outline'}
            className="w-full bg-transparent hover:bg-gray-100"
          >
            {currentSong?.id === song.id && isPlaying ? 'Now Playing' : 'Play'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Icon components
function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function HeartFilledIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
} 