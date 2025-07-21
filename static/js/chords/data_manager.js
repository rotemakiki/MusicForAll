// Data Manager - Handles all data loading, saving, and synchronization with backend
// This centralizes all data operations and provides fallback to localStorage

class DataManager {
    constructor() {
        this.modeDetector = window.ChordCore.ModeDetector;
        this.appModes = window.ChordCore.APP_MODES;
        this.isOnline = navigator.onLine;

        // Track online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Initialize data manager and load existing data
     */
    async init() {
        console.log('DataManager initializing...');
        const mode = this.modeDetector.determineMode();
        console.log('Current mode:', mode);

        try {
            if (mode === this.appModes.EDITING) {
                await this.loadExistingSongData();
            } else if (mode === this.appModes.NEW_SONG) {
                await this.loadNewSongDataInProgress();
            } else {
                this.clearAllData();
            }
        } catch (error) {
            console.error('Error during data initialization:', error);
            this.loadFromLocalStorageBackup();
        }
    }

    /**
     * Load existing song data for editing mode
     */
    async loadExistingSongData() {
        const editingSongId = localStorage.getItem("editingSongId");

        if (!editingSongId || editingSongId === "null" || editingSongId === "undefined") {
            console.log("No song ID found for editing");
            return;
        }

        console.log("Loading song data from backend for song:", editingSongId);

        try {
            const songData = await this.fetchSongFromBackend(editingSongId);

            if (songData) {
                await this.restoreSongData(songData);
                console.log("Successfully loaded song data from backend");
            } else {
                throw new Error("No data received from backend");
            }
        } catch (error) {
            console.error("Backend loading failed:", error);
            this.loadFromLocalStorageBackup();
        }
    }

    /**
     * Fetch song data from backend API
     */
    async fetchSongFromBackend(songId) {
        try {
            const response = await fetch(`/api/songs/${songId}/complete`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const songData = await response.json();
            console.log("Received song data from backend:", songData);
            return songData;
        } catch (error) {
            console.error("Error fetching song from backend:", error);
            return null;
        }
    }

    /**
     * Restore song data to all managers
     */
/**
 * Restore song data to all managers
 */
    async restoreSongData(songData) {
        console.log("🔄 Restoring complete song data:", songData);

        // Clear existing data
        this.clearAllManagerData();

        // Restore loops if available
        if (songData.loops && songData.loops.length > 0) {
            console.log("Restoring loops from backend:", songData.loops);
            if (window.loopManager) {
                window.loopManager.restoreLoopsFromData(songData.loops);
            }
        } else if (songData.chords && songData.chords.length > 0) {
            console.log("No loops found, converting chords to loops");
            this.convertChordsToLoops(songData.chords);
        }

        // **תיקון חשוב**: אם יש מבנה שיר ישיר - השתמש בו
        if (songData.structure && songData.structure.length > 0) {
            console.log("Restoring song structure from backend:", songData.structure);
            if (window.songStructureManager) {
                window.songStructureManager.restoreSongStructure(songData.structure);
            }
        }
        // **חדש**: אם אין מבנה ישיר, נסה לבנות מהלופים עם הסדר הנכון
        else if (songData.loops && songData.loops.length > 0) {
            console.log("Building song structure from loops order");
            this.buildSongStructureFromLoopsData(songData.loops);
        }

        // Store in localStorage as backup
        this.saveToLocalStorageBackup(songData);
    }

    /**
     * חדש: בניית מבנה שיר מלופים עם סדר ושכפולים
     */
    buildSongStructureFromLoopsData(loopsData) {
        if (!window.songStructureManager || !loopsData || loopsData.length === 0) {
            return;
        }

        // המתן שהלופים ייטענו
        setTimeout(() => {
            loopsData.forEach(loopData => {
                // מצא את הלופ ברשימת הלופים השמורים
                const savedLoop = window.loopManager.getAllSavedLoops()
                    .find(loop => loop.customName === loopData.name);

                if (savedLoop) {
                    // צור עותק עם חזרות
                    const loopForStructure = {
                        ...savedLoop,
                        repeatCount: loopData.repeatCount || 1
                    };

                    console.log(`Adding loop to structure: ${loopData.name} with ${loopData.repeatCount} repeats`);
                    window.songStructureManager.addLoopToSong(loopForStructure);
                }
            });
        }, 100);
    }

    /**
     * Load new song data in progress
     */
    async loadNewSongDataInProgress() {
        try {
            const addingNewSong = localStorage.getItem("addingNewSong");

            if (addingNewSong === "true") {
                // **תיקון**: בדוק אם באמת יש נתונים לשיר הנוכחי
                const hasExistingData = localStorage.getItem("chords") || localStorage.getItem("loops");

                if (hasExistingData) {
                    console.log("Loading new song data in progress from localStorage");
                    this.loadFromLocalStorageBackup();
                } else {
                    console.log("No relevant data for current new song - starting clean");
                    this.clearAllData();
                }
            } else {
                console.log("No new song in progress - starting clean");
                this.clearAllData();
            }
        } catch (error) {
            console.log("Error loading new song data in progress:", error);
            this.clearAllData();
        }
    }

    /**
     * Fallback to localStorage when backend is unavailable
     */
    loadFromLocalStorageBackup() {
        console.log("Loading from localStorage backup");

        try {
            const savedChords = localStorage.getItem("chords");
            const savedLoops = localStorage.getItem("loops");

            if (!savedChords && !savedLoops) {
                console.log("No backup data found in localStorage");
                return;
            }

            // Clear existing data
            this.clearAllManagerData();

            // Load loops if available
            if (savedLoops && savedLoops !== "[]") {
                try {
                    const loopsData = JSON.parse(savedLoops);
                    console.log("Restoring loops from localStorage:", loopsData);

                    if (window.loopManager) {
                        window.loopManager.restoreLoopsFromData(loopsData);
                    }
                } catch (e) {
                    console.log("Error parsing localStorage loops:", e);
                }
            }

            // Convert chords to loops if no loops available
            if (savedChords && (!savedLoops || savedLoops === "[]")) {
                try {
                    const chordsData = JSON.parse(savedChords);
                    console.log("Converting chords to loops from localStorage:", chordsData);
                    this.convertChordsToLoops(chordsData);
                } catch (e) {
                    console.log("Error parsing localStorage chords:", e);
                }
            }

            console.log("Successfully loaded from localStorage backup");
        } catch (error) {
            console.error("Error loading from localStorage backup:", error);
            this.clearAllData();
        }
    }

    /**
     * Convert old chord format to new loop format
     */
    convertChordsToLoops(chordLines) {
        if (!chordLines || chordLines.length === 0) return;

        const measures = [];

        chordLines.forEach(line => {
            let currentMeasure = {
                beats: 4,
                chords: [],
                isEmpty: false
            };

            let totalBeats = 0;
            line.forEach(chordData => {
                currentMeasure.chords.push({
                    chord: chordData.chord === "—" ? "—" : chordData.chord,
                    width: chordData.beats || 1,
                    isEmpty: chordData.chord === "—",
                    position: totalBeats
                });
                totalBeats += (chordData.beats || 1);
            });

            if (currentMeasure.chords.length > 0) {
                measures.push(currentMeasure);
            }
        });

        if (measures.length > 0 && window.loopManager) {
            const defaultLoopData = [{
                name: "חלק ראשי",
                measures: measures,
                measureCount: measures.length,
                repeatCount: 1
            }];

            window.loopManager.restoreLoopsFromData(defaultLoopData);
        }
    }

    /**
     * Save complete song data to backend
     */
    async saveSongToBackend(songData) {
        if (!this.isOnline) {
            console.log("Offline - saving to localStorage only");
            this.saveToLocalStorageBackup(songData);
            this.addToPendingSync(songData);
            return false;
        }

        try {
            const mode = this.modeDetector.determineMode();
            const endpoint = mode === this.appModes.EDITING
                ? `/api/songs/${localStorage.getItem("editingSongId")}/chords-loops`
                : `/api/songs/new/chords-loops`;

            const response = await fetch(endpoint, {
                method: mode === this.appModes.EDITING ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(songData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Successfully saved to backend:", result);

            // Also save to localStorage as backup
            this.saveToLocalStorageBackup(songData);

            return true;
        } catch (error) {
            console.error("Error saving to backend:", error);
            // Fallback to localStorage
            this.saveToLocalStorageBackup(songData);
            this.addToPendingSync(songData);
            return false;
        }
    }

    /**
     * Save to localStorage as backup
     */
    saveToLocalStorageBackup(songData) {
        try {
            if (songData.chords) {
                localStorage.setItem("chords", JSON.stringify(songData.chords));
            }
            if (songData.loops) {
                localStorage.setItem("loops", JSON.stringify(songData.loops));
            }
            if (songData.structure) {
                localStorage.setItem("song_structure", JSON.stringify(songData.structure));
            }

            localStorage.setItem("last_backup", new Date().toISOString());
            console.log("Data saved to localStorage backup");
        } catch (error) {
            console.error("Error saving to localStorage:", error);
        }
    }

    /**
     * Add data to pending sync queue for when online
     */
    addToPendingSync(songData) {
        try {
            const pending = JSON.parse(localStorage.getItem("pending_sync") || "[]");
            pending.push({
                timestamp: new Date().toISOString(),
                data: songData,
                mode: this.modeDetector.determineMode()
            });
            localStorage.setItem("pending_sync", JSON.stringify(pending));
        } catch (error) {
            console.error("Error adding to pending sync:", error);
        }
    }

    /**
     * Sync pending changes when coming back online
     */
    async syncPendingChanges() {
        try {
            const pending = JSON.parse(localStorage.getItem("pending_sync") || "[]");

            if (pending.length === 0) return;

            console.log(`Syncing ${pending.length} pending changes...`);

            for (const item of pending) {
                try {
                    await this.saveSongToBackend(item.data);
                } catch (error) {
                    console.error("Error syncing pending item:", error);
                    // Keep the item in pending queue
                    continue;
                }
            }

            // Clear synced items
            localStorage.setItem("pending_sync", "[]");
            console.log("All pending changes synced successfully");
        } catch (error) {
            console.error("Error during sync:", error);
        }
    }

    /**
     * Auto-save current state
     */
    async autoSave() {
        try {
            const songData = this.collectCurrentSongData();

            if (this.hasValidSongData(songData)) {
                await this.saveSongToBackend(songData);
            }
        } catch (error) {
            console.error("Error during auto-save:", error);
        }
    }

    /**
     * Collect current song data from all managers
     */
    collectCurrentSongData() {
        const songData = {
            chords: [],
            loops: [],
            structure: [],
            timestamp: new Date().toISOString()
        };

        // Collect loops data
        if (window.loopManager) {
            songData.loops = window.loopManager.getLoopsDataForSaving();
        }

        // Collect song structure
        if (window.songStructureManager) {
            songData.structure = window.songStructureManager.getSongStructureForSaving();
            // Also generate chord lines for backward compatibility
            songData.chords = window.songStructureManager.convertToChordLines();
        }

        return songData;
    }

    /**
     * Check if song data is valid for saving
     */
    hasValidSongData(songData) {
        return (songData.loops && songData.loops.length > 0) ||
               (songData.structure && songData.structure.length > 0) ||
               (songData.chords && songData.chords.length > 0);
    }

    /**
     * Clear all data from managers
     */
    clearAllManagerData() {
        if (window.loopManager) {
            window.loopManager.reset();
        }
        if (window.songStructureManager) {
            window.songStructureManager.reset();
        }
        if (window.measureManager) {
            window.measureManager.reset();
        }
        if (window.chordUIManager) {
            window.chordUIManager.reset();
        }
    }

    /**
     * Clear all data including localStorage
     */
    clearAllData() {
        console.log("Clearing all data for fresh start");

        this.clearAllManagerData();

        // Clear localStorage
        try {
            localStorage.removeItem("chords");
            localStorage.removeItem("loops");
            localStorage.removeItem("song_structure");
            localStorage.removeItem("pending_sync");
        } catch (error) {
            console.error("Error clearing localStorage:", error);
        }
    }

    /**
     * Export current song data for external use
     */
    exportSongData() {
        const songData = this.collectCurrentSongData();

        // Add metadata
        songData.exported_at = new Date().toISOString();
        songData.version = "2.0";
        songData.format = "chords_and_loops";

        return songData;
    }

    /**
     * Import song data from external source
     */
    async importSongData(importedData) {
        try {
            // Validate imported data
            if (!this.validateImportedData(importedData)) {
                throw new Error("Invalid imported data format");
            }

            // Clear current data
            this.clearAllManagerData();

            // Restore imported data
            await this.restoreSongData(importedData);

            console.log("Song data imported successfully");
            return true;
        } catch (error) {
            console.error("Error importing song data:", error);
            return false;
        }
    }

    /**
     * Validate imported data structure
     */
    validateImportedData(data) {
        if (!data || typeof data !== 'object') return false;

        // Check for required fields
        const hasLoops = data.loops && Array.isArray(data.loops);
        const hasChords = data.chords && Array.isArray(data.chords);
        const hasStructure = data.structure && Array.isArray(data.structure);

        return hasLoops || hasChords || hasStructure;
    }

    /**
     * Get data manager status
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            mode: this.modeDetector.determineMode(),
            hasBackup: !!localStorage.getItem("chords") || !!localStorage.getItem("loops"),
            pendingSync: JSON.parse(localStorage.getItem("pending_sync") || "[]").length,
            lastBackup: localStorage.getItem("last_backup")
        };
    }
}

// Export the data manager
window.DataManager = DataManager;
