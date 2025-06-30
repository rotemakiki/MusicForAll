// Chord system configuration
const rootLetters = ["A", "B", "C", "D", "E", "F", "G"];
const accidentalOptions = ["", "#", "b"];
const chordTypes = ["", "m", "7", "maj7", "dim", "sus4", "aug", "m7"];

// State variables
let selectedAccidental = "";
let selectedLetter = null;
let selectedType = "";
let currentMeasure = null;
let currentMeasureNumber = 1;
let currentLoop = [];
let savedLoops = [];
let selectedSavedLoop = null;
let songStructure = [];
let halfBeatsEnabled = false;

// Edit state
let editingLoop = null;
let editingMeasureIndex = -1;

// Initialize the page
function init() {
    renderRootButtons();
    renderTypeButtons();
    renderAccidentalButtons();
    createNewMeasure();
    updateLoopDisplay();
    setupHalfBeatsToggle();

    // Load existing data if editing
    loadExistingData();
}

function loadExistingData() {
    const mode = determineMode();
    console.log("Current mode:", mode);

    if (mode === "editing") {
        // עריכת שיר קיים - טען את האקורדים הקיימים
        console.log("Loading existing song data for editing...");
        loadExistingSongData();
    } else if (mode === "new_song") {
        // שיר חדש - בדוק אם יש אקורדים בתהליך
        console.log("New song mode - checking for chords in progress...");
        loadNewSongChordsInProgress();
    } else {
        // מצב לא מוכר - נקה הכל
        console.log("Unknown mode - clearing all data");
        clearAllData();
    }
}

function loadExistingSongData() {
    try {
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");

        if (!savedChords) {
            console.log("No saved chords found for editing");
            return;
        }

        let existingChords;
        try {
            existingChords = JSON.parse(savedChords);
            console.log("Successfully parsed existing chords:", existingChords);
        } catch (e) {
            console.error("Error parsing saved chords:", e);
            return;
        }

        if (savedLoops && savedLoops !== "[]") {
            try {
                const existingLoops = JSON.parse(savedLoops);
                console.log("Loading existing loops for editing:", existingLoops);

                // Clear existing data
                savedLoops.splice(0, savedLoops.length);
                songStructure.splice(0, songStructure.length);

                // טען לופים קיימים
                existingLoops.forEach(loopData => {
                    const restoredLoop = {
                        id: Date.now() + Math.random(),
                        customName: loopData.name,
                        measures: loopData.measures,
                        measureCount: loopData.measureCount,
                        repeatCount: loopData.repeatCount || 1
                    };
                    savedLoops.push(restoredLoop);
                });

                songStructure.push(...existingLoops.map(loop => ({
                    ...loop,
                    id: Date.now() + Math.random(),
                    repeatCount: loop.repeatCount || 1
                })));

                console.log("Successfully loaded loops from existing data");
            } catch (e) {
                console.log("Error parsing existing loops, converting from chords...");
                convertChordsToLoops(existingChords);
            }
        } else {
            console.log("No existing loops found, converting chords to loops");
            convertChordsToLoops(existingChords);
        }

        renderSavedLoops();
        renderSongStructure();
        console.log("Successfully loaded existing song data");
    } catch (e) {
        console.error("Error loading existing song data:", e);
        clearAllData();
    }
}

