// Song Structure Manager - Handles song building, loop arrangement, and drag & drop
// This manages the final song structure by arranging loops in order

class SongStructureManager {
    constructor() {
        this.songStructure = [];
        this.draggedLoop = null;
        this.draggedSongLoop = null;

        // Get utilities from core
        this.modeDetector = window.ChordCore.ModeDetector;
        this.appModes = window.ChordCore.APP_MODES;
    }

    isGenericPartName(name) {
        const s = (name || '').toString().trim();
        return /^חלק\s+\d+$/i.test(s);
    }

    measuresSignature(measures) {
        try {
            return JSON.stringify(measures || []);
        } catch (e) {
            return null;
        }
    }

    /**
     * Attempt to map structure items to saved loops by measure equality,
     * then replace generic part names ("חלק X") with the real loop names.
     */
    syncNamesAndLinksFromSavedLoops() {
        if (!window.loopManager) return;

        const savedLoops = window.loopManager.getAllSavedLoops();
        if (!Array.isArray(savedLoops) || savedLoops.length === 0) return;

        const loopBySig = new Map();
        savedLoops.forEach((l) => {
            const sig = this.measuresSignature(l?.measures);
            if (sig) loopBySig.set(sig, l);
        });

        let changed = false;
        this.songStructure.forEach((item) => {
            const currentName = item?.customName || item?.name;
            if (!this.isGenericPartName(currentName)) return;

            const sig = this.measuresSignature(item?.measures);
            const match = sig ? loopBySig.get(sig) : null;
            if (!match) return;

            const betterName = (match.customName || match.name || '').toString().trim();
            if (!betterName) return;

            item.customName = betterName;
            item.name = item.name || betterName;
            item.sourceLoopId = match.id;
            changed = true;
        });

        if (changed) {
            this.renderSongStructure();
        }
    }

    /**
     * When a saved loop is edited, update any structure items derived from it.
     */
    syncFromLoopUpdate(updatedLoop) {
        if (!updatedLoop) return;
        const loopId = updatedLoop.id;
        let changed = false;

        this.songStructure.forEach((item) => {
            if (item?.sourceLoopId !== loopId) return;
            item.customName = updatedLoop.customName || updatedLoop.name || item.customName;
            item.name = item.name || item.customName;
            item.measures = Array.isArray(updatedLoop.measures) ? updatedLoop.measures : item.measures;
            item.measureCount =
                typeof updatedLoop.measureCount === 'number'
                    ? updatedLoop.measureCount
                    : (Array.isArray(updatedLoop.measures) ? updatedLoop.measures.length : item.measureCount);
            changed = true;
        });

        if (changed) {
            this.renderSongStructure();
        }
    }

    /**
     * Initialize song structure manager
     */
    init() {
        this.setupDropZone();
        this.renderSongStructure();
        this.loadExistingSongStructure();
    }

    /**
     * Setup drag and drop functionality for the song structure area
     */
    setupDropZone() {
        const dropZone = document.getElementById("song-structure-content");
        if (!dropZone) return;

        dropZone.addEventListener('dragover', this.allowDrop.bind(this));
        dropZone.addEventListener('dragleave', this.dragLeave.bind(this));
        dropZone.addEventListener('drop', this.dropLoop.bind(this));
    }

    /**
     * TODO: Load existing song structure from backend
     */
    async loadExistingSongStructure() {
        const mode = this.modeDetector.determineMode();

        if (mode === this.appModes.EDITING) {
            await this.loadSongStructureFromBackend();
        } else if (mode === this.appModes.NEW_SONG) {
            await this.loadNewSongStructureInProgress();
        }
    }

