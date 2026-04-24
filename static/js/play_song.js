// Enhanced Play Song JavaScript - ממשק ידידותי יותר עם כפתורי הגדלה/הקטנה וגלילה אוטומטית

// Get song data from Flask
const chords = window.songData.chords;
const loops = window.songData.loops || [];
const originalBpm = window.songData.originalBpm;
const timeSignature = window.songData.timeSignature || "4/4";
const playMethod = window.songData.playMethod || "boxes";
const tabsText = window.songData.tabsText || "";
const chordsLyricsText = window.songData.chordsLyricsText || "";
const lyricsText = window.songData.lyricsText || "";

// Parse time signature to get beats per measure
function getBeatsPerMeasure(timeSig) {
    if (!timeSig || typeof timeSig !== 'string') {
        return 4; // Default to 4/4
    }
    
    const parts = timeSig.split('/');
    if (parts.length !== 2) {
        return 4; // Default to 4/4 if invalid format
    }
    
    const numerator = parseInt(parts[0]);
    const denominator = parseInt(parts[1]);
    
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        return 4; // Default to 4/4 if invalid
    }
    
    // For compound time signatures (6/8, 9/8, 12/8), the number of beats is the numerator
    // For simple time signatures (4/4, 3/4, 2/4), the number of beats is also the numerator
    // This is correct: 4/4 = 4 beats, 6/8 = 6 beats, 3/4 = 3 beats, etc.
    return numerator;
}

// Get beats per measure for current song
const beatsPerMeasure = getBeatsPerMeasure(timeSignature);

// State variables
let bpm = originalBpm;
let intervalMs = 60000 / bpm;
let interval = null;
let selectedStartMeasure = null;
let addPreparationMeasure = true;
let preparationMeasuresCount = 1; // מספר תיבות ריקות בתחילה (ברירת מחדל: 1)
let enabledLoops = new Set();
let loopStates = {};
const metronome = document.getElementById("metronome-sound");

// Transposition state
let transposeSemitones = 0; // Current transposition in semitones

// Easy version (Capo) state
let easyVersionActive = false;
let easyCapoFret = 0;
try {
    const raw = window.songData?.easyCapoFret;
    easyCapoFret = typeof raw === 'number' ? raw : parseInt(raw || 0, 10) || 0;
} catch (e) {
    easyCapoFret = 0;
}

// משתני גודל התיבות והפונט
let measureScale = 1.0; // גודל בסיסי של התיבות
let fontScale = 1.0;    // גודל בסיסי של הפונט

// נתונים לניהול מיקום הנגינה
let currentGlobalMeasureIndex = 0;
let currentBeatInMeasure = 0;
let selectedStartBeat = 0;
let allMeasures = [];
let isPlaying = false;

// Play view state (boxes/tabs/chords_lyrics/lyrics)
let currentPlayView = "boxes";

function getPlayViewStorageKey() {
    const sid = window.songData?.songId || "unknown";
    return `mfa_play_view_v1_${sid}`;
}

function setPlayView(view) {
    currentPlayView = view;
    try { localStorage.setItem(getPlayViewStorageKey(), view); } catch (e) { /* ignore */ }

    document.querySelectorAll(".play-view-btn").forEach((btn) => {
        const on = btn.getAttribute("data-play-view") === view;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    document.querySelectorAll("[data-play-view-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-play-view-panel") !== view;
    });

    // If leaving boxes while playing, stop to avoid "invisible playback"
    if (view !== "boxes" && isPlaying) {
        stopPlayback();
    }

    // Ensure boxes view is rendered when switching back
    if (view === "boxes") {
        renderChords();
    }
}

function openLyricsPanel() {
    const panel = document.getElementById("lyrics-side-panel");
    if (!panel) return;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
}

function closeLyricsPanel() {
    const panel = document.getElementById("lyrics-side-panel");
    if (!panel) return;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
}

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

// Transposition functions
// Map notes to semitone positions from C (0 semitones)
const noteToSemitones = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
};

