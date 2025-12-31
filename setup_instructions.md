# הוראות התקנה - MusicForAll Project

## שלב 1: התקנת Python

1. הורד Python מ-https://www.python.org/downloads/
   - בחר את הגרסה האחרונה של Python 3.11 או 3.12
   - **חשוב מאוד**: בזמן ההתקנה, סמן את התיבה "Add Python to PATH"

2. לאחר ההתקנה, פתח PowerShell חדש והרץ:
   ```
   python --version
   ```
   אמור להציג משהו כמו: `Python 3.11.x`

## שלב 2: התקנת התלויות

לאחר ש-Python מותקן, הרץ:
```
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## שלב 3: הגדרת Firebase (חובה!)

הפרויקט משתמש ב-Firebase. יש לך שתי אפשרויות:

### אפשרות א': קובץ JSON מקומי (מומלץ לפיתוח)
1. צור תיקייה בשם `secrets` בתיקיית הפרויקט
2. הוסף את קובץ מפתח ה-Firebase שלך בשם `firebase-key.json` בתוך התיקייה `secrets/`
   - הקובץ צריך להיות מפתח Service Account מ-Firebase Console

### אפשרות ב': משתנה סביבה (מומלץ לפרודקשן)
הגדר משתנה סביבה `FIREBASE_KEY_BASE64` עם המפתח מקודד ב-Base64

**הערה**: ללא אחד מהאופציות האלה, האפליקציה לא תוכל להתחיל!

## שלב 4: הרצת הפרויקט

```
python app.py
```

האפליקציה תרוץ על: http://localhost:5000

---

## פתרון בעיות

### אם `pip` לא מזוהה:
- השתמש ב: `python -m pip` במקום רק `pip`
- או התקן מחדש Python עם "Add to PATH" מסומן

### אם יש שגיאות התקנה:
- ודא שיש לך חיבור לאינטרנט
- נסה: `python -m pip install --upgrade pip` לפני ההתקנה

