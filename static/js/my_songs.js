// My Songs Page JavaScript
let songToRemove = null;
let allCards = [];
let filteredCards = [];
let currentSort = 'recent';
let currentFilters = {
    search: '',
    language: '',
    genre: '',
    bpmRange: '',
    accLevel: '',
    soloLevel: ''
};

document.addEventListener('DOMContentLoaded', () => {
    initializeCards();
    bindFilters();
    initializeSongListsPickers();
});

let accessibleSongLists = null;

async function initializeSongListsPickers() {
    const selects = document.querySelectorAll('.song-list-select');
    if (!selects || selects.length === 0) return;

    try {
        const resp = await fetch('/api/song-lists/accessible');
        const data = await resp.json();
        if (!data || !data.success) {
            throw new Error((data && data.error) || 'failed');
        }
        accessibleSongLists = Array.isArray(data.lists) ? data.lists : [];
    } catch (e) {
        accessibleSongLists = [];
    }

    // Populate all selects
    selects.forEach((sel) => {
        const first = sel.querySelector('option[value=""]');
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

        // Restore placeholder if it existed
        if (first && first.selected) sel.value = '';
    });
}

async function addSongToListFromCard(songId, btnEl) {
    const card = btnEl ? btnEl.closest('.song-card') : document.querySelector(`.song-card[data-song-id="${songId}"]`);
    const sel = card ? card.querySelector('.song-list-select') : null;
    const listId = sel ? (sel.value || '') : '';
    if (!listId) {
        showMessage('בחר רשימה לפני הוספה', 'error');
        return;
    }

    if (btnEl) btnEl.classList.add('loading');
    try {
        const resp = await fetch(`/api/song-lists/${encodeURIComponent(listId)}/items/add/${encodeURIComponent(songId)}`, {
            method: 'POST'
        });
        const data = await resp.json();
        if (data && data.success) {
            showMessage('השיר נוסף לרשימה', 'success');
        } else {
            const err = (data && data.error) || 'שגיאה בהוספה';
            showMessage(err, 'error');
        }
    } catch (e) {
        showMessage('שגיאה בחיבור לשרת', 'error');
    } finally {
        if (btnEl) btnEl.classList.remove('loading');
    }
}

function initializeCards() {
    const cards = document.querySelectorAll('.song-card');
    allCards = Array.from(cards).map((el) => ({
        el,
        id: el.dataset.songId || '',
        title: (el.dataset.title || '').toLowerCase(),
        artist: (el.dataset.artist || '').toLowerCase(),
        accompanimentLevel: parseInt(el.dataset.accompanimentLevel, 10) || 0,
        soloLevel: parseInt(el.dataset.leadLevel, 10) || 0,
        bpm: parseInt(el.dataset.bpm, 10) || 0,
        genres: (el.dataset.genres || ''),
        language: (el.dataset.language || '').toLowerCase(),
        addedAt: (el.dataset.addedAt || ''),
    }));
    filteredCards = [...allCards];
    updateCount();
}

function bindFilters() {
    const search = document.getElementById('search-input');
    if (search) {
        search.addEventListener('input', debounce((e) => {
            currentFilters.search = (e.target.value || '').toLowerCase().trim();
            applyFiltersAndSort();
        }, 250));
    }

    const language = document.getElementById('language-select');
    if (language) {
        language.addEventListener('change', () => {
            currentFilters.language = (language.value || '').toLowerCase();
            applyFiltersAndSort();
        });
    }

    const genre = document.getElementById('genre-select');
    if (genre) {
        genre.addEventListener('change', () => {
            currentFilters.genre = genre.value || '';
            applyFiltersAndSort();
        });
    }

    const bpmRange = document.getElementById('bpm-range-select');
    if (bpmRange) {
        bpmRange.addEventListener('change', () => {
            currentFilters.bpmRange = bpmRange.value || '';
            applyFiltersAndSort();
        });
    }

    const acc = document.getElementById('acc-level-select');
    if (acc) {
        acc.addEventListener('change', () => {
            currentFilters.accLevel = acc.value || '';
            applyFiltersAndSort();
        });
    }

    const solo = document.getElementById('solo-level-select');
    if (solo) {
        solo.addEventListener('change', () => {
            currentFilters.soloLevel = solo.value || '';
            applyFiltersAndSort();
        });
    }

    const sort = document.getElementById('sort-select');
    if (sort) {
        sort.addEventListener('change', () => {
            currentSort = sort.value || 'recent';
            applyFiltersAndSort();
        });
    }
}

