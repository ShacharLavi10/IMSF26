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

### א. זרימת מידע לוגיסטי (אורחים, מלונות, טיסות ושאטלים)

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

### ב. זרימת מידע נטוורקינג, פידבק אומנים ולידים (Artist Feedback & Leads Loop)

```
            ┌──────────────────────────────────────────────┐
            │        פורטל האורחים (Web Vercel)            │
            │  - לייקים (❤️) בגריד ובחלונית                │
            │  - תגיות כוונות: Booking, Connect, Press     │
            │  - הערות אישיות (Private Notes)             │
            │  - SWR LocalStorage (זמן תגובה 0ms)         │
            └──────────────────────┬───────────────────────┘
                                   │
                   Auto-Save (Debounce 3.5s / Flush)
                   + סנכרון רטרואקטיבי בעליית האתר
                                   │
                                   ▼
            ┌──────────────────────────────────────────────┐
            │   Google Apps Script API (doPost JSON)       │
            │   פונקציה: saveGuestArtistFeedback()         │
            └──────────────┬───────────────────────────────┘
                           │
            ┌──────────────┴──────────────────────────────┐
            ▼                                             ▼
┌──────────────────────────────┐           ┌──────────────────────────────┐
│ קובץ מאסטר ראשי: 'אורחים'    │           │ קובץ אומנים חיצוני (Sandbox) │
│ שליפת פרטי אורח מוצלבים:     │           │ גיליון: 'העדפות אורחים'      │
│  - שם מלא                    │           │  - עמודות A-M דינמיות        │
│  - מדינה                     │           │  - מייל, שם, מדינה, חברה     │
│  - תפקיד וביוגרפיית חברה     │           │  - לייקים, בוקינג, חיבור, פרס│
└──────────────┬───────────────┘           │  - סה"כ לייקים מספרי         │
               │                           │  - הערות אורח + Raw Data JSON│
               └─────────────┬─────────────┘
                             │
                             ▼
              אירוע טריגר מיידי בשרת:
              syncArtistLeadsSheet()
                             │
                             ▼
            ┌──────────────────────────────────────────────┐
            │ גיליון: 'לידים והזדמנויות אומנים'            │
            │  - ריכוז 45 האומנים שורה לכל אמן             │
            │  - חישוב פוטנציאל טור: חם / מקומי / ללא עניין│
            │  - פילוח מדינות מתעניינות (כמות ומדינות)     │
            │  - בוקרים להופעה (🎯 Booking)                │
            │  - בקשות לקשר (🤝 Connect)                   │
            │  - עיתונות וסיקור (📰 Press)                 │
            │  - סה"כ לייקים (❤️) והערות אורחים            │
            └──────────────────────┬───────────────────────┘
                                   │
                                   ▼
            ┌──────────────────────────────────────────────┐
            │ דשבורד הפקה (Admin Production Dashboard)     │
            │  - ווידג'ט Lineup & Networking Leads         │
            │  - מנוע חיפוש מהיר לפי אמן, בוקר או מדינה    │
            │  - כפתור "⚡ Run Full Sync" לסריקה מלאה       │
            └──────────────────────────────────────────────┘
```

### ג. זרימת מידע לו"ז אירועי פסטיבל (Festival Itinerary & Schedule Flow)

