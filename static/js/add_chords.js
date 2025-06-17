// Chord system configuration
const rootLetters = ["A", "B", "C", "D", "E", "F", "G"];
const accidentalOptions = ["", "#", "b"];
const chordTypes = ["", "m", "7", "maj7", "dim", "sus4", "aug", "m7"];

// State variables
let accidentalIndex = 0;
let selectedLetter = null;
let selectedType = "";
let currentMeasure = null;
let currentMeasureNumber = 1;
let currentLoop = [];
let savedLoops = [];
let selectedSavedLoop = null;
let songStructure = [];

// Initialize the page
function init() {
    renderRootButtons();
    renderTypeButtons();
    updateAccidentalButton();
    createNewMeasure();
    updateLoopDisplay();
}

// Get current accidental symbol
function getCurrentAccidental() {
    return accidentalOptions[accidentalIndex];
}

// Update the selected chord display
function updateSelectedChord() {
    const display = document.getElementById("current-chord-display");
    const addButton = document.querySelector(".add-chord-btn");

    if (!selectedLetter) {
        display.textContent = "—";
        addButton.disabled = !currentMeasure;
        return;
    }

    const chord = selectedLetter + getCurrentAccidental() + selectedType;
    display.textContent = chord;
    addButton.disabled = !currentMeasure;
}

// Render root note buttons
function renderRootButtons() {
    const container = document.getElementById("root-letters");
    container.innerHTML = "";

    rootLetters.forEach(letter => {
        const btn = document.createElement("div");
        btn.className = "chord-btn";
        btn.textContent = letter + getCurrentAccidental();

        if (selectedLetter === letter) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            selectedLetter = letter;
            renderRootButtons();
            updateSelectedChord();
        };

        container.appendChild(btn);
    });
}

// Render chord type buttons
function renderTypeButtons() {
    const container = document.getElementById("chord-types");
    container.innerHTML = "";

    chordTypes.forEach(type => {
        const btn = document.createElement("div");
        btn.className = "chord-btn";
        btn.textContent = type || "רגיל";

        if (selectedType === type) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            selectedType = type;
            renderTypeButtons();
            updateSelectedChord();
        };

        container.appendChild(btn);
    });
}

// Toggle accidental
function toggleAccidental() {
    accidentalIndex = (accidentalIndex + 1) % accidentalOptions.length;
    updateAccidentalButton();
    renderRootButtons();
    updateSelectedChord();
}

// Update accidental button text
function updateAccidentalButton() {
    const button = document.getElementById("toggle-accidental");
    const labels = {
        "": "♮ ללא סימן",
        "#": "♯ דיאז",
        "b": "♭ במול"
    };
    button.textContent = labels[getCurrentAccidental()];
}

// Create a new measure
function createNewMeasure() {
    const beats = parseInt(document.getElementById("measure-beats").value);
    if (isNaN(beats) || beats < 1) {
        alert("יש להזין מספר נקישות תקין");
        return;
    }

    currentMeasure = {
        beats: beats,
        chords: [],
        isEmpty: false
    };

    renderBeatsDisplay();
    renderCurrentMeasure();
    updateButtons();
}

// Render beat dots above measure
function renderBeatsDisplay() {
    const container = document.getElementById("beats-display");
    const beats = currentMeasure ? currentMeasure.beats : 4;

    container.innerHTML = "";
    container.style.display = "flex";

    for (let i = 1; i <= beats; i++) {
        const dot = document.createElement("div");
        dot.className = "beat-dot";
        dot.setAttribute("data-beat", i);
        container.appendChild(dot);
    }
}

// Add selected chord to current measure
function addChordToCurrentMeasure() {
    if (!currentMeasure) {
        alert("אין תיבה פעילה");
        return;
    }

    if (!selectedLetter) {
        alert("יש לבחור אקורד");
        return;
    }

    const chordName = selectedLetter + getCurrentAccidental() + selectedType;

    // Add new chord (width will be calculated by redistributeChordsEqually)
    currentMeasure.chords.push({
        chord: chordName,
        width: 1, // Initial width, will be recalculated
        isEmpty: false
    });

    // Redistribute all chords equally
    redistributeChordsEqually();

    renderCurrentMeasure();
    updateButtons();
    updateLoopDisplay();
}

// Add empty chord to current measure
function addEmptyChord() {
    if (!currentMeasure) {
        alert("אין תיבה פעילה");
        return;
    }

    // Add empty chord
    currentMeasure.chords.push({
        chord: "—",
        width: 1,
        isEmpty: true
    });

    // Redistribute all chords equally
    redistributeChordsEqually();

    renderCurrentMeasure();
    updateButtons();
    updateLoopDisplay();
}

