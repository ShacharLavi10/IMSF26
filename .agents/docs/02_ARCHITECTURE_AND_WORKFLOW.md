# 02 - ARCHITECTURE AND WORKFLOW

## 🏗️ 1. ארכיטקטורת המערכת (Decoupled Vercel + Google Apps Script API)

המערכת פועלת בארכיטקטורה מודרנית מופרדת (Decoupled):
1. **צד לקוח (Frontend) ב-Vercel:**
   * אפליקציית Web מודרנית ומהירה (HTML / CSS / Vanilla JS מבוססת Vite) המאוחסנת ב-Vercel.
   * התקשורת מול השרת מנוהלת דרך בקשות `fetch` ב-`main.js`.
2. **צד שרת (Backend API) ב-Google Apps Script:**
   * קובץ `PortalBackend-Vercel.gs` מתפקד כ-Headless REST API (`doPost`) שמחזיר ומקבל JSON.
3. **מסד נתונים (Database):**
   * Google Sheets ממשיך לשמש כמסד הנתונים החי והנגיש עבור ההפקה.

---

## 🔄 2. ארכיטקטורת הסנכרון וזרימת המידע (Data Workflow)

```
                       [ טופסי גוגל / הזנה ידנית ]
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   גיליון ראשי: 'אורחים'       │  <── (Single Source of Truth)
                   └───────────────┬───────────────┘
                                   │
                    אירוע onEdit / onChange
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────────────────┐
│ 'מלונות ירושלים' │      │ 'מלונות תל אביב' │      │ קובץ חיצוני: 'עדכוני טיסות'  │
│  - מיון לפי מייל │      │  - מיון לפי מייל │      │  - סנכרון סדר שורות ומיילים  │
│  - הזרקת XLOOKUP │      │  - הזרקת XLOOKUP │      │  - הזרקת IMPORTRANGE         │
│  - מחיקת יתומים  │      │  - מחיקת יתומים  │      │  - מחיקת יתומים              │
└──────────────────┘      └──────────────────┘      └──────────────┬───────────────┘
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────────┐
                                                    │ גיליון פנימי: 'טיסות - שיקוף' │
                                                    └──────────────┬───────────────┘
                                                                   │
                                   ┌───────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │     פורטל האורחים (Web)     │
                    └─────────────────────────────┘
```

---

## ⚡ 3. חוקי ליבה טכניים עבור מנוע הסנכרון ב-Sheets

1. **Email Alignment Rule:** כל שורת מידע בגיליונות הלוויין מחויבת להיות צמודה לכתובת המייל שלה (עמודה A). סדר השורות מוכתב אך ורק לפי מיקום המייל בגיליון `אורחים` (עמודה J).
2. **Orphan Cleanup Rule:** מחיקת שורה מ-`אורחים` מסירה מיד את השורה המקבילה משאר הגיליונות.
3. **Formula Protection Rule:** השמות הפרטיים ומשפחה מוזרקים דינמית באמצעות XLOOKUP כדי למנוע שגיאות.

---

## 🔄 4. מתודולוגיית עבודה ואישור שינויים (Development Workflow)

> [!WARNING]
> **חוק ברזל: עבודה מתבצעת אך ורק בתיקיית `IMSF 26 VERCEL`!** 

1. **פיתוח בלעדי:** שינוי קוד רק בתיקיית `IMSF 26 VERCEL`.
2. **הטמעה אוטומטית ל-Sandbox:**
   * **חובה מוחלטת:** לאחר כל שינוי, יש לדחוף את הקוד מייד לענף `sandbox` ב-GitHub (`git add .`, `git commit`, `git push origin sandbox`). פעולה זו פורסת את האתר המדומה ב-Vercel.
   * **Backend:** שימוש ב-`clasp push` אם שונה קוד Apps Script ב-Sandbox.
3. **QA מול שחר:** שחר יבדוק את הלינק של ה-Sandbox.
4. **שחרור לסביבת אמת (Production):** רק לאחר אישור!
   * מבוצע ע"י Merge מ-`sandbox` ל-`main`.
   * דחיפת ה-Apps Script לפרודקשן דרך הגדרות `clasp` רלוונטיות.

---

## 🚀 5. ארכיטקטורת ניהול מטמון (Caching & Performance)