```
       ┌──────────────────────────────────────────────────────────────┐
       │   Google Sheets המרכזי (Sandbox / Production)                │
       │   גיליון: 'לוז פסטיבל' / 'לו"ז פסטיבל'                       │
       │   - תאריך (YYYY-MM-DD), שעת התחלה, שעת סיום                  │
       │   - כותרת אירוע, תיאור והנחיות למשלחת                        │
       │   - מיקום עם נוסחת HYPERLINK המפנה למיקום מדויק במפה        │
       │   - קטגוריה: Concerts, Shuttle, Food, Tour, Networking...    │
       └──────────────────────────────┬───────────────────────────────┘
                                      │
                       קריאת שרת: getScheduleData()
                       מחלצת נתוני תאים + נוסחאות לינקים
                                      │
                                      ▼
       ┌──────────────────────────────────────────────────────────────┐
       │   Google Apps Script API (doPost JSON)                       │
       │   - סידור הנתונים כאובייקט מקוטלג לפי תאריכים                │
       │   - שמירה ב-CacheService (מפתח: global_schedule_data, 60s)   │
       │   - Admin Bypass: מנהל הפקה צופה בלו"ז גם לפני אישור כללי    │
       └──────────────────────────────┬───────────────────────────────┘
                                      │
                       תגובת JSON: scheduleData
                                      │
                                      ▼
       ┌──────────────────────────────────────────────────────────────┐
       │   פורטל האורחים (Vercel Frontend)                            │
       │   - לשונית לו"ז (#tab-schedule)                              │
       │   - סרגל Calendar Week Strip ללא גלילה (#schedule-days-nav)   │
       │   - סינון יומי מיידי ללא קריאת שרת חוזרת (scheduleDataCache) │
       │   - כרטיסיות אירוע קומפקטיות ומעוצבות במבנה שורה עדין       │
       └──────────────────────────────────────────────────────────────┘
```

### ד. זרימת מידע ליינאפ ולו"ז הופעות (Lineup & Shows Timetable Architecture & Workflow)

בלשונית האומנים (`#artists-card`) קיימות שתי תצוגות מרכזיות המנוהלות ע"י בורר תת-לשוניות עליון (`#subtab-artists-directory` ו-`#subtab-artists-timetable`):

1. **תצוגת ליינאפ אומנים (Artists Lineup View - `#artists-directory-view`):**
   - גריד קלפים של כל 45+ האומנים המשתתפים בפסטיבל.
   - סינון מהיר לפי ז'אנר, חיפוש טקסט חופשי, וכפתור לב (❤️) לסימון מועדפים ישיר מהגריד או מתוך חלונית האמן.
   - הקלקה על קלף אמן פותחת חלונית מודאלית מלאה (`openArtistSheet`) עם תמונת יח"צ, ביוגרפיה, חברי הרכב, תגיות כוונות לשיתוף פעולה, קישורי מדיה, וכן **בלוק שעות הופעה אינטראקטיבי**.

2. **תצוגת לו"ז הופעות כרונולוגי (Shows Timetable View - `#artists-timetable-view`):**
   - **סרגל ימים (Calendar Strip - `#timetable-days-nav`):** 6 ימי פסטיבל מרוכזים (Tue 17 - Sun 22) ללא גלילה אופקית.
   - **באנר לוקיישן ודלתות (`#timetable-venue-banner`):** פירוט שם המתחם, העיר ושעת פתיחת הדלתות.
   - **מתג ראשי 50/50 (`#timetable-master-switcher`):**
     - `⚡ Full Timetable (כמות הופעות)` – צפייה בכל ההופעות ליום הנבחר.
     - `❤️ My Schedule (כמות מועדפים)` – סינון מיידי המציג אך ורק הופעות של אומנים שסומנו בלב לאותו יום (כולל מצב ריק מעודד וכפתור חזרה מהיר).
   - **בורר במות נקי (`#timetable-stage-filter-wrapper`):** תפריט נפתח (Dropdown) בשורה אחת לבחירת במה מסוימת או כל הבמות יחד.
   - **רשימת הופעות קומפקטית (`#timetable-shows-container`):** שורות כרונולוגיות מסודרות לפי שעות, עם תמונת אמן, שעת התחלה וסיום, במה, פורמט, תגית ז'אנר ולב מועדפים זוהר.

