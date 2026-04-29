// Songs List Page JavaScript - Enhanced Functionality

let allSongs = [];
let filteredSongs = [];
let currentSort = 'recent';
let currentFilters = {
    search: '',
    language: '',
    genre: '',
    bpmRange: '',
    accLevel: '',
    soloLevel: ''
};

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        initializePage();
        setupEventListeners();
    }, 100);
});

function initializePage() {
    // Store all songs data for filtering and sorting
    const songRows = document.querySelectorAll('.song-row');
    allSongs = Array.from(songRows).map(row => {
        const titleEl = row.querySelector('.song-title');
        const artistEl = row.querySelector('.song-artist');
        return {
            element: row,
            title: titleEl ? titleEl.textContent.trim().toLowerCase() : '',
            artist: artistEl ? artistEl.textContent.trim().toLowerCase() : '',
            accompanimentLevel: parseInt(row.dataset.accompanimentLevel, 10) || 0,
            leadLevel: parseInt(row.dataset.leadLevel, 10) || 0,
            bpm: parseInt(row.dataset.bpm) || 0,
            key: row.dataset.key || '',
            timeSignature: row.dataset.timeSignature || '',
            genres: row.dataset.genres || '',
            language: (row.dataset.language || '').toLowerCase(),
            albumImageUrl: row.dataset.albumImageUrl || '',
            createdAt: row.dataset.createdAt || '',
            inMyList: row.dataset.inMyList === 'true',
            watched: row.dataset.watched === 'true',
            avgRating: parseFloat(row.dataset.avgRating) || 0
        };
    });
    filteredSongs = [...allSongs];
    
    // Update count with actual songs count
    updateSongCount();
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            currentFilters.language = (languageSelect.value || '').toLowerCase();
            applyAllFiltersAndSort();
        });
    }

    const genreSelect = document.getElementById('genre-select');
    if (genreSelect) {
        genreSelect.addEventListener('change', () => {
            currentFilters.genre = genreSelect.value || '';
            applyAllFiltersAndSort();
        });
    }

    const bpmRangeSelect = document.getElementById('bpm-range-select');
    if (bpmRangeSelect) {
        bpmRangeSelect.addEventListener('change', () => {
            currentFilters.bpmRange = bpmRangeSelect.value || '';
            applyAllFiltersAndSort();
        });
    }

    const accLevelSelect = document.getElementById('acc-level-select');
    if (accLevelSelect) {
        accLevelSelect.addEventListener('change', () => {
            currentFilters.accLevel = accLevelSelect.value || '';
            applyAllFiltersAndSort();
        });
    }

    const soloLevelSelect = document.getElementById('solo-level-select');
    if (soloLevelSelect) {
        soloLevelSelect.addEventListener('change', () => {
            currentFilters.soloLevel = soloLevelSelect.value || '';
            applyAllFiltersAndSort();
        });
    }

    // Sort functionality
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }

    // Add smooth animations to song cards
    animateCards();

    // Album image upload (creator/admin only buttons exist)
    document.body.addEventListener('change', (e) => {
        const input = e.target && e.target.classList && e.target.classList.contains('js-album-image-input') ? e.target : null;
        if (!input) return;
        const songId = input.dataset.songId;
        const file = input.files && input.files[0];
        if (!songId || !file) return;
        uploadAlbumImage(songId, file, input);
    });
}

function handleSearch(event) {
    currentFilters.search = (event.target.value || '').toLowerCase().trim();
    applyAllFiltersAndSort();
}

function handleSort(event) {
    currentSort = event.target.value;
    applyAllFiltersAndSort();
}

function applyAllFiltersAndSort() {
    filteredSongs = allSongs.filter(song => {
        // search
        if (currentFilters.search) {
            const term = currentFilters.search;
            const genresText = (song.genres || '').toLowerCase();
            if (!(song.title.includes(term) || song.artist.includes(term) || genresText.includes(term))) {
                return false;
            }
        }

        // language
        if (currentFilters.language) {
            if ((song.language || '') !== currentFilters.language) return false;
        }

        // genre (match within comma list)
        if (currentFilters.genre) {
            const parts = (song.genres || '').split(',').map(s => s.trim());
            if (!parts.includes(currentFilters.genre)) return false;
        }

        // BPM range
        if (currentFilters.bpmRange) {
            const m = currentFilters.bpmRange.match(/^(\d+)\-(\d+)$/);
            if (m) {
                const min = parseInt(m[1], 10);
                const max = parseInt(m[2], 10);
                if (!(song.bpm >= min && song.bpm <= max)) return false;
            }
        }

        // exact levels
        if (currentFilters.accLevel !== '') {
            const n = parseInt(currentFilters.accLevel, 10);
            if (!Number.isNaN(n) && song.accompanimentLevel !== n) return false;
        }
        if (currentFilters.soloLevel !== '') {
            const n = parseInt(currentFilters.soloLevel, 10);
            if (!Number.isNaN(n) && song.leadLevel !== n) return false;
        }

        return true;
    });

    filteredSongs.sort((a, b) => {
        switch(currentSort) {
            case 'alphabetical':
            case 'title':
                return a.title.localeCompare(b.title, 'he');
            case 'recent':
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            case 'rating':
                return (b.avgRating || 0) - (a.avgRating || 0);
            case 'watched':
                if (a.watched !== b.watched) return a.watched ? -1 : 1;
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            case 'my_list':
                if (a.inMyList !== b.inMyList) return a.inMyList ? -1 : 1;
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            case 'personalized': {
                const score = (s) => (s.inMyList ? 3 : 0) + (s.watched ? 2 : 0) + (s.avgRating || 0) * 0.5;
                return score(b) - score(a);
            }
            case 'artist':
                return a.artist.localeCompare(b.artist, 'he');
            case 'accompaniment':
                return a.accompanimentLevel - b.accompanimentLevel;
            case 'lead':
                return a.leadLevel - b.leadLevel;
            case 'bpm':
                return a.bpm - b.bpm;
            case 'genres': {
                const aGenre = a.genres.split(',')[0] || '';
                const bGenre = b.genres.split(',')[0] || '';
                return aGenre.localeCompare(bGenre, 'he');
            }
            default:
                return 0;
        }
    });

    displayFilteredSongs();
}

