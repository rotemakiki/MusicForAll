// Chord UI Manager - Handles all chord selection interface components
// This manages the sidebar chord selection, recently used chords, and current selection display
// Updated with advanced chords support including slash chords

class ChordUIManager {
    constructor() {
        this.selectedAccidental = "";
        this.selectedLetter = null;
        this.selectedType = "";
        this.recentlyUsedChords = [];

        // Advanced features state
        this.slashMode = false;
        this.selectedBassNote = null;
        this.extendedMode = false;

        // Get configuration from core
        this.config = window.ChordCore.CHORD_CONFIG;
        this.accidentalDisplay = window.ChordCore.ACCIDENTAL_DISPLAY;
        this.validator = window.ChordCore.ChordValidator;
    }

    /**
     * Initialize the chord UI components
     */
    init() {
        const mode = window.ChordCore.ModeDetector.determineMode();

        // **תיקון**: נקה אקורדים שמורים רק עבור שיר חדש שלא התחיל עדיין
        if (mode === window.ChordCore.APP_MODES.NEW_SONG) {
            const hasExistingChords = localStorage.getItem("chords");
            const justStarted = !hasExistingChords; // אם אין אקורדים זה אומר שזה התחלה חדשה

            if (justStarted) {
                this.recentlyUsedChords = [];
                console.log("🧹 נוקו אקורדים שנוספו לאחרונה - שיר חדש");
            }
        }

        this.renderRootButtons();
        this.renderTypeButtons();
        this.renderAccidentalButtons();
        this.renderRecentlyUsedChords();
        this.updateSelectedChord();

        // Initialize advanced features
        this.initAdvancedFeatures();
    }

    /**
     * Initialize advanced chord features
     */
    initAdvancedFeatures() {
        // Event listeners for toggle buttons
        const slashToggle = document.getElementById('slash-mode-toggle');
        const extendedToggle = document.getElementById('extended-mode-toggle');

        if (slashToggle) {
            slashToggle.addEventListener('click', () => this.toggleSlashMode());
        }

        if (extendedToggle) {
            extendedToggle.addEventListener('click', () => this.toggleExtendedMode());
        }

        // Close panel buttons
        const closeSlashBtn = document.getElementById('close-slash-panel');
        const closeExtendedBtn = document.getElementById('close-extended-panel');

        if (closeSlashBtn) {
            closeSlashBtn.addEventListener('click', () => this.closeSlashMode());
        }

        if (closeExtendedBtn) {
            closeExtendedBtn.addEventListener('click', () => this.closeExtendedMode());
        }
    }

    /**
     * Toggle slash chord mode
     */
    toggleSlashMode() {
        this.slashMode = !this.slashMode;
        const panel = document.getElementById('slash-chords-panel');
        const toggle = document.getElementById('slash-mode-toggle');

        if (this.slashMode) {
            panel.style.display = 'block';
            toggle.classList.add('active');
            this.renderBassNotes();

            // Close extended mode if open
            if (this.extendedMode) {
                this.closeExtendedMode();
            }
        } else {
            this.closeSlashMode();
        }
    }

    /**
     * Close slash chord mode
     */
    closeSlashMode() {
        this.slashMode = false;
        this.selectedBassNote = null;

        const panel = document.getElementById('slash-chords-panel');
        const toggle = document.getElementById('slash-mode-toggle');

        panel.style.display = 'none';
        toggle.classList.remove('active');

        this.updateSlashChordPreview();
        this.updateSelectedChord();
    }

    /**
     * Toggle extended chord mode
     */
    toggleExtendedMode() {
        this.extendedMode = !this.extendedMode;
        const panel = document.getElementById('extended-chords-panel');
        const toggle = document.getElementById('extended-mode-toggle');

        if (this.extendedMode) {
            panel.style.display = 'block';
            toggle.classList.add('active');
            this.renderExtendedChords();

            // Close slash mode if open
            if (this.slashMode) {
                this.closeSlashMode();
            }
        } else {
            this.closeExtendedMode();
        }
    }

