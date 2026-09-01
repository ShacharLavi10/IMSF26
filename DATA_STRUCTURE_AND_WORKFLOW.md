> מסמך זה מתעד את סביבת העבודה, הגיליונות, וזרימת העבודה (Workflow) בארכיטקטורת Vercel + GitHub (ספטמבר 2026).

---

## פרק 1. סביבות עבודה וגיליונות (Spreadsheet Environment)

הפורטל מבוסס על מסדי נתונים ב-Google Sheets:
1. **גיליון האמת (Production):** הגיליון הראשי המכיל את נתוני האמת של הפסטיבל.
2. **גיליון הטסטים (Sandbox):** העתק מדויק של הגיליון הראשי, המשמש לבדיקות בלבד.
(ראה פירוט מדויק ומזהים במסמך ENVIRONMENTS_MAP.md)

---

## פרק 2. סביבת הפיתוח (Vercel & GitHub GitOps Workflow)

המערכת הופרדה לחלוטין לצד לקוח וצד שרת:

### צד לקוח (Frontend) - Vercel
האתר בנוי כפרויקט Vite / Vanilla JS מאוחסן ב-Vercel. תיקיית העבודה המקומית והיחידה היא \C:\Users\Shachar Lavi\Desktop\IMSF 26 VERCEL\.
* **סביבת Production (האתר האמיתי):** מקושרת לענף ה-main ב-GitHub. משתנה הסביבה VITE_GAS_API_URL מכוון ל-API של גיליון האמת.
* **סביבת Sandbox (אתר הטסטים):** מקושרת לענף ה-sandbox ב-GitHub. משתנה הסביבה VITE_GAS_API_URL מכוון ל-API של גיליון הניסוי.

### צד שרת (Backend) - Google Apps Script (API)
הקוד בגוגל (PortalBackend.gs) עבר הסבה ל-API Headless המקבל בקשות דרך doPost(e) ומחזיר JSON.
הפוליפיל בקובץ main.js ממיר אוטומטית את כל הקריאות המקוריות של google.script.run בקוד צד הלקוח לבקשות fetch אל ה-API, כך שלא נדרש שינוי בלוגיקה של צד הלקוח.

### תהליך הפיתוח (Workflow):
כל תיקיית העבודה העדכנית נמצאת כעת בתיקייה: \C:\Users\Shachar Lavi\Desktop\IMSF 26 VERCEL\

1. **פיתוח:** הסוכן מבצע שינויי קוד ועיצוב מקומית על המחשב.
2. **דחיפה:** הקוד נדחף באמצעות Git אוטומטית ל-GitHub אל ענף \sandbox\.
3. **בדיקה ב-Vercel:** Vercel בונה ומפיצה אוטומטית את האתר המדומה. בודקים את השינויים מול הנתונים המדומים בלינק של ה-Sandbox.
4. **אישור ו-Merge:** לאחר שהלקוח מאשר שהכל עובד, מבצעים \git merge\ של \sandbox\ אל \main\ ודוחפים את \main\ ל-GitHub.
5. **עדכון Production:** Vercel מזהה את העדכון בענף \main\, ובונה אוטומטית את האתר האמיתי עם הקוד החדש.
