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

// Dragging and resizing state
let isDragging = false;
let isResizing = false;
let draggedChordIndex = -1;
let resizeChordIndex = -1;
let resizeDirection = ''; // 'left' or 'right'
let initialMouseX = 0;
let initialChordPosition = 0;
let initialChordWidth = 0;

// Initialize the page
function init() {
    renderRootButtons();
    renderTypeButtons();
    renderAccidentalButtons();
    createNewMeasure();
    updateLoopDisplay();
    setupHalfBeatsToggle();
    setupMouseEvents();
}

// Setup mouse events for dragging and resizing
function setupMouseEvents() {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
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
        if (halfBeatsEnabled && i < beats) {
            const halfDot = document.createElement("div");
            halfDot.className = "beat-dot half-beat";
            halfDot.setAttribute("data-beat", i + 0.5);
            container.appendChild(halfDot);
        }
    }
}

// Calculate snap positions for dragging
function getSnapPositions() {
    const positions = [];
    const beats = currentMeasure ? currentMeasure.beats : 4;
    const increment = halfBeatsEnabled ? 0.5 : 1;

    for (let i = 0; i <= beats; i += increment) {
        positions.push(i);
    }

    return positions;
}

// Find closest snap position
function getClosestSnapPosition(position) {
    const snapPositions = getSnapPositions();
    let closest = snapPositions[0];
    let minDistance = Math.abs(position - closest);

    for (const snapPos of snapPositions) {
        const distance = Math.abs(position - snapPos);
        if (distance < minDistance) {
            minDistance = distance;
            closest = snapPos;
        }
    }

    return closest;
}

// Convert pixel position to beat position
function pixelToBeatPosition(pixelX, containerElement) {
    const rect = containerElement.getBoundingClientRect();
    const relativeX = pixelX - rect.left;
    const percentage = relativeX / rect.width;
    const beatPosition = percentage * currentMeasure.beats;
    return Math.max(0, Math.min(currentMeasure.beats, beatPosition));
}

// Convert beat position to pixel position
function beatToPixelPosition(beatPosition, containerElement) {
    const rect = containerElement.getBoundingClientRect();
    const percentage = beatPosition / currentMeasure.beats;
    return rect.left + (percentage * rect.width);
}

// Handle mouse down for dragging and resizing
function handleMouseDown(e, index, type) {
    e.preventDefault();
    e.stopPropagation();

    const containerElement = document.querySelector('.measure-preview');
    if (!containerElement) return;

    initialMouseX = e.clientX;

    if (type === 'drag') {
        isDragging = true;
        draggedChordIndex = index;
        initialChordPosition = getChordPosition(index);
        document.body.style.cursor = 'grabbing';
    } else if (type === 'resize-left' || type === 'resize-right') {
        isResizing = true;
        resizeChordIndex = index;
        resizeDirection = type.split('-')[1];
        initialChordPosition = getChordPosition(index);
        initialChordWidth = currentMeasure.chords[index].width;
        document.body.style.cursor = 'ew-resize';
    }
}

// Handle mouse move for dragging and resizing
function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;

    const containerElement = document.querySelector('.measure-preview');
    if (!containerElement) return;

    const currentBeatPosition = pixelToBeatPosition(e.clientX, containerElement);

    if (isDragging && draggedChordIndex >= 0) {
        handleChordDrag(currentBeatPosition);
    } else if (isResizing && resizeChordIndex >= 0) {
        handleChordResize(currentBeatPosition);
    }
}

// Handle mouse up
function handleMouseUp(e) {
    if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        draggedChordIndex = -1;
        resizeChordIndex = -1;
        resizeDirection = '';
        document.body.style.cursor = 'default';

        renderCurrentMeasure();
        updateButtons();
        updateLoopDisplay();
    }
}

// Get chord position (cumulative beats from start)
function getChordPosition(index) {
    let position = 0;
    for (let i = 0; i < index; i++) {
        position += currentMeasure.chords[i].width;
    }
    return position;
}

// Handle chord dragging
function handleChordDrag(beatPosition) {
    if (draggedChordIndex < 0) return;

    const chord = currentMeasure.chords[draggedChordIndex];
    const snapPosition = getClosestSnapPosition(beatPosition - chord.width / 2);

    // Calculate new position ensuring it doesn't go out of bounds
    const newStartPosition = Math.max(0, Math.min(currentMeasure.beats - chord.width, snapPosition));

    // Remove the chord from its current position
    const draggedChord = currentMeasure.chords.splice(draggedChordIndex, 1)[0];

    // Find where to insert it based on new position
    let insertIndex = 0;
    let cumulativePosition = 0;

    for (let i = 0; i < currentMeasure.chords.length; i++) {
        if (cumulativePosition >= newStartPosition) {
            insertIndex = i;
            break;
        }
        cumulativePosition += currentMeasure.chords[i].width;
        insertIndex = i + 1;
    }

    // Insert the chord at the new position
    currentMeasure.chords.splice(insertIndex, 0, draggedChord);
    draggedChordIndex = insertIndex;

    renderCurrentMeasure();
}

