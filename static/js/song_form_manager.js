// Unified Song Form Manager - Handles both Add and Edit Song forms
// Enhanced User Experience with New Chord System Integration

// ===== רמות ליווי / הובלה (0–10) =====

function syncLevelPickerRow(row, value) {
    const v = String(value);
    row.querySelectorAll(".level-chip").forEach((btn) => {
        const on = btn.getAttribute("data-level") === v;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
}

function syncAllLevelPickersFromHidden() {
    document.querySelectorAll(".level-picker").forEach((row) => {
        const targetId = row.getAttribute("data-target");
        const hidden = targetId ? document.getElementById(targetId) : null;
        if (hidden) syncLevelPickerRow(row, hidden.value);
    });
}

let levelPickersBound = false;

function bindLevelPickersOnce() {
    if (levelPickersBound) return;
    levelPickersBound = true;
    document.querySelectorAll(".level-picker").forEach((row) => {
        const targetId = row.getAttribute("data-target");
        const hidden = targetId ? document.getElementById(targetId) : null;
        if (!hidden) return;
        row.querySelectorAll(".level-chip").forEach((btn) => {
            btn.addEventListener("click", () => {
                const v = btn.getAttribute("data-level");
                hidden.value = v;
                syncLevelPickerRow(row, v);
                if (targetId) validateField(targetId, v);
                saveFormData();
            });
        });
    });
}

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
    localStorage.removeItem("returningFromPlayMethodEditor");
    ["tabs_text", "chords_lyrics_text", "lyrics_text"].forEach((type) => {
        localStorage.removeItem(`play_method_${type}_new`);
        localStorage.removeItem(`play_method_${type}_new_dirty`);
    });
    localStorage.removeItem("play_method_new");

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
let selectedArtists = [];

function getArtistDisplayValue() {
    const artists = window.getSelectedArtists ? window.getSelectedArtists() : selectedArtists;
    const typedArtist = document.getElementById("artist") ? document.getElementById("artist").value.trim() : "";
    const combined = [...artists];

    if (typedArtist && !combined.some(a => a.toLowerCase() === typedArtist.toLowerCase())) {
        combined.push(typedArtist);
    }

    return combined.join(" / ");
}

function getArtistsForSaving() {
    const typedArtist = document.getElementById("artist") ? document.getElementById("artist").value.trim() : "";
    const combined = [...selectedArtists];

    if (typedArtist && !combined.some(a => a.toLowerCase() === typedArtist.toLowerCase())) {
        combined.push(typedArtist);
    }

    return combined;
}

function initializeMultiArtists() {
    const artistInput = document.getElementById("artist");
    const addArtistBtn = document.getElementById("add-artist-btn");
    const selectedArtistsContainer = document.getElementById("selected-artists");
    const artistsListInput = document.getElementById("artists-list");

    if (!artistInput || !addArtistBtn || !selectedArtistsContainer) return;

    function syncHidden() {
        if (artistsListInput) {
            artistsListInput.value = JSON.stringify(getArtistsForSaving());
        }
    }

    function updateArtistsDisplay() {
        selectedArtistsContainer.innerHTML = "";

        selectedArtists.forEach((artistName) => {
            const artistTag = document.createElement("div");
            artistTag.className = "artist-tag";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = artistName;

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-artist";
            removeBtn.dataset.artist = artistName;
            removeBtn.textContent = "×";

            artistTag.appendChild(nameSpan);
            artistTag.appendChild(removeBtn);
            selectedArtistsContainer.appendChild(artistTag);
        });

        selectedArtistsContainer.querySelectorAll(".remove-artist").forEach(btn => {
            btn.addEventListener("click", function() {
                const artistToRemove = this.getAttribute("data-artist");
                selectedArtists = selectedArtists.filter(a => a !== artistToRemove);
                updateArtistsDisplay();
                validateField("artist", getArtistDisplayValue());
                saveFormData();
            });
        });

        syncHidden();
    }

    function addArtistFromInput() {
        const artistName = artistInput.value.trim();
        if (!artistName) {
            validateField("artist", getArtistDisplayValue());
            return;
        }

        if (!selectedArtists.some(a => a.toLowerCase() === artistName.toLowerCase())) {
            selectedArtists.push(artistName);
        }

        artistInput.value = "";
        updateArtistsDisplay();
        validateField("artist", getArtistDisplayValue());
        saveFormData();
        artistInput.focus();
    }

    addArtistBtn.addEventListener("click", addArtistFromInput);
    artistInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addArtistFromInput();
        }
    });
    artistInput.addEventListener("input", () => {
        syncHidden();
        validateField("artist", getArtistDisplayValue());
    });

    window.loadArtists = (artists) => {
        if (Array.isArray(artists)) {
            selectedArtists = artists.map(a => String(a || "").trim()).filter(Boolean);
        } else if (typeof artists === "string" && artists.trim()) {
            selectedArtists = [artists.trim()];
        } else {
            selectedArtists = [];
        }
        artistInput.value = "";
        updateArtistsDisplay();
        validateField("artist", getArtistDisplayValue());
    };
    window.getSelectedArtists = getArtistsForSaving;
    window.clearArtists = () => {
        selectedArtists = [];
        artistInput.value = "";
        updateArtistsDisplay();
        validateField("artist", "");
    };

    updateArtistsDisplay();
}

