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
        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");
        
        if (loopNameSelect) {
            loopNameSelect.addEventListener('change', () => {
                const selectedValue = loopNameSelect.value;
                if (selectedValue === 'other') {
                    // Show custom input
                    if (loopNameInput) {
                        loopNameInput.style.display = 'block';
                        loopNameInput.value = '';
                        loopNameInput.focus();
                    }
                } else {
                    // Hide custom input
                    if (loopNameInput) {
                        loopNameInput.style.display = 'none';
                        loopNameInput.value = '';
                    }
                }
                this.updateSaveButtonState();
            });
        }
        
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

        console.log("🟢 הוספת תיבה ללופ נוכחי:", measure);
        this.currentLoop.push({...measure});
        console.log("🟢 לאחר הוספה - אורך לופ:", this.currentLoop.length);
        console.log("🟢 תוכן לופ מעודכן:", this.currentLoop);

        this.updateLoopDisplay();
        this.updateSaveButtonState();
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
        console.log("=== התחלת שמירת לופ ===");
        console.log("אורך לופ נוכחי:", this.currentLoop.length);
        console.log("תוכן לופ נוכחי:", this.currentLoop);

        const hasContent = this.hasCurrentLoopContent();
        console.log("יש תוכן בלופ:", hasContent);

        if (!hasContent) {
            console.log("❌ הלופ לא מכיל תיבות תקינות");
            alert("אין תיבות בלופ הנוכחי");
            return false;
        }

        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");
        
        let loopName = '';
        if (loopNameSelect && loopNameSelect.value === 'other') {
            // Custom name from input
            loopName = loopNameInput ? loopNameInput.value.trim() : '';
        } else if (loopNameSelect && loopNameSelect.value) {
            // Predefined name from select
            loopName = loopNameSelect.value;
        }

        if (!loopName) {
            alert("יש לבחור או להזין שם ללופ");
            return false;
        }

        console.log("שם הלופ:", loopName);

        const newLoop = {
            id: Date.now(),
            customName: loopName,
            measures: [...this.currentLoop],
            measureCount: this.currentLoop.length,
            repeatCount: 1
        };

        console.log("לופ חדש שנוצר:", newLoop);

        this.savedLoops.push(newLoop);

        // TODO: Save to backend
        // await this.saveLoopToBackend(newLoop);

        // Clear current loop
        this.currentLoop = [];
        if (loopNameSelect) {
            loopNameSelect.value = "";
        }
        if (loopNameInput) {
            loopNameInput.value = "";
            loopNameInput.style.display = 'none';
        }

        this.renderSavedLoops();
        this.updateLoopDisplay();
        this.updateSaveButtonState();

        console.log("✅ לופ נשמר בהצלחה:", newLoop);
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
            const loopNameSelect = document.getElementById("loop-name-select");
            const loopNameInput = document.getElementById("loop-name");
            if (loopNameSelect) {
                loopNameSelect.value = "";
            }
            if (loopNameInput) {
                loopNameInput.value = "";
                loopNameInput.style.display = 'none';
            }
            this.updateLoopDisplay();
            this.updateSaveButtonState();
            return true;
        }
        return false;
    }

    /**
     * Clone a saved loop with name selection dropdown
     */
    cloneSavedLoop(loopId) {
        const loop = this.getLoopById(loopId);
        if (!loop) {
            return false;
        }

        // Create modal for selecting new loop name
        this.showCloneLoopModal(loop);
        return true;
    }

    /**
     * Show modal for selecting new loop name when cloning
     */
    showCloneLoopModal(loop) {
        // Remove existing modal if any
        const existingModal = document.getElementById('clone-loop-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'clone-loop-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            min-width: 300px;
            max-width: 90%;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = 'שכפול לופ - בחר שם חדש';
        title.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;';

        // Create dropdown selector (same as loop-name-select)
        const selectorDiv = document.createElement('div');
        selectorDiv.className = 'loop-name-selector';
        selectorDiv.style.cssText = 'margin-bottom: 10px;';

        const select = document.createElement('select');
        select.className = 'loop-name-select';
        select.id = 'clone-loop-name-select';
        select.style.cssText = `
            padding: 8px 12px;
            border: 2px solid #e17055;
            border-radius: 6px;
            background: white;
            font-weight: 600;
            font-size: 13px;
            width: 100%;
            cursor: pointer;
        `;

        // Add options (same as loop-name-select)
        const options = [
            { value: '', text: 'בחר סוג לופ' },
            { value: 'פתיח (Intro)', text: 'פתיח (Intro)' },
            { value: 'בית (Verse)', text: 'בית (Verse)' },
            { value: 'פזמון (Chorus)', text: 'פזמון (Chorus)' },
            { value: 'מעבר (Bridge)', text: 'מעבר (Bridge)' },
            { value: 'C part', text: 'C part' },
            { value: 'סיום (Outro)', text: 'סיום (Outro)' },
            { value: 'other', text: 'אחר' }
        ];

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });

        // Custom input for "other" option
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'loop-name-input';
        customInput.id = 'clone-loop-name-input';
        customInput.placeholder = 'הכנס שם מותאם אישית...';
        customInput.style.cssText = `
            padding: 6px 10px;
            border: 2px solid #e17055;
            border-radius: 6px;
            background: white;
            font-weight: 600;
            font-size: 13px;
            width: 100%;
            display: none;
            margin-top: 6px;
        `;

        // Handle select change
        select.addEventListener('change', () => {
            if (select.value === 'other') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                customInput.value = '';
            }
        });

        selectorDiv.appendChild(select);
        selectorDiv.appendChild(customInput);

        // Buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;';

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'ביטול';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border: 2px solid #ccc;
            border-radius: 6px;
            background: white;
            color: #666;
            cursor: pointer;
            font-weight: 600;
        `;
        cancelBtn.onclick = () => modal.remove();

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'שכפל';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            cursor: pointer;
            font-weight: 600;
        `;
        confirmBtn.onclick = () => {
            let newName = '';
            if (select.value === 'other') {
                newName = customInput.value.trim();
            } else if (select.value) {
                newName = select.value;
            }

            if (!newName) {
                alert('יש לבחור או להזין שם ללופ');
                return;
            }

            // Create cloned loop with new name
            const newLoop = {
                id: Date.now(),
                customName: newName,
                measures: loop.measures.map(m => JSON.parse(JSON.stringify(m))), // Deep copy
                measureCount: loop.measureCount,
                repeatCount: loop.repeatCount || 1
            };

            this.savedLoops.push(newLoop);
            this.renderSavedLoops();
            modal.remove();

            // Show success notification
            if (window.domHelpers) {
                window.domHelpers.showNotification('הלופ שוכפל בהצלחה!', 'success');
            }
        };

        buttonsDiv.appendChild(cancelBtn);
        buttonsDiv.appendChild(confirmBtn);

        // Assemble modal
        modalContent.appendChild(title);
        modalContent.appendChild(selectorDiv);
        modalContent.appendChild(buttonsDiv);
        modal.appendChild(modalContent);

        // Add to body
        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Focus on select
        setTimeout(() => select.focus(), 100);
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
     * Delete measure from saved loop
     */
    deleteMeasureFromSavedLoop(loopId, measureIndex) {
        const loop = this.getLoopById(loopId);
        if (!loop || measureIndex < 0 || measureIndex >= loop.measures.length) {
            return false;
        }

        if (confirm("האם אתה בטוח שברצונך למחוק תיבה זו מהלופ?")) {
            loop.measures.splice(measureIndex, 1);
            loop.measureCount = loop.measures.length;
            this.renderSavedLoops();
            return true;
        }
        return false;
    }

    /**
     * Edit loop name
     */
    editLoopName(loopId) {
        const loop = this.getLoopById(loopId);
        if (!loop) {
            return false;
        }

        const newName = prompt("הכנס שם חדש ללופ:", loop.customName);
        if (newName && newName.trim()) {
            loop.customName = newName.trim();
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
                    <div class="loop-title" onclick="window.loopManager.editLoopName(${loop.id})" style="cursor: pointer; flex: 1;" title="לחץ לעריכת שם">${loop.customName}</div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="loop-info">${loop.measureCount} תיבות</div>
                        <button class="clone-loop-btn" onclick="window.loopManager.cloneSavedLoop(${loop.id})" title="שכפל לופ">📋</button>
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
                
                // Add delete button for each measure
                const removeBtn = document.createElement("button");
                removeBtn.className = "mini-measure-remove";
                removeBtn.innerHTML = "×";
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`האם אתה בטוח שברצונך למחוק תיבה ${measureIndex + 1} מהלופ "${loop.customName}"?`)) {
                        this.deleteMeasureFromSavedLoop(loop.id, measureIndex);
                    }
                };
                measureDiv.appendChild(removeBtn);

                const measureNumber = document.createElement("div");
                measureNumber.className = "measure-number";
                measureNumber.textContent = measureIndex + 1;
                measureDiv.appendChild(measureNumber);

                if (measure.chords.length === 0 || measure.chords.every(c => c.isEmpty)) {
                    measureDiv.classList.add("empty");
                    const emptyIndicator = document.createElement("div");
                    emptyIndicator.className = "empty-indicator";
                    emptyIndicator.textContent = "ריק";
                    measureDiv.appendChild(emptyIndicator);
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

            // Add drag event listeners to support drop into song structure
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
        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");

        const hasLoopContent = this.hasCurrentLoopContent();
        let hasLoopName = false;
        
        if (loopNameSelect) {
            if (loopNameSelect.value === 'other') {
                hasLoopName = loopNameInput ? loopNameInput.value.trim().length > 0 : false;
            } else {
                hasLoopName = loopNameSelect.value.length > 0;
            }
        }

        console.log("🔄 עדכון מצב כפתורים:");
        console.log("   יש תוכן בלופ:", hasLoopContent);
        console.log("   יש שם ללופ:", hasLoopName);

        if (saveBtn) {
            saveBtn.disabled = !hasLoopContent || !hasLoopName;
            console.log("   כפתור שמירה מופעל:", !saveBtn.disabled);
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
     * Check if current loop has content - מספיק שיש לפחות תיבה אחת
     */
    hasCurrentLoopContent() {
        // מספיק שיש לפחות תיבה אחת בלופ - לא צריך לבדוק אם יש בה אקורדים תקינים
        // המשתמש יכול לשמור לופ גם עם תיבה ריקה או חלקית
        return this.currentLoop.length > 0;
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

        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");
        if (loopNameSelect) {
            loopNameSelect.value = "";
        }
        if (loopNameInput) {
            loopNameInput.value = "";
            loopNameInput.style.display = 'none';
        }

        this.renderSavedLoops();
        this.updateLoopDisplay();
    }
}

// Export the loop manager
window.LoopManager = LoopManager;
