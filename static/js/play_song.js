// Enhanced Play Song JavaScript - ממשק ידידותי יותר עם כפתורי הגדלה/הקטנה וגלילה אוטומטית

// Get song data from Flask
const chords = window.songData.chords;
const loops = window.songData.loops || [];
const originalBpm = window.songData.originalBpm;

// State variables
let bpm = originalBpm;
let intervalMs = 60000 / bpm;
let interval = null;
let selectedStartMeasure = null;
let addPreparationMeasure = true;
let enabledLoops = new Set();
let loopStates = {};
const metronome = document.getElementById("metronome-sound");

// משתני גודל התיבות והפונט
let measureScale = 1.0; // גודל בסיסי של התיבות
let fontScale = 1.0;    // גודל בסיסי של הפונט

// נתונים לניהול מיקום הנגינה
let currentGlobalMeasureIndex = 0;
let currentBeatInMeasure = 0;
let selectedStartBeat = 0;
let allMeasures = [];
let isPlaying = false;

// Initialize enabled loops - all enabled by default
loops.forEach((loop, index) => {
    enabledLoops.add(index);
    loopStates[index] = { visible: true, enabled: true };
});

// Single metronome sound function
function playMetronome() {
    const volume = document.getElementById("volume-slider").value;
    metronome.volume = parseFloat(volume);
    metronome.currentTime = 0;
    metronome.play().catch(() => {});
}

// פונקציות הגדלה/הקטנה של התיבות
function increaseMeasureSize() {
    measureScale = Math.min(measureScale + 0.1, 2.0);
    updateMeasuresSizes();
    showSizeIndicator();
}

function decreaseMeasureSize() {
    measureScale = Math.max(measureScale - 0.1, 0.5);
    updateMeasuresSizes();
    showSizeIndicator();
}

function increaseFontSize() {
    fontScale = Math.min(fontScale + 0.1, 2.0);
    updateFontSizes();
    showSizeIndicator();
}

function decreaseFontSize() {
    fontScale = Math.max(fontScale - 0.1, 0.5);
    updateFontSizes();
    showSizeIndicator();
}

function resetSizes() {
    measureScale = 1.0;
    fontScale = 1.0;
    updateMeasuresSizes();
    updateFontSizes();
    showSizeIndicator();
}

function updateMeasuresSizes() {
    const measures = document.querySelectorAll('.measure-box');
    measures.forEach(measure => {
        measure.style.transform = `scale(${measureScale})`;
        measure.style.margin = `${measureScale * 3}px`;
    });
}

function updateFontSizes() {
    const chordBoxes = document.querySelectorAll('.chord-box');
    const measureTitles = document.querySelectorAll('.measure-title');

    chordBoxes.forEach(chord => {
        const baseFontSize = 16; // גודל פונט בסיסי מעודכן
        chord.style.fontSize = `${baseFontSize * fontScale}px`;
    });

    measureTitles.forEach(title => {
        const baseFontSize = 12; // גודל פונט בסיסי מעודכן
        title.style.fontSize = `${baseFontSize * fontScale}px`;
    });
}

function showSizeIndicator() {
    const indicator = document.getElementById('size-indicator');
    if (indicator) {
        indicator.innerHTML = `
            <div class="size-info">
                <span>📏 גודל תיבות: ${Math.round(measureScale * 100)}%</span>
                <span>🔤 גודל פונט: ${Math.round(fontScale * 100)}%</span>
            </div>
        `;
        indicator.style.display = 'block';
        indicator.style.opacity = '1';

        clearTimeout(indicator.hideTimeout);
        indicator.hideTimeout = setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 2000);
    }
}