function loadNewSongChordsInProgress() {
    try {
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");
        const addingNewSong = localStorage.getItem("addingNewSong");

        // רק אם זה באמת שיר חדש ויש אקורדים שנוספו בתהליך
        if (addingNewSong === "true" && savedChords) {
            const newSongChords = JSON.parse(savedChords);
            console.log("Loading new song chords in progress:", newSongChords);

            if (savedLoops && savedLoops !== "[]") {
                const newSongLoops = JSON.parse(savedLoops);
                console.log("Loading new song loops in progress:", newSongLoops);

                newSongLoops.forEach(loopData => {
                    const restoredLoop = {
                        id: Date.now() + Math.random(),
                        customName: loopData.name,
                        measures: loopData.measures,
                        measureCount: loopData.measureCount,
                        repeatCount: loopData.repeatCount || 1
                    };
                    savedLoops.push(restoredLoop);
                });

                songStructure.push(...newSongLoops.map(loop => ({
                    ...loop,
                    id: Date.now() + Math.random(),
                    repeatCount: loop.repeatCount || 1
                })));
            } else {
                convertChordsToLoops(newSongChords);
            }

            renderSavedLoops();
            renderSongStructure();
            console.log("Successfully loaded new song chords in progress");
        } else {
            // אין אקורדים בתהליך לשיר חדש - התחל נקי
            console.log("No chords in progress for new song - starting clean");
            clearAllData();
        }
    } catch (e) {
        console.log("Error loading new song chords in progress:", e);
        clearAllData();
    }
}

function clearAllData() {
    console.log("Clearing all chord/loop data for fresh start");
    savedLoops.splice(0, savedLoops.length); // נקה את המערך
    songStructure.splice(0, songStructure.length); // נקה את המערך
    currentLoop.splice(0, currentLoop.length); // נקה את המערך
    renderSavedLoops();
    renderSongStructure();
    updateLoopDisplay();
}

// Convert flat chord structure back to loop measures
function convertChordsToLoops(chordLines) {
    if (!chordLines || chordLines.length === 0) return;

    const measures = [];

    chordLines.forEach(line => {
        let currentMeasure = {
            beats: 4,
            chords: [],
            isEmpty: false
        };

        let totalBeats = 0;
        line.forEach(chordData => {
            currentMeasure.chords.push({
                chord: chordData.chord === "—" ? "—" : chordData.chord,
                width: chordData.beats || 1,
                isEmpty: chordData.chord === "—",
                position: totalBeats
            });
            totalBeats += (chordData.beats || 1);
        });

        if (currentMeasure.chords.length > 0) {
            measures.push(currentMeasure);
        }
    });

    if (measures.length > 0) {
        const defaultLoop = {
            id: Date.now(),
            customName: "חלק ראשי",
            measures: measures,
            measureCount: measures.length,
            repeatCount: 1
        };

        savedLoops.push(defaultLoop);
        songStructure.push({...defaultLoop});
    }
}

function determineMode() {
    const editingSongId = localStorage.getItem("editingSongId");
    const addingNewSong = localStorage.getItem("addingNewSong");

    console.log("Determining mode - editingSongId:", editingSongId, "addingNewSong:", addingNewSong);

    if (editingSongId && editingSongId !== "null" && editingSongId !== "undefined") {
        return "editing";
    } else if (addingNewSong === "true") {
        return "new_song";
    } else {
        return "unknown";
    }
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

    const chord = selectedLetter + selectedAccidental + selectedType;
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
        btn.textContent = letter + selectedAccidental;

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

// Render accidental buttons (3 separate buttons)
function renderAccidentalButtons() {
    const container = document.getElementById("accidental-buttons");
    container.innerHTML = "";

    const accidentals = [
        { symbol: "", label: "♮", name: "ללא סימן" },
        { symbol: "#", label: "♯", name: "דיאז" },
        { symbol: "b", label: "♭", name: "במול" }
    ];

    accidentals.forEach(acc => {
        const btn = document.createElement("button");
        btn.className = "accidental-btn";
        btn.innerHTML = `${acc.label}<br><span style="font-size: 10px;">${acc.name}</span>`;

        if (selectedAccidental === acc.symbol) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            selectedAccidental = acc.symbol;
            renderAccidentalButtons();
            renderRootButtons();
            updateSelectedChord();
        };

        container.appendChild(btn);
    });
}

