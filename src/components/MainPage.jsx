import { useState, useEffect } from 'react';
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

// Simple function to generate unique IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export default function MainPage() {
  const [songs, setSongs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState([]);
  const [current, setCurrent] = useState(null);
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recent, setRecent] = useState([]);
  const [favs, setFavs] = useState([]);
  const [musicLibraryPath, setMusicLibraryPath] = useState(localStorage.getItem('musicLibraryPath') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

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

  // Load saved data
  useEffect(() => {
    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) {
      setFavs(JSON.parse(savedFavs));
    }
    
    const savedRecent = localStorage.getItem('recentlyPlayed');
    if (savedRecent) {
      setRecent(JSON.parse(savedRecent));
    }
    
    const savedTags = localStorage.getItem('availableTags');
    if (savedTags) {
      setAvailableTags(JSON.parse(savedTags));
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favs));
  }, [favs]);
  
  useEffect(() => {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recent));
  }, [recent]);
  
  useEffect(() => {
    localStorage.setItem('availableTags', JSON.stringify(availableTags));
  }, [availableTags]);

  const loadSongs = async () => {
    try {
      if (!musicLibraryPath) return;
      
      localStorage.setItem('musicLibraryPath', musicLibraryPath);
      
      const files = await window.api.listSongs(musicLibraryPath);
      
      const songList = files.map(file => {
        // Extract filename without extension
        const name = file.replace(/\.[^/.]+$/, "");
        
        return {
          id: generateId(),
          name: name,
          artist: 'Unknown',
          album: '',
          path: `${musicLibraryPath}/${file}`,
          tags: []
        };
      });
      
      setSongs(songList);
      setFiltered(songList);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const play = (song) => {
    sound?.stop();
    const h = new Howl({
      src: [song.path],
      volume,
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false),
      onstop: () => setPlaying(false),
      onend: () => setPlaying(false),
      onload: () => setDuration(h.duration())
    });
    h.play();
    setSound(h);
    setCurrent(song);
    setRecent(prev => [song, ...prev.filter(x => x.id !== song.id)].slice(0, 10));
  };

  const toggleFavorite = (songId) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    
    setFavs(prev => 
      prev.some(f => f.id === songId)
        ? prev.filter(f => f.id !== songId)
        : [...prev, song]
    );
  };

  const addTagToSong = (songId, tag) => {
    // Add to available tags if not already there
    if (!availableTags.includes(tag)) {
      setAvailableTags(prev => [...prev, tag]);
    }
    
    setSongs(prev => prev.map(song => 
      song.id === songId && !song.tags.includes(tag)
        ? { ...song, tags: [...song.tags, tag] }
        : song
    ));
  };

  const removeTagFromSong = (songId, tag) => {
    setSongs(prev => prev.map(song => 
      song.id === songId
        ? { ...song, tags: song.tags.filter(t => t !== tag) }
        : song
    ));
  };

  const addNewTag = () => {
    const tag = prompt('Enter a new tag:');
    if (tag && tag.trim() !== '' && !availableTags.includes(tag.trim())) {
      setAvailableTags(prev => [...prev, tag.trim()]);
    }
  };

  const removeTag = (tag) => {
    setAvailableTags(prev => prev.filter(t => t !== tag));
    setTags(prev => prev.filter(t => t !== tag));
    
    // Remove this tag from all songs
    setSongs(prev => prev.map(song => ({
      ...song,
      tags: song.tags.filter(t => t !== tag)
    })));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
        <main className="flex-1 overflow-auto p-6">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">TrackWerk</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="text-gray-700"
            >
              <SettingsIcon />
            </Button>
          </header>

          <motion.div layout className="mb-4">
            <Input
              placeholder="Search songs..."
              className="w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </motion.div>

          {isSettingsOpen && (
            <div className="p-6 border rounded-md mb-6 bg-white shadow-md">
              <h3 className="text-xl font-medium mb-4">Settings</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Music Library Path</label>
                <div className="flex gap-2">
                  <Input 
                    value={musicLibraryPath}
                    onChange={(e) => setMusicLibraryPath(e.target.value)}
                    className="flex-1"
                    placeholder="Enter path to your music folder"
                  />
                  <Button 
                    onClick={loadSongs}
                    variant="outline"
                    className="bg-transparent hover:bg-gray-100"
                  >
                    Load
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Available Tags</label>
                  <Button 
                    onClick={addNewTag} 
                    size="sm"
                    variant="outline"
                    className="bg-transparent hover:bg-gray-100"
                  >
                    Add Tag
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {availableTags.length > 0 ? (
                    availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="flex items-center gap-1 bg-transparent"
                      >
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tags defined yet. Add some tags to organize your music.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {availableTags.length > 0 && (
            <motion.div layout className="flex flex-wrap gap-2 mb-4">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  onClick={() =>
                    setTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )
                  }
                  className="cursor-pointer bg-transparent hover:bg-gray-100"
                >
                  {tag}
                </Badge>
              ))}
            </motion.div>
          )}

          <Tabs defaultValue="all">
            <TabsList className="bg-transparent border">
              <TabsTrigger value="all" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none">All</TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none">Recent</TabsTrigger>
              <TabsTrigger value="favs" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none">Favorites</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {filtered.length > 0 ? (
                <SongList 
                  songs={filtered}
                  currentSong={current}
                  isPlaying={playing}
                  onPlay={play}
                  favorites={favs}
                  onToggleFavorite={toggleFavorite}
                  onAddTag={addTagToSong}
                  onRemoveTag={removeTagFromSong}
                  availableTags={availableTags}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <p className="text-center text-gray-500">
                    {musicLibraryPath ? 'No songs found in the selected directory' : 'Please set your music library path in settings'}
                  </p>
                  <Button 
                    onClick={() => setIsSettingsOpen(true)}
                    variant="outline"
                    className="bg-transparent hover:bg-gray-100"
                  >
                    Open Settings
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="recent">
              {recent.length > 0 ? (
                <SongList 
                  songs={recent}
                  currentSong={current}
                  isPlaying={playing}
                  onPlay={play}
                  favorites={favs}
                  onToggleFavorite={toggleFavorite}
                  onAddTag={addTagToSong}
                  onRemoveTag={removeTagFromSong}
                  availableTags={availableTags}
                />
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-center text-gray-500">No recently played songs</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="favs">
              {favs.length > 0 ? (
                <SongList 
                  songs={favs}
                  currentSong={current}
                  isPlaying={playing}
                  onPlay={play}
                  favorites={favs}
                  onToggleFavorite={toggleFavorite}
                  onAddTag={addTagToSong}
                  onRemoveTag={removeTagFromSong}
                  availableTags={availableTags}
                />
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-center text-gray-500">No favorite songs</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        <footer className="p-4 border-t bg-white">
          {current && (
            <div className="space-y-2">
              <Slider
                value={[progress]}
                max={duration}
                step={0.1}
                onValueChange={([v]) => { sound?.seek(v); setProgress(v); }}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{current.name}</p>
                  <p className="text-sm text-gray-500">{current.artist}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button onClick={() => sound?.stop()} variant="ghost" size="icon" className="text-gray-700">
                    <StopIcon />
                  </Button>
                  <Button onClick={() => playing ? sound?.pause() : sound?.play()} size="icon" variant="ghost" className="text-gray-700">
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <div className="w-32 flex items-center">
                    <Slider
                      value={[volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={([v]) => { setVolume(v/100); sound?.volume(v/100); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </footer>
      </div>
    </DndProvider>
  );
}

// Icon components
function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