// בניית מערך של כל התיבות כולל חזרות
function buildAllMeasures() {
    allMeasures = [];
    let globalIndex = 0;

    // הוסף תיבת הכנה עם מספר 0
    if (addPreparationMeasure) {
        allMeasures.push({
            globalIndex: globalIndex++,
            isPreparation: true,
            chords: [{ chord: "הכנה", beats: 4, width: 4 }],
            totalBeats: 4,
            loopIndex: null,
            repeatNumber: null,
            measureInLoop: null,
            lineIdx: -1,
            startChordIdx: 0,
            measureNumber: 0 // תיבת הכנה = 0
        });
    }

    // בנה תיבות מהאקורדים עם מיפוי ללופים ולחזרות
    if (loops.length > 0) {
        // אם יש לופים, בנה לפי הלופים והחזרות שלהם
        loops.forEach((loop, loopIdx) => {
            const repeatCount = loop.repeatCount || 1;

            for (let repeatNum = 1; repeatNum <= repeatCount; repeatNum++) {
                // עבור כל תיבה בלופ
                for (let measureInLoop = 0; measureInLoop < loop.measureCount; measureInLoop++) {
                    const measure = loop.measures[measureInLoop];

                    allMeasures.push({
                        globalIndex: globalIndex++,
                        isPreparation: false,
                        chords: measure.chords,
                        totalBeats: measure.beats,
                        loopIndex: loopIdx,
                        repeatNumber: repeatNum,
                        measureInLoop: measureInLoop,
                        lineIdx: -1,
                        startChordIdx: 0,
                        measureNumber: globalIndex - (addPreparationMeasure ? 1 : 0) // מספר התיבה מתחיל מ-1 אחרי ההכנה
                    });
                }
            }
        });
    } else {
        // אם אין לופים, בנה מהאקורדים הישנים
        chords.forEach((line, lineIdx) => {
            let totalBeats = 0;
            let currentMeasure = [];
            let chordIdx = 0;

            line.forEach((chordObj) => {
                const chordWithWidth = {
                    ...chordObj,
                    width: chordObj.beats || 1
                };
                currentMeasure.push(chordWithWidth);
                totalBeats += chordObj.beats;

                if (Math.abs(totalBeats - 4) < 0.01 || totalBeats > 4 || chordIdx === line.length - 1) {
                    allMeasures.push({
                        globalIndex: globalIndex++,
                        isPreparation: false,
                        chords: [...currentMeasure],
                        totalBeats: totalBeats,
                        loopIndex: null,
                        repeatNumber: null,
                        measureInLoop: null,
                        lineIdx: lineIdx,
                        startChordIdx: chordIdx - currentMeasure.length + 1,
                        measureNumber: globalIndex - (addPreparationMeasure ? 1 : 0)
                    });

                    totalBeats = 0;
                    currentMeasure = [];
                }
                chordIdx++;
            });
        });
    }

    return allMeasures;
}

// Enhanced chord rendering עם הצגה של 4 תיבות בשורה תמיד ומספור נכון
function renderChords() {
    const wrapper = document.getElementById("chords-wrapper");
    wrapper.innerHTML = "";

    const measures = buildAllMeasures();

    // Render preparation measure if exists
    if (addPreparationMeasure && measures[0] && measures[0].isPreparation) {
        const prepSection = document.createElement("div");
        prepSection.className = "loop-section preparation-section";

        const prepHeader = document.createElement("div");
        prepHeader.className = "loop-header";
        prepHeader.innerHTML = `<span class="loop-title">⏳ הכנה לתחילת השיר</span>`;

        const prepContent = document.createElement("div");
        prepContent.className = "loop-content";

        const prepRow = document.createElement("div");
        prepRow.className = "chord-row fixed-four-per-row";
        prepRow.appendChild(createMeasureElement(measures[0]));

        // הוסף 3 תיבות ריקות כדי להשלים ל-4
        for (let i = 0; i < 3; i++) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "measure-box empty-measure";
            prepRow.appendChild(emptyDiv);
        }

        prepContent.appendChild(prepRow);
        prepSection.appendChild(prepHeader);
        prepSection.appendChild(prepContent);
        wrapper.appendChild(prepSection);
    }

    // Render loop sections with 4 measures per row
    if (loops.length > 0) {
        renderMeasuresByLoops(wrapper, measures);
    } else {
        renderMeasuresFlat(wrapper, measures);
    }

    updateBeatDots();
    updateMeasuresSizes();
    updateFontSizes();

    // גלילה אוטומטית לתיבה הנוכחית
    scrollToCurrentMeasure();
}

