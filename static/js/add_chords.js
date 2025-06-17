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
let selectedChordIndex = -1;

// Loop and song structure
let currentLoop = {
    type: "verse",
    repeats: 1,
    measures: []
};
let songLoops = [];

// Initialize the page
function init() {
    renderRootButtons();
    renderTypeButtons();
    renderSongStructure();
    updateAccidentalButton();
    updateMeasureCounter();
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
        addButton.disabled = true;
        return;
    }

    let chord;
    if (selectedLetter === "EMPTY") {
        chord = "🔇 תו ריק";
    } else {
        chord = selectedLetter + getCurrentAccidental() + selectedType;
    }

    display.textContent = chord;
    addButton.disabled = !currentMeasure;
}

// Update measure counter
function updateMeasureCounter() {
    const counterElement = document.getElementById("current-measure-number");
    if (counterElement) {
        counterElement.textContent = currentMeasureNumber;
    }
}

// Render root note buttons (including empty chord option)
function renderRootButtons() {
    const container = document.getElementById("root-letters");
    container.innerHTML = "";

    // Add empty chord option as first button
    const emptyBtn = document.createElement("div");
    emptyBtn.className = "chord-btn empty-option";
    emptyBtn.textContent = "🔇 ריק";
    if (selectedLetter === "EMPTY") {
        emptyBtn.classList.add("selected");
    }
    emptyBtn.onclick = () => {
        selectedLetter = "EMPTY";
        renderRootButtons();
        updateSelectedChord();
    };
    container.appendChild(emptyBtn);

    // Add regular note buttons
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

// Toggle accidental (natural, sharp, flat)
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

// Create a new empty measure
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

    selectedChordIndex = -1;
    renderCurrentMeasure();
    updateButtons();
}

// Create a completely empty measure
function createEmptyMeasure() {
    const beats = parseInt(document.getElementById("measure-beats").value);
    if (isNaN(beats) || beats < 1) {
        alert("יש להזין מספר נקישות תקין");
        return;
    }

    currentMeasure = {
        beats: beats,
        chords: [],
        isEmpty: true
    };

    // Automatically move to next measure for empty measures
    nextMeasure();
}

// Add selected chord to current measure
function addChordToCurrentMeasure() {
    if (!currentMeasure) {
        alert("יש ליצור תיבה קודם");
        return;
    }

    if (!selectedLetter) {
        alert("יש לבחור אקורד");
        return;
    }

    let chordName;
    if (selectedLetter === "EMPTY") {
        chordName = "🔇";
    } else {
        chordName = selectedLetter + getCurrentAccidental() + selectedType;
    }

    // Add new chord with equal distribution
    currentMeasure.chords.push({
        chord: chordName,
        width: 1,
        isEmpty: selectedLetter === "EMPTY"
    });

    // Redistribute all chords equally
    redistributeChordsEqually();
    renderCurrentMeasure();
    updateButtons();
}

// Add empty chord (quick action)
function addEmptyChord() {
    if (!currentMeasure) {
        alert("יש ליצור תיבה קודם");
        return;
    }

    currentMeasure.chords.push({
        chord: "🔇",
        width: 1,
        isEmpty: true
    });

    redistributeChordsEqually();
    renderCurrentMeasure();
    updateButtons();
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
    selectedChordIndex = -1;

    // Redistribute remaining chords equally
    redistributeChordsEqually();
    renderCurrentMeasure();
    updateButtons();
}

// Select chord in measure
function selectChordInMeasure(index) {
    selectedChordIndex = selectedChordIndex === index ? -1 : index;
    renderCurrentMeasure();
}

// Clear current measure
function clearCurrentMeasure() {
    if (!currentMeasure) return;

    currentMeasure.chords = [];
    selectedChordIndex = -1;
    renderCurrentMeasure();
    updateButtons();
}

