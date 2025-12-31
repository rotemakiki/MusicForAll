// Guitar Tuner using Web Audio API
// Supports standard guitar tuning: E, A, D, G, B, E

class GuitarTuner {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isListening = false;
        this.animationFrame = null;
        
        // Standard guitar tuning frequencies (Hz)
        this.notes = [
            { name: 'E', frequency: 82.41, string: 6 },  // Low E (6th string)
            { name: 'A', frequency: 110.00, string: 5 }, // A (5th string)
            { name: 'D', frequency: 146.83, string: 4 }, // D (4th string)
            { name: 'G', frequency: 196.00, string: 3 }, // G (3rd string)
            { name: 'B', frequency: 246.94, string: 2 }, // B (2nd string)
            { name: 'E', frequency: 329.63, string: 1 }  // High E (1st string)
        ];
        
        this.currentNote = null;
        this.currentFrequency = 0;
        this.currentCents = 0;
        
        this.init();
    }
    
    init() {
        this.setupUI();
        this.setupEventListeners();
    }
    
    setupUI() {
        // Create tuner container if it doesn't exist
        if (!document.getElementById('tuner-container')) {
            const container = document.createElement('div');
            container.id = 'tuner-container';
            container.className = 'tuner-container';
            container.innerHTML = `
                <div class="tuner-header">
                    <h3>🎸 טיונר גיטרה</h3>
                    <button id="tuner-toggle-btn" class="tuner-toggle-btn">
                        <span id="tuner-status">הפעל טיונר</span>
                    </button>
                </div>
                <div class="tuner-content" id="tuner-content" style="display: none;">
                    <div class="tuner-display">
                        <div class="frequency-display">
                            <span class="frequency-label">תדר:</span>
                            <span id="frequency-value" class="frequency-value">-- Hz</span>
                        </div>
                        <div class="note-display">
                            <div id="current-note" class="current-note">--</div>
                            <div id="target-note" class="target-note">בחר מיתר</div>
                        </div>
                        <div class="tuner-gauge">
                            <div class="gauge-needle" id="gauge-needle"></div>
                            <div class="gauge-center"></div>
                        </div>
                        <div class="cents-display" id="cents-display">0 סנט</div>
                    </div>
                    <div class="string-selector">
                        <div class="string-buttons">
                            ${this.notes.map((note, index) => `
                                <button class="string-btn" data-note="${note.name}" data-frequency="${note.frequency}" data-string="${note.string}">
                                    <span class="string-number">${note.string}</span>
                                    <span class="string-name">${note.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="tuner-info">
                        <p class="info-text">🎤 לחץ על "הפעל טיונר" והרשה גישה למיקרופון</p>
                        <p class="info-text">🎯 בחר מיתר והקש עליו - הטיונר יראה אם הוא מכוון</p>
                    </div>
                </div>
            `;
            
            // Insert into controls panel
            const controlsPanel = document.querySelector('.controls-panel');
            if (controlsPanel) {
                // Find transpose control group by looking for transpose-controls
                const allGroups = controlsPanel.querySelectorAll('.control-group');
                let transposeGroup = null;
                
                for (let group of allGroups) {
                    if (group.querySelector('.transpose-controls')) {
                        transposeGroup = group;
                        break;
                    }
                }
                
                if (transposeGroup) {
                    // Insert after transpose controls
                    transposeGroup.insertAdjacentElement('afterend', container);
                } else {
                    // Fallback: insert after volume control
                    const volumeGroup = Array.from(allGroups).find(group => 
                        group.querySelector('#volume-slider')
                    );
                    if (volumeGroup) {
                        volumeGroup.insertAdjacentElement('afterend', container);
                    } else {
                        // Last resort: insert after first control group
                        if (allGroups.length > 0) {
                            allGroups[0].insertAdjacentElement('afterend', container);
                        } else {
                            controlsPanel.insertBefore(container, controlsPanel.firstChild);
                        }
                    }
                }
            }
        }
    }
    
    setupEventListeners() {
        const toggleBtn = document.getElementById('tuner-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTuner());
        }
        
        // String selector buttons
        document.querySelectorAll('.string-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const frequency = parseFloat(e.currentTarget.dataset.frequency);
                const note = e.currentTarget.dataset.note;
                const string = e.currentTarget.dataset.string;
                this.selectString(frequency, note, string);
            });
        });
    }
    
    async toggleTuner() {
        if (!this.isListening) {
            await this.startListening();
        } else {
            this.stopListening();
        }
    }
    
    async startListening() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Configure analyser
            this.analyser.fftSize = 8192; // Higher FFT size for better frequency resolution
            this.analyser.smoothingTimeConstant = 0.3;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Float32Array(bufferLength);
            
            // Connect microphone to analyser
            this.microphone.connect(this.analyser);
            
            this.isListening = true;
            this.updateUI();
            this.startAnalysis();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('לא ניתן לגשת למיקרופון. אנא ודא שהרשאת גישה למיקרופון ניתנה.');
        }
    }
    
    stopListening() {
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.isListening = false;
        this.updateUI();
        
        // Reset display
        document.getElementById('frequency-value').textContent = '-- Hz';
        document.getElementById('current-note').textContent = '--';
        document.getElementById('cents-display').textContent = '0 סנט';
        document.getElementById('gauge-needle').style.transform = 'translateX(0)';
    }
    
    startAnalysis() {
        if (!this.isListening) return;
        
        this.analyser.getFloatTimeDomainData(this.dataArray);
        
        // Detect pitch using autocorrelation
        const frequency = this.detectPitch();
        
        if (frequency > 0) {
            this.currentFrequency = frequency;
            this.updateFrequencyDisplay();
            
            // If a target note is selected, calculate cents
            const targetBtn = document.querySelector('.string-btn.active');
            if (targetBtn) {
                const targetFreq = parseFloat(targetBtn.dataset.frequency);
                this.currentCents = this.calculateCents(frequency, targetFreq);
                this.updateTunerDisplay();
            } else {
                // Auto-detect closest note
                this.autoDetectNote(frequency);
            }
        }
        
        this.animationFrame = requestAnimationFrame(() => this.startAnalysis());
    }
    
    detectPitch() {
        // Autocorrelation method for pitch detection
        const sampleRate = this.audioContext.sampleRate;
        const bufferLength = this.dataArray.length;
        
        // Find the period using autocorrelation
        let maxCorrelation = 0;
        let bestPeriod = 0;
        
        const minPeriod = Math.floor(sampleRate / 1000); // 1000 Hz max
        const maxPeriod = Math.floor(sampleRate / 50);   // 50 Hz min
        
        for (let period = minPeriod; period < maxPeriod && period < bufferLength / 2; period++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - period; i++) {
                correlation += this.dataArray[i] * this.dataArray[i + period];
            }
            
            // Normalize by period length
            correlation /= (bufferLength - period);
            
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                bestPeriod = period;
            }
        }
        
        // Only return frequency if correlation is strong enough
        if (maxCorrelation > 0.1 && bestPeriod > 0) {
            return sampleRate / bestPeriod;
        }
        
        return 0;
    }
    
    calculateCents(frequency, targetFrequency) {
        if (frequency <= 0 || targetFrequency <= 0) return 0;
        return 1200 * Math.log2(frequency / targetFrequency);
    }
    
    autoDetectNote(frequency) {
        // Find closest note
        let closestNote = null;
        let minDifference = Infinity;
        
        this.notes.forEach(note => {
            const difference = Math.abs(frequency - note.frequency);
            if (difference < minDifference) {
                minDifference = difference;
                closestNote = note;
            }
        });
        
        if (closestNote && minDifference < 20) { // Within 20 Hz
            this.currentNote = closestNote;
            document.getElementById('current-note').textContent = closestNote.name;
            document.getElementById('target-note').textContent = `מיתר ${closestNote.string}`;
        }
    }
    
    selectString(frequency, note, string) {
        // Remove active class from all buttons
        document.querySelectorAll('.string-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        const selectedBtn = document.querySelector(`[data-string="${string}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        // Update target note display
        document.getElementById('target-note').textContent = `מיתר ${string} - ${note}`;
        
        // If listening, immediately update display
        if (this.isListening && this.currentFrequency > 0) {
            this.currentCents = this.calculateCents(this.currentFrequency, frequency);
            this.updateTunerDisplay();
        }
    }
    
    updateFrequencyDisplay() {
        document.getElementById('frequency-value').textContent = 
            `${this.currentFrequency.toFixed(1)} Hz`;
    }
    
    updateTunerDisplay() {
        const targetBtn = document.querySelector('.string-btn.active');
        if (!targetBtn) return;
        
        const targetFreq = parseFloat(targetBtn.dataset.frequency);
        const cents = this.calculateCents(this.currentFrequency, targetFreq);
        
        // Update cents display
        const centsText = cents >= 0 ? `+${cents.toFixed(1)}` : cents.toFixed(1);
        document.getElementById('cents-display').textContent = `${centsText} סנט`;
        
        // Update gauge needle position (-50 to +50 cents, centered at 0)
        const maxCents = 50;
        const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));
        const percentage = (clampedCents / maxCents) * 100;
        document.getElementById('gauge-needle').style.transform = `translateX(${percentage}%)`;
        
        // Update current note display
        const closestNote = this.findClosestNote(this.currentFrequency);
        if (closestNote) {
            document.getElementById('current-note').textContent = closestNote.name;
        }
        
        // Color feedback
        const gaugeNeedle = document.getElementById('gauge-needle');
        const absCents = Math.abs(cents);
        if (absCents < 5) {
            gaugeNeedle.className = 'gauge-needle in-tune';
        } else if (absCents < 20) {
            gaugeNeedle.className = 'gauge-needle close';
        } else {
            gaugeNeedle.className = 'gauge-needle out-of-tune';
        }
    }
    
    findClosestNote(frequency) {
        let closest = null;
        let minDiff = Infinity;
        
        this.notes.forEach(note => {
            const diff = Math.abs(frequency - note.frequency);
            if (diff < minDiff) {
                minDiff = diff;
                closest = note;
            }
        });
        
        return closest;
    }
    
    updateUI() {
        const statusText = document.getElementById('tuner-status');
        const content = document.getElementById('tuner-content');
        const toggleBtn = document.getElementById('tuner-toggle-btn');
        
        if (this.isListening) {
            statusText.textContent = 'כבה טיונר';
            content.style.display = 'block';
            toggleBtn.classList.add('active');
        } else {
            statusText.textContent = 'הפעל טיונר';
            content.style.display = 'none';
            toggleBtn.classList.remove('active');
        }
    }
}

// Initialize tuner when DOM is ready
let tunerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for play_song.js to initialize
    setTimeout(() => {
        if (!tunerInstance) {
            tunerInstance = new GuitarTuner();
        }
    }, 500);
});

// Export for manual initialization if needed
window.GuitarTuner = GuitarTuner;
