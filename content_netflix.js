// =====================================
// NETFLIX MUTATIONOBSERVER TTS (DUAL OBSERVER)
// =====================================

let isReading = true;
let selectedVoice = null;
let rate = 1.0;

// Stability control
let STABILITY_DELAY = 120; // ms to wait before speaking
let lastSpokenText = "";

// Speech queue
let speechQueue = [];
let speaking = false;

// =====================
// SETTINGS LOAD
// =====================
chrome.storage.local.get(["voice", "rate", "enabled"], data => {
  if (data.voice) selectedVoice = data.voice;
  if (typeof data.rate === "number") rate = data.rate;
  if (typeof data.enabled !== "undefined") {
    isReading = Boolean(data.enabled);
  } else {
    chrome.storage.local.set({ enabled: isReading });
  }
});

chrome.storage.onChanged.addListener(changes => {
  if (changes.rate) rate = changes.rate.newValue;
  if (changes.voice) selectedVoice = changes.voice.newValue;
  if (changes.enabled) isReading = changes.enabled.newValue;
});

// =====================
// SPEECH ENGINE
// =====================
function speakNext() {
  if (!isReading || speaking || speechQueue.length === 0) return;

  speaking = true;
  const text = speechQueue.shift();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.lang = "en-US";

  let voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("en"));
  if (selectedVoice) {
    const v = voices.find(v => v.name === selectedVoice);
    if (v) u.voice = v;
  }

  u.onend = u.onerror = () => {
    speaking = false;
    speakNext();
  };

  speechSynthesis.speak(u);
}

// Ensure voices are loaded
speechSynthesis.onvoiceschanged = () => {
  // refresh voices list if needed
};

// =====================
// SUBTITLE HANDLING
// =====================
let stabilizeTimer = null;
let pendingText = "";

function queueStableText(text) {
  if (!text) return;
  if (text === pendingText) return;
  pendingText = text;

  clearTimeout(stabilizeTimer);

  stabilizeTimer = setTimeout(() => {
    if (pendingText === lastSpokenText) return;

    lastSpokenText = pendingText;
    speechQueue.push(pendingText);
    speakNext();
  }, STABILITY_DELAY);
}

// =====================
// OBSERVER SETUP
// =====================
let subtitleObserver = null;

function findSubtitleContainer() {
  // Try multiple selectors
  let container =
    document.querySelector(".player-timedtext") ||
    document.querySelector(".player-timedtext-text-container") ||
    document.querySelector("[data-uia='player-subtitle']");

  // Probe shadow DOM if needed
  if (!container) {
    const videoPlayer = document.querySelector(".watch-video");
    if (videoPlayer && videoPlayer.shadowRoot) {
      container = videoPlayer.shadowRoot.querySelector(".player-timedtext");
    }
  }

  return container;
}

function attachSubtitleObserver(container) {
  if (subtitleObserver) subtitleObserver.disconnect();

  subtitleObserver = new MutationObserver(() => {
    if (!isReading) return;

    const video = document.querySelector("video");
    if (video && video.paused) return;

    const text = container.innerText
      .replace(/•|♪/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 0) {
      queueStableText(text);
    }
  });

  subtitleObserver.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function startNetflixObserver() {
  let container = findSubtitleContainer();

  if (!container) {
    setTimeout(startNetflixObserver, 500);
    return;
  }

  attachSubtitleObserver(container);

  // Watch for container replacement
  const rootObserver = new MutationObserver(() => {
    const newContainer = findSubtitleContainer();
    if (newContainer && newContainer !== container) {
      container = newContainer;
      attachSubtitleObserver(container);
      console.log("🔄 Subtitle container replaced, observer re-attached");
    }
  });

  rootObserver.observe(document.body, { childList: true, subtree: true });

  console.log("✅ Netflix MutationObserver TTS active");
}

// Init
startNetflixObserver();