// DOM Helpers - Utility functions for DOM manipulation and UI updates
// This provides common DOM operations and UI state management

class DOMHelpers {
    constructor() {
        this.animationTimeouts = new Map();
        this.observers = new Map();
    }

    /**
     * Initialize DOM helpers and setup global UI elements
     */
    init() {
        this.setupGlobalButtonListeners();
        this.setupKeyboardShortcuts();
        this.setupNotificationSystem();
        this.updateAllButtons();
    }

    /**
     * Setup global button event listeners
     */
    setupGlobalButtonListeners() {
        // Add chord button
        const addChordBtn = document.querySelector('.add-chord-btn');
        if (addChordBtn && !addChordBtn._listenerAdded) {
            addChordBtn.addEventListener('click', this.handleAddChord.bind(this));
            addChordBtn._listenerAdded = true;
        }

        // Next measure button
        const nextMeasureBtn = document.getElementById('next-measure-btn');
        if (nextMeasureBtn && !nextMeasureBtn._listenerAdded) {
            nextMeasureBtn.addEventListener('click', this.handleNextMeasure.bind(this));
            nextMeasureBtn._listenerAdded = true;
        }

        // Clear measure button
        const clearBtn = document.getElementById('clear-measure-btn');
        if (clearBtn && !clearBtn._listenerAdded) {
            clearBtn.addEventListener('click', this.handleClearMeasure.bind(this));
            clearBtn._listenerAdded = true;
        }

        // Add empty chord button
        const addEmptyBtn = document.getElementById('add-empty-chord-btn');
        if (addEmptyBtn && !addEmptyBtn._listenerAdded) {
            addEmptyBtn.addEventListener('click', this.handleAddEmptyChord.bind(this));
            addEmptyBtn._listenerAdded = true;
        }

        // Save loop button - כאן הבעיה העיקרית!
        const saveLoopBtn = document.getElementById('save-loop-btn');
        if (saveLoopBtn && !saveLoopBtn._listenerAdded) {
            saveLoopBtn.addEventListener('click', this.handleSaveLoop.bind(this));
            saveLoopBtn._listenerAdded = true;
            console.log("🔧 Event listener הוסף לכפתור שמירת לופ");
        }

        // Discard loop button
        const discardLoopBtn = document.getElementById('discard-loop-btn');
        if (discardLoopBtn && !discardLoopBtn._listenerAdded) {
            discardLoopBtn.addEventListener('click', this.handleDiscardLoop.bind(this));
            discardLoopBtn._listenerAdded = true;
        }

        // Finish button
        const finishBtn = document.querySelector('.finish-btn');
        if (finishBtn && !finishBtn._listenerAdded) {
            finishBtn.addEventListener('click', this.handleFinish.bind(this));
            finishBtn._listenerAdded = true;
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch(e.key) {
                case 'Enter':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.handleNextMeasure();
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.handleClearMeasure();
                    }
                    break;
                case 's':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.handleSaveLoop();
                    }
                    break;
                case 'Escape':
                    this.handleDiscardLoop();
                    break;
                case ' ':
                    e.preventDefault();
                    this.handleAddEmptyChord();
                    break;
            }
        });
    }

    /**
     * Setup notification system
     */
    setupNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    /**
     * Get notification color based on type
     */
    getNotificationColor(type) {
        const colors = {
            'info': 'linear-gradient(135deg, #667eea, #764ba2)',
            'success': 'linear-gradient(135deg, #28a745, #20c997)',
            'warning': 'linear-gradient(135deg, #ffc107, #ff8f00)',
            'error': 'linear-gradient(135deg, #dc3545, #c82333)'
        };
        return colors[type] || colors['info'];
    }

    /**
     * Update all button states based on current application state
     */
    updateAllButtons() {
        console.log("=== 🔧 עדכון כל הכפתורים ===");

        const measureManager = window.measureManager;
        const loopManager = window.loopManager;
        const songStructureManager = window.songStructureManager;

        console.log("📊 זמינות מנהלים:", {
            measureManager: !!measureManager,
            loopManager: !!loopManager,
            songStructureManager: !!songStructureManager
        });

        // Measure-related buttons
        const nextMeasureBtn = document.getElementById("next-measure-btn");
        const clearBtn = document.getElementById("clear-measure-btn");
        const addEmptyBtn = document.getElementById("add-empty-chord-btn");
        const addChordBtn = document.querySelector(".add-chord-btn");

        if (measureManager) {
            const hasChords = measureManager.isCurrentMeasureReady();
            const hasMeasure = measureManager.currentMeasure !== null;

            console.log("🎵 מצב תיבות:", { hasChords, hasMeasure });

            if (nextMeasureBtn) nextMeasureBtn.disabled = !hasChords;
            if (clearBtn) clearBtn.disabled = !hasChords;
            if (addEmptyBtn) addEmptyBtn.disabled = !hasMeasure;

            // Add chord button depends on both measure and selected chord
            if (addChordBtn) {
                const hasSelectedChord = window.chordUIManager && window.chordUIManager.getCurrentChord();
                addChordBtn.disabled = !hasMeasure || !hasSelectedChord;
            }
        }

        // Loop-related buttons
        const saveLoopBtn = document.getElementById("save-loop-btn");
        const discardLoopBtn = document.getElementById("discard-loop-btn");

        if (loopManager) {
            const hasLoopContent = loopManager.hasCurrentLoopContent();
            const loopNameSelect = document.getElementById("loop-name-select");
            const loopNameInput = document.getElementById("loop-name");
            
            let hasLoopName = false;
            if (loopNameSelect) {
                if (loopNameSelect.value === 'other') {
                    hasLoopName = loopNameInput ? loopNameInput.value.trim().length > 0 : false;
                } else {
                    hasLoopName = loopNameSelect.value.length > 0;
                }
            }

            console.log("🔄 מצב לופים:", {
                hasLoopContent,
                hasLoopName,
                currentLoopLength: loopManager.currentLoop.length,
                savedLoopsCount: loopManager.savedLoops.length
            });

            if (saveLoopBtn) {
                saveLoopBtn.disabled = !hasLoopContent || !hasLoopName;
                console.log("💾 כפתור שמירת לופ מופעל:", !saveLoopBtn.disabled);
            }
            if (discardLoopBtn) discardLoopBtn.disabled = !hasLoopContent;
        }

        // *** זה החלק הכי חשוב - כפתור הסיום ***
        const finishBtn = document.querySelector('.finish-btn');
        console.log("🏁 כפתור סיום נמצא:", !!finishBtn);

        if (finishBtn && songStructureManager) {
            const isSongReady = songStructureManager.isSongReady();
            const songStructure = songStructureManager.getSongStructure();
            const songStats = songStructureManager.getSongStats();

            console.log("🎼 מצב מבנה השיר:", {
                isSongReady,
                songStructureLength: songStructure.length,
                songStats,
                songStructureContent: songStructure
            });

            finishBtn.disabled = !isSongReady;

            if (!isSongReady) {
                console.log("❌ השיר לא מוכן! סיבה: אין לופים במבנה השיר");
                finishBtn.title = "יש להוסיף לפחות לופ אחד למבנה השיר כדי לסיים";
                finishBtn.style.cursor = "not-allowed";
            } else {
                console.log("✅ השיר מוכן!");
                finishBtn.title = "סיים והמשך לשמירת השיר";
                finishBtn.style.cursor = "pointer";
            }

            console.log("🏁 כפתור סיום disabled:", finishBtn.disabled);
        } else {
            console.log("❌ כפתור סיום או מנהל מבנה השיר לא נמצאו");
        }

        console.log("=== סיום עדכון כפתורים ===");
    }

    /**
     * Handle add chord button click
     */
    handleAddChord() {
        if (!window.chordUIManager || !window.measureManager) return;

        const chordName = window.chordUIManager.getCurrentChord();
        if (!chordName) {
            this.showNotification('יש לבחור אקורד תחילה', 'warning');
            return;
        }

        const success = window.measureManager.addChord(chordName);
        if (success) {
            window.chordUIManager.addToRecentlyUsed(chordName);
            this.showNotification(`נוסף אקורד: ${chordName}`, 'success', 1500);
            this.updateAllButtons();
        }
    }

    /**
     * Handle next measure button click
     */
    handleNextMeasure() {
        if (!window.measureManager || !window.loopManager) return;

        const completedMeasure = window.measureManager.nextMeasure();
        console.log("✅ תיבה שהושלמה:", completedMeasure);

        if (completedMeasure) {
            // Add to current loop
            window.loopManager.addMeasureToCurrentLoop(completedMeasure);
            this.showNotification('עברנו לתיבה הבאה', 'success', 1500);
        } else {
            // Was in editing mode
            this.showNotification('השינויים נשמרו', 'success', 1500);
        }

        this.updateAllButtons();
        this.triggerAutoSave();
    }

    /**
     * Handle clear measure button click
     */
    handleClearMeasure() {
        if (!window.measureManager) return;

        if (confirm('האם אתה בטוח שברצונך לנקות את התיבה הנוכחית?')) {
            window.measureManager.clearMeasure();
            this.showNotification('התיבה נוקתה', 'info', 1500);
            this.updateAllButtons();
        }
    }

    /**
     * Handle add empty chord button click
     */
    handleAddEmptyChord() {
        if (!window.measureManager) return;

        const success = window.measureManager.addEmptyChord();
        if (success) {
            this.showNotification('נוספה הפסקה', 'info', 1500);
            this.updateAllButtons();
        }
    }

    /**
     * Handle save loop button click
     */
    async handleSaveLoop() {
        if (!window.loopManager) return;

        try {
            console.log("🟡 DOM Helper - התחלת שמירת לופ");
            const success = await window.loopManager.saveCurrentLoop();

            if (success) {
                this.showNotification('הלופ נשמר בהצלחה!', 'success');
                this.updateAllButtons();
                console.log("🟢 DOM Helper - לופ נשמר בהצלחה");
            } else {
                console.log("🔴 DOM Helper - שמירת הלופ נכשלה");
            }
        } catch (error) {
            console.error('Error saving loop:', error);
            this.showNotification('שגיאה בשמירת הלופ', 'error');
        }
    }

    /**
     * Handle discard loop button click
     */
    handleDiscardLoop() {
        if (!window.loopManager) return;

        const success = window.loopManager.discardCurrentLoop();
        if (success) {
            this.showNotification('הלופ בוטל', 'warning', 2000);
            this.updateAllButtons();
        }
    }

    /**
     * Handle finish button click
     */
