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
        if (addChordBtn) {
            addChordBtn.addEventListener('click', this.handleAddChord.bind(this));
        }

        // Next measure button
        const nextMeasureBtn = document.getElementById('next-measure-btn');
        if (nextMeasureBtn) {
            nextMeasureBtn.addEventListener('click', this.handleNextMeasure.bind(this));
        }

        // Clear measure button
        const clearBtn = document.getElementById('clear-measure-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.handleClearMeasure.bind(this));
        }

        // Add empty chord button
        const addEmptyBtn = document.getElementById('add-empty-chord-btn');
        if (addEmptyBtn) {
            addEmptyBtn.addEventListener('click', this.handleAddEmptyChord.bind(this));
        }

        // Save loop button
        const saveLoopBtn = document.getElementById('save-loop-btn');
        if (saveLoopBtn) {
            saveLoopBtn.addEventListener('click', this.handleSaveLoop.bind(this));
        }

        // Discard loop button
        const discardLoopBtn = document.getElementById('discard-loop-btn');
        if (discardLoopBtn) {
            discardLoopBtn.addEventListener('click', this.handleDiscardLoop.bind(this));
        }

        // Finish button
        const finishBtn = document.querySelector('.finish-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', this.handleFinish.bind(this));
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
        const measureManager = window.measureManager;
        const loopManager = window.loopManager;
        const songStructureManager = window.songStructureManager;

        // Measure-related buttons
        const nextMeasureBtn = document.getElementById("next-measure-btn");
        const clearBtn = document.getElementById("clear-measure-btn");
        const addEmptyBtn = document.getElementById("add-empty-chord-btn");
        const addChordBtn = document.querySelector(".add-chord-btn");

        if (measureManager) {
            const hasChords = measureManager.isCurrentMeasureReady();
            const hasMeasure = measureManager.currentMeasure !== null;

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
            const loopNameInput = document.getElementById("loop-name");
            const hasLoopName = loopNameInput ? loopNameInput.value.trim().length > 0 : false;

            if (saveLoopBtn) saveLoopBtn.disabled = !hasLoopContent || !hasLoopName;
            if (discardLoopBtn) discardLoopBtn.disabled = !hasLoopContent;
        }

        // Finish button
        const finishBtn = document.querySelector('.finish-btn');
        if (finishBtn && songStructureManager) {
            finishBtn.disabled = !songStructureManager.isSongReady();
        }
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

        const success = await window.loopManager.saveCurrentLoop();
        if (success) {
            this.showNotification('הלופ נשמר בהצלחה!', 'success');
            this.updateAllButtons();
            this.triggerAutoSave();
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
    async handleFinish() {
        if (!window.songStructureManager || !window.dataManager) return;

        if (!window.songStructureManager.isSongReady()) {
            this.showNotification('יש להוסיף לפחות לופ אחד לשיר', 'error');
            return;
        }

        try {
            this.showLoadingState(true);

            // Collect all data and save
            const success = await window.dataManager.autoSave();

            if (success) {
                this.showNotification('השיר נשמר בהצלחה!', 'success');

                // Navigate back to appropriate page
                setTimeout(() => {
                    this.navigateBack();
                }, 1000);
            } else {
                this.showNotification('השיר נשמר מקומית - יסונכרן כשתתחבר לאינטרנט', 'warning');

                setTimeout(() => {
                    this.navigateBack();
                }, 2000);
            }
        } catch (error) {
            console.error('Error during finish:', error);
            this.showNotification('שגיאה בשמירה - אנא נסה שוב', 'error');
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Navigate back to appropriate page based on mode
     */
    navigateBack() {
        const mode = window.ChordCore.ModeDetector.determineMode();

        if (mode === window.ChordCore.APP_MODES.EDITING) {
            const editingSongId = localStorage.getItem("editingSongId");
            window.location.href = `/edit_song/${editingSongId}`;
        } else {
            window.location.href = "/add_song";
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
