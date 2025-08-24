// Chord Core Configuration - Basic chord system data and constants
// This file contains all the fundamental chord data and configuration
// Updated with extended chords support including slash chords

// Basic chord system configuration - UPDATED WITH NEW CHORD TYPES
const CHORD_CONFIG = {
    rootLetters: ["A", "B", "C", "D", "E", "F", "G"],
    accidentalOptions: ["", "#", "b"],
    // עדכון: הוספנו 7b5 למרובעים, add11 ו-add13 למחומשים
    chordTypes: ["", "m", "7", "maj7", "dim", "sus4", "sus2", "aug", "m7", "6", "m6", "7b5", "add9", "add11", "add13"],
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

// הוסף אקורדים מתקדמים לקונפיגורציה הקיימת
const EXTENDED_CHORD_CONFIG = {
    // אקורדים עם הרחבות (9, 11, 13)
    extended: {
        ninth: ['9', 'maj9', 'm9', 'add9'],
        eleventh: ['11', 'm11', 'maj11', 'add11'],
        thirteenth: ['13', 'm13', 'maj13', 'add13']
    },

    // אקורדים עם שינויים (אלטרד)
    altered: {
        ninth: ['7b9', '7#9', '9b5', '9#5'],
        eleventh: ['7#11', 'maj7#11'],
        special: ['mMaj7', '7b5', '7#5']
    },

    // אקורדים עם תוספות מיוחדות
    special: {
        omitted: ['no3', 'no5'],
        power: ['5'],
        quartal: ['sus2sus4']
    },

    // אקורדי סלאש - בנוי דינמית
    slash: {
        enabled: false, // יופעל רק אם המשתמש בוחר
        bassNotes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    }
};

// שמות תצוגה לאקורדים המתקדמים - עדכון עם האקורדים החדשים
const EXTENDED_DISPLAY_NAMES = {
    // Extended chords
    '9': 'Dom9',
    'maj9': 'Maj9',
    'm9': 'Min9',
    'add9': 'Add9',
    '11': 'Dom11',
    'm11': 'Min11',
    'maj11': 'Maj11',
    'add11': 'Add11',  // חדש
    '13': 'Dom13',
    'm13': 'Min13',
    'maj13': 'Maj13',
    'add13': 'Add13',  // חדש

    // Altered chords
    '7b9': '7♭9',
    '7#9': '7#9',
    '9b5': '9♭5',
    '9#5': '9#5',
    '7#11': '7#11',
    'maj7#11': 'Maj7#11',
    'mMaj7': 'mMaj7',
    '7b5': '7♭5',     // חדש - דומיננט 7 עם קווינטה מוקטנת
    '7#5': '7#5',

    // Special chords
    'no3': '(no3)',
    'no5': '(no5)',
    '5': 'Power',
    'sus2sus4': 'Sus2/4'
};

// Chord validation utilities
const ChordValidator = {
    /**
     * Check if a chord name is valid (updated for extended chords)
     */
    isValidChordName(chordName) {
        if (!chordName || chordName === "—") return true; // Empty chord is valid

        // Check for slash chord
        if (chordName.includes('/')) {
            const parts = chordName.split('/');
            if (parts.length !== 2) return false;

            // Validate root chord part
            const rootChordValid = this.isValidChordName(parts[0]);

            // Validate bass note part
            const bassNote = parts[1];
            const validBassNotes = EXTENDED_CHORD_CONFIG.slash.bassNotes;
            const bassNoteValid = validBassNotes.includes(bassNote);

            return rootChordValid && bassNoteValid;
        }

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

        // Check chord type - include both basic and extended types
        const allChordTypes = [
            ...CHORD_CONFIG.chordTypes,
            ...EXTENDED_CHORD_CONFIG.extended.ninth,
            ...EXTENDED_CHORD_CONFIG.extended.eleventh,
            ...EXTENDED_CHORD_CONFIG.extended.thirteenth,
            ...EXTENDED_CHORD_CONFIG.altered.ninth,
            ...EXTENDED_CHORD_CONFIG.altered.eleventh,
            ...EXTENDED_CHORD_CONFIG.altered.special,
            ...EXTENDED_CHORD_CONFIG.special.omitted,
            ...EXTENDED_CHORD_CONFIG.special.power,
            ...EXTENDED_CHORD_CONFIG.special.quartal
        ];

        return allChordTypes.includes(remaining);
    },

    /**
     * Parse a chord string into components (updated for extended chords)
     */
    parseChord(chordStr) {
        if (!chordStr || chordStr === "—") {
            return { root: null, accidental: "", type: "", isEmpty: true, isSlash: false };
        }

        // Handle slash chords
        if (chordStr.includes('/')) {
            const parts = chordStr.split('/');
            const rootChordParsed = this.parseChord(parts[0]);
            return {
                ...rootChordParsed,
                isSlash: true,
                bassNote: parts[1] || '',
                originalString: chordStr
            };
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
            isEmpty: false,
            isSlash: false
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

// Extended Chord Utilities
const ExtendedChordUtils = {
    /**
     * Build slash chord from root chord and bass note
     */
    buildSlashChord(rootChord, bassNote) {
        if (!rootChord || !bassNote) return null;

        // בדוק שהאקורד הבסיסי תקין
        if (rootChord === "—" || rootChord.trim() === "") return null;

        return `${rootChord}/${bassNote}`;
    },

    /**
     * Check if chord is a slash chord
     */
    isSlashChord(chordString) {
        return chordString && chordString.includes('/');
    },

    /**
     * Parse slash chord into components
     */
    parseSlashChord(chordString) {
        if (!this.isSlashChord(chordString)) {
            return { rootChord: chordString, bassNote: null, isSlash: false };
        }

        const parts = chordString.split('/');
        return {
            rootChord: parts[0] || '',
            bassNote: parts[1] || '',
            isSlash: true
        };
    },

    /**
     * Get display name for extended chord type
     */
    getExtendedChordDisplayName(chordType) {
        return EXTENDED_DISPLAY_NAMES[chordType] || chordType;
    },

    /**
     * Check if chord type is extended
     */
    isExtendedChordType(chordType) {
        const allExtended = [
            ...EXTENDED_CHORD_CONFIG.extended.ninth,
            ...EXTENDED_CHORD_CONFIG.extended.eleventh,
            ...EXTENDED_CHORD_CONFIG.extended.thirteenth,
            ...EXTENDED_CHORD_CONFIG.altered.ninth,
            ...EXTENDED_CHORD_CONFIG.altered.eleventh,
            ...EXTENDED_CHORD_CONFIG.altered.special,
            ...EXTENDED_CHORD_CONFIG.special.omitted,
            ...EXTENDED_CHORD_CONFIG.special.power,
            ...EXTENDED_CHORD_CONFIG.special.quartal
        ];

        return allExtended.includes(chordType);
    },

    /**
     * Validate extended chord
     */
    validateExtendedChord(rootLetter, accidental, chordType, bassNote = null) {
        // ולידציה בסיסית
        if (!rootLetter) return { isValid: false, error: "חסר תו יסוד" };

        // בדוק אם סוג האקורד קיים
        if (chordType && !this.isExtendedChordType(chordType)) {
            // אם זה לא אקורד מתקדם, תן למערכת הרגילה לטפל
            return { isValid: true, isExtended: false };
        }

        // ולידציה של אקורד מתקדם
        const allValidTypes = [
            ...CHORD_CONFIG.chordTypes,
            ...EXTENDED_CHORD_CONFIG.extended.ninth,
            ...EXTENDED_CHORD_CONFIG.extended.eleventh,
            ...EXTENDED_CHORD_CONFIG.extended.thirteenth,
            ...EXTENDED_CHORD_CONFIG.altered.ninth,
            ...EXTENDED_CHORD_CONFIG.altered.eleventh,
            ...EXTENDED_CHORD_CONFIG.altered.special,
            ...EXTENDED_CHORD_CONFIG.special.omitted,
            ...EXTENDED_CHORD_CONFIG.special.power,
            ...EXTENDED_CHORD_CONFIG.special.quartal
        ];

        if (!allValidTypes.includes(chordType)) {
            return { isValid: false, error: `סוג אקורד לא מוכר: ${chordType}` };
        }

        // אם יש תו בס - ולידציה נוספת
        if (bassNote && !EXTENDED_CHORD_CONFIG.slash.bassNotes.includes(bassNote)) {
            return { isValid: false, error: `תו בס לא חוקי: ${bassNote}` };
        }

        return {
            isValid: true,
            isExtended: true,
            chord: rootLetter + accidental + chordType + (bassNote ? `/${bassNote}` : ''),
            displayName: this.getExtendedChordDisplayName(chordType)
        };
    }
};

// Measure handling utilities
const MeasureUtils = {
    /**
     * Create a new empty measure
     */
    createEmptyMeasure(beats = MEASURE_DEFAULTS.beats) {
        return {
            id: Date.now() + Math.random(),
            beats: beats,
            chords: []
        };
    },

    /**
     * Calculate total width of chords in a measure
     */
    getTotalWidth(measure) {
        if (!measure || !measure.chords) return 0;
        return measure.chords.reduce((total, chord) => total + (chord.width || 1), 0);
    },

    /**
     * Check if a chord can fit in a measure
     */
    canFitChord(measure, chordWidth = MEASURE_DEFAULTS.defaultChordWidth) {
        const currentWidth = this.getTotalWidth(measure);
        return currentWidth + chordWidth <= measure.beats;
    },

    /**
     * Distribute chord widths evenly in a measure
     */
    distributeEvenly(measure) {
        if (!measure || !measure.chords || measure.chords.length === 0) return;

        const evenWidth = measure.beats / measure.chords.length;

        measure.chords.forEach(chord => {
            chord.width = Math.max(evenWidth > MEASURE_DEFAULTS.minChordWidth ? evenWidth : MEASURE_DEFAULTS.minChordWidth, 0.5);
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

// Export all utilities for use in other modules (updated with extended features)
window.ChordCore = {
    CHORD_CONFIG,
    ACCIDENTAL_DISPLAY,
    MEASURE_DEFAULTS,
    APP_MODES,
    EXTENDED_CHORD_CONFIG,
    EXTENDED_DISPLAY_NAMES,
    ChordValidator,
    ExtendedChordUtils,
    MeasureUtils,
    ModeDetector,

    // Legacy compatibility functions
    buildSlashChord: ExtendedChordUtils.buildSlashChord,
    isSlashChord: ExtendedChordUtils.isSlashChord,
    parseSlashChord: ExtendedChordUtils.parseSlashChord,
    getExtendedChordDisplayName: ExtendedChordUtils.getExtendedChordDisplayName,
    isExtendedChordType: ExtendedChordUtils.isExtendedChordType,
    validateExtendedChord: ExtendedChordUtils.validateExtendedChord
};

// לוג לדיבוג
console.log("🎸 Chord Core Extended - טעון בהצלחה", {
    basicChords: CHORD_CONFIG.chordTypes.length,
    extendedChords: Object.keys(EXTENDED_DISPLAY_NAMES).length,
    slashSupport: true,
    version: "2.2.0"
});
