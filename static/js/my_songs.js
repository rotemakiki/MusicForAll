// My Songs Page JavaScript
let songToRemove = null;

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