```
┌────────────────────────────────────────────────────────────────────────┐
│  חלונית אמן מודאלית (Bottom Sheet Modal - #artist-bottom-sheet)        │
│  - הצגת שורת הופעה: יום, שעות, מתחם ובמה                              │
│  - לחיצה על השורה מפעילה: jumpToTimetableShow(date, showId, artistId) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    1. סגירת החלונית ויזואלית ללא פגיעה בהיסטוריה
    2. הזרקת Hash קדימה: window.location.hash = "timetable"
    3. מעבר ללשונית Timetable, בחירת יום ההופעה וגלילה חלקה לכרטיס
    4. הפעלת אנימציית פולס זוהרת סופר-בולטת (Multi-Wave Pulse 3.5s)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  תצוגת הטיימטייבל (#artists-timetable-view)                           │
│  - כרטיס ההופעה זוהר ומהבהב במרכז המסך                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         לחיצה על חץ "אחורה" בטלפון / בדפדפן (Browser Back)
         אירוע popstate / hashchange קופץ אחורה מ-#timetable אל #sheet
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  חזרה אוטומטית לחלונית האמן (Seamless Back Navigation)                 │
│  - אירוע hashchange מזהה hash === "#sheet"                            │
│  - מעביר חזרה ללשונית אומנים ולתת-לשונית Directory (Lineup)           │
│  - פותח מחדש אוטומטית את חלונית האמן שממנו הגעת (lastOpenedArtistId)   │
│  - לחיצה נוספת על "אחורה" סוגרת את החלונית ומחזירה לליינאפ הכללי       │
└────────────────────────────────────────────────────────────────────────┘
```

3. **מנוע התאמת אומנים (Artist Matching Engine - `findMatchedArtist`):**
   - הלו"ז המוגדר מראש ב-`FESTIVAL_SHOWS_SCHEDULE` מצליב שמות וכינויים (`aliases`) מול `globalArtistsData`.
   - התאמה נורמליזטורית (הסרת גרשים, מקפים ורווחים כפולים) מאפשרת זיהוי אוטומטי של תמונת האמן, הז'אנר, הסטטוס במועדפים והקישור לחלונית הפרופיל המלאה.

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
   * **חובה מוחלטת:** לאחר כל שינוי, יש לדחוף את הקוד מייד לענף `sandbox` ב-GitHub (`git add .`, `git commit`, `git push origin sandbox`) וכן לפרוס ישירות באמצעות `npx vercel deploy --prod --yes` כדי להבטיח עדכון מיידי של הדומיין `https://imsf26sandbox.vercel.app` ללא עיכובים או חסימות Preview.
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
2. **Alert Center & Personal Messages (Messaging & Notifications Suite):**
   - **Global Announcements (Broadcast):**
     - Admins can broadcast announcements to all delegates via `sendAdminAlert()`.
     - Appends new announcements to `מידע כללי` under column `הודעה לכולם` without overwriting prior announcements.
     - Supports full editing (`updateAdminAlert()`) and individual deletion (`deleteAdminAlert()`) by row index.
     - Shown in the admin dashboard in a 2-column split grid (`.admin-msg-split-grid`) with an active list of all announcements and active count badge.
   - **Personal Guest Messages:**
     - Stored in sheet `אורחים` under column `הודעה אישית בפורטל` as a structured JSON array (`[{"id":"m_...","text":"...","timestamp":...,"timestampStr":"..."}]`).
     - Backwards-compatible with legacy plain text strings via `parsePersonalMessages()`.
     - Supports appending multiple personal messages per guest (`addPersonalMessage()`), editing specific messages (`updatePersonalMessageItem()`), and individual deletion (`deletePersonalMessageItem()`).
     - Admin Guest Modal displays active messages on the right side of the split grid with individual ✏️ Edit and 🗑️ Delete buttons.
   - **Live Updates & Unread Modal in Guest Portal:**
     - **Unread Popup Modal (`#new-message-modal-overlay`):** Greets the guest upon entrance if any new unread messages exist, with animated ringing bell and a direct "READ" button that opens the notifications panel and marks all active updates as read in `localStorage`.
     - **Safe Notification Cards (`.update-msg`):** Cards have `cursor: default` and no card-wide click handlers, preventing accidental dismissals while reading or scrolling on mobile.
     - **Explicit Delete Button (`.update-msg-delete-btn`):** Located in the card footer (`.update-msg-footer`), featuring a red trash icon and the clear label "Delete" with `event.stopPropagation()` to dismiss notifications permanently.
