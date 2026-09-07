# TalkAssist para Windows

O desktop e um aplicativo Electron que carrega o bundle exportado pelo Expo Web dentro de uma janela nativa. O usuario nao precisa abrir Chrome, instalar Node.js ou ter Expo instalado.

## Desenvolvimento

```powershell
npm run desktop:dev
```

## Gerar instalador e portatil

```powershell
npm run desktop:build
npm run desktop:portable
```

Os artefatos aparecem em `release/`. O instalador NSIS cria atalhos no Menu Iniciar e na area de trabalho, e tambem registra a desinstalacao.

O reconhecimento usa `System.Speech.Recognition` e o TTS usa `System.Speech.Synthesis`, executados pelo PowerShell 5.1 do Windows. O reconhecimento depende de um dispositivo de entrada configurado e de um pacote de voz/reconhecimento compativel com portugues instalado no Windows. O Android continua usando `expo-speech-recognition` e `expo-speech`.