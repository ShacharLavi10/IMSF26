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

11. **🔔 מערכת התראות, הודעות אישיות והודעות כלליות (Messaging & Notifications Suite):**
    * **מודאל הודעות חדשות (Unread Popup Modal):** `#new-message-modal-overlay` (קופץ בכניסה לאורח כשיש הודעה חדשה שלא נפתחה), `#new-message-modal-title`, `#new-message-modal-text`, `.new-message-modal-bell` (אייקון פעמון מונפש), כפתור קריאה ישירה (פותח את תיבת ההתראות ומסמן כנקרא) וכפתור "Later".
    * **פעמון התראות עליון:** `#notification-bell-container`, `#notification-badge` (תגית אדומה `NEW` מונפשת כשיש עדכון חדש).
    * **פאנל התראות אורח (Live Updates Drawer):** `#updates-panel`, `#updates-overlay`, `#updates-body` (רשימת העדכונים הפעילים).
    * **כרטיסיית הודעה לאורח (Update Message Card):** `.update-msg` (כולל וריאנט `.personal` להודעה אישית, עם `cursor: default` וחסינות מלחיצות מקריות), `.update-msg-header`, `.update-msg-time`, `.update-msg-new-badge`.
    * **כפתור מחיקת התראה (Explicit Delete Button):** `.update-msg-footer`, `.update-msg-delete-btn` (כפתור אדום בולט עם אייקון פח והמלל `Delete` להסרת ההתראה).
    * **גריד ניהול הודעות מפוצל (Admin 2-Column Split Grid):** `.admin-msg-split-grid` (צד שמאל כתיבה/עריכה, צד ימין רשימת הודעות פעילות).
    * **ניהול הודעות אישיות בחלונית אורח (Admin Guest Sheet):**
      - `#admin-personal-msg`, `#admin-personal-msg-label`, `#admin-save-msg-btn`, `#admin-cancel-edit-msg-btn`, `#admin-msg-status`.
      - `#admin-personal-status-pill` (מונה הודעות פעילות `X Active` או `NO MESSAGES`).
      - `#admin-active-personal-preview`, `.admin-personal-msg-card` (כרטיסיות הודעה אישית פעילה עם כפתורי ✏️ Edit ו-🗑️ Delete).
    * **מרכז התראות כלליות בדשבורד הפקה (Live Alert Center):**
      - `#admin-alert-msg`, `#admin-alert-mode-label`, `#admin-alert-submit-btn`, `#admin-alert-cancel-btn`, `#admin-alert-status`.
      - `#admin-announcements-count` (מונה הודעות כלליות פעילות).
      - `#admin-announcements-list`, `.admin-announcement-card`, `.admin-announcement-header`, `.admin-announcement-actions`, `.admin-announcement-body`.

