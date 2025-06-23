// Enhanced Play Song JavaScript - תיקון חזרות לופים

// Get song data from Flask
const chords = window.songData.chords;
const loops = window.songData.loops || [];
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
let addPreparationMeasure = true;
let enabledLoops = new Set(); // Track which loops are enabled
let loopStates = {}; // Track visibility state of each loop section
let currentRepeatCycle = {}; // Track current repeat for each loop
let currentGlobalMeasureIndex = 0; // מעקב על מיקום התיבה הגלובלי הנוכחי
const metronome = document.getElementById("metronome-sound");

// Initialize enabled loops - all enabled by default
loops.forEach((loop, index) => {
    enabledLoops.add(index);
    loopStates[index] = { visible: true, enabled: true };
    currentRepeatCycle[index] = 1; // Start at repeat 1
});

// Single metronome sound function - stable and consistent
function playMetronome() {
    const volume = document.getElementById("volume-slider").value;
    metronome.volume = parseFloat(volume);
    metronome.currentTime = 0;
    metronome.play().catch(() => {});
}

// פונקציה חדשה לחישוב מיקום גלובלי של תיבות כולל חזרות
function calculateGlobalMeasurePositions() {
    let positions = [];
    let globalIndex = 0;

    // אם יש תיבת הכנה
    if (addPreparationMeasure) {
        positions.push({
            globalIndex: globalIndex++,
            isPreparation: true,
            loopIndex: null,
            repeatNumber: null,
            measureInLoop: null
        });
    }

    // עבור כל לופ ועבור כל חזרה שלו
    loops.forEach((loop, loopIndex) => {
        const repeatCount = loop.repeatCount || 1;

        for (let repeatNum = 1; repeatNum <= repeatCount; repeatNum++) {
            for (let measureInLoop = 0; measureInLoop < loop.measureCount; measureInLoop++) {
                positions.push({
                    globalIndex: globalIndex++,
                    isPreparation: false,
                    loopIndex: loopIndex,
                    repeatNumber: repeatNum,
                    measureInLoop: measureInLoop,
                    loop: loop
                });
            }
        }
    });

    return positions;
}

// פונקציה חדשה לחישוב מיקום הנגינה הנוכחי
function calculateCurrentPosition() {
    if (currentLineIndex === -1) {
        // במצב הכנה
        return {
            globalMeasureIndex: 0,
            beatInMeasure: currentBeat - 1
        };
    }

    // חישוב התיבה הגלובלית הנוכחית בהתבסס על הנתונים
    let globalMeasureIndex = addPreparationMeasure ? 1 : 0;
    let totalBeatsProcessed = addPreparationMeasure ? 4 : 0;

    // ספירת beats עד המיקום הנוכחי
    for (let lineIdx = 0; lineIdx < currentLineIndex; lineIdx++) {
        for (let chordIdx = 0; chordIdx < chords[lineIdx].length; chordIdx++) {
            totalBeatsProcessed += chords[lineIdx][chordIdx].beats;
        }
    }

    for (let chordIdx = 0; chordIdx < currentChordIndexInLine; chordIdx++) {
        if (chords[currentLineIndex] && chords[currentLineIndex][chordIdx]) {
            totalBeatsProcessed += chords[currentLineIndex][chordIdx].beats;
        }
    }

    // חישוב באיזו תיבה אנחנו נמצאים
    let currentBeatCount = addPreparationMeasure ? 4 : 0;

    loops.forEach((loop, loopIndex) => {
        const repeatCount = loop.repeatCount || 1;

        for (let repeatNum = 1; repeatNum <= repeatCount; repeatNum++) {
            for (let measureInLoop = 0; measureInLoop < loop.measureCount; measureInLoop++) {
                const measureStartBeat = currentBeatCount;
                const measureEndBeat = currentBeatCount + 4; // נניח שכל תיבה היא 4 beats

                if (totalBeatsProcessed + currentBeat - 1 >= measureStartBeat &&
                    totalBeatsProcessed + currentBeat - 1 < measureEndBeat) {
                    globalMeasureIndex = addPreparationMeasure ?
                        1 + (loopIndex * loop.measureCount * repeatCount) + ((repeatNum - 1) * loop.measureCount) + measureInLoop :
                        (loopIndex * loop.measureCount * repeatCount) + ((repeatNum - 1) * loop.measureCount) + measureInLoop;

                    // עדכון החזרה הנוכחית ללופ זה
                    currentRepeatCycle[loopIndex] = repeatNum;
                    return;
                }

                currentBeatCount += 4;
            }
        }
    });

    return {
        globalMeasureIndex: globalMeasureIndex,
        beatInMeasure: (totalBeatsProcessed + currentBeat - 1) % 4
    };
}