// פונקציה לגלילה אוטומטית
function scrollToCurrentMeasure() {
    if (!isPlaying) return;

    const currentMeasureElement = document.querySelector(`[data-global-index="${currentGlobalMeasureIndex}"]`);
    if (currentMeasureElement) {
        // גלל לתיבה עם אנימציה חלקה
        currentMeasureElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });

        // הוסף הדגשה לתיבה הנוכחית
        highlightCurrentSection(currentMeasureElement);
    }
}

// פונקציה להדגשת הקטע הנוכחי
function highlightCurrentSection(measureElement) {
    // הסר הדגשות קודמות
    document.querySelectorAll('.current-playing-section').forEach(section => {
        section.classList.remove('current-playing-section');
    });

    // הוסף הדגשה לקטע הנוכחי
    const parentSection = measureElement.closest('.loop-section');
    if (parentSection) {
        parentSection.classList.add('current-playing-section');
    }
}

// Render measures organized by loop sections - 4 per row with auto-scroll
function renderMeasuresByLoops(wrapper, measures) {
    const loopSections = new Map();

    // Group measures by loop and repeat
    measures.forEach(measure => {
        if (measure.isPreparation) return;

        if (measure.loopIndex !== null) {
            const loop = loops[measure.loopIndex];
            const key = `${measure.loopIndex}-${measure.repeatNumber}`;

            if (!loopSections.has(key)) {
                loopSections.set(key, {
                    loop: loop,
                    loopIndex: measure.loopIndex,
                    repeatNumber: measure.repeatNumber,
                    measures: []
                });
            }

            loopSections.get(key).measures.push(measure);
        }
    });

    // Render each loop section
    loopSections.forEach(section => {
        const loopSection = document.createElement("div");
        loopSection.className = "loop-section";
        loopSection.dataset.loopIndex = section.loopIndex;
        loopSection.dataset.repeatNumber = section.repeatNumber;
        loopSection.id = `loop-${section.loopIndex}-repeat-${section.repeatNumber}`;

        // Highlight current section
        const currentMeasure = measures[currentGlobalMeasureIndex];
        if (currentMeasure && currentMeasure.loopIndex === section.loopIndex &&
            currentMeasure.repeatNumber === section.repeatNumber && isPlaying) {
            loopSection.classList.add("current-repeat");
        }

        const loopHeader = document.createElement("div");
        loopHeader.className = "loop-header";

        let titleText = section.loop.name;
        const totalRepeats = section.loop.repeatCount || 1;
        if (totalRepeats > 1) {
            titleText += ` - חזרה ${section.repeatNumber}/${totalRepeats}`;
        }

        loopHeader.innerHTML = `
            <div class="loop-title-controls">
                <button class="loop-toggle-btn" onclick="toggleLoopVisibility(${section.loopIndex})">
                    ${loopStates[section.loopIndex].visible ? '📖' : '📕'}
                </button>
                <span class="loop-title">${titleText}</span>
                <span class="loop-measures-count">${section.loop.measureCount} תיבות</span>
            </div>
            <div class="loop-controls">
                <label class="loop-enable-checkbox">
                    <input type="checkbox" ${loopStates[section.loopIndex].enabled ? 'checked' : ''}
                           onchange="toggleLoopEnabled(${section.loopIndex})">
                    <span class="loop-checkbox-label">כלול בניגון</span>
                </label>
            </div>
        `;

        const loopContent = document.createElement("div");
        loopContent.className = "loop-content";
        loopContent.style.display = loopStates[section.loopIndex].visible ? 'block' : 'none';

        // Group measures into rows - ALWAYS 4 per row
        const measuresPerRow = 4;
        for (let i = 0; i < section.measures.length; i += measuresPerRow) {
            const rowMeasures = section.measures.slice(i, i + measuresPerRow);
            const rowDiv = document.createElement("div");
            rowDiv.className = "chord-row fixed-four-per-row";

            rowMeasures.forEach(measureData => {
                rowDiv.appendChild(createMeasureElement(measureData));
            });

            // מלא תיבות ריקות עד 4 תמיד
            while (rowDiv.children.length < 4) {
                const emptyDiv = document.createElement("div");
                emptyDiv.className = "measure-box empty-measure";
                rowDiv.appendChild(emptyDiv);
            }

            loopContent.appendChild(rowDiv);
        }

        loopSection.appendChild(loopHeader);
        loopSection.appendChild(loopContent);
        wrapper.appendChild(loopSection);
    });
}

