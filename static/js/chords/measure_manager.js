// Measure Manager - Handles individual measure creation, editing, and chord management
// This manages the current measure being built, chord sizing, and measure validation

class MeasureManager {
    constructor() {
        this.currentMeasure = null;
        this.currentMeasureNumber = 1;
        this.halfBeatsEnabled = false;
        this.editingLoop = null;
        this.editingMeasureIndex = -1;

        // Get utilities from core
        this.utils = window.ChordCore.MeasureUtils;
        this.defaults = window.ChordCore.MEASURE_DEFAULTS;
        this.validator = window.ChordCore.ChordValidator;
    }

    /**
     * Initialize measure manager
     */
    init() {
        this.setupHalfBeatsToggle();
        this.createNewMeasure();
        this.setupBeatsInputListener();
    }

    /**
     * Setup half beats toggle functionality
     */
    setupHalfBeatsToggle() {
        const checkbox = document.getElementById("half-beats-checkbox");
        if (checkbox) {
            checkbox.addEventListener("change", (e) => {
                this.halfBeatsEnabled = e.target.checked;
                this.renderBeatsDisplay();
                this.renderCurrentMeasure();
            });
        }
    }

    /**
     * Setup beats input change listener
     */
    setupBeatsInputListener() {
        const beatsInput = document.getElementById("measure-beats");
        if (beatsInput) {
            beatsInput.addEventListener("change", () => {
                if (this.currentMeasure) {
                    const newBeats = parseInt(beatsInput.value);
                    if (newBeats && newBeats > 0) {
                        this.currentMeasure.beats = newBeats;
                        this.utils.redistributeChordsWithHalvesOnly(this.currentMeasure);
                        this.renderBeatsDisplay();
                        this.renderCurrentMeasure();
                    }
                }
            });
        }
    }

    /**
     * Create a new empty measure
     */
    createNewMeasure() {
        const beatsInput = document.getElementById("measure-beats");
        const beats = beatsInput ? parseInt(beatsInput.value) : this.defaults.beats;

        if (isNaN(beats) || beats < 1) {
            alert("יש להזין מספר נקישות תקין");
            return;
        }

        this.currentMeasure = this.utils.createEmptyMeasure(beats);
        this.renderBeatsDisplay();
        this.renderCurrentMeasure();
        this.updateMeasureCounter();

        // Notify other components
        this.triggerMeasureChange();
    }

    /**
     * Add chord to current measure
     * TODO: Validate on backend before adding
     */
    addChord(chordName) {
        if (!this.currentMeasure) {
            alert("אין תיבה פעילה");
            return false;
        }

        if (!chordName) {
            alert("יש לבחור אקורד");
            return false;
        }

        // TODO: Send to backend for validation
        // const isValid = await this.validateChordOnBackend(chordName);
        // if (!isValid) return false;

        // Add new chord with default width
        const newChord = this.utils.createChordObject(chordName, this.defaults.defaultChordWidth);
        this.currentMeasure.chords.push(newChord);

        // Redistribute all chords based on halves only
        this.utils.redistributeChordsWithHalvesOnly(this.currentMeasure);

        this.renderCurrentMeasure();
        this.triggerMeasureChange();
        return true;
    }

    /**
     * Add empty chord (rest) to current measure
     */
    addEmptyChord() {
        return this.addChord("—");
    }

