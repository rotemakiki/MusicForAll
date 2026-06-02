// SVGuitar integration for the chord selector sidebar.
// The first pass intentionally focuses on common guitar shapes. Colors stay
// default for now so we can tune the visual language separately.
(function () {
    const NOTE_TO_FRET_ON_LOW_E = {
        E: 0,
        F: 1,
        "F#": 2,
        Gb: 2,
        G: 3,
        "G#": 4,
        Ab: 4,
        A: 5,
        "A#": 6,
        Bb: 6,
        B: 7,
        C: 8,
        "C#": 9,
        Db: 9,
        D: 10,
        "D#": 11,
        Eb: 11,
    };

    const OPEN_SHAPES = {
        C: { fingers: [[6, "x"], [5, 3, "3"], [4, 2, "2"], [3, "o"], [2, 1, "1"], [1, "o"]] },
        Cm: { position: 3, fingers: [[6, "x"], [4, 3, "3"], [3, 2, "2"], [2, 1, "1"]], barres: [{ fromString: 5, toString: 1, fret: 1, text: "1" }] },
        C7: { fingers: [[6, "x"], [5, 3, "3"], [4, 2, "2"], [3, 3, "4"], [2, 1, "1"], [1, "o"]] },
        D: { fingers: [[6, "x"], [5, "x"], [4, "o"], [3, 2, "1"], [2, 3, "3"], [1, 2, "2"]] },
        Dm: { fingers: [[6, "x"], [5, "x"], [4, "o"], [3, 2, "2"], [2, 3, "3"], [1, 1, "1"]] },
        D7: { fingers: [[6, "x"], [5, "x"], [4, "o"], [3, 2, "2"], [2, 1, "1"], [1, 2, "3"]] },
        E: { fingers: [[6, "o"], [5, 2, "2"], [4, 2, "3"], [3, 1, "1"], [2, "o"], [1, "o"]] },
        Em: { fingers: [[6, "o"], [5, 2, "2"], [4, 2, "3"], [3, "o"], [2, "o"], [1, "o"]] },
        E7: { fingers: [[6, "o"], [5, 2, "2"], [4, "o"], [3, 1, "1"], [2, "o"], [1, "o"]] },
        F: { position: 1, fingers: [[5, 3, "3"], [4, 3, "4"], [3, 2, "2"]], barres: [{ fromString: 6, toString: 1, fret: 1, text: "1" }] },
        Fm: { position: 1, fingers: [[5, 3, "3"], [4, 3, "4"]], barres: [{ fromString: 6, toString: 1, fret: 1, text: "1" }] },
        G: { fingers: [[6, 3, "2"], [5, 2, "1"], [4, "o"], [3, "o"], [2, "o"], [1, 3, "3"]] },
        G7: { fingers: [[6, 3, "3"], [5, 2, "2"], [4, "o"], [3, "o"], [2, "o"], [1, 1, "1"]] },
        A: { fingers: [[6, "x"], [5, "o"], [4, 2, "1"], [3, 2, "2"], [2, 2, "3"], [1, "o"]] },
        Am: { fingers: [[6, "x"], [5, "o"], [4, 2, "2"], [3, 2, "3"], [2, 1, "1"], [1, "o"]] },
        A7: { fingers: [[6, "x"], [5, "o"], [4, 2, "1"], [3, "o"], [2, 2, "2"], [1, "o"]] },
        B: { position: 2, fingers: [[6, "x"], [4, 3, "2"], [3, 3, "3"], [2, 3, "4"]], barres: [{ fromString: 5, toString: 1, fret: 1, text: "1" }] },
        Bm: { position: 2, fingers: [[6, "x"], [4, 3, "3"], [3, 3, "4"], [2, 2, "2"]], barres: [{ fromString: 5, toString: 1, fret: 1, text: "1" }] },
        B7: { fingers: [[6, "x"], [5, 2, "2"], [4, 1, "1"], [3, 2, "3"], [2, "o"], [1, 2, "4"]] },
    };

    function parseChordName(chordName) {
        const value = String(chordName || "").trim();
        if (!value || value === "—") return null;
        const match = value.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
        if (!match) return null;
        return {
            root: match[1] + (match[2] || ""),
            type: match[3] || "",
            bass: match[4] || "",
            title: value,
        };
    }

    function shapeKey(parsed) {
        return parsed.root + parsed.type;
    }

    function movableEShape(parsed) {
        const position = NOTE_TO_FRET_ON_LOW_E[parsed.root];
        if (!position || position < 1) return null;

        const base = {
            position,
            fingers: [],
            barres: [{ fromString: 6, toString: 1, fret: 1, text: "1" }],
        };

        if (parsed.type === "") {
            base.fingers = [[5, 3, "3"], [4, 3, "4"], [3, 2, "2"]];
        } else if (parsed.type === "m") {
            base.fingers = [[5, 3, "3"], [4, 3, "4"]];
        } else if (parsed.type === "7") {
            base.fingers = [[5, 3, "3"], [3, 2, "2"]];
        } else if (parsed.type === "m7") {
            base.fingers = [[5, 3, "3"]];
        } else if (parsed.type === "sus4") {
            base.fingers = [[5, 3, "2"], [4, 3, "3"], [3, 3, "4"]];
        } else {
            return null;
        }

        return base;
    }

    function chordShape(chordName) {
        const parsed = parseChordName(chordName);
        if (!parsed) return null;

        const open = OPEN_SHAPES[shapeKey(parsed)];
        if (open) return { ...open, title: parsed.title };

        const movable = movableEShape(parsed);
        if (movable) return { ...movable, title: parsed.title };

        return null;
    }

    function renderEmpty(container, message) {
        container.innerHTML = `<div class="svguitar-empty">${message}</div>`;
    }

    function renderChord(selector, chordName) {
        const container = typeof selector === "string" ? document.querySelector(selector) : selector;
        if (!container) return false;

        if (!window.svguitar || !window.svguitar.SVGuitarChord) {
            renderEmpty(container, "SVGuitar לא נטען");
            return false;
        }

        const shape = chordShape(chordName);
        if (!shape) {
            renderEmpty(container, chordName && chordName !== "—" ? "אין עדיין דיאגרמה לאקורד הזה" : "בחר אקורד להצגת תרשים");
            return false;
        }

        container.innerHTML = "";
        new window.svguitar.SVGuitarChord(container)
            .configure({
                strings: 6,
                frets: 4,
                position: shape.position || 1,
                title: shape.title,
                tuning: ["E", "A", "D", "G", "B", "E"],
                fontFamily: "Arial, Helvetica, sans-serif",
                titleFontSize: 28,
                tuningsFontSize: 16,
                fretLabelFontSize: 16,
                fingerSize: 0.55,
                fingerTextSize: 14,
                sidePadding: 0.26,
                fretSize: 1.15,
                titleBottomMargin: 0,
                noPosition: false,
            })
            .chord({
                title: shape.title,
                position: shape.position || 1,
                fingers: shape.fingers || [],
                barres: shape.barres || [],
            })
            .draw();

        return true;
    }

    window.SVGuitarChordDictionary = {
        renderChord,
        chordShape,
    };
})();
