// Add Song Page JavaScript - Enhanced User Experience

// Form validation functions
function validateField(fieldId, value) {
    const field = document.getElementById(fieldId);
    const validation = document.getElementById(`${fieldId}-validation`);

    if (!validation) return true;

    let isValid = true;
    let message = '';

    switch(fieldId) {
        case 'title':
            isValid = value.trim().length >= 2;
            message = isValid ? '✅ נראה טוב!' : '❌ שם השיר חייב להכיל לפחות 2 תווים';
            break;
        case 'artist':
            isValid = value.trim().length >= 2;
            message = isValid ? '✅ נראה טוב!' : '❌ שם האמן חייב להכיל לפחות 2 תווים';
            break;
        case 'genre':
            isValid = value !== '';
            message = isValid ? '✅ ז\'אנר נבחר!' : '❌ יש לבחור ז\'אנר';
            break;
        case 'bpm':
            const bpmValue = parseInt(value);
            isValid = bpmValue >= 40 && bpmValue <= 200;
            message = isValid ? '✅ קצב תקין!' : '❌ הקצב חייב להיות בין 40-200';
            break;
        case 'video_url':
            const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|.*\.(mp4|avi|mov|wmv)).*$/i;
            isValid = urlPattern.test(value);
            message = isValid ? '✅ קישור תקין!' : '❌ הכנס קישור תקין לסרטון';
            break;
        default:
            isValid = value !== '';
            message = isValid ? '✅ נבחר!' : '❌ יש לבחור ערך';
    }

    validation.innerHTML = message;
    validation.className = isValid ? 'field-success' : 'field-error';
    field.className = field.className.replace(/ (error|success)/g, '') + (isValid ? ' success' : ' error');

    return isValid;
}

// Setup real-time validation
function setupValidation() {
    const fields = ['title', 'artist', 'genre', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => validateField(fieldId, field.value));
            field.addEventListener('change', () => validateField(fieldId, field.value));
        }
    });
}

// Progress steps management
function updateProgressStep(stepNumber, status) {
    const steps = document.querySelectorAll('.progress-step');
    if (steps[stepNumber - 1]) {
        steps[stepNumber - 1].className = `progress-step ${status}`;
    }
}

// Form data management functions
function initializeNewSong() {
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("editSongData");
    localStorage.setItem("addingNewSong", "true");

    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (!justReturnedFromChords) {
        const existingChords = localStorage.getItem("chords");
        const existingAddingNewSong = localStorage.getItem("addingNewSong");

        if (existingChords && existingAddingNewSong !== "true") {
            localStorage.removeItem("chords");
            localStorage.removeItem("loops");
            console.log("Cleared old chords from different context");
        }
    }
    console.log("Initialized new song mode");
}

function goToChordsPage() {
    saveNewSongFormData();
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");
    window.location.href = "/add-chords";
}

function editNewSongChords() {
    saveNewSongFormData();
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");
    window.location.href = "/add-chords";
}

function saveNewSongFormData() {
    const formData = {
        title: document.getElementById("title").value,
        artist: document.getElementById("artist").value,
        genre: document.getElementById("genre").value,
        key: document.getElementById("key").value,
        key_type: document.getElementById("key_type").value,
        difficulty: document.getElementById("difficulty").value,
        time_signature: document.getElementById("time_signature").value,
        bpm: document.getElementById("bpm").value,
        video_url: document.getElementById("video_url").value
    };
    localStorage.setItem("songData", JSON.stringify(formData));
}

function hasChordsForCurrentNewSong() {
    const savedChords = localStorage.getItem("chords");
    const addingNewSong = localStorage.getItem("addingNewSong");
    const editingSongId = localStorage.getItem("editingSongId");
    return savedChords && addingNewSong === "true" && !editingSongId;
}

// Button animations
function addButtonLoading(button) {
    button.classList.add('btn-loading');
    button.disabled = true;
}

function removeButtonLoading(button) {
    button.classList.remove('btn-loading');
    button.disabled = false;
}

// Message display
function showMessage(text, type) {
    const messageEl = document.getElementById("response-message");
    messageEl.textContent = text;
    messageEl.className = `response-message ${type}`;
    messageEl.style.display = "block";

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageEl.style.display = "none";
        }, 5000);
    }
}

