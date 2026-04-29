// Guitar Tuner using Web Audio API
// Supports standard guitar tuning: E, A, D, G, B, E

class GuitarTuner {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.stream = null;
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
            
            // Insert into tool page anchor (centered within the white card)
            const pageAnchor = document.getElementById('tuner-page-anchor');
            if (!pageAnchor) return;
            pageAnchor.appendChild(container);
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
            // getUserMedia requires a secure context (HTTPS) except for localhost.
            // If the app is opened via LAN IP / non-secure origin, the mic will be blocked.
            if (!window.isSecureContext) {
                const host = window.location.hostname;
                const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
                if (!isLocalhost) {
                    alert('הדפדפן חוסם מיקרופון על HTTP. פתח את האתר ב-HTTPS או דרך localhost (127.0.0.1).');
                    return;
                }
            }

            // Request microphone access with RAW audio - no voice processing.
            // Browsers default to echoCancellation + noiseSuppression + autoGainControl
            // which filter out guitar and favor speech; we need the actual guitar sound.
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            this.stream = stream;
            
            // Create audio context (must be after user gesture)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Critical: resume if suspended (browser autoplay policy - otherwise no audio data)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Configure analyser
            this.analyser.fftSize = 8192; // Higher FFT size for better frequency resolution
            this.analyser.smoothingTimeConstant = 0.3;
            // Time-domain data needs fftSize samples (NOT frequencyBinCount).
            this.dataArray = new Float32Array(this.analyser.fftSize);
            
            // Connect microphone to analyser
            this.microphone.connect(this.analyser);
            
            this.isListening = true;
            this.updateUI();
            this.startAnalysis();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            const msg = (error && error.name) ? ` (${error.name})` : '';
            alert(`לא ניתן לגשת למיקרופון${msg}. אנא ודא שהרשאת גישה למיקרופון ניתנה (וגם שלא פתוח בטאב אחר).`);
        }
    }
    
    stopListening() {
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.stream) {
            try {
                this.stream.getTracks().forEach((t) => t.stop());
            } catch (e) { /* ignore */ }
            this.stream = null;
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
        if (!this.isListening || !this.analyser) return;
        // If context was closed or suspended, stop the loop
        if (this.audioContext && this.audioContext.state === 'closed') return;
        
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
        // Robust autocorrelation pitch detection (ACF2+ style)
        // Works better for guitar than naive max-correlation scanning.
        const sampleRate = this.audioContext.sampleRate;
        const buf = this.dataArray;
        const size = buf.length;

        // RMS gate (ignore silence / noise)
        let rms = 0;
        let mean = 0;
        for (let i = 0; i < size; i++) mean += buf[i];
        mean /= size;
        for (let i = 0; i < size; i++) {
            const v = buf[i] - mean;
            rms += v * v;
        }
        rms = Math.sqrt(rms / size);
        if (rms < 0.008) return 0;

        // Trim leading/trailing silence (improves correlation)
        let r1 = 0;
        let r2 = size - 1;
        const thresh = 0.02;
        while (r1 < size / 2 && Math.abs(buf[r1] - mean) < thresh) r1++;
        while (r2 > size / 2 && Math.abs(buf[r2] - mean) < thresh) r2--;
        if (r2 - r1 < 128) return 0;

        const trimmed = buf.slice(r1, r2);
        const n = trimmed.length;

        // Autocorrelation
        const c = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n - i; j++) {
                const a = trimmed[j] - mean;
                const b = trimmed[j + i] - mean;
                sum += a * b;
            }
            c[i] = sum;
        }

        // Find the first dip then the next peak
        let d = 0;
        while (d < n - 1 && c[d] > c[d + 1]) d++;

        let maxval = -Infinity;
        let maxpos = -1;
        for (let i = d; i < n; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        if (maxpos <= 0) return 0;

        // Parabolic interpolation around the peak for better precision
        let t0 = maxpos;
        if (maxpos > 0 && maxpos < n - 1) {
            const x1 = c[maxpos - 1];
            const x2 = c[maxpos];
            const x3 = c[maxpos + 1];
            const a = (x1 + x3 - 2 * x2) / 2;
            const b = (x3 - x1) / 2;
            if (a) t0 = maxpos - b / (2 * a);
        }

        const freq = sampleRate / t0;
        if (freq >= 55 && freq <= 450) return freq;
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
        const container = document.getElementById('tuner-container');
        
        if (this.isListening) {
            statusText.textContent = 'כבה טיונר';
            content.style.display = 'block';
            toggleBtn.classList.add('active');
            if (container) container.classList.add('tuner-open');
        } else {
            statusText.textContent = 'הפעל טיונר';
            content.style.display = 'none';
            toggleBtn.classList.remove('active');
            if (container) container.classList.remove('tuner-open');
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
