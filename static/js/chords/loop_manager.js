// Loop Manager - Handles loop creation, saving, and management
// This manages saved loops, current loop building, and loop operations

class LoopManager {
    constructor() {
        this.currentLoop = [];
        this.savedLoops = [];
        this.selectedSavedLoop = null;

        // Get utilities from core
        this.utils = window.ChordCore.MeasureUtils;
        this.modeDetector = window.ChordCore.ModeDetector;
        this.appModes = window.ChordCore.APP_MODES;
    }

    /**
     * Initialize loop manager
     */
    init() {
        this.setupLoopInputs();
        this.updateLoopDisplay();
        this.renderSavedLoops();
        this.loadExistingLoopData();
    }

    /**
     * Setup loop name input and buttons
     */
    setupLoopInputs() {
        const loopNameInput = document.getElementById("loop-name");
        if (loopNameInput) {
            loopNameInput.addEventListener('input', () => {
                this.updateSaveButtonState();
            });
        }
    }

    /**
     * TODO: Load existing loop data from backend instead of localStorage
     */
    async loadExistingLoopData() {
        const mode = this.modeDetector.determineMode();
        console.log("Loading loop data for mode:", mode);

        if (mode === this.appModes.EDITING) {
            await this.loadExistingSongLoops();
        } else if (mode === this.appModes.NEW_SONG) {
            await this.loadNewSongLoopsInProgress();
        } else {
            this.clearAllLoopData();
        }
    }

    /**
     * TODO: Replace localStorage with backend API call
     */
    async loadExistingSongLoops() {
        try {
            const editingSongId = localStorage.getItem("editingSongId");

            if (!editingSongId || editingSongId === "null" || editingSongId === "undefined") {
                console.log("No song ID found for editing");
                return;
            }

            // TODO: Replace with backend API call
            const response = await fetch(`/api/songs/${editingSongId}/loops`);
            if (response.ok) {
                const loopsData = await response.json();
                this.restoreLoopsFromData(loopsData.loops || []);
            } else {
                // Fallback to localStorage for now
                this.loadFromLocalStorageBackup();
            }
        } catch (error) {
            console.error("Error loading loops from backend:", error);
            this.loadFromLocalStorageBackup();
        }
    }

    /**
     * TODO: Replace localStorage with backend API call for new songs
     */
    async loadNewSongLoopsInProgress() {
        try {
            // For new songs, check if there are loops in progress
            const addingNewSong = localStorage.getItem("addingNewSong");

            if (addingNewSong === "true") {
                // TODO: Load from backend session or temporary storage
                const savedLoops = localStorage.getItem("loops");

                if (savedLoops && savedLoops !== "[]") {
                    const loopsData = JSON.parse(savedLoops);
                    this.restoreLoopsFromData(loopsData);
                }
            }
        } catch (error) {
            console.log("Error loading new song loops in progress:", error);
            this.clearAllLoopData();
        }
    }

    /**
     * Fallback to localStorage (temporary until backend is ready)
     */
    loadFromLocalStorageBackup() {
        try {
            const savedLoops = localStorage.getItem("loops");

            if (savedLoops && savedLoops !== "[]") {
                const loopsData = JSON.parse(savedLoops);
                this.restoreLoopsFromData(loopsData);
            }
        } catch (error) {
            console.error("Error loading from localStorage backup:", error);
            this.clearAllLoopData();
        }
    }

    /**
     * Restore loops from data array
     */
    restoreLoopsFromData(loopsData) {
        this.savedLoops.length = 0;

        loopsData.forEach((loopData, index) => {
            const restoredLoop = {
                id: Date.now() + index,
                customName: loopData.name || loopData.customName,
                measures: loopData.measures || [],
                measureCount: loopData.measureCount || loopData.measures?.length || 0,
                repeatCount: loopData.repeatCount || 1
            };
            this.savedLoops.push(restoredLoop);
        });

        this.renderSavedLoops();
        console.log("Successfully restored loops:", this.savedLoops);
    }

    /**
     * Clear all loop data
     */
    clearAllLoopData() {
        console.log("Clearing all loop data for fresh start");
        this.savedLoops.length = 0;
        this.currentLoop.length = 0;
        this.renderSavedLoops();
        this.updateLoopDisplay();
    }

    /**
     * Add measure to current loop
     */
    addMeasureToCurrentLoop(measure) {
        if (!measure) {
            console.error("Cannot add empty measure to loop");
            return false;
        }

        this.currentLoop.push({...measure});
        this.updateLoopDisplay();
        this.updateSaveButtonState();
        console.log("Added measure to current loop. New length:", this.currentLoop.length);
        return true;
    }