// Check if a measure should be played based on loop settings
function shouldPlayMeasure(measureData) {
    if (measureData.loopIndex !== undefined) {
        return enabledLoops.has(measureData.loopIndex);
    }
    return true; // Play non-loop measures by default
}

// Calculate measure width for display
function calculateMeasureWidth(measure) {
    const totalBeats = measure.reduce((sum, chord) => sum + chord.beats, 0);
    return Math.max(180, 140 + (totalBeats * 20));
}

// Create preparation measure
function createPreparationMeasure() {
    return {
        lineIdx: -1,
        measureIndex: 0,
        chords: [{ chord: "הכנה", beats: 4 }],
        totalBeats: 4,
        measureStartBeat: 0,
        isCurrent: false,
        isPast: false,
        startChordIdx: 0,
        isPreparation: true
    };
}

// Enhanced chord rendering with loop organization, preparation measure and repeat display
function renderChords() {
    const wrapper = document.getElementById("chords-wrapper");
    wrapper.innerHTML = "";

    let globalBeatCount = 0;
    let allMeasures = [];

    // חישוב המיקום הנוכחי
    const currentPosition = calculateCurrentPosition();

    // Add preparation measure if enabled
    if (addPreparationMeasure) {
        const prepMeasure = createPreparationMeasure();
        prepMeasure.isCurrent = (currentPosition.globalMeasureIndex === 0);
        prepMeasure.isPast = (currentPosition.globalMeasureIndex > 0);
        allMeasures.push(prepMeasure);
        globalBeatCount += 4;
    }

    // Process measures from chord data
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
                const measureGlobalIndex = allMeasures.length;

                // קביעה האם זו התיבה הנוכחית או שעברה
                const isCurrent = (measureGlobalIndex === currentPosition.globalMeasureIndex);
                const isPast = (measureGlobalIndex < currentPosition.globalMeasureIndex);

                // Determine which loop this measure belongs to
                let loopIndex = null;
                if (loops.length > 0) {
                    let totalMeasuresInPreviousLoops = 0;
                    for (let i = 0; i < loops.length; i++) {
                        const measuresInThisLoop = loops[i].measureCount * (loops[i].repeatCount || 1);
                        if (allMeasures.length - (addPreparationMeasure ? 1 : 0) < totalMeasuresInPreviousLoops + measuresInThisLoop) {
                            loopIndex = i;
                            break;
                        }
                        totalMeasuresInPreviousLoops += measuresInThisLoop;
                    }
                }

                const measureData = {
                    lineIdx,
                    measureIndex: allMeasures.length + 1,
                    chords: [...currentMeasure],
                    totalBeats,
                    measureStartBeat,
                    isCurrent,
                    isPast,
                    startChordIdx: chordIdx - currentMeasure.length + 1,
                    loopIndex: loopIndex,
                    globalIndex: measureGlobalIndex
                };

                allMeasures.push(measureData);
                globalBeatCount += totalBeats;

                // Reset for next measure
                totalBeats = 0;
                currentMeasure = [];
            }
        });
    });

    // Render measures organized by loops
    if (loops.length > 0) {
        renderMeasuresByLoops(wrapper, allMeasures);
    } else {
        renderMeasuresFlat(wrapper, allMeasures);
    }

    updateBeatDots();
}