// Update button states
function updateButtons() {
    const nextMeasureBtn = document.getElementById("next-measure-btn");
    const clearBtn = document.getElementById("clear-measure-btn");
    const addEmptyBtn = document.getElementById("add-empty-chord-btn");

    if (nextMeasureBtn) {
        nextMeasureBtn.disabled = !currentMeasure || (currentMeasure.chords.length === 0 && !currentMeasure.isEmpty);
    }
    if (clearBtn) {
        clearBtn.disabled = !currentMeasure || (currentMeasure.chords.length === 0 && !currentMeasure.isEmpty);
    }
    if (addEmptyBtn) {
        addEmptyBtn.disabled = !currentMeasure;
    }

    document.querySelector(".add-chord-btn").disabled = !currentMeasure || !selectedLetter;
}

// Move to next measure (replaces addMeasureToLine)
function nextMeasure() {
    if (!currentMeasure) {
        alert("אין תיבה להוספה");
        return;
    }

    if (!currentMeasure.isEmpty && currentMeasure.chords.length === 0) {
        alert("התיבה ריקה - הוסף אקורדים או צור תיבה ריקה");
        return;
    }

    // Add current measure to current loop
    currentLoop.measures.push({...currentMeasure});

    // Check if we need to create a new line (every 4 measures)
    if (currentLoop.measures.length % 4 === 0) {
        console.log("ירידת שורה אוטומטית אחרי 4 תיבות");
    }

    // Reset current measure and increment counter
    currentMeasure = null;
    selectedChordIndex = -1;
    currentMeasureNumber++;

    renderCurrentMeasure();
    renderSongStructure();
    updateButtons();
    updateMeasureCounter();
}

// Finish current loop and start new one
function finishCurrentLoop() {
    if (currentLoop.measures.length === 0) {
        alert("הלופ ריק - הוסף תיבות קודם");
        return;
    }

    // Get loop settings
    const loopType = document.getElementById("loop-type").value;
    const loopRepeats = parseInt(document.getElementById("loop-repeats").value);

    currentLoop.type = loopType;
    currentLoop.repeats = loopRepeats;

    // Add current loop to song structure
    songLoops.push({...currentLoop});

    // Reset for new loop
    currentLoop = {
        type: "verse",
        repeats: 1,
        measures: []
    };

    // Reset measure counter for new loop
    currentMeasureNumber = 1;
    updateMeasureCounter();

    renderSongStructure();
}