function displayFilteredSongs() {
    const songsList = document.querySelector('.songs-list');
    if (!songsList) return;

    // Hide all songs first
    allSongs.forEach(song => {
        song.element.style.display = 'none';
    });

    // Show filtered songs and reorder them
    filteredSongs.forEach((song) => {
        song.element.style.display = 'flex';
        songsList.appendChild(song.element);
    });
    
    updateSongCount();
}

async function uploadAlbumImage(songId, file, inputEl) {
    try {
        inputEl.disabled = true;
        const fd = new FormData();
        fd.append('image_file', file);

        const resp = await fetch(`/api/songs/${songId}/album-image`, { method: 'POST', body: fd });
        const data = await resp.json();
        if (!data || !data.success) {
            throw new Error((data && data.error) || 'שגיאה בהעלאת תמונה');
        }

        const card = document.getElementById(`song-${songId}`);
        if (card) {
            const img = card.querySelector('.song-cover img');
            const ph = card.querySelector('.song-cover-placeholder');
            if (img) {
                img.src = data.album_image_url;
            } else {
                if (ph) ph.remove();
                const newImg = document.createElement('img');
                newImg.src = data.album_image_url;
                newImg.alt = 'תמונת אלבום';
                newImg.loading = 'lazy';
                const cover = card.querySelector('.song-cover');
                if (cover) cover.prepend(newImg);
            }
            card.dataset.albumImageUrl = data.album_image_url;
        }

        showNotification('התמונה עודכנה בהצלחה', 'success');
    } catch (e) {
        console.error(e);
        showNotification('שגיאה בהעלאת תמונה', 'error');
    } finally {
        inputEl.disabled = false;
        inputEl.value = '';
    }
}

function updateSongCount() {
    const countElement = document.querySelector('.count-number');
    if (countElement) {
        countElement.textContent = filteredSongs.length;

        // Add bounce animation
        countElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 200);
    }
}

function animateCards() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.song-row').forEach(row => {
        observer.observe(row);
    });
}