/**
 * Handle finish button click
 */
    async handleFinish() {
        if (!window.songStructureManager || !window.dataManager) return;

        if (!window.songStructureManager.isSongReady()) {
            this.showNotification('יש להוסיף לפחות לופ אחד לשיר', 'error');
            return;
        }

        try {
            this.showLoadingState(true);

            // **תיקון**: סמן שאנחנו בתהליך סיום
            localStorage.setItem('finishingProcess', 'true');

            // שמור נתונים למערכת הישנה לפני הכל
            this.saveDataForOldSystem();

            this.showNotification('שומר נתונים...', 'info', 1000);

            // נסה לשמור לשרת (אבל לא תיתן לזה לעצור אותנו)
            try {
                await window.dataManager.autoSave();
                this.showNotification('השיר נשמר בהצלחה!', 'success', 1000);
            } catch (error) {
                console.log('שמירה לשרת נכשלה, אבל ממשיכים:', error);
                this.showNotification('השיר נשמר מקומית', 'info', 1000);
            }

            // מעבר אחורה ללא תלות בהצלחת שמירת השרת
            setTimeout(() => {
                this.navigateBack();
            }, 500);

        } catch (error) {
            console.error('Error during finish:', error);
            // גם במקרה של שגיאה - שמור מקומית וחזור
            this.saveDataForOldSystem();
            localStorage.setItem('finishingProcess', 'true');
            this.showNotification('שומר מקומית וחוזר...', 'warning', 1000);

            setTimeout(() => {
                this.navigateBack();
            }, 1000);
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Navigate back to appropriate page based on mode
     */
/**
 * Navigate back to appropriate page based on mode
 */
    navigateBack() {
        const mode = window.ChordCore.ModeDetector.determineMode();

        // **תיקון חשוב**: סמן שאנחנו בתהליך סיום כדי למנוע אזהרת beforeunload
        localStorage.setItem('finishingProcess', 'true');

        // לפני חזרה, שמור את הנתונים ב-localStorage בפורמט הישן
        this.saveDataForOldSystem();

        if (mode === window.ChordCore.APP_MODES.EDITING) {
            const editingSongId = localStorage.getItem("editingSongId");
            window.location.href = `/edit_song/${editingSongId}`;
        } else {
            window.location.href = "/add_song";
        }
    }

    /**
     * Save data in format compatible with old add_song.js system
     */
/**
 * Save data in format compatible with old add_song.js system
 */
    saveDataForOldSystem() {
        try {
            console.log("🔄 שומר נתונים למערכת הישנה...");

            const loopManager = window.loopManager;
            const songStructureManager = window.songStructureManager;

            if (!loopManager || !songStructureManager) {
                console.log("❌ מנהלים לא זמינים");
                return;
            }

            // **תיקון חשוב**: יצירת song structure עם repeatCount נכון
            const songStructure = songStructureManager.getSongStructure();

            // אם אין מבנה שיר, צור אותו מהלופים השמורים
            if (songStructure.length === 0) {
                const savedLoops = loopManager.getAllSavedLoops();
                savedLoops.forEach(loop => {
                    songStructureManager.addLoopToSong(loop);
                });
            }

            // עכשיו קבל את המבנה המעודכן
            const finalSongStructure = songStructureManager.getSongStructure();
            console.log("🎼 מבנה שיר לשמירה:", finalSongStructure);

            // יצירת chordLines עם החזרות הנכונות
            const chordLines = [];

            finalSongStructure.forEach(loop => {
                const repeatCount = loop.repeatCount || 1;
                console.log(`🔁 לופ "${loop.customName || loop.name}" עם ${repeatCount} חזרות`);

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

            // יצירת loops data עם החזרות הנכונות
            const loopsData = finalSongStructure.map(loop => ({
                customName: loop.customName || loop.name,
                name: loop.customName || loop.name,
                measures: loop.measures,
                measureCount: loop.measureCount,
                repeatCount: loop.repeatCount || 1
            }));

            // שמירה ב-localStorage בפורמט הישן
            localStorage.setItem("chords", JSON.stringify(chordLines));
            localStorage.setItem("loops", JSON.stringify(loopsData));
            localStorage.setItem("song_structure", JSON.stringify(loopsData));
            const editingSongId = localStorage.getItem("editingSongId");
            const partsOwner = editingSongId && editingSongId !== "null" && editingSongId !== "undefined"
                ? editingSongId
                : "new";
            localStorage.setItem("partsOwner", partsOwner);
            localStorage.setItem("justReturnedFromChords", "true");

            console.log("✅ נתונים נשמרו למערכת הישנה:", {
                chordLines: chordLines.length,
                loops: loopsData.length,
                totalChordsWithRepeats: chordLines.length,
                loopsWithRepeats: loopsData
            });

            console.log("🔍 פירוט החזרות:", loopsData.map(l => `${l.name}: ${l.repeatCount} חזרות`));

        } catch (error) {
            console.error("❌ שגיאה בשמירת נתונים למערכת הישנה:", error);
        }
    }

    /**
     * Show/hide loading state
     */
    showLoadingState(loading) {
        const finishBtn = document.querySelector('.finish-btn');
        if (!finishBtn) return;

        if (loading) {
            finishBtn.disabled = true;
            finishBtn.textContent = '💾 שומר...';
            finishBtn.style.opacity = '0.7';
        } else {
            finishBtn.disabled = false;
            finishBtn.textContent = '✅ סיים והמשך';
            finishBtn.style.opacity = '1';
        }
    }

    /**
     * Trigger auto-save with debouncing
     */
    triggerAutoSave() {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Set new timeout for auto-save (debounced)
        this.autoSaveTimeout = setTimeout(async () => {
            if (window.dataManager) {
                try {
                    await window.dataManager.autoSave();
                    console.log('Auto-save completed');
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }, 2000); // 2 second delay
    }

    /**
     * Add smooth animations to elements
     */
    animateElement(element, animation = 'fadeIn', duration = 300) {
        if (!element) return;

        // Clear existing animation
        const timeoutKey = element.dataset.animationId;
        if (timeoutKey && this.animationTimeouts.has(timeoutKey)) {
            clearTimeout(this.animationTimeouts.get(timeoutKey));
            this.animationTimeouts.delete(timeoutKey);
        }

        const animationId = Date.now().toString();
        element.dataset.animationId = animationId;

        switch(animation) {
            case 'fadeIn':
                element.style.opacity = '0';
                element.style.transition = `opacity ${duration}ms ease-in-out`;
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 10);
                break;

            case 'slideIn':
                element.style.transform = 'translateY(20px)';
                element.style.opacity = '0';
                element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                setTimeout(() => {
                    element.style.transform = 'translateY(0)';
                    element.style.opacity = '1';
                }, 10);
                break;

            case 'bounce':
                element.style.transform = 'scale(1.1)';
                element.style.transition = `transform ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
                const timeout = setTimeout(() => {
                    element.style.transform = 'scale(1)';
                    this.animationTimeouts.delete(animationId);
                }, duration);
                this.animationTimeouts.set(animationId, timeout);
                break;
        }
    }

    /**
     * Setup intersection observer for animations
     */
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target, 'slideIn');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // Observe elements that should animate on scroll
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });

        this.observers.set('intersection', observer);
    }

    /**
     * Update page title based on current state
     */
    updatePageTitle() {
        const mode = window.ChordCore.ModeDetector.determineMode();
        const loopManager = window.loopManager;
        const songStructureManager = window.songStructureManager;

        let title = 'הוספת אקורדים';

        if (mode === window.ChordCore.APP_MODES.EDITING) {
            title = 'עריכת אקורדים';
        }

        if (loopManager && songStructureManager) {
            const loopCount = loopManager.getAllSavedLoops().length;
            const structureCount = songStructureManager.getSongStructure().length;

            if (loopCount > 0 || structureCount > 0) {
                title += ` (${loopCount} לופים, ${structureCount} בשיר)`;
            }
        }

        document.title = title;
    }

    /**
     * Get element by ID with error handling
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Get elements by class name with error handling
     */
    getElementsByClassName(className) {
        const elements = document.getElementsByClassName(className);
        if (elements.length === 0) {
            console.warn(`No elements with class '${className}' found`);
        }
        return Array.from(elements);
    }

    /**
     * Safe event listener addition
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot add event listener to null element');
            return;
        }

        try {
            element.addEventListener(event, handler, options);
        } catch (error) {
            console.error('Error adding event listener:', error);
        }
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Clear timeouts
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.animationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.animationTimeouts.clear();

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Export the DOM helpers
window.DOMHelpers = DOMHelpers;
