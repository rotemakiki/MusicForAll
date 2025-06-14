
// Chord system configuration
const rootLetters = ["A", "B", "C", "D", "E", "F", "G"];
const accidentalOptions = ["", "#", "b"];
const chordTypes = ["", "m", "7", "maj7", "dim", "sus4", "aug", "m7"];

// State variables
let accidentalIndex = 0;
let selectedLetter = null;
let selectedType = "";
let currentMeasure = null;
let songStructure = [[]]; // Array of lines, each line contains measures
let selectedChordIndex = -1;

// Drag and resize state
let isDragging = false;
let dragIndex = null;
let startX = 0;
let originalWidths = [];

// Initialize the page
function init() {
    renderRootButtons();
    renderTypeButtons();
    renderSongStructure();
    updateAccidentalButton();
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
            renderRootButtons(); // Re-render buttons to show selection
            updateSelectedChord(); // Update the display
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
            renderTypeButtons(); // Re-render buttons to show selection
            updateSelectedChord(); // Update the display
        };

        container.appendChild(btn);
    });
}

// Toggle accidental (natural, sharp, flat)
function toggleAccidental() {
    accidentalIndex = (accidentalIndex + 1) % accidentalOptions.length;
    updateAccidentalButton();
    renderRootButtons(); // Re-render root buttons with new accidental
    updateSelectedChord(); // Update the display
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
        chords: []
    };

    selectedChordIndex = -1;
    renderCurrentMeasure();
    updateButtons();
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

    const chordName = selectedLetter + getCurrentAccidental() + selectedType;

    // Calculate remaining space
    const usedBeats = currentMeasure.chords.reduce((sum, chord) => sum + chord.width, 0);
    const remainingBeats = currentMeasure.beats - usedBeats;

    if (remainingBeats < 0.25) {
        alert("התיבה מלאה - אין מקום לאקורד נוסף");
        return;
    }

    // Add new chord with minimum width
    const newWidth = Math.min(1, remainingBeats);
    currentMeasure.chords.push({
        chord: chordName,
        width: newWidth
    });

    renderCurrentMeasure();
    updateButtons();
}

// Remove chord from current measure
function removeChordFromMeasure(index) {
    if (!currentMeasure || index < 0 || index >= currentMeasure.chords.length) return;

    currentMeasure.chords.splice(index, 1);
    selectedChordIndex = -1;

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
    const addToLineBtn = document.getElementById("add-to-line-btn");
    const clearBtn = document.getElementById("clear-measure-btn");

    addToLineBtn.disabled = !currentMeasure || currentMeasure.chords.length === 0;
    clearBtn.disabled = !currentMeasure || currentMeasure.chords.length === 0;

    document.querySelector(".add-chord-btn").disabled = !currentMeasure || !selectedLetter;
}

// Render current measure being built
function renderCurrentMeasure() {
    const container = document.getElementById("current-measure-container");

    if (!currentMeasure) {
        container.innerHTML = '<div class="measure-placeholder"><p>👈 לחץ "צור תיבה חדשה" כדי להתחיל</p></div>';
        return;
    }

    if (currentMeasure.chords.length === 0) {
        container.innerHTML = '<div class="measure-placeholder"><p>🎵 הוסף אקורדים לתיבה</p></div>';
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

        // Add double-click to edit width
        chordDiv.ondblclick = (e) => {
            e.stopPropagation();
            editChordWidth(index);
        };

        measureDiv.appendChild(chordDiv);

        // Add resize handle (except for last chord)
        if (index < currentMeasure.chords.length - 1) {
            const handle = document.createElement("div");
            handle.className = "resize-handle";
            handle.onmousedown = (e) => startResize(e, index);
            measureDiv.appendChild(handle);
        }
    });

    // Show remaining space info
    const usedBeats = currentMeasure.chords.reduce((sum, chord) => sum + chord.width, 0);
    const remainingBeats = currentMeasure.beats - usedBeats;

    if (remainingBeats > 0.01) {
        const spacerDiv = document.createElement("div");
        spacerDiv.style.flexBasis = `${(remainingBeats / totalBeats) * 100}%`;
        spacerDiv.style.border = "2px dashed #ccc";
        spacerDiv.style.borderRadius = "8px";
        spacerDiv.style.display = "flex";
        spacerDiv.style.alignItems = "center";
        spacerDiv.style.justifyContent = "center";
        spacerDiv.style.color = "#999";
        spacerDiv.style.fontSize = "12px";
        spacerDiv.style.margin = "0 1px";
        spacerDiv.textContent = `${remainingBeats.toFixed(2)} נקישות פנויות`;
        measureDiv.appendChild(spacerDiv);
    }

    container.innerHTML = "";
    container.appendChild(measureDiv);
}