// Redistribute chord widths equally across the measure
function redistributeChordsEqually() {
    if (!currentMeasure || currentMeasure.chords.length === 0) return;

    const equalWidth = currentMeasure.beats / currentMeasure.chords.length;
    currentMeasure.chords.forEach(chord => {
        chord.width = equalWidth;
    });
}

// Remove chord from current measure
function removeChordFromMeasure(index) {
    if (!currentMeasure || index < 0 || index >= currentMeasure.chords.length) return;

    currentMeasure.chords.splice(index, 1);

    // Redistribute remaining chords equally
    redistributeChordsEqually();

    renderCurrentMeasure();
    updateButtons();
    updateLoopDisplay();
}

// Clear current measure
function clearCurrentMeasure() {
    if (!currentMeasure) return;

    currentMeasure.chords = [];
    renderCurrentMeasure();
    updateButtons();
    updateLoopDisplay();
}

// Update button states
function updateButtons() {
    const nextMeasureBtn = document.getElementById("next-measure-btn");
    const clearBtn = document.getElementById("clear-measure-btn");
    const addEmptyBtn = document.getElementById("add-empty-chord-btn");
    const saveLoopBtn = document.getElementById("save-loop-btn");

    const hasChords = currentMeasure && currentMeasure.chords.length > 0;

    nextMeasureBtn.disabled = !hasChords;
    clearBtn.disabled = !hasChords;
    addEmptyBtn.disabled = !currentMeasure;
    saveLoopBtn.disabled = currentLoop.length === 0;

    document.querySelector(".add-chord-btn").disabled = !currentMeasure || !selectedLetter;
}

// Render current measure being built
function renderCurrentMeasure() {
    const container = document.getElementById("current-measure-container");

    if (!currentMeasure) {
        container.innerHTML = '<div class="measure-placeholder"><p>🎵 הוסף אקורדים לתיבה הנוכחית</p></div>';
        return;
    }

    if (currentMeasure.chords.length === 0) {
        container.innerHTML = '<div class="measure-placeholder"><p>🎵 הוסף אקורדים לתיבה הנוכחית</p></div>';
        return;
    }

    const measureDiv = document.createElement("div");
    measureDiv.className = "measure-preview";

    // Calculate flex basis for each chord
    const totalBeats = currentMeasure.beats;

    currentMeasure.chords.forEach((chord, index) => {
        // Create chord element
        const chordDiv = document.createElement("div");
        chordDiv.className = "chord-in-measure";

        if (chord.isEmpty) {
            chordDiv.classList.add("empty-chord");
        }

        const flexBasis = (chord.width / totalBeats) * 100;
        chordDiv.style.flexBasis = `${flexBasis}%`;
        chordDiv.style.flexGrow = '0';
        chordDiv.style.flexShrink = '0';

        chordDiv.innerHTML = `
            <div class="chord-name">${chord.chord}</div>
            <div class="chord-beats">${chord.width.toFixed(2)} נקישות</div>
            <button class="chord-remove" onclick="removeChordFromMeasure(${index}); event.stopPropagation();">×</button>
        `;

        measureDiv.appendChild(chordDiv);
    });

    container.innerHTML = "";
    container.appendChild(measureDiv);
}

// Move to next measure
function nextMeasure() {
    if (!currentMeasure || currentMeasure.chords.length === 0) {
        alert("אין אקורדים בתיבה הנוכחית");
        return;
    }

    // Add current measure to current loop
    currentLoop.push({...currentMeasure});

    // Move to next measure
    currentMeasureNumber++;
    document.getElementById("current-measure-number").textContent = currentMeasureNumber;

    // Create new measure with same beats
    const beats = currentMeasure.beats;
    createNewMeasure();
    document.getElementById("measure-beats").value = beats;
    currentMeasure.beats = beats;

    renderBeatsDisplay();
    updateLoopDisplay();
}