// Delete song functionality
async function deleteSong(songId, songTitle) {
    // Show confirmation modal
    if (!await showConfirmationModal('מחיקת שיר', `האם אתה בטוח שברצונך למחוק את השיר "${songTitle}"?`)) {
        return;
    }

    const songCard = document.getElementById(`song-${songId}`);
    if (!songCard) return;

    try {
        // Add loading state
        songCard.classList.add('loading');

        const response = await fetch(`/api/delete_song/${songId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.message) {
            // Animate card removal
            songCard.style.transform = 'scale(0.8)';
            songCard.style.opacity = '0';

            setTimeout(() => {
                songCard.remove();
                // Update arrays
                allSongs = allSongs.filter(song => song.element !== songCard);
                filteredSongs = filteredSongs.filter(song => song.element !== songCard);
                updateSongCount();
            }, 300);

            showNotification('השיר נמחק בהצלחה', 'success');
        } else {
            throw new Error(data.error || 'שגיאה במחיקת השיר');
        }
    } catch (error) {
        console.error('Delete error:', error);
        songCard.classList.remove('loading');
        showNotification('שגיאה במחיקת השיר', 'error');
    }
}

// My Songs functionality
async function toggleMySong(songId, element) {
    if (!element) return;

    element.classList.add('loading');

    try {
        // Check current status
        const isInMyList = element.classList.contains('added');
        const url = isInMyList ?
            `/api/my-songs/remove/${songId}` :
            `/api/my-songs/add/${songId}`;

        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            updateMySongButton(element, !isInMyList);
            const action = isInMyList ? 'הוסר מ' : 'נוסף ל';
            showNotification(`השיר ${action}השירים שלך`, 'success');
        } else {
            throw new Error(data.error || 'שגיאה בעדכון הרשימה');
        }
    } catch (error) {
        console.error('Error toggling my song:', error);
        showNotification('שגיאה בעדכון הרשימה', 'error');
    } finally {
        element.classList.remove('loading');
    }
}

// Shared song lists picker (for teachers/students collaboration lists)
let accessibleSongLists = null;

async function initializeSongListsPickers() {
    const selects = document.querySelectorAll('.song-list-select');
    if (!selects || selects.length === 0) return;

    try {
        const resp = await fetch('/api/song-lists/accessible');
        const data = await resp.json();
        if (!data || !data.success) throw new Error((data && data.error) || 'failed');
        accessibleSongLists = Array.isArray(data.lists) ? data.lists : [];
    } catch (e) {
        accessibleSongLists = [];
    }

    selects.forEach((sel) => {
        sel.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = accessibleSongLists.length ? 'בחר רשימה…' : 'אין רשימות זמינות';
        sel.appendChild(placeholder);
        sel.disabled = accessibleSongLists.length === 0;

        accessibleSongLists.forEach((l) => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.name || 'רשימה';
            sel.appendChild(opt);
        });
    });
}

async function addSongToSelectedList(songId, btnEl) {
    const root = btnEl ? btnEl.closest('.song-row') : document.getElementById(`song-${songId}`);
    const sel = root ? root.querySelector('.song-list-select') : null;
    const listId = sel ? (sel.value || '') : '';
    if (!listId) {
        showNotification('בחר רשימה לפני הוספה', 'error');
        return;
    }

    if (btnEl) btnEl.classList.add('loading');
    try {
        const resp = await fetch(`/api/song-lists/${encodeURIComponent(listId)}/items/add/${encodeURIComponent(songId)}`, { method: 'POST' });
        const data = await resp.json();
        if (data && data.success) {
            showNotification('השיר נוסף לרשימה', 'success');
        } else {
            showNotification((data && data.error) || 'שגיאה בהוספה', 'error');
        }
    } catch (e) {
        showNotification('שגיאה בחיבור לשרת', 'error');
    } finally {
        if (btnEl) btnEl.classList.remove('loading');
    }
}

function updateMySongButton(button, isInMyList) {
    const icon = button.querySelector('.icon');
    const text = button.querySelector('.text');

    if (isInMyList) {
        button.classList.add('added');
        if (icon) icon.textContent = '💚';
        if (text) text.textContent = 'בשירים שלי';
    } else {
        button.classList.remove('added');
        if (icon) icon.textContent = '❤️';
        if (text) text.textContent = 'הוסף לשירים שלי';
    }
}

// Initialize My Songs status for all songs
async function initializeMySongsStatus() {
    const mySongButtons = document.querySelectorAll('.my-songs-btn');

    for (const button of mySongButtons) {
        const songId = button.dataset.songId;
        if (!songId) continue;

        try {
            const response = await fetch(`/api/my-songs/check/${songId}`);
            const data = await response.json();

            updateMySongButton(button, data.inMyList);
        } catch (error) {
            console.error('Error checking my song status:', error);
        }
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        // Create modal if it doesn't exist
        let modal = document.getElementById('confirmation-modal');
        if (!modal) {
            modal = createConfirmationModal();
        }

        // Update content
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-message').textContent = message;

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Handle buttons
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        const handleConfirm = () => {
            hideModal();
            resolve(true);
        };

        const handleCancel = () => {
            hideModal();
            resolve(false);
        };

        const hideModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

function createConfirmationModal() {
    const modal = document.createElement('div');
    modal.id = 'confirmation-modal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        z-index: 1000;
        justify-content: center;
        align-items: center;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        ">
            <h3 class="modal-title" style="margin: 0 0 15px 0; color: #2c3e50;"></h3>
            <p class="modal-message" style="margin: 0 0 25px 0; color: #64748b;"></p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="confirm-btn" style="
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">אישור</button>
                <button class="cancel-btn" style="
                    background: linear-gradient(135deg, #6c757d, #545b62);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">ביטול</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function showNotification(message, type = 'info') {
    // Create notification if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = createNotification();
    }

    // Update content and style
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Show notification
    notification.style.display = 'block';
    notification.style.transform = 'translateX(-50%) translateY(-100px)';

    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);

    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

function createNotification() {
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: white;
        border-radius: 12px;
        padding: 15px 25px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: none;
        border-left: 4px solid #667eea;
    `;

    document.body.appendChild(notification);
    return notification;
}

// Add styles for different notification types
const notificationStyles = `
    .notification.success {
        border-left-color: #28a745;
        color: #155724;
        background: linear-gradient(135deg, #d4edda, #c3e6cb);
    }
    .notification.error {
        border-left-color: #dc3545;
        color: #721c24;
        background: linear-gradient(135deg, #f8d7da, #f5c6cb);
    }
    .notification.info {
        border-left-color: #667eea;
        color: #2c3e50;
        background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
    }
`;

// Add notification styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize My Songs status when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeMySongsStatus, 500);
    setTimeout(initializeSongListsPickers, 550);
});
