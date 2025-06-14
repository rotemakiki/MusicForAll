// English comment: Create a new empty measure with total beats and chord list
function createEmptyMeasure(beats = 4) {
    return {
        beats: beats,
        chords: []
    };
}

// English comment: Add a chord object with specific width into a measure
function addChordToMeasure(measure, chordName, width) {
    measure.chords.push({
        chord: chordName,
        width: width
    });
}

// English comment: Calculate the total used width in a measure
function calculateUsedWidth(measure) {
    return measure.chords.reduce((sum, chord) => sum + chord.width, 0);
}

// English comment: Check if a new chord can fit in the measure
function canAddChord(measure, newChordWidth) {
    const used = calculateUsedWidth(measure);
    return used + newChordWidth <= measure.beats;
}