// Render current measure being built
function renderCurrentMeasure() {
    const container = document.getElementById("current-measure-container");

    if (!currentMeasure) {
        container.innerHTML = '<div class="measure-placeholder"><p>👈 לחץ "צור תיבה חדשה" כדי להתחיל</p></div>';
        return;
    }

    if (currentMeasure.isEmpty) {
        container.innerHTML = '<div class="measure-placeholder"><p>📦 תיבה ריקה - לחץ "מעבר לתיבה הבאה"</p></div>';
        return;
    }

    if (currentMeasure.chords.length === 0) {
        container.innerHTML = '<div class="measure-placeholder"><p>🎵 הוסף אקורדים לתיבה</p></div>';
        return;
    }

    const measureDiv = document.createElement("div");
    measureDiv.className = "measure-preview";

    const totalBeats = currentMeasure.beats;

    currentMeasure.chords.forEach((chord, index) => {
        const chordDiv = document.createElement("div");
        chordDiv.className = "chord-in-measure";

        if (chord.isEmpty) {
            chordDiv.classList.add("empty-chord");
        }

        if (selectedChordIndex === index) {
            chordDiv.classList.add("selected");
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

        // Add click to select chord
        chordDiv.onclick = (e) => {
            e.stopPropagation();
            selectChordInMeasure(index);
        };

        // Add drag functionality for better visual feedback
        chordDiv.draggable = true;
        chordDiv.addEventListener('dragstart', (e) => {
            chordDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        chordDiv.addEventListener('dragend', (e) => {
            chordDiv.classList.remove('dragging');
        });

        measureDiv.appendChild(chordDiv);

        // Add resize handle (except for last chord)
        if (index < currentMeasure.chords.length - 1) {
            const handle = document.createElement("div");
            handle.className = "resize-handle";
            handle.onmousedown = (e) => startResize(e, index);
            measureDiv.appendChild(handle);
        }
    });

    container.innerHTML = "";
    container.appendChild(measureDiv);
}

// Render the entire song structure with loops
function renderSongStructure() {
    const container = document.getElementById("song-loops");
    if (!container) return;

    container.innerHTML = "";

    // Render completed loops
    songLoops.forEach((loop, loopIndex) => {
        const loopDiv = document.createElement("div");
        loopDiv.className = "loop-display";

        const loopTypeNames = {
            verse: "בית",
            chorus: "פזמון",
            bridge: "C part",
            transition: "מעבר"
        };

        loopDiv.innerHTML = `
            <div class="loop-title">
                <span>🔄 ${loopTypeNames[loop.type] || loop.type}</span>
                <span>חוזר ${loop.repeats} פעמים</span>
            </div>
        `;

        // Group measures into lines (4 measures per line)
        const lines = [];
        for (let i = 0; i < loop.measures.length; i += 4) {
            lines.push(loop.measures.slice(i, i + 4));
        }

        lines.forEach(line => {
            const lineDiv = document.createElement("div");
            lineDiv.className = "song-line";

            line.forEach(measure => {
                const measureDiv = document.createElement("div");

                if (measure.isEmpty) {
                    measureDiv.className = "measure-in-line empty-measure";
                } else {
                    measureDiv.className = "measure-in-line";

                    measure.chords.forEach(chord => {
                        const chordDiv = document.createElement("div");
                        chordDiv.className = "chord-in-measure";

                        if (chord.isEmpty) {
                            chordDiv.classList.add("empty-chord");
                        }

                        chordDiv.style.flex = chord.width;
                        chordDiv.innerHTML = `
                            <div class="chord-name">${chord.chord}</div>
                            <div class="chord-beats">${chord.width.toFixed(1)}</div>
                        `;
                        measureDiv.appendChild(chordDiv);
                    });
                }

                lineDiv.appendChild(measureDiv);
            });

            loopDiv.appendChild(lineDiv);
        });

        container.appendChild(loopDiv);
    });

    // Show current loop in progress
    if (currentLoop.measures.length > 0) {
        const currentLoopDiv = document.createElement("div");
        currentLoopDiv.className = "loop-display";
        currentLoopDiv.style.border = "2px dashed #667eea";
        currentLoopDiv.style.background = "linear-gradient(145deg, #e8f4fd, #f8f9ff)";

        const loopTypeNames = {
            verse: "בית",
            chorus: "פזמון",
            bridge: "C part",
            transition: "מעבר"
        };

        const currentLoopType = document.getElementById("loop-type").value;
        currentLoopDiv.innerHTML = `
            <div class="loop-title">
                <span>🔄 ${loopTypeNames[currentLoopType]} (בעבודה...)</span>
                <span>${currentLoop.measures.length} תיבות</span>
            </div>
        `;

        // Group current measures into lines
        const currentLines = [];
        for (let i = 0; i < currentLoop.measures.length; i += 4) {
            currentLines.push(currentLoop.measures.slice(i, i + 4));
        }

        currentLines.forEach(line => {
            const lineDiv = document.createElement("div");
            lineDiv.className = "song-line";

            line.forEach(measure => {
                const measureDiv = document.createElement("div");

                if (measure.isEmpty) {
                    measureDiv.className = "measure-in-line empty-measure";
                } else {
                    measureDiv.className = "measure-in-line";

                    measure.chords.forEach(chord => {
                        const chordDiv = document.createElement("div");
                        chordDiv.className = "chord-in-measure";

                        if (chord.isEmpty) {
                            chordDiv.classList.add("empty-chord");
                        }

                        chordDiv.style.flex = chord.width;
                        chordDiv.innerHTML = `
                            <div class="chord-name">${chord.chord}</div>
                            <div class="chord-beats">${chord.width.toFixed(1)}</div>
                        `;
                        measureDiv.appendChild(chordDiv);
                    });
                }

                lineDiv.appendChild(measureDiv);
            });

            currentLoopDiv.appendChild(lineDiv);
        });

        container.appendChild(currentLoopDiv);
    }
}

// Resize functionality (simplified for better performance)
let isDragging = false;
let dragIndex = null;
let startX = 0;
let originalWidths = [];

function startResize(e, index) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragIndex = index;
    startX = e.clientX;

    originalWidths = currentMeasure.chords.map(chord => chord.width);

    const handle = e.target;
    handle.classList.add('dragging');

    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);

    document.body.style.cursor = "ew-resize";
}

function onResize(e) {
    if (!isDragging || dragIndex === null) return;

    const deltaX = e.clientX - startX;
    const container = document.querySelector(".measure-preview");
    const containerWidth = container.offsetWidth - 40;
    const deltaBeats = (deltaX / containerWidth) * currentMeasure.beats;

    const leftChord = currentMeasure.chords[dragIndex];
    const rightChord = currentMeasure.chords[dragIndex + 1];

    const newLeftWidth = originalWidths[dragIndex] + deltaBeats;
    const newRightWidth = originalWidths[dragIndex + 1] - deltaBeats;

    const minWidth = 0.25;
    if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
        leftChord.width = Math.round(newLeftWidth * 100) / 100;
        rightChord.width = Math.round(newRightWidth * 100) / 100;
        renderCurrentMeasure();
    }
}

