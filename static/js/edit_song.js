// Edit Song Page JavaScript - Enhanced User Experience

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

// Initialize edit song mode
function initializeEditSong() {
    // Clear any conflicting new song data
    localStorage.removeItem("addingNewSong");
    localStorage.removeItem("songData");
    console.log("Initialized edit song mode");
}

// Navigation functions for chords editing
function goToChordsPage() {
    saveFormData();
    window.location.href = `/edit-chords/${songId}`;
}

function editChords() {
    saveFormData();
    window.location.href = `/edit-chords/${songId}`;
}

function saveFormData() {
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
    localStorage.setItem("editSongData", JSON.stringify(formData));
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

// Check if chords exist for this song
function hasChordsForSong() {
    const savedChords = localStorage.getItem("chords");
    const editingSongId = localStorage.getItem("editingSongId");
    return savedChords && editingSongId === songId;
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
    setupValidation();
    initializeEditSong();

    // Validate existing field values
    const fields = ['title', 'artist', 'genre', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && field.value) {
            validateField(fieldId, field.value);
        }
    });

    // Load existing form data from localStorage if available
    const editSongData = JSON.parse(localStorage.getItem("editSongData") || "{}");
    for (const key in editSongData) {
        const element = document.getElementById(key);
        if (element && editSongData[key]) {
            element.value = editSongData[key];
            validateField(key, editSongData[key]);
        }
    }

    // Check chords status
    const chordsSuccessDiv = document.getElementById("chords-success");
    const chordsBtn = document.getElementById("chords-btn");
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    const editingSongId = localStorage.getItem("editingSongId");

    if (justReturnedFromChords === "true" && editingSongId === songId) {
        // User just returned from chords page - show success message
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");

        if (savedChords) {
            document.getElementById("chords").value = savedChords;
            document.getElementById("loops").value = savedLoops || "[]";

            chordsSuccessDiv.style.display = "flex";
            chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים</span>';
            chordsBtn.onclick = editChords;

            // Clear the flag so it won't show again on refresh
            localStorage.removeItem("justReturnedFromChords");
            console.log("Successfully updated chords from localStorage");
        }
    } else if (hasChordsForSong()) {
        // Show edit chords button
        chordsSuccessDiv.style.display = "none";
        chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים</span>';
        chordsBtn.onclick = editChords;
    } else {
        // Show regular edit chords button
        chordsSuccessDiv.style.display = "none";
        chordsBtn.innerHTML = '<span>🎸</span><span>ערוך אקורדים</span>';
        chordsBtn.onclick = editChords;
    }

    // Auto-save on field changes
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.addEventListener("input", saveFormData);
        }
    });

    // Form submission handler
    document.getElementById("edit-song-form").addEventListener("submit", function (event) {
        event.preventDefault();

        const submitBtn = document.querySelector('.submit-btn');
        addButtonLoading(submitBtn);

        // Validate all fields
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
        // בדוק אם הקישור כבר embed - אל תשנה אותו
        if (!formData.video_url.includes('/embed/')) {
            const ytMatch = formData.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
            if (ytMatch && ytMatch[1]) {
                formData.video_url = "https://www.youtube.com/embed/" + ytMatch[1];
            }
        }

        // Parse chords and loops
        let chords, loops = [];
        try {
            const chordsRaw = document.getElementById("chords").value;
            chords = chordsRaw ? JSON.parse(chordsRaw) : existingChords;
        } catch (e) {
            removeButtonLoading(submitBtn);
            showMessage("❌ שגיאה בקריאת האקורדים. נסה שוב לערוך אותם.", "error");
            return;
        }

        const loopsRaw = document.getElementById("loops").value;
        if (loopsRaw) {
            try {
                loops = JSON.parse(loopsRaw);
            } catch (e) {
                console.log("Error parsing loops data:", e);
                loops = existingLoops;
            }
        } else {
            loops = existingLoops;
        }

        formData.chords = chords;
        formData.loops = loops;

        // Submit to server
        fetch(`/api/edit_song/${songId}`, {
            method: "PUT",
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

                // Clear localStorage after successful edit
                localStorage.removeItem("editSongData");
                localStorage.removeItem("justReturnedFromChords");
                localStorage.removeItem("editingSongId");
                localStorage.removeItem("chords");
                localStorage.removeItem("loops");

                // Redirect to song page after short delay
                setTimeout(() => {
                    window.location.href = `/play/${songId}`;
                }, 1500);
            } else {
                showMessage("❌ שגיאה בעדכון השיר, נסה שוב", "error");
            }
        })
        .catch(error => {
            removeButtonLoading(submitBtn);
            showMessage("❌ שגיאה בעדכון השיר!", "error");
            console.error("Error:", error);
        });
    });
});
