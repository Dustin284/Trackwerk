// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

// Helper function to handle IPC calls
const invoke = (channel, ...args) => {
  return ipcRenderer.invoke(channel, ...args);
};

contextBridge.exposeInMainWorld('api', {
  // File system operations
  checkPathExists: (path) => invoke('check-path-exists', path),
  selectFolder: () => invoke('select-folder'),
  listSongs: (directoryPath, includeSubdirectories) => 
    invoke('list-songs', directoryPath, includeSubdirectories),
  
  // Audio operations
  loadAudioFile: (filePath) => invoke('load-audio-file', filePath),
  readAudioBuffer: async (filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return {
        success: true,
        buffer: buffer.buffer,
        size: buffer.length,
        fileName: path.basename(filePath),
        mimeType: mime.getType(filePath) || 'audio/mpeg'
      };
    } catch (error) {
      console.error('Fehler beim Lesen der Audiodatei:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  readFileAsBlob: (filePath) => invoke('readFileAsBlob', filePath),
  
  // Metadata operations
  loadAlbumCover: (coverPath) => invoke('load-album-cover', coverPath),
  loadSongMetadata: (filePath) => invoke('load-song-metadata', filePath),
  
  // Waveform-Generator API
  generateWaveformData: async (songPath, width = 400) => {
    try {
      const result = await invoke('generate-waveform', { songPath, width });
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