3. **Logistics Summary:**
   - Aggregates and displays total booked hotel nights for Tel Aviv vs Jerusalem directly from the hotel sheets.
   - Summarizes total processed flight arrivals.
4. **Guest Management & Search:**
   - Real-time search across names, emails, and companies.
   - Status indicators (Green/Orange) summarizing form completion.
   - Clicking a guest opens the **Admin Modal** containing their full contact details, missing forms breakdown, a direct WhatsApp chat button, personal messages management, and the Impersonation feature.
5. **View As (Impersonation):**
   - Admins can temporarily view the portal strictly as a specific guest.
   - It generates a cryptographic temporary token for the target user via `impersonateGuest()` in Apps Script, saves the admin's original token, and reloads the portal.
   - A floating red banner remains active to allow instantly reverting to Admin mode.

**Technical Flow:**
- **Frontend (`src/app.js`):** All admin logic (`renderAdminDashboard`, `filterAdminGuests`, `viewAdminGuestDetails`, `submitAdminAlert`, `deleteAdminAlert`, `savePersonalMessage`, `deletePersonalMessageItem`, `impersonateGuest`) is strictly encapsulated and dynamically injected into `#admin-card` to ensure rapid loading and visual separation.
- **Backend (`src/PortalBackend.gs`):** 
  - `getAdminDashboardData`: A unified endpoint fetching Master Sheet, Hotels, Flights, and Announcements data for local processing to avoid multiple round-trips.
  - Role verification is strictly enforced server-side before executing any admin mutations (`sendAdminAlert`, `updateAdminAlert`, `deleteAdminAlert`, `addPersonalMessage`, `updatePersonalMessageItem`, `deletePersonalMessageItem`, `impersonateGuest`).

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
* **חילוץ קישורים חכם (Smart Hyperlink Parsing):** פונקציית `getGuideData` ב-Backend מחלצת לא רק את כתובת ה-URL אלא גם את המלל המוטמע (`linkLabel`):
  - נוסחאות `=HYPERLINK("url", "text")`
  - אובייקטי Rich Text שנוצרו בגיליון באמצעות Ctrl+K
  - תגיות HTML (`<a href="...">text</a>`) ותחביר Markdown (`[text](url)`)
  - אם קיים מלל ייעודי – מוצג על גבי הכפתור באתר (לדוגמה `Download`, `Menu`, `Tickets`) עם אייקון קישור חיצוני.
  - אם מדובר בקישור רגיל או מיקום – מוצג הכיתוב `Maps` עם אייקון מפה.
* **מנגנון רענון שקט (SWR - Stale While Revalidate):**
  - טעינה מיידית מזיכרון המטמון (`imsf_guide_cache`) לחוויית משתמש מהירה ב-0ms.
  - שליפה שקטה ברקע מהשרת בכל כניסה ללשונית ורענון הכרטיסיות ללא הבהוב.
  - זיהוי אוטומטי של זיכרון מטמון מגרסה קודמת (ללא `linkLabel`) וניקויו המיידי.
* **מבנה אקורדיון בלעדי (Exclusive Accordion):** פתיחת קטגוריה כלשהי סוגרת אוטומטית את שאר הקטגוריות הפתוחות (גם בדסקטופ וגם במובייל).
* **קטגוריית Q&A ו-Essentials:** כרטיסיות פתוחות וישירות ללא רובריקות כפולות נפתחות.
* **מתגים עליונים ללא גלילה (Zero Scroll):** 3 עמודות שוות (`📍 Jerusalem` | `🌊 Tel Aviv` | `⚡ Essentials`).
* **סנכרון ללו"ז ללא כפילויות:** מיקומי אירועים בלו"ז מוצלבים מול מקומות המדריך ומציגים כפתור פתיחה ישיר ב-Google Maps.

