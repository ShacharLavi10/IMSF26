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
   * 💳 **כרטיסיית תשלום ישיר למלון (Hotel Extra Payment Card):** קובייה ייעודית ונפרדת המוצגת מתחת לטבלת המפרט כאשר לאורח יש חוב אישי למלון (`.hotel-extra-payment-card`, `.extra-payment-header`, `.extra-payment-badge`, `.extra-payment-due-tag`, `.extra-payment-amount`, `.extra-payment-currency-ils`, `.extra-payment-breakdown`, `.extra-payment-note`). מציגה "Your Extra Payment" עם סכום דולרי מקורב ושקלים, ופירוט הכיסוי (אקסטרה לילות ו/או `double room upgrade fee`). מוסתרת לחלוטין אם אין תוספת לתשלום.

5. **🎸 רכיבי לשונית אומנים ונטוורקינג (Artists & Networking Components)**
   * **כרטיסיית אמן בגריד:** `.artist-card`, כפתור לב מהיר `.fav-btn-inline`.
   * **חלונית תחתונה לאמן:** `#artist-bottom-sheet`, `#artist-sheet-overlay`.
   * **תגיות כוונות מהירות (Quick Intent Tags):** `.sheet-intent-tags`, `.sheet-intent-tag-btn` (כולל `data-tag="Booking"`, `data-tag="Connect"`, `data-tag="Press"`, `data-tag="General Note"`).
   * **הערה אישית של האורח:** `#sheet-private-note` (שמירה אוטומטית בהשהיה של 3.5 שניות).
   * **אינדיקטור סטטוס שמירה:** `#sheet-save-status` (מציג `Saving...` / `Saved ✓`).
   * **פילטרים עליונים:** `#artist-search`, `#clear-artist-search-btn`, `#artist-genre-filter`, כפתור מועדפים בלבד `#artist-fav-filter-btn`.
   * **מזוודת ייצוא אישית (Artist Briefcase PDF):** `#export-briefcase-container`, `#export-briefcase-btn`, מודאל ייצוא `#artist-briefcase-modal` (כולל שליחה למייל `sendBriefcaseToEmail`, הורדה ישירה `downloadBriefcasePdf`, וצפייה בדפדפן `previewBriefcasePdf`). רישום מועד ההורדה מתועד בעמודת 'מי הוריד PDF' ע"י `recordBriefcaseDownload()`.