// Form reset function
function resetForm() {
    const form = document.getElementById("add-song-form");
    form.reset();
    document.getElementById("bpm").value = "100";
    document.getElementById("chords").value = "";
    document.getElementById("loops").value = "";

    // Reset UI elements
    document.getElementById("chords-success").style.display = "none";
    const chordsBtn = document.getElementById("chords-btn");
    chordsBtn.innerHTML = '<span>🎸</span><span>הוסף אקורדים</span>';
    chordsBtn.onclick = goToChordsPage;

    // Reset progress steps
    updateProgressStep(1, 'active');
    updateProgressStep(2, 'pending');
    updateProgressStep(3, 'pending');

    // Clear all validations
    document.querySelectorAll('.field-validation').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.form-input, .form-select').forEach(el => {
        el.className = el.className.replace(/ (error|success)/g, '');
    });
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
    setupValidation();
    initializeNewSong();

    // Load existing form data
    const songData = JSON.parse(localStorage.getItem("songData") || "{}");
    for (const key in songData) {
        const element = document.getElementById(key);
        if (element && songData[key]) {
            element.value = songData[key];
            validateField(key, songData[key]);
        }
    }

    // Check chords status
    const chordsSuccessDiv = document.getElementById("chords-success");
    const chordsBtn = document.getElementById("chords-btn");
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");

    if (hasChordsForCurrentNewSong() && justReturnedFromChords === "true") {
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");

        document.getElementById("chords").value = savedChords;
        if (savedLoops) {
            document.getElementById("loops").value = savedLoops;
        }

        chordsSuccessDiv.style.display = "flex";
        chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';
        chordsBtn.onclick = editNewSongChords;
        updateProgressStep(2, 'completed');
        localStorage.removeItem("justReturnedFromChords");
    } else if (hasChordsForCurrentNewSong()) {
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");

        document.getElementById("chords").value = savedChords;
        if (savedLoops) {
            document.getElementById("loops").value = savedLoops;
        }

        chordsSuccessDiv.style.display = "none";
        chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';
        chordsBtn.onclick = editNewSongChords;
        updateProgressStep(2, 'completed');
    } else {
        chordsSuccessDiv.style.display = "none";
        chordsBtn.innerHTML = '<span>🎸</span><span>הוסף אקורדים</span>';
        chordsBtn.onclick = goToChordsPage;
        document.getElementById("chords").value = "";
        document.getElementById("loops").value = "";
    }

    // Auto-save on field changes
    const fields = ["title", "artist", "genre", "key", "key_type", "difficulty", "time_signature", "bpm", "video_url"];
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.addEventListener("input", saveNewSongFormData);
        }
    });
});

// Form submission handler
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("add-song-form").addEventListener("submit", function (event) {
        event.preventDefault();

        const submitBtn = document.querySelector('.submit-btn');
        addButtonLoading(submitBtn);

        // Validate all fields
        const fields = ['title', 'artist', 'genre', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];
        let allValid = true;

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !validateField(fieldId, field.value)) {
                allValid = false;
            }
        });

        if (!allValid) {
            removeButtonLoading(submitBtn);
            showMessage("❌ יש לתקן את השדות המסומנים באדום", "error");
            return;
        }

        const formData = {
            title: document.getElementById("title").value,
            artist: document.getElementById("artist").value,
            genre: document.getElementById("genre").value,
            key: document.getElementById("key").value,
            key_type: document.getElementById("key_type").value,
            difficulty: document.getElementById("difficulty").value,
            time_signature: document.getElementById("time_signature").value,
            bpm: parseInt(document.getElementById("bpm").value),
            video_url: document.getElementById("video_url").value,
        };

        // Handle YouTube URL conversion
        const ytMatch = formData.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
        if (ytMatch && ytMatch[1]) {
            formData.video_url = "https://www.youtube.com/embed/" + ytMatch[1];
        }

        // Parse chords and loops
        let chords, loops = [];
        try {
            chords = JSON.parse(document.getElementById("chords").value);
        } catch (e) {
            removeButtonLoading(submitBtn);
            showMessage("❌ שגיאה בקריאת האקורדים. נסה שוב להוסיף אותם.", "error");
            return;
        }

        const loopsRaw = document.getElementById("loops").value;
        if (loopsRaw) {
            try {
                loops = JSON.parse(loopsRaw);
            } catch (e) {
                console.log("Error parsing loops data:", e);
                loops = [];
            }
        }

        formData.chords = chords;
        formData.loops = loops;

        // Submit to server
        fetch("/api/add_song", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            removeButtonLoading(submitBtn);

            if (data.message) {
                showMessage("✅ " + data.message, "success");
                updateProgressStep(3, 'completed');

                // Clear all data after successful creation
                localStorage.removeItem("chords");
                localStorage.removeItem("loops");
                localStorage.removeItem("songData");
                localStorage.removeItem("justReturnedFromChords");
                localStorage.removeItem("addingNewSong");

                // Reset form after success
                setTimeout(() => {
                    resetForm();
                }, 2000);
            } else {
                showMessage("❌ שגיאה בהוספת השיר, נסה שוב", "error");
            }
        })
        .catch(error => {
            removeButtonLoading(submitBtn);
            showMessage("❌ שגיאה בהוספת השיר!", "error");
            console.error("Error:", error);
        });
    });
});