// Render measures organized by loop sections with repeat display
function renderMeasuresByLoops(wrapper, allMeasures) {
    let measureIndex = 0;

    // Render preparation measure if exists
    if (addPreparationMeasure && allMeasures[0].isPreparation) {
        const prepSection = document.createElement("div");
        prepSection.className = "loop-section preparation-section";

        const prepHeader = document.createElement("div");
        prepHeader.className = "loop-header";
        prepHeader.innerHTML = `
            <span class="loop-title">⏳ הכנה לתחילת השיר</span>
        `;

        const prepContent = document.createElement("div");
        prepContent.className = "loop-content";

        const prepRow = document.createElement("div");
        prepRow.className = "chord-row";
        prepRow.appendChild(createMeasureElement(allMeasures[0], 0));

        prepContent.appendChild(prepRow);
        prepSection.appendChild(prepHeader);
        prepSection.appendChild(prepContent);
        wrapper.appendChild(prepSection);

        measureIndex = 1;
    }

    // Render loop sections with repeat information
    loops.forEach((loop, loopIdx) => {
        const repeatCount = loop.repeatCount || 1;
        const currentRepeat = currentRepeatCycle[loopIdx] || 1;

        // Create multiple sections for each repeat if repeatCount > 1
        for (let repeatNum = 1; repeatNum <= repeatCount; repeatNum++) {
            const loopSection = document.createElement("div");
            loopSection.className = "loop-section";
            loopSection.dataset.loopIndex = loopIdx;
            loopSection.dataset.repeatNumber = repeatNum;

            // Highlight current repeat
            if (repeatNum === currentRepeat) {
                loopSection.classList.add("current-repeat");
            } else if (repeatNum < currentRepeat) {
                loopSection.classList.add("past-repeat");
            }

            const loopHeader = document.createElement("div");
            loopHeader.className = "loop-header";

            let titleText = loop.name;
            if (repeatCount > 1) {
                titleText += ` - חזרה ${repeatNum}/${repeatCount}`;
            }

            loopHeader.innerHTML = `
                <div class="loop-title-controls">
                    <button class="loop-toggle-btn" onclick="toggleLoopVisibility(${loopIdx})">
                        ${loopStates[loopIdx].visible ? '📖' : '📕'}
                    </button>
                    <span class="loop-title">${titleText}</span>
                    <span class="loop-measures-count">${loop.measureCount} תיבות</span>
                </div>
                <div class="loop-controls">
                    <label class="loop-enable-checkbox">
                        <input type="checkbox" ${loopStates[loopIdx].enabled ? 'checked' : ''}
                               onchange="toggleLoopEnabled(${loopIdx})">
                        <span class="loop-checkbox-label">כלול בניגון</span>
                    </label>
                </div>
            `;

            const loopContent = document.createElement("div");
            loopContent.className = "loop-content";
            loopContent.style.display = loopStates[loopIdx].visible ? 'block' : 'none';

            // Add measures for this loop (same measures for each repeat)
            const loopMeasures = allMeasures.slice(measureIndex, measureIndex + loop.measureCount);

            // Group measures into rows of 4
            for (let i = 0; i < loopMeasures.length; i += 4) {
                const rowMeasures = loopMeasures.slice(i, i + 4);
                const rowDiv = document.createElement("div");
                rowDiv.className = "chord-row";

                rowMeasures.forEach((measureData, idx) => {
                    // עדכון הגלובל אינדקס עבור כל חזרה
                    const adjustedMeasureData = {...measureData};
                    const originalMeasureIndex = measureIndex + i + idx;
                    const adjustedGlobalIndex = addPreparationMeasure ?
                        1 + (loopIdx * loop.measureCount * repeatCount) + ((repeatNum - 1) * loop.measureCount) + (i + idx) :
                        (loopIdx * loop.measureCount * repeatCount) + ((repeatNum - 1) * loop.measureCount) + (i + idx);

                    adjustedMeasureData.globalIndex = adjustedGlobalIndex;
                    adjustedMeasureData.measureIndex = adjustedGlobalIndex + 1;

                    // עדכון סטטוס current/past בהתבסס על המיקום הגלובלי המעודכן
                    const currentPosition = calculateCurrentPosition();
                    adjustedMeasureData.isCurrent = (adjustedGlobalIndex === currentPosition.globalMeasureIndex);
                    adjustedMeasureData.isPast = (adjustedGlobalIndex < currentPosition.globalMeasureIndex);

                    rowDiv.appendChild(createMeasureElement(adjustedMeasureData, adjustedGlobalIndex));
                });

                loopContent.appendChild(rowDiv);
            }

            loopSection.appendChild(loopHeader);
            loopSection.appendChild(loopContent);
            wrapper.appendChild(loopSection);
        }

        // Only increment measureIndex once per original loop
        measureIndex += loop.measureCount;
    });
}

// Render measures in flat layout (fallback)
function renderMeasuresFlat(wrapper, allMeasures) {
    for (let i = 0; i < allMeasures.length; i += 4) {
        const rowMeasures = allMeasures.slice(i, i + 4);
        const rowDiv = document.createElement("div");
        rowDiv.className = "chord-row";

        rowMeasures.forEach((measureData, idx) => {
            rowDiv.appendChild(createMeasureElement(measureData, i + idx));
        });

        wrapper.appendChild(rowDiv);
    }
}

