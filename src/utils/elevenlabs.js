/** Premade ElevenLabs voice: Rachel — clear, natural female (good “assistant” sound). Change in ElevenLabs → Voices if you prefer another. */
export const ANOVA_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

export const textToSpeech = async (text, voiceId = ANOVA_VOICE_ID) => {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('VITE_ELEVENLABS_API_KEY is missing in your .env file!');

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.55,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail?.status || errorData.detail?.message || `HTTP error ${response.status}`
    );
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

function pickFemaleEnglishVoice(voices) {
  if (!voices?.length) return null;
  const nameHint = (v) =>
    /samantha|karen|victoria|zira|female|aria|jenny|linda|susan|hazel/i.test(
      `${v.name} ${v.voiceURI || ''}`
    );
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('en') && nameHint(v)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('en-us')) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
    null
  );
}

/** Browser fallback when ElevenLabs is unavailable (no key or API error). */
export function speakWithBrowser(text) {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      reject(new Error('Speech synthesis not supported in this browser.'));
      return;
    }

    const speak = () => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.96;
      u.pitch = 1.08;
      const voice = pickFemaleEnglishVoice(synth.getVoices());
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => reject(new Error('Browser TTS failed.'));
      synth.speak(u);
    };

    if (synth.getVoices().length) {
      speak();
      return;
    }
    const onVoices = () => {
      synth.removeEventListener('voiceschanged', onVoices);
      speak();
    };
    synth.addEventListener('voiceschanged', onVoices);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoices);
      speak();
    }, 500);
  });
}

/**
 * Speak text aloud: ElevenLabs (high quality) if configured, else browser female voice.
 * @param {string} text
 * @param {{ revokePrevious?: () => void, setObjectUrl?: (url: string | null) => void }} [hooks] — call revokePrevious before new URL; setObjectUrl for cleanup on unmount
 */
export async function speakAssistantVoice(text, hooks = {}) {
  const { revokePrevious, setObjectUrl } = hooks;
  revokePrevious?.();

  const apiKey = import.meta.env.ELEVENLABS_API_KEY;
  if (apiKey) {
    try {
      const url = await textToSpeech(text, ANOVA_VOICE_ID);
      setObjectUrl?.(url);
      await new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Could not play audio.'));
        audio.play().catch(reject);
      });
      return;
    } catch (e) {
      console.warn('ElevenLabs TTS failed, using browser voice:', e);
    }
  }

  await speakWithBrowser(text);
}