    /**
     * Close extended chord mode
     */
    closeExtendedMode() {
        this.extendedMode = false;

        const panel = document.getElementById('extended-chords-panel');
        const toggle = document.getElementById('extended-mode-toggle');

        panel.style.display = 'none';
        toggle.classList.remove('active');
    }

    /**
     * Render bass notes for slash chords
     */
    renderBassNotes() {
        const container = document.getElementById('bass-notes-grid');
        if (!container) return;

        container.innerHTML = '';

        const bassNotes = window.ChordCore.EXTENDED_CHORD_CONFIG.slash.bassNotes;

        bassNotes.forEach(note => {
            const btn = document.createElement('div');
            btn.className = 'chord-btn';
            btn.textContent = note;

            if (this.selectedBassNote === note) {
                btn.classList.add('selected');
            }

            btn.onclick = () => {
                this.selectedBassNote = note;
                this.renderBassNotes();
                this.updateSlashChordPreview();
            };

            container.appendChild(btn);
        });
    }

    /**
     * Update slash chord preview
     */
    updateSlashChordPreview() {
        const preview = document.getElementById('slash-chord-preview');
        if (!preview) return;

        if (!this.selectedLetter || !this.selectedBassNote) {
            preview.textContent = '—';
            return;
        }

        const rootChord = this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
        const slashChord = window.ChordCore.buildSlashChord(rootChord, this.selectedBassNote);

        preview.textContent = slashChord || '—';
    }

    /**
     * Render extended chord types
     */
    renderExtendedChords() {
        const extendedConfig = window.ChordCore.EXTENDED_CHORD_CONFIG;

        // Render ninth chords
        this.renderChordCategory('extended-ninth-types', [
            ...extendedConfig.extended.ninth,
            ...extendedConfig.extended.eleventh,
            ...extendedConfig.extended.thirteenth
        ]);

        // Render altered chords
        this.renderChordCategory('altered-chord-types', [
            ...extendedConfig.altered.ninth,
            ...extendedConfig.altered.eleventh,
            ...extendedConfig.altered.special
        ]);

        // Render special chords
        this.renderChordCategory('special-chord-types', [
            ...extendedConfig.special.omitted,
            ...extendedConfig.special.power,
            ...extendedConfig.special.quartal
        ]);
    }

    /**
     * Render a category of chord types
     */
    renderChordCategory(containerId, chordTypes) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        chordTypes.forEach(type => {
            const btn = document.createElement('div');
            btn.className = 'chord-btn';

            // Use display name if available
            const displayName = window.ChordCore.getExtendedChordDisplayName(type);
            btn.textContent = displayName;

            if (this.selectedType === type) {
                btn.classList.add('selected');
            }

            btn.onclick = () => {
                this.selectedType = type;
                this.renderExtendedChords();
                this.updateSelectedChord();

                // Close extended mode after selection
                setTimeout(() => {
                    this.closeExtendedMode();
                }, 200);
            };

            container.appendChild(btn);
        });
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
     * Parse chord string and select its components (updated for slash chords)
     */
    selectChordFromString(chordStr) {
        // Reset selections
        this.selectedLetter = null;
        this.selectedAccidental = "";
        this.selectedType = "";
        this.selectedBassNote = null;

        // Close any open panels
        this.closeSlashMode();
        this.closeExtendedMode();

        if (!chordStr || chordStr === "—") return;

        // Check if it's a slash chord
        if (window.ChordCore.isSlashChord(chordStr)) {
            const slashParts = window.ChordCore.parseSlashChord(chordStr);

            // Parse the root chord part
            const parsed = this.validator.parseChord(slashParts.rootChord);
            if (!parsed.isEmpty) {
                this.selectedLetter = parsed.root;
                this.selectedAccidental = parsed.accidental;
                this.selectedType = parsed.type;
                this.selectedBassNote = slashParts.bassNote;

                // Activate slash mode
                this.slashMode = true;
                const panel = document.getElementById('slash-chords-panel');
                const toggle = document.getElementById('slash-mode-toggle');
                if (panel && toggle) {
                    panel.style.display = 'block';
                    toggle.classList.add('active');
                    this.renderBassNotes();
                    this.updateSlashChordPreview();
                }
            }
        } else {
            // Regular chord parsing
            const parsed = this.validator.parseChord(chordStr);
            if (!parsed.isEmpty) {
                this.selectedLetter = parsed.root;
                this.selectedAccidental = parsed.accidental;
                this.selectedType = parsed.type;

                // If it's an extended chord type, show extended panel
                if (window.ChordCore.isExtendedChordType(parsed.type)) {
                    this.extendedMode = true;
                    const panel = document.getElementById('extended-chords-panel');
                    const toggle = document.getElementById('extended-mode-toggle');
                    if (panel && toggle) {
                        panel.style.display = 'block';
                        toggle.classList.add('active');
                        this.renderExtendedChords();
                    }
                }
            }
        }

        // Update UI
        this.renderRootButtons();
        this.renderTypeButtons();
        this.renderAccidentalButtons();
    }

