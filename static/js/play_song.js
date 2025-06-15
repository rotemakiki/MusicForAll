// Enhanced Play Song JavaScript for PC Optimization

// Get song data from Flask
const chords = window.songData.chords;
const originalBpm = window.songData.originalBpm;

// State variables
let bpm = originalBpm;
let intervalMs = 60000 / bpm;
let currentLineIndex = 0;
let currentChordIndexInLine = 0;
let currentBeat = 0;
let interval = null;
let selectedStartLine = null;
let selectedStartChord = null;
const metronome = document.getElementById("metronome-sound");

// Enhanced sound coordination for better beat timing
let audioContext;
let oscillator;
let gainNode;

// Initialize Web Audio API for better sound coordination
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play enhanced metronome sound with better timing
function playMetronome(isFirstBeat = false) {
    // Fallback to HTML5 audio
    metronome.currentTime = 0;
    metronome.play().catch(() => {});

    // Enhanced Web Audio API sound for better coordination
    if (audioContext) {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequency for first beat vs other beats
            oscillator.frequency.setValueAtTime(isFirstBeat ? 1000 : 800, audioContext.currentTime);
            oscillator.type = 'sine';

            // Volume based on slider
            const volume = document.getElementById("volume-slider").value;
            gainNode.gain.setValueAtTime(volume * 0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log("Web Audio API not available, using HTML5 audio");
        }
    }
}

// Calculate measure width based on total beats with better PC optimization
function calculateMeasureWidth(measure) {
    const totalBeats = measure.reduce((sum, chord) => sum + chord.beats, 0);
    // Enhanced width calculation for PC screens
    return Math.max(220, 180 + (totalBeats * 35));
}

// Enhanced chord rendering with better beat distribution
function renderChords() {
    const wrapper = document.getElementById("chords-wrapper");
    wrapper.innerHTML = "";

    let globalBeatCount = 0;
    let currentGlobalBeat = 0;

    // Calculate current global beat position
    for (let i = 0; i < chords.length; i++) {
        for (let j = 0; j < chords[i].length; j++) {
            if (i === currentLineIndex && j === currentChordIndexInLine) break;
            currentGlobalBeat += chords[i][j].beats;
        }
        if (i === currentLineIndex) break;
    }

    chords.forEach((line, lineIdx) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "chord-row";

        let totalBeats = 0;
        let currentMeasure = [];
        let measureIndex = 1;

        line.forEach((chordObj, chordIdx) => {
            currentMeasure.push(chordObj);
            totalBeats += chordObj.beats;

            const isLast = chordIdx === line.length - 1;

            // Create measure when we reach 4 beats or it's the last chord
            if (Math.abs(totalBeats - 4) < 0.01 || totalBeats > 4 || isLast) {
                const measureStartBeat = globalBeatCount;
                const measureEndBeat = globalBeatCount + totalBeats - 1;
                const isCurrent = currentGlobalBeat >= measureStartBeat && currentGlobalBeat <= measureEndBeat;
                const isPast = currentGlobalBeat > measureEndBeat;

                globalBeatCount += totalBeats;

                const measureDiv = document.createElement("div");
                measureDiv.className = "measure-box clickable";

                // Enhanced width calculation and beat data
                const measureWidth = calculateMeasureWidth(currentMeasure);
                measureDiv.style.width = `${measureWidth}px`;
                measureDiv.setAttribute('data-total-beats', Math.round(totalBeats));

                if (isCurrent) {
                    measureDiv.classList.add("current");
                } else if (isPast) {
                    measureDiv.classList.add("past");
                }

                // Measure title
                const title = document.createElement("div");
                title.className = "measure-title";
                title.innerText = `תיבה ${measureIndex++}`;
                measureDiv.appendChild(title);

                // Chords container with enhanced proportional display
                const chordsContainer = document.createElement("div");
                chordsContainer.className = "chords-in-measure";

                const totalMeasureBeats = currentMeasure.reduce((sum, chord) => sum + chord.beats, 0);

                currentMeasure.forEach(chord => {
                    const chordBox = document.createElement("div");
                    chordBox.className = "chord-box";

                    // Enhanced flex calculation for better proportions
                    const flexBasis = (chord.beats / totalMeasureBeats) * 100;
                    chordBox.style.flexBasis = `${flexBasis}%`;
                    chordBox.style.flexGrow = "0";
                    chordBox.style.flexShrink = "0";

                    chordBox.innerText = chord.chord;
                    chordsContainer.appendChild(chordBox);
                });

                measureDiv.appendChild(chordsContainer);

                // Enhanced beats display with proper spacing based on measure width
                const beatsContainer = document.createElement("div");
                beatsContainer.className = "beats-display";

                // Create dots based on actual beats, with enhanced spacing
                const dotsToShow = Math.round(totalMeasureBeats);
                for (let i = 0; i < dotsToShow; i++) {
                    const dot = document.createElement("div");
                    dot.className = "beat-dot";
                    dot.dataset.beatIndex = i;
                    dot.dataset.measureStartBeat = measureStartBeat;
                    beatsContainer.appendChild(dot);
                }

                measureDiv.appendChild(beatsContainer);

                // Enhanced click handler with better feedback
                let startChord = chordIdx - currentMeasure.length + 1;
                measureDiv.addEventListener("click", () => {
                    selectedStartLine = lineIdx;
                    selectedStartChord = startChord;

                    // Enhanced visual feedback
                    document.querySelectorAll('.measure-box').forEach(box => {
                        box.classList.remove('selected');
                    });
                    measureDiv.classList.add('selected');

                    // Show enhanced info message
                    const infoDiv = document.getElementById("selected-measure-info");
                    const infoText = infoDiv.querySelector('.info-text');
                    infoText.textContent = `נבחרה תיבה ${measureIndex - 1} - לחץ "החל לנגן" כדי להתחיל מכאן`;
                    infoDiv.style.display = "block";

                    // Auto-hide with animation
                    setTimeout(() => {
                        infoDiv.style.opacity = "0";
                        setTimeout(() => {
                            infoDiv.style.display = "none";
                            infoDiv.style.opacity = "1";
                        }, 300);
                    }, 4000);
                });

                // Enhanced hover effects
                measureDiv.addEventListener("mouseenter", () => {
                    if (!measureDiv.classList.contains('selected')) {
                        measureDiv.style.borderColor = "#667eea";
                    }
                });

                measureDiv.addEventListener("mouseleave", () => {
                    if (!measureDiv.classList.contains('selected')) {
                        measureDiv.style.borderColor = "#34495e";
                    }
                });

                rowDiv.appendChild(measureDiv);

                // Reset for next measure
                totalBeats = 0;
                currentMeasure = [];
            }
        });

        wrapper.appendChild(rowDiv);
    });

    updateBeatDots();
}