    /**
     * Remove measure from current loop
     */
    removeMeasureFromCurrentLoop(measureIndex) {
        if (measureIndex < 0 || measureIndex >= this.currentLoop.length) {
            return false;
        }

        if (confirm("האם אתה בטוח שברצונך למחוק תיבה זו מהלופ הנוכחי?")) {
            this.currentLoop.splice(measureIndex, 1);
            this.updateLoopDisplay();
            this.updateSaveButtonState();
            return true;
        }
        return false;
    }

    /**
     * Save current loop
     * TODO: Save to backend instead of just local state
     */
    async saveCurrentLoop() {
        console.log("Attempting to save loop. Current loop length:", this.currentLoop.length);
        console.log("Current loop content:", this.currentLoop);

        if (!this.hasCurrentLoopContent()) {
            console.log("Current loop length:", this.currentLoop.length);
            console.log("Current loop content:", this.currentLoop);
            alert("אין תיבות בלופ הנוכחי");
            return false;
        }

        const loopNameInput = document.getElementById("loop-name");
        const loopName = loopNameInput ? loopNameInput.value.trim() : '';

        if (!loopName) {
            alert("יש להזין שם ללופ");
            return false;
        }

        const newLoop = {
            id: Date.now(),
            customName: loopName,
            measures: [...this.currentLoop],
            measureCount: this.currentLoop.length,
            repeatCount: 1
        };

        this.savedLoops.push(newLoop);

        // TODO: Save to backend
        // await this.saveLoopToBackend(newLoop);

        // Clear current loop
        this.currentLoop = [];
        if (loopNameInput) {
            loopNameInput.value = "";
        }

        this.renderSavedLoops();
        this.updateLoopDisplay();
        this.updateSaveButtonState();

        console.log("Loop saved successfully:", newLoop);
        return true;
    }

    /**
     * TODO: Save loop to backend
     */
    async saveLoopToBackend(loop) {
        try {
            const response = await fetch('/api/loops', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loop)
            });

            if (!response.ok) {
                throw new Error('Failed to save loop to backend');
            }