// Setup half beats toggle
function setupHalfBeatsToggle() {
    const checkbox = document.getElementById("half-beats-checkbox");
    if (checkbox) {
        checkbox.addEventListener("change", (e) => {
            halfBeatsEnabled = e.target.checked;
            renderBeatsDisplay();
            renderCurrentMeasure();
        });
    }
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

        // Add half beat if enabled
        if (halfBeatsEnabled) {
            const isLast = i === beats;
            const shouldAddHalf = i < beats || isLast;
            if (shouldAddHalf) {
                const halfDot = document.createElement("div");
                halfDot.className = "beat-dot half-beat";
                halfDot.setAttribute("data-beat", i + 0.5);
                container.appendChild(halfDot);
            }
        }
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

    const chordName = selectedLetter + selectedAccidental + selectedType;

    // Add new chord (width will be calculated by redistributeChordsEqually)
    currentMeasure.chords.push({
        chord: chordName,
        width: 1, // Initial width, will be recalculated
        isEmpty: false,
        position: 0 // Will be calculated
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
        isEmpty: true,
        position: 0
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
    currentMeasure.chords.forEach((chord, index) => {
        chord.width = equalWidth;
        chord.position = index * equalWidth;
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

// Remove measure from current loop
function removeMeasureFromCurrentLoop(measureIndex) {
    if (measureIndex < 0 || measureIndex >= currentLoop.length) return;

    if (confirm("האם אתה בטוח שברצונך למחוק תיבה זו מהלופ הנוכחי?")) {
        currentLoop.splice(measureIndex, 1);
        updateLoopDisplay();
        updateButtons();
    }
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

// Render current measure being built - simplified without drag/resize
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

    // Calculate positions and render chords
    const totalBeats = currentMeasure.beats;

    currentMeasure.chords.forEach((chord, index) => {
        // Create chord element - simplified without drag/resize
        const chordDiv = document.createElement("div");
        chordDiv.className = "chord-in-measure";

        if (chord.isEmpty) {
            chordDiv.classList.add("empty-chord");
        }

        const flexBasis = (chord.width / totalBeats) * 100;
        chordDiv.style.flexBasis = `${flexBasis}%`;
        chordDiv.style.flexGrow = '0';
        chordDiv.style.flexShrink = '0';

        // Chord content - simplified
        chordDiv.innerHTML = `
            <div class="chord-name">${chord.chord}</div>
            <div class="chord-beats">${chord.width.toFixed(halfBeatsEnabled ? 1 : 0)} נקישות</div>
            <button class="chord-remove" onclick="removeChordFromMeasure(${index})">×</button>
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

    // If we're editing, update the existing measure in the loop
    if (editingLoop && editingMeasureIndex >= 0) {
        editingLoop.measures[editingMeasureIndex] = {...currentMeasure};
        // Exit edit mode
        editingLoop = null;
        editingMeasureIndex = -1;
        updateMeasureCounter();
    } else {
        // Add current measure to current loop
        currentLoop.push({...currentMeasure});
    }

    // Move to next measure
    currentMeasureNumber++;

    // Create new measure with same beats
    const beats = currentMeasure.beats;
    createNewMeasure();
    document.getElementById("measure-beats").value = beats;
    currentMeasure.beats = beats;

    renderBeatsDisplay();
    updateLoopDisplay();
    renderSavedLoops();
    renderSongStructure();
}

// Update measure counter to show edit state
function updateMeasureCounter() {
    const counter = document.querySelector(".measure-counter");
    if (editingLoop && editingMeasureIndex >= 0) {
        counter.textContent = `עריכת תיבה ${editingMeasureIndex + 1} בלופ "${editingLoop.customName}"`;
        counter.style.background = "linear-gradient(135deg, #ffc107, #ff8f00)";
    } else {
        counter.textContent = "תיבה נוכחית";
        counter.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
    }
}

// Save current loop
function saveCurrentLoop() {
    if (currentLoop.length === 0) {
        alert("אין תיבות בלופ הנוכחי");
        return;
    }

    const loopName = document.getElementById("loop-name").value.trim();
    if (!loopName) {
        alert("יש להזין שם ללופ");
        return;
    }

    const newLoop = {
        id: Date.now(),
        customName: loopName,
        measures: [...currentLoop],
        measureCount: currentLoop.length
    };

    savedLoops.push(newLoop);

    // Clear current loop
    currentLoop = [];
    currentMeasureNumber = 1;
    document.getElementById("loop-name").value = "";

    renderSavedLoops();
    updateLoopDisplay();
    updateButtons();
}

// Edit specific measure in a loop
function editMeasure(loopId, measureIndex) {
    const loop = savedLoops.find(l => l.id === loopId);
    if (!loop || measureIndex < 0 || measureIndex >= loop.measures.length) {
        alert("תיבה לא נמצאה");
        return;
    }

    // Set edit state
    editingLoop = loop;
    editingMeasureIndex = measureIndex;

    // Load measure into current editor
    const measureToEdit = loop.measures[measureIndex];
    currentMeasure = JSON.parse(JSON.stringify(measureToEdit)); // Deep copy

    // Update UI
    document.getElementById("measure-beats").value = currentMeasure.beats;
    renderBeatsDisplay();
    renderCurrentMeasure();
    updateButtons();
    updateMeasureCounter();

    // Update next button text
    const nextBtn = document.getElementById("next-measure-btn");
    nextBtn.textContent = "💾 שמור שינויים";
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
        updateLoopDisplay();
        updateButtons();
    }
}

// Update loop display
function updateLoopDisplay() {
    // Update current loop count
    document.getElementById("current-loop-count").textContent = currentLoop.length;

    // Update current loop preview with detailed chord info
    const preview = document.getElementById("current-loop-preview");
    preview.innerHTML = "";

    currentLoop.forEach((measure, measureIndex) => {
        const miniMeasure = document.createElement("div");
        miniMeasure.className = "mini-measure";

        if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
            miniMeasure.classList.add("empty");
        } else {
            // Show chords in mini measure
            const chordsDiv = document.createElement("div");
            chordsDiv.className = "mini-measure-chords";

            measure.chords.forEach(chord => {
                const miniChord = document.createElement("div");
                miniChord.className = "mini-chord";
                if (chord.isEmpty) {
                    miniChord.classList.add("empty-chord");
                    miniChord.textContent = "—";
                } else {
                    miniChord.textContent = chord.chord;
                }
                miniChord.style.flex = chord.width;
                chordsDiv.appendChild(miniChord);
            });

            miniMeasure.appendChild(chordsDiv);
        }

        // Add remove button for current loop measures
        const removeBtn = document.createElement("button");
        removeBtn.className = "mini-measure-remove";
        removeBtn.innerHTML = "×";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeMeasureFromCurrentLoop(measureIndex);
        };
        miniMeasure.appendChild(removeBtn);

        preview.appendChild(miniMeasure);
    });

    // Update buttons
    const discardBtn = document.getElementById("discard-loop-btn");
    discardBtn.disabled = currentLoop.length === 0;
}

// Render saved loops with edit functionality
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

        // Loop header with title and edit info
        const loopHeader = document.createElement("div");
        loopHeader.className = "loop-header";
        loopHeader.innerHTML = `
            <div class="loop-title">${loop.customName}</div>
            <div class="loop-info">${loop.measureCount} תיבות</div>
        `;

        // Create measures grid for editing
        const measuresGrid = document.createElement("div");
        measuresGrid.className = "measures-edit-grid";

        loop.measures.forEach((measure, measureIndex) => {
            const measureDiv = document.createElement("div");
            measureDiv.className = "mini-measure clickable";
            measureDiv.title = "לחץ לעריכה";
            measureDiv.onclick = () => editMeasure(loop.id, measureIndex);

            // Add measure number
            const measureNumber = document.createElement("div");
            measureNumber.className = "measure-number";
            measureNumber.textContent = measureIndex + 1;
            measureDiv.appendChild(measureNumber);

            if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
                measureDiv.classList.add("empty");
                measureDiv.innerHTML += '<div class="empty-indicator">ריק</div>';
            } else {
                const chordsDiv = document.createElement("div");
                chordsDiv.className = "mini-measure-chords";

                measure.chords.forEach(chord => {
                    const miniChord = document.createElement("div");
                    miniChord.className = "mini-chord";
                    if (chord.isEmpty) {
                        miniChord.classList.add("empty-chord");
                        miniChord.textContent = "—";
                    } else {
                        miniChord.textContent = chord.chord;
                    }
                    miniChord.style.flex = chord.width;
                    chordsDiv.appendChild(miniChord);
                });

                measureDiv.appendChild(chordsDiv);
            }

            measuresGrid.appendChild(measureDiv);
        });

        loopDiv.appendChild(loopHeader);
        loopDiv.appendChild(measuresGrid);

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
            <div>🎵 גרור לופים מהסרגל השמאלי כדי לבנות את השיר</div>
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
        const sameTypeLoops = songStructure.filter((l, i) => i <= loopIndex && l.customName === loop.customName);
        const loopNumber = sameTypeLoops.length;

        const loopHeader = document.createElement("div");
        loopHeader.className = "loop-header-in-song";
        loopHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="drag-handle">⋮⋮</span>
                <div>
                    <div class="loop-title-in-song">${loop.customName} ${loopNumber > 1 ? `(${loopNumber})` : ''}</div>
                    <div class="loop-measures-count">${loop.measureCount} תיבות</div>
                </div>
            </div>
            <div class="loop-controls-group">
                <div class="loop-repeat-controls">
                    <span class="repeat-label">חזרות:</span>
                    <input type="number" class="repeat-input" value="${loop.repeatCount || 1}" min="1" max="10"
                           onchange="updateLoopRepeat(${loopIndex}, this.value)">
                </div>
                <button class="remove-loop-btn" onclick="removeSongLoop(${loopIndex})">×</button>
            </div>
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
                const chordsHtml = measure.chords.map(chord => `
                    <div class="chord-in-song ${chord.isEmpty ? 'empty-chord' : ''}" style="flex: ${chord.width}">
                        <div class="chord-name-small">${chord.chord}</div>
                        <div class="chord-beats-small">${chord.width.toFixed(1)}</div>
                    </div>
                `).join('');

                measureDiv.innerHTML = `
                    <div class="measure-title-in-song">תיבה ${actualMeasureNumber}</div>
                    <div class="chords-in-song-measure">
                        ${chordsHtml}
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

// Update loop repeat count
function updateLoopRepeat(loopIndex, repeatCount) {
    const count = Math.max(1, Math.min(10, parseInt(repeatCount) || 1));
    if (songStructure[loopIndex]) {
        songStructure[loopIndex].repeatCount = count;
    }
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
        // Add loop to song structure with repeat count
        const loopCopy = {...draggedLoop, repeatCount: 1};
        songStructure.push(loopCopy);
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

// Finish and return to add song page - now includes loops data with repeats
function finishAndReturn() {
    if (songStructure.length === 0) {
        alert("יש להוסיף לפחות לופ אחד לשיר");
        return;
    }

    // Convert song structure into flat chord lines with repeats
    const chordLines = [];

    songStructure.forEach(loop => {
        const repeatCount = loop.repeatCount || 1;

        for (let repeat = 0; repeat < repeatCount; repeat++) {
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
        }
    });

    // Prepare loops data for DB storage
    const loopsData = songStructure.map(loop => ({
        name: loop.customName,
        measures: loop.measures,
        measureCount: loop.measureCount,
        repeatCount: loop.repeatCount || 1
    }));

    try {
        localStorage.setItem("chords", JSON.stringify(chordLines));
        localStorage.setItem("loops", JSON.stringify(loopsData));
        localStorage.setItem("justReturnedFromChords", "true");
        console.log("Saved chords:", chordLines);
        console.log("Saved loops:", loopsData);
    } catch (e) {
        console.log("localStorage not available - data stored in memory only");
    }

    // Determine where to return based on mode
    const mode = determineMode();

    if (mode === "editing") {
        // Return to edit song page
        const editingSongId = localStorage.getItem("editingSongId");
        window.location.href = `/edit_song/${editingSongId}`;
    } else {
        // Return to add song page (for new songs)
        window.location.href = "/add_song";
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    init();

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
