const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const { createReadStream, existsSync, statSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let mainWindow;
let recognitionProcess;
let speechWasCancelled = false;
let ttsProcess;
let staticServer;

const distPath = path.resolve(__dirname, '..', 'dist');

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
};

function startStaticServer() {
    return new Promise((resolve, reject) => {
        staticServer = http.createServer((request, response) => {
            try {
                const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
                const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
                const filePath = path.resolve(distPath, relativePath);
                if (!filePath.startsWith(`${distPath}${path.sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
                    response.writeHead(404);
                    response.end('Not found');
                    return;
                }
                response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream' });
                createReadStream(filePath).pipe(response);
            } catch {
                response.writeHead(400);
                response.end('Bad request');
            }
        });
        staticServer.once('error', reject);
        staticServer.listen(0, '127.0.0.1', () => resolve(staticServer.address().port));
    });
}

function powershellPath() {
    return path.join(__dirname, 'windows-speech.ps1');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 900,
        minWidth: 760,
        minHeight: 650,
        backgroundColor: '#F7FAFC',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });
    mainWindow.loadURL(`http://127.0.0.1:${staticServer.address().port}/`);
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error(`TalkAssist failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
    });
}

function send(channel, payload) {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function stopRecognition(cancelled) {
    speechWasCancelled = cancelled;
    if (recognitionProcess) {
        recognitionProcess.kill();
        recognitionProcess = undefined;
    }
}

ipcMain.handle('speech:is-available', () => process.platform === 'win32');
ipcMain.handle('speech:request-permission', () => ({ granted: process.platform === 'win32' }));
ipcMain.handle('speech:start', () => {
    stopRecognition(true);
    speechWasCancelled = false;
    recognitionProcess = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', powershellPath(), '-Mode', 'recognize',
    ], { windowsHide: true });
    let output = '';
    recognitionProcess.stdout.setEncoding('utf8');
    recognitionProcess.stdout.on('data', (chunk) => {
        output += chunk;
        const lines = output.split(/\r?\n/);
        output = lines.pop();
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const event = JSON.parse(line);
                if (event.type === 'result') send('speech:result', { text: event.text, confidence: event.confidence, isFinal: true });
                if (event.type === 'error') send('speech:error', { code: event.code, message: event.message });
                if (event.type === 'end') send('speech:end');
            } catch { /* Ignore non-JSON PowerShell output. */ }
        }
    });
    recognitionProcess.stderr.on('data', (chunk) => {
        if (!speechWasCancelled) send('speech:error', { code: 'windows-speech', message: chunk.toString().trim() });
    });
    recognitionProcess.on('close', () => {
        recognitionProcess = undefined;
        if (!speechWasCancelled) send('speech:end');
    });
});
ipcMain.handle('speech:stop', () => stopRecognition(false));
ipcMain.handle('speech:cancel', () => stopRecognition(true));

ipcMain.handle('tts:speak', (_event, { text, rate, pitch }) => new Promise((resolve, reject) => {
    if (ttsProcess) ttsProcess.kill();
    const textBase64 = Buffer.from(text, 'utf8').toString('base64');
    ttsProcess = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', powershellPath(),
        '-Mode', 'speak', '-TextBase64', textBase64, '-Rate', String(rate), '-Pitch', String(pitch),
    ], { windowsHide: true });
    ttsProcess.on('error', reject);
    ttsProcess.on('close', (code) => {
        ttsProcess = undefined;
        code === 0 ? resolve() : reject(new Error('O Windows não conseguiu falar o texto.'));
    });
}));
ipcMain.handle('tts:stop', () => {
    if (ttsProcess) ttsProcess.kill();
    ttsProcess = undefined;
});

app.whenReady().then(async () => {
    await startStaticServer();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => staticServer?.close());