// Unified Song Form Manager - Handles both Add and Edit Song forms
// Enhanced User Experience with New Chord System Integration

// ===== MODE DETECTION & STATE MANAGEMENT =====

// גלה באיזה מצב אנחנו
function detectFormMode() {
    const addForm = document.getElementById("add-song-form");
    const editForm = document.getElementById("edit-song-form");
    const isEditMode = !!editForm && typeof songId !== 'undefined';

    console.log("🔍 זיהוי מצב טופס:", {
        hasAddForm: !!addForm,
        hasEditForm: !!editForm,
        isEditMode,
        songId: isEditMode ? songId : 'undefined'
    });

    return {
        isEditMode,
        formElement: isEditMode ? editForm : addForm,
        songId: isEditMode ? songId : null
    };
}

// ניקוי מוחלט כשמתחילים דף הוספת שיר חדש
function cleanStartNewSong() {
    console.log("🚀 התחלה חדשה - ניקוי כל הנתונים הישנים");

    // נקה הכל מ-localStorage
    localStorage.removeItem("chords");
    localStorage.removeItem("loops");
    localStorage.removeItem("song_structure");
    localStorage.removeItem("justReturnedFromChords");
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("editSongData");
    localStorage.removeItem("songData");
    localStorage.removeItem("pending_sync");

    // קבע מצב נקי לשיר חדש
    localStorage.setItem("addingNewSong", "true");

    console.log("🧹 כל הנתונים הישנים נוקו - התחלה נקיה לשיר חדש");
}

// אתחול מצב עריכת שיר קיים
function initializeEditSong(songId) {
    console.log("✏️ אתחול מצב עריכת שיר:", songId);

    // ניקוי מצב שיר חדש
    localStorage.removeItem("addingNewSong");
    localStorage.removeItem("songData");

    // הגדרת מצב עריכה
    localStorage.setItem("editingSongId", songId);
}

// אתחול מצב שיר חדש
function initializeNewSong() {
    console.log("🏁 אתחול מצב שיר חדש");

    // ניקוי מצב עריכה
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("editSongData");

    // הגדרת מצב שיר חדש
    localStorage.setItem("addingNewSong", "true");

    // נקה אקורדים ישנים אם לא חזרנו מעמוד האקורדים
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (!justReturnedFromChords) {
        const existingChords = localStorage.getItem("chords");
        const existingAddingNewSong = localStorage.getItem("addingNewSong");

        if (existingChords && existingAddingNewSong !== "true") {
            localStorage.removeItem("chords");
            localStorage.removeItem("loops");
            console.log("🧹 נוקו אקורדים ישנים שלא קשורים לשיר הנוכחי");
        }
    }
}

// ===== MULTI-GENRE MANAGEMENT =====

let selectedGenres = [];