function applyFiltersAndSort() {
    filteredCards = allCards.filter((c) => {
        if (currentFilters.search) {
            const t = currentFilters.search;
            const genresText = (c.genres || '').toLowerCase();
            if (!(c.title.includes(t) || c.artist.includes(t) || genresText.includes(t))) return false;
        }
        if (currentFilters.language) {
            if ((c.language || '') !== currentFilters.language) return false;
        }
        if (currentFilters.genre) {
            const parts = (c.genres || '').split(',').map(s => s.trim());
            if (!parts.includes(currentFilters.genre)) return false;
        }
        if (currentFilters.bpmRange) {
            const m = currentFilters.bpmRange.match(/^(\d+)\-(\d+)$/);
            if (m) {
                const min = parseInt(m[1], 10);
                const max = parseInt(m[2], 10);
                if (!(c.bpm >= min && c.bpm <= max)) return false;
            }
        }
        if (currentFilters.accLevel !== '') {
            const n = parseInt(currentFilters.accLevel, 10);
            if (!Number.isNaN(n) && c.accompanimentLevel !== n) return false;
        }
        if (currentFilters.soloLevel !== '') {
            const n = parseInt(currentFilters.soloLevel, 10);
            if (!Number.isNaN(n) && c.soloLevel !== n) return false;
        }
        return true;
    });

    filteredCards.sort((a, b) => {
        switch (currentSort) {
            case 'alphabetical':
                return (a.title || '').localeCompare(b.title || '', 'he');
            case 'artist':
                return (a.artist || '').localeCompare(b.artist || '', 'he');
            case 'accompaniment':
                return a.accompanimentLevel - b.accompanimentLevel;
            case 'lead':
                return a.soloLevel - b.soloLevel;
            case 'bpm':
                return a.bpm - b.bpm;
            case 'genres': {
                const ag = (a.genres || '').split(',')[0] || '';
                const bg = (b.genres || '').split(',')[0] || '';
                return ag.localeCompare(bg, 'he');
            }
            case 'recent':
            default:
                return (b.addedAt || '').localeCompare(a.addedAt || '');
        }
    });

    renderCards();
}

function renderCards() {
    const grid = document.querySelector('.songs-grid');
    if (!grid) return;

    allCards.forEach(c => { c.el.style.display = 'none'; });
    filteredCards.forEach(c => {
        c.el.style.display = '';
        grid.appendChild(c.el);
    });
    updateCount();
}

function updateCount() {
    const count = document.querySelector('.count-number');
    if (count) count.textContent = filteredCards.length;
}

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function removeSong(songId, songTitle) {
    songToRemove = songId;
    document.getElementById('remove-text').textContent =
        `האם אתה בטוח שברצונך להסיר את "${songTitle}" מהרשימה שלך?`;
    document.getElementById('remove-modal').style.display = 'flex';
}

function cancelRemove() {
    songToRemove = null;
    document.getElementById('remove-modal').style.display = 'none';
}

async function confirmRemove() {
    if (!songToRemove) return;

    try {
        const response = await fetch(`/api/my-songs/remove/${songToRemove}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            // Remove the song card from the page
            const songCard = document.querySelector(`[data-song-id="${songToRemove}"]`);
            if (songCard) {
                songCard.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    songCard.remove();
                    updateSongsCount();
                }, 300);
            }

            // Show success message
            showMessage('השיר הוסר מהרשימה בהצלחה', 'success');
        } else {
            showMessage('שגיאה בהסרת השיר: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error removing song:', error);
        showMessage('שגיאה בחיבור לשרת', 'error');
    } finally {
        cancelRemove();
    }
}

function updateSongsCount() {
    const songsGrid = document.querySelector('.songs-grid');
    const emptyState = document.querySelector('.empty-state');
    const countNumber = document.querySelector('.count-number');

    if (songsGrid) {
        const remainingSongs = songsGrid.children.length;

        if (countNumber) {
            countNumber.textContent = remainingSongs;
        }

        // If no songs left, show empty state
        if (remainingSongs === 0) {
            songsGrid.style.display = 'none';

            if (!emptyState) {
                location.reload(); // Reload to show proper empty state
            }
        }
    }
}

function showMessage(text, type) {
    // Create and show a temporary message
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
        color: ${type === 'success' ? '#155724' : '#721c24'};
        border: 2px solid ${type === 'success' ? '#28a745' : '#dc3545'};
        border-radius: 8px;
        padding: 15px 20px;
        font-weight: 600;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('remove-modal');
    if (e.target === modal) {
        cancelRemove();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cancelRemove();
    }
});
