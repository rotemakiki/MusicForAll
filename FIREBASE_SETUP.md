# הוראות הגדרת Firebase

## אפשרות 1: קובץ JSON (מומלץ לפיתוח)

1. לך ל-Firebase Console: https://console.firebase.google.com/
2. בחר את הפרויקט שלך (או צור חדש)
3. לך ל-**Settings** (⚙️) > **Project Settings**
4. לחץ על הטאב **Service Accounts**
5. לחץ על **"Generate New Private Key"**
6. לחץ **"Generate Key"** באישור
7. קובץ JSON יורד אוטומטית
8. שמור את הקובץ בשם `firebase-key.json` בתיקייה `secrets/`

**נתיב:** `secrets/firebase-key.json` (בתיקיית הפרויקט)

## אפשרות 2: משתנה סביבה (מומלץ לפרודקשן)

אם יש לך את המפתח מקודד ב-Base64:

**ב-PowerShell:**
```powershell
$env:FIREBASE_KEY_BASE64 = "המפתח_המקודד_ב-Base64_כאן"
```

**או ב-Windows (משתנה קבוע):**
1. לחץ ימני על "This PC" > Properties
2. Advanced system settings
3. Environment Variables
4. הוסף משתנה חדש: `FIREBASE_KEY_BASE64` עם הערך

## בדיקה

לאחר ההגדרה, נסה להריץ:
```powershell
python app.py
```

אם הכל תקין, תראה:
```
🔑 Using Firebase key from file: ...
🎵 Music App starting on port 5000
```

## הערות חשובות

- **לעולם אל תעלה את קובץ המפתח ל-Git!** (הוא כבר ב-.gitignore)
- אם אתה משתף את הפרויקט, השתמש במשתנה סביבה
- ודא שהקובץ נקרא בדיוק `firebase-key.json` (לא `firebase-key (1).json`)

