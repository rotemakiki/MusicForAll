// static/js/auto_logout.js - קובץ חדש
// מערכת התנתקות אוטומטית לאפליקציית Music For All

// הגדרות התנתקות אוטומטית
const AUTO_LOGOUT_CONFIG = {
    // זמן חוסר פעילות במילישניות (15 דקות)
    INACTIVITY_TIMEOUT: 15 * 60 * 1000,

    // התרעה לפני התנתקות (2 דקות לפני)
    WARNING_TIMEOUT: 13 * 60 * 1000,

    // בדיקת סשן כל 5 דקות
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000
};

class AutoLogoutManager {
    constructor() {
        this.inactivityTimer = null;
        this.warningTimer = null;
        this.sessionCheckTimer = null;
        this.warningShown = false;

        // התחל רק עבור משתמשים מחוברים
        if (this.isUserLoggedIn()) {
            this.init();
        }
    }

    isUserLoggedIn() {
        // בדוק אם יש navigation bar של משתמש מחובר
        return document.querySelector('.nav-links li a[href*="logout"]') !== null;
    }

    init() {
        this.setupEventListeners();
        this.resetInactivityTimer();
        this.startSessionCheck();
        console.log('🔐 מערכת התנתקות אוטומטית הופעלה (15 דקות)');
    }

    setupEventListeners() {
        // אירועי פעילות שמאפסים את הטיימר
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, () => this.resetInactivityTimer(), true);
        });

        // איפוס טיימר גם כשחוזרים לטאב
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.resetInactivityTimer();
            }
        });
    }

    resetInactivityTimer() {
        // נקה טיימרים קיימים
        this.clearTimers();
        this.warningShown = false;

        // הסר התרעות קיימות
        this.removeWarningModal();

        // התחל טיימר התרעה
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, AUTO_LOGOUT_CONFIG.WARNING_TIMEOUT);

        // התחל טיימר התנתקות
        this.inactivityTimer = setTimeout(() => {
            this.performLogout('חוסר פעילות');
        }, AUTO_LOGOUT_CONFIG.INACTIVITY_TIMEOUT);
    }

    clearTimers() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    showWarning() {
        if (this.warningShown) return;
        this.warningShown = true;

        const modal = document.createElement('div');
        modal.id = 'auto-logout-warning';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>⚠️ התרעה</h3>
                    <p>אתה עומד להתנתק תוך 2 דקות בגלל חוסר פעילות.</p>
                    <p>האם תרצה להישאר מחובר?</p>
                    <div class="modal-buttons">
                        <button onclick="autoLogout.stayLoggedIn()" class="btn-stay">🔄 כן, הישאר מחובר</button>
                        <button onclick="autoLogout.logoutNow()" class="btn-logout">🚪 התנתק עכשיו</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // CSS עבור המודל
        if (!document.getElementById('auto-logout-styles')) {
            const style = document.createElement('style');
            style.id = 'auto-logout-styles';
            style.textContent = `
                #auto-logout-warning .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-out;
                }

                #auto-logout-warning .modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    margin: 20px;
                    animation: slideIn 0.3s ease-out;
                }

                #auto-logout-warning h3 {
                    color: #dc3545;
                    margin-bottom: 15px;
                    font-size: 20px;
                }

                #auto-logout-warning p {
                    color: #333;
                    margin-bottom: 10px;
                    line-height: 1.5;
                }

                #auto-logout-warning .modal-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }

                #auto-logout-warning .btn-stay {
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                #auto-logout-warning .btn-logout {
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                #auto-logout-warning .btn-stay:hover,
                #auto-logout-warning .btn-logout:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @media (max-width: 600px) {
                    #auto-logout-warning .modal-buttons {
                        flex-direction: column;
                    }

                    #auto-logout-warning .btn-stay,
                    #auto-logout-warning .btn-logout {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    removeWarningModal() {
        const modal = document.getElementById('auto-logout-warning');
        if (modal) {
            modal.remove();
        }
    }

    stayLoggedIn() {
        this.removeWarningModal();
        this.resetInactivityTimer();
        console.log('👤 המשתמש בחר להישאר מחובר');
    }

    logoutNow() {
        this.performLogout('בחירת משתמש');
    }

    async performLogout(reason = 'לא ידוע') {
        console.log(`🚪 מתנתק בגלל: ${reason}`);

        try {
            // שלח בקשת התנתקות לשרת
            await fetch('/api/auto_logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // הצג הודעה
            alert(`התנתקת אוטומטית בגלל ${reason}`);

            // הפנה לדף הבית
            window.location.href = '/';

        } catch (error) {
            console.error('שגיאה בהתנתקות אוטומטית:', error);
            // גם במקרה של שגיאה, הפנה לדף הבית
            window.location.href = '/';
        }
    }

    startSessionCheck() {
        // בדוק מדי פעם אם הסשן עדיין תקף
        this.sessionCheckTimer = setInterval(async () => {
            try {
                const response = await fetch('/api/check_session');
                const data = await response.json();

                if (!data.valid) {
                    this.performLogout('פג תוקף הסשן');
                }
            } catch (error) {
                console.warn('לא ניתן לבדוק סשן:', error);
            }
        }, AUTO_LOGOUT_CONFIG.SESSION_CHECK_INTERVAL);
    }

    destroy() {
        this.clearTimers();
        this.removeWarningModal();

        if (this.sessionCheckTimer) {
            clearInterval(this.sessionCheckTimer);
            this.sessionCheckTimer = null;
        }

        console.log('🔓 מערכת התנתקות אוטומטית כובתה');
    }
}

// התחל את המערכת רק אם המשתמש מחובר
let autoLogout = null;

document.addEventListener('DOMContentLoaded', function() {
    autoLogout = new AutoLogoutManager();
});

// ניקוי כשעוזבים את הדף
window.addEventListener('beforeunload', function() {
    if (autoLogout) {
        autoLogout.destroy();
    }
});
