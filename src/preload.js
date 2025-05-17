// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  checkPathExists: (path) => ipcRenderer.invoke('check-path-exists', path),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  listSongs: (directoryPath, includeSubdirectories) => 
    ipcRenderer.invoke('list-songs', directoryPath, includeSubdirectories),
  loadAudioFile: (filePath) => ipcRenderer.invoke('load-audio-file', filePath),
  loadAlbumCover: (coverPath) => ipcRenderer.invoke('load-album-cover', coverPath),
  loadSongMetadata: (filePath) => ipcRenderer.invoke('load-song-metadata', filePath),

  // Waveform-Generator API
  generateWaveformData: async (songPath, width = 400) => {
    try {
      // Sende Anfrage an den Main-Prozess und warte auf Antwort
      const result = await ipcRenderer.invoke('generate-waveform', { songPath, width });
      return result;
    } catch (error) {
      console.error('Fehler bei der Waveform-Generierung:', error);
      return { 
        success: false, 
        error: error.message || 'Unbekannter Fehler bei der Waveform-Generierung'
      };
    }
  }
}); 