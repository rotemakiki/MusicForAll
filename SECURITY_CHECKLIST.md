# ✅ רשימת בדיקת אבטחה לפני העלאה ל-Git

## ✅ מה מוגן (לא יעלה ל-Git):
- ✅ `secrets/firebase-key.json` - מוגן ב-.gitignore
- ✅ כל התיקייה `secrets/` - מוגנת
- ✅ `__pycache__/` - מוגן ב-.gitignore
- ✅ קבצי Python compiled - מוגנים

## ✅ מה תוקן:
- ✅ `app.secret_key` - עכשיו משתמש במשתנה סביבה (SECRET_KEY)
- ✅ `.gitignore` - עודכן עם כל הקבצים הרגישים
- ✅ `FIREBASE_SETUP.md` - הוסר נתיב מלא עם שם משתמש

## ⚠️ לפני העלאה ל-Git - ודא:

### 1. בדוק שאין מידע רגיש בקוד:
```powershell
# בדוק אם יש מפתחות בקוד
git diff | Select-String -Pattern "private_key|api_key|password|secret"
```

### 2. בדוק מה יעלה:
```powershell
git status
```

### 3. אם יש היסטוריה עם מידע רגיש:
אם כבר העלית בעבר קבצים רגישים, תצטרך לנקות את ההיסטוריה:
```powershell
# זה יסיר את הקובץ מההיסטוריה (זהירות!)
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch secrets/firebase-key.json" --prune-empty --tag-name-filter cat -- --all
```

## 🔒 המלצות נוספות:

### לפרודקשן:
1. הגדר משתנה סביבה `SECRET_KEY` עם מפתח חזק וייחודי
2. השתמש ב-`FIREBASE_KEY_BASE64` במקום קובץ JSON
3. אל תעלה את `FIREBASE_SETUP.md` אם הוא מכיל מידע רגיש

### אם אתה משתף את הפרויקט:
1. צור קובץ `.env.example` עם דוגמאות (ללא ערכים אמיתיים)
2. הוסף הוראות ב-README איך להגדיר משתני סביבה
3. ודא שכל המפתחות הם משתני סביבה, לא בקוד

## ✅ הכל בטוח להעלאה!

כל הקבצים הרגישים מוגנים ב-.gitignore. אתה יכול להעלות את הפרויקט בבטחה.