### ג. ארכיטקטורת טיסות ושאלטים בזמן אמת (Live Flights Priority)
* **עדיפות עליונה לגיליון ענת החי:** `getGuestPortalData` קורא ישירות מגיליון הטיסות החי של ענת (`CONFIG.ANAT_SPREADSHEET_ID`), מעל שיקוף המאסטר הסטטי. כל שינוי של ענת מתעדכן בפורטל במיידי.
* **מיפוי יעדים מדויק מתוך `טיסות - שיקוף`:**
  - `Origin / From`: עמודת `יעד הגעה` (טיסת הלוך: מוצא → TLV).
  - `Destination / To`: עמודת `יעד חזרה` (טיסת חזור: TLV → יעד).
* **פיצול נוסעים משותפים (Together With):** שמות מרובים בתא `ביחד עם` מפוצלים אוטומטית לכפתורים אינטראקטיביים נפרדים.
* **פתיחת חלונית אורח בלחיצה:** לחיצה על נוסע שאטל פותחת מיידית (0ms) את כרטיסיית הפרופיל שלו מה-Cache הציבורי, או שולפת אותו בזמן אמת דרך `getGuestByPassengerName` (במקרה של אנשי הפקה כמו עדו המלך).

### ד. מנגנון כרטיסי טיסה כפולים (Dual Flight Tickets: Inbound & Outbound)
* **ריבוי לינקים בתא כרטיס סופי:** תא `לינק לכרטיס סופי` / `לינק כרטיס סופי` (עמודה Y בגיליון `עדכוני טיסות` / `טיסות - שיקוף`, ועמודה M ב`טבלת טיסות`) יכול להכיל לינק בודד או 2 לינקים ל-Google Drive (לכרטיס הלוך וכרטיס חזור בנפרד).
* **מניעת דריסה ע"י סוכן ה-AI (`FlightParser.gs`):**
  - **זיהוי 2 כרטיסים:** אם מנוע הטיסות מזהה 2 לינקים (או יותר) בתא, הפענוח האוטומטי מושבת מיידית ולא רץ. מוצגת הודעת מערכת (Toast) והשדות ב`טבלת טיסות` אינם נדרסים, מה שמאפשר להפקה להזין ידנית את זמני הטיסות ללא הפרעה או קריסה.
  - **בסריקה מרוכזת (`processAllTicketsBulk`):** שורות המכילות 2 לינקים מדולגות אוטומטית כדי להגן על הנתונים הידניים שהוזנו.
  - **בפענוח כרטיס יחיד:** המערכת מעדכנת אך ורק שדות מלאים שחזרו מה-AI ולעולם אינה דורסת שדות חזור קיימים במחרוזות ריקות.
* **תצוגת 2 כפתורים בפורטל (`My Trip` ודשבורד הפקה):**
  - **לינק בודד:** מוצג כפתור יחיד `View E-Ticket (PDF)`.
  - **2 לינקים:** הפורטל מזהה אותם אוטומטית ומציג 2 כפתורים מותאמים זה לצד זה:
    1. `Inbound Ticket (PDF)` - טיסת הגעה לישראל.
    2. `Outbound Ticket (PDF)` - טיסת יציאה מישראל.
  - סדר הלינקים נקבע לפי מילות מפתח בתא ("הלוך"/"חזור", "inbound"/"outbound", "arrival"/"departure"), וברירת המחדל היא שהראשון הוא הלוך והשני חזור.
  - התצוגה הכפולה נתמכת גם בלשונית האורח וגם ב-Modal פרטי האורח בדשבורד ההפקה.

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

