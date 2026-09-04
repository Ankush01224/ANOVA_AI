/**
 * Request microphone access (shows the browser permission prompt).
 * @returns {Promise<MediaStream>}
 */
export function requestMicrophoneStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('Microphone is not supported in this browser.'));
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

/**
 * @returns {typeof SpeechRecognition | null}
 */
export function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * @param {SpeechRecognition} recognition
 * @param {{ onInterim?: (text: string) => void }} [handlers]
 * @returns {Promise<string>} Final transcript when recognition ends
 */
export function runSpeechRecognition(recognition, handlers = {}) {
  return new Promise((resolve, reject) => {
    let finalText = '';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          finalText += piece;
        } else if (handlers.onInterim) {
          handlers.onInterim(piece);
        }
      }
    };

    recognition.onerror = (event) => {
      const err = new Error(event.error || 'Speech recognition failed');
      err.code = event.error;
      reject(err);
    };

    recognition.onend = () => {
      resolve(finalText.trim());
    };

    try {
      recognition.start();
    } catch (e) {
      reject(e);
    }
  });
}