// Save current loop
function saveCurrentLoop() {
    if (currentLoop.length === 0) {
        alert("אין תיבות בלופ הנוכחי");
        return;
    }

    const loopType = document.getElementById("loop-type").value;
    const loopTypeNames = {
        verse: "בית",
        chorus: "פזמון",
        bridge: "C part",
        transition: "מעבר",
        intro: "פתיחה",
        outro: "סיום"
    };

    const newLoop = {
        id: Date.now(),
        type: loopType,
        typeName: loopTypeNames[loopType],
        measures: [...currentLoop],
        measureCount: currentLoop.length
    };

    savedLoops.push(newLoop);

    // Clear current loop
    currentLoop = [];
    currentMeasureNumber = 1;
    document.getElementById("current-measure-number").textContent = currentMeasureNumber;

    renderSavedLoops();
    updateLoopDisplay();
    updateButtons();
}

// Discard current loop
function discardCurrentLoop() {
    if (currentLoop.length === 0) {
        alert("אין לופ לבטל");
        return;
    }

    if (confirm("האם אתה בטוח שברצונך לבטל את הלופ הנוכחי?")) {
        currentLoop = [];
        currentMeasureNumber = 1;
        document.getElementById("current-measure-number").textContent = currentMeasureNumber;
        updateLoopDisplay();
        updateButtons();
    }
}

// Update loop display
function updateLoopDisplay() {
    // Update current loop count
    document.getElementById("current-loop-count").textContent = currentLoop.length;

    // Update current loop preview
    const preview = document.getElementById("current-loop-preview");
    preview.innerHTML = "";

    currentLoop.forEach(measure => {
        const miniMeasure = document.createElement("div");
        miniMeasure.className = "mini-measure";
        if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
            miniMeasure.classList.add("empty");
        }
        preview.appendChild(miniMeasure);
    });

    // Update buttons
    const discardBtn = document.getElementById("discard-loop-btn");
    discardBtn.disabled = currentLoop.length === 0;
}

// Render saved loops
function renderSavedLoops() {
    const container = document.getElementById("saved-loops-container");

    if (savedLoops.length === 0) {
        container.innerHTML = '<p style="color: #999; font-style: italic; text-align: center;">עדיין לא נשמרו לופים</p>';
        return;
    }

    container.innerHTML = "";

    savedLoops.forEach(loop => {
        const loopDiv = document.createElement("div");
        loopDiv.className = "saved-loop";
        loopDiv.draggable = true;
        loopDiv.dataset.loopId = loop.id;

        loopDiv.innerHTML = `
            <div class="loop-title">${loop.typeName}</div>
            <div class="loop-info">${loop.measureCount} תיבות</div>
            <div class="loop-measures-preview">
                ${loop.measures.map(measure =>
                    `<div class="mini-measure ${measure.chords.length === 0 || measure.chords.every(c => c.isEmpty) ? 'empty' : ''}"></div>`
                ).join('')}
            </div>
        `;

        // Add drag events
        loopDiv.addEventListener('dragstart', handleDragStart);
        loopDiv.addEventListener('dragend', handleDragEnd);

        container.appendChild(loopDiv);
    });
}

// Render song structure in main content
function renderSongStructure() {
    const container = document.getElementById("song-structure-content");

    if (songStructure.length === 0) {
        container.className = "drop-zone";
        container.innerHTML = `
            <div>🎵 גרור לופים מהסרגל הימני כדי לבנות את השיר</div>
            <div style="font-size: 14px; opacity: 0.7; margin-top: 5px;">או שמור את הלופ הנוכחי ואז גרור אותו לכאן</div>
        `;
        return;
    }

    container.className = "drop-zone has-content";
    container.innerHTML = "";

    songStructure.forEach((loop, loopIndex) => {
        const loopDiv = document.createElement("div");
        loopDiv.className = "song-loop";
        loopDiv.draggable = true;
        loopDiv.dataset.songIndex = loopIndex;

        // Count occurrences of this loop type
        const sameTypeLoops = songStructure.filter((l, i) => i <= loopIndex && l.type === loop.type);
        const loopNumber = sameTypeLoops.length;

        const loopHeader = document.createElement("div");
        loopHeader.className = "loop-header-in-song";
        loopHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="drag-handle">⋮⋮</span>
                <div>
                    <div class="loop-title-in-song">${loop.typeName} ${loopNumber > 1 ? `מספר ${loopNumber}` : ''}</div>
                    <div class="loop-measures-count">${loop.measureCount} תיבות</div>
                </div>
            </div>
            <button class="remove-loop-btn" onclick="removeSongLoop(${loopIndex})">×</button>
        `;

        const loopContent = document.createElement("div");
        loopContent.className = "loop-content";

        // Group measures into rows of 4
        const measuresPerRow = 4;
        for (let i = 0; i < loop.measures.length; i += measuresPerRow) {
            const measuresRow = document.createElement("div");
            measuresRow.className = "measures-row";

            const rowMeasures = loop.measures.slice(i, i + measuresPerRow);
            rowMeasures.forEach((measure, measureIndex) => {
                const measureDiv = document.createElement("div");
                measureDiv.className = "measure-in-song";

                const actualMeasureNumber = i + measureIndex + 1;
                measureDiv.innerHTML = `
                    <div class="measure-title-in-song">תיבה ${actualMeasureNumber}</div>
                    <div class="chords-in-song-measure">
                        ${measure.chords.map(chord => `
                            <div class="chord-in-song ${chord.isEmpty ? 'empty-chord' : ''}" style="flex: ${chord.width}">
                                <div class="chord-beats-small">${chord.width.toFixed(1)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="beats-in-song">
                        ${Array.from({length: Math.round(measure.beats)}, (_, i) =>
                            `<div class="beat-dot-small"></div>`
                        ).join('')}
                    </div>
                `;

                measuresRow.appendChild(measureDiv);
            });

            loopContent.appendChild(measuresRow);
        }

        loopDiv.appendChild(loopHeader);
        loopDiv.appendChild(loopContent);

        // Add drag events for reordering
        loopDiv.addEventListener('dragstart', handleSongLoopDragStart);
        loopDiv.addEventListener('dragend', handleSongLoopDragEnd);

        container.appendChild(loopDiv);
    });
}