### ה. מנגנון מיפוי כותרות דינמי (Dynamic Header-Driven Mapping)
כדי להבטיח יציבות מוחלטת ומניעת שבירת סנכרון בעת שינויים ידניים ב-Google Sheets:
1. **איתור עמודות לפי שם (ולא לפי אינדקס קשיח):**
   * הקוד ב-Apps Script סורק את שורת הכותרות (Row 1) באמצעות `headers.findIndex(...)` ומאתר כל שדה לפי מילות מפתח (`מייל`, `שם מלא`, `מדינה`, `חברה`, `תפקיד`, `סטטוס`, `booking`, `connect`, `press`, `לייקים`, `הערות`, `raw`).
2. **עמידות בשינוי סדר העמודות:**
   * גם אם צוות ההפקה מוסיף עמודה, מזיז עמודות או משנה את סדרן (למשל הוספת עמודות `עיתונות וסיקור` או `סה"כ לייקים`), המערכת מזהה אוטומטית את המיקום הנכון ומזריקה כל ערך בדיוק למקומו.
3. **הזרקת כותרות חסרות אוטומטית:**
   * במידה ועמודות חדשות טרם נוספו לגיליון (כגון בסביבת פרודקשן או בקובץ חדש), המערכת מזהה את החסר ומעדכנת אוטומטית את שורת הכותרות.

### ו. מנגנון השלמה אוטומטית בדיעבד (Historical Raw Data Backfill Engine)
כדי למנוע אובדן נתונים ולאפשר עדכון רטרואקטיבי של שורות ישנות:
1. **שמירת מקור אמת ב-Raw Data:**
   * כל שמירה של אורח שומרת בעמודה האחרונה מחרוזת JSON מלאה (`Raw Data`) הכוללת את כל המועדפים, ההערות והתגיות המדויקות.
2. **חילוץ והשלמה בריצת סנכרון מלאה (`syncAllArtistsAndLeads`):**
   * בעת לחיצה על "⚡ Run Full Sync", המערכת עוברת על כל השורות הקיימות בגיליון `העדפות אורחים`.
   * במידה ונמצא כי עמודות `עיתונות וסיקור (📰 Press)` או `סה"כ לייקים (❤️)` ריקות עבור אורח שכבר ביצע בחירות בעבר, המערכת מחלצת את המידע מתוך ה-`Raw Data` ומאכלסת את התאים ישירות בגיליון ללא צורך בהתערבות האורח.

### ז. תאימות וסימטריה מלאה בצינור הלידים (Symmetrical Leads Pipeline)
קיים צימוד סימטרי מלא של 1:1 בין בחירות האורח בפורטל, הרישום בגיליון `העדפות אורחים`, והאגרגציה בגיליון `לידים והזדמנויות אומנים`:
* 🎯 `Booking` ➔ עמודה H באורחים ➔ עמודה E בלידים (בפורמט: `[שם אורח (מדינה - חברה)]`).
* 🤝 `Connect` ➔ עמודה I באורחים ➔ עמודה F בלידים (בפורמט: `[שם אורח (מדינה - חברה)]`).
* 📰 `Press` ➔ עמודה J באורחים ➔ עמודה G בלידים (בפורמט: `[שם אורח (מדינה - חברה)]`).
* ❤️ `Favorites` ➔ עמודה G (שמות) + עמודה K (כמות מספרית) ➔ עמודה H בלידים (סך לייקים).
* ✍️ `Private Notes` ➔ עמודה L באורחים ➔ עמודה I בלידים (בפורמט: `[שם אורח (מדינה)]: הערה`).

### ח. מנגנון פענוח וסינון לוח ההופעות (Festival Timetable Parser & Smart Noise Filtering)
1. **שליפה ישירה מטבלת האקסל הוויזואלית:**
   * הפונקציה `getFestivalTimetableSchedule` ב-`src/ArtistsAPI.gs` קוראת ישירות את הגיליון `שיקוף! - מבנה ליינאפ`.
   * הפונקציה `parseLineupGrid` מפענחת את 6 ימי הפסטיבל, הבמות ושעות המופעים ללא צורך בהזנה כפולה.