    /**
     * TODO: Load song structure from backend API
     */
    async loadSongStructureFromBackend() {
        try {
            const editingSongId = localStorage.getItem("editingSongId");

            if (!editingSongId || editingSongId === "null") {
                return;
            }

            const response = await fetch(`/api/songs/${editingSongId}/structure`);
            if (response.ok) {
                const data = await response.json();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6e8885fe-717e-42ab-ad74-d6aff79ab431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'static/js/chords/song_structure.js:loadSongStructureFromBackend',message:'Loaded structure payload from backend',data:{editingSongId,ok:true,topKeys:Object.keys(data||{}),structureType:typeof (data&&data.structure),structureIsArray:Array.isArray(data&&data.structure),structureLen:Array.isArray(data&&data.structure)?data.structure.length:null,firstItemKeys:(Array.isArray(data&&data.structure)&&data.structure[0])?Object.keys(data.structure[0]):null,firstItemName:(Array.isArray(data&&data.structure)&&data.structure[0])?{name:data.structure[0]?.name,customName:data.structure[0]?.customName,loopName:data.structure[0]?.loopName,title:data.structure[0]?.title}:null},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
                this.restoreSongStructure(data.structure || []);
            } else {
                // Fallback to current loop manager data
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6e8885fe-717e-42ab-ad74-d6aff79ab431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H5',location:'static/js/chords/song_structure.js:loadSongStructureFromBackend',message:'Backend structure request not ok; building from loops',data:{editingSongId,status:response.status,statusText:response.statusText},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
                this.buildStructureFromLoops();
            }
        } catch (error) {
            console.error("Error loading song structure from backend:", error);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6e8885fe-717e-42ab-ad74-d6aff79ab431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H5',location:'static/js/chords/song_structure.js:loadSongStructureFromBackend',message:'Error loading structure from backend; building from loops',data:{err:String(error&&error.message||error)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log
            this.buildStructureFromLoops();
        }
    }

    /**
     * Load song structure for new songs in progress
     */
    async loadNewSongStructureInProgress() {
        // For new songs, build structure from available loops
        this.buildStructureFromLoops();
    }

    /**
     * Build song structure from available loops (fallback)
     */
    buildStructureFromLoops() {
        if (window.loopManager) {
            const savedLoops = window.loopManager.getAllSavedLoops();
            this.songStructure = savedLoops.map(loop => ({
                ...loop,
                id: Date.now() + Math.random(),
                repeatCount: loop.repeatCount || 1
            }));
            this.renderSongStructure();
        }
    }

    /**
     * Restore song structure from data
     */
    restoreSongStructure(structureData) {
        // Normalize legacy/new shapes:
        // - saved structure items use `name`, while in-memory loops use `customName`
        // - keep both so older UI code keeps working
        this.songStructure = (structureData || []).map((item, index) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6e8885fe-717e-42ab-ad74-d6aff79ab431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'static/js/chords/song_structure.js:restoreSongStructure',message:'Restoring structure item',data:{index,itemKeys:item?Object.keys(item):null,name:item?.name,customName:item?.customName,loopName:item?.loopName,title:item?.title,hasMeasures:Array.isArray(item?.measures),measuresLen:Array.isArray(item?.measures)?item.measures.length:null,measureCount:item?.measureCount,repeatCount:item?.repeatCount},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log
            const customNameRaw = (item?.customName || item?.name || '').toString().trim();
            const customName = customNameRaw || `חלק ${index + 1}`;
            const measures = Array.isArray(item?.measures) ? item.measures : [];
            const measureCount =
                typeof item?.measureCount === 'number'
                    ? item.measureCount
                    : (measures?.length || 0);

            return {
                ...item,
                id: item?.id || (Date.now() + index),
                customName,
                name: item?.name || customName,
                measures,
                measureCount,
                repeatCount: item?.repeatCount || 1,
                sourceLoopId: item?.sourceLoopId || null
            };
        });
        this.renderSongStructure();
        // Try to upgrade generic names (חלק X) based on saved loops
        this.syncNamesAndLinksFromSavedLoops();
    }

    /**
     * Add loop to song structure
     */