// Render measures in flat layout - 4 per row
function renderMeasuresFlat(wrapper, measures) {
    const measuresPerRow = 4;
    for (let i = 0; i < measures.length; i += measuresPerRow) {
        const rowMeasures = measures.slice(i, i + measuresPerRow);
        const rowDiv = document.createElement("div");
        rowDiv.className = "chord-row fixed-four-per-row";

        rowMeasures.forEach(measureData => {
            rowDiv.appendChild(createMeasureElement(measureData));
        });

        // מלא תיבות ריקות עד 4 תמיד
        while (rowDiv.children.length < 4) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "measure-box empty-measure";
            rowDiv.appendChild(emptyDiv);
        }

        wrapper.appendChild(rowDiv);
    }
}

// Create individual measure element with improved user experience and correct numbering
function createMeasureElement(measureData) {
    const measureDiv = document.createElement("div");
    measureDiv.className = "measure-box clickable";
    measureDiv.dataset.globalIndex = measureData.globalIndex;

    if (measureData.isPreparation) {
        measureDiv.classList.add("preparation-measure");
    }

    // Style based on loop enabled state
    if (measureData.loopIndex !== null && !enabledLoops.has(measureData.loopIndex)) {
        measureDiv.classList.add("disabled-measure");
    }

    // Set current/past state
    if (measureData.globalIndex === currentGlobalMeasureIndex && isPlaying) {
        measureDiv.classList.add("current");
    } else if (measureData.globalIndex < currentGlobalMeasureIndex && isPlaying) {
        measureDiv.classList.add("past");
    }

    // Measure title with correct numbering
    const title = document.createElement("div");
    title.className = "measure-title";
    if (measureData.isPreparation) {
        title.innerText = "תיבה 0 - הכנה";
    } else {
        title.innerText = `תיבה ${measureData.measureNumber}`;
    }
    measureDiv.appendChild(title);

    // Chords container
    const chordsContainer = document.createElement("div");
    chordsContainer.className = "chords-in-measure";

    let currentBeatPosition = 0;
    measureData.chords.forEach((chord, chordIdx) => {
        const chordBox = document.createElement("div");
        chordBox.className = "chord-box";
        chordBox.dataset.chordIndex = chordIdx;
        chordBox.dataset.beatPosition = currentBeatPosition;

        if (measureData.isPreparation) {
            chordBox.classList.add("preparation-chord");
        }

        // חישוב הרוחב היחסי של האקורד לפי כמות הנקישות שלו
        const chordBeats = chord.width || chord.beats || 1;
        const flexBasis = (chordBeats / measureData.totalBeats) * 100;
        chordBox.style.flexBasis = `${flexBasis}%`;
        chordBox.style.flexGrow = "0";
        chordBox.style.flexShrink = "0";

        chordBox.innerText = chord.chord;

        // הוסף אפשרות לקליק על אקורד ספציפי
        chordBox.addEventListener("click", (e) => {
            e.stopPropagation();
            selectedStartMeasure = measureData.globalIndex;
            selectedStartBeat = currentBeatPosition;

            // הסר בחירות קודמות
            document.querySelectorAll('.measure-box').forEach(box => {
                box.classList.remove('selected');
            });
            document.querySelectorAll('.chord-box').forEach(box => {
                box.classList.remove('selected-chord');
            });

            // סמן את התיבה והאקורד
            measureDiv.classList.add('selected');
            chordBox.classList.add('selected-chord');

            if (measureData.isPreparation) {
                showSelectionInfo(`נבחר אקורד ${chord.chord} בתיבת ההכנה - לחץ "החל לנגן" כדי להתחיל מכאן`);
            } else {
                showSelectionInfo(`נבחר אקורד ${chord.chord} בתיבה ${measureData.measureNumber} - לחץ "החל לנגן" כדי להתחיל מכאן`);
            }
        });

        chordsContainer.appendChild(chordBox);
        currentBeatPosition += chordBeats;
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
        dot.dataset.measureGlobalIndex = measureData.globalIndex;
        beatsContainer.appendChild(dot);
    }

    measureDiv.appendChild(beatsContainer);

    // Click handler for starting playback from this measure
    measureDiv.addEventListener("click", () => {
        selectedStartMeasure = measureData.globalIndex;

        document.querySelectorAll('.measure-box').forEach(box => {
            box.classList.remove('selected');
        });
        measureDiv.classList.add('selected');

        if (measureData.isPreparation) {
            showSelectionInfo(`נבחרה תיבת ההכנה - לחץ "החל לנגן" כדי להתחיל עם הכנה`);
        } else {
            showSelectionInfo(`נבחרה תיבה ${measureData.measureNumber} - לחץ "החל לנגן" כדי להתחיל מכאן`);
        }
    });

    return measureDiv;
}

// פונקציה לוידואלית המידע לבחירה
function showSelectionInfo(message) {
    const infoDiv = document.getElementById("selected-measure-info");
    const infoText = infoDiv.querySelector('.info-text');
    infoText.textContent = message;
    infoDiv.style.display = "block";

    setTimeout(() => {
        infoDiv.style.opacity = "0";
        setTimeout(() => {
            infoDiv.style.display = "none";
            infoDiv.style.opacity = "1";
        }, 300);
    }, 4000);
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
}

// Beat dots update with chord tracking
function updateBeatDots() {
    // Reset all dots and chords
    document.querySelectorAll(".beat-dot").forEach(dot => {
        dot.classList.remove("active", "played");
    });

    document.querySelectorAll(".chord-box").forEach(chord => {
        chord.classList.remove("current-chord", "played-chord");
    });

    // Update dots and chords based on current position
    const measures = buildAllMeasures();
    const currentMeasure = measures[currentGlobalMeasureIndex];

    if (!currentMeasure) return;

    // Update beat dots
    document.querySelectorAll(".beat-dot").forEach(dot => {
        const measureGlobalIndex = parseInt(dot.dataset.measureGlobalIndex);
        const beatIndex = parseInt(dot.dataset.beatIndex);

        if (measureGlobalIndex < currentGlobalMeasureIndex) {
            dot.classList.add("played");
        } else if (measureGlobalIndex === currentGlobalMeasureIndex && beatIndex <= currentBeatInMeasure) {
            if (beatIndex === currentBeatInMeasure) {
                dot.classList.add("active");
            } else {
                dot.classList.add("played");
            }
        }
    });

    // Update current chord highlighting
    if (isPlaying && currentMeasure) {
        const measureElement = document.querySelector(`[data-global-index="${currentGlobalMeasureIndex}"]`);
        if (measureElement) {
            const chordBoxes = measureElement.querySelectorAll('.chord-box');
            let currentBeatPosition = 0;

            chordBoxes.forEach((chordBox, index) => {
                const chord = currentMeasure.chords[index];
                if (!chord) return;

                const chordBeats = chord.width || chord.beats || 1;
                const chordStartBeat = currentBeatPosition;
                const chordEndBeat = currentBeatPosition + chordBeats;

                if (currentBeatInMeasure >= chordStartBeat && currentBeatInMeasure < chordEndBeat) {
                    chordBox.classList.add("current-chord");
                } else if (currentBeatInMeasure >= chordEndBeat) {
                    chordBox.classList.add("played-chord");
                }

                currentBeatPosition += chordBeats;
            });
        }
    }
}

// Enhanced playback with proper measure and beat tracking + auto-scroll
function startPlayback() {
    stopPlayback();

    bpm = parseInt(document.getElementById("bpm-slider").value);
    intervalMs = 60000 / bpm;
    document.getElementById("current-bpm").innerText = bpm;

    const measures = buildAllMeasures();

    // Set starting position
    if (selectedStartMeasure !== null) {
        currentGlobalMeasureIndex = selectedStartMeasure;
    } else {
        currentGlobalMeasureIndex = 0;
    }

    currentBeatInMeasure = 0;
    isPlaying = true;

    renderChords();

    // Check if starting measure should be played
    const startMeasure = measures[currentGlobalMeasureIndex];
    if (startMeasure && startMeasure.loopIndex !== null && !enabledLoops.has(startMeasure.loopIndex)) {
        // Skip to next enabled measure
        findNextEnabledMeasure(measures);
    }

    // First beat - play immediately
    setTimeout(() => {
        playMetronome();
        currentBeatInMeasure = 0;
        updateBeatDots();
        renderChords();
        scrollToCurrentMeasure(); // גלילה אוטומטית
    }, 100);

    // Main interval
    interval = setInterval(() => {
        const currentMeasure = measures[currentGlobalMeasureIndex];

        if (!currentMeasure) {
            stopPlayback();
            return;
        }

        // Check if current measure should be played
        if (currentMeasure.loopIndex !== null && !enabledLoops.has(currentMeasure.loopIndex)) {
            findNextEnabledMeasure(measures);
            return;
        }

        currentBeatInMeasure++;
        playMetronome();

        // Check if we've completed this measure
        if (currentBeatInMeasure >= Math.round(currentMeasure.totalBeats)) {
            currentGlobalMeasureIndex++;
            currentBeatInMeasure = 0;

            // Check if we've reached the end
            if (currentGlobalMeasureIndex >= measures.length) {
                stopPlayback();
                return;
            }

            // גלילה אוטומטית לתיבה הבאה
            scrollToCurrentMeasure();
        }

        updateBeatDots();
        renderChords();
        updatePlayingInfo();
    }, intervalMs);
}

// Find next enabled measure
function findNextEnabledMeasure(measures) {
    while (currentGlobalMeasureIndex < measures.length) {
        const measure = measures[currentGlobalMeasureIndex];
        if (!measure) break;

        if (measure.isPreparation || measure.loopIndex === null || enabledLoops.has(measure.loopIndex)) {
            break;
        }

        currentGlobalMeasureIndex++;
    }

    if (currentGlobalMeasureIndex >= measures.length) {
        stopPlayback();
    } else {
        // גלילה אוטומטית לתיבה החדשה
        scrollToCurrentMeasure();
    }
}

function stopPlayback() {
    clearInterval(interval);
    interval = null;
    isPlaying = false;

    // הסר הדגשות של נגינה
    document.querySelectorAll('.current-playing-section').forEach(section => {
        section.classList.remove('current-playing-section');
    });

    renderChords();
    updatePlayingInfo();
}

// Update playing info display
function updatePlayingInfo() {
    const measures = buildAllMeasures();
    const currentMeasure = measures[currentGlobalMeasureIndex];

    if (!currentMeasure || !isPlaying) return;

    // Find current chord
    let currentBeatPosition = 0;
    let currentChordName = "";

    for (const chord of currentMeasure.chords) {
        const chordBeats = chord.width || chord.beats || 1;
        if (currentBeatInMeasure >= currentBeatPosition && currentBeatInMeasure < currentBeatPosition + chordBeats) {
            currentChordName = chord.chord;
            break;
        }
        currentBeatPosition += chordBeats;
    }

    if (currentMeasure.isPreparation) {
        console.log(`נוגן: תיבת הכנה (0), נקישה ${currentBeatInMeasure + 1}, אקורד: ${currentChordName}`);
    } else {
        console.log(`נוגן: תיבה ${currentMeasure.measureNumber}, נקישה ${currentBeatInMeasure + 1}, אקורד: ${currentChordName}`);
    }
}

function restartPlayback() {
    stopPlayback();
    currentGlobalMeasureIndex = 0;
    currentBeatInMeasure = 0;
    selectedStartMeasure = null;
    selectedStartBeat = 0;

    // Reset visual state
    document.getElementById("selected-measure-info").style.display = "none";
    document.querySelectorAll('.measure-box').forEach(box => {
        box.classList.remove('selected');
    });
    document.querySelectorAll('.chord-box').forEach(box => {
        box.classList.remove('selected-chord');
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
        intervalMs = 60000 / bmp;

        if (interval) {
            stopPlayback();
            startPlayback();
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
            stopPlayback();
            startPlayback();
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
                    bmpSlider.value = bpm;
                    bmpInput.value = bpm;
                    document.getElementById("current-bpm").innerText = bpm;
                    intervalMs = 60000 / bpm;
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                if (bpm > 40) {
                    bpm -= 5;
                    bmpSlider.value = bpm;
                    bmpInput.value = bpm;
                    document.getElementById("current-bpm").innerText = bpm;
                    intervalMs = 60000 / bpm;
                }
                break;
            case "Equal":
            case "NumpadAdd":
                if (e.ctrlKey) {
                    e.preventDefault();
                    increaseMeasureSize();
                } else if (e.shiftKey) {
                    e.preventDefault();
                    increaseFontSize();
                }
                break;
            case "Minus":
            case "NumpadSubtract":
                if (e.ctrlKey) {
                    e.preventDefault();
                    decreaseMeasureSize();
                } else if (e.shiftKey) {
                    e.preventDefault();
                    decreaseFontSize();
                }
                break;
            case "Digit0":
                if (e.ctrlKey) {
                    e.preventDefault();
                    resetSizes();
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
    console.log("Ctrl + / Ctrl -: Adjust measure size");
    console.log("Shift + / Shift -: Adjust font size");
    console.log("Ctrl+0: Reset sizes");
});

// My Songs functionality
let isSongInMyList = false;

// Check if song is already in my songs list
async function checkIfSongInMyList() {
    try {
        const response = await fetch(`/api/my-songs/check/${window.songData.songId}`);
        const data = await response.json();
        isSongInMyList = data.inMyList;
        updateMySongsButton();
    } catch (error) {
        console.error('Error checking my songs status:', error);
    }
}

// Toggle song in my songs list
async function toggleMySong() {
    const btn = document.getElementById('my-songs-btn');
    btn.classList.add('loading');

    try {
        const url = isSongInMyList ?
            `/api/my-songs/remove/${window.songData.songId}` :
            `/api/my-songs/add/${window.songData.songId}`;

        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            isSongInMyList = !isSongInMyList;
            updateMySongsButton();
        } else {
            alert('שגיאה: ' + (data.error || 'לא ניתן לעדכן'));
        }
    } catch (error) {
        console.error('Error toggling my song:', error);
        alert('שגיאה בחיבור לשרת');
    } finally {
        btn.classList.remove('loading');
    }
}

// Update button appearance based on status
function updateMySongsButton() {
    const btn = document.getElementById('my-songs-btn');
    const icon = document.getElementById('my-songs-icon');
    const text = document.getElementById('my-songs-text');

    if (isSongInMyList) {
        btn.classList.add('added');
        icon.textContent = '💚';
        text.textContent = 'בשירים שלי';
    } else {
        btn.classList.remove('added');
        icon.textContent = '❤️';
        text.textContent = 'הוסף לשירים שלי';
    }
}

// Initialize my songs check when page loads
if (typeof window.songData !== 'undefined') {
    checkIfSongInMyList();
}
