// Chord Main - Main initialization file that connects all chord system components
// This is the entry point that initializes all managers and sets up the application

class ChordApp {
    constructor() {
        this.initialized = false;
        this.managers = {};
        this.initializationPromise = null;
    }

    /**
     * Initialize the entire chord application
     */
    async init() {
        if (this.initialized) {
            console.log('Chord app already initialized');
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform the actual initialization
     */
    async _performInitialization() {
        try {
            console.log('🎸 Initializing Chord Application...');

            // Check if all required classes are loaded
            this.validateDependencies();

            // Initialize managers in correct order
            await this.initializeManagers();

            // Setup global event listeners
            this.setupGlobalEvents();

            // Load existing data
            await this.loadInitialData();

            // Setup auto-save and sync
            this.setupAutoSyncAndSave();

            // Mark as initialized
            this.initialized = true;

            console.log('✅ Chord Application initialized successfully');
            this.showAppReadyNotification();

        } catch (error) {
            console.error('❌ Failed to initialize Chord Application:', error);
            this.showInitializationError(error);
            throw error;
        }
    }

    /**
     * Validate that all required dependencies are loaded
     */
    validateDependencies() {
        const requiredClasses = [
            'ChordCore',
            'ChordUIManager',
            'MeasureManager',
            'LoopManager',
            'SongStructureManager',
            'DataManager',
            'DOMHelpers'
        ];

        const missing = requiredClasses.filter(className => !window[className]);

        if (missing.length > 0) {
            throw new Error(`Missing required classes: ${missing.join(', ')}`);
        }

        console.log('✅ All dependencies validated');
    }

    /**
     * Initialize all managers in the correct order
     */
    async initializeManagers() {
        console.log('Initializing managers...');

        // Initialize core UI manager first
        this.managers.chordUI = new window.ChordUIManager();
        window.chordUIManager = this.managers.chordUI;

        // Initialize measure manager
        this.managers.measure = new window.MeasureManager();
        window.measureManager = this.managers.measure;

        // Initialize loop manager
        this.managers.loop = new window.LoopManager();
        window.loopManager = this.managers.loop;

        // Initialize song structure manager
        this.managers.songStructure = new window.SongStructureManager();
        window.songStructureManager = this.managers.songStructure;

        // Initialize data manager
        this.managers.data = new window.DataManager();
        window.dataManager = this.managers.data;

        // Initialize DOM helpers
        this.managers.dom = new window.DOMHelpers();
        window.domHelpers = this.managers.dom;

        // Call init on each manager
        console.log('Calling init on all managers...');

        this.managers.chordUI.init();
        this.managers.measure.init();
        this.managers.loop.init();
        this.managers.songStructure.init();
        this.managers.dom.init();

        // Data manager init loads existing data, so call it last
        await this.managers.data.init();

        console.log('✅ All managers initialized');
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEvents() {
        // Listen for measure changes to update other components
        window.addEventListener('measureChanged', (event) => {
            this.managers.dom.updateAllButtons();
        });

        // Listen for visibility changes to pause/resume auto-save
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.resumeAutoSave();
            } else {
                this.pauseAutoSave();
            }
        });

        // Listen for beforeunload to save changes
        window.addEventListener('beforeunload', (event) => {
            // **תיקון חשוב**: אל תמנע unload כשמבצעים "סיים והמשך"
            const isFinishingProcess = localStorage.getItem('finishingProcess');

            if (isFinishingProcess === 'true') {
                // אנחנו בתהליך סיום - אל תציג אזהרה
                localStorage.removeItem('finishingProcess');
                return;
            }

            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';

                // Try to save quickly
                this.quickSave();
                return event.returnValue;
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.managers.dom.showNotification('חזרת לאינטרנט - מסנכרן נתונים...', 'info');
        });

        window.addEventListener('offline', () => {
            this.managers.dom.showNotification('לא מחובר לאינטרנט - עובד במצב לא מקוון', 'warning', 5000);
        });

        console.log('✅ Global events setup complete');
    }

    /**
     * Load initial data based on application mode
     */
    async loadInitialData() {
        console.log('Loading initial data...');

        try {
            // Data manager handles loading based on mode
            // This was already called in managers.data.init()

            // Update UI based on loaded data
            this.managers.chordUI.renderRecentlyUsedChords();
            this.managers.loop.renderSavedLoops();
            this.managers.songStructure.renderSongStructure();
            this.managers.dom.updateAllButtons();
            this.managers.dom.updatePageTitle();

            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.managers.dom.showNotification('שגיאה בטעינת נתונים - מתחיל במצב ריק', 'warning');
        }
    }

