// =====================================
// HULU TTS + DEBUG (Unified version)
// =====================================

let isReading = true;
let selectedVoice = null;
let rate = 1.0;
let speaking = false;
let lastSpokenHash = "";
let queue = [];

let debugEnabled = false;
const debug = {
  video: false,
  textTracks: "unknown",
  container: false,
  extracted: false,
  status: "Initializing"
};

// Load settings
chrome.storage.local.get(
  ["voice", "rate", "ttsEnabled", "debugEnabled"],
  data => {
    if (data.voice) selectedVoice = data.voice;
    if (typeof data.rate === "number") rate = data.rate;
    if (typeof data.ttsEnabled !== "undefined") {
      isReading = Boolean(data.ttsEnabled);
    } else {
      chrome.storage.local.set({ ttsEnabled: isReading });
    }
    debugEnabled = Boolean(data.debugEnabled);
  }
);

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "toggle") {
    isReading = !isReading;
    chrome.storage.local.set({ ttsEnabled: isReading });
    if (!isReading) {
      speechSynthesis.cancel();
      queue = [];
      speaking = false;
    }
    sendResponse({ isReading });
    return true;
  }

  if (msg.action === "setVoice") selectedVoice = msg.value;
  if (msg.action === "setRate") rate = msg.value;

  if (msg.action === "debugToggle") {
    debugEnabled = Boolean(msg.value);
    chrome.storage.local.set({ debugEnabled });
  }

  if (msg.action === "getDebugInfo") {
    sendResponse({
      debug: `
Site: Hulu
Video detected: ${debug.video}
textTracks: ${debug.textTracks}
Subtitle container: ${debug.container}
Text extracted: ${debug.extracted}
Status: ${debug.status}
Reading: ${isReading ? "ON" : "OFF"}
Rate: ${rate}
Voice: ${selectedVoice || "default"}
URL: ${location.href}
      `.trim()
    });
    return true;
  }
});

// Speak with queue and duplicate guard
function speak(text) {
  if (!isReading || !text) return;

  // Prevent duplicates already queued
  if (queue.length > 0 && queue[queue.length - 1] === text) return;

  queue.push(text);
  if (!speaking) processQueue();
}

function processQueue() {
  if (queue.length === 0) {
    speaking = false;
    return;
  }

  speaking = true;
  const text = queue.shift();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.lang = "en-US";

  const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("en"));
  if (selectedVoice) {
    const v = voices.find(v => v.name === selectedVoice);
    if (v) u.voice = v;
  }

  u.onend = u.onerror = () => {
    speaking = false;
    processQueue(); // continue with next item
  };

  speechSynthesis.speak(u);
}

// Normalize text for comparison
function normalizeText(t) {
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}

// Only speak once per unique caption
function shouldSpeak(text) {
  const hash = normalizeText(text);

  if (hash === lastSpokenHash) return false;

  lastSpokenHash = hash;
  return true;
}

// Hulu subtitle detection
function startHuluReader() {
  setInterval(() => {
    if (!isReading) {
      debug.status = "Paused";
      return;
    }

    const video = document.querySelector("video");
    debug.video = !!video;
    if (!video || video.paused) {
      debug.status = "Video paused or missing";
      debug.extracted = false;
      return;
    }

    debug.textTracks = video.textTracks ? video.textTracks.length : "unavailable";

    const container =
      document.querySelector("[data-testid='subtitles']") ||
      document.querySelector(".ClosedCaption") ||
      document.querySelector("div[class*='caption']");

    debug.container = !!container;

    if (!container) {
      debug.status = "Subtitle container not found";
      debug.extracted = false;
      return;
    }

    const text = container.innerText.replace(/\s+/g, " ").trim();

    if (!text || text.length < 3) {
      debug.extracted = false;
      debug.status = "Subtitle text empty or too short";
      return;
    }

    debug.extracted = true;

    if (shouldSpeak(text)) {
      debug.status = "Speaking";
      speak(text);
    } else {
      debug.status = "Waiting for change";
    }
  }, 250);
}

// Init
startHuluReader();