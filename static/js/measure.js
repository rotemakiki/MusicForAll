// English comment: Create a new measure object for a song chord box
function createMeasure(chord, beats = 4, label = "") {
    return {
        chord: chord,    // Chord name (e.g. "Am")
        beats: beats,    // Number of beats in this box (default: 4)
        label: label     // Custom label for the box (optional)
    };
}

let pendingMeasure = null; // English comment: Holds the measure before adding to the line

function createMeasureBox() {
    const chord = selectedChord;
    const beats = parseInt(document.getElementById("beats-input").value) || 4;
    const label = document.getElementById("label-input").value.trim();

    if (!chord) {
        alert("יש לבחור אקורד!");
        return;
    }

    pendingMeasure = createMeasure(chord, beats, label);

    // Create a visual card for the measure
    const display = document.getElementById("current-measure-box");
    display.innerHTML = `
        <div style="display: inline-block; border: 2px solid #007bff; border-radius: 12px; background: #e9f4ff; min-width: 80px; min-height: 64px; padding: 13px 18px; margin-bottom: 6px;">
            <div style="font-size: 20px; font-weight: bold;">${pendingMeasure.chord}</div>
            <div style="font-size: 16px; color: #226;">${pendingMeasure.beats} נקישות</div>
            ${pendingMeasure.label ? `<div style="font-size: 14px; color: #444; margin-top:3px;">${pendingMeasure.label}</div>` : ""}
        </div>
    `;

    // Show "הוסף תיבה לשורה" button
    document.getElementById("add-measure-btn").style.display = "inline-block";
}

// Add measure to current line
function addMeasureToLine() {
    if (!pendingMeasure) return;

    // Create lines array if needed
    if (!Array.isArray(songChords) || songChords.length === 0) songChords = [[]];
    songChords[songChords.length - 1].push({...pendingMeasure}); // Clone the object

    pendingMeasure = null;
    document.getElementById("current-measure-box").innerHTML = "";
    document.getElementById("add-measure-btn").style.display = "none";

    renderChordLines(); // Will re-render the lines using the new structure
}
