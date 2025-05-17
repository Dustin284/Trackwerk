// Translations for TrackWerk App
export const translations = {
  de: {
    // Allgemein
    appName: "TrackWerk",
    settings: "Einstellungen",
    backToMusic: "Zurück zur Musik",
    
    // MainPage
    searchPlaceholder: "Lieder suchen...",
    noSongsFound: "Keine Lieder im ausgewählten Verzeichnis gefunden",
    setMusicLibraryPrompt: "Bitte lege den Pfad zu deiner Musikbibliothek in den Einstellungen fest",
    openSettings: "Einstellungen öffnen",
    noRecentSongs: "Keine kürzlich abgespielten Lieder",
    noFavoriteSongs: "Keine Lieblingslieder",
    artist: "Unbekannt",
    
    // SongList
    play: "Abspielen",
    nowPlaying: "Spielt gerade",
    addTagToSong: "Tag hinzufügen",
    unknownTitle: "Unbekannter Titel",
    unknownArtist: "Unbekannter Künstler",
    songName: "Titel",
    duration: "Länge",
    createdAt: "Erstellt am",
    actions: "Aktionen",
    comment: "Kommentar",
    addComment: "Kommentar hinzufügen",
    saveButton: "Speichern",
    unknownAlbum: "Unbekanntes Album",
    
    // Tabs
    allTab: "Alle",
    recentTab: "Kürzlich",
    favsTab: "Favoriten",
    
    // SettingsPage
    settingsTitle: "TrackWerk Einstellungen",
    musicLibrary: "Musikbibliothek",
    musicLibraryPath: "Musikbibliothek-Pfad",
    musicLibraryPaths: "Musikbibliothek-Pfade",
    musicPathPlaceholder: "Gib den Pfad zu deinem Musikordner ein",
    manuallyAddPath: "Pfad manuell eingeben...",
    loadButton: "Laden",
    loadSongsButton: "Songs laden",
    musicPathDescription: "Gib den vollständigen Pfad zum Ordner an, der deine Musikdateien enthält.",
    musicPathsDescription: "Füge einen oder mehrere Ordnerpfade hinzu, die deine Musikdateien enthalten.",
    noMusicPathsAdded: "Noch keine Musikpfade hinzugefügt. Füge mindestens einen Pfad hinzu.",
    browseFolderButton: "Ordner durchsuchen",
    addButton: "Hinzufügen",
    dragFoldersHere: "Ordner hierher ziehen",
    includeSubdirectories: "Unterordner einbeziehen",
    subdirectoriesIncluded: "Einschließlich aller Unterordner",
    
    // Tag Management
    tagManagement: "Tag-Verwaltung",
    addNewTag: "Neuen Tag hinzufügen",
    tagNamePlaceholder: "Tag-Namen eingeben",
    addTagButton: "Tag hinzufügen",
    availableTags: "Verfügbare Tags",
    noTagsDefinedYet: "Noch keine Tags definiert. Füge einige Tags hinzu, um deine Musik zu organisieren.",
    
    // Data Management
    dataManagement: "Daten-Verwaltung",
    exportDataDescription: "Sichere deine TrackWerk-Daten (Songs, Tags, Favoriten, etc.) als JSON-Datei.",
    exportDataButton: "Daten exportieren",
    importDataDescription: "Lade deine gesicherten TrackWerk-Daten aus einer JSON-Datei.",
    importDataButton: "Daten importieren",
    importSuccess: "Daten erfolgreich importiert!",
    importError: "Beim Importieren der Daten ist ein Fehler aufgetreten.",
    
    // Songs löschen
    clearAllSongsDescription: "Entferne alle importierten Songs aus der Bibliothek (dies löscht keine Dateien von der Festplatte).",
    clearAllSongsButton: "Alle Songs entfernen",
    clearAllSongsConfirm: "Bist du sicher, dass du alle Songs aus der Bibliothek entfernen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.",
    clearAllSongsSuccess: "Alle Songs wurden erfolgreich entfernt.",
    
    // Language Settings
    languageSettings: "Spracheinstellungen",
    chooseLanguage: "Wähle deine Sprache",
    language: "Sprache",
    
    // Footer
    copyright: "TrackWerk Music Player",
    
    // Ladeindikator und Wellenform
    loadingSongs: "Songs werden geladen",
    processingSongsMessage: "Verarbeite Song {{current}} von {{total}}",
    currentlyProcessing: "Aktuell wird verarbeitet:",
    generatingWaveform: "Generiere Wellenform",
    loadingComplete: "Laden abgeschlossen",
    waveformGenerationSuccess: "Wellenformen erfolgreich generiert",
    waveformNotAvailable: "Keine Wellenform verfügbar",
    analyzingAudio: "Analysiere Audio",
    processingProgress: "Fortschritt: {{percentage}}%",
    scanningFolders: "Durchsuche Ordner...",
    
    // Neue Übersetzungen für Waveform-Generierung
    generateWaveforms: "Wellenformen generieren",
    noSongsToGenerateWaveforms: "Keine Songs zum Generieren von Wellenformen verfügbar",
    preparingWaveformGeneration: "Wellenform-Generierung wird vorbereitet",
    waveformGenerationComplete: "Wellenform-Generierung abgeschlossen für {{count}} Songs",
    waveformGenerationError: "Fehler bei der Wellenform-Generierung: {{error}}",
    
    // Fügen Sie neue Übersetzungen für den Ladevorgang hinzu
    loadingLibrary: "Musikbibliothek wird geladen",
    preparingLibrary: "Musikbibliothek wird vorbereitet",
    preparingFiles: "Dateien werden vorbereitet",
    scanningDirectory: "Verzeichnis wird durchsucht",
    processingStatus: "Verarbeitungsstatus",
    waitingForProcess: "Warte auf Start der Verarbeitung...",
    loadingHint: "Dies kann je nach Größe der Bibliothek einige Zeit dauern. Wellenformen werden für alle Songs generiert.",
    showDetails: "Details anzeigen",
    hideDetails: "Details verbergen",
    songs: "Lieder"
  },
  
  en: {
    // General
    appName: "TrackWerk",
    settings: "Settings",
    backToMusic: "Back to Music",
    
    // MainPage
    searchPlaceholder: "Search songs...",
    noSongsFound: "No songs found in the selected directory",
    setMusicLibraryPrompt: "Please set your music library path in settings",
    openSettings: "Open Settings",
    noRecentSongs: "No recently played songs",
    noFavoriteSongs: "No favorite songs",
    artist: "Unknown",
    
    // SongList
    play: "Play",
    nowPlaying: "Now Playing",
    addTagToSong: "Add Tag",
    unknownTitle: "Unknown Title",
    unknownArtist: "Unknown Artist",
    songName: "Title",
    duration: "Length",
    createdAt: "Created at",
    actions: "Actions",
    comment: "Comment",
    addComment: "Add comment",
    saveButton: "Save",
    unknownAlbum: "Unknown Album",
    
    // Tabs
    allTab: "All",
    recentTab: "Recent",
    favsTab: "Favorites",
    
    // SettingsPage
    settingsTitle: "TrackWerk Settings",
    musicLibrary: "Music Library",
    musicLibraryPath: "Music Library Path",
    musicLibraryPaths: "Music Library Paths",
    musicPathPlaceholder: "Enter path to your music folder",
    manuallyAddPath: "Enter path manually...",
    loadButton: "Load",
    loadSongsButton: "Load Songs",
    musicPathDescription: "Enter the full path to the folder containing your music files.",
    musicPathsDescription: "Add one or more folder paths containing your music files.",
    noMusicPathsAdded: "No music paths added yet. Please add at least one path.",
    browseFolderButton: "Browse Folder",
    addButton: "Add",
    dragFoldersHere: "Drag folders here",
    includeSubdirectories: "Include subdirectories",
    subdirectoriesIncluded: "Including all subdirectories",
    
    // Tag Management
    tagManagement: "Tag Management",
    addNewTag: "Add New Tag",
    tagNamePlaceholder: "Enter tag name",
    addTagButton: "Add Tag",
    availableTags: "Available Tags",
    noTagsDefinedYet: "No tags defined yet. Add some tags to organize your music.",
    
    // Data Management
    dataManagement: "Data Management",
    exportDataDescription: "Save your TrackWerk data (songs, tags, favorites, etc.) as a JSON file.",
    exportDataButton: "Export Data",
    importDataDescription: "Load your saved TrackWerk data from a JSON file.",
    importDataButton: "Import Data",
    importSuccess: "Data successfully imported!",
    importError: "An error occurred while importing the data.",
    
    // Songs löschen
    clearAllSongsDescription: "Remove all imported songs from the library (this does not delete any files from your disk).",
    clearAllSongsButton: "Clear All Songs",
    clearAllSongsConfirm: "Are you sure you want to remove all songs from the library? This action cannot be undone.",
    clearAllSongsSuccess: "All songs have been successfully removed.",
    
    // Language Settings
    languageSettings: "Language Settings",
    chooseLanguage: "Choose your language",
    language: "Language",
    
    // Footer
    copyright: "TrackWerk Music Player",
    
    // Loading Indicator and Waveform
    loadingSongs: "Loading Songs",
    processingSongsMessage: "Processing song {{current}} of {{total}}",
    currentlyProcessing: "Currently processing:",
    generatingWaveform: "Generating Waveform",
    loadingComplete: "Loading complete",
    waveformGenerationSuccess: "Waveforms generated successfully",
    waveformNotAvailable: "No waveform available",
    analyzingAudio: "Analyzing audio",
    processingProgress: "Progress: {{percentage}}%",
    scanningFolders: "Scanning folders...",
    
    // New translations for waveform generation
    generateWaveforms: "Generate Waveforms",
    noSongsToGenerateWaveforms: "No songs available to generate waveforms",
    preparingWaveformGeneration: "Preparing waveform generation",
    waveformGenerationComplete: "Waveform generation completed for {{count}} songs",
    waveformGenerationError: "Error during waveform generation: {{error}}",
    
    // Fügen Sie neue Übersetzungen für den Ladevorgang hinzu
    loadingLibrary: "Loading Music Library",
    preparingLibrary: "Preparing music library",
    preparingFiles: "Preparing files",
    scanningDirectory: "Scanning directory",
    processingStatus: "Processing Status",
    waitingForProcess: "Waiting for process to start...",
    loadingHint: "This may take a while depending on your library size. Waveforms are being generated for all songs.",
    showDetails: "Show Details",
    hideDetails: "Hide Details",
    songs: "songs"
  }
};

// Language names in their native language
export const languageNames = {
  de: "Deutsch",
  en: "English"
};

// Default language
export const defaultLanguage = "de"; 