12. **🎸 רכיבי לו"ז הופעות ובמות (Shows Timetable & Lineup Schedule Components):**
    * **סרגל ניווט תת-לשוניות בליינאפ:** `.artists-subnav`, `#subtab-artists-directory` ("Artists Lineup"), `#subtab-artists-timetable` ("Shows Timetable").
    * **מעטפת תצוגת הלו"ז:** `#artists-timetable-view`.
    * **סרגל ימי הופעות (Zero-Scroll Days Strip):** `#timetable-days-nav`, `.timetable-day-pill` (כולל `.day-weekday`, `.day-num`, ומצב `.active`).
    * **באנר לוקיישן וזמני פתיחה:** `#timetable-venue-banner`.
    * **שורת חיפוש אומן בלו"ז (Timetable Artist Search):**
      - מיכל חיפוש: `.timetable-search-container`.
      - שדה קלט: `#timetable-artist-search` (חיפוש בזמן אמת לפי שם אמן או כינוי).
      - כפתור ניקוי חיפוש: `#clear-timetable-search-btn`.
      - תפריט תוצאות צף: `#timetable-search-results`.
      - שורת תוצאת חיפוש: `.timetable-search-item` (כולל `.timetable-search-item-avatar`, `.timetable-search-item-name`, `.timetable-search-item-time`, לחיצה עליה מנווטת ישירות לכרטיס המופע ומפעילה פולס).
    * **מתג אב דו-מצבי (Master Switcher):** `#timetable-master-switcher`, `.timetable-master-tabs`, `.master-tab-btn` (מתג 50/50: `[data-mode="all"]` ללו"ז המלא עם מונה הופעות, ו-`[data-mode="favorites"]` ללו"ז מועדפים אישי עם מונה מועדפים).
    * **בורר במות קומפקטי בשורה אחת:** `#timetable-stage-filter-wrapper`, `.timetable-stage-picker.full-width`, `.timetable-stage-select` (מוצג במצב "Full Timetable", מאפשר פילטור לפי במה עם מונה הופעות לכל במה).
    * **מיכל רשימת ההופעות:** `#timetable-shows-container`, `.timetable-shows-list`.
    * **כרטיסיית הופעה בודדת (Concert Card):** `.timetable-show-card` (תצוגת שורה קומפקטית ואלגנטית עם תמונת אמן עגולה/אייקון, פס צבע צדדי, ורקע ניאו-ברוטליסטי נקי).
    * **מרכיבי כרטיסיית הופעה:**
      - תיבת שעה / תגית דיג'יי: `.timetable-time-box` (מציגה `.start-time` ו-`.end-time`, או תגית דיג'יי `DJ SET` / `TBA` עבור דיג'יים ללא שעה מוגדרת באקסל).
      - תמונת אמן / אינדיקטור: `.timetable-avatar-col`, `.timetable-artist-avatar`.
      - גוף המופע: `.timetable-show-body`, שם אמן `.timetable-artist-name`, תגית ז'אנר `.timetable-genre-tag`, תגית פורמט במה `.timetable-format-tag`, תגית מיקום ובמה `.timetable-stage-badge`, תגית מועדף `.timetable-fav-mini-badge`.
      - חץ מעבר לפרופיל אמן מלא: `.timetable-open-arrow`.
    * **קישור קפיצה מתוך חלונית אמן:** `.sheet-showtime-row.clickable`, `.sheet-showtime-link` (בלחיצה מפעיל `jumpToTimetableShow(date, showId, artistId)`).
    * **אנימציית הדגשה עזה בקפיצה (Super-Bold Multi-Wave Pulse):** `.timetable-show-card.highlight-pulse`.
    * **סנכרון חיווי היסטוריית חץ אחורה בדפדפן ובמובייל:** שימוש ב-`#sheet` לפתיחת חלונית אמן וב-`#timetable` לקפיצה ללו"ז, ומעקב אחר `lastOpenedArtistId` לחזרה מושלמת ומדויקת לחלונית האמן בלחיצה על Back.
    * **איפוס גלילה אוטומטי בחלוניות קופצות (Scroll Reset to Top):** בכל פתיחה או סגירה של חלונית אמן (`#artist-bottom-sheet`), אורח (`#guest-bottom-sheet`), מנהל (`#admin-bottom-sheet`) או נטוורקינג (`#networking-bottom-sheet`), גלילת החלונית והמיכל הפנימי שלה (`.sheet-content` / `#admin-modal-content`) מאופסת אוטומטית לראש העמוד (`scrollTop = 0`) כולל הגנה נוספת ב-`requestAnimationFrame` למניעת שימור גלילה בדפדפני מובייל.

13. **📲 רכיבי PWA, אופליין והתקנה למסך הבית (PWA & Offline Components):**
    * **אינדיקטור סטטוס רשת ניאו-ברוטליסטי:** `#offline-status-pill` (צף עדין בראש המסך, מוסתר באונליין, מציג `⚡ Offline Mode • Notes & Timetable Ready` באופליין ו-`✓ Back Online • Synchronizing...` בחזרת רשת).
    * **כפתור התקנה קבוע במסך בית:** `#pwa-action-install-btn`, `.pwa-action-install-btn` ("📲 Add Portal to Home Screen") - מוצג בטאב ה-Home למשתמשי מובייל בלבד.
    * **באנר התקנה עליון:** `#pwa-install-banner`, `.pwa-install-banner`, `.pwa-install-content`, `.pwa-install-icon`, `.pwa-install-text`, `.pwa-install-actions`, `.pwa-install-btn`, `.pwa-dismiss-btn`.
    * **מודאל פופאפ אוטומטי להתקנה (Mobile Only):** `#pwa-prompt-modal-overlay` (מוקפץ לאחר סגירת Welcome modal בטלפונים בלבד), כולל כפתור `INSTALL APP` (`handlePwaModalInstall()`) וכפתור `Later` (`handlePwaModalLater()`).
    * **מודאל הנחיות אייפון (iOS Safari Guide Modal):** `#pwa-ios-modal-overlay`, `.pwa-ios-steps`, `.pwa-ios-step`, `.pwa-step-num` (מציג 2 צעדים פשוטים: Share ⎋ ולאחר מכן Add to Home Screen ⊞).
    * **הגנת דסקטופ כפולה:** הגנה ב-JS (`isMobileDevice()`) וב-CSS (`@media (min-width: 901px) { display: none !important; }`).