// Edit chord width with popup
function editChordWidth(index) {
    if (!currentMeasure || index < 0 || index >= currentMeasure.chords.length) return;

    const chord = currentMeasure.chords[index];
    const newWidth = prompt(`הזן רוחב חדש לאקורד ${chord.chord} (נקישות):`, chord.width.toFixed(2));

    if (newWidth === null) return; // User cancelled

    const width = parseFloat(newWidth);
    if (isNaN(width) || width <= 0) {
        alert("יש להזין מספר חיובי");
        return;
    }

    // Check if total doesn't exceed measure beats
    const otherChordsWidth = currentMeasure.chords
        .filter((_, i) => i !== index)
        .reduce((sum, c) => sum + c.width, 0);

    if (otherChordsWidth + width > currentMeasure.beats) {
        alert(`הרוחב גדול מדי. מקסימום: ${(currentMeasure.beats - otherChordsWidth).toFixed(2)}`);
        return;
    }

    chord.width = width;
    renderCurrentMeasure();
}

// Start resize operation
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

// Handle resize dragging
function onResize(e) {
    if (!isDragging || dragIndex === null) return;

    const deltaX = e.clientX - startX;
    const container = document.querySelector(".measure-preview");
    const containerWidth = container.offsetWidth - 30; // Account for padding
    const deltaBeats = (deltaX / containerWidth) * currentMeasure.beats;

    const leftChord = currentMeasure.chords[dragIndex];
    const rightChord = currentMeasure.chords[dragIndex + 1];

    const newLeftWidth = originalWidths[dragIndex] + deltaBeats;
    const newRightWidth = originalWidths[dragIndex + 1] - deltaBeats;

    // Ensure minimum widths
    const minWidth = 0.25;
    if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
        leftChord.width = Math.round(newLeftWidth * 100) / 100; // Round to 2 decimal places
        rightChord.width = Math.round(newRightWidth * 100) / 100;
        renderCurrentMeasure();
    }
}

// Stop resize operation
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

// Add current measure to current line
function addMeasureToLine() {
    if (!currentMeasure || currentMeasure.chords.length === 0) {
        alert("אין תיבה להוספה");
        return;
    }

    // Add to current line (last line)
    songStructure[songStructure.length - 1].push({...currentMeasure});

    // Reset current measure
    currentMeasure = null;
    selectedChordIndex = -1;
    renderCurrentMeasure();
    renderSongStructure();
    updateButtons();
}

// Create new line
function createNewLine() {
    songStructure.push([]);
    renderSongStructure();
}

// Render the entire song structure
function renderSongStructure() {
    const container = document.getElementById("song-lines");
    container.innerHTML = "";

    songStructure.forEach((line, lineIndex) => {
        if (line.length === 0 && lineIndex === songStructure.length - 1) {
            // Don't show empty last line
            return;
        }

        const lineDiv = document.createElement("div");
        lineDiv.className = "song-line";

        if (line.length === 0) {
            lineDiv.innerHTML = '<p style="color: #999; font-style: italic;">שורה ריקה</p>';
        } else {
            line.forEach((measure) => {
                const measureDiv = document.createElement("div");
                measureDiv.className = "measure-in-line";

                measure.chords.forEach(chord => {
                    const chordDiv = document.createElement("div");
                    chordDiv.className = "chord-in-measure";
                    chordDiv.style.flex = chord.width;
                    chordDiv.innerHTML = `
                        <div class="chord-name">${chord.chord}</div>
                        <div class="chord-beats">${chord.width.toFixed(1)}</div>
                    `;
                    measureDiv.appendChild(chordDiv);
                });

                lineDiv.appendChild(measureDiv);
            });
        }

        container.appendChild(lineDiv);
    });
}

    function finishAndReturn() {
        // Convert song structure into flat chord lines
        const chordLines = songStructure.filter(line => line.length > 0).map(line => {
            return line.flatMap(measure =>
                measure.chords.map(chord => ({
                    chord: chord.chord,
                    beats: chord.width,
                    label: ""
                }))
            );
        });

        try {
            // Save chord data to localStorage
            localStorage.setItem("chords", JSON.stringify(chordLines));
            localStorage.setItem("justReturnedFromChords", "true");
        } catch (e) {
            console.log("localStorage not available - data stored in memory only");
        }

        // Navigate to the add song page
        window.location.href = "/add_song";
    }


// Keyboard shortcuts
function handleKeydown(e) {
    if (!currentMeasure) return;

    // Delete selected chord
    if (e.key === 'Delete' && selectedChordIndex >= 0) {
        removeChordFromMeasure(selectedChordIndex);
    }

    // Navigate between chords
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

    // Add chord with Enter
    if (e.key === 'Enter' && selectedLetter) {
        addChordToCurrentMeasure();
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    init();

    // Setup accidental toggle
    document.getElementById("toggle-accidental").onclick = toggleAccidental;

    // Add keyboard support
    document.addEventListener("keydown", handleKeydown);

    // Prevent context menu on right click for better UX
    document.addEventListener("contextmenu", (e) => {
        if (e.target.closest('.measure-preview')) {
            e.preventDefault();
        }
    });
});

// Touch support for mobile
let touchStartX = 0;
let touchStartTime = 0;

function handleTouchStart(e, index) {
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
}

function handleTouchEnd(e, index) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndTime = Date.now();
    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaTime = touchEndTime - touchStartTime;

    // If it's a tap (not a swipe), select the chord
    if (deltaX < 10 && deltaTime < 300) {
        selectChordInMeasure(index);
    }
}

