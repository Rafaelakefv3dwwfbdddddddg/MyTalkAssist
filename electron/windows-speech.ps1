param(
  [Parameter(Mandatory = $true)][ValidateSet('recognize', 'speak')][string]$Mode,
  [string]$TextBase64,
  [double]$Rate = 1,
  [double]$Pitch = 1
)

$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech

if ($Mode -eq 'recognize') {
  try {
    $culture = [Globalization.CultureInfo]::GetCultureInfo('pt-BR')
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
    $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
    $recognizer.SetInputToDefaultAudioDevice()
    $result = $recognizer.Recognize()
    if ($null -eq $result) {
      @{ type = 'end' } | ConvertTo-Json -Compress
    } else {
      @{ type = 'result'; text = $result.Text; confidence = [double]$result.Confidence; isFinal = $true } | ConvertTo-Json -Compress
    }
  } catch {
    @{ type = 'error'; code = 'windows-speech'; message = $_.Exception.Message } | ConvertTo-Json -Compress
    exit 1
  }
  exit 0
}

try {
  $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($TextBase64))
  $synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $voice = $synthesizer.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
  if ($null -eq $voice) { $voice = $synthesizer.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.TwoLetterISOLanguageName -eq 'pt' } | Select-Object -First 1 }
  if ($null -ne $voice) { $synthesizer.SelectVoice($voice.VoiceInfo.Name) }
  $synthesizer.Rate = [Math]::Max(-10, [Math]::Min(10, [int](($Rate - 1) * 10)))
  $synthesizer.Speak($text)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}