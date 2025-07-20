// Chord UI Manager - Handles all chord selection interface components
// This manages the sidebar chord selection, recently used chords, and current selection display

class ChordUIManager {
    constructor() {
        this.selectedAccidental = "";
        this.selectedLetter = null;
        this.selectedType = "";
        this.recentlyUsedChords = [];

        // Get configuration from core
        this.config = window.ChordCore.CHORD_CONFIG;
        this.accidentalDisplay = window.ChordCore.ACCIDENTAL_DISPLAY;
        this.validator = window.ChordCore.ChordValidator;
    }

    /**
     * Initialize the chord UI components
     */
    init() {
        this.renderRootButtons();
        this.renderTypeButtons();
        this.renderAccidentalButtons();
        this.renderRecentlyUsedChords();
        this.updateSelectedChord();
    }

    /**
     * Add chord to recently used list
     * TODO: Move this to backend API for persistence across sessions
     */
    addToRecentlyUsed(chordName) {
        // Remove if already exists
        const existingIndex = this.recentlyUsedChords.indexOf(chordName);
        if (existingIndex !== -1) {
            this.recentlyUsedChords.splice(existingIndex, 1);
        }

        // Add to beginning
        this.recentlyUsedChords.unshift(chordName);

        // Limit size
        if (this.recentlyUsedChords.length > this.config.maxRecentChords) {
            this.recentlyUsedChords = this.recentlyUsedChords.slice(0, this.config.maxRecentChords);
        }

        this.renderRecentlyUsedChords();

        // TODO: Save to backend
        // this.saveRecentChordsToBackend();
    }

    /**
     * TODO: Save recently used chords to backend
     */
    async saveRecentChordsToBackend() {
        try {
            await fetch('/api/chords/recent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chords: this.recentlyUsedChords
                })
            });
        } catch (error) {
            console.log('Could not save recent chords to backend:', error);
        }
    }

    /**
     * TODO: Load recently used chords from backend
     */
    async loadRecentChordsFromBackend() {
        try {
            const response = await fetch('/api/chords/recent');
            if (response.ok) {
                const data = await response.json();
                this.recentlyUsedChords = data.chords || [];
                this.renderRecentlyUsedChords();
            }
        } catch (error) {
            console.log('Could not load recent chords from backend:', error);
        }
    }

    /**
     * Render recently used chords
     */
    renderRecentlyUsedChords() {
        const container = document.getElementById("recently-used-chords");
        if (!container) return;

        container.innerHTML = "";

        if (this.recentlyUsedChords.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 12px; text-align: center;">אקורדים שנוספו יוצגו כאן</p>';
            return;
        }

        this.recentlyUsedChords.forEach(chord => {
            const btn = document.createElement("div");
            btn.className = "recent-chord-btn";
            btn.textContent = chord;
            btn.onclick = () => {
                this.selectChordFromString(chord);
                this.updateSelectedChord();
            };
            container.appendChild(btn);
        });
    }

    /**
     * Parse chord string and select its components
     */
    selectChordFromString(chordStr) {
        // Reset selections
        this.selectedLetter = null;
        this.selectedAccidental = "";
        this.selectedType = "";

        if (!chordStr || chordStr === "—") return;

        const parsed = this.validator.parseChord(chordStr);
        if (!parsed.isEmpty) {
            this.selectedLetter = parsed.root;
            this.selectedAccidental = parsed.accidental;
            this.selectedType = parsed.type;
        }

        // Update UI
        this.renderRootButtons();
        this.renderTypeButtons();
        this.renderAccidentalButtons();
    }

    /**
     * Update the current chord display
     */
    updateSelectedChord() {
        const display = document.getElementById("current-chord-display");
        const addButton = document.querySelector(".add-chord-btn");

        if (!display) return;

        if (!this.selectedLetter) {
            display.textContent = "—";
            if (addButton) addButton.disabled = true;
            return;
        }

        const chord = this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
        display.textContent = chord;
        if (addButton) addButton.disabled = false;
    }

    /**
     * Render root note buttons
     */
    renderRootButtons() {
        const container = document.getElementById("root-letters");
        if (!container) return;

        container.innerHTML = "";

        this.config.rootLetters.forEach(letter => {
            const btn = document.createElement("div");
            btn.className = "chord-btn";
            btn.textContent = letter + this.selectedAccidental;

            if (this.selectedLetter === letter) {
                btn.classList.add("selected");
            }

            btn.onclick = () => {
                this.selectedLetter = letter;
                this.renderRootButtons();
                this.updateSelectedChord();
            };

            container.appendChild(btn);
        });
    }

    /**
     * Render chord type buttons
     */
    renderTypeButtons() {
        const container = document.getElementById("chord-types");
        if (!container) return;

        container.innerHTML = "";

        this.config.chordTypes.forEach(type => {
            const btn = document.createElement("div");
            btn.className = "chord-btn";
            btn.textContent = type || "רגיל";

            if (this.selectedType === type) {
                btn.classList.add("selected");
            }

            btn.onclick = () => {
                this.selectedType = type;
                this.renderTypeButtons();
                this.updateSelectedChord();
            };

            container.appendChild(btn);
        });
    }

    /**
     * Render accidental buttons
     */
    renderAccidentalButtons() {
        const container = document.getElementById("accidental-buttons");
        if (!container) return;

        container.innerHTML = "";

        this.accidentalDisplay.forEach(acc => {
            const btn = document.createElement("button");
            btn.className = "accidental-btn";
            btn.innerHTML = `${acc.label}<br><span style="font-size: 10px;">${acc.name}</span>`;

            if (this.selectedAccidental === acc.symbol) {
                btn.classList.add("selected");
            }

            btn.onclick = () => {
                this.selectedAccidental = acc.symbol;
                this.renderAccidentalButtons();
                this.renderRootButtons();
                this.updateSelectedChord();
            };

            container.appendChild(btn);
        });
    }

    /**
     * Get currently selected chord
     */
    getCurrentChord() {
        if (!this.selectedLetter) return null;
        return this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.selectedLetter = null;
        this.selectedAccidental = "";
        this.selectedType = "";
        this.renderRootButtons();
        this.renderTypeButtons();
        this.renderAccidentalButtons();
        this.updateSelectedChord();
    }

    /**
     * Reset to default state
     */
    reset() {
        this.clearSelection();
        this.recentlyUsedChords = [];
        this.renderRecentlyUsedChords();
    }
}

// Export the chord UI manager
window.ChordUIManager = ChordUIManager;
