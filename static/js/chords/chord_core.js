// Chord Core Configuration - Basic chord system data and constants
// This file contains all the fundamental chord data and configuration

// Basic chord system configuration
const CHORD_CONFIG = {
    rootLetters: ["A", "B", "C", "D", "E", "F", "G"],
    accidentalOptions: ["", "#", "b"],
    chordTypes: ["", "m", "7", "maj7", "dim", "sus4", "aug", "m7"],
    maxRecentChords: 12
};

// Accidental display configuration for UI
const ACCIDENTAL_DISPLAY = [
    { symbol: "", label: "♮", name: "ללא סימן" },
    { symbol: "#", label: "♯", name: "דיאז" },
    { symbol: "b", label: "♭", name: "במול" }
];

// Default measure configuration
const MEASURE_DEFAULTS = {
    beats: 4,
    minBeats: 1,
    maxBeats: 16,
    defaultChordWidth: 1,
    minChordWidth: 0.5
};

// Application modes
const APP_MODES = {
    EDITING: "editing",
    NEW_SONG: "new_song",
    UNKNOWN: "unknown"
};

// Chord validation utilities
const ChordValidator = {
    /**
     * Check if a chord name is valid
     */
    isValidChordName(chordName) {
        if (!chordName || chordName === "—") return true; // Empty chord is valid

        // Must start with a valid root letter
        const rootLetter = chordName.charAt(0);
        if (!CHORD_CONFIG.rootLetters.includes(rootLetter)) {
            return false;
        }

        let remaining = chordName.slice(1);

        // Check for accidental
        if (remaining.length > 0 && CHORD_CONFIG.accidentalOptions.includes(remaining.charAt(0))) {
            remaining = remaining.slice(1);
        }

        // Check chord type
        return CHORD_CONFIG.chordTypes.includes(remaining);
    },

    /**
     * Parse a chord string into components
     */
    parseChord(chordStr) {
        if (!chordStr || chordStr === "—") {
            return { root: null, accidental: "", type: "", isEmpty: true };
        }

        const root = chordStr.charAt(0);
        let remaining = chordStr.slice(1);
        let accidental = "";

        // Check for accidental
        if (remaining.length > 0 && (remaining.charAt(0) === '#' || remaining.charAt(0) === 'b')) {
            accidental = remaining.charAt(0);
            remaining = remaining.slice(1);
        }

        const type = remaining;

        return {
            root,
            accidental,
            type,
            isEmpty: false
        };
    },

    /**
     * Build chord string from components
     */
    buildChord(root, accidental, type) {
        if (!root) return "—";
        return root + (accidental || "") + (type || "");
    }
};

// Measure utilities
const MeasureUtils = {
    /**
     * Create a new empty measure
     */
    createEmptyMeasure(beats = MEASURE_DEFAULTS.beats) {
        return {
            beats: beats,
            chords: [],
            isEmpty: false
        };
    },

    /**
     * Calculate total used width in a measure
     */
    calculateUsedWidth(measure) {
        return measure.chords.reduce((sum, chord) => sum + chord.width, 0);
    },

    /**
     * Check if a measure is valid (total width equals beats)
     */
    isValidMeasure(measure) {
        const usedWidth = this.calculateUsedWidth(measure);
        return Math.abs(usedWidth - measure.beats) < 0.001; // Allow small floating point errors
    },

    /**
     * Create a chord object for a measure
     */
    createChordObject(chordName, width = MEASURE_DEFAULTS.defaultChordWidth, position = 0) {
        return {
            chord: chordName,
            width: width,
            isEmpty: chordName === "—",
            position: position
        };
    },

    /**
     * Redistribute chords evenly with half-beat precision
     */
    redistributeChordsWithHalvesOnly(measure) {
        if (!measure || measure.chords.length === 0) return;

        const totalBeats = measure.beats;
        const numChords = measure.chords.length;

        // Calculate equal distribution in halves
        const baseWidth = Math.floor((totalBeats * 2) / numChords) / 2;
        const remainder = (totalBeats * 2) % numChords;

        measure.chords.forEach((chord, index) => {
            // Give base width plus extra 0.5 to first 'remainder' chords
            chord.width = baseWidth + (index < remainder ? 0.5 : 0);
        });

        this.recalculatePositions(measure);
    },

    /**
     * Recalculate chord positions in a measure
     */
    recalculatePositions(measure) {
        if (!measure || measure.chords.length === 0) return;

        let currentPosition = 0;
        measure.chords.forEach(chord => {
            chord.position = currentPosition;
            currentPosition += chord.width;
        });
    }
};

// Mode detection utilities
const ModeDetector = {
    /**
     * Determine current application mode
     */
    determineMode() {
        const editingSongId = localStorage.getItem("editingSongId");
        const addingNewSong = localStorage.getItem("addingNewSong");

        console.log("Determining mode - editingSongId:", editingSongId, "addingNewSong:", addingNewSong);

        if (editingSongId && editingSongId !== "null" && editingSongId !== "undefined") {
            return APP_MODES.EDITING;
        } else if (addingNewSong === "true") {
            return APP_MODES.NEW_SONG;
        } else {
            return APP_MODES.UNKNOWN;
        }
    }
};

// Export all utilities for use in other modules
window.ChordCore = {
    CHORD_CONFIG,
    ACCIDENTAL_DISPLAY,
    MEASURE_DEFAULTS,
    APP_MODES,
    ChordValidator,
    MeasureUtils,
    ModeDetector
};