// Map semitone positions to note names (preferring sharps for up, flats for down)
const semitonesToNote = {
    0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
    6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

const semitonesToNoteFlat = {
    0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
    6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
};

// Transpose a single chord name
function transposeChord(chordName, semitones) {
    if (!chordName || typeof chordName !== 'string') {
        return chordName;
    }
    
    // Skip preparation chords
    if (chordName.includes('הכנה') || chordName.trim() === '') {
        return chordName;
    }
    
    // Extract root note (can be 1-2 characters: C, C#, Db, etc.)
    // Match case-insensitive but convert to uppercase for lookup
    const chordMatch = chordName.match(/^([A-Ga-g][#b]?)(.*)/i);
    if (!chordMatch) {
        return chordName; // Return as-is if doesn't match pattern
    }
    
    // Convert root note to uppercase for lookup (C, C#, Db, etc.)
    let rootNote = chordMatch[1];
    if (rootNote.length === 1) {
        rootNote = rootNote.toUpperCase();
    } else {
        rootNote = rootNote.charAt(0).toUpperCase() + rootNote.slice(1);
    }
    const suffix = chordMatch[2]; // Everything after the root note (m, maj, dim, etc.)
    
    // Get semitone position of root note
    const rootSemitones = noteToSemitones[rootNote];
    if (rootSemitones === undefined) {
        return chordName; // Unknown note, return as-is
    }
    
    // Calculate new semitone position
    let newSemitones = (rootSemitones + semitones) % 12;
    if (newSemitones < 0) {
        newSemitones += 12;
    }
    
    // Choose note name based on whether transposing up or down
    // Prefer sharps when going up, flats when going down (or keep original preference)
    let newRootNote;
    if (rootNote.includes('#')) {
        // Original was sharp, prefer sharp
        newRootNote = semitonesToNote[newSemitones];
    } else if (rootNote.includes('b')) {
        // Original was flat, prefer flat
        newRootNote = semitonesToNoteFlat[newSemitones];
    } else {
        // Natural note - prefer sharp when going up, flat when going down
        if (semitones >= 0) {
            newRootNote = semitonesToNote[newSemitones];
        } else {
            newRootNote = semitonesToNoteFlat[newSemitones];
        }
    }
    
    return newRootNote + suffix;
}

function transposeUp() {
    const input = document.getElementById('transpose-input');
    const slider = document.getElementById('transpose-slider');
    let currentValue = parseFloat(input.value) || 0;
    
    if (currentValue < 6) {
        currentValue = Math.min(currentValue + 0.5, 6);
        input.value = currentValue;
        slider.value = currentValue;
        transposeSemitones = currentValue * 2; // Convert tones to semitones
        updateTransposeInfo();
        renderChords();
    }
}

function transposeDown() {
    const input = document.getElementById('transpose-input');
    const slider = document.getElementById('transpose-slider');
    let currentValue = parseFloat(input.value) || 0;
    
    if (currentValue > -6) {
        currentValue = Math.max(currentValue - 0.5, -6);
        input.value = currentValue;
        slider.value = currentValue;
        transposeSemitones = currentValue * 2; // Convert tones to semitones
        updateTransposeInfo();
        renderChords();
    }
}

function resetTranspose() {
    const input = document.getElementById('transpose-input');
    const slider = document.getElementById('transpose-slider');
    input.value = 0;
    slider.value = 0;
    transposeSemitones = 0;
    setEasyVersionActive(false);
    updateTransposeInfo();
    renderChords();
}

function setEasyVersionActive(active) {
    easyVersionActive = !!active;
    const btn = document.getElementById('easy-version-btn');
    const hint = document.getElementById('easy-version-hint');
    if (btn) btn.classList.toggle('active', easyVersionActive);
    if (hint) hint.style.display = easyVersionActive ? 'block' : 'none';
}

function applyTransposeBySemitones(semitones) {
    // UI uses "tones" with 0.5 tone steps => 1 semitone per step
    const tonesValue = semitones / 2;
    const input = document.getElementById('transpose-input');
    const slider = document.getElementById('transpose-slider');
    if (!input || !slider) return;

    // Clamp to UI min/max
    let v = tonesValue;
    if (v < -6) v = -6;
    if (v > 6) v = 6;

    input.value = v;
    slider.value = v;
    transposeSemitones = Math.round(v * 2);
    updateTransposeInfo();
    renderChords();
}

function toggleEasyCapoVersion() {
    if (!easyCapoFret || easyCapoFret <= 0) return;

    const next = !easyVersionActive;
    setEasyVersionActive(next);

    if (next) {
        // Each capo fret is a semitone. To keep original key, we transpose DOWN by fret count.
        applyTransposeBySemitones(-easyCapoFret);
        const hint = document.getElementById('easy-version-hint');
        if (hint) {
            hint.textContent = `יש להניח את הקאפו על סריג מספר ${easyCapoFret} בשביל לנגן בסולם המקורי של השיר.`;
        }
    } else {
        applyTransposeBySemitones(0);
    }
}

function updateTransposeInfo() {
    const info = document.getElementById('transpose-info');
    const tones = transposeSemitones / 2;
    const semitones = transposeSemitones;
    let text = `שינוי: ${tones >= 0 ? '+' : ''}${tones} טונים (${semitones >= 0 ? '+' : ''}${semitones} סמיטונים)`;
    
    if (transposeSemitones === 0) {
        text = 'שינוי: 0 טונים (0 סמיטונים)';
    }
    
    info.innerHTML = `<span>${text}</span>`;
}

function renderNotesTagSummary() {
    const tagsWrap = document.getElementById('notes-tags-list');
    const summary = document.getElementById('notes-tags-summary');
    if (!tagsWrap || !summary) return;
    const tags = Array.from(tagsWrap.querySelectorAll('.note-tag'))
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean);
    if (tags.length === 0) return;

    const counts = new Map();
    tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}×${n}`);

    summary.textContent = `חזרות בסוגי הערות: ${sorted.join(' · ')}`;
    summary.style.display = 'block';
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

    // הוסף תיבות הכנה (כולן עם אותו מראה כתום; הראשונה "תיבה 0", הנוספות "תיבה ריקה" לתצוגה)
    if (addPreparationMeasure) {
        const count = Math.max(1, Math.min(8, preparationMeasuresCount));
        for (let i = 0; i < count; i++) {
            allMeasures.push({
                globalIndex: globalIndex++,
                isPreparation: true,
                isEmptyPreparation: i > 0, // לכותרת בלבד – "תיבה ריקה" מול "תיבה 0 - הכנה"
                chords: [{ chord: "הכנה", beats: beatsPerMeasure, width: beatsPerMeasure }],
                totalBeats: beatsPerMeasure,
                loopIndex: null,
                repeatNumber: null,
                measureInLoop: null,
                lineIdx: -1,
                startChordIdx: 0,
                measureNumber: 0
            });
        }
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
                    
                    // Use time signature beats instead of stored measure.beats
                    // Calculate ratio to preserve chord proportions
                    const storedBeats = measure.beats && measure.beats > 0 ? measure.beats : 4; // Default to 4 if not specified or invalid
                    const ratio = storedBeats > 0 ? beatsPerMeasure / storedBeats : 1; // Prevent division by zero
                    
                    // Scale chord widths to match new time signature
                    const scaledChords = measure.chords.map(chord => ({
                        ...chord,
                        width: Math.round((chord.width || storedBeats) * ratio),
                        beats: Math.round((chord.beats || chord.width || storedBeats) * ratio)
                    }));

                    allMeasures.push({
                        globalIndex: globalIndex++,
                        isPreparation: false,
                        chords: scaledChords,
                        totalBeats: beatsPerMeasure, // Use time signature beats
                        loopIndex: loopIdx,
                        repeatNumber: repeatNum,
                        measureInLoop: measureInLoop,
                        lineIdx: -1,
                        startChordIdx: 0,
                        measureNumber: globalIndex - (addPreparationMeasure ? preparationMeasuresCount : 0)
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

                // Use beatsPerMeasure from time signature instead of hardcoded 4
                if (Math.abs(totalBeats - beatsPerMeasure) < 0.01 || totalBeats > beatsPerMeasure || chordIdx === line.length - 1) {
                    // If we've exceeded the measure, cap it at beatsPerMeasure
                    const measureBeats = Math.min(totalBeats, beatsPerMeasure);
                    allMeasures.push({
                        globalIndex: globalIndex++,
                        isPreparation: false,
                        chords: [...currentMeasure],
                        totalBeats: measureBeats,
                        loopIndex: null,
                        repeatNumber: null,
                        measureInLoop: null,
                        lineIdx: lineIdx,
                        startChordIdx: chordIdx - currentMeasure.length + 1,
                        measureNumber: globalIndex - (addPreparationMeasure ? preparationMeasuresCount : 0)
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

    // Render preparation measures if exist (כל התיבות הריקות/הכנה בשורות של 4)
    const prepMeasures = measures.filter(m => m.isPreparation);
    if (addPreparationMeasure && prepMeasures.length > 0) {
        const prepSection = document.createElement("div");
        prepSection.className = "loop-section preparation-section";

        const prepHeader = document.createElement("div");
        prepHeader.className = "loop-header";
        prepHeader.innerHTML = `<span class="loop-title">⏳ הכנה לתחילת השיר</span>`;

        const prepContent = document.createElement("div");
        prepContent.className = "loop-content";

        const measuresPerRow = 4;
        for (let i = 0; i < prepMeasures.length; i += measuresPerRow) {
            const rowMeasures = prepMeasures.slice(i, i + measuresPerRow);
            const prepRow = document.createElement("div");
            prepRow.className = "chord-row fixed-four-per-row";
            rowMeasures.forEach(m => prepRow.appendChild(createMeasureElement(m)));
            while (prepRow.children.length < 4) {
                const emptyDiv = document.createElement("div");
                emptyDiv.className = "measure-box empty-measure";
                prepRow.appendChild(emptyDiv);
            }
            prepContent.appendChild(prepRow);
        }

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

        let titleText = section.loop.name || section.loop.customName || "חלק ללא שם";
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
        title.innerText = measureData.isEmptyPreparation ? "תיבה ריקה" : "תיבה 0 - הכנה";
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

        // Apply transposition to chord name
        const transposedChordName = transposeChord(chord.chord, transposeSemitones);
        chordBox.innerText = transposedChordName;

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
                <span class="song-part-name">${loop.name || loop.customName || "חלק ללא שם"}</span>
            </label>
        `;
        container.appendChild(controlDiv);
    });
}

