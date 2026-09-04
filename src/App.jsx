import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import va from './assets/Ai_girl.png';
import { generateAIResponse } from './utils/ai';
import {
  requestMicrophoneStream,
  getSpeechRecognitionCtor,
  runSpeechRecognition,
} from './utils/voice';
import { speakAssistantVoice } from './utils/elevenlabs';

const phases = {
  idle: 'idle',
  requestingMic: 'requestingMic',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
};

function App() {
  const [phase, setPhase] = useState(phases.idle);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [heardText, setHeardText] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const ttsObjectUrlRef = useRef(null);

  const revokeTtsUrl = useCallback(() => {
    if (ttsObjectUrlRef.current) {
      URL.revokeObjectURL(ttsObjectUrlRef.current);
      ttsObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeTtsUrl(), [revokeTtsUrl]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleClickMe = useCallback(async () => {
    setError('');
    setAnswer('');

    if (phase === phases.listening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      return;
    }

    if (phase !== phases.idle) return;

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setError(
        'Voice input needs the Web Speech API. Try Chrome or Edge on desktop, or enable speech recognition in your browser.'
      );
      return;
    }

    setPhase(phases.requestingMic);
    setLiveTranscript('');
    setHeardText('');

    try {
      const stream = await requestMicrophoneStream();
      streamRef.current = stream;
    } catch (e) {
      setPhase(phases.idle);
      setError(
        e.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow the mic for this site and try again.'
          : e.message || 'Could not open the microphone.'
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setPhase(phases.listening);

    try {
      const transcript = await runSpeechRecognition(recognition, {
        onInterim: (text) => setLiveTranscript(text),
      });

      stopStream();
      recognitionRef.current = null;
      setLiveTranscript('');

      if (!transcript) {
        setPhase(phases.idle);
        setError('No speech was detected. Speak after clicking, or check your microphone.');
        return;
      }

      setHeardText(transcript);
      setPhase(phases.thinking);

      const reply = await generateAIResponse(transcript);
      setAnswer(reply);
      setPhase(phases.speaking);
      try {
        await speakAssistantVoice(reply, {
          revokePrevious: revokeTtsUrl,
          setObjectUrl: (url) => {
            ttsObjectUrlRef.current = url;
          },
        });
      } catch (ttsErr) {
        console.warn('Voice playback:', ttsErr);
      } finally {
        revokeTtsUrl();
      }
      setPhase(phases.idle);
    } catch (e) {
      stopStream();
      recognitionRef.current = null;
      setLiveTranscript('');
      setPhase(phases.idle);

      if (e.code === 'no-speech') {
        setError('No speech heard. Try again and speak clearly.');
      } else if (e.code === 'not-allowed') {
        setError('Speech recognition was denied. Check site permissions.');
      } else {
        setError(e.message || 'Something went wrong with voice or AI.');
      }
    }
  }, [phase, stopStream, revokeTtsUrl]);

  const busy = phase !== phases.idle;
  const buttonLabel =
    phase === phases.listening
      ? 'Stop listening'
      : phase === phases.requestingMic
        ? 'Allow mic…'
        : phase === phases.thinking
          ? 'Thinking…'
          : phase === phases.speaking
            ? 'Speaking…'
            : 'Click me ';

  return (
    <div className="main" id="NOVA">
      <img src={va} alt="" />
      <span className="main-greeting">
        Hello, I am ANOVA, your AI assistant.
      </span>

      {phase === phases.listening && (
        <p className="main-status listening" aria-live="polite">
          Listening… {liveTranscript && <em>{liveTranscript}</em>}
        </p>
      )}
      {phase === phases.thinking && (
        <p className="main-status thinking" aria-live="polite">
          Sending your words to Gemini…
        </p>
      )}
      {phase === phases.speaking && (
        <p className="main-status speaking" aria-live="polite">
          ANOVA is speaking…
        </p>
      )}

      {heardText && (
        <p className="main-heard" aria-live="polite">
          <strong>You said:</strong> {heardText}
        </p>
      )}
      {answer && (
        <p className="main-answer" aria-live="polite">
          <strong>ANOVA:</strong> {answer}
        </p>
      )}
      {error && (
        <p className="main-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleClickMe}
        disabled={busy && phase !== phases.listening}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export default App;
