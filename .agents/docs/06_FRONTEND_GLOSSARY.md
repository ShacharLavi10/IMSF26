# 06 - FRONTEND GLOSSARY

## שפה משותפת ומבנה דפי הפורטל (Portal Pages Glossary)

כדי לייעל את התקשורת סביב ממשק האורח (Guest Portal), הוגדרה מערכת מונחים ושמות אחידה המשקפת את המבנה בקוד (`index.html`):

1. **🔑 מסך התחברות (Login Screen)**
   * **תפקיד:** הדף הראשון שהאורח רואה להזנת כתובת אימייל.
   * **מזהה בקוד:** `#login-section`

2. **📝 מסך השלמת פרטים (Onboarding / Missing Details Page)**
   * **תפקיד:** פאנל ביניים המוצג **רק** אם חסרים פרטים לאורח (isComplete = false). מכיל את הצ'קליסט וממשקי ההעלאה של המסמכים החסרים (ביוגרפיה, דרכון, תמונה).
   * **מזהה בקוד:** `#checklist-card`, `#bio-card`, `#passport-card`, `#photo-card`

3. **📱 הפורטל המלא (The Main Portal Views)**
   המסך המרכזי שמוצג לאחר השלמת כל הפרטים. מחולק ל-5 לשוניות (Tabs) לניווט אינטואיטיבי ומותאם למובייל:
   * 📅 **לשונית לו"ז (Itinerary Tab):** מציגה את לוח הזמנים היומי של הפסטיבל בחלוקה לימים (`#tab-schedule`, `#schedule-card`).
   * 🧳 **לשונית מסע אישי (My Trip Tab):** מאחדת במקום אחד את פרטי הטיסה, כרטיס סופי, שאטלים, ואת שיבוצי המלונות בירושלים ותל אביב (`#tab-mytrip`, `#mytrip-card`).
   * 🧭 **לשונית מדריך והמלצות (Guide Tab):** קונסיירז' דיגיטלי הכולל מתגים ל-Jerusalem, Tel Aviv, ו-Essentials (ברים, מסעדות, לוקיישנים, אפליקציות מוניות, קישורי תשלום ו-FAQ) עם קישור ישיר ל-Google Maps (`#tab-guide`, `#guide-card`, `#guide-pending-container`). מותנה בסימון עמודת 'אישור כללי' בגיליון אורחים.
   * 🤝 **לשונית אורחים (Delegates Tab):** מנוע חיפוש וסינון רשימת כלל האורחים בפסטיבל (`#tab-directory`, `#directory-card`).
   * 🎸 **לשונית אמנים (Artists Tab):** אזור להצגת ליין-אפ האמנים, ז'אנרים, מועדפים והערות אישיות (`#tab-artists`, `#artists-card`).

4. **🪟 חלוניות צפות ומודאלים (Modals & Bottom Sheets)**
   * 👤 **חלונית פרופיל אורח (Guest Bottom Sheet):** חלונית תחתונה מודרנית הנפתחת הן מלשונית האורחים והן בלחיצה על נוסע בשאטל, ומציגה פרטי קשר, תמונה, תפקיד, חברה וביוגרפיה (`#guest-bottom-sheet`, `#guest-sheet-overlay`).
   * 🏷️ **כפתור נוסע בשאטל (Shuttle Passenger Badge):** כפתור אינטראקטיבי לחיץ הנושא אייקון נוסע ושם (`.shuttle-passenger-badge`), הפותח מיידית את חלונית פרופיל הנוסע.
   * 🛠️ **חלונית ניהול אורח (Admin Guest Sheet):** מודאל מנהל מקיף עבור הפקה בלבד לצפייה בטפסים, וואטסאפ והתחזות (`#admin-bottom-sheet`, `#admin-overlay`).
   * 🧭 **רכיבי מדריך (Guide Components):** מתג 3 עמודות ללא גלילה (`#guide-city-switcher`), קוביית מקום קומפקטית (`.guide-place-row`), וכפתור ניווט מהיר (`.guide-maps-btn`).
   * 🏨 **כרטיסיית מפרט מלון (Hotel Spec Card):** תצוגת פרטי מלון מעוצבת בטבלה נקייה וניאו-ברוטליסטית (`.hotel-spec-card`, `.hotel-map-btn`).

5. **🎸 רכיבי לשונית אומנים ונטוורקינג (Artists & Networking Components)**
   * **כרטיסיית אמן בגריד:** `.artist-card`, כפתור לב מהיר `.fav-btn-inline`.
   * **חלונית תחתונה לאמן:** `#artist-bottom-sheet`, `#artist-sheet-overlay`.
   * **תגיות כוונות מהירות (Quick Intent Tags):** `.sheet-intent-tags`, `.sheet-intent-tag-btn` (כולל `data-tag="Booking"`, `data-tag="Connect"`, `data-tag="Press"`, `data-tag="General Note"`).
   * **הערה אישית של האורח:** `#sheet-private-note` (שמירה אוטומטית בהשהיה של 3.5 שניות).
   * **אינדיקטור סטטוס שמירה:** `#sheet-save-status` (מציג `Saving...` / `Saved ✓`).
   * **פילטרים עליונים:** `#artist-search`, `#clear-artist-search-btn`, `#artist-genre-filter`, כפתור מועדפים בלבד `#artist-fav-filter-btn`.
   * **מזוודת ייצוא אישית:** `#export-briefcase-container`, `#export-briefcase-btn` (מציג את האומנים שאהב).

