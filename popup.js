document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle");
  const voiceSelect = document.getElementById("voice");
  const rateInput = document.getElementById("rate");
  const rateValue = document.getElementById("rateValue");
  const scanInput = document.getElementById("scanInterval");
  const suppressionInput = document.getElementById("suppression");
  const scanValue = document.getElementById("scanIntervalValue");
  const suppressionValue = document.getElementById("suppressionValue");

  function updateToggleUI(enabled) {
    if (enabled) {
      toggleBtn.textContent = "Disable";
      toggleBtn.classList.add("enabled");
      toggleBtn.classList.remove("disabled");
    } else {
      toggleBtn.textContent = "Enable";
      toggleBtn.classList.add("disabled");
      toggleBtn.classList.remove("enabled");
    }
  }

  // Load voices
  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";
    voices.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = v.name;
      voiceSelect.appendChild(opt);
    });
    chrome.storage.local.get("voice", data => {
      if (data.voice) voiceSelect.value = data.voice;
    });
  }
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;

  // Restore settings
  chrome.storage.local.get(
    ["enabled","voice","rate","scanInterval","suppressionMs","universalEnabled","ocrEnabled"],
    data => {
      updateToggleUI(data.enabled);
      if (data.voice) voiceSelect.value = data.voice;
      if (data.rate) {
        rateInput.value = data.rate;
        rateValue.textContent = data.rate;
      }
      if (data.scanInterval !== undefined) {
        scanInput.value = data.scanInterval;
        scanValue.textContent = data.scanInterval;
      }
      if (data.suppressionMs !== undefined) {
        suppressionInput.value = data.suppressionMs;
        suppressionValue.textContent = data.suppressionMs;
      }
      // Sync universal toggle checkbox
      const universalToggleEl = document.getElementById("universalToggle");
      if (universalToggleEl) universalToggleEl.checked = Boolean(data.universalEnabled);
      // Sync OCR toggle checkbox
      const ocrToggleEl = document.getElementById("ocrToggle");
      if (ocrToggleEl) ocrToggleEl.checked = Boolean(data.ocrEnabled);
    }
  );

  // Save settings
  function saveSettings() {
    const enabled = toggleBtn.textContent === "Disable";
    chrome.storage.local.set({
      enabled,
      voice: voiceSelect.value,
      rate: parseFloat(rateInput.value),
      scanInterval: parseInt(scanInput.value, 10),
      suppressionMs: parseInt(suppressionInput.value, 10)
    });
    rateValue.textContent = rateInput.value;
    scanValue.textContent = scanInput.value;
    suppressionValue.textContent = suppressionInput.value;
  }

  toggleBtn.addEventListener("click", () => {
    const enabled = toggleBtn.textContent !== "Disable";
    updateToggleUI(enabled);
    saveSettings();
  });

  [voiceSelect, rateInput, scanInput, suppressionInput].forEach(el => {
    el.addEventListener("input", saveSettings);
  });

  // === Universal Subtitle TTS controls ===
  const universalToggleEl = document.getElementById("universalToggle");
  const universalStatusEl = document.getElementById("universalStatus");

  if (universalToggleEl) {
    universalToggleEl.addEventListener("change", e => {
      const enabled = e.target.checked;
      chrome.storage.local.set({ universalEnabled: enabled });
      if (universalStatusEl) {
        universalStatusEl.textContent = enabled ? "Universal TTS enabled" : "Universal TTS disabled";
        setTimeout(() => universalStatusEl.textContent = "", 1200);
      }
    });
  }

  // === OCR Fallback controls ===
  const ocrToggleEl = document.getElementById("ocrToggle");
  const ocrStatusEl = document.getElementById("ocrStatus");

  if (ocrToggleEl) {
    ocrToggleEl.addEventListener("change", e => {
      const enabled = e.target.checked;
      chrome.storage.local.set({ ocrEnabled: enabled });
      if (ocrStatusEl) {
        ocrStatusEl.textContent = enabled ? "OCR enabled" : "OCR disabled";
        setTimeout(() => ocrStatusEl.textContent = "", 1200);
      }
    });
  }
});