    /**
     * TODO: Validate chord on backend
     */
    async validateChordOnBackend(chordName) {
        try {
            const response = await fetch('/api/chords/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chord: chordName })
            });
            const result = await response.json();
            return result.valid;
        } catch (error) {
            console.log('Could not validate chord on backend:', error);
            // Fallback to client-side validation
            return this.validator.isValidChordName(chordName);
        }
    }

    /**
     * Remove chord from measure
     */
    removeChord(chordIndex) {
        if (!this.currentMeasure || chordIndex < 0 || chordIndex >= this.currentMeasure.chords.length) {
            return;
        }

        this.currentMeasure.chords.splice(chordIndex, 1);

        // Redistribute remaining chords with halves only
        this.utils.redistributeChordsWithHalvesOnly(this.currentMeasure);

        this.renderCurrentMeasure();
        this.triggerMeasureChange();
    }

    /**
     * Increase chord size (only 0.5 increments)
     */
    increaseChordSize(chordIndex) {
        if (!this.currentMeasure || chordIndex < 0 || chordIndex >= this.currentMeasure.chords.length) {
            return;
        }

        const chord = this.currentMeasure.chords[chordIndex];
        const nextChordIndex = chordIndex + 1;

        if (nextChordIndex < this.currentMeasure.chords.length) {
            const nextChord = this.currentMeasure.chords[nextChordIndex];

            // Only increase if next chord has at least 0.5 beats to give
            if (nextChord.width >= 1) { // Minimum 0.5 after reduction
                chord.width += 0.5;
                nextChord.width -= 0.5;

                this.utils.recalculatePositions(this.currentMeasure);
                this.renderCurrentMeasure();
                this.triggerMeasureChange();
            }
        }
    }

    /**
     * Decrease chord size (only 0.5 increments)
     */
    decreaseChordSize(chordIndex) {
        if (!this.currentMeasure || chordIndex < 0 || chordIndex >= this.currentMeasure.chords.length) {
            return;
        }

        const chord = this.currentMeasure.chords[chordIndex];
        const nextChordIndex = chordIndex + 1;

        // Only decrease if current chord has enough width and there's a next chord
        if (chord.width >= 1 && nextChordIndex < this.currentMeasure.chords.length) { // Minimum 0.5 after reduction
            const nextChord = this.currentMeasure.chords[nextChordIndex];

            chord.width -= 0.5;
            nextChord.width += 0.5;

            this.utils.recalculatePositions(this.currentMeasure);
            this.renderCurrentMeasure();
            this.triggerMeasureChange();
        }
    }

    /**
     * Clear all chords from current measure
     */
    clearMeasure() {
        if (!this.currentMeasure) return;

        this.currentMeasure.chords = [];
        this.renderCurrentMeasure();
        this.triggerMeasureChange();
    }

    /**
     * Render the beats display (dots above measure)
     */
    renderBeatsDisplay() {
        const container = document.getElementById("beats-display");
        if (!container || !this.currentMeasure) return;

        const beats = this.currentMeasure.beats;
        container.innerHTML = "";
        container.style.display = "flex";

        for (let i = 1; i <= beats; i++) {
            const dot = document.createElement("div");
            dot.className = "beat-dot";
            dot.setAttribute("data-beat", i);
            container.appendChild(dot);

            // Add half beat if enabled
            if (this.halfBeatsEnabled) {
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

    /**
     * Render current measure preview
     */
    renderCurrentMeasure() {
        const container = document.getElementById("current-measure-container");
        if (!container) return;

        if (!this.currentMeasure || this.currentMeasure.chords.length === 0) {
            container.innerHTML = '<div class="measure-placeholder"><p>🎵 הוסף אקורדים לתיבה הנוכחית</p></div>';
            return;
        }

        const measureDiv = document.createElement("div");
        measureDiv.className = "measure-preview";

        const totalBeats = this.currentMeasure.beats;

        this.currentMeasure.chords.forEach((chord, index) => {
            const chordContainer = document.createElement("div");
            chordContainer.className = "chord-container";

            const flexBasis = (chord.width / totalBeats) * 100;
            chordContainer.style.flexBasis = `${flexBasis}%`;
            chordContainer.style.flexGrow = '0';
            chordContainer.style.flexShrink = '0';

            const chordDiv = document.createElement("div");
            chordDiv.className = "chord-in-measure";

            if (chord.isEmpty) {
                chordDiv.classList.add("empty-chord");
            }

            chordDiv.innerHTML = `
                <div class="chord-name">${chord.chord}</div>
                <div class="chord-beats">${chord.width} נקישות</div>
                <button class="chord-remove" onclick="window.measureManager.removeChord(${index})">×</button>
            `;

            const controlsDiv = document.createElement("div");
            controlsDiv.className = "chord-size-controls";

            const canDecrease = chord.width >= 1 && index < this.currentMeasure.chords.length - 1;
            const decreaseBtn = document.createElement("button");
            decreaseBtn.className = "size-control-btn decrease-btn";
            decreaseBtn.innerHTML = "−";
            decreaseBtn.disabled = !canDecrease;
            decreaseBtn.onclick = () => this.decreaseChordSize(index);

            const nextChord = this.currentMeasure.chords[index + 1];
            const canIncrease = nextChord && nextChord.width >= 1;
            const increaseBtn = document.createElement("button");
            increaseBtn.className = "size-control-btn increase-btn";
            increaseBtn.innerHTML = "+";
            increaseBtn.disabled = !canIncrease;
            increaseBtn.onclick = () => this.increaseChordSize(index);

            controlsDiv.appendChild(decreaseBtn);
            controlsDiv.appendChild(increaseBtn);

            chordContainer.appendChild(chordDiv);
            chordContainer.appendChild(controlsDiv);
            measureDiv.appendChild(chordContainer);
        });

        container.innerHTML = "";
        container.appendChild(measureDiv);
    }

    /**
     * Update measure counter display
     */
    updateMeasureCounter() {
        const counter = document.querySelector(".measure-counter");
        if (!counter) return;

        if (this.editingLoop && this.editingMeasureIndex >= 0) {
            counter.textContent = `עריכת תיבה ${this.editingMeasureIndex + 1} בלופ "${this.editingLoop.customName}"`;
            counter.style.background = "linear-gradient(135deg, #ffc107, #ff8f00)";
        } else {
            counter.textContent = "תיבה נוכחית";
            counter.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
        }
    }

    /**
     * Start editing a measure from a saved loop
     */
    startEditingMeasure(loop, measureIndex) {
        if (!loop || measureIndex < 0 || measureIndex >= loop.measures.length) {
            alert("תיבה לא נמצאה");
            return;
        }

        this.editingLoop = loop;
        this.editingMeasureIndex = measureIndex;

        const measureToEdit = loop.measures[measureIndex];
        this.currentMeasure = JSON.parse(JSON.stringify(measureToEdit));

        const beatsInput = document.getElementById("measure-beats");
        if (beatsInput) {
            beatsInput.value = this.currentMeasure.beats;
        }

        this.renderBeatsDisplay();
        this.renderCurrentMeasure();
        this.updateMeasureCounter();

        const nextBtn = document.getElementById("next-measure-btn");
        if (nextBtn) {
            nextBtn.textContent = "💾 שמור שינויים";
        }
    }

    /**
     * Save edited measure back to loop
     */
    saveEditedMeasure() {
        if (this.editingLoop && this.editingMeasureIndex >= 0) {
            this.editingLoop.measures[this.editingMeasureIndex] = {...this.currentMeasure};
            this.editingLoop = null;
            this.editingMeasureIndex = -1;
            this.updateMeasureCounter();

            const nextBtn = document.getElementById("next-measure-btn");
            if (nextBtn) {
                nextBtn.textContent = "➡️ מעבר לתיבה הבאה";
            }

            return true;
        }
        return false;
    }

    /**
     * Check if current measure is ready for next step
     */
    isCurrentMeasureReady() {
        return this.currentMeasure && this.currentMeasure.chords.length > 0;
    }

    /**
     * Get current measure data
     */
    getCurrentMeasure() {
        return this.currentMeasure ? {...this.currentMeasure} : null;
    }

    /**
     * Advance to next measure
     */
    nextMeasure() {
        if (!this.isCurrentMeasureReady()) {
            alert("אין אקורדים בתיבה הנוכחית");
            return null;
        }

        // If editing, save the changes
        if (this.saveEditedMeasure()) {
            return null; // Editing mode - don't create new measure
        }

        // Regular mode - get current measure and create new one
        const completedMeasure = this.getCurrentMeasure();
        this.currentMeasureNumber++;

        const beats = this.currentMeasure.beats;
        this.createNewMeasure();

        const beatsInput = document.getElementById("measure-beats");
        if (beatsInput) {
            beatsInput.value = beats;
            this.currentMeasure.beats = beats;
        }

        this.renderBeatsDisplay();
        return completedMeasure;
    }

    /**
     * Trigger measure change event for other components
     */
    triggerMeasureChange() {
        // Notify other components that measure has changed
        if (window.updateButtons) {
            window.updateButtons();
        }

        // Custom event for other listeners
        window.dispatchEvent(new CustomEvent('measureChanged', {
            detail: { measure: this.currentMeasure }
        }));
    }

    /**
     * Reset manager to initial state
     */
    reset() {
        this.currentMeasure = null;
        this.currentMeasureNumber = 1;
        this.editingLoop = null;
        this.editingMeasureIndex = -1;
        this.createNewMeasure();
    }
}

// Export the measure manager
window.MeasureManager = MeasureManager;