2. **הצלבה חכמה מול כלל האמנים (`findMatchedArtist`):**
   * כל אמן עובר נורמליזציה מלאה של אותיות מיוחדות (למשל `BĘÃTFÓØT` -> `beatfoot`), גרשיים, מקפים ורווחים.
   * מילון כינויים ייעודי (`ARTIST_NAME_ALIASES_DICT`) מחבר בין שמות בעברית ובאנגלית לכרטיסיות האמן המלאות (כולל Deswa, BILTEEZ, BĘÃTFÓØT ועוד).
3. **סינון רעשים קפדני (`shouldKeepTimetableItem`):**
   * **אי-הצגת רעשים והערות:** פריטים שאינם אמנים רשמיים נזרקים אוטומטית (כגון סימני שאלה `?`, `B2 מסתובבים`, `אפטרים`, שמות במות כגון `מזקקה?`, `Besarabia?`, הערות מחיר כמו `40/50 ש"ח`, `מופע ראשון`, `מפגש - הרצאה`, הערות שיבוץ צוות וכו').
   * **חריגים מאושרים להצגה ללא אמן תואם:**
     - **פתיחת דלתות:** `דלתות`, `פתיחת דלתות`, `Doors` (מתוקנן לתצוגה דו-לשונית `Doors (דלתות)` עם אייקון 🚪).
     - **סטים של תקלוט / DJ:** `DJ`, `DJ?`, `דיג'יי`, `דיגיי`, `תקלוט` (שומרים מקום עד שמותקן שם הדיג'יי הסופי שיישלף אוטומטית).
     - **אירועים רשמיים:** `קבלת פנים אורחים`, `הפסקה 20 דק`, `שוק דגים`, `Official Delegation Networking & Closing Event`.
4. **הגנה דו-שכבתית (Dual-Layer Shield):**
   * מנגנון הסינון מיושם הן בצד השרת (`ArtistsAPI.gs`) טרם השמירה במטמון `CacheService`, והן בצד הלקוח (`app.js`) בכל פעולות הסינון והרינדור (`renderTimetableShows`, `renderTimetableMasterSwitcher`, `renderTimetableStageSelector`).

---

## 🚀 4. נוהל פריסה ובדיקות (Deployment & Sandbox Workflow)

### א. פריסת Frontend לסביבת Sandbox (אוטומטי ומיידי):
בכל שינוי קוד (HTML, CSS, JS):
1. **דחיפת Git ל-sandbox:**
   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin sandbox
   ```
2. **פריסה ישירה ומיידית ל-Vercel Sandbox:**
   ```bash
   cmd.exe /c "npx --yes vercel deploy --prod --yes"
   ```
   * **מדוע פקודה זו חיונית וקבועה?**
     פרויקט `imsf26sandbox` ב-Vercel מקשר את הדומיין הראשי `https://imsf26sandbox.vercel.app` כ-Production Environment. אם רק דוחפים ל-GitHub, Vercel יוצר Preview Deployment שאינו מעדכן את הדומיין הראשי ודורש התחברות Vercel SSO. הפקודה `vercel deploy --prod --yes` מעדכנת את הדומיין הציבורי בתוך שניות בודדות ללא תלות.

### ב. פריסת צד שרת (Backend Apps Script):
בכל שינוי בקובצי Google Apps Script (`.gs`):
```bash
npx.cmd clasp push -f
npx.cmd clasp deploy -i <DEPLOYMENT_ID> -d "Update description"
```
* **חובה:** תמיד לבצע `clasp deploy` לאחר `clasp push` כדי שה-Web App ישתמש בגרסה החדשה של הקוד ולא בגרסה ישנה השמורה בהפצה.
