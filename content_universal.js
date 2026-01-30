console.log("Universal Subtitle Interceptor loaded");

// =============================
// STATE
// =============================
let enabled = true;
let selectedVoice = null;
let rate = 1.0;
let speaking = false;
let queue = [];
let lastText = "";

let useOCR = false; // still toggleable via popup
let activeSource = "";

// =============================
// LOAD SETTINGS
// =============================
chrome.storage.local.get(
  ["enabled", "voice", "rate", "ocrEnabled", "universalEnabled"],
  data => {
    if (typeof data.enabled === "boolean") enabled = data.enabled;
    if (data.voice) selectedVoice = data.voice;
    if (typeof data.rate === "number") rate = data.rate;
    if (data.ocrEnabled) useOCR = data.ocrEnabled;

    if (data.universalEnabled) interceptSubtitles();
  }
);

chrome.storage.onChanged.addListener(changes => {
  if (changes.enabled) enabled = changes.enabled.newValue;
  if (changes.voice) selectedVoice = changes.voice.newValue;
  if (changes.rate) rate = changes.rate.newValue;
  if (changes.ocrEnabled) {
    useOCR = changes.ocrEnabled.newValue;
    if (useOCR) {
      startOCR();
    } else {
      stopOCR();
    }
  }
});

// =============================
// SPEECH FUNCTIONS
// =============================
function speakNext() {
  if (!enabled || speaking || queue.length === 0) return;

  speaking = true;
  const text = queue.shift();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.lang = "en-US";

  const voices = speechSynthesis.getVoices();
  if (selectedVoice) {
    const v = voices.find(v => v.name === selectedVoice);
    if (v) utter.voice = v;
  }

  utter.onend = utter.onerror = () => {
    speaking = false;
    speakNext();
  };

  speechSynthesis.speak(utter);
}

function enqueue(text) {
  if (!enabled || !text || text === lastText) return;
  lastText = text;

  // prevent runaway queues
  if (queue.length > 3) {
    queue.length = 0;
    speechSynthesis.cancel();
  }

  queue.push(text);
  speakNext();
}

// =============================
// UTILITY: CLEAN VTT / ASS TEXT
// =============================
function parseSubtitleText(raw) {
  // remove timestamps, style tags, empty lines
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.match(/^\d+$/) && !l.includes("-->") && !l.startsWith("{"));

  return lines.join(" ");
}

// =============================
// INTERCEPT FETCH/XHR FOR SUBTITLES
// =============================
function interceptSubtitles() {
  // Hook fetch
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await origFetch(...args);
    const url = args[0]?.toString() || "";

    if (url.match(/\.(vtt|srt|ass)$/i)) {
      try {
        const clone = res.clone();
        clone.text().then(text => {
          const clean = parseSubtitleText(text);
          if (clean) {
            activeSource = url.split("/").pop();
            enqueue(clean);
          }
        });
      } catch (e) {
        console.warn("Failed to process subtitles:", e);
      }
    }

    return res;
  };

  // Hook XHR (some sites use old-school)
  const origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.addEventListener("load", function() {
      if (url.match(/\.(vtt|srt|ass)$/i)) {
        try {
          const clean = parseSubtitleText(this.responseText);
          if (clean) {
            activeSource = url.split("/").pop();
            enqueue(clean);
          }
        } catch (e) {
          console.warn("XHR subtitle parse error:", e);
        }
      }
    });
    return origXHROpen.call(this, method, url, ...rest);
  };
}

// =============================
// OCR FOR CANVAS CAPTIONS
// =============================
let ocrInterval = null;

function startOCR() {
  if (!useOCR || ocrInterval) return;

  ocrInterval = setInterval(async () => {
    if (!useOCR) {
      stopOCR();
      return;
    }

    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      if (canvas.width > 100 && canvas.height > 50) { // skip small canvases
        try {
          const imageData = canvas.toDataURL('image/png');
          const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
            logger: m => console.log(m) // optional logging
          });
          const cleanText = text.trim();
          if (cleanText && cleanText !== lastText) {
            activeSource = 'OCR';
            enqueue(cleanText);
          }
        } catch (e) {
          console.warn('OCR error:', e);
        }
      }
    }
  }, 3000); // scan every 3 seconds
}

function stopOCR() {
  if (ocrInterval) {
    clearInterval(ocrInterval);
    ocrInterval = null;
  }
}

// Start OCR if enabled
if (useOCR) {
  startOCR();
}