// Toggle loop from side controls
function toggleLoopFromControls(loopIndex) {
    toggleLoopEnabled(loopIndex);
}

// Toggle song parts panel (חלקי השיר - פתיחה/סגירה)
function toggleSongPartsPanel() {
    const panel = document.getElementById("song-parts-panel");
    const trigger = document.getElementById("song-parts-trigger");
    if (!panel || !trigger) return;
    const isCollapsed = panel.classList.contains("collapsed");
    if (isCollapsed) {
        panel.classList.remove("collapsed");
        trigger.setAttribute("aria-expanded", "true");
    } else {
        panel.classList.add("collapsed");
        trigger.setAttribute("aria-expanded", "false");
    }
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

/** עדכון מחלקות תיבות (נוכחית/עבר) בלי לבנות מחדש את כל ה-DOM */
function updateMeasurePlaybackClasses() {
    document.querySelectorAll(".measure-box.clickable").forEach((box) => {
        const idx = parseInt(box.dataset.globalIndex, 10);
        if (Number.isNaN(idx)) return;
        box.classList.remove("current", "past");
        if (!isPlaying) return;
        if (idx === currentGlobalMeasureIndex) box.classList.add("current");
        else if (idx < currentGlobalMeasureIndex) box.classList.add("past");
    });
}

/** הדגשת לופ נוכחי בלי renderChords מלא */
function updateLoopSectionHighlight() {
    const measures = buildAllMeasures();
    const currentMeasure = measures[currentGlobalMeasureIndex];
    document.querySelectorAll(".loop-section:not(.preparation-section)").forEach((section) => {
        section.classList.remove("current-repeat");
        const li = section.dataset.loopIndex;
        const rn = section.dataset.repeatNumber;
        if (li === undefined || rn === undefined) return;
        if (
            currentMeasure &&
            !currentMeasure.isPreparation &&
            currentMeasure.loopIndex === parseInt(li, 10) &&
            currentMeasure.repeatNumber === parseInt(rn, 10) &&
            isPlaying
        ) {
            section.classList.add("current-repeat");
        }
    });
}

/** עדכון ויזואלי קל בזמן ניגון — חיוני בפרודקשן (לא חוסם את ה-main thread) */
function syncPlaybackVisuals() {
    updateBeatDots();
    updateMeasurePlaybackClasses();
    updateLoopSectionHighlight();
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
        findNextEnabledMeasure(measures);
    }

    const startMetronomeAndInterval = () => {
        if (!isPlaying) return;

        currentBeatInMeasure = 0;
        syncPlaybackVisuals();
        updatePlayingInfo();
        playMetronome();
        scrollToCurrentMeasure();

        // מקצב אחיד: כל נקישה במרווח intervalMs מהנקישה הקודמת (בלי קפיצה של 100ms מול setInterval)
        interval = setInterval(() => {
            const currentMeasure = measures[currentGlobalMeasureIndex];

            if (!currentMeasure) {
                stopPlayback();
                return;
            }

            if (currentMeasure.loopIndex !== null && !enabledLoops.has(currentMeasure.loopIndex)) {
                findNextEnabledMeasure(measures);
                syncPlaybackVisuals();
                updatePlayingInfo();
                return;
            }

            currentBeatInMeasure++;
            playMetronome();

            if (currentBeatInMeasure >= Math.round(currentMeasure.totalBeats)) {
                currentGlobalMeasureIndex++;
                currentBeatInMeasure = 0;

                if (currentGlobalMeasureIndex >= measures.length) {
                    stopPlayback();
                    return;
                }

                // דלג על לופים מושבתים באותו טיק — לא להשאיר את הלופ המושבת כ"נוכחי" למחזור מטרונום שלם
                findNextEnabledMeasure(measures);
                if (!isPlaying) return;
            }

            syncPlaybackVisuals();
            updatePlayingInfo();
        }, intervalMs);
    };

    // אחרי בניית DOM: שני פריימים כדי שהדפדפן יצייר את הנקודות לפני הסאונד (במיוחד בפרודקשן)
    requestAnimationFrame(() => {
        requestAnimationFrame(startMetronomeAndInterval);
    });
}