// Create individual measure element
function createMeasureElement(measureData, globalIndex) {
    const measureDiv = document.createElement("div");
    measureDiv.className = "measure-box clickable";
    measureDiv.dataset.globalIndex = globalIndex;

    if (measureData.isPreparation) {
        measureDiv.classList.add("preparation-measure");
    }

    // Style based on loop enabled state
    if (measureData.loopIndex !== undefined && !enabledLoops.has(measureData.loopIndex)) {
        measureDiv.classList.add("disabled-measure");
    }

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
    title.innerText = measureData.isPreparation ? "הכנה" : `תיבה ${measureData.measureIndex}`;
    measureDiv.appendChild(title);

    // Chords container
    const chordsContainer = document.createElement("div");
    chordsContainer.className = "chords-in-measure";

    measureData.chords.forEach(chord => {
        const chordBox = document.createElement("div");
        chordBox.className = "chord-box";

        if (measureData.isPreparation) {
            chordBox.classList.add("preparation-chord");
        }

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
        dot.dataset.measureGlobalIndex = globalIndex;
        beatsContainer.appendChild(dot);
    }

    measureDiv.appendChild(beatsContainer);

    // Click handler
    measureDiv.addEventListener("click", () => {
        if (measureData.isPreparation) {
            selectedStartLine = null;
            selectedStartChord = null;
        } else {
            selectedStartLine = measureData.lineIdx;
            selectedStartChord = measureData.startChordIdx;
        }

        document.querySelectorAll('.measure-box').forEach(box => {
            box.classList.remove('selected');
        });
        measureDiv.classList.add('selected');

        const infoDiv = document.getElementById("selected-measure-info");
        const infoText = infoDiv.querySelector('.info-text');
        if (measureData.isPreparation) {
            infoText.textContent = `נבחרה תיבת ההכנה - לחץ "החל לנגן" כדי להתחיל עם הכנה`;
        } else {
            infoText.textContent = `נבחרה תיבה ${measureData.measureIndex} - לחץ "החל לנגן" כדי להתחיל מכאן`;
        }
        infoDiv.style.display = "block";

        setTimeout(() => {
            infoDiv.style.opacity = "0";
            setTimeout(() => {
                infoDiv.style.display = "none";
                infoDiv.style.opacity = "1";
            }, 300);
        }, 4000);
    });

    return measureDiv;
}

// Toggle loop visibility
function toggleLoopVisibility(loopIndex) {
    loopStates[loopIndex].visible = !loopStates[loopIndex].visible;
    renderChords();
}

// Toggle loop enabled state
function toggleLoopEnabled(loopIndex) {
    loopStates[loopIndex].enabled = !loopStates[loopIndex].enabled;

    if (loopStates[loopIndex].enabled) {
        enabledLoops.add(loopIndex);
    } else {
        enabledLoops.delete(loopIndex);
    }

    renderChords();
}

// Initialize song parts controls
function initializeSongPartsControls() {
    const container = document.getElementById("song-parts-controls");
    container.innerHTML = "";

    if (loops.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 12px;">השיר לא מחולק ללופים</p>';
        return;
    }

    loops.forEach((loop, index) => {
        const controlDiv = document.createElement("div");
        controlDiv.className = "song-part-control";
        controlDiv.innerHTML = `
            <label class="song-part-checkbox">
                <input type="checkbox" ${enabledLoops.has(index) ? 'checked' : ''}
                       onchange="toggleLoopFromControls(${index})">
                <span class="song-part-name">${loop.name}</span>
            </label>
        `;
        container.appendChild(controlDiv);
    });
}

// Toggle loop from side controls
function toggleLoopFromControls(loopIndex) {
    toggleLoopEnabled(loopIndex);
    // Also update the main loop checkbox
    const mainCheckbox = document.querySelector(`[data-loop-index="${loopIndex}"] input[type="checkbox"]`);
    if (mainCheckbox) {
        mainCheckbox.checked = enabledLoops.has(loopIndex);
    }
}

// Beat dots update - תיקון לעבודה עם חזרות
function updateBeatDots() {
    // Reset all dots
    document.querySelectorAll(".beat-dot").forEach(dot => {
        dot.classList.remove("active", "played");
    });

    const currentPosition = calculateCurrentPosition();

    // Update dots
    document.querySelectorAll(".beat-dot").forEach(dot => {
        const measureGlobalIndex = parseInt(dot.dataset.measureGlobalIndex);
        const beatIndex = parseInt(dot.dataset.beatIndex);

        if (measureGlobalIndex < currentPosition.globalMeasureIndex) {
            dot.classList.add("played");
        } else if (measureGlobalIndex === currentPosition.globalMeasureIndex && beatIndex <= currentPosition.beatInMeasure) {
            if (beatIndex === currentPosition.beatInMeasure) {
                dot.classList.add("active");
            } else {
                dot.classList.add("played");
            }
        }
    });
}

// Enhanced playback with loop support and repeat management
function startPlayback() {
    stopPlayback();

    bpm = parseInt(document.getElementById("bpm-slider").value);
    intervalMs = 60000 / bpm;
    document.getElementById("current-bpm").innerText = bpm;

    // Reset repeat cycles
    loops.forEach((loop, index) => {
        currentRepeatCycle[index] = 1;
    });

    // Handle preparation measure or selected start position
    if (selectedStartLine === null && selectedStartChord === null && addPreparationMeasure) {
        // Start with preparation measure
        currentLineIndex = -1; // Special value for preparation
        currentChordIndexInLine = 0;
        currentBeat = 0;
        currentGlobalMeasureIndex = 0;
    } else if (selectedStartLine !== null && selectedStartChord !== null) {
        currentLineIndex = selectedStartLine;
        currentChordIndexInLine = selectedStartChord;
        currentBeat = 0;
        // חישוב המיקום הגלובלי על בסיס הבחירה
        currentGlobalMeasureIndex = calculateCurrentPosition().globalMeasureIndex;
    } else {
        currentLineIndex = 0;
        currentChordIndexInLine = 0;
        currentBeat = 0;
        currentGlobalMeasureIndex = addPreparationMeasure ? 1 : 0;
    }

    renderChords();

    // First beat - play immediately
    setTimeout(() => {
        playMetronome();
        currentBeat = 1;
        updateBeatDots();
        renderChords(); // Re-render to show current state
    }, 100);

    // Main interval
    interval = setInterval(() => {
        // Handle preparation measure
        if (currentLineIndex === -1) {
            currentBeat++;
            playMetronome();

            if (currentBeat > 4) {
                // Move to first actual measure
                currentLineIndex = 0;
                currentChordIndexInLine = 0;
                currentBeat = 1;
                currentGlobalMeasureIndex = 1;
                playMetronome();
            }
            updateBeatDots();
            renderChords();
            return;
        }

        // Regular measure handling
        if (currentLineIndex >= chords.length) {
            stopPlayback();
            return;
        }

        const line = chords[currentLineIndex];
        if (!line || currentChordIndexInLine >= line.length) {
            stopPlayback();
            return;
        }

        const chordObj = line[currentChordIndexInLine];
        const beatsThisChord = chordObj.beats || 4;

        currentBeat++;
        playMetronome();

        if (currentBeat > beatsThisChord) {
            currentBeat = 1;
            currentChordIndexInLine++;

            if (currentChordIndexInLine >= chords[currentLineIndex].length) {
                currentChordIndexInLine = 0;

                // Skip to next enabled section
                do {
                    currentLineIndex++;
                    // עדכון מיקום גלובלי כשעוברים לשורה הבאה
                    currentGlobalMeasureIndex++;
                } while (currentLineIndex < chords.length && !shouldPlayCurrentMeasure());

                if (currentLineIndex >= chords.length) {
                    stopPlayback();
                    return;
                }
            }
        }

        updateBeatDots();
        renderChords();
    }, intervalMs);
}

// Check if current measure should be played
function shouldPlayCurrentMeasure() {
    // This would need to be enhanced to properly map line/chord indices to loop indices
    // For now, we'll assume all measures are played unless specifically disabled
    return true;
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
    currentGlobalMeasureIndex = addPreparationMeasure ? 1 : 0;
    selectedStartLine = null;
    selectedStartChord = null;

    // Reset repeat cycles
    loops.forEach((loop, index) => {
        currentRepeatCycle[index] = 1;
    });

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
    const preparationCheckbox = document.getElementById("add-preparation");

    // BPM controls
    bpmSlider.addEventListener("input", (e) => {
        bpm = parseInt(e.target.value);
        bpmInput.value = bpm;
        document.getElementById("current-bpm").innerText = bpm;
        intervalMs = 60000 / bpm;

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

    // Preparation measure toggle
    preparationCheckbox.addEventListener("change", (e) => {
        addPreparationMeasure = e.target.checked;
        renderChords();
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

    // Initialize everything
    initializeSongPartsControls();
    renderChords();

    // Show keyboard shortcuts hint
    console.log("Keyboard shortcuts:");
    console.log("Space: Play/Pause");
    console.log("Ctrl+R: Restart");
    console.log("Ctrl+S: Stop");
    console.log("Arrow Up/Down: Adjust BPM");
});
