// Loop Manager - Handles loop creation, saving, and management
// This manages saved loops, current loop building, and loop operations

class LoopManager {
    constructor() {
        this.currentLoop = [];
        this.savedLoops = [];
        this.selectedSavedLoop = null;
        this.editingLoopId = null; // Track which loop is being edited (for content editing - adding measures)
        this.editingLoopNameId = null; // Track which loop's name is being edited

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
                
                // If editing a saved loop name, update its name immediately
                if (this.editingLoopNameId && selectedValue && selectedValue !== 'other') {
                    const loop = this.getLoopById(this.editingLoopNameId);
                    if (loop) {
                        loop.customName = selectedValue;
                        this.renderSavedLoops();
                        this.editingLoopNameId = null; // Clear name editing state
                    }
                } else if (this.editingLoopNameId && selectedValue === 'other') {
                    // Allow selecting 'other' when editing name - show input field
                    if (loopNameInput) {
                        loopNameInput.style.display = 'block';
                        // If loop has a custom name, pre-fill it
                        const loop = this.getLoopById(this.editingLoopNameId);
                        if (loop) {
                            const predefinedOptions = [
                                "פתיח (Intro)",
                                "בית (Verse)",
                                "פזמון (Chorus)",
                                "מעבר (Bridge)",
                                "C part",
                                "סיום (Outro)"
                            ];
                            // Only pre-fill if it's not a predefined option
                            const nameWithoutCopy = loop.customName.replace(/\s*\(עותק\)\s*$/, "").trim();
                            if (!predefinedOptions.includes(nameWithoutCopy)) {
                                loopNameInput.value = nameWithoutCopy;
                            } else {
                                loopNameInput.value = '';
                            }
                        }
                        loopNameInput.focus();
                    }
                } else if (this.editingLoopNameId && !selectedValue) {
                    // If user clears selection while editing name, cancel edit mode
                    this.editingLoopNameId = null;
                    if (loopNameInput) {
                        loopNameInput.style.display = 'none';
                        loopNameInput.value = '';
                    }
                }
                
                if (selectedValue === 'other') {
                    // Show custom input (for both new loops and editing name)
                    if (loopNameInput) {
                        loopNameInput.style.display = 'block';
                        if (!this.editingLoopNameId) {
                            loopNameInput.value = '';
                            loopNameInput.focus();
                        }
                    }
                } else {
                    // Hide custom input if not 'other' (only if not editing name)
                    if (loopNameInput && !this.editingLoopNameId) {
                        loopNameInput.style.display = 'none';
                        loopNameInput.value = '';
                    }
                }
                
                // Handle saving custom name when editing loop name
                if (loopNameInput && this.editingLoopNameId && selectedValue === 'other') {
                    const saveCustomName = () => {
                        const customName = loopNameInput.value.trim();
                        if (customName) {
                            const loop = this.getLoopById(this.editingLoopNameId);
                            if (loop) {
                                loop.customName = customName;
                                this.renderSavedLoops();
                                this.editingLoopNameId = null;
                                loopNameInput.style.display = 'none';
                            }
                        }
                    };
                    
                    // Save on blur (when user clicks away)
                    loopNameInput.addEventListener('blur', saveCustomName, { once: true });
                    // Also save on Enter key
                    loopNameInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            saveCustomName();
                        }
                    }, { once: true });
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

        // Check if we're editing an existing loop
        if (this.editingLoopId) {
            const existingLoop = this.getLoopById(this.editingLoopId);
            if (existingLoop) {
                // Update existing loop
                existingLoop.customName = loopName;
                existingLoop.measures = [...this.currentLoop];
                existingLoop.measureCount = this.currentLoop.length;
                
                console.log("לופ קיים עודכן:", existingLoop);
                
                // Clear current loop
                this.currentLoop = [];
                this.editingLoopId = null; // Clear editing state
                this.editingLoopNameId = null; // Clear name editing state
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

                console.log("✅ לופ עודכן בהצלחה:", existingLoop);
                return true;
            }
        }

        // Create new loop
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
        this.editingLoopId = null; // Clear any editing state
        this.editingLoopNameId = null; // Clear name editing state
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
            this.editingLoopId = null; // Clear any editing state
            this.editingLoopNameId = null; // Clear name editing state
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
     * Clone a saved loop
     */
    cloneSavedLoop(loopId) {
        const loop = this.getLoopById(loopId);
        if (!loop) {
            return false;
        }

        const newLoop = {
            id: Date.now(),
            customName: `${loop.customName} (עותק)`,
            measures: loop.measures.map(m => JSON.parse(JSON.stringify(m))), // Deep copy
            measureCount: loop.measureCount,
            repeatCount: loop.repeatCount || 1
        };

        this.savedLoops.push(newLoop);
        this.renderSavedLoops();
        return true;
    }

    /**
     * Load a saved loop into current loop for editing and extending
     * This allows adding more measures to an existing loop
     */
    loadLoopForEditing(loopId) {
        const loop = this.getLoopById(loopId);
        if (!loop) {
            alert("לופ לא נמצא");
            return false;
        }

        // Check if there's already a current loop
        if (this.currentLoop.length > 0) {
            if (!confirm("יש לופ נוכחי. האם אתה בטוח שברצונך להחליף אותו?")) {
                return false;
            }
        }

        // Load loop measures into current loop
        this.currentLoop = loop.measures.map(m => JSON.parse(JSON.stringify(m))); // Deep copy
        
        // Set the loop name in the dropdown
        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");
        
        const predefinedOptions = [
            "פתיח (Intro)",
            "בית (Verse)",
            "פזמון (Chorus)",
            "מעבר (Bridge)",
            "C part",
            "סיום (Outro)"
        ];

        // Check if loop name matches a predefined option
        let matchingOption = predefinedOptions.find(option => option === loop.customName);
        
        // If no exact match, try to find match by removing "(עותק)" suffix
        if (!matchingOption && loop.customName.includes("(עותק)")) {
            const nameWithoutCopy = loop.customName.replace(/\s*\(עותק\)\s*$/, "").trim();
            matchingOption = predefinedOptions.find(option => option === nameWithoutCopy);
        }
        
        if (matchingOption) {
            if (loopNameSelect) {
                loopNameSelect.value = matchingOption;
            }
            if (loopNameInput) {
                loopNameInput.style.display = 'none';
                loopNameInput.value = '';
            }
        } else {
            // Custom name - set to 'other' and show input
            if (loopNameSelect) {
                loopNameSelect.value = 'other';
            }
            if (loopNameInput) {
                const nameWithoutCopy = loop.customName.replace(/\s*\(עותק\)\s*$/, "").trim();
                loopNameInput.value = nameWithoutCopy;
                loopNameInput.style.display = 'block';
            }
        }

        // Store the loop ID so we can update it when saving
        this.editingLoopId = loopId;

        // Update display
        this.updateLoopDisplay();
        this.updateSaveButtonState();

        // Scroll to show the current loop section
        const currentLoopSection = document.querySelector('.current-loop-section');
        if (currentLoopSection) {
            currentLoopSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        console.log(`✅ לופ "${loop.customName}" נטען לעריכה. ניתן להוסיף תיבות נוספות.`);
        return true;
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
     * Edit loop name - sets the dropdown to the loop's current name for selection
     */
    editLoopName(loopId) {
        const loop = this.getLoopById(loopId);
        if (!loop) {
            return false;
        }

        const loopNameSelect = document.getElementById("loop-name-select");
        const loopNameInput = document.getElementById("loop-name");
        
        if (!loopNameSelect) {
            return false;
        }

        // Set name editing state (separate from content editing)
        this.editingLoopNameId = loopId;

        // Find matching option in dropdown
        const predefinedOptions = [
            "פתיח (Intro)",
            "בית (Verse)",
            "פזמון (Chorus)",
            "מעבר (Bridge)",
            "C part",
            "סיום (Outro)"
        ];

        // Check if loop name matches a predefined option exactly
        let matchingOption = predefinedOptions.find(option => option === loop.customName);
        
        // If no exact match, try to find match by removing "(עותק)" suffix (for duplicated loops)
        if (!matchingOption && loop.customName.includes("(עותק)")) {
            const nameWithoutCopy = loop.customName.replace(/\s*\(עותק\)\s*$/, "").trim();
            matchingOption = predefinedOptions.find(option => option === nameWithoutCopy);
        }
        
        if (matchingOption) {
            // Set dropdown to matching option
            loopNameSelect.value = matchingOption;
            if (loopNameInput) {
                loopNameInput.style.display = 'none';
                loopNameInput.value = '';
            }
        } else {
            // If name doesn't match predefined options, set to 'other' and show input
            loopNameSelect.value = 'other';
            if (loopNameInput) {
                loopNameInput.style.display = 'block';
                const nameWithoutCopy = loop.customName.replace(/\s*\(עותק\)\s*$/, "").trim();
                loopNameInput.value = nameWithoutCopy;
                loopNameInput.focus();
            }
        }

        // Scroll to the dropdown to make it visible
        loopNameSelect.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        return true;
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
                        <button class="edit-loop-btn" onclick="window.loopManager.loadLoopForEditing(${loop.id})" title="ערוך והוסף תיבות">✏️</button>
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