            const result = await response.json();
            console.log('Loop saved to backend:', result);
            return result;
        } catch (error) {
            console.error('Error saving loop to backend:', error);
            // Continue with local storage for now
        }
    }

    /**
     * Discard current loop
     */
    discardCurrentLoop() {
        if (this.currentLoop.length === 0) {
            alert("אין לופ לבטל");
            return false;
        }

        if (confirm("האם אתה בטוח שברצונך לבטל את הלופ הנוכחי?")) {
            this.currentLoop = [];
            const loopNameInput = document.getElementById("loop-name");
            if (loopNameInput) {
                loopNameInput.value = "";
            }
            this.updateLoopDisplay();
            this.updateSaveButtonState();
            return true;
        }
        return false;
    }

    /**
     * Delete saved loop
     * TODO: Delete from backend as well
     */
    async deleteSavedLoop(loopId) {
        const loopIndex = this.savedLoops.findIndex(loop => loop.id === loopId);
        if (loopIndex === -1) {
            return false;
        }

        const loop = this.savedLoops[loopIndex];
        if (confirm(`האם אתה בטוח שברצונך למחוק את הלופ "${loop.customName}"?`)) {
            this.savedLoops.splice(loopIndex, 1);

            // TODO: Delete from backend
            // await this.deleteLoopFromBackend(loopId);

            this.renderSavedLoops();
            return true;
        }
        return false;
    }

    /**
     * TODO: Delete loop from backend
     */
    async deleteLoopFromBackend(loopId) {
        try {
            const response = await fetch(`/api/loops/${loopId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete loop from backend');
            }

            console.log('Loop deleted from backend');
        } catch (error) {
            console.error('Error deleting loop from backend:', error);
        }
    }

    /**
     * Get loop by ID
     */
    getLoopById(loopId) {
        return this.savedLoops.find(loop => loop.id === loopId);
    }

    /**
     * Update loop display
     */
    updateLoopDisplay() {
        const countElement = document.getElementById("current-loop-count");
        if (countElement) {
            countElement.textContent = this.currentLoop.length;
        }

        const preview = document.getElementById("current-loop-preview");
        if (!preview) return;

        preview.innerHTML = "";

        this.currentLoop.forEach((measure, measureIndex) => {
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

            const removeBtn = document.createElement("button");
            removeBtn.className = "mini-measure-remove";
            removeBtn.innerHTML = "×";
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeMeasureFromCurrentLoop(measureIndex);
            };
            miniMeasure.appendChild(removeBtn);

            preview.appendChild(miniMeasure);
        });

        this.updateSaveButtonState();
    }

    /**
     * Render saved loops
     */
    renderSavedLoops() {
        const container = document.getElementById("saved-loops-container");
        if (!container) return;

        if (this.savedLoops.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic; text-align: center;">עדיין לא נשמרו לופים</p>';
            return;
        }

        container.innerHTML = "";

        this.savedLoops.forEach(loop => {
            const loopDiv = document.createElement("div");
            loopDiv.className = "saved-loop";
            loopDiv.draggable = true;
            loopDiv.dataset.loopId = loop.id;

            const loopHeader = document.createElement("div");
            loopHeader.className = "loop-header";
            loopHeader.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="loop-title">${loop.customName}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="loop-info">${loop.measureCount} תיבות</div>
                        <button class="delete-loop-btn" onclick="window.loopManager.deleteSavedLoop(${loop.id})" title="מחק לופ">×</button>
                    </div>
                </div>
            `;

            const measuresGrid = document.createElement("div");
            measuresGrid.className = "measures-edit-grid";

            loop.measures.forEach((measure, measureIndex) => {
                const measureDiv = document.createElement("div");
                measureDiv.className = "mini-measure clickable";
                measureDiv.title = "לחץ לעריכה";
                measureDiv.onclick = () => {
                    if (window.measureManager) {
                        window.measureManager.startEditingMeasure(loop, measureIndex);
                    }
                };

                const measureNumber = document.createElement("div");
                measureNumber.className = "measure-number";
                measureNumber.textContent = measureIndex + 1;
                measureDiv.appendChild(measureNumber);

                if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
                    measureDiv.classList.add("empty");
                    measureDiv.innerHTML += '<div class="empty-indicator">ריק</div>';
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

                    measureDiv.appendChild(chordsDiv);
                }

                measuresGrid.appendChild(measureDiv);
            });

            loopDiv.appendChild(loopHeader);
            loopDiv.appendChild(measuresGrid);

            // Add drag event listeners
            loopDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(loop));
                e.dataTransfer.effectAllowed = 'copy';
                e.target.style.opacity = '0.7';
            });

            loopDiv.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
            });

            container.appendChild(loopDiv);
        });
    }

    /**
     * Update save button state
     */
    updateSaveButtonState() {
        const saveBtn = document.getElementById("save-loop-btn");
        const discardBtn = document.getElementById("discard-loop-btn");
        const loopNameInput = document.getElementById("loop-name");

        const hasLoopContent = this.hasCurrentLoopContent();
        const hasLoopName = loopNameInput ? loopNameInput.value.trim().length > 0 : false;

        if (saveBtn) {
            saveBtn.disabled = !hasLoopContent || !hasLoopName;
        }

        if (discardBtn) {
            discardBtn.disabled = !hasLoopContent;
        }
    }

    /**
     * Get all saved loops
     */
    getAllSavedLoops() {
        return [...this.savedLoops];
    }

    /**
     * Get current loop
     */
    getCurrentLoop() {
        return [...this.currentLoop];
    }

    /**
     * Check if current loop has content
     */
    hasCurrentLoopContent() {
        console.log("Checking loop content - length:", this.currentLoop.length);
        console.log("Loop content:", this.currentLoop);
        return this.currentLoop.length > 0 && this.currentLoop.some(measure =>
            measure && measure.chords && measure.chords.length > 0
        );
    }

    /**
     * Get loops data for saving
     * TODO: This will be handled by backend API
     */
    getLoopsDataForSaving() {
        return this.savedLoops.map(loop => ({
            name: loop.customName,
            measures: loop.measures,
            measureCount: loop.measureCount,
            repeatCount: loop.repeatCount || 1
        }));
    }

    /**
     * Reset loop manager
     */
    reset() {
        this.currentLoop = [];
        this.savedLoops = [];
        this.selectedSavedLoop = null;

        const loopNameInput = document.getElementById("loop-name");
        if (loopNameInput) {
            loopNameInput.value = "";
        }

        this.renderSavedLoops();
        this.updateLoopDisplay();
    }
}

// Export the loop manager
window.LoopManager = LoopManager;