// אינציאליזציה של מערכת ריבוי ז'אנרים
function initializeMultiGenre() {
    const genreSelect = document.getElementById("genre");
    const addGenreBtn = document.getElementById("add-genre-btn");
    const selectedGenresContainer = document.getElementById("selected-genres");
    const genresListInput = document.getElementById("genres-list");

    if (!genreSelect || !addGenreBtn) return;

    // אירוע הוספת ז'אנר
    addGenreBtn.addEventListener("click", function() {
        const selectedValue = genreSelect.value;
        const selectedText = genreSelect.options[genreSelect.selectedIndex].text;

        if (selectedValue && !selectedGenres.includes(selectedValue)) {
            selectedGenres.push(selectedValue);
            updateGenresDisplay();
            genreSelect.value = ""; // איפוס הבחירה
            validateGenres();
        }
    });

    // עדכון תצוגת הז'אנרים הנבחרים
    function updateGenresDisplay() {
        selectedGenresContainer.innerHTML = "";

        selectedGenres.forEach(genreValue => {
            const genreOption = genreSelect.querySelector(`option[value="${genreValue}"]`);
            const genreText = genreOption ? genreOption.text : genreValue;

            const genreTag = document.createElement("div");
            genreTag.className = "genre-tag";
            genreTag.innerHTML = `
                <span>${genreText}</span>
                <button type="button" class="remove-genre" data-genre="${genreValue}">×</button>
            `;

            selectedGenresContainer.appendChild(genreTag);
        });

        // עדכון השדה הנסתר
        genresListInput.value = JSON.stringify(selectedGenres);

        // הוספת אירועי הסרה
        selectedGenresContainer.querySelectorAll(".remove-genre").forEach(btn => {
            btn.addEventListener("click", function() {
                const genreToRemove = this.getAttribute("data-genre");
                selectedGenres = selectedGenres.filter(g => g !== genreToRemove);
                updateGenresDisplay();
                validateGenres();
            });
        });
    }

    // וולידציה של הז'אנרים
    function validateGenres() {
        const validation = document.getElementById("genre-validation");
        const isValid = selectedGenres.length > 0;

        if (validation) {
            validation.innerHTML = isValid ? '✅ ז\'אנרים נבחרו!' : '❌ יש לבחור לפחות ז\'אנר אחד';
            validation.className = isValid ? 'field-success' : 'field-error';
        }

        return isValid;
    }

    // טעינת ז'אנרים מנתונים שמורים
    function loadSavedGenres(genres) {
        if (Array.isArray(genres)) {
            selectedGenres = [...genres];
            updateGenresDisplay();
            validateGenres();
        } else if (typeof genres === 'string' && genres) {
            // תמיכה לאחור - אם יש רק ז'אנר יחיד
            selectedGenres = [genres];
            updateGenresDisplay();
            validateGenres();
        }
    }

    // חשיפת הפונקציות לשימוש חיצוני
    window.loadGenres = loadSavedGenres;
    window.validateGenres = validateGenres;
    window.getSelectedGenres = () => selectedGenres;
    window.clearGenres = () => {
        selectedGenres = [];
        updateGenresDisplay();
        validateGenres();
    };
}

// ===== CHORDS BUTTON STATE MANAGEMENT =====

// זיהוי מצב כפתור האקורדים
function getChordsButtonState() {
    const mode = detectFormMode();
    const justReturned = localStorage.getItem("justReturnedFromChords");
    const savedChords = localStorage.getItem("chords");

    if (mode.isEditMode) {
        // מצב עריכת שיר קיים
        const editingSongId = localStorage.getItem("editingSongId");
        const hasStoredChords = savedChords && editingSongId === mode.songId;

        if (justReturned === "true" && editingSongId === mode.songId) {
            return "EDIT_RETURNED_WITH_CHORDS"; // חזרנו מעמוד אקורדים עם שינויים
        } else if (hasStoredChords) {
            return "EDIT_HAS_CHORDS"; // יש אקורדים שמורים
        } else {
            return "EDIT_NO_CHORDS"; // שיר ישן ללא אקורדים שמורים
        }
    } else {
        // מצב הוספת שיר חדש
        const addingNewSong = localStorage.getItem("addingNewSong");
        const hasNewSongChords = savedChords && addingNewSong === "true";

        if (justReturned === "true" && addingNewSong === "true") {
            return "NEW_RETURNED_WITH_CHORDS"; // שיר חדש - חזרנו עם אקורדים
        } else if (hasNewSongChords) {
            return "NEW_HAS_CHORDS"; // שיר חדש עם אקורדים שמורים
        } else {
            return "NEW_NO_CHORDS"; // שיר חדש ללא אקורדים
        }
    }
}

// עדכון כפתור האקורדים לפי המצב
function updateChordsButton() {
    const state = getChordsButtonState();
    const chordsBtn = document.getElementById("chords-btn");
    const chordsSuccessDiv = document.getElementById("chords-success");

    if (!chordsBtn) {
        console.error("❌ כפתור האקורדים לא נמצא!");
        return;
    }

    console.log("🔄 מעדכן כפתור אקורדים למצב:", state);

    // נקה event listeners קיימים
    const newBtn = chordsBtn.cloneNode(true);
    chordsBtn.parentNode.replaceChild(newBtn, chordsBtn);

    switch(state) {
        case "NEW_NO_CHORDS":
            chordsSuccessDiv.style.display = "none";
            newBtn.innerHTML = '<span>🎸</span><span>הוסף אקורדים</span>';
            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                goToChordsPage();
            });
            break;

        case "NEW_HAS_CHORDS":
        case "NEW_RETURNED_WITH_CHORDS":
            chordsSuccessDiv.style.display = "flex";
            newBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים שנוספו</span>';
            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                editChordsForNewSong();
            });
            updateProgressStep(2, 'completed');
            break;

        case "EDIT_NO_CHORDS":
        case "EDIT_HAS_CHORDS":
        case "EDIT_RETURNED_WITH_CHORDS":
            chordsSuccessDiv.style.display = "none";
            newBtn.innerHTML = '<span>✏️</span><span>ערוך אקורדים</span>';
            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                editChordsForExistingSong();
            });
            break;
    }
}