const FALLBACK_GENRES_CATALOG = [
    { value: "pop", label: "פופ - Pop" },
    { value: "rock", label: "רוק - Rock" },
    { value: "jazz", label: "ג'אז - Jazz" },
    { value: "blues", label: "בלוז - Blues" },
    { value: "classical", label: "קלאסי - Classical" },
    { value: "folk", label: "פולק - Folk" },
    { value: "country", label: "קאנטרי - Country" },
    { value: "reggae", label: "רגיי - Reggae" },
    { value: "electronic", label: "אלקטרוני - Electronic" },
    { value: "hip_hop", label: "היפ הופ - Hip Hop" },
    { value: "r_and_b", label: "R&B - ריתם אנד בלוז" },
    { value: "soul", label: "סול - Soul" },
    { value: "funk", label: "פאנק - Funk" },
    { value: "metal", label: "מטאל - Metal" },
    { value: "punk", label: "פאנק - Punk" },
    { value: "alternative", label: "אלטרנטיב - Alternative" },
    { value: "indie", label: "אינדי - Indie" },
    { value: "world", label: "מוזיקת עולם - World Musica" },
    { value: "mizrahi", label: "מזרחי" },
    { value: "israeli", label: "ישראלי" },
    { value: "bossa_nova", label: "בוסה נובה - Bossa Nova" },
    { value: "latin", label: "לטיני - Latin" },
    { value: "other", label: "אחר" },
];

function setGenreOptions(genreSelect, genresCatalog) {
    if (!genreSelect) return;
    // Keep first placeholder option only, replace the rest.
    const first = genreSelect.querySelector("option[value='']") || genreSelect.options[0];
    genreSelect.innerHTML = "";
    if (first) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = first.textContent || "בחר ז'אנר";
        genreSelect.appendChild(opt);
    } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "בחר ז'אנר";
        genreSelect.appendChild(opt);
    }

    (genresCatalog || []).forEach((g) => {
        if (!g || !g.value || !g.label) return;
        const opt = document.createElement("option");
        opt.value = g.value;
        opt.textContent = g.label;
        genreSelect.appendChild(opt);
    });
}

