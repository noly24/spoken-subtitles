// =====================================
// PRIME VIDEO TTS — Resilient caption detection + Debug
// =====================================

let isReading = true;
let selectedVoice = null;
let rate = 1.0;
let speaking = false;
let lastText = "";
let debounceTimer = null;
let observer = null;
let pollTimer = null;

function log(...args) {
  console.log("[Prime TTS]", ...args);
}

// Settings
chrome.storage.local.get(["voice", "rate", "ttsEnabled"], data => {
  if (data.voice) selectedVoice = data.voice;
  if (typeof data.rate === "number") rate = data.rate;
  if (typeof data.ttsEnabled !== "undefined") {
    isReading = Boolean(data.ttsEnabled);
  } else {
    chrome.storage.local.set({ ttsEnabled: isReading });
  }
});

// Voices
function ensureDefaultVoice() {
  const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("en"));
  if (!selectedVoice && voices.length) {
    selectedVoice = voices[0].name;
    log("Default voice set:", selectedVoice);
  }
}
speechSynthesis.onvoiceschanged = ensureDefaultVoice;
ensureDefaultVoice();

// Messaging
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "toggle") {
    isReading = !isReading;
    chrome.storage.local.set({ ttsEnabled: isReading });
    if (!isReading) speechSynthesis.cancel();
    sendResponse({ isReading });
  }
  if (msg.action === "setVoice") selectedVoice = msg.value;
  if (msg.action === "setRate") rate = msg.value;

  if (msg.action === "getDebugInfo") {
    const video = document.querySelector("video");
    const captionEl = findVisibleCaption();
    sendResponse({
      debug: `
Site: Prime Video
Video detected: ${!!video}
Caption element detected: ${!!captionEl}
Caption text: ${captionEl ? getCaptionText(captionEl) : "N/A"}
Reading: ${isReading ? "ON" : "OFF"}
Rate: ${rate}
Voice: ${selectedVoice || "default"}
URL: ${location.href}
      `.trim()
    });
  }
});

// --- Caption detection helpers ---

// Prefer the overlay captions class; fall back to subtitle-text if needed
const CANDIDATE_SELECTORS = [
  ".atvwebplayersdk-captions-text",
  ".atvwebplayersdk-subtitle-text"
];

// Return the currently visible caption element on screen
function findVisibleCaption() {
  let best = null;
  let bestScore = -1;

  for (const sel of CANDIDATE_SELECTORS) {
    const nodes = document.querySelectorAll(sel);
    for (const el of nodes) {
      const text = getCaptionText(el);
      if (!text) continue;

      const rect = el.getBoundingClientRect();
      const visible = rect.width > 150 && rect.height > 20 &&
                      rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!visible) continue;

      // Prefer elements near bottom-center of viewport (typical captions)
      const centerX = rect.left + rect.width / 2;
      const distFromCenter = Math.abs(centerX - window.innerWidth / 2);
      const distFromBottom = Math.abs(window.innerHeight - rect.bottom);

      const score = (visible ? 1 : 0)
                    + Math.max(0, 300 - distFromCenter)    // closer to center
                    + Math.max(0, 300 - distFromBottom);   // closer to bottom

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
  }

  return best;
}

// Normalize caption text (join lines, strip episode headers)
function getCaptionText(el) {
  if (!el) return "";

  // Use textContent to get content across <br>, then normalize spaces
  let raw = el.textContent || "";
  raw = raw.replace(/\s+/g, " ").trim();

  // Ignore static headers like "Season 1, Ep. 1"
  if (/^Season\s+\d+,\s*Ep\./i.test(raw)) return "";

  return raw;
}

// --- TTS ---

function speak(text) {
  if (!isReading || speaking || !text) return;

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned === lastText) return;

  speaking = true;
  lastText = cleaned;

  const u = new SpeechSynthesisUtterance(cleaned);
  u.rate = rate;
  u.lang = "en-US";

  const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("en"));
  if (selectedVoice) {
    const v = voices.find(v => v.name === selectedVoice);
    if (v) u.voice = v;
  } else if (voices.length) {
    u.voice = voices[0];
  }

  u.onend = u.onerror = () => {
    speaking = false;
  };

  log("Speaking:", cleaned);
  speechSynthesis.speak(u);
}

// --- Observers ---

function attachGlobalObserver() {
  detachObserver();

  observer = new MutationObserver((_mutations) => {
    if (!isReading) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const el = findVisibleCaption();
      const text = getCaptionText(el);
      if (text && text !== lastText) {
        speak(text);
      }
    }, 120); // small debounce to avoid rapid churn
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  log("Observer attached: document-level");
}

function detachObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Polling as a safety net (Prime sometimes updates without mutations we catch)
function startPoller() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!isReading) return;
    const el = findVisibleCaption();
    const text = getCaptionText(el);
    if (text && text !== lastText && !speaking) {
      speak(text);
    }
  }, 300);
}

// Playback guard: clear lastText when paused to allow repeats after resume
function startPlaybackGuard() {
  setInterval(() => {
    const video = document.querySelector("video");
    if (!video || video.paused) {
      lastText = "";
    }
  }, 500);
}

// Init
log("Prime TTS initializing...");
attachGlobalObserver();
startPoller();
startPlaybackGuard();