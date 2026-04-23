(() => {
  const bpmInput = document.getElementById("metro-bpm");
  const bpmSlider = document.getElementById("metro-bpm-slider");
  const volumeSlider = document.getElementById("metro-volume");
  const startBtn = document.getElementById("metro-start");
  const stopBtn = document.getElementById("metro-stop");
  const statusMain = document.getElementById("metro-status-main");
  const statusSub = document.getElementById("metro-status-sub");
  const countEl = document.getElementById("metro-count");
  const audio = document.getElementById("metronome-sound");

  if (!bpmInput || !bpmSlider || !volumeSlider || !startBtn || !stopBtn || !statusMain || !statusSub || !countEl || !audio) {
    return;
  }

  let intervalId = null;
  let tickCount = 0;

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, x));
  }

  function getBpm() {
    return clamp(bpmInput.value, 40, 240);
  }

  function syncBpmUI(v) {
    bpmInput.value = String(v);
    bpmSlider.value = String(v);
  }

  function setStatus(main, sub) {
    statusMain.textContent = main;
    statusSub.textContent = sub || "";
  }

  function playTick() {
    audio.volume = clamp(volumeSlider.value, 0, 1);
    try {
      audio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    audio.play().catch(() => {});
  }

  function start() {
    if (intervalId) return;

    tickCount = 0;
    countEl.textContent = "0";
    const bpm = getBpm();
    syncBpmUI(bpm);

    // Warm load for better first tick responsiveness
    try { audio.load(); } catch (e) {}

    const intervalMs = 60000 / bpm;
    setStatus("מנגן...", `BPM: ${bpm}`);
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // First tick immediately
    playTick();
    tickCount += 1;
    countEl.textContent = String(tickCount);

    intervalId = setInterval(() => {
      playTick();
      tickCount += 1;
      countEl.textContent = String(tickCount);
    }, intervalMs);
  }

  function stop() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setStatus("נעצר.", "אפשר לשנות BPM ולהתחיל מחדש.");
  }

  function onBpmChange(v) {
    const bpm = clamp(v, 40, 240);
    syncBpmUI(bpm);
    if (intervalId) {
      // restart with new tempo
      stop();
      start();
    } else {
      setStatus("מוכן.", `BPM: ${bpm}`);
    }
  }

  bpmInput.addEventListener("change", () => onBpmChange(bpmInput.value));
  bpmSlider.addEventListener("input", () => onBpmChange(bpmSlider.value));
  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);

  document.addEventListener("visibilitychange", () => {
    // Avoid runaway intervals when tab is hidden
    if (document.hidden) stop();
  });

  // initial status
  onBpmChange(bpmInput.value);
})();

