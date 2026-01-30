// =====================================
// YOUTUBE DOM-ONLY TTS + QUEUE SYSTEM
// =====================================

let isReading = true;
let selectedVoice = null;
let rate = 1.0;
let speaking = false;
let lastText = "";
let SCAN_INTERVAL = 200; // default, overridden by popup slider
let SUPPRESSION_MS = 200;
let debugEnabled = false;
let stabilityTimer = null;
let queue = [];

// Load settings
chrome.storage.local.get(
  ["voice","rate","enabled","debugEnabled","scanInterval","suppressionMs"],
  data => {
    if (data.voice) selectedVoice = data.voice;
    if (typeof data.rate === "number") rate = data.rate;
    if (typeof data.enabled !== "undefined") isReading = Boolean(data.enabled);
    debugEnabled = Boolean(data.debugEnabled);
    if (typeof data.scanInterval === "number") SCAN_INTERVAL = data.scanInterval;
    if (typeof data.suppressionMs === "number") SUPPRESSION_MS = data.suppressionMs;
  }
);

// Listen for live changes
chrome.storage.onChanged.addListener(changes => {
  if (changes.scanInterval) SCAN_INTERVAL = changes.scanInterval.newValue;
  if (changes.suppressionMs) SUPPRESSION_MS = changes.suppressionMs.newValue;
  if (changes.rate) rate = changes.rate.newValue;
  if (changes.voice) selectedVoice = changes.voice.newValue;
  if (changes.enabled) isReading = changes.enabled.newValue;
  if (changes.debugEnabled) debugEnabled = changes.debugEnabled.newValue;
});

// Speak next item in queue
function speakNext() {
  if (speaking || queue.length === 0) return;

  const text = queue.shift();
  speaking = true;

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
    speakNext(); // continue with next in queue
  };

  speechSynthesis.speak(u);
}

// Enqueue new text
function enqueueSpeak(text) {
  if (!isReading || !text) return;
  if (text !== lastText) {
    lastText = text;
    queue.push(text);
    speakNext();
  }
}

// Handle CC updates with stability window
function handleCaptionChange() {
  const ccSegments = document.querySelectorAll(".ytp-caption-segment");
  const text = Array.from(ccSegments).map(seg => seg.innerText).join(" ").trim();

  if (!text) return; // ignore empty clears

  clearTimeout(stabilityTimer);
  stabilityTimer = setTimeout(() => {
    enqueueSpeak(text);
  }, 120); // wait for segments to stabilize
}

// Start observer for CC
function startCaptionObserver() {
  const target = document.querySelector('.ytp-caption-window-container');
  if (target) {
    const observer = new MutationObserver(handleCaptionChange);
    observer.observe(target, { childList: true, subtree: true });
  }
}

// Handle transcript polling
function handleTranscript() {
  const activeLine = document.querySelector("ytd-transcript-segment-renderer.active span");
  if (activeLine) {
    const text = activeLine.innerText.trim();
    enqueueSpeak(text);
  }
}

// Init
startCaptionObserver();
setInterval(handleTranscript, SCAN_INTERVAL);