    /**
     * Setup auto-sync and auto-save functionality
     */
    setupAutoSyncAndSave() {
        // Auto-save every 30 seconds if there are changes
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges() && navigator.onLine) {
                this.managers.dom.triggerAutoSave();
            }
        }, 30000);

        // Sync with backend every 2 minutes when online
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && this.managers.data) {
                this.managers.data.syncPendingChanges();
            }
        }, 120000);

        console.log('✅ Auto-sync and auto-save setup complete');
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        if (!this.managers.data) return false;

        const songData = this.managers.data.collectCurrentSongData();
        return this.managers.data.hasValidSongData(songData);
    }

    /**
     * Quick save for emergency situations
     */
    quickSave() {
        try {
            if (this.managers.data) {
                // Save to localStorage immediately
                const songData = this.managers.data.collectCurrentSongData();
                this.managers.data.saveToLocalStorageBackup(songData);
                console.log('Quick save completed');
            }
        } catch (error) {
            console.error('Quick save failed:', error);
        }
    }

    /**
     * Pause auto-save when tab is not visible
     */
    pauseAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Resume auto-save when tab becomes visible
     */
    resumeAutoSave() {
        if (!this.autoSaveInterval) {
            this.setupAutoSyncAndSave();
        }
    }

    /**
     * Show app ready notification
     */
    showAppReadyNotification() {
        const status = this.managers.data.getStatus();
        let message = 'האפליקציה מוכנה לשימוש!';

        if (!status.isOnline) {
            message += ' (מצב לא מקוון)';
        }

        if (status.pendingSync > 0) {
            message += ` יש ${status.pendingSync} שינויים לסנכרון`;
        }

        this.managers.dom.showNotification(message, 'success', 2000);
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
            z-index: 10001;
            text-align: center;
            max-width: 400px;
        `;

        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">שגיאה בטעינת האפליקציה</h3>
            <p style="margin: 0 0 15px 0;">אירעה שגיאה בטעינת מערכת האקורדים</p>
            <p style="font-size: 12px; opacity: 0.9; margin: 0 0 15px 0;">${error.message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">רענן את הדף</button>
        `;

        document.body.appendChild(errorDiv);
    }

    /**
     * Get application status and statistics
     */
    getAppStatus() {
        if (!this.initialized) {
            return { status: 'not_initialized' };
        }

        const dataStatus = this.managers.data.getStatus();
        const songStats = this.managers.songStructure.getSongStats();

        return {
            status: 'ready',
            initialized: this.initialized,
            mode: dataStatus.mode,
            isOnline: dataStatus.isOnline,
            hasBackup: dataStatus.hasBackup,
            pendingSync: dataStatus.pendingSync,
            lastBackup: dataStatus.lastBackup,
            songStats: songStats,
            hasUnsavedChanges: this.hasUnsavedChanges()
        };
    }

    /**
     * Manual save trigger
     */
    async saveNow() {
        if (!this.managers.data) {
            throw new Error('Data manager not initialized');
        }

        try {
            this.managers.dom.showNotification('שומר...', 'info', 1000);
            const success = await this.managers.data.autoSave();

            if (success) {
                this.managers.dom.showNotification('נשמר בהצלחה!', 'success');
            } else {
                this.managers.dom.showNotification('נשמר מקומית - יסונכרן כשתתחבר לאינטרנט', 'warning');
            }

            return success;
        } catch (error) {
            this.managers.dom.showNotification('שגיאה בשמירה', 'error');
            throw error;
        }
    }

    /**
     * Reset entire application
     */
    async reset() {
        try {
            // Clear all managers
            Object.values(this.managers).forEach(manager => {
                if (manager.reset) {
                    manager.reset();
                }
            });

            // Clear data
            if (this.managers.data) {
                this.managers.data.clearAllData();
            }

            this.managers.dom.showNotification('האפליקציה אופסה', 'info');
            console.log('Application reset completed');
        } catch (error) {
            console.error('Error during reset:', error);
            this.managers.dom.showNotification('שגיאה באיפוס', 'error');
        }
    }

    /**
     * Cleanup before page unload
     */
    cleanup() {
        // Clear intervals
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Cleanup managers
        Object.values(this.managers).forEach(manager => {
            if (manager.cleanup) {
                manager.cleanup();
            }
        });

        console.log('Chord app cleanup completed');
    }
}

// Create global chord app instance
window.chordApp = new ChordApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.chordApp.init();
    } catch (error) {
        console.error('Failed to initialize chord app:', error);
    }
});

// Cleanup before page unload
window.addEventListener('beforeunload', () => {
    if (window.chordApp) {
        window.chordApp.cleanup();
    }
});

// Expose global functions for backward compatibility
window.addChordToCurrentMeasure = function() {
    if (window.domHelpers) {
        window.domHelpers.handleAddChord();
    }
};

window.addEmptyChord = function() {
    if (window.domHelpers) {
        window.domHelpers.handleAddEmptyChord();
    }
};

window.nextMeasure = function() {
    if (window.domHelpers) {
        window.domHelpers.handleNextMeasure();
    }
};

window.clearCurrentMeasure = function() {
    if (window.domHelpers) {
        window.domHelpers.handleClearMeasure();
    }
};

window.saveCurrentLoop = function() {
    if (window.domHelpers) {
        window.domHelpers.handleSaveLoop();
    }
};

window.discardCurrentLoop = function() {
    if (window.domHelpers) {
        window.domHelpers.handleDiscardLoop();
    }
};

window.finishAndReturn = function() {
    if (window.domHelpers) {
        window.domHelpers.handleFinish();
    }
};

window.updateButtons = function() {
    if (window.domHelpers) {
        window.domHelpers.updateAllButtons();
    }
};

window.removeChordFromMeasure = function(index) {
    if (window.measureManager) {
        window.measureManager.removeChord(index);
    }
};

window.editMeasure = function(loopId, measureIndex) {
    if (window.loopManager && window.measureManager) {
        const loop = window.loopManager.getLoopById(loopId);
        if (loop) {
            window.measureManager.startEditingMeasure(loop, measureIndex);
        }
    }
};

// Drag and drop global functions
window.allowDrop = function(e) {
    if (window.songStructureManager) {
        window.songStructureManager.allowDrop(e);
    }
};

window.dragLeave = function(e) {
    if (window.songStructureManager) {
        window.songStructureManager.dragLeave(e);
    }
};

window.dropLoop = function(e) {
    if (window.songStructureManager) {
        window.songStructureManager.dropLoop(e);
    }
};

window.saveCurrentLoop = function() {
    if (window.domHelpers) {
        window.domHelpers.handleSaveLoop();
    }
};


console.log('🎸 Chord Main loaded - waiting for DOM ready...');