// Find next enabled measure
function findNextEnabledMeasure(measures) {
    const startIdx = currentGlobalMeasureIndex;
    while (currentGlobalMeasureIndex < measures.length) {
        const measure = measures[currentGlobalMeasureIndex];
        if (!measure) break;

        if (measure.isPreparation || measure.loopIndex === null || enabledLoops.has(measure.loopIndex)) {
            break;
        }

        currentGlobalMeasureIndex++;
    }

    if (currentGlobalMeasureIndex !== startIdx) {
        currentBeatInMeasure = 0;
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

function increaseBpm() {
    const slider = document.getElementById("bpm-slider");
    const input = document.getElementById("bpm-input");
    let val = parseInt(input.value) || parseInt(slider.value) || bpm;
    if (val < 200) {
        val = Math.min(val + 1, 200);
        slider.value = val;
        input.value = val;
        bpm = val;
        intervalMs = 60000 / bpm;
        document.getElementById("current-bpm").innerText = val;
        if (interval) {
            stopPlayback();
            startPlayback();
        }
    }
}

function decreaseBpm() {
    const slider = document.getElementById("bpm-slider");
    const input = document.getElementById("bpm-input");
    let val = parseInt(input.value) || parseInt(slider.value) || bpm;
    if (val > 40) {
        val = Math.max(val - 1, 40);
        slider.value = val;
        input.value = val;
        bpm = val;
        intervalMs = 60000 / bpm;
        document.getElementById("current-bpm").innerText = val;
        if (interval) {
            stopPlayback();
            startPlayback();
        }
    }
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmInput = document.getElementById("bpm-input");
    const volumeSlider = document.getElementById("volume-slider");
    const preparationCheckbox = document.getElementById("add-preparation");
    const transposeSlider = document.getElementById("transpose-slider");
    const transposeInput = document.getElementById("transpose-input");

    // Transpose controls
    transposeSlider.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        transposeInput.value = value;
        transposeSemitones = value * 2; // Convert tones to semitones
        updateTransposeInfo();
        renderChords();
    });
    
    transposeInput.addEventListener("change", (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) value = 0;
        if (value < -6) value = -6;
        if (value > 6) value = 6;
        transposeInput.value = value;
        transposeSlider.value = value;
        transposeSemitones = value * 2; // Convert tones to semitones
        updateTransposeInfo();
        renderChords();
    });

    // BPM controls
    bpmSlider.addEventListener("input", (e) => {
        bpm = parseInt(e.target.value);
        bpmInput.value = bpm;
        document.getElementById("current-bpm").innerText = bpm;
        intervalMs = 60000 / bpm;

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

    // Number of preparation (empty) measures
    const preparationCountInput = document.getElementById("preparation-count");
    if (preparationCountInput) {
        preparationCountInput.addEventListener("change", (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 8) val = 8;
            preparationCountInput.value = val;
            preparationMeasuresCount = val;
            renderChords();
        });
    }

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
    // חלקי השיר - סגור כברירת מחדל
    const songPartsPanel = document.getElementById("song-parts-panel");
    const songPartsTrigger = document.getElementById("song-parts-trigger");
    if (songPartsPanel && songPartsTrigger) {
        songPartsPanel.classList.add("collapsed");
        songPartsTrigger.setAttribute("aria-expanded", "false");
    }
    updateTransposeInfo();
    renderChords();
    renderNotesTagSummary();

    // Play views (ways to display)
    const playViewButtons = Array.from(document.querySelectorAll(".play-view-btn"));
    if (playViewButtons.length > 0) {
        playViewButtons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const v = btn.getAttribute("data-play-view") || "boxes";
                setPlayView(v);
            });
        });

        let initialView = "boxes";
        try {
            initialView = localStorage.getItem(getPlayViewStorageKey()) || initialView;
        } catch (e) { /* ignore */ }

        // If the saved view has no data, fall back
        const hasTabs = !!String(tabsText || "").trim();
        const hasChordsLyrics = !!String(chordsLyricsText || "").trim();
        const hasLyrics = !!String(lyricsText || "").trim();
        if (initialView === "tabs" && !hasTabs) initialView = "boxes";
        if (initialView === "chords_lyrics" && !hasChordsLyrics) initialView = "boxes";
        if (initialView === "lyrics" && !hasLyrics) initialView = "boxes";

        setPlayView(initialView);
    }

    // Lyrics side panel
    const openLyricsBtn = document.getElementById("lyrics-panel-open");
    const closeLyricsBtn = document.getElementById("lyrics-panel-close");
    if (openLyricsBtn) openLyricsBtn.addEventListener("click", openLyricsPanel);
    if (closeLyricsBtn) closeLyricsBtn.addEventListener("click", closeLyricsPanel);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLyricsPanel();
    });

    // טעינת מוקדמת של המטרונום — בפרודקשן מפחית עיכוב בנקישה הראשונה
    if (metronome) {
        try {
            metronome.load();
        } catch (e) { /* ignore */ }
    }

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

// Delete current song (owner or admin) – used on play_song page
async function deleteCurrentSong() {
    const songId = window.songData?.songId;
    const songTitle = window.songData?.songTitle || 'השיר';
    if (!songId) return;
    if (!confirm(`האם אתה בטוח שברצונך למחוק את השיר "${songTitle}"?`)) return;
    try {
        const response = await fetch(`/api/delete_song/${songId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok && data.message) {
            window.location.href = '/songs';
        } else {
            alert(data.error || 'שגיאה במחיקת השיר');
        }
    } catch (e) {
        console.error(e);
        alert('שגיאה במחיקת השיר');
    }
}