    /**
     * Update the current chord display (updated for slash chords)
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

        let chord;

        // If slash mode is active and bass note is selected
        if (this.slashMode && this.selectedBassNote) {
            const rootChord = this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
            chord = window.ChordCore.buildSlashChord(rootChord, this.selectedBassNote);
        } else {
            chord = this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
        }

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

                // Update slash chord preview if in slash mode
                if (this.slashMode) {
                    this.updateSlashChordPreview();
                }
            };

            container.appendChild(btn);
        });
    }

    /**
     * Render chord type buttons organized by categories
     */
    renderTypeButtons() {
        // Define chord categories with all available chord types
        const chordCategories = {
            triads: {
                container: 'triads-chord-types',
                chords: ['', 'm', 'dim', 'aug']
            },
            seventh: {
                container: 'seventh-chord-types',
                chords: ['7', 'maj7', 'm7', '6', 'm6']
            },
            extended: {
                container: 'extended-chord-types',
                chords: ['sus2', 'sus4', 'add9']
            }
        };

        // Render each category
        Object.keys(chordCategories).forEach(categoryKey => {
            const category = chordCategories[categoryKey];
            const container = document.getElementById(category.container);

            if (!container) return;

            container.innerHTML = "";

            category.chords.forEach(type => {
                const btn = document.createElement("div");
                btn.className = "chord-btn";

                // Display names for chord types
                const displayNames = {
                    '': 'Major',
                    'm': 'Minor',
                    'dim': 'Dim',
                    'aug': 'Aug',
                    '7': '7',
                    'maj7': 'Maj7',
                    'm7': 'm7',
                    '6': '6',
                    'm6': 'm6',
                    'sus2': 'Sus2',
                    'sus4': 'Sus4',
                    'add9': 'Add9'
                };

                btn.textContent = displayNames[type] || type;

                if (this.selectedType === type) {
                    btn.classList.add("selected");
                }

                btn.onclick = () => {
                    this.selectedType = type;
                    this.renderTypeButtons();
                    this.updateSelectedChord();

                    // Update slash chord preview if in slash mode
                    if (this.slashMode) {
                        this.updateSlashChordPreview();
                    }
                };

                container.appendChild(btn);
            });
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

                // Update slash chord preview if in slash mode
                if (this.slashMode) {
                    this.updateSlashChordPreview();
                }
            };

            container.appendChild(btn);
        });
    }

    /**
     * Get currently selected chord (updated for slash chords)
     */
    getCurrentChord() {
        if (!this.selectedLetter) return null;

        // If slash mode is active and bass note is selected
        if (this.slashMode && this.selectedBassNote) {
            const rootChord = this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
            return window.ChordCore.buildSlashChord(rootChord, this.selectedBassNote);
        }

        return this.validator.buildChord(this.selectedLetter, this.selectedAccidental, this.selectedType);
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.selectedLetter = null;
        this.selectedAccidental = "";
        this.selectedType = "";
        this.selectedBassNote = null;

        // Close any open panels
        this.closeSlashMode();
        this.closeExtendedMode();

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