// Drag and drop handlers for saved loops
let draggedLoop = null;

function handleDragStart(e) {
    draggedLoop = savedLoops.find(loop => loop.id == e.target.dataset.loopId);
    e.target.style.opacity = '0.7';
    e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedLoop = null;
}

// Drag and drop handlers for song structure reordering
let draggedSongLoop = null;

function handleSongLoopDragStart(e) {
    draggedSongLoop = parseInt(e.target.dataset.songIndex);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleSongLoopDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedSongLoop = null;
}

// Drop zone handlers
function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function dropLoop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (draggedLoop) {
        // Add loop to song structure
        songStructure.push({...draggedLoop});
        renderSongStructure();
    } else if (draggedSongLoop !== null) {
        // Handle reordering within song structure
        const dropTarget = e.target.closest('.song-loop');
        if (dropTarget && dropTarget.dataset.songIndex) {
            const targetIndex = parseInt(dropTarget.dataset.songIndex);
            if (targetIndex !== draggedSongLoop) {
                // Reorder loops
                const movedLoop = songStructure.splice(draggedSongLoop, 1)[0];
                songStructure.splice(targetIndex, 0, movedLoop);
                renderSongStructure();
            }
        }
    }
}

// Remove loop from song structure
function removeSongLoop(index) {
    if (confirm("האם אתה בטוח שברצונך להסיר את הלופ מהשיר?")) {
        songStructure.splice(index, 1);
        renderSongStructure();
    }
}

// Finish and return to add song page
function finishAndReturn() {
    if (songStructure.length === 0) {
        alert("יש להוסיף לפחות לופ אחד לשיר");
        return;
    }

    // Convert song structure into flat chord lines
    const chordLines = [];

    songStructure.forEach(loop => {
        // Group measures into lines of 4 measures each
        const measuresPerLine = 4;
        for (let i = 0; i < loop.measures.length; i += measuresPerLine) {
            const lineMeasures = loop.measures.slice(i, i + measuresPerLine);
            const lineChords = lineMeasures.flatMap(measure =>
                measure.chords.map(chord => ({
                    chord: chord.isEmpty ? "—" : chord.chord,
                    beats: chord.width,
                    label: ""
                }))
            );
            chordLines.push(lineChords);
        }
    });

    try {
        // Save chord data to localStorage
        localStorage.setItem("chords", JSON.stringify(chordLines));
        localStorage.setItem("justReturnedFromChords", "true");
        console.log("Saved chords:", chordLines);
    } catch (e) {
        console.log("localStorage not available - data stored in memory only");
    }

    // Navigate to the add song page
    window.location.href = "/add_song";
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    init();

    // Setup accidental toggle
    document.getElementById("toggle-accidental").onclick = toggleAccidental;

    // Setup beats input change
    document.getElementById("measure-beats").addEventListener("change", () => {
        if (currentMeasure) {
            const newBeats = parseInt(document.getElementById("measure-beats").value);
            if (newBeats && newBeats > 0) {
                currentMeasure.beats = newBeats;
                redistributeChordsEqually();
                renderBeatsDisplay();
                renderCurrentMeasure();
            }
        }
    });
});