async function loadGenresCatalogAndPopulate(genreSelect) {
    if (!genreSelect) return;
    try {
        const resp = await fetch("/api/genres", { method: "GET" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data || !Array.isArray(data.genres) || data.genres.length === 0) {
            throw new Error("Invalid genres payload");
        }
        setGenreOptions(genreSelect, data.genres);
    } catch (e) {
        console.warn("⚠️ לא הצלחתי לטעון קטלוג ז'אנרים מהשרת, משתמש בברירת מחדל.", e);
        // Populate with fallback if the page template no longer contains hardcoded options.
        if ((genreSelect.options || []).length <= 1) {
            setGenreOptions(genreSelect, FALLBACK_GENRES_CATALOG);
        }
    }
}

// אינציאליזציה של מערכת ריבוי ז'אנרים
function initializeMultiGenre() {
    const genreSelect = document.getElementById("genre");
    const addGenreBtn = document.getElementById("add-genre-btn");
    const selectedGenresContainer = document.getElementById("selected-genres");
    const genresListInput = document.getElementById("genres-list");

    if (!genreSelect || !addGenreBtn) return;

    // Load dynamic catalog (admin-managed) into the select.
    loadGenresCatalogAndPopulate(genreSelect);

    // אירוע הוספת ז'אנר
    addGenreBtn.addEventListener("click", function() {
        const selectedValue = genreSelect.value;
        const selectedText = genreSelect.options[genreSelect.selectedIndex].text;

        if (selectedValue && !selectedGenres.includes(selectedValue)) {
            selectedGenres.push(selectedValue);
            updateGenresDisplay();
            genreSelect.value = ""; // איפוס הבחירה
            validateGenres();
            // שמירה אוטומטית של הטופס
            saveFormData();
        }
    });

    // עדכון תצוגת הז'אנרים הנבחרים
    function updateGenresDisplay() {
        if (!selectedGenresContainer) {
            console.error("❌ selectedGenresContainer לא נמצא!");
            return;
        }
        
        console.log("🔄 מעדכן תצוגת ז'אנרים עם:", selectedGenres);
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
            console.log("✅ הוסף ז'אנר לתצוגה:", genreText);
        });

        // עדכון השדה הנסתר
        if (genresListInput) {
            genresListInput.value = JSON.stringify(selectedGenres);
            console.log("💾 עודכן שדה נסתר עם:", genresListInput.value);
        }

        // הוספת אירועי הסרה
        selectedGenresContainer.querySelectorAll(".remove-genre").forEach(btn => {
            btn.addEventListener("click", function() {
                const genreToRemove = this.getAttribute("data-genre");
                selectedGenres = selectedGenres.filter(g => g !== genreToRemove);
                updateGenresDisplay();
                validateGenres();
                // שמירה אוטומטית של הטופס
                saveFormData();
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
        console.log("🎭 loadSavedGenres נקרא עם:", genres, "סוג:", typeof genres);
        if (Array.isArray(genres) && genres.length > 0) {
            selectedGenres = [...genres];
            console.log("✅ מעדכן selectedGenres ל:", selectedGenres);
            updateGenresDisplay();
            validateGenres();
            // ודא שהנתונים נשמרו גם ב-localStorage
            saveFormData();
        } else if (typeof genres === 'string' && genres) {
            // תמיכה לאחור - אם יש רק ז'אנר יחיד
            selectedGenres = [genres];
            console.log("✅ מעדכן selectedGenres (מחרוזת) ל:", selectedGenres);
            updateGenresDisplay();
            validateGenres();
            saveFormData();
        } else {
            console.log("⚠️ loadSavedGenres קיבל ערך לא תקין:", genres);
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

// ===== GUITAR TUNING PICKER =====

const GUITAR_TUNING_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STANDARD_GUITAR_TUNING = [
    { string: 1, label: "מיתר 1 (תחתון)", standard: "e", noteIndex: 4, semitones: 0 },
    { string: 2, label: "מיתר 2", standard: "B", noteIndex: 11, semitones: 0 },
    { string: 3, label: "מיתר 3", standard: "G", noteIndex: 7, semitones: 0 },
    { string: 4, label: "מיתר 4", standard: "D", noteIndex: 2, semitones: 0 },
    { string: 5, label: "מיתר 5", standard: "A", noteIndex: 9, semitones: 0 },
    { string: 6, label: "מיתר 6 (עליון)", standard: "E", noteIndex: 4, semitones: 0 },
];

let guitarTuningState = null;

function mod(n, m) {
    return ((n % m) + m) % m;
}

function noteNameForString(stringConfig, semitones) {
    const noteName = GUITAR_TUNING_NOTES[mod(stringConfig.noteIndex + semitones, GUITAR_TUNING_NOTES.length)];
    return stringConfig.standard === "e" && semitones === 0 ? "e" : noteName;
}

function semitoneText(semitones) {
    if (semitones === 0) return "סטנדרטי";
    const abs = Math.abs(semitones);
    const direction = semitones > 0 ? "למעלה" : "למטה";
    if (abs === 1) return `חצי טון ${direction}`;
    if (abs === 2) return `טון ${direction}`;
    if (abs === 3) return `טון וחצי ${direction}`;
    return `${abs} חצאי טון ${direction}`;
}

function getStandardGuitarTuningState() {
    return {
        label: "כיוון סטנדרטי",
        strings: STANDARD_GUITAR_TUNING.map((stringConfig) => ({
            string: stringConfig.string,
            standard: stringConfig.standard,
            note: noteNameForString(stringConfig, 0),
            semitones: 0,
        })),
    };
}

function normalizeGuitarTuning(raw) {
    if (!raw) return getStandardGuitarTuningState();

    let parsed = raw;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return getStandardGuitarTuningState();
        }
    }

    const incomingStrings = Array.isArray(parsed && parsed.strings) ? parsed.strings : [];
    const strings = STANDARD_GUITAR_TUNING.map((stringConfig) => {
        const incoming = incomingStrings.find((item) => Number(item && item.string) === stringConfig.string) || {};
        const semitones = Math.max(-12, Math.min(12, parseInt(incoming.semitones, 10) || 0));
        return {
            string: stringConfig.string,
            standard: stringConfig.standard,
            note: noteNameForString(stringConfig, semitones),
            semitones,
        };
    });

    const isStandard = strings.every((item) => item.semitones === 0);
    return {
        label: isStandard ? "כיוון סטנדרטי" : strings.map((item) => item.note).join(" "),
        strings,
    };
}

function isStandardGuitarTuning(state) {
    return !state || !Array.isArray(state.strings) || state.strings.every((item) => Number(item.semitones || 0) === 0);
}

function syncGuitarTuningHidden() {
    const hidden = document.getElementById("guitar_tuning");
    const toggleText = document.getElementById("guitar-tuning-toggle-text");
    if (!hidden || !guitarTuningState) return;

    guitarTuningState.label = isStandardGuitarTuning(guitarTuningState)
        ? "כיוון סטנדרטי"
        : guitarTuningState.strings.map((item) => item.note).join(" ");

    hidden.value = JSON.stringify(guitarTuningState);
    if (toggleText) toggleText.textContent = guitarTuningState.label;
}

function renderGuitarTuningStrings() {
    const container = document.getElementById("guitar-tuning-strings");
    if (!container || !guitarTuningState) return;

    container.innerHTML = "";

    guitarTuningState.strings.forEach((stringState, index) => {
        const row = document.createElement("div");
        row.className = "guitar-tuning-row";

        const options = [];
        for (let semitones = -12; semitones <= 12; semitones += 1) {
            const selected = semitones === stringState.semitones ? "selected" : "";
            options.push(`<option value="${semitones}" ${selected}>${noteNameForString(STANDARD_GUITAR_TUNING[index], semitones)} - ${semitoneText(semitones)}</option>`);
        }

        row.innerHTML = `
            <div class="guitar-tuning-string-label">
                <strong>${stringState.label || STANDARD_GUITAR_TUNING[index].label}</strong>
                <span>סטנדרטי: ${stringState.standard}</span>
            </div>
            <div class="guitar-tuning-controls">
                <button type="button" class="guitar-tuning-step" data-tuning-index="${index}" data-tuning-delta="-1" aria-label="הורד חצי טון">−</button>
                <span class="guitar-tuning-note">${stringState.note}</span>
                <button type="button" class="guitar-tuning-step" data-tuning-index="${index}" data-tuning-delta="1" aria-label="העלה חצי טון">+</button>
                <select class="guitar-tuning-select" data-tuning-index="${index}" aria-label="בחר כיוון למיתר">
                    ${options.join("")}
                </select>
            </div>
        `;

        container.appendChild(row);
    });

    container.querySelectorAll(".guitar-tuning-step").forEach((button) => {
        button.addEventListener("click", () => {
            const index = parseInt(button.getAttribute("data-tuning-index"), 10);
            const delta = parseInt(button.getAttribute("data-tuning-delta"), 10);
            const current = guitarTuningState.strings[index];
            current.semitones = Math.max(-12, Math.min(12, current.semitones + delta));
            current.note = noteNameForString(STANDARD_GUITAR_TUNING[index], current.semitones);
            renderGuitarTuningStrings();
            syncGuitarTuningHidden();
            saveFormData();
        });
    });

    container.querySelectorAll(".guitar-tuning-select").forEach((select) => {
        select.addEventListener("change", () => {
            const index = parseInt(select.getAttribute("data-tuning-index"), 10);
            const current = guitarTuningState.strings[index];
            current.semitones = parseInt(select.value, 10) || 0;
            current.note = noteNameForString(STANDARD_GUITAR_TUNING[index], current.semitones);
            renderGuitarTuningStrings();
            syncGuitarTuningHidden();
            saveFormData();
        });
    });
}

function setGuitarTuningValue(raw) {
    guitarTuningState = normalizeGuitarTuning(raw);
    renderGuitarTuningStrings();
    syncGuitarTuningHidden();
}

function getGuitarTuningValue() {
    if (!guitarTuningState) {
        setGuitarTuningValue(document.getElementById("guitar_tuning") ? document.getElementById("guitar_tuning").value : "");
    }
    return guitarTuningState || getStandardGuitarTuningState();
}

function initializeGuitarTuningPicker() {
    const hidden = document.getElementById("guitar_tuning");
    const toggle = document.getElementById("guitar-tuning-toggle");
    const panel = document.getElementById("guitar-tuning-panel");
    const reset = document.getElementById("guitar-tuning-reset");
    if (!hidden || !toggle || !panel) return;

    setGuitarTuningValue(hidden.value);

    toggle.addEventListener("click", () => {
        const isOpen = !panel.hidden;
        panel.hidden = isOpen;
        toggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setGuitarTuningValue("");
            saveFormData();
        });
    }
}

// ===== FORM DATA MANAGEMENT =====

// שמירת נתוני הטופס
function saveFormData() {
    const mode = detectFormMode();

    // ודא שהז'אנרים נשמרים נכון - השתמש בפונקציה שמחזירה את המערך
    const genresToSave = window.getSelectedGenres ? window.getSelectedGenres() : selectedGenres;

    const formData = {
        title: document.getElementById("title").value,
        artist: getArtistDisplayValue(),
        artists: JSON.stringify(getArtistsForSaving()),
        language: document.getElementById("language") ? document.getElementById("language").value : "",
        genres: JSON.stringify(genresToSave),
        key: document.getElementById("key").value,
        key_type: document.getElementById("key_type").value,
        secondary_key: document.getElementById("secondary_key") ? document.getElementById("secondary_key").value : "",
        secondary_key_type: document.getElementById("secondary_key_type") ? document.getElementById("secondary_key_type").value : "",
        guitar_tuning: getGuitarTuningValue(),
        accompaniment_level: document.getElementById("accompaniment_level")
            ? document.getElementById("accompaniment_level").value
            : "",
        lead_level: document.getElementById("lead_level") ? document.getElementById("lead_level").value : "",
        time_signature: document.getElementById("time_signature").value,
        bpm: document.getElementById("bpm").value,
        video_url: document.getElementById("video_url").value,
        tutorial_video_url: document.getElementById("tutorial_video_url") ? document.getElementById("tutorial_video_url").value : "",
        song_version: document.getElementById("song_version") ? document.getElementById("song_version").value : "",
        original_artist: document.getElementById("original_artist") ? document.getElementById("original_artist").value : "",
        teacher_notes: document.getElementById("teacher_notes") ? document.getElementById("teacher_notes").value : "",
        student_notes: document.getElementById("student_notes") ? document.getElementById("student_notes").value : "",
        note_tags: document.getElementById("note_tags") ? document.getElementById("note_tags").value : "",
        easy_capo_fret: document.getElementById("easy_capo_fret") ? document.getElementById("easy_capo_fret").value : "0",
        play_method: document.getElementById("play_method") ? document.getElementById("play_method").value : PLAY_METHODS.BOXES,
        tabs_text: getPlayMethodTextValue("tabs_text"),
        chords_lyrics_text: getPlayMethodTextValue("chords_lyrics_text"),
        lyrics_text: getPlayMethodTextValue("lyrics_text")
    };

    const storageKey = mode.isEditMode ? "editSongData" : "songData";
    localStorage.setItem(storageKey, JSON.stringify(formData));

    console.log("💾 נתוני טופס נשמרו:", { mode: mode.isEditMode ? "edit" : "add", formData, genres: genresToSave });
}

// טעינת נתוני טופס
function loadFormData() {
    const mode = detectFormMode();
    const storageKey = mode.isEditMode ? "editSongData" : "songData";
    const savedData = JSON.parse(localStorage.getItem(storageKey) || "{}");

    console.log("📄 טוען נתוני טופס:", { mode: mode.isEditMode ? "edit" : "add", savedData });

    for (const key in savedData) {
        const element = document.getElementById(key);
        if (element) {
            if (key === 'genres') {
                // טען ז'אנרים - חשוב מאוד לתקן את הבאג כאן
                try {
                    let genres;
                    // נסה לפרסר כ-JSON string
                    if (typeof savedData[key] === 'string') {
                        genres = JSON.parse(savedData[key]);
                    } else if (Array.isArray(savedData[key])) {
                        genres = savedData[key];
                    } else {
                        genres = [];
                    }
                    
                    console.log("🎭 טוען ז'אנרים שמורים:", genres, "סוג:", typeof genres, "אורך:", Array.isArray(genres) ? genres.length : 'לא מערך');
                    
                    if (Array.isArray(genres) && genres.length > 0) {
                        // נחכה קצת אם loadGenres עדיין לא מוכן
                        const loadGenresWithRetry = (retries = 5) => {
                            if (window.loadGenres) {
                                window.loadGenres(genres);
                                console.log("✅ ז'אנרים נטענו בהצלחה:", genres);
                            } else if (retries > 0) {
                                console.log("⏳ ממתין ל-loadGenres... נותרו", retries, "ניסיונות");
                                setTimeout(() => loadGenresWithRetry(retries - 1), 100);
                            } else {
                                console.error("❌ loadGenres לא זמין אחרי כל הניסיונות");
                            }
                        };
                        loadGenresWithRetry();
                    } else {
                        console.log("⚠️ אין ז'אנרים שמורים או מערך ריק");
                    }
                } catch (e) {
                    console.error("❌ שגיאה בטעינת ז'אנרים:", e, savedData[key]);
                    // נסה לטעון כמערך ישיר אם זה לא JSON
                    if (Array.isArray(savedData[key]) && savedData[key].length > 0) {
                        if (window.loadGenres) {
                            window.loadGenres(savedData[key]);
                        } else {
                            // נחכה קצת
                            setTimeout(() => {
                                if (window.loadGenres) {
                                    window.loadGenres(savedData[key]);
                                }
                            }, 200);
                        }
                    }
                }
            } else if (key === 'guitar_tuning') {
                setGuitarTuningValue(savedData[key]);
            } else if (key === 'artists') {
                try {
                    const artists = typeof savedData[key] === 'string' ? JSON.parse(savedData[key]) : savedData[key];
                    if (window.loadArtists) window.loadArtists(artists);
                } catch (e) {
                    if (window.loadArtists) window.loadArtists([]);
                }
            } else if (key === 'teacher_notes' || key === 'student_notes' || key === 'tabs_text' || key === 'chords_lyrics_text' || key === 'lyrics_text') {
                // textarea fields
                if (savedData[key] !== undefined && savedData[key] !== null) {
                    element.value = savedData[key];
                }
            } else {
                // שדות רגילים
                if (savedData[key] !== undefined && savedData[key] !== null && savedData[key] !== "") {
                    element.value = savedData[key];
                    validateField(key, savedData[key]);
                }
            }
        }
    }

    // Restore play method view after saved data loaded (in case of refresh/return)
    if (savedData.play_method) {
        setTimeout(() => {
            setActivePlayMethod(savedData.play_method);
        }, 0);
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
            isValid = (value || getArtistDisplayValue()).trim().length >= 2;
            message = isValid ? '✅ אמנים נבחרו!' : '❌ יש להוסיף לפחות אמן אחד';
            break;
        case 'genre':
            // עבור ז'אנרים - השתמש בפונקציית validateGenres
            if (window.validateGenres) {
                return window.validateGenres();
            }
            isValid = selectedGenres.length > 0;
            message = isValid ? '✅ ז\'אנרים נבחרו!' : '❌ יש לבחור לפחות ז\'אנר אחד';
            break;
        case 'accompaniment_level':
        case 'lead_level': {
            const nv = parseInt(value, 10);
            isValid = !Number.isNaN(nv) && nv >= 0 && nv <= 10;
            message = isValid ? '✅ נבחר!' : '❌ יש לבחור רמה בין 0 ל-10';
            break;
        }
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
    if (field.type !== 'hidden') {
        field.className = field.className.replace(/ (error|success)/g, '') + (isValid ? ' success' : ' error');
    }

    return isValid;
}

// הגדרת validation בזמן אמת
function setupValidation() {
    const fields = ['title', 'artist', 'key', 'key_type', 'time_signature', 'bpm', 'video_url'];

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
    setGuitarTuningValue("");
    if (window.clearArtists) {
        window.clearArtists();
    }

    const accH = document.getElementById("accompaniment_level");
    const leadH = document.getElementById("lead_level");
    if (accH) accH.value = "1";
    if (leadH) leadH.value = "0";
    syncAllLevelPickersFromHidden();

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

// ===== PLAY METHODS (WAYS TO PLAY) - BASIC UI ONLY =====

const PLAY_METHODS = {
    BOXES: "boxes",
    TABS: "tabs",
    CHORDS_LYRICS: "chords_lyrics",
    LYRICS: "lyrics",
};

function syncPlayMethodHiddenTextareasFromLocalStorage() {
    // When returning from /add-tabs, /add-chords-lyrics, /add-lyrics we persist content in localStorage.
    // In edit/add song forms we also keep hidden <textarea> fields. If those exist, they can override
    // localStorage values during submit, causing users to "save" old content.
    const types = ["tabs_text", "chords_lyrics_text", "lyrics_text"];
    types.forEach((type) => {
        const el = document.getElementById(type);
        if (!el) return;
        try {
            const fromLS = localStorage.getItem(getPlayMethodTextsStorageKey(type));
            if (typeof fromLS === "string") {
                el.value = fromLS;
            }
        } catch (e) {
            // ignore
        }
    });
}

function hydratePlayMethodDraftsFromPage() {
    const types = ["tabs_text", "chords_lyrics_text", "lyrics_text"];
    types.forEach((type) => {
        const el = document.getElementById(type);
        if (!el) return;
        const key = getPlayMethodTextsStorageKey(type);
        const dirtyKey = `${key}_dirty`;
        try {
            const isDirty = localStorage.getItem(dirtyKey) === "true";
            if (!isDirty) {
                localStorage.setItem(key, el.value || "");
            }
        } catch (e) {
            // ignore
        }
    });
}

function getPlayMethodTextValue(type) {
    const el = document.getElementById(type);
    try {
        const v = localStorage.getItem(getPlayMethodTextsStorageKey(type));
        // Prefer localStorage: it reflects the latest state of the dedicated editors.
        if (v !== null && v !== undefined) return v;
    } catch (e) {
        // ignore
    }
    if (el) return el.value || "";
    return "";
}

function getPlayMethodStorageKey() {
    const mode = detectFormMode();
    return mode.isEditMode ? `play_method_edit_${mode.songId}` : "play_method_new";
}

function getPlayMethodTextsStorageKey(type) {
    const mode = detectFormMode();
    const suffix = mode.isEditMode ? `edit_${mode.songId}` : "new";
    return `play_method_${type}_${suffix}`;
}

function setActivePlayMethod(method) {
    const playMethodHidden = document.getElementById("play_method");
    if (playMethodHidden) playMethodHidden.value = method;
    try {
        localStorage.setItem(getPlayMethodStorageKey(), method);
    } catch (e) { /* ignore */ }

    document.querySelectorAll(".play-method-btn").forEach((btn) => {
        const isActive = btn.getAttribute("data-play-method") === method;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    document.querySelectorAll("[data-play-method-panel]").forEach((panel) => {
        const panelMethod = panel.getAttribute("data-play-method-panel");
        const show = panelMethod === method;
        panel.hidden = !show;
    });
}

function bindPlayMethodsUI() {
    const bar = document.querySelector(".play-methods-bar");
    if (!bar) return; // Not present on this page

    const buttons = Array.from(document.querySelectorAll(".play-method-btn"));
    if (buttons.length === 0) return;

    // Text values are edited in dedicated pages and stored in localStorage.

    buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const method = btn.getAttribute("data-play-method") || PLAY_METHODS.BOXES;
            setActivePlayMethod(method);
            saveFormData();
        });
    });

    document.querySelectorAll('a[href^="/add-tabs"], a[href^="/add-chords-lyrics"], a[href^="/add-lyrics"]').forEach((link) => {
        link.addEventListener("click", () => {
            try {
                localStorage.setItem("returningFromPlayMethodEditor", "true");
            } catch (e) { /* ignore */ }
            saveFormData();
        });
    });

    // Initial selection (default: boxes)
    let method = PLAY_METHODS.BOXES;
    try {
        method = localStorage.getItem(getPlayMethodStorageKey()) || method;
    } catch (e) { /* ignore */ }
    if (!Object.values(PLAY_METHODS).includes(method)) method = PLAY_METHODS.BOXES;
    setActivePlayMethod(method);
}

// ===== FORM SUBMISSION =====

function handleFormSubmission(event) {
    event.preventDefault();

    const mode = detectFormMode();
    const submitBtn = document.querySelector('.submit-btn');

    console.log("📝 שליחת טופס:", { mode: mode.isEditMode ? "edit" : "add", songId: mode.songId });

    addButtonLoading(submitBtn);

    // Ensure play-method textareas reflect latest editor data.
    syncPlayMethodHiddenTextareasFromLocalStorage();

    // אימות כל השדות
    const fields = ['title', 'artist', 'key', 'key_type', 'accompaniment_level', 'lead_level', 'time_signature', 'bpm', 'video_url'];
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
        artist: getArtistDisplayValue(),
        artists: getArtistsForSaving(),
        genres: selectedGenres, // שלח כמערך
        language: document.getElementById("language") ? document.getElementById("language").value : "",
        key: document.getElementById("key").value,
        key_type: document.getElementById("key_type").value,
        secondary_key: document.getElementById("secondary_key") ? document.getElementById("secondary_key").value : "",
        secondary_key_type: document.getElementById("secondary_key_type") ? document.getElementById("secondary_key_type").value : "",
        guitar_tuning: getGuitarTuningValue(),
        accompaniment_level: parseInt(document.getElementById("accompaniment_level").value, 10),
        lead_level: parseInt(document.getElementById("lead_level").value, 10),
        time_signature: document.getElementById("time_signature").value,
        bpm: parseInt(document.getElementById("bpm").value),
        video_url: document.getElementById("video_url").value,
        tutorial_video_url: document.getElementById("tutorial_video_url") ? document.getElementById("tutorial_video_url").value : "",
        song_version: document.getElementById("song_version") ? document.getElementById("song_version").value : "",
        original_artist: document.getElementById("original_artist") ? document.getElementById("original_artist").value : "",
        teacher_notes: document.getElementById("teacher_notes") ? document.getElementById("teacher_notes").value : "",
        student_notes: document.getElementById("student_notes") ? document.getElementById("student_notes").value : "",
        note_tags: (document.getElementById("note_tags") ? document.getElementById("note_tags").value : "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean),
        easy_capo_fret: parseInt(document.getElementById("easy_capo_fret") ? document.getElementById("easy_capo_fret").value : "0", 10) || 0,
        // Play methods (optional)
        play_method: document.getElementById("play_method") ? document.getElementById("play_method").value : PLAY_METHODS.BOXES,
        tabs_text: getPlayMethodTextValue("tabs_text"),
        chords_lyrics_text: getPlayMethodTextValue("chords_lyrics_text"),
        lyrics_text: getPlayMethodTextValue("lyrics_text")
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

    // טיפול בקישורי YouTube לסרטון הדרכה
    if (formData.tutorial_video_url) {
        if (mode.isEditMode && formData.tutorial_video_url.includes('/embed/')) {
            // אל תשנה קישורי embed קיימים
        } else {
            const tutorialYtMatch = formData.tutorial_video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
            if (tutorialYtMatch && tutorialYtMatch[1]) {
                formData.tutorial_video_url = "https://www.youtube.com/embed/" + tutorialYtMatch[1];
            }
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

            // שיר חדש: אם יש סרטוני הדרכה בתור, נעלה אותם לפני המעבר ונעבור לעמוד השיר
            if (!mode.isEditMode && data.song_id && window.hasPendingTutorialVideos && window.hasPendingTutorialVideos()) {
                showMessage("⬆️ מעלה את סרטוני ההדרכה...", "success");
                window.uploadPendingTutorialVideos(data.song_id)
                    .catch(err => console.error("שגיאה בהעלאת סרטוני הדרכה:", err))
                    .finally(() => {
                        setTimeout(() => {
                            window.location.href = `/play/${data.song_id}`;
                        }, 800);
                    });
                return;
            }

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
    const mode = detectFormMode();
    localStorage.removeItem("chords");
    localStorage.removeItem("loops");
    localStorage.removeItem("songData");
    localStorage.removeItem("editSongData");
    localStorage.removeItem("justReturnedFromChords");
    localStorage.removeItem("addingNewSong");
    localStorage.removeItem("editingSongId");
    localStorage.removeItem("song_structure");
    localStorage.removeItem("pending_sync");
    localStorage.removeItem("returningFromPlayMethodEditor");
    ["tabs_text", "chords_lyrics_text", "lyrics_text"].forEach((type) => {
        const suffix = mode.isEditMode ? `edit_${mode.songId}` : "new";
        localStorage.removeItem(`play_method_${type}_${suffix}`);
        localStorage.removeItem(`play_method_${type}_${suffix}_dirty`);
    });
    localStorage.removeItem(mode.isEditMode ? `play_method_edit_${mode.songId}` : "play_method_new");
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

    bindLevelPickersOnce();
    syncAllLevelPickersFromHidden();

    // אתחול מערכת ריבוי ז'אנרים
    initializeMultiGenre();
    initializeMultiArtists();

    // אתחול בחירת כיוון גיטרה
    initializeGuitarTuningPicker();

    if (mode.isEditMode && window.existingArtistsForEdit && window.loadArtists) {
        window.loadArtists(window.existingArtistsForEdit);
    }

    // בעריכת שיר: טעינת ז'אנרים מהשרת (מהטמפלייט) אחרי ש-loadGenres זמין
    if (mode.isEditMode && window.existingGenresForEdit) {
        let genresToLoad = window.existingGenresForEdit;
        if (typeof genresToLoad === 'string') {
            try { genresToLoad = JSON.parse(genresToLoad); } catch (e) { genresToLoad = [genresToLoad]; }
        }
        window.existingGenresForEdit = null; // נקה אחרי שימוש
        if (Array.isArray(genresToLoad) && genresToLoad.length > 0 && window.loadGenres) {
            window.loadGenres(genresToLoad);
        }
    }

    // אתחול לפי מצב
    if (mode.isEditMode) {
        // מצב עריכת שיר קיים
        initializeEditSong(mode.songId);

        // אימות שדות קיימים
        const fields = ['title', 'artist', 'key', 'key_type', 'accompaniment_level', 'lead_level', 'time_signature', 'bpm', 'video_url'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value !== undefined && field.value !== null && field.value !== '') {
                validateField(fieldId, field.value);
            }
        });
        syncAllLevelPickersFromHidden();
    } else {
        // מצב הוספת שיר חדש
        const justReturned = localStorage.getItem("justReturnedFromChords");
        const returningFromPlayMethodEditor = localStorage.getItem("returningFromPlayMethodEditor");
        const hasNewSongDraft =
            localStorage.getItem("songData") ||
            localStorage.getItem("chords") ||
            localStorage.getItem("loops");
        if (!justReturned && !returningFromPlayMethodEditor && !hasNewSongDraft) {
            cleanStartNewSong();
        }
        localStorage.removeItem("returningFromPlayMethodEditor");
        initializeNewSong();
    }

    // טעינת נתונים קיימים (אם חזרנו מאקורדים או אם יש נתונים שמורים)
    // נשתמש ב-setTimeout כדי לוודא ש-initializeMultiGenre סיים להגדיר את window.loadGenres
    const justReturnedFromChords = localStorage.getItem("justReturnedFromChords");
    const storageKey = mode.isEditMode ? "editSongData" : "songData";
    const hasSavedData = localStorage.getItem(storageKey);
    
    if (justReturnedFromChords === "true" || (hasSavedData && !mode.isEditMode)) {
        // נחכה קצת כדי לוודא ש-initializeMultiGenre סיים
        setTimeout(() => {
            loadFormData();
            syncAllLevelPickersFromHidden();
        }, 150);
    }

    // בדיקה וטיפול בחזרה מאקורדים
    checkForReturnedChords();

    // עדכון כפתור האקורדים
    updateChordsButton();

    // אתחול סרגל "דרכי נגינה" (שימוש בסיסי: החלפת תצוגה ושמירה מקומית)
    hydratePlayMethodDraftsFromPage();
    bindPlayMethodsUI();

    // Hydrate hidden fields from localStorage for play methods (important after returning from editors).
    syncPlayMethodHiddenTextareasFromLocalStorage();

    // בדיקה נוספת - אם יש ז'אנרים שמורים אבל לא נטענו, ננסה לטעון אותם שוב
    setTimeout(() => {
        const storageKey = mode.isEditMode ? "editSongData" : "songData";
        const savedData = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (savedData.genres) {
            const currentGenres = window.getSelectedGenres ? window.getSelectedGenres() : [];
            try {
                const savedGenres = typeof savedData.genres === 'string' 
                    ? JSON.parse(savedData.genres) 
                    : savedData.genres;
                
                if (Array.isArray(savedGenres) && savedGenres.length > 0) {
                    const genresMatch = currentGenres.length === savedGenres.length && 
                                     currentGenres.every(g => savedGenres.includes(g));
                    
                    if (!genresMatch && window.loadGenres) {
                        console.log("🔄 ז'אנרים לא תואמים - טוען מחדש:", savedGenres);
                        window.loadGenres(savedGenres);
                    }
                }
            } catch (e) {
                console.error("❌ שגיאה בבדיקת ז'אנרים:", e);
            }
        }
    }, 500);

    // auto-save בשינוי שדות
    const fields = ['title', 'artist', 'language', 'key', 'key_type', 'secondary_key', 'secondary_key_type', 'guitar_tuning', 'accompaniment_level', 'lead_level', 'time_signature', 'bpm', 'video_url', 'tutorial_video_url', 'song_version', 'original_artist', 'teacher_notes', 'student_notes', 'note_tags', 'easy_capo_fret'];
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.addEventListener("input", saveFormData);
            el.addEventListener("change", saveFormData);
        }
    });

    const selectedArtistsContainer = document.getElementById("selected-artists");
    if (selectedArtistsContainer) {
        const observer = new MutationObserver(() => {
            saveFormData();
        });
        observer.observe(selectedArtistsContainer, { childList: true, subtree: true });
    }

    // שמירה אוטומטית גם כשמוסיפים/מוחקים ז'אנרים
    const addGenreBtn = document.getElementById("add-genre-btn");
    if (addGenreBtn) {
        // נשמור אחרי כל שינוי בז'אנרים
        const originalAddGenre = addGenreBtn.onclick;
        const genreSelect = document.getElementById("genre");
        if (genreSelect) {
            // נשמור כשמוסיפים ז'אנר
            const selectedGenresContainer = document.getElementById("selected-genres");
            if (selectedGenresContainer) {
                // נשתמש ב-MutationObserver כדי לזהות שינויים בז'אנרים
                const observer = new MutationObserver(() => {
                    saveFormData();
                });
                observer.observe(selectedGenresContainer, { childList: true, subtree: true });
            }
        }
    }

    // חיבור אירוע שליחת טופס
    if (mode.formElement) {
        mode.formElement.addEventListener("submit", handleFormSubmission);
    } else {
        console.error("❌ טופס לא נמצא!");
    }

    console.log("✅ אתחול מנהל הטפסים הושלם בהצלחה");
});
