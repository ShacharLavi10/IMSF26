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
│ 'מלונות ירושלים' │      │ 'מלונות תל אביב' │      │ קובץ חיצוני: טיסות (ענת)     │
│  - מיון לפי מייל │      │  - מיון לפי מייל │      │  - גיליון 'עדכוני טיסות'     │
│  - הזרקת XLOOKUP │      │  - הזרקת XLOOKUP │      │  - גיליון 'טבלת טיסות'       │
│  - מחיקת יתומים  │      │  - מחיקת יתומים  │      │  - גיליון 'הסעות מנתבג'      │
└──────────────────┘      └──────────────────┘      └──────────────┬───────────────┘
                                                                   │
                                        ┌──────────────────────────┴──────────────────────────┐
                                        ▼                                                     ▼
                         ┌──────────────────────────────┐                      ┌──────────────────────────────┐
                         │ גיליון: 'טיסות - שיקוף'      │                      │ גיליון: 'טבלת טיסות - שיקוף' │
                         │ (תהליך, אישורים, דשבורד)     │                      │ (שאטלים, מועדי טיסות נקיים)  │
                         └──────────────┬───────────────┘                      └──────────────────────────────┘
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

---

### ⚙️ 6. Vercel Configuration & Environment Variables (Critical)

בשל ההפרדה בין צד הלקוח (Vercel) לצד השרת (Google Apps Script), המערכת משתמשת במשתני סביבה בקובץ `.env`:

> [!CAUTION]
> **חוק ברזל לגבי שמות משתני הסביבה ב-Vercel:**
> יש להשתמש **אך ורק** במשתנה `VITE_APPS_SCRIPT_URL` ולא באף וריאציה אחרת.
> **אסור** להשתמש בשמות ישנים כמו `VITE_GAS_API_URL`.

* **סביבת main (פרודקשן):** מוגדר ב-Vercel ומצביע ל-Apps Script של פרודקשן (`AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A`).
* **סביבת sandbox (בדיקות):** מוגדר ב-Vercel ומצביע ל-Apps Script של סנדבוקס (`AKfycbzK3tyvdqCU1UDLvYqC-6IvH2zFoLsOvEGGwXslGQQK0f7cuYgCb0U4MbISSuldV3RM`).
* הקובץ `main.js` פותר דינמית את ה-URL לפי ה-hostname כדי להבטיח הפרדה מוחלטת בין הסביבות.

---

## ⚠️ 7. Google Apps Script Permissions & oauthScopes (Critical)

> [!WARNING]
> **חוק ברזל לגבי הרשאות ב-appsscript.json:**
> **אסור בתכלית האיסור** להוסיף את הבלוק `oauthScopes` לקובץ ההגדרות `appsscript.json`. יש להשאיר למנוע של גוגל לזהות את ההרשאות באופן אוטומטי מתוך הקוד.

הסרת הבלוק `oauthScopes` מאפשרת פריסות אוטומטיות חלקות דרך clasp ללא צורך באישור ידני מחדש של הרשאות גוגל.

---

## 🧭 8. ארכיטקטורת לשוניות My Trip, Guide וסנכרון טיסות חי

### א. איחוד לשונית `My Trip`
* לשוניות `Flights` ו-`Hotels` אוחדו ללשונית מרכזית אחת `#tab-mytrip`.
* שומר על בדיוק 5 לשוניות מרכזיות במובייל (`Itinerary` | `My Trip` | `Guide` | `Delegates` | `Artists`) לארגונומיה מושלמת ביד אחת.

### ב. לשונית מדריך והמלצות `Guide` ואינטגרציית מפות
* **מקור המידע:** גיליון `מידע כללי` (עמודות: `עיר`, `קטגוריה`, `שם המקום`, `כתובת`, `תיאור קצר`, `לינק`, `תגית`).
* **Backend Cache:** פונקציית `getGuideData` שומרת את הנתונים ב-Cache למשך 120 שניות.
* **מתגים עליונים ללא גלילה (Zero Scroll):** 3 עמודות שוות (`📍 Jerusalem` | `🌊 Tel Aviv` | `⚡ Essentials`).
* **סנכרון ללו"ז ללא כפילויות:** מיקומי אירועים בלו"ז מוצלבים מול מקומות המדריך ומציגים כפתור פתיחה ישיר ב-Google Maps.

### ג. ארכיטקטורת טיסות ושאלטים בזמן אמת (Live Flights Priority)
* **עדיפות עליונה לגיליון ענת החי:** `getGuestPortalData` קורא ישירות מגיליון הטיסות החי של ענת (`CONFIG.ANAT_SPREADSHEET_ID`), מעל שיקוף המאסטר הסטטי. כל שינוי של ענת מתעדכן בפורטל במיידי.
* **מיפוי יעדים מדויק מתוך `טיסות - שיקוף`:**
  - `Origin / From`: עמודת `יעד הגעה` (טיסת הלוך: מוצא → TLV).
  - `Destination / To`: עמודת `יעד חזרה` (טיסת חזור: TLV → יעד).
* **פיצול נוסעים משותפים (Together With):** שמות מרובים בתא `ביחד עם` מפוצלים אוטומטית לכפתורים אינטראקטיביים נפרדים.
* **פתיחת חלונית אורח בלחיצה:** לחיצה על נוסע שאטל פותחת מיידית (0ms) את כרטיסיית הפרופיל שלו מה-Cache הציבורי, או שולפת אותו בזמן אמת דרך `getGuestByPassengerName` (במקרה של אנשי הפקה כמו עדו המלך).

---

## 🎸 9. מנוע נטוורקינג, פידבק אומנים וסנכרון לידים (Artist Networking & Live Leads Engine)

