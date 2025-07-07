// Songs List Page JavaScript - Enhanced Functionality

let allSongs = [];
let filteredSongs = [];
let currentSort = 'title';

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    updateSongCount();
});

function initializePage() {
    // Store all songs data for filtering
    const songCards = document.querySelectorAll('.song-card');
    allSongs = Array.from(songCards).map(card => {
        return {
            element: card,
            title: card.querySelector('h3').textContent.toLowerCase(),
            artist: card.querySelector('.song-info p').textContent.toLowerCase(),
            difficulty: card.dataset.difficulty || '',
            bpm: parseInt(card.dataset.bpm) || 0,
            key: card.dataset.key || '',
            timeSignature: card.dataset.timeSignature || ''
        };
    });
    filteredSongs = [...allSongs];
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Sort functionality
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }

    // Add smooth animations to song cards
    animateCards();
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();

    filteredSongs = allSongs.filter(song => {
        return song.title.includes(searchTerm) ||
               song.artist.includes(searchTerm);
    });

    displayFilteredSongs();
    updateSongCount();
}

function handleSort(event) {
    currentSort = event.target.value;

    filteredSongs.sort((a, b) => {
        switch(currentSort) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'artist':
                return a.artist.localeCompare(b.artist);
            case 'difficulty':
                const difficultyOrder = {'קל': 1, 'בינוני': 2, 'קשה': 3};
                return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
            case 'bpm':
                return a.bpm - b.bpm;
            default:
                return 0;
        }
    });

    displayFilteredSongs();
}

function displayFilteredSongs() {
    const songsGrid = document.querySelector('.songs-grid');
    if (!songsGrid) return;

    // Hide all songs first
    allSongs.forEach(song => {
        song.element.style.display = 'none';
        song.element.style.opacity = '0';
        song.element.style.transform = 'translateY(20px)';
    });

    // Show filtered songs with animation
    setTimeout(() => {
        filteredSongs.forEach((song, index) => {
            song.element.style.display = 'block';
            setTimeout(() => {
                song.element.style.opacity = '1';
                song.element.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }, 100);
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

    document.querySelectorAll('.song-card').forEach(card => {
        observer.observe(card);
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
});