כדי לתמוך בעשרות משתמשים במקביל (קונקרנטיות) ללא קריסת שרת גוגל (GAS) ולשמור על חוויית טעינה מיידית, האפליקציה משתמשת בשכבות Cache מתקדמות:

1. **Client-Side SWR (Stale-While-Revalidate):**
   * **איך עובד:** בעת טעינת האתר (`app.js`), המידע נטען ב-0 שניות מתוך ה-`localStorage` של המשתמש. באותו זמן, מבוצעת קריאת רקע שקופה לשרת ה-GAS כדי למשוך את המידע המעודכן. 
   * **יתרון:** אין מסכי טעינה ארוכים, אבל המשתמש לעולם לא נשאר עם מידע ישן כי ה-DOM מתעדכן אוטומטית כשהבקשה מסתיימת.

2. **Server-Side GAS Cache (Global Data):**
   * **איך עובד:** מידע שרלוונטי לכלל האורחים ולא משתנה כל דקה (אומנים, לו"ז, רשימת אורחים) נשמר ב-`CacheService` של Google Apps Script בשרת.
   * **TTL (זמן חיים):** 
     - **אומנים (Artists):** 5 דקות.
     - **ספריית אורחים (Directory):** 5 דקות.
     - **לו"ז פסטיבל (Schedule):** 1 דקה.
   * **Admin Bypass:** אם המשתמש מוגדר כאיש הפקה (Admin), המערכת **עוקפת** את ה-Cache, קוראת ישירות מה-Google Sheets, ודורסת את ה-Cache הקיים כדי לרענן את הנתונים לכולם במיידי (מצוין לבדיקות או לעדכונים דחופים).

3. **Live Updates (מידע דינמי חי - הכנה להמשך):**
   * פיצ'רים של זמן אמת (כמו "עולה בעוד 5 דקות") יתווספו באמצעות אנדפוינט קטן ונפרד שלא משתמש ב-Cache הארוך, וילבשו באופן ויזואלי (Overlay) על גבי המידע הסטטי מה-Cache של האומנים.


## 6. Production Dashboard (Admin Interface)
The portal contains an internal Production Dashboard hidden from regular guests. It is accessible only to users marked with the role `הפקה חשיפה` (Production Exposure) in the Master Sheet. Admin users are also automatically excluded from the "Delegates" (Guest Directory) tab.

**Key Features:**
1. **Live Analytics (Overview):**
   - Automatically calculates total non-admin delegates.
   - Computes missing critical forms in real-time by inspecting the relevant checkbox columns in the Master Sheet (Hotel form, Flight form, Passport photo).
2. **Alert Center (Push Notifications):**
   - Allows admins to broadcast global messages to all delegates.
   - Operates by appending the message to the `מידע כללי` (General Info) sheet under the `הודעה לכולם` column, which instantly reflects in the Live Updates bell of all users.
3. **Logistics Summary:**
   - Aggregates and displays total booked hotel nights for Tel Aviv vs Jerusalem directly from the hotel sheets.
   - Summarizes total processed flight arrivals.
4. **Guest Management & Search:**
   - Real-time search across names, emails, and companies.
   - Status indicators (Green/Orange) summarizing form completion.
   - Clicking a guest opens the **Admin Modal** containing their full contact details, missing forms breakdown, a direct WhatsApp chat button, and the Impersonation feature.
5. **View As (Impersonation):**
   - Admins can temporarily view the portal strictly as a specific guest.
   - It generates a cryptographic temporary token for the target user via `impersonateGuest()` in Apps Script, saves the admin's original token, and reloads the portal.
   - A floating red banner remains active to allow instantly reverting to Admin mode.

**Technical Flow:**
- **Frontend (`src/app.js`):** All admin logic (`renderAdminDashboard`, `filterAdminGuests`, `viewAdminGuestDetails`, `sendAdminAlert`, `impersonateGuest`) is strictly encapsulated and dynamically injected into `#admin-card` to ensure rapid loading and visual separation.
- **Backend (`src/PortalBackend.gs`):** 
  - `getAdminDashboardData`: A unified endpoint fetching Master Sheet, Hotels, and Flights data for local processing to avoid multiple round-trips.
  - Role verification is strictly enforced server-side before executing any admin mutations (`sendAdminAlert`, `impersonateGuest`).