// Enhanced beat dots update with better coordination
function updateBeatDots() {
    // Reset all dots
    document.querySelectorAll(".beat-dot").forEach(dot => {
        dot.classList.remove("active", "played");
    });

    // Calculate current global beat position with better precision
    let currentGlobalBeat = 0;
    for (let i = 0; i < currentLineIndex; i++) {
        for (let j = 0; j < chords[i].length; j++) {
            currentGlobalBeat += chords[i][j].beats;
        }
    }
    for (let j = 0; j < currentChordIndexInLine; j++) {
        currentGlobalBeat += chords[currentLineIndex][j].beats;
    }
    currentGlobalBeat += currentBeat - 1; // currentBeat is 1-based

    // Enhanced dot updates with better timing coordination
    document.querySelectorAll(".beat-dot").forEach(dot => {
        const measureStartBeat = parseInt(dot.dataset.measureStartBeat);
        const beatIndex = parseInt(dot.dataset.beatIndex);
        const dotGlobalPosition = measureStartBeat + beatIndex;

        if (dotGlobalPosition < currentGlobalBeat) {
            dot.classList.add("played");
        } else if (dotGlobalPosition === currentGlobalBeat) {
            dot.classList.add("active");
        }
    });
}

// Enhanced playback with better sound coordination
function startPlayback() {
    stopPlayback();

    // Initialize audio context on user interaction
    initAudioContext();

    bpm = parseInt(document.getElementById("bpm-slider").value);
    intervalMs = 60000 / bpm;
    document.getElementById("current-bpm").innerText = bpm;

    currentLineIndex = selectedStartLine !== null ? selectedStartLine : 0;
    currentChordIndexInLine = selectedStartChord !== null ? selectedStartChord : 0;
    currentBeat = 0;

    renderChords();

    // First beat - play immediately with emphasis
    setTimeout(() => {
        playMetronome(true);
        currentBeat = 1;
        updateBeatDots();
    }, 100);

    // Enhanced interval with better timing
    interval = setInterval(() => {
        const line = chords[currentLineIndex];
        const chordObj = line[currentChordIndexInLine];
        const beatsThisChord = chordObj.beats || 4;

        currentBeat++;

        // Determine if this is the first beat of a measure/chord
        const isFirstBeat = currentBeat === 1;
        playMetronome(isFirstBeat);

        if (currentBeat > beatsThisChord) {
            currentBeat = 1;
            currentChordIndexInLine++;

            if (currentChordIndexInLine >= chords[currentLineIndex].length) {
                currentChordIndexInLine = 0;
                currentLineIndex++;

                if (currentLineIndex >= chords.length) {
                    stopPlayback();
                    return;
                }
            }
        }

        updateBeatDots();
    }, intervalMs);
}