/**
 * Add loop to song structure
 */
    addLoopToSong(loop) {
        if (!loop) {
            console.log("❌ לא ניתן להוסיף לופ ריק");
            return false;
        }

        console.log("🎵 מוסיף לופ למבנה השיר:", loop);

        const customNameRaw = (loop.customName || loop.name || '').toString().trim();
        const customName = customNameRaw || `חלק ${this.songStructure.length + 1}`;
        const measures = Array.isArray(loop.measures) ? loop.measures : [];
        const measureCount =
            typeof loop.measureCount === 'number' ? loop.measureCount : (measures?.length || 0);

        const loopCopy = {
            ...loop,
            id: Date.now() + Math.random(),
            customName,
            name: loop.name || customName,
            measures,
            measureCount,
            repeatCount: loop.repeatCount || 1,
            sourceLoopId: loop.id || null
        };

        this.songStructure.push(loopCopy);

        console.log("🎼 מבנה שיר מעודכן:", {
            length: this.songStructure.length,
            structure: this.songStructure
        });

        this.renderSongStructure();

        // עדכן כפתורים מיד אחרי הוספת לופ
        if (window.domHelpers) {
            console.log("🔧 מעדכן כפתורים אחרי הוספת לופ");
            window.domHelpers.updateAllButtons();
        }

        console.log("✅ לופ נוסף בהצלחה. אורך מבנה חדש:", this.songStructure.length);
        return true;
    }

    /**
     * Remove loop from song structure
     */
    removeLoopFromSong(index) {
        if (index < 0 || index >= this.songStructure.length) {
            return false;
        }

        if (confirm("האם אתה בטוח שברצונך להסיר את הלופ מהשיר?")) {
            this.songStructure.splice(index, 1);
            this.renderSongStructure();

            // TODO: Auto-save to backend
            // this.saveSongStructureToBackend();

            return true;
        }
        return false;
    }

    /**
     * Update loop repeat count
     */
    updateLoopRepeat(loopIndex, repeatCount) {
        const count = Math.max(1, parseInt(repeatCount) || 1);
        if (this.songStructure[loopIndex]) {
            this.songStructure[loopIndex].repeatCount = count;

            // TODO: Auto-save to backend
            // this.saveSongStructureToBackend();
        }
    }

    /**
     * Move loop within song structure
     */
    moveLoop(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.songStructure.length ||
            toIndex < 0 || toIndex >= this.songStructure.length ||
            fromIndex === toIndex) {
            return false;
        }

        console.log(`Moving loop from index ${fromIndex} to ${toIndex}`);

        const movedLoop = this.songStructure.splice(fromIndex, 1)[0];
        this.songStructure.splice(toIndex, 0, movedLoop);
        this.renderSongStructure();

        // TODO: Auto-save to backend
        // this.saveSongStructureToBackend();

        return true;
    }

    /**
     * TODO: Save song structure to backend
     */
    async saveSongStructureToBackend() {
        try {
            const editingSongId = localStorage.getItem("editingSongId");
            if (!editingSongId) return;

            const response = await fetch(`/api/songs/${editingSongId}/structure`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    structure: this.songStructure
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save song structure');
            }

            console.log('Song structure saved to backend');
        } catch (error) {
            console.error('Error saving song structure to backend:', error);
        }
    }

    /**
     * Render the complete song structure
     */
    renderSongStructure() {
        const container = document.getElementById("song-structure-content");
        if (!container) return;

        if (this.songStructure.length === 0) {
            container.className = "drop-zone";
            container.innerHTML = `
                <div>🎵 גרור לופים מהסרגל השמאלי כדי לבנות את השיר</div>
                <div style="font-size: 14px; opacity: 0.7; margin-top: 5px;">או שמור את הלופ הנוכחי ואז גרור אותו לכאן</div>
            `;
            return;
        }

        container.className = "drop-zone has-content";
        container.innerHTML = "";

        this.songStructure.forEach((loop, loopIndex) => {
            const loopDiv = this.createSongLoopElement(loop, loopIndex);
            container.appendChild(loopDiv);
        });
    }

    /**
     * Create a song loop element
     */
    createSongLoopElement(loop, loopIndex) {
        const loopDiv = document.createElement("div");
        loopDiv.className = "song-loop";
        loopDiv.draggable = true;
        loopDiv.dataset.songIndex = loopIndex;

        // Calculate loop occurrence number for display
        const sameTypeLoops = this.songStructure.filter((l, i) => i <= loopIndex && l.customName === loop.customName);
        const loopNumber = sameTypeLoops.length;

        const loopHeader = this.createLoopHeader(loop, loopIndex, loopNumber);
        const loopContent = this.createLoopContent(loop);

        loopDiv.appendChild(loopHeader);
        loopDiv.appendChild(loopContent);

        // Add drag event listeners
        loopDiv.addEventListener('dragstart', this.handleSongLoopDragStart.bind(this));
        loopDiv.addEventListener('dragend', this.handleSongLoopDragEnd.bind(this));

        return loopDiv;
    }

    /**
     * Create loop header with controls
     */
    createLoopHeader(loop, loopIndex, loopNumber) {
        const loopHeader = document.createElement("div");
        loopHeader.className = "loop-header-in-song";
        loopHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="drag-handle">⋮⋮</span>
                <div>
                    <div class="loop-title-in-song">${loop.customName} ${loopNumber > 1 ? `(${loopNumber})` : ''}</div>
                    <div class="loop-measures-count">${loop.measureCount} תיבות</div>
                </div>
            </div>
            <div class="loop-controls-group">
                <div class="loop-repeat-controls">
                    <span class="repeat-label">חזרות:</span>
                    <input type="number" class="repeat-input" value="${loop.repeatCount || 1}" min="1"
                           onchange="window.songStructureManager.updateLoopRepeat(${loopIndex}, this.value)">
                </div>
                <button class="remove-loop-btn" onclick="window.songStructureManager.removeLoopFromSong(${loopIndex})">×</button>
            </div>
        `;
        return loopHeader;
    }

    /**
     * Create loop content with measures
     */
    createLoopContent(loop) {
        const loopContent = document.createElement("div");
        loopContent.className = "loop-content";

        const measuresPerRow = 4;
        for (let i = 0; i < loop.measures.length; i += measuresPerRow) {
            const measuresRow = document.createElement("div");
            measuresRow.className = "measures-row";

            const rowMeasures = loop.measures.slice(i, i + measuresPerRow);
            rowMeasures.forEach((measure, measureIndex) => {
                const measureDiv = this.createMeasureInSong(measure, i + measureIndex + 1);
                measuresRow.appendChild(measureDiv);
            });

            loopContent.appendChild(measuresRow);
        }

        return loopContent;
    }

    /**
     * Create measure element for song display
     */
    createMeasureInSong(measure, measureNumber) {
        const measureDiv = document.createElement("div");
        measureDiv.className = "measure-in-song";

        const chordsHtml = measure.chords.map(chord => `
            <div class="chord-in-song ${chord.isEmpty ? 'empty-chord' : ''}" style="flex: ${chord.width}">
                <div class="chord-name-small">${chord.chord}</div>
                <div class="chord-beats-small">${chord.width}</div>
            </div>
        `).join('');

        measureDiv.innerHTML = `
            <div class="measure-title-in-song">תיבה ${measureNumber}</div>
            <div class="chords-in-song-measure">
                ${chordsHtml}
            </div>
            <div class="beats-in-song">
                ${Array.from({length: Math.round(measure.beats)}, (_, i) =>
                    `<div class="beat-dot-small"></div>`
                ).join('')}
            </div>
        `;

        return measureDiv;
    }

    /**
     * Drag and drop event handlers
     */
    allowDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    dragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    dropLoop(e) {
        e.preventDefault();
        e.stopPropagation(); // חשוב! למנוע event bubbling
        e.currentTarget.classList.remove('drag-over');

        // Handle drop from saved loops section
        try {
            const data = e.dataTransfer.getData('application/json');
            if (data) {
                const loop = JSON.parse(data);

                // בדוק אם כבר נוסף לופ זהה לאחרונה (מניעת כפילות)
                const lastAdded = this.songStructure[this.songStructure.length - 1];
                if (lastAdded && lastAdded.customName === loop.customName &&
                    Date.now() - lastAdded.id < 1000) {
                    console.log("Preventing duplicate loop addition");
                    return;
                }

                console.log("Adding loop from drag data:", loop.customName);
                this.addLoopToSong(loop);
                return;
            }
        } catch (error) {
            console.error('Error parsing dropped data:', error);
        }

        // Handle reordering within song structure
        if (this.draggedSongLoop !== null) {
            const dropTarget = e.target.closest('.song-loop');
            if (dropTarget && dropTarget.dataset.songIndex) {
                const targetIndex = parseInt(dropTarget.dataset.songIndex);
                if (targetIndex !== this.draggedSongLoop) {
                    this.moveLoop(this.draggedSongLoop, targetIndex);
                }
            }
            this.draggedSongLoop = null;
        }
    }


    handleSongLoopDragStart(e) {
        this.draggedSongLoop = parseInt(e.target.dataset.songIndex);
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        console.log("Started dragging song loop:", this.draggedSongLoop);
    }

    handleSongLoopDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedSongLoop = null;

        // נקה את כל האירועים הקשורים לגרירה
        if (e.dataTransfer) {
            e.dataTransfer.clearData();
        }
        console.log("Ended dragging song loop");
    }

    /**
     * Check if song structure is ready for completion
     */
/**
 * Check if song structure is ready for completion
 */
    isSongReady() {
        const isReady = this.songStructure.length > 0;
        console.log("🎼 בדיקת מוכנות השיר:", {
            songStructureLength: this.songStructure.length,
            songStructure: this.songStructure,
            isReady
        });
        return isReady;
    }

    /**
     * Get song structure data for saving
     * TODO: This will be handled by backend API
     */
    getSongStructureForSaving() {
        return this.songStructure.map(loop => ({
            name: loop.customName,
            measures: loop.measures,
            measureCount: loop.measureCount,
            repeatCount: loop.repeatCount || 1,
            sourceLoopId: loop.sourceLoopId || null
        }));
    }

    /**
     * Convert song structure to chord lines format (for backward compatibility)
     * TODO: Eventually this conversion should happen on backend
     */
    convertToChordLines() {
        const chordLines = [];

        this.songStructure.forEach(loop => {
            const repeatCount = loop.repeatCount || 1;

            for (let repeat = 0; repeat < repeatCount; repeat++) {
                const measuresPerLine = 4;
                for (let i = 0; i < loop.measures.length; i += measuresPerLine) {
                    const lineMeasures = loop.measures.slice(i, i + measuresPerLine);
                    const lineChords = lineMeasures.flatMap(measure =>
                        measure.chords.map(chord => ({
                            chord: chord.isEmpty ? "—" : chord.chord,
                            beats: chord.width,
                            label: ""
                        }))
                    );
                    chordLines.push(lineChords);
                }
            }
        });

        return chordLines;
    }

    /**
     * Get total song duration in measures
     */
    getTotalMeasures() {
        return this.songStructure.reduce((total, loop) => {
            return total + (loop.measureCount * (loop.repeatCount || 1));
        }, 0);
    }

    /**
     * Get song statistics
     */
    getSongStats() {
        const totalMeasures = this.getTotalMeasures();
        const uniqueLoops = this.songStructure.length;
        const totalLoops = this.songStructure.reduce((sum, loop) => sum + (loop.repeatCount || 1), 0);

        return {
            totalMeasures,
            uniqueLoops,
            totalLoops,
            structure: this.songStructure
        };
    }

    /**
     * Reset song structure
     */
    reset() {
        this.songStructure = [];
        this.draggedLoop = null;
        this.draggedSongLoop = null;
        this.renderSongStructure();
    }

    /**
     * Get current song structure
     */
    getSongStructure() {
        return [...this.songStructure];
    }
}

// Global functions for backward compatibility with inline onclick handlers
window.updateLoopRepeat = function(loopIndex, repeatCount) {
    if (window.songStructureManager) {
        window.songStructureManager.updateLoopRepeat(loopIndex, repeatCount);
    }
};

window.removeSongLoop = function(index) {
    if (window.songStructureManager) {
        window.songStructureManager.removeLoopFromSong(index);
    }
};

// Export the song structure manager
window.SongStructureManager = SongStructureManager;