6. **📊 רכיבי דשבורד הפקה לנטוורקינג (Admin Lineup & Networking Leads)**
   * **תיבת חיפוש וסינון לידים:** `#admin-networking-search` (חיפוש לפי אמן, ז'אנר, מדינה, בוקר או הערה).
   * **רשימת כרטיסי לידים:** `#admin-networking-list`.
   * **כפתור סנכרון וחישוב מחדש:** `#admin-sync-leads-btn` ("⚡ Run Full Sync" - מפעיל `triggerFullLeadsSync()`).

7. **📅 רכיבי לשונית לו"ז הפסטיבל (Itinerary / Schedule Components)**
   * **לשונית לו"ז בניווט הראשי:** `#tab-schedule` (כפתור הטאב בראש הפורטל), `#schedule-card` (מעטפת הקארד הראשית).
   * **סרגל ניווט שבועי (Calendar Week Strip):** `#schedule-days-nav` (קונטיינר אופקי מלא ללא גלילה אופקית).
   * **כפתור יום שבועי (Day Pill):** `.schedule-pill` (לחיץ, מקבל קלאס `.active`), מורכב מ:
     * `.day-weekday`: שם היום המקוצר באנגלית (`TUE`, `WED`, `THU`...).
     * `.day-num`: מספר היום בחודש בגופן בולט (`17`, `18`, `19`...).
   * **מיכל אירועי היום:** `#schedule-container`.
   * **רשימת האירועים היומית:** `.schedule-events-list` (מבנה Flex אנכי קומפקטי עם רווח מותאם של 7-8px).
   * **כרטיסיית אירוע (Event Card):** `.schedule-event-inline` (מבנה שורה עדין, רקע לבן, פס סלמון שמאלי).
   * **תגית שעה (Time Badge):** `.event-time` (גלולת זמן אלגנטית), מורכבת מ:
     * `.time-part`: שעת התחלה / שעת סיום (למשל `17:30`).
     * `.time-dash`: מקף מפריד קומפקטי (`-`).
   * **פרטי האירוע (Event Details):** `.schedule-event-details` (מיכל הכותרת והתוכן).
   * **שורת כותרת ותגיות:** `.schedule-title-row`.
   * **כותרת האירוע:** `.event-title` (גופן Oswald נקי).
   * **תגית קטגוריה:** `.schedule-cat-badge` (נושאת מאפיין `data-category` ואייקון אמוג'י סמנטי).
   * **כפתור קישור למיקום:** `.schedule-loc-link` (קישור חיצוני ישיר למפה עם אייקון Map Pin).
   * **תיאור האירוע:** `.event-desc` (הנחיות, פירוט גרין רום וזמנים באנגלית).
   * **מיכל המתנה (לפני אישור לו"ז):** `#schedule-pending-container` (מוצג כשהלו"ז טרם אושר לאורח).
   * **אנימציית טעינה:** `#schedule-loader-container`.

10. **לשונית מידע והמלצות (Guide & Recommendations Tab):**
    * **כרטיסיית הלשונית:** `#guide-card`.
    * **סרגל בחירת אזור:** `#guide-pills-nav`.
    * **כפתורי אזורים:** `#guide-pill-jerusalem`, `#guide-pill-telaviv`, `#guide-pill-essentials`.
    * **אזור תוכן המדריך:** `#guide-content-area`.
    * **מיכל המתנה (לפני אישור):** `#guide-pending-container`.
    * **אנימציית טעינה:** `#guide-loader`.
    * **אקורדיון קטגוריה:** `.guide-category-accordion` (רכיב `<details>` עם התנהגות בלעדית - פתיחת אחד סוגרת את השאר).
    * **שורת כותרת קטגוריה:** `.guide-category-summary` (כולל אייקון, כותרת עם גלישת שורות בטוחה, מונה פריטים וחץ מסתובב).
    * **רשימת כרטיסיות המלצה:** `.guide-cards-list`.
    * **כרטיסיית המלצה בודדת:** `.guide-item-card` (פתוחה לחלוטין ללא קיפול פנימי נוסף).
    * **חלק תוכן מרכזי:** `.guide-item-main` (שם המקום `.guide-item-name`, תגית `.guide-item-tag`, תיאור `.guide-item-desc`, כתובת ומפה `.guide-item-address`).
    * **כפתור פעולה חכם:** `.guide-map-btn` (דינמי: מציג מלל היפרלינק מותאם אישית או `Maps`, עם אייקון תואם ומגבלת רוחב למניעת שבירה).