function stopResize() {
    isDragging = false;
    dragIndex = null;

    document.body.style.cursor = "";
    document.querySelectorAll('.resize-handle').forEach(handle => {
        handle.classList.remove('dragging');
    });

    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
}

// Finish and return to main page
function finishAndReturn() {
    // Finish current loop if it has measures
    if (currentLoop.measures.length > 0) {
        finishCurrentLoop();
    }

    if (songLoops.length === 0) {
        alert("לא נוצרו לופים - הוסף תיבות ולופים קודם");
        return;
    }

    // Convert loops to flat chord structure for compatibility
    const chordLines = [];

    songLoops.forEach(loop => {
        // Add loop repeats
        for (let repeat = 0; repeat < loop.repeats; repeat++) {
            // Group measures into lines (4 per line)
            for (let i = 0; i < loop.measures.length; i += 4) {
                const lineChords = [];
                const lineMeasures = loop.measures.slice(i, i + 4);

                lineMeasures.forEach(measure => {
                    if (measure.isEmpty) {
                        // Add empty measure as single empty chord
                        lineChords.push({
                            chord: "REST",
                            beats: measure.beats,
                            label: ""
                        });
                    } else {
                        measure.chords.forEach(chord => {
                            lineChords.push({
                                chord: chord.isEmpty ? "REST" : chord.chord,
                                beats: chord.width,
                                label: ""
                            });
                        });
                    }
                });

                if (lineChords.length > 0) {
                    chordLines.push(lineChords);
                }
            }
        }
    });

    try {
        localStorage.setItem("chords", JSON.stringify(chordLines));
        localStorage.setItem("justReturnedFromChords", "true");
    } catch (e) {
        console.log("localStorage not available - data stored in memory only");
    }

    window.location.href = "/add_song";
}

// Keyboard shortcuts
function handleKeydown(e) {
    if (!currentMeasure) return;

    if (e.key === 'Delete' && selectedChordIndex >= 0) {
        removeChordFromMeasure(selectedChordIndex);
    }

    if (e.key === 'ArrowLeft' && currentMeasure.chords.length > 0) {
        selectedChordIndex = selectedChordIndex <= 0 ?
            currentMeasure.chords.length - 1 : selectedChordIndex - 1;
        renderCurrentMeasure();
    }

    if (e.key === 'ArrowRight' && currentMeasure.chords.length > 0) {
        selectedChordIndex = selectedChordIndex >= currentMeasure.chords.length - 1 ?
            0 : selectedChordIndex + 1;
        renderCurrentMeasure();
    }

    if (e.key === 'Enter' && selectedLetter) {
        addChordToCurrentMeasure();
    }

    // New shortcut: Space for next measure
    if (e.key === ' ') {
        e.preventDefault();
        nextMeasure();
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    init();

    document.getElementById("toggle-accidental").onclick = toggleAccidental;
    document.addEventListener("keydown", handleKeydown);

    // Prevent context menu for better UX
    document.addEventListener("contextmenu", (e) => {
        if (e.target.closest('.measure-preview')) {
            e.preventDefault();
        }
    });
});