// Handle chord resizing
function handleChordResize(beatPosition) {
    if (resizeChordIndex < 0) return;

    const chord = currentMeasure.chords[resizeChordIndex];
    const chordStartPosition = getChordPosition(resizeChordIndex);
    const minWidth = halfBeatsEnabled ? 0.5 : 1;

    let newWidth = chord.width;

    if (resizeDirection === 'right') {
        // Resize from the right edge
        const maxEnd = currentMeasure.beats;
        if (resizeChordIndex < currentMeasure.chords.length - 1) {
            // If not the last chord, limit by next chord's start
            let nextChordStart = chordStartPosition + chord.width;
            for (let i = resizeChordIndex + 1; i < currentMeasure.chords.length; i++) {
                nextChordStart += currentMeasure.chords[i].width;
            }
            // Actually, we need to recalculate this properly
            nextChordStart = chordStartPosition + chord.width;
        }

        const targetEnd = getClosestSnapPosition(beatPosition);
        newWidth = Math.max(minWidth, Math.min(maxEnd - chordStartPosition, targetEnd - chordStartPosition));
    } else if (resizeDirection === 'left') {
        // Resize from the left edge
        const targetStart = getClosestSnapPosition(beatPosition);
        const chordEnd = chordStartPosition + chord.width;
        newWidth = Math.max(minWidth, chordEnd - Math.max(0, targetStart));

        // If we're resizing from the left, we also need to move preceding chords
        if (targetStart < chordStartPosition) {
            // Need to shrink preceding chords or move them
            adjustPrecedingChords(resizeChordIndex, chordStartPosition - targetStart);
        }
    }

    chord.width = newWidth;
    renderCurrentMeasure();
}

// Adjust preceding chords when resizing from left
function adjustPrecedingChords(chordIndex, spaceNeeded) {
    // For now, just ensure the chord doesn't exceed bounds
    // More sophisticated logic could be added here
    const chord = currentMeasure.chords[chordIndex];
    const chordStart = getChordPosition(chordIndex);

    if (chordStart - spaceNeeded < 0) {
        spaceNeeded = chordStart;
    }

    // Redistribute the space among preceding chords
    let remainingSpace = spaceNeeded;
    for (let i = chordIndex - 1; i >= 0 && remainingSpace > 0; i--) {
        const availableReduction = currentMeasure.chords[i].width - (halfBeatsEnabled ? 0.5 : 1);
        const reduction = Math.min(remainingSpace, availableReduction);
        currentMeasure.chords[i].width -= reduction;
        remainingSpace -= reduction;
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

    // Calculate positions and render chords
    let cumulativePosition = 0;
    const totalBeats = currentMeasure.beats;

    currentMeasure.chords.forEach((chord, index) => {
        // Create chord element
        const chordDiv = document.createElement("div");
        chordDiv.className = "chord-in-measure resizable-chord";

        if (chord.isEmpty) {
            chordDiv.classList.add("empty-chord");
        }

        const flexBasis = (chord.width / totalBeats) * 100;
        chordDiv.style.flexBasis = `${flexBasis}%`;
        chordDiv.style.flexGrow = '0';
        chordDiv.style.flexShrink = '0';
        chordDiv.style.position = 'relative';

        // Chord content
        const chordContent = document.createElement("div");
        chordContent.className = "chord-content";
        chordContent.innerHTML = `
            <div class="chord-name">${chord.chord}</div>
            <div class="chord-beats">${chord.width.toFixed(halfBeatsEnabled ? 1 : 0)} נקישות</div>
        `;

        // Make the content draggable
        chordContent.style.cursor = 'grab';
        chordContent.addEventListener('mousedown', (e) => handleMouseDown(e, index, 'drag'));

        // Left resize handle
        const leftHandle = document.createElement("div");
        leftHandle.className = "resize-handle left-handle";
        leftHandle.addEventListener('mousedown', (e) => handleMouseDown(e, index, 'resize-left'));

        // Right resize handle
        const rightHandle = document.createElement("div");
        rightHandle.className = "resize-handle right-handle";
        rightHandle.addEventListener('mousedown', (e) => handleMouseDown(e, index, 'resize-right'));

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "chord-remove";
        removeBtn.textContent = "×";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeChordFromMeasure(index);
        };

        // Assemble chord element
        chordDiv.appendChild(leftHandle);
        chordDiv.appendChild(chordContent);
        chordDiv.appendChild(rightHandle);
        chordDiv.appendChild(removeBtn);

        measureDiv.appendChild(chordDiv);
        cumulativePosition += chord.width;
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

    currentLoop.forEach(measure => {
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

        // Create detailed loop preview
        const loopPreview = document.createElement("div");
        loopPreview.className = "loop-measures-preview";

        loop.measures.forEach(measure => {
            const miniMeasure = document.createElement("div");
            miniMeasure.className = "mini-measure";

            if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
                miniMeasure.classList.add("empty");
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

                miniMeasure.appendChild(chordsDiv);
            }

            loopPreview.appendChild(miniMeasure);
        });

        loopDiv.innerHTML = `
            <div class="loop-title">${loop.customName}</div>
            <div class="loop-info">${loop.measureCount} תיבות</div>
        `;

        loopDiv.appendChild(loopPreview);

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