// ===== CHORDS NAVIGATION FUNCTIONS =====

// מעבר לעמוד אקורדים לשיר חדש
function goToChordsPage() {
    console.log("🎸 מעבר לעמוד האקורדים - שיר חדש");

    saveFormData();

    // הגדרת מצב שיר חדש למערכת האקורדים
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");

    window.location.href = "/add-chords";
}

// עריכת אקורדים לשיר חדש
function editChordsForNewSong() {
    console.log("✏️ עריכת אקורדים - שיר חדש");

    saveFormData();

    // ודא שאנחנו במצב שיר חדש
    localStorage.setItem("addingNewSong", "true");
    localStorage.removeItem("editingSongId");

    window.location.href = "/add-chords";
}

// עריכת אקורדים לשיר קיים
function editChordsForExistingSong() {
    const mode = detectFormMode();
    console.log("✏️ עריכת אקורדים - שיר קיים:", mode.songId);

    saveFormData();

    // הגדרת מצב עריכה
    localStorage.setItem("editingSongId", mode.songId);
    localStorage.removeItem("addingNewSong");

    window.location.href = "/add-chords";
}

// ===== RETURN FROM CHORDS SYSTEM =====

// בדיקה אם חזרנו מעמוד האקורדים
function checkForReturnedChords() {
    const justReturned = localStorage.getItem("justReturnedFromChords");
    const mode = detectFormMode();

    console.log("🔍 בדיקת חזרה מאקורדים:", {
        justReturned,
        isEditMode: mode.isEditMode,
        songId: mode.songId
    });

    if (justReturned === "true") {
        const chords = localStorage.getItem("chords");
        const loops = localStorage.getItem("loops");

        console.log("✅ חזרנו מעמוד האקורדים עם נתונים:", {
            chords: !!chords,
            loops: !!loops
        });

        // טען אקורדים לשדות הנסתרים
        if (chords) {
            document.getElementById("chords").value = chords;
        }

        if (loops) {
            document.getElementById("loops").value = loops;
        }

        // נקה את הסימון
        localStorage.removeItem("justReturnedFromChords");

        return true;
    }

    return false;
}

// ===== FORM DATA MANAGEMENT =====

// שמירת נתוני הטופס
function saveFormData() {
    const mode = detectFormMode();

    const formData = {
        title: document.getElementById("title").value,
        artist: document.getElementById("artist").value,
        genres: JSON.stringify(selectedGenres),
        key: document.getElementById("key").value,
        key_type: document.getElementById("key_type").value,
        difficulty: document.getElementById("difficulty").value,
        time_signature: document.getElementById("time_signature").value,
        bpm: document.getElementById("bpm").value,
        video_url: document.getElementById("video_url").value
    };

    const storageKey = mode.isEditMode ? "editSongData" : "songData";
    localStorage.setItem(storageKey, JSON.stringify(formData));

    console.log("💾 נתוני טופס נשמרו:", { mode: mode.isEditMode ? "edit" : "add", formData });
}

// טעינת נתוני טופס
function loadFormData() {
    const mode = detectFormMode();
    const storageKey = mode.isEditMode ? "editSongData" : "songData";
    const savedData = JSON.parse(localStorage.getItem(storageKey) || "{}");

    console.log("📄 טוען נתוני טופס:", { mode: mode.isEditMode ? "edit" : "add", savedData });

    for (const key in savedData) {
        const element = document.getElementById(key);
        if (element && savedData[key]) {
            if (key === 'genres') {
                // טען ז'אנרים
                try {
                    const genres = JSON.parse(savedData[key]);
                    if (window.loadGenres) {
                        window.loadGenres(genres);
                    }
                } catch (e) {
                    console.log("שגיאה בטעינת ז'אנרים:", e);
                }
            } else {
                element.value = savedData[key];
                validateField(key, savedData[key]);
            }
        }
    }
}