function stopPlayback() {
    clearInterval(interval);
    interval = null;

    // Reset audio context
    if (audioContext && audioContext.state !== 'closed') {
        try {
            audioContext.close();
            audioContext = null;
        } catch (e) {
            console.log("Error closing audio context:", e);
        }
    }
}

function restartPlayback() {
    stopPlayback();
    currentLineIndex = 0;
    currentChordIndexInLine = 0;
    currentBeat = 0;
    selectedStartLine = null;
    selectedStartChord = null;

    // Reset visual state
    document.getElementById("selected-measure-info").style.display = "none";
    document.querySelectorAll('.measure-box').forEach(box => {
        box.classList.remove('selected');
    });

    renderChords();
}

function resetBpm() {
    bpm = originalBpm;
    intervalMs = 60000 / bpm;
    document.getElementById("bpm-slider").value = bpm;
    document.getElementById("bpm-input").value = bpm;
    document.getElementById("current-bpm").innerText = bpm;
}

// Enhanced initialization
document.addEventListener("DOMContentLoaded", () => {
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmInput = document.getElementById("bpm-input");
    const volumeSlider = document.getElementById("volume-slider");

    // Enhanced BPM controls
    bpmSlider.addEventListener("input", (e) => {
        bpm = parseInt(e.target.value);
        bpmInput.value = bpm;
        document.getElementById("current-bpm").innerText = bpm;
        intervalMs = 60000 / bpm;

        // If playing, restart with new tempo
        if (interval) {
            const wasPlaying = true;
            stopPlayback();
            if (wasPlaying) {
                startPlayback();
            }
        }
    });

    bpmInput.addEventListener("change", (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 40) val = 40;
        if (val > 200) val = 200;
        bpmInput.value = val;
        bpmSlider.value = val;
        bpm = val;
        document.getElementById("current-bpm").innerText = bpm;
        intervalMs = 60000 / bpm;

        // If playing, restart with new tempo
        if (interval) {
            const wasPlaying = true;
            stopPlayback();
            if (wasPlaying) {
                startPlayback();
            }
        }
    });

    // Enhanced volume control
    volumeSlider.addEventListener("input", (e) => {
        metronome.volume = parseFloat(e.target.value);
    });

    // Keyboard shortcuts for PC optimization
    document.addEventListener("keydown", (e) => {
        switch(e.code) {
            case "Space":
                e.preventDefault();
                if (interval) {
                    stopPlayback();
                } else {
                    startPlayback();
                }
                break;
            case "KeyR":
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    restartPlayback();
                }
                break;
            case "KeyS":
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    stopPlayback();
                }
                break;
            case "ArrowUp":
                e.preventDefault();
                if (bpm < 200) {
                    bpm += 5;
                    bpmSlider.value = bpm;
                    bpmInput.value = bpm;
                    document.getElementById("current-bpm").innerText = bpm;
                    intervalMs = 60000 / bpm;
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                if (bpm > 40) {
                    bpm -= 5;
                    bpmSlider.value = bpm;
                    bpmInput.value = bpm;
                    document.getElementById("current-bpm").innerText = bpm;
                    intervalMs = 60000 / bpm;
                }
                break;
        }
    });

    // Initial render
    renderChords();

    // Show keyboard shortcuts hint
    console.log("Keyboard shortcuts:");
    console.log("Space: Play/Pause");
    console.log("Ctrl+R: Restart");
    console.log("Ctrl+S: Stop");
    console.log("Arrow Up/Down: Adjust BPM");
});
