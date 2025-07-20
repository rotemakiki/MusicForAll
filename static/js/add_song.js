// Add Song Page JavaScript - Enhanced User Experience with New Chord System Integration

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

// ===== NEW CHORD SYSTEM INTEGRATION =====

// פונקציה חדשה - ניקוי מוחלט כשמתחילים דף הוספת שיר
function cleanStartNewSong() {
    console.log("🚀 התחלה חדשה - ניקוי כל הנתונים הישנים");

    // נקה הכל מ-localStorage
    localStorage.removeItem("chords");
    localStorage.removeItem("loops");
    localStorage.removeItem("song_structure");
    localStorage.removeItem("justReturnedFromChords");
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("editSongData");
    localStorage.removeItem("songData"); // גם נתוני הטופס הישנים
    localStorage.removeItem("pending_sync");

    // קבע מצב נקי לשיר חדש
    localStorage.setItem("addingNewSong", "true");

    console.log("🧹 כל הנתונים הישנים נוקו - התחלה נקיה לשיר חדש");
}

// פונקציה לבדיקה אם חזרנו מעמוד האקורדים החדש
function checkForReturnedChords() {
    const justReturned = localStorage.getItem("justReturnedFromChords");
    const addingNewSong = localStorage.getItem("addingNewSong");

    if (justReturned === "true" && addingNewSong === "true") {
        const chords = localStorage.getItem("chords");
        const loops = localStorage.getItem("loops");

        console.log("Returned from NEW chords system with data:", { chords: !!chords, loops: !!loops });

        if (chords) {
            document.getElementById("chords").value = chords;
            markChordsAsAdded();
        }

        if (loops) {
            document.getElementById("loops").value = loops;
        }

        // נקה את הסימון
        localStorage.removeItem("justReturnedFromChords");

        // עדכן את השלב
        updateProgressStep(2, 'completed');
    }
}

// סימון שהאקורדים נוספו
function markChordsAsAdded() {
    const chordsSuccessDiv = document.getElementById("chords-success");
    const chordsBtn = document.getElementById("chords-btn");

    if (chordsSuccessDiv && chordsBtn) {
        chordsSuccessDiv.style.display = "flex";
        chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';
        chordsBtn.onclick = editNewSongChords;

        // עדכן את מדד ההתקדמות
        updateProgressStep(2, 'completed');
    }
}

// מעבר לעמוד האקורדים החדש
function goToChordsPage() {
    console.log("Going to NEW chords system for new song");

    // שמירת נתוני הטופס הנוכחי
    saveNewSongFormData();

    // הגדרת מצב שיר חדש למערכת האקורדים החדשה
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId"); // ודא שלא בעריכה

    // מעבר לעמוד האקורדים החדש
    window.location.href = "/add-chords";
}

// עריכת אקורדים קיימים
function editNewSongChords() {
    console.log("Editing chords in NEW system for new song");

    // שמירת נתוני הטופס
    saveNewSongFormData();

    // ודא שאנחנו במצב שיר חדש
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");

    // מעבר לעריכת האקורדים החדשה
    window.location.href = "/add-chords";
}

// בדיקה אם יש אקורדים לשיר החדש הנוכחי
function hasChordsForCurrentNewSong() {
    const savedChords = localStorage.getItem("chords");
    const addingNewSong = localStorage.getItem("addingNewSong");
    const editingSongId = localStorage.getItem("editingSongId");
    return savedChords && addingNewSong === "true" && !editingSongId;
}

// ===== FORM DATA MANAGEMENT =====

// Form data management functions
function initializeNewSong() {
    // ניקוי מצב עריכה
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("editSongData");

    // הגדרת מצב שיר חדש
    localStorage.setItem("addingNewSong", "true");

    // **תיקון חשוב**: נקה תמיד אקורדים ישנים כשמתחילים שיר חדש
    // אבל רק אם לא חזרנו זה עתה מעמוד האקורדים
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (!justReturnedFromChords) {
        const existingChords = localStorage.getItem("chords");
        const existingAddingNewSong = localStorage.getItem("addingNewSong");

        // אם יש אקורדים שלא קשורים לשיר החדש הנוכחי - נקה אותם
        if (existingChords && existingAddingNewSong !== "true") {
            localStorage.removeItem("chords");
            localStorage.removeItem("loops");
            console.log("🧹 נוקו אקורדים ישנים שלא קשורים לשיר הנוכחי");
        }
    }

    console.log("Initialized new song mode for NEW chord system");
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
    console.log("Saved form data for NEW chord system:", formData);
}