// ===== FORM VALIDATION =====

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
            // עבור ז'אנרים - השתמש בפונקציית validateGenres
            if (window.validateGenres) {
                return window.validateGenres();
            }
            isValid = selectedGenres.length > 0;
            message = isValid ? '✅ ז\'אנרים נבחרו!' : '❌ יש לבחור לפחות ז\'אנר אחד';
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

// הגדרת validation בזמן אמת
function setupValidation() {
    const fields = ['title', 'artist', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => validateField(fieldId, field.value));
            field.addEventListener('change', () => validateField(fieldId, field.value));
        }
    });
}

// ===== PROGRESS STEPS (FOR ADD SONG ONLY) =====

function updateProgressStep(stepNumber, status) {
    const steps = document.querySelectorAll('.progress-step');
    if (steps[stepNumber - 1]) {
        steps[stepNumber - 1].className = `progress-step ${status}`;
    }
}

// ===== UI HELPERS =====

function addButtonLoading(button) {
    button.classList.add('btn-loading');
    button.disabled = true;
}

function removeButtonLoading(button) {
    button.classList.remove('btn-loading');
    button.disabled = false;
}

function showMessage(text, type) {
    const messageEl = document.getElementById("response-message");
    messageEl.textContent = text;
    messageEl.className = `response-message ${type}`;
    messageEl.style.display = "block";

    if (type === 'success') {
        setTimeout(() => {
            messageEl.style.display = "none";
        }, 5000);
    }
}

// איפוס טופס (רק לשיר חדש)
function resetForm() {
    const form = document.getElementById("add-song-form");
    if (!form) return;

    form.reset();
    document.getElementById("bpm").value = "100";
    document.getElementById("chords").value = "";
    document.getElementById("loops").value = "";

    // איפוס ז'אנרים
    if (window.clearGenres) {
        window.clearGenres();
    }

    // איפוס UI elements
    document.getElementById("chords-success").style.display = "none";
    updateChordsButton();

    // איפוס progress steps
    updateProgressStep(1, 'active');
    updateProgressStep(2, 'pending');
    updateProgressStep(3, 'pending');

    // ניקוי validations
    document.querySelectorAll('.field-validation').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.form-input, .form-select').forEach(el => {
        el.className = el.className.replace(/ (error|success)/g, '');
    });
}

// ===== FORM SUBMISSION =====

