const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    listSongs: (path, includeSubdirectories = false) => ipcRenderer.invoke('list-songs', path, includeSubdirectories),
    selectDirectory: (options = {}) => ipcRenderer.invoke('select-directory', options),
    checkPathExists: (filePath) => ipcRenderer.invoke('check-path-exists', filePath),
    loadAudioFile: (filePath) => ipcRenderer.invoke('load-audio-file', filePath),
    loadAlbumCover: (coverPath) => ipcRenderer.invoke('load-album-cover', coverPath)
  }
); 