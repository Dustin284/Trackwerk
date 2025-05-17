import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import TrackWerkLogo from '../assets/logo';
import { useLanguage } from '../i18n/LanguageContext';
import { languageNames } from '../i18n/translations';

export default function SettingsPage({ 
  musicLibraryPath, 
  setMusicLibraryPath,
  loadSongs,
  availableTags = [],
  setAvailableTags,
  removeTagFromAllSongs,
  onBackToMain,
  onExportData,
  onImportData,
  onClearAllSongs,
  startPositionPercent = 0,
  setStartPositionPercent
}) {
  const { t, language, changeLanguage } = useLanguage();
  const [newTagName, setNewTagName] = useState('');
  const fileInputRef = useRef(null);
  const directoryInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(false);
  
  // Konvertiere bestehenden einzelnen Pfad in ein Array von Pfaden
  const [musicPaths, setMusicPaths] = useState(() => {
    return musicLibraryPath ? musicLibraryPath.split(';').filter(path => path.trim() !== '') : [];
  });
  
  // Unterordner-Einstellungen für jeden Pfad
  const [pathSettings, setPathSettings] = useState(() => {
    const settings = {};
    if (musicLibraryPath) {
      musicLibraryPath.split(';')
        .filter(path => path.trim() !== '')
        .forEach(path => {
          // Prüfe, ob der Pfad mit "[sub]" beginnt (altes Format)
          if (path.startsWith("[sub]")) {
            settings[path.substring(5)] = { includeSubdirectories: true };
          } else {
            settings[path] = { includeSubdirectories: false };
          }
        });
    }
    return settings;
  });

  // Synchronisiere das musicPaths-Array mit dem musicLibraryPath-String
  useEffect(() => {
    // Format: path1;path2;[sub]path3;path4
    // (paths mit [sub] Prefix bedeuten, dass Unterordner eingeschlossen werden sollen)
    const formattedPaths = musicPaths.map(path => {
      const settings = pathSettings[path] || { includeSubdirectories: false };
      return settings.includeSubdirectories ? `[sub]${path}` : path;
    }).join(';');
    
    setMusicLibraryPath(formattedPaths);
  }, [musicPaths, pathSettings, setMusicLibraryPath]);

  // Verwalte Drag-and-Drop-Events für die Drop-Zone
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Prüfen, ob wir wirklich die Zone verlassen haben, nicht nur ein Kindelement
      const rect = dropZone.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (
        x <= rect.left || 
        x >= rect.right || 
        y <= rect.top || 
        y >= rect.bottom
      ) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // In Electron werden die Dateien mit ihren vollen Pfaden geliefert
      const files = e.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Wir können direkt auf die Systemattribute zugreifen
        if (file.path) {
          addMusicPath(file.path, { includeSubdirectories });
        }
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragenter', handleDragEnter);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, []);

  const addNewTag = () => {
    if (newTagName && newTagName.trim() !== '' && !availableTags.includes(newTagName.trim())) {
      setAvailableTags(prev => [...prev, newTagName.trim()]);
      setNewTagName('');
    }
  };

  const removeTag = (tag) => {
    setAvailableTags(prev => prev.filter(t => t !== tag));
    removeTagFromAllSongs(tag);
  };

  const addMusicPath = (path, options = {}) => {
    if (path && !musicPaths.includes(path)) {
      setMusicPaths(prev => [...prev, path]);
      setPathSettings(prev => ({
        ...prev,
        [path]: { 
          includeSubdirectories: options.includeSubdirectories || false 
        }
      }));
    }
  };

  const removeMusicPath = (pathToRemove) => {
    setMusicPaths(prev => prev.filter(path => path !== pathToRemove));
    setPathSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[pathToRemove];
      return newSettings;
    });
  };

  const toggleSubdirectories = (path) => {
    setPathSettings(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        includeSubdirectories: prev[path] ? !prev[path].includeSubdirectories : true
      }
    }));
  };

  const browseMusicFolder = async () => {
    try {
      // Hier würden wir normalerweise den nativen Datei-Dialog aufrufen
      // Da wir in Electron sind, können wir eine Nachricht an den Hauptprozess senden
      const result = await window.api.selectDirectory({
        includeSubdirectories
      });
      
      if (result && result.path) {
        addMusicPath(result.path, { 
          includeSubdirectories: includeSubdirectories 
        });
      }
    } catch (error) {
      console.error('Fehler beim Öffnen des Datei-Dialogs:', error);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target.result;
        onImportData(jsonData);
        alert(t('importSuccess'));
      } catch (error) {
        console.error('Fehler beim Importieren:', error);
        alert(t('importError'));
      }
    };
    reader.readAsText(file);
    
    // Reset the file input value
    event.target.value = '';
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <header className="bg-white/70 backdrop-blur-lg p-5 shadow-sm ring-1 ring-gray-200/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <TrackWerkLogo className="h-10 w-auto mr-3 text-gray-800" />
            <h1 className="text-2xl font-semibold text-gray-900">{t('settingsTitle')}</h1>
          </div>
          <Button
            onClick={onBackToMain}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100 rounded-full px-5"
          >
            {t('backToMusic')}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <SettingsCard title={t('musicLibrary')}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700">{t('musicLibraryPaths')}</label>
              
              <div 
                ref={dropZoneRef}
                className={`border-2 border-dashed rounded-xl p-4 ${isDragging ? 'border-gray-500 bg-gray-50' : 'border-gray-200'} transition-colors duration-200 mb-3`}
              >
                <div className="mb-3 flex flex-col gap-3">
                  {musicPaths.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {musicPaths.map((path, index) => (
                        <div 
                          key={index} 
                          className="flex flex-col border-b border-gray-100 last:border-0 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3">
                            <p className="text-sm text-gray-800 truncate flex-1 font-mono">{path}</p>
                            <div className="flex items-center">
                              <label className="flex items-center mr-3 cursor-pointer text-sm text-gray-700">
                                <input 
                                  type="checkbox" 
                                  className="mr-1 h-4 w-4"
                                  checked={pathSettings[path]?.includeSubdirectories || false} 
                                  onChange={() => toggleSubdirectories(path)}
                                />
                                {t('includeSubdirectories')}
                              </label>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMusicPath(path)}
                                className="h-7 w-7 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full ml-2"
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {pathSettings[path]?.includeSubdirectories && (
                            <div className="bg-blue-50 py-1 px-3 text-xs text-blue-700">
                              {t('subdirectoriesIncluded')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FolderLargeIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium mb-1">{t('dragFoldersHere')}</p>
                      <p className="text-sm text-gray-500">{t('noMusicPathsAdded')}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-col sm:flex-row">
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={browseMusicFolder} 
                      variant="outline"
                      className="bg-white text-gray-700 border-gray-300 hover:bg-gray-100 rounded-lg"
                    >
                      <FolderIcon className="h-4 w-4 mr-2" /> 
                      {t('browseFolderButton')}
                    </Button>
                    
                    <label className="flex items-center cursor-pointer text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        className="mr-1 h-4 w-4"
                        checked={includeSubdirectories} 
                        onChange={(e) => setIncludeSubdirectories(e.target.checked)}
                      />
                      {t('includeSubdirectories')}
                    </label>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Input 
                      placeholder={t('manuallyAddPath')}
                      className="w-full border-gray-300 rounded-lg text-gray-800 focus:ring-1 focus:ring-gray-400 pr-16"
                      onKeyPress={e => e.key === 'Enter' && e.target.value.trim() && (addMusicPath(e.target.value.trim(), { includeSubdirectories }), e.target.value = '')}
                    />
                    <Button 
                      onClick={(e) => {
                        const input = e.currentTarget.previousSibling;
                        if (input.value.trim()) {
                          addMusicPath(input.value.trim(), { includeSubdirectories });
                          input.value = '';
                        }
                      }}
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-sm px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      {t('addButton')}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={loadSongs}
                  variant="default"
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                  disabled={musicPaths.length === 0}
                >
                  {t('loadSongsButton')}
                </Button>
              </div>
              
              <p className="mt-2 text-sm text-gray-600">
                {t('musicPathsDescription')}
              </p>
            </div>
          </SettingsCard>

          <SettingsCard title={t('languageSettings')}>
            <div className="mb-6">
              <p className="mb-3 text-sm text-gray-600">{t('chooseLanguage')}</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(languageNames).map((langCode) => (
                  <Button
                    key={langCode}
                    variant={language === langCode ? "default" : "outline"}
                    className={
                      language === langCode
                        ? "bg-gray-900 hover:bg-gray-800 text-white rounded-full px-5"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 rounded-full px-5"
                    }
                    onClick={() => changeLanguage(langCode)}
                  >
                    {languageNames[langCode]}
                  </Button>
                ))}
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title={t('tagManagement')}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">{t('addNewTag')}</label>
              <div className="flex gap-2">
                <Input 
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 border-gray-300 rounded-lg text-gray-800 focus:ring-1 focus:ring-gray-400"
                  placeholder={t('tagNamePlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && addNewTag()}
                />
                <Button 
                  onClick={addNewTag}
                  variant="default"
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                  disabled={!newTagName.trim()}
                >
                  {t('addTagButton')}
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">{t('availableTags')}</label>
              <div className="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-gray-200 min-h-[100px]">
                {availableTags.length > 0 ? (
                  availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="flex items-center gap-1 bg-gray-100 text-gray-700 border-gray-200 text-sm font-normal rounded-full px-3 py-1"
                    >
                      {tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-500 hover:text-red-500"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm font-normal text-gray-500 w-full text-center py-4">
                    {t('noTagsDefinedYet')}
                  </p>
                )}
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title={t('dataManagement')}>
            <p className="text-gray-700 mb-4">{t('exportDataDescription')}</p>
            <Button 
              onClick={onExportData}
              className="bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-full"
            >
              {t('exportDataButton')}
            </Button>
            
            <div className="border-t border-gray-200 my-4 pt-4">
              <p className="text-gray-700 mb-4">{t('importDataDescription')}</p>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <Button 
                onClick={handleImportClick}
                className="bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-full"
              >
                {t('importDataButton')}
              </Button>
            </div>
            
            <div className="border-t border-gray-200 my-4 pt-4">
              <p className="text-gray-700 mb-4">{t('clearAllSongsDescription')}</p>
              <Button 
                onClick={() => {
                  if (window.confirm(t('clearAllSongsConfirm'))) {
                    onClearAllSongs();
                  }
                }}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-full"
              >
                {t('clearAllSongsButton')}
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard title={t('playbackSettings') || "Wiedergabe-Einstellungen"}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                {t('startPositionLabel') || "Song bei % starten"}
              </label>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={startPositionPercent}
                    onChange={(e) => setStartPositionPercent(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="ml-4 text-lg font-semibold text-gray-800 min-w-[3rem] text-right">
                    {startPositionPercent}%
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                {t('startPositionDescription') || "Legt fest, bei wie viel Prozent der Gesamtlänge Songs standardmäßig starten sollen."}
              </p>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex">
                  <div className="text-blue-600 mr-2">
                    <InfoIcon />
                  </div>
                  <p className="text-sm text-blue-700">
                    {t('startPositionInfo') || "Ein Wert von 0% spielt Songs vom Anfang ab. Höhere Werte können nützlich sein, um Intros zu überspringen."}
                  </p>
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>
      </main>

      <footer className="p-4 border-t border-gray-200 bg-white/80 backdrop-blur-md text-center text-gray-600">
        {t('copyright')} &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{title}</h2>
      {children}
    </div>
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

function FolderIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FolderLargeIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
} 