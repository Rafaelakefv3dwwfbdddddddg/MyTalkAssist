const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, handler) {
    const listener = (_event, value) => handler(value);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('talkAssistDesktop', {
    speech: {
        isAvailable: () => ipcRenderer.invoke('speech:is-available'),
        requestPermission: () => ipcRenderer.invoke('speech:request-permission'),
        start: () => ipcRenderer.invoke('speech:start'),
        stop: () => ipcRenderer.invoke('speech:stop'),
        cancel: () => ipcRenderer.invoke('speech:cancel'),
        onResult: (handler) => subscribe('speech:result', handler),
        onError: (handler) => subscribe('speech:error', handler),
        onEnd: (handler) => subscribe('speech:end', handler),
    },
    tts: {
        speak: (text, rate, pitch) => ipcRenderer.invoke('tts:speak', { text, rate, pitch }),
        stop: () => ipcRenderer.invoke('tts:stop'),
    },
});