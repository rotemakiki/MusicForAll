// Enhanced Play Song JavaScript - Simplified and Optimized

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

// Single metronome sound function - stable and consistent
function playMetronome() {
    const volume = document.getElementById("volume-slider").value;
    metronome.volume = parseFloat(volume);
    metronome.currentTime = 0;
    metronome.play().catch(() => {});
}

// Calculate smaller measure width - 4 measures per row
function calculateMeasureWidth(measure) {
    const totalBeats = measure.reduce((sum, chord) => sum + chord.beats, 0);
    // Reduced width for 4 measures per row
    return Math.max(180, 140 + (totalBeats * 20));
}

// Enhanced chord rendering with 4 measures per row
function renderChords() {
    const wrapper = document.getElementById("chords-wrapper");
    wrapper.innerHTML = "";

    let globalBeatCount = 0;
    let currentGlobalBeat = 0;
    let allMeasures = []; // Store all measures first

    // Calculate current global beat position
    for (let i = 0; i < chords.length; i++) {
        for (let j = 0; j < chords[i].length; j++) {
            if (i === currentLineIndex && j === currentChordIndexInLine) break;
            currentGlobalBeat += chords[i][j].beats;
        }
        if (i === currentLineIndex) break;
    }

    // First pass: create all measures
    chords.forEach((line, lineIdx) => {
        let totalBeats = 0;
        let currentMeasure = [];

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

                const globalMeasureIndex = allMeasures.length + 1; // הספירה הגלובלית החדשה

                const measureData = {
                    lineIdx,
                    measureIndex: globalMeasureIndex, // השתמש במספר הגלובלי
                    chords: [...currentMeasure],
                    totalBeats,
                    measureStartBeat,
                    isCurrent,
                    isPast,
                    startChordIdx: chordIdx - currentMeasure.length + 1
                };

                allMeasures.push(measureData);
                globalBeatCount += totalBeats;

                // Reset for next measure
                totalBeats = 0;
                currentMeasure = [];
            }
        });
    });

    // Second pass: group measures into rows of 4
    for (let i = 0; i < allMeasures.length; i += 4) {
        const rowMeasures = allMeasures.slice(i, i + 4);
        const rowDiv = document.createElement("div");
        rowDiv.className = "chord-row";

        rowMeasures.forEach(measureData => {
            const measureDiv = document.createElement("div");
            measureDiv.className = "measure-box clickable";

            // Smaller width for 4 measures per row
            const measureWidth = calculateMeasureWidth(measureData.chords);
            measureDiv.style.width = `${measureWidth}px`;
            measureDiv.setAttribute('data-total-beats', Math.round(measureData.totalBeats));

            if (measureData.isCurrent) {
                measureDiv.classList.add("current");
            } else if (measureData.isPast) {
                measureDiv.classList.add("past");
            }

            // Measure title
            const title = document.createElement("div");
            title.className = "measure-title";
            title.innerText = `תיבה ${measureData.measureIndex}`;
            measureDiv.appendChild(title);

            // Chords container
            const chordsContainer = document.createElement("div");
            chordsContainer.className = "chords-in-measure";

            measureData.chords.forEach(chord => {
                const chordBox = document.createElement("div");
                chordBox.className = "chord-box";

                const flexBasis = (chord.beats / measureData.totalBeats) * 100;
                chordBox.style.flexBasis = `${flexBasis}%`;
                chordBox.style.flexGrow = "0";
                chordBox.style.flexShrink = "0";

                chordBox.innerText = chord.chord;
                chordsContainer.appendChild(chordBox);
            });

            measureDiv.appendChild(chordsContainer);

            // Beats display
            const beatsContainer = document.createElement("div");
            beatsContainer.className = "beats-display";

            const dotsToShow = Math.round(measureData.totalBeats);
            for (let dotIdx = 0; dotIdx < dotsToShow; dotIdx++) {
                const dot = document.createElement("div");
                dot.className = "beat-dot";
                dot.dataset.beatIndex = dotIdx;
                dot.dataset.measureStartBeat = measureData.measureStartBeat;
                beatsContainer.appendChild(dot);
            }

            measureDiv.appendChild(beatsContainer);

            // Click handler
            measureDiv.addEventListener("click", () => {
                selectedStartLine = measureData.lineIdx;
                selectedStartChord = measureData.startChordIdx;

                document.querySelectorAll('.measure-box').forEach(box => {
                    box.classList.remove('selected');
                });
                measureDiv.classList.add('selected');

                const infoDiv = document.getElementById("selected-measure-info");
                const infoText = infoDiv.querySelector('.info-text');
                infoText.textContent = `נבחרה תיבה ${measureData.measureIndex} - לחץ "החל לנגן" כדי להתחיל מכאן`;
                infoDiv.style.display = "block";

                setTimeout(() => {
                    infoDiv.style.opacity = "0";
                    setTimeout(() => {
                        infoDiv.style.display = "none";
                        infoDiv.style.opacity = "1";
                    }, 300);
                }, 4000);
            });

            // Hover effects
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
        });

        wrapper.appendChild(rowDiv);
    }

    updateBeatDots();
}

// Beat dots update - simplified
function updateBeatDots() {
    // Reset all dots
    document.querySelectorAll(".beat-dot").forEach(dot => {
        dot.classList.remove("active", "played");
    });

    // Calculate current global beat position
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

    // Update dots
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

// Simplified playback with single metronome
function startPlayback() {
    stopPlayback();

    bpm = parseInt(document.getElementById("bpm-slider").value);
    intervalMs = 60000 / bpm;
    document.getElementById("current-bpm").innerText = bpm;

    currentLineIndex = selectedStartLine !== null ? selectedStartLine : 0;
    currentChordIndexInLine = selectedStartChord !== null ? selectedStartChord : 0;
    currentBeat = 0;

    renderChords();

    // First beat - play immediately
    setTimeout(() => {
        playMetronome();
        currentBeat = 1;
        updateBeatDots();
    }, 100);

    // Main interval - consistent and stable
    interval = setInterval(() => {
        const line = chords[currentLineIndex];
        const chordObj = line[currentChordIndexInLine];
        const beatsThisChord = chordObj.beats || 4;

        currentBeat++;
        playMetronome(); // Single, consistent metronome sound

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

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmInput = document.getElementById("bpm-input");
    const volumeSlider = document.getElementById("volume-slider");

    // BPM controls
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

    // Volume control
    volumeSlider.addEventListener("input", (e) => {
        metronome.volume = parseFloat(e.target.value);
    });

    // Keyboard shortcuts
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