מנוע הנטוורקינג נועד לחבר באופן אפקטיבי ואינטואיטיבי בין אורחי הפסטיבל (בוקרים בינלאומיים, מנהלי פסטיבלים, עיתונות) לבין 45 האומנים המשתתפים.

### א. תהליך אינטראקציית האורח (Client-Side Experience & Auto-Save)
1. **לייקים ומועדפים (Favorites ❤️):**
   * סימון מהיר ישירות מגריד האומנים (`.fav-btn-inline`) או מתוך חלונית האמן (`#sheet-fav-btn`).
   * שמירה מיידית ב-`localStorage` (`artist_favs_<email>`) לזמן תגובה של 0ms.
2. **תגיות כוונות מהירות (Quick Intent Tags):**
   * בחלונית האמן מוצגות 4 תגיות מהירות:
     - 🎯 `Booking` (הזמנה להופעה בפסטיבל/מועדון בחו"ל - מסמנת אוטומטית גם ❤️).
     - 🤝 `Connect` (חיבור מקצועי / שיתוף פעולה - מסמנת אוטומטית גם ❤️).
     - 📰 `Press` (עניין עיתונאי וסיקור תקשורתי).
     - ✍️ `General Note` (הערה כללית / גילוי עניין).
3. **הערות פרטיות (Private Notes):**
   * תיבת טקסט אישית לכל אמן (`#sheet-private-note`) עבור האורח.
4. **מנגנון שמירה אוטומטית (Debounced Auto-Save Engine):**
   * השהיה (Debounce) של 3.5 שניות בעת הקלדה רציפה.
   * שמירה מיידית (Flush) מתבצעת בעת:
     - סגירת חלונית האמן (`closeArtistSheet`).
     - לחיצה על לב או תגית.
     - מעבר טאב או מזעור המסך בדפדפן (`visibilitychange` / `hidden`).
   * אינדיקטור שמירה חי (`#sheet-save-status`): מציג `Saving...` והופך ל-`Saved ✓` למשך 3 שניות.

### ב. סנכרון דו-כיווני ורטרואקטיבי (Two-Way & Retroactive Auto-Sync)
1. **טעינה ראשונית וסנכרון חוצה-מכשירים (`fetchGuestArtistFeedback`):**
   * המערכת שולפת מהשרת את הנתונים השמורים (`getGuestArtistFeedback`) וממזגת בינם לבין ה-`localStorage`.
2. **סנכרון רטרואקטיבי (Retroactive Push):**
   * אם ב-`localStorage` של האורח ישנם מועדפים, הערות או תגיות שטרם הגיעו לשרת (למשל מועדפים שסומנו לפני חיבור ה-Google Sheets או במצב Offline):
   * המערכת מזהה זאת אוטומטית ומבצעת Push מיידי לשרת (`syncArtistFeedbackToServer`).
3. **סריקת טסטים מקומיים בלחיצת Admin:**
   * כפתור "⚡ Run Full Sync" בדשבורד ההפקה סורק את ה-`localStorage` עבור כל כתובות המייל שסומנו במחשב זה (`artist_favs_*`), מעלה את נתוניהן ל-Google Sheets, ורק אז מפעיל את חישוב הלידים המלא.

### ג. צד השרת וחישוב הלידים (`src/ArtistsAPI.gs`)
1. **`saveGuestArtistFeedback(email, payload)`:**
   * מקבלת את מפת המועדפים, ההערות והתגיות.
   * שולפת את נתוני האורח מהגיליון הראשי `אורחים` (`שם מלא`, `מדינה`, `תפקיד`, `חברה/ביוגרפיה`).
   * מעדכנת/מוסיפה שורה בגיליון `העדפות אורחים` (כולל עמודות עיתונות וסיקור 📰 וסה"כ לייקים ❤️ במבנה עמודות דינמי).
   * מפעילה מיד את `syncArtistLeadsSheet()`.
2. **`syncArtistLeadsSheet(ss, prefSheet, leadsSheet, artistsList)`:**
   * קוראת את כל נתוני `העדפות אורחים` ומקבצת לפי אמן.
   * **חישוב פוטנציאל סיבוב הופעות (Tour Match):**
     - 2 מדינות ומעלה: `🟢 חם: [מדינה 1], [מדינה 2]`
     - מדינה אחת: `🟡 עניין מקומי: [מדינה]`
     - ללא עניין בינתיים: `⚪ ללא עניין בינתיים`
   * מרכזת שמות של בוקרים, בקשות חיבור, עיתונות והערות טקסטואליות מפורטות.
   * מעדכנת את גיליון `לידים והזדמנויות אומנים`.
3. **`syncAllArtistsAndLeads()`:**
   * מחשבת את כל הלידים מחדש מכלל השורות ומנקה את ה-Cache של גוגל (`CacheService.remove`).
4. **מנגנון אכלוס אוטומטי (Fallback Auto-Population):**
   * אם גיליון `לידים והזדמנויות אומנים` ריק בעת כניסת מנהל למערכת, מתבצע אכלוס מלא של כל 45 האומנים כדי שהדשבורד לעולם לא יוצג ריק.

### ד. דשבורד הפקה - אזור Lineup & Networking Leads
* **תצוגת אומנים מרוכזת:** כל כרטיס מציג שם, ז'אנר, כמות לייקים (❤️), תג פוטנציאל טור, ורשימת בוקרים והערות.
* **מנוע חיפוש חי (`#admin-networking-search`):** סינון מהיר לפי שם אמן, ז'אנר, מדינה, שם בוקר או טקסט הערה.
* **כפתור סנכרון מלא (`#admin-sync-leads-btn`):** מפעיל `triggerFullLeadsSync()` עם חיווי סטטוס וטוסט אישור.