function handleFormSubmission(event) {
    event.preventDefault();

    const mode = detectFormMode();
    const submitBtn = document.querySelector('.submit-btn');

    console.log("📝 שליחת טופס:", { mode: mode.isEditMode ? "edit" : "add", songId: mode.songId });

    addButtonLoading(submitBtn);

    // אימות כל השדות
    const fields = ['title', 'artist', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];
    let allValid = true;

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !validateField(fieldId, field.value)) {
            allValid = false;
        }
    });

    // וולידציה מיוחדת לז'אנרים
    if (window.validateGenres && !window.validateGenres()) {
        allValid = false;
    }

    if (!allValid) {
        removeButtonLoading(submitBtn);
        showMessage("❌ יש לתקן את השדות המסומנים באדום", "error");
        return;
    }

    const formData = {
        title: document.getElementById("title").value,
        artist: document.getElementById("artist").value,
        genres: selectedGenres, // שלח כמערך
        key: document.getElementById("key").value,
        key_type: document.getElementById("key_type").value,
        difficulty: document.getElementById("difficulty").value,
        time_signature: document.getElementById("time_signature").value,
        bpm: parseInt(document.getElementById("bpm").value),
        video_url: document.getElementById("video_url").value,
    };

    // טיפול בקישורי YouTube
    if (mode.isEditMode && formData.video_url.includes('/embed/')) {
        // אל תשנה קישורי embed קיימים
    } else {
        const ytMatch = formData.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
        if (ytMatch && ytMatch[1]) {
            formData.video_url = "https://www.youtube.com/embed/" + ytMatch[1];
        }
    }

    // טיפול באקורדים ולופים
    let chords, loops = [];
    try {
        const chordsRaw = document.getElementById("chords").value;
        if (chordsRaw) {
            chords = JSON.parse(chordsRaw);
            console.log("🎵 אקורדים נקראו מהמערכת החדשה:", chords);
        } else {
            if (mode.isEditMode) {
                // במצב עריכה - השתמש באקורדים הקיימים
                chords = typeof existingChords !== 'undefined' ? existingChords : [];
            } else {
                // במצב הוספה - חובה להיות אקורדים
                removeButtonLoading(submitBtn);
                showMessage("❌ יש להוסיף אקורדים לשיר תחילה", "error");
                return;
            }
        }
    } catch (e) {
        removeButtonLoading(submitBtn);
        showMessage("❌ שגיאה בקריאת האקורדים. נסה שוב לערוך אותם.", "error");
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
            loops = mode.isEditMode && typeof existingLoops !== 'undefined' ? existingLoops : [];
        }
    } else if (mode.isEditMode && typeof existingLoops !== 'undefined') {
        loops = existingLoops;
    }

    formData.chords = chords;
    formData.loops = loops;

    // שליחה לשרת
    const url = mode.isEditMode ? `/api/edit_song/${mode.songId}` : "/api/add_song";
    const method = mode.isEditMode ? "PUT" : "POST";

    console.log("🚀 שולח לשרת:", { url, method, formData });

    fetch(url, {
        method: method,
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

            if (!mode.isEditMode) {
                updateProgressStep(3, 'completed');
            }

            // ניקוי נתונים אחרי הצלחה
            clearAllSongData();

            console.log(`🎉 שיר ${mode.isEditMode ? 'עודכן' : 'נוצר'} בהצלחה!`);

            // מעבר לעמוד המתאים
            setTimeout(() => {
                if (mode.isEditMode) {
                    window.location.href = `/play/${mode.songId}`;
                } else {
                    window.location.href = '/songs';
                }
            }, 1500);
        } else {
            showMessage(`❌ שגיאה ב${mode.isEditMode ? 'עדכון' : 'הוספת'} השיר: ` + (data.error || "שגיאה לא ידועה"), "error");
        }
    })
    .catch(error => {
        removeButtonLoading(submitBtn);
        showMessage(`❌ שגיאה ב${mode.isEditMode ? 'עדכון' : 'הוספת'} השיר!`, "error");
        console.error("שגיאה בשליחת שיר:", error);
    });
}

// ניקוי כל נתוני השיר
function clearAllSongData() {
    localStorage.removeItem("chords");
    localStorage.removeItem("loops");
    localStorage.removeItem("songData");
    localStorage.removeItem("editSongData");
    localStorage.removeItem("justReturnedFromChords");
    localStorage.removeItem("addingNewSong");
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("song_structure");
    localStorage.removeItem("pending_sync");
}

// ===== MAIN INITIALIZATION =====

document.addEventListener("DOMContentLoaded", function () {
    console.log("🌟 DOM טעון - מתחיל אתחול מנהל הטפסים המאוחד");

    const mode = detectFormMode();
    console.log("🎯 מצב זוהה:", {
        isEditMode: mode.isEditMode,
        songId: mode.songId
    });

    // אתחול בסיסי
    setupValidation();

    // אתחול מערכת ריבוי ז'אנרים
    initializeMultiGenre();

    // אתחול לפי מצב
    if (mode.isEditMode) {
        // מצב עריכת שיר קיים
        initializeEditSong(mode.songId);

        // אימות שדות קיימים
        const fields = ['title', 'artist', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value) {
                validateField(fieldId, field.value);
            }
        });
    } else {
        // מצב הוספת שיר חדש
        const justReturned = localStorage.getItem("justReturnedFromChords");
        if (!justReturned) {
            cleanStartNewSong();
        }
        initializeNewSong();
    }

    // טעינת נתונים קיימים (רק אם חזרנו מאקורדים)
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    if (justReturnedFromChords === "true") {
        loadFormData();
    }

    // בדיקה וטיפול בחזרה מאקורדים
    checkForReturnedChords();

    // עדכון כפתור האקורדים
    updateChordsButton();

    // auto-save בשינוי שדות
    const fields = ['title', 'artist', 'key', 'key_type', 'difficulty', 'time_signature', 'bpm', 'video_url'];
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.addEventListener("input", saveFormData);
        }
    });

    // חיבור אירוע שליחת טופס
    if (mode.formElement) {
        mode.formElement.addEventListener("submit", handleFormSubmission);
    } else {
        console.error("❌ טופס לא נמצא!");
    }

    console.log("✅ אתחול מנהל הטפסים הושלם בהצלחה");
});