6. **📊 רכיבי דשבורד הפקה לנטוורקינג (Admin Lineup & Networking Leads)**
   * **רובריקת כרטיסי סיכום ו-KPIs:** `#admin-networking-kpis` (כולל בורר `Artists / Guests`, כרטיסיות `Lineup Coverage` / `Delegate Engagement` ודירוגי `Top In-Demand / Active`).
   * **מתג מעבר אומנים/אורחים:** `#admin-networking-switcher` (או כפתורי הבורר המשולבים).
   * **תיבת חיפוש וסינון לידים:** `#admin-networking-search` (חיפוש לפי אמן, ז'אנר, מדינה, בוקר או הערה).
   * **רשימת כרטיסי לידים:** `#admin-networking-list` (גריד קוביות אומנים ואורחים).
   * **חלונית פירוט נטוורקינג תחתונה:** `#networking-bottom-sheet` (כולל כפתור העתקת שמות `copyLikedGuestsList`).
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
    * **סנכרון מופעים ליומן והורדת קובץ ICS (Calendar Sync & ICS Export):**
      - כפתור סנכרון בלו"ז: `#calendar-sync-btn` ("📅 Sync My Shows to Calendar").
      - תגית מונה מופעים נבחרים: `#calendar-sync-badge`.
      - מודאל סנכרון: `#calendar-sync-modal-overlay`, מונה מופעים `#calendar-modal-shows-count`, מייל אורח `#calendar-modal-email`.
      - פעולות סנכרון: כפתור הורדת קובץ יומן `#calendar-modal-download-btn` ("Add to Calendar"), כפתור ביטול/הסרה `#calendar-modal-cancel-btn` ("Remove from Calendar"), ומחווני סטטוס/הצלחה `#calendar-modal-status`, `#calendar-modal-success`.

13. **📲 רכיבי PWA, אופליין והתקנה למסך הבית (PWA & Offline Components):**
    * **אינדיקטור סטטוס רשת ניאו-ברוטליסטי:** `#offline-status-pill` (צף עדין בראש המסך, מוסתר באונליין, מציג `⚡ Offline Mode • Notes & Timetable Ready` באופליין ו-`✓ Back Online • Synchronizing...` בחזרת רשת).
    * **כפתור התקנה קבוע במסך בית:** `#pwa-action-install-btn`, `.pwa-action-install-btn` ("📲 Add Portal to Home Screen") - מוצג בטאב ה-Home למשתמשי מובייל בלבד.
    * **באנר התקנה עליון:** `#pwa-install-banner`, `.pwa-install-banner`, `.pwa-install-content`, `.pwa-install-icon`, `.pwa-install-text`, `.pwa-install-actions`, `.pwa-install-btn`, `.pwa-dismiss-btn`.
    * **מודאל פופאפ אוטומטי להתקנה (Mobile Only):** `#pwa-prompt-modal-overlay` (מוקפץ לאחר סגירת Welcome modal בטלפונים בלבד), כולל כפתור `INSTALL APP` (`handlePwaModalInstall()`) וכפתור `Later` (`handlePwaModalLater()`).
    * **מודאל הנחיות אייפון (iOS Safari Guide Modal):** `#pwa-ios-modal-overlay`, `.pwa-ios-steps`, `.pwa-ios-step`, `.pwa-step-num` (מציג 2 צעדים פשוטים: Share ⎋ ולאחר מכן Add to Home Screen ⊞).
    * **הגנת דסקטופ כפולה:** הגנה ב-JS (`isMobileDevice()`) וב-CSS (`@media (min-width: 901px) { display: none !important; }`).

14. **✈️ רכיבי טיסות, צ'ק-אין מקוון ומסמכי מעבר (Flights, Web Check-In & Travel Rubrics Components):**
    * **מעטפת רובריקה תקנית:** `.flight-rubric-wrap` (עוטפת כל אחת מרובריקות הטיסה במרווח אנכי תקני ומבנה נקי).
    * **מיני-כותרת רובריקה מעוצבת:** `.rubric-subheading` (גופן Oswald, אותיות גדולות, פס הדגשה סלמון שמאלי).
    * **כותרת הרובריקה:** `.rubric-title` (למשל `Travel & Border Documents`, `Online Web Check-In`, `Airport Shuttle & Transfers`).
    * **תגית קטגוריה ברובריקה:** `.rubric-tag` (תגית מינימליסטית לצד הכותרת, כגון `Documents`, `Important`, `Transfer`).
    * **רובריקה 1 - מסמכי טיסה ומעבר גבול:**
      - `.flight-documents-actions`: מיכל כפתורי המסמכים.
      - כפתור כרטיס טיסה אלקטרוני: `View E-Ticket (PDF)` או פיצול לשניים `Inbound Ticket (PDF)` ו-`Outbound Ticket (PDF)`.
      - כפתור מכתב הזמנה רשמי לנתב"ג: `.border-invitation-btn` ("📄 Ben Gurion Invitation (PDF)").
    * **רובריקה 2 - צ'ק-אין מקוון וקוד הזמנה:**
      - מעטפת כרטיסיית צ'ק-אין: `.flight-checkin-card`.
      - **מיכל מקטעים מפוצל לשתי טיסות (Dual Check-In):** `.checkin-segments-container`.
      - **כרטיסיית מקטע טיסה ייעודית:** `.checkin-segment-box` (Inbound או Outbound).
      - **שורת כותרת מקטע:** `.checkin-segment-header`, כותרת כיוון הטיסה `.checkin-segment-title` (`🛬 Inbound to Israel` / `🛫 Outbound from Israel`).
      - **תגית חברת תעופה וטיסה:** `.checkin-airline-tag` (למשל `Wizz Air · W6 1234`).
      - שורת קוד הזמנה: `.checkin-code-row`, תווית `.checkin-code-label`, תיבה `.checkin-code-box`, וערך הקוד `.checkin-code-val`.
      - כפתור העתקה מהירה: `.checkin-copy-btn` (כולל חיווי `Copied! ✓`).
      - כפתור פתיחת צ'ק-אין ישיר: `.checkin-action-btn` (לדוגמה `🛫 Open Inbound Check-In (Wizz Air)` או `🛫 Open Web Check-In`).
      - הערת צ'ק-אין ייעודית למקטע: `.checkin-custom-note`.
      - שורת אישור סיום: `.checkin-done-row`.
      - תיבת סימון צ'ק-אין: `#checkin-done-checkbox`, `.checkin-done-label`, `.checkin-done-text`.
      - כרטיס מקופל ומכווץ: `.flight-checkin-collapsed` (מוצג כשהצ'ק-אין בוצע).
      - קישור שחזור פרטים: `.checkin-restore-link` ("Show check-in details").
      - מפתח שמירה ב-`localStorage`: `imsf_checkin_done_<bookingKey>`.
      - מנגנון תפוגה אוטומטי: הסתרה מלאה כאשר `today >= arrivalFlightDate + 1 day`.
      - התניית תצוגה: הרובריקה מוצגת אך ורק כאשר קיים קוד הזמנה (Booking Reference) או קישור צ'ק-אין מקוון (Web Check-In Link). במידה ואין לאורח קוד הזמנה או לינק המשויכים למייל, הרובריקה מוסתרת לחלוטין למניעת כרטיסייה ריקה.
    * **רובריקה 3 - שאטלים והסעות מנתב"ג:**
      - מעטפת כרטיס שאטל: `.shuttle-info-card`.
      - פרטי מפגש וזמנים: הצגת שעת יציאה מנתב"ג.
      - שותפים לשאטל: `.shuttle-passengers-wrap`, `.shuttle-passenger-badge` (לחיץ לפתיחת פרופיל אורח).
    * *(הערת תיעוד: כרטיסיית העלייה למטוס / Flight Schedule & Routes הוסרה מלשונית My Trip ומופיעה כעת רק במודאל פרופיל האורח של ההפקה `.boarding-pass`)*.

* **באנר מופעי לייב גלובלי (Global Live Showcase Banner):**
  - מזהה באנר עליון: `#artists-live-banner` (מוצג בראש כל הלשוניות כשיש מופע חי ברגע זה).
  - מעטפת ראשית: `.live-banner`.
  - כותרת ואינדיקטור פועם: `.live-banner-header`, `.live-indicator`, `.pulse`.
  - מיכל כרטיסי המופעים: `.live-content` (`#live-banner-content`).
  - כרטיס מופע בודד: `.live-show-card` (עם הדגשת `.is-fav` לאמן מועדף).
  - פרטי אמן בבאנר: `.live-card-left`, `.live-card-avatar`, `.live-card-text`, `.live-card-artist`, `.live-card-heart-icon` (`❤️`), `.live-card-meta`, `.live-card-stage`, `.live-card-time`.
  - כפתור פעולה לכרטיס: `.live-card-action`, `.live-card-action-btn` ("View Artist →").

* **סימולטור מופעי לייב לבדיקות (Live Festival Simulator):**
  - כפתור פתיחת סימולטור: `#timetable-sim-trigger-btn` (`.timetable-sim-trigger-btn`, מוצג בלעדית בסביבת `sandbox`).
  - מודאל הסימולציה: `#live-simulator-modal-overlay`.
  - כרטיסי תרחישי בדיקה מהירים: `.sim-preset-grid`, `.sim-preset-card`.
  - בורר תאריך ושעה מותאם: `#sim-custom-date`, `#sim-custom-time`.
  - סרגל אינדיקטור צף פעיל: `#live-sim-active-bar` (`#live-sim-status-text`).

* **לו"ז הפקה ותפעול פנימי (Admin Production Schedule):**
  - אקורדיון ראשי: `#admin-sec-prod-schedule` (`.admin-section-accordion`). כל רובריקות ההפקה (`.admin-section-accordion`) מוגדרות כאקורדיון בלעדי (`name="admin-section"`) - פתיחת רובריקה סוגרת מיידית את שאר הרובריקות (בדומה ללשונית guide), ובכל מעבר/כניסה ללשונית ההפקה כל הרובריקות נסגרות כברירת מחדל. כפתור "רענן לו"ז" הוסר לטובת ממשק נקי.
  - תגית כמות משימות: `#admin-schedule-count-badge` (`.admin-section-badge`).
  - שדה חיפוש משימות: `#admin-schedule-search` (מסנן לפי משימה, מיקום, איש קשר, שעה וקטגוריה).
  - רצועת ימי הפסטיבל: `#admin-schedule-days-nav` (מכיל `.schedule-pill` עם `.day-weekday` ו-`.day-num`).
  - מיכל רשימת האירועים: `#admin-schedule-events-container` (`.schedule-events-list`).
  - כרטיסיית משימה: `.schedule-event-inline` (`.event-time`, `.schedule-event-details`, `.schedule-title-row`, `.event-title`, `.schedule-cat-badge`, `.schedule-loc-link`, `.schedule-contact-btn`, `.event-desc`, `.schedule-inline-link`).

    * **שורת כותרת הכרטיס המנוהלת לפי צ'קבוקס אישור (Approval-Gated Headers):**
      - `.card-header-row` (מיושרת ימינה `justify-content: flex-end`, ברירת מחדל מוסתרת `display: none`).
      - `#card-header-itinerary`: כותרת כפתור לו"ז (מוצג רק כש-`approvalSchedule` מסומן).
      - `#card-header-mytrip`: כותרת כפתור הטיול שלי (מוצג רק כש-`approvalFlights` או `approvalHotels` מסומנים).
      - `#card-header-guide`: כותרת כפתור מדריך והמלצות (מוצג רק כש-`approvalGuide` מסומן).
      - `#card-header-directory`: כותרת כפתור ספר אורחים (מוצג רק כש-`approvalDirectory` מסומן).
      - `#card-header-artists`: כותרת כפתור אומנים (מוצג רק כש-`approvalArtists` מסומן; בהיעדר אישור מוסתרים גם מתגי הליינאפ והטיימטייבל `.artists-subnav-container`).
    * **כפתור פתיחת מדריך בלשונית (Tab Quick Guide Button):** `.tab-quick-guide-btn`, אייקון `.guide-icon` (💡), טקסט `.guide-text`.
    * **טקסט הכפתור לפי לשונית:**
      - `💡 Quick Guide for Itinerary` (לו"ז אירועים)
      - `💡 Quick Guide for My Trip` (הטיול שלי, טיסות ומלונות)
      - `💡 Quick Guide for Guide` (מדריך והמלצות)
      - `💡 Quick Guide for Delegates` (ספר אורחים)
      - `💡 Quick Guide for Artist` (אומנים וליינאפ)
    * **רכיבי ה-DOM של הספוטלייט:**
      - `#tour-spotlight-backdrop`: מסך האפלה סביבתי.
      - `#tour-spotlight-cutout`: חלון חיתוך חי סביב האלמנט המודגש.
      - `#tour-spotlight-popover`: בועית הסבר חכמה (כולל חץ דינמי `.arrow-top` / `.arrow-bottom`).
      - `#tour-popover-badge`: תגית מספר שלב (`STEP X/Y`).
      - `.popover-close-btn`: כפתור סגירה מהירה (`closeTabTour()`).
      - `#tour-popover-title`: כותרת השלב.
      - `#tour-popover-desc`: תיאור קצר והנחיות באנגלית.
      - `#tour-popover-dots`: נקודות התקדמות (`.popover-dot.active`).
      - `#tour-popover-prev`: כפתור שלב קודם (`prevTabTourStep()`).
      - `#tour-popover-next`: כפתור שלב הבא (`nextTabTourStep()`, משתנה ל-`Got It ✓` בסיום).
    * **מזהי DOM ייעודיים לספוטלייט:**
      - `#travel-border-docs-rubric`: רובריקת מסמכי טיסה ומעבר גבול.
      - `#flight-checkin-wrapper`: רובריקת צ'ק-אין מקוון (מוצגת בסיור מותנה בלבד כאשר קיים קוד/לינק צ'ק-אין).
      - `#flight-shuttle-wrapper`: רובריקת שאטלים והסעות (מוצג בסיור מותנה בלבד).
      - `#mytrip-flight-section`: מקטע פרטי טיסות ומסמכים.
      - `#mytrip-accommodations-section`: מקטע מלונות וניווט למפות.
    * **פונקציות ליבה בקוד (`src/app.js`):**
      - `startTabTour(tabKey)`: אתחול והפעלת הסיור לפי שם הלשונית (מוגן ב-`isTourTabLocked(tabKey)`).
      - `isTourTabLocked(tabKey)`: בדיקת נעילת לשונית לפי תיבת ה-Pending הפעילה.
      - `closeTabTour()`: סגירה נקייה וביטול מאזיני גלילה/אנימציה.
      - `nextTabTourStep()`, `prevTabTourStep()`: מעבר שלבים.
      - `renderTabTourStep(stepIdx)`: עדכון תוכן הבועית ומציאת אלמנט המטרה.
      - `updateCutoutAndPopover(targetEl)`: גלילה חלקה של המטרה למרכז המסך.
      - `trackTargetTransition(targetEl, durationMs)`: מעקב רציף ב-60fps למניעת ניתוק הבועית בזמן גלילה או פתיחת חלוניות.
      - `isTourTargetVisible(el)`: בדיקת נראות ממשית של אלמנט ב-DOM.
      - `TAB_TOUR_CONFIGS`: אובייקט הגדרת הצעדים, טקסטים, מטרות ו-lifecycle hooks (`onEnter`, `onLeave`).

14. **🤝 רכיבי לשונית אורחים וסינון נטוורקינג (Delegates Directory & Filter Components):**
    * **כרטיסיית הלשונית הראשית:** `#tab-directory`, `#directory-card`.
    * **קונטיינר מסננים:** `#directory-filters`.
    * **חיפוש חופשי:** `#guest-search`, כפתור ניקוי `#clear-search-btn` (`clearSearch()`).
    * **בורר ז'אנר (Genre Filter):** `#guest-genre-filter` הכולל:
      - `All Genres` (`value="All"`)
      - `Rock, Indie & Electronic`
      - `Jazz & World Music`
    * **בורר מדינה (Country Filter):** `#guest-country-filter` (מאוכלס דינמית מכלל המדינות של האורחים).
    * **סטטוס תוצאות:** `#directory-status` (מציג `Showing X of Y delegates` וכפתור `Clear` לאיפוס מסננים `resetFilters()`).
    * **גריד כרטיסיות אורחים:** `#directory-container` (`.artists-grid`, `.artist-card`).
    * **לוגיקת התאמת Multi-genre (`filterDirectory()`):** אורחים שמוגדרים בגיליון עם `Multi genre` (או `multi`, `both`, `all`, `מולטי`, `הכל`, או שילוב רוק וג'אז) מוצגים **תמיד בכל סינוני הז'אנר** (גם בסינון רוק וגם בסינון ג'אז) מתוך הבנה שהם רלוונטיים לכלל הז'אנרים בפסטיבל.