// ===== UI HELPERS =====

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

// ===== INITIALIZATION AND EVENT HANDLERS =====

// Initialize page - אחד כל האירועים
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM loaded - initializing add song page");

    // **תיקון**: התחלה נקיה כשנכנסים לעמוד הוספת שיר
    cleanStartNewSong();

    // Setup basic functionality
    setupValidation();
    initializeNewSong();

    // *** חיבור כפתור האקורדים - הכי חשוב! ***
    const chordsBtn = document.getElementById("chords-btn");
    if (chordsBtn) {
        console.log("Found chords button - attaching click handler");
        chordsBtn.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("Chords button clicked!");
            goToChordsPage();
        });
    } else {
        console.error("Chords button not found!");
    }

    // Load existing form data (רק אם זה ממש חזרה מעמוד האקורדים)
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (justReturnedFromChords === "true") {
        const songData = JSON.parse(localStorage.getItem("songData") || "{}");
        for (const key in songData) {
            const element = document.getElementById(key);
            if (element && songData[key]) {
                element.value = songData[key];
                validateField(key, songData[key]);
            }
        }
    }

    // *** INTEGRATION WITH NEW CHORD SYSTEM ***
    // בדוק אם חזרנו מעמוד האקורדים החדש
    checkForReturnedChords();

    // Check chords status
    const chordsSuccessDiv = document.getElementById("chords-success");

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

    // Auto-save on field changes (רק אם חזרנו מעמוד האקורדים)
    if (justReturnedFromChords === "true") {
        const fields = ["title", "artist", "genre", "key", "key_type", "difficulty", "time_signature", "bpm", "video_url"];
        fields.forEach(field => {
            const el = document.getElementById(field);
            if (el) {
                el.addEventListener("input", saveNewSongFormData);
            }
        });
    }

    // ===== FORM SUBMISSION HANDLER =====
    const form = document.getElementById("add-song-form");
    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            console.log("Form submitted");

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

            // Parse chords and loops from NEW chord system
            let chords, loops = [];
            try {
                const chordsRaw = document.getElementById("chords").value;
                if (chordsRaw) {
                    chords = JSON.parse(chordsRaw);
                    console.log("Parsed chords from NEW system:", chords);
                } else {
                    removeButtonLoading(submitBtn);
                    showMessage("❌ יש להוסיף אקורדים לשיר תחילה", "error");
                    return;
                }
            } catch (e) {
                removeButtonLoading(submitBtn);
                showMessage("❌ שגיאה בקריאת האקורדים. נסה שוב להוסיף אותם.", "error");
                console.error("Error parsing chords:", e);
                return;
            }

            const loopsRaw = document.getElementById("loops").value;
            if (loopsRaw) {
                try {
                    loops = JSON.parse(loopsRaw);
                    console.log("Parsed loops from NEW system:", loops);
                } catch (e) {
                    console.log("Error parsing loops data:", e);
                    loops = [];
                }
            }

            formData.chords = chords;
            formData.loops = loops;

            console.log("Submitting song with NEW chord system data:", formData);

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

                    console.log("Song created successfully with NEW chord system!");

                    // Navigate to songs list after success
                    setTimeout(() => {
                        window.location.href = '/songs';
                    }, 2000);
                } else {
                    showMessage("❌ שגיאה בהוספת השיר: " + (data.error || "שגיאה לא ידועה"), "error");
                }
            })
            .catch(error => {
                removeButtonLoading(submitBtn);
                showMessage("❌ שגיאה בהוספת השיר!", "error");
                console.error("Error submitting song:", error);
            });
        });
    } else {
        console.error("Form not found!");
    }
});
