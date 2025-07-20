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

    console.log("🔍 בדיקת חזרה מאקורדים:", { justReturned, addingNewSong });

    if (justReturned === "true" && addingNewSong === "true") {
        const chords = localStorage.getItem("chords");
        const loops = localStorage.getItem("loops");

        console.log("✅ חזרנו מעמוד האקורדים עם נתונים:", { chords: !!chords, loops: !!loops });

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

    console.log("🎵 מסמן אקורדים כנוספו");

    if (chordsSuccessDiv && chordsBtn) {
        chordsSuccessDiv.style.display = "flex";
        chordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';
        chordsBtn.onclick = editNewSongChords;

        // עדכן את מדד ההתקדמות
        updateProgressStep(2, 'completed');
        console.log("✅ כפתור עודכן למצב עריכה");
    }
}

// מעבר לעמוד האקורדים החדש
function goToChordsPage() {
    console.log("🎸 מעבר לעמוד האקורדים החדש");

    // שמירת נתוני הטופס הנוכחי
    saveNewSongFormData();

    // הגדרת מצב שיר חדש למערכת האקורדים החדשה
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId"); // ודא שלא בעריכה

    console.log("🚀 מעבר ל-/add-chords");
    // מעבר לעמוד האקורדים החדש
    window.location.href = "/add-chords";
}

// עריכת אקורדים קיימים
function editNewSongChords() {
    console.log("✏️ עריכת אקורדים קיימים");

    // שמירת נתוני הטופס
    saveNewSongFormData();

    // ודא שאנחנו במצב שיר חדש
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");

    console.log("🚀 מעבר לעריכה ב-/add-chords");
    // מעבר לעריכת האקורדים החדשה
    window.location.href = "/add-chords";
}

// בדיקה אם יש אקורדים לשיר החדש הנוכחי
function hasChordsForCurrentNewSong() {
    const savedChords = localStorage.getItem("chords");
    const addingNewSong = localStorage.getItem("addingNewSong");
    const editingSongId = localStorage.getItem("editingSongId");

    const hasChords = savedChords && addingNewSong === "true" && !editingSongId;
    console.log("🔍 בדיקת אקורדים קיימים:", { savedChords: !!savedChords, addingNewSong, editingSongId, hasChords });

    return hasChords;
}

// ===== FORM DATA MANAGEMENT =====

// Form data management functions
function initializeNewSong() {
    console.log("🏁 אתחול מצב שיר חדש");

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

    console.log("✅ אתחול הושלם");
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
    console.log("💾 נתוני טופס נשמרו:", formData);
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
    console.log("🌟 DOM טעון - מתחיל אתחול עמוד הוספת שיר");

    // **תיקון**: התחלה נקיה כשנכנסים לעמוד הוספת שיר
    cleanStartNewSong();

    // Setup basic functionality
    setupValidation();
    initializeNewSong();

    // *** חיבור כפתור האקורדים - הכי חשוב! ***
    const chordsBtn = document.getElementById("chords-btn");
    if (chordsBtn) {
        console.log("🎸 נמצא כפתור האקורדים - מחבר event listener");

        // הסר כל event listeners קיימים
        chordsBtn.replaceWith(chordsBtn.cloneNode(true));
        const newChordsBtn = document.getElementById("chords-btn");

        newChordsBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🔥 כפתור האקורדים נלחץ!");
            goToChordsPage();
        });

        console.log("✅ Event listener מחובר בהצלחה");
    } else {
        console.error("❌ כפתור האקורדים לא נמצא!");
    }

    // Load existing form data (רק אם זה ממש חזרה מעמוד האקורדים)
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (justReturnedFromChords === "true") {
        console.log("📄 טוען נתוני טופס קיימים");
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

    // Check chords status - **תיקון חשוב**
    const chordsSuccessDiv = document.getElementById("chords-success");
    const justReturnedFromChords2 = localStorage.getItem("justReturnedFromChords");

    // בדוק אם יש אקורדים שנשמרו (ללא תלות בסטטוס חזרה)
    const hasExistingChords = hasChordsForCurrentNewSong();

    console.log("🔍 בדיקת מצב אקורדים:", {
        hasExistingChords,
        justReturnedFromChords: justReturnedFromChords2,
        chordsInStorage: !!localStorage.getItem("chords"),
        addingNewSong: localStorage.getItem("addingNewSong")
    });

    // עדכן את הכפתור בהתאם למצב
    const finalChordsBtn = document.getElementById("chords-btn");

    if (hasExistingChords || justReturnedFromChords2 === "true") {
        const savedChords = localStorage.getItem("chords");
        const savedLoops = localStorage.getItem("loops");

        console.log("✅ יש אקורדים קיימים - מציג במצב עריכה");

        if (savedChords) {
            document.getElementById("chords").value = savedChords;
            if (savedLoops) {
                document.getElementById("loops").value = savedLoops;
            }

            chordsSuccessDiv.style.display = "flex";
            finalChordsBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';

            // הסר event listeners קיימים ותחבר את החדש
            finalChordsBtn.replaceWith(finalChordsBtn.cloneNode(true));
            const editBtn = document.getElementById("chords-btn");
            editBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("✏️ לחיצה על עריכת אקורדים");
                editNewSongChords();
            });

            updateProgressStep(2, 'completed');

            // נקה את הסימון רק אחרי שטענו הכל
            localStorage.removeItem("justReturnedFromChords");
        }
    } else {
        // אין אקורדים - מצב ברירת מחדל
        console.log("❌ אין אקורדים - מצב ברירת מחדל");
        chordsSuccessDiv.style.display = "none";
        finalChordsBtn.innerHTML = '<span>🎸</span><span>הוסף אקורדים</span>';

        // ודא שהכפתור מחובר נכון
        finalChordsBtn.replaceWith(finalChordsBtn.cloneNode(true));
        const addBtn = document.getElementById("chords-btn");
        addBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🎸 לחיצה על הוספת אקורדים");
            goToChordsPage();
        });

        document.getElementById("chords").value = "";
        document.getElementById("loops").value = "";
    }

    // Auto-save on field changes (רק אם חזרנו מעמוד האקורדים)
    if (justReturnedFromChords === "true") {
        console.log("🔄 מגדיר auto-save לשדות");
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
            console.log("📝 טופס נשלח");

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
                    console.log("🎵 אקורדים נקראו מהמערכת החדשה:", chords);
                } else {
                    removeButtonLoading(submitBtn);
                    showMessage("❌ יש להוסיף אקורדים לשיר תחילה", "error");
                    return;
                }
            } catch (e) {
                removeButtonLoading(submitBtn);
                showMessage("❌ שגיאה בקריאת האקורדים. נסה שוב להוסיף אותם.", "error");
                console.error("שגיאה בקריאת אקורדים:", e);
                return;
            }

            const loopsRaw = document.getElementById("loops").value;
            if (loopsRaw) {
                try {
                    loops = JSON.parse(loopsRaw);
                    console.log("🔄 לופים נקראו מהמערכת החדשה:", loops);
                } catch (e) {
                    console.log("שגיאה בקריאת לופים:", e);
                    loops = [];
                }
            }

            formData.chords = chords;
            formData.loops = loops;

            console.log("🚀 שולח שיר עם נתוני מערכת אקורדים חדשה:", formData);

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

                    console.log("🎉 שיר נוצר בהצלחה!");

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
                console.error("שגיאה בשליחת שיר:", error);
            });
        });
    } else {
        console.error("❌ טופס לא נמצא!");
    }

    console.log("✅ אתחול עמוד הושלם בהצלחה");
});
