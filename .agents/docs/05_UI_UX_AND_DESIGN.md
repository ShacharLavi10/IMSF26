# 05 - UI UX AND DESIGN

## 1. Code Standards & Style Rules
- **Naming Conventions**: Use camelCase for variables and functions, PascalCase for classes/types, UPPER_SNAKE_CASE for configuration constants.
- **Error Handling**: Wrap API fetch calls and backend spreadsheet/drive operations in `try...catch` blocks with clear error logging and user-friendly visual feedback.
- **Performance**: Minimize DOM reflows, batch Spreadsheet operations on the backend, and optimize image assets.
- **Security**: Validate all inputs on both frontend and backend (`PortalBackend-Vercel.gs`). Never expose service accounts or administrative credentials in client-side code.

## 2. UI/UX & Mobile-First Guidelines
- **Mobile-First Priority**: All UI components, pages, forms, buttons, cards, typography, and information hierarchy must be designed, structured, and optimized for mobile smartphone screens first. The primary user journey happens on mobile during the festival.
- **Touch Ergonomics & Usability**: Interactive elements (buttons, inputs, dropdowns, tabs) must have generous touch targets (minimum 44x44px), readable typography without zooming, comfortable spacing, and zero unwanted horizontal scrolling on mobile devices.
- **Language & Localization (Strict English-Only)**: All UI copy, headings, labels, button text, error messages, system announcements, and placeholders must be strictly in English. No Hebrew text in the portal interface. If there is any doubt or question regarding phrasing or wording, ask for clarification.
- **Progressive Enhancement**: Desktop layouts should scale cleanly and make smart use of wider screens, but never at the expense of mobile simplicity, speed, or ergonomics.

## 3. Visual Identity & Design System (Neo-Brutalism)
The portal follows a specific Indie / Comic / Neo-Brutalist design language inspired by the official 2026 festival poster (Iceberg cassette / underwater).

- **Color Palette**:
  - **Dark Mode (Default - Deep Sea)**: Deep blue gradients (`#0a1626` to `#11233a`) for backgrounds to simulate deep water.
  - **Light Mode (Ice/Sky)**: Ice blue gradients (`#E8F4FA` to `#D6EAF8`).
  - **Accent**: Salmon Pink (`#F1A9A0`) is the primary action color. Use it for CTAs, active states, and highlights.
- **Shadows & Borders (Neo-Brutalism)**:
  - Do NOT use soft, blurred box-shadows.
  - Use solid, opaque block shadows for a "flat 3D" effect (e.g., `box-shadow: 4px 4px 0px rgba(0,0,0,1)`).
  - Use thick, dark borders around interactive elements (`border: 2px solid #000`).
  - Active/Click states should visually "press down" by reducing the box-shadow offset and translating the element (e.g., `transform: translate(4px, 4px)`).
- **Typography**:
  - **Display Font**: Use `Oswald` from Google Fonts for Headings (H1-H5). Headings should use standard casing (Capital letter at the start of words/sentences) for an elegant, readable appearance.
  - **Body Font**: Use standard system sans-serif fonts for clean, readable body text.
- **UI Elements**:
  - Avoid heavy background images. Rely on CSS variables, simple noise overlays (`.bg-layer-noise`), and solid block shadows to convey the indie/comic style efficiently.

## 4. Specific Component Patterns

- **Interactive Shuttle Passenger Badges (`.shuttle-passenger-badge`)**:
  - Compact badges (`padding: 4px 10px`, `font-size: 0.82rem`, `font-weight: 600`).
  - Small person icon (`11px`) with clean typography and no bulky chevrons.
  - Interactive clickable button with cursor pointer and active 3D press-down effect (`transform: translate(2px, 2px)`).
  - Triggers the Delegate / Guest bottom-sheet modal.
- **Zero-Scroll City Switcher (`.guide-city-switcher`)**:
  - CSS Grid with 3 equal columns (`grid-template-columns: repeat(3, 1fr)`).
  - Shortened labels (`📍 Jerusalem` | `🌊 Tel Aviv` | `⚡ Essentials`).
  - Guarantees all 3 tabs are 100% visible on any mobile viewport without horizontal scrolling.
- **Compact Guide Cards (`.guide-place-row`)**:
  - Row layout reducing card height by 55%, enabling 4-5 venues visible per screen without vertical clutter.
  - Direct right-aligned "Open in Maps" button with map icon.
- **Unified Accommodations Spec Card (`.hotel-spec-card`)**:
  - Modern spec card for Arthur Hotel & Cinema Hotel with row-based key-value details, external map button, and high-contrast Neo-Brutalist borders.
- **Artist Intent 2x2 Grid Cards (`.sheet-intent-grid`, `.sheet-intent-card-btn`)**:
  - Compact 2x2 grid tiles for delegate collaboration interest inside the Artist Bottom Sheet:
    - `🎯 Live Booking` (*Shows, tours & festivals*)
    - `🤝 Deals & Industry` (*Labels, publishing & sync*)
    - `📰 Press & Media` (*Interviews & PR coverage*)
    - `🔍 Talent Scouting` (*General interest & scouting*)
  - Tactile Neo-Brutalist styling with active state highlighting (bold 2px black border, Salmon Pink accent background, and subtle translate press-down).
  - Clear micro-copy subtitle and generous touch targets without vertical clutter on mobile screens.
  - Clean real-time save indicator (`#sheet-save-status`) positioned inline without layout jumping.
- **Admin Networking Leads Cards (`#admin-networking-list`)**:
  - Dense, scannable cards displaying artist name, genre, like count (❤️), and dynamic status pills:
    - Tour Match pills (`🟢 Hot: [Countries]`, `🟡 Local Interest: [Country]`, `⚪ No leads yet`).
    - Booking delegates list and private feedback comments with clear author badges.
- **Festival Itinerary & Schedule View (`#tab-schedule`, `#schedule-days-nav`, `.schedule-event-inline`)**:
  - **Zero-Scroll Week Calendar Strip (`#schedule-days-nav`)**:
    - Full-width segmented day switcher (`flex: 1 1 0; min-width: 0;`).
    - Eliminates horizontal scrollbar completely on mobile screens.
    - Each button contains stacked elements: weekday label (`.day-weekday`, e.g. `TUE`, `0.68rem uppercase`) and day number (`.day-num`, `1.15rem Oswald`).
    - Active day pill receives vibrant Salmon Pink background (`var(--accent)`), `#0f172a` text, and soft glow (`box-shadow: 0 2px 8px rgba(241, 169, 160, 0.35)`).
    - Inactive day pills remain clean and subtle (`#ffffff` with `1px solid #e2e8f0` in light mode; dark glass in dark mode).
  - **Delicate Card Framing (`.schedule-event-inline`)**:
    - Modeled after the elegant Artist Bottom Sheet section (`.sheet-section`).
    - Replaces heavy black block-shadows with a clean, delicate `1px solid #e2e8f0` border and pure white background (`#ffffff` in light mode).
    - Features a subtle left accent stripe (`border-left: 3.5px solid var(--accent)`) for brand character and visual anchoring.
  - **Refined Time Badge (`.event-time`)**:
    - Compact vertical pill displaying start and optional end times (`.time-part`, `.time-dash`).
    - Light mode: Gentle warm salmon tint (`rgba(241, 169, 160, 0.13)`) with terracotta typography (`#c25244`) and subtle border (`rgba(241, 169, 160, 0.35)`). Avoids heavy black contrast blocks.
    - Dark mode: Dark glass with `var(--accent)` highlight.
  - **Harmonious Category Badges (`.schedule-cat-badge`)**:
    - Semantic emoji badges with soft pastel colors (`🎸 Concerts`, `🚌 Shuttle`, `🍽️ Food & Drinks`, `🌴 Free Time`, `🧭 Tour`, `🤝 Networking`, `🎉 Party`, `ℹ️ Logistics`).
  - **Direct Location Action Buttons (`.schedule-loc-link`)**:
    - Compact pill button with map pin SVG icon opening the venue's direct link or Google Maps query.
  - **Mobile Density & Compactness**:
    - Horizontal row layout strictly preserved on mobile screens (`flex-direction: row !important`), card padding `8px 10px`, gap `9px`.
    - Compact event height (~50-65px) enables an entire day's schedule (e.g. 4 events on Nov 17) to fit in a single smartphone viewport without vertical scrolling.

- **Guide & Essentials Tab UI (`#tab-guide`, `#guide-container`, `.guide-category-accordion`)**:
  - **Single Exclusive Accordion**:
    - Only one category accordion can be open at a time. Expanding any category collapses all other open categories across both desktop and mobile viewports.
  - **Direct Open Cards for Q&A and Essentials**:
    - All recommendations and FAQ questions render directly as full cards upon opening the category accordion, eliminating redundant nested `<details>` rows.
    - Each card displays venue/item name, category tag, address with pin, full description, and direct action button.
  - **Adaptive Action Buttons (`.guide-map-btn`)**:
    - If cell contains custom hyperlink text (e.g. `Download`, `Tickets`, `Menu`), the button displays that exact text with an external link arrow icon.
    - If only a raw link or coordinate is provided, the button defaults to `Maps` with a map folded-paper icon.
    - Protected with `max-width` and `text-overflow: ellipsis` to prevent mobile overflow on narrow screens.
  - **Mobile Wrap & Overflow Safety**:
    - Category titles set to `white-space: normal; word-break: break-word;` so long names wrap elegantly without getting clipped.
    - Descriptions display full text without `-webkit-line-clamp` cutoff.

- **Artist Cards & Favoriting UX (`.artist-card`, `.artist-fav-badge`)**:
  - Direct heart button on artist cards in the main grid allows one-tap toggling without opening the details modal.
  - In the "Favorites Only" filtered view, heart toggling on the card is disabled to prevent accidental list collapse; unfavoriting requires confirming within the artist modal.

- **Shows Timetable & Jump Navigation UX (`#artists-timetable-view`, `.timetable-master-tabs`, `.timetable-show-card`)**:
  - **Zero-Scroll Week Strip (`#timetable-days-nav`, `.timetable-day-pill`)**:
    - Full-width segmented day switcher with stacked weekday (`.day-weekday`) and date number (`.day-num`).
    - Eliminates unwanted horizontal scrollbars on mobile viewports.
  - **Master Switcher (`.timetable-master-tabs`, `.master-tab-btn`)**:
    - Tactile Neo-Brutalist segmented control split 50/50:
      - `[ ⚡ Full Timetable (${count}) ]`: Shows all concerts across stages.
      - `[ ❤️ My Schedule (${favCount}) ]`: Displays only the delegate's favorited performances for the selected date. Features active coral-red background (`#ff4757`), contrasting counter pill, and a welcoming empty-state card if zero favorites exist on that date.
  - **Single-Line Stage Selector (`.timetable-stage-picker.full-width`, `.timetable-stage-select`)**:
    - Replaced cluttered multi-row pill buttons with an elegant full-width single-line dropdown selector in `Full Timetable` mode.
    - Displays total shows per stage dynamically.
  - **Interactive Jump from Artist Sheet (`.sheet-showtime-row.clickable`, `jumpToTimetableShow`)**:
    - Tapping the showtime section inside the artist modal transitions to the Timetable tab, selects the show date, smoothly scrolls to center the concert card, and fires the **Super-Bold Multi-Wave Pulse** animation.
  - **Super-Bold Multi-Wave Pulse (`.timetable-show-card.highlight-pulse`)**:
    - 3.5s multi-stage pulse with scale (`1.04`), high-contrast glowing aura (`box-shadow: 0 0 35px rgba(241, 169, 160, 0.95)`), 8px accent border stripe, and warm background glow ensuring delegates spot the show card instantly on mobile screens.
  - **Mobile Back Button History Preservation (`#sheet` vs `#timetable`)**:
    - Opening an artist modal sets `window.location.hash = "sheet"`.
    - Tapping "View in Timetable" sets `window.location.hash = "timetable"` without popping history, establishing a forward history entry.
    - Tapping the physical/browser **Back button** from the Timetable returns the delegate directly to the Artists Lineup tab and automatically re-opens the artist modal for `lastOpenedArtistId`.
  - **Timetable Artist Search Bar with Pulse Jump (`#timetable-artist-search`, `#timetable-search-results`)**:
    - Floating search bar positioned right below the venue banner in the Timetable view.
    - Matches artist names and aliases in real time as the user types.
    - Keyboard-friendly: pressing `Enter` selects the top result; `Escape` clears the search.
    - Clicking any result jumps immediately to that performance's day, selects it, scrolls smoothly to the concert card, and triggers the Multi-Wave Pulse highlight.
  - **Named DJs Without Hours (`.timetable-time-box`)**:
    - Named DJs without an assigned hour in the spreadsheet (e.g. `DJ Adi Bareket`, `DJ Ram Malca`) are preserved and sorted to the very end of their respective day.
    - Rendered with an elegant vertical badge: `<span class="start-time">DJ SET</span><span class="end-time">TBA</span>`.
    - In the Artist Sheet and Search dropdown, formatted cleanly as `DJ Set (Time TBA)`.
  - **Strict English Copy for All Timetable Items**:
    - All timetable events, stage names, formats, and notes must be 100% in English with zero Hebrew text (e.g. `Doors Opening` instead of `דלתות`, `DJ Set`, `Welcome Reception`, `Opening Showcase`, `Panel & Talk Session`, `Official Delegation Networking Event`).

- **Modal & Bottom Sheet Scroll Reset Rule (Mandatory)**:
  - Whenever ANY popup sheet or modal (`#artist-bottom-sheet`, `#guest-bottom-sheet`, `#admin-bottom-sheet`, `#networking-bottom-sheet`) is opened or closed, its scroll position AND the scroll position of its inner container (`.sheet-content` / `#admin-modal-content`) **MUST** be explicitly reset to the top (`scrollTop = 0`).
  - A secondary reset inside `requestAnimationFrame` must be executed to prevent mobile browsers (especially iOS Safari and Chrome Android) from retaining or restoring the previous scroll offset.
  - **Rationale**: If a user scrolls down inside an artist or guest profile and closes it, opening a subsequent profile must always start from the top (hero image, artist/guest name, and bio) rather than jumping to the scrolled bottom.

- **PWA & Offline Indicator UX (`#offline-status-pill`, `#pwa-prompt-modal-overlay`, `.pwa-action-install-btn`)**:
  - **Discrete Floating Pill (`#offline-status-pill`)**:
    - Zero vertical footprint while online (`display: none`).
    - Flashes subtle Neo-Brutalist amber badge `⚡ Offline Mode • Notes & Timetable Ready` when disconnected.
    - Turns into a gentle green confirmation `✓ Back Online • Synchronizing...` for 3.5s upon reconnection.
  - **Mobile-Exclusive Install Prompts & Buttons**:
    - Permanent button `#pwa-action-install-btn` (`📲 Add Portal to Home Screen`) and recurring welcome popup modal `#pwa-prompt-modal-overlay` are strictly limited to mobile devices (`isMobileDevice()`).
    - Desktop screens (>900px) completely hide all install buttons, banners, and overlays via `@media (min-width: 901px) { display: none !important; }`.
- **Flights Rubrics & Web Check-In UX (`.flight-rubric-wrap`, `.rubric-subheading`, `.flight-checkin-card`)**:
  - **4 Structured Rubrics with Mini-Headings**:
    To eliminate visual clutter in the Flights section of the "My Trip" tab, all content is strictly organized into 4 standardized rubrics:
    1. `📄 Travel & Border Documents` (Tag: `Documents`): Flight e-tickets and the official Ben Gurion Airport border invitation letter.
    2. `🛫 Online Web Check-In` (Tag: `Important`): Check-in banner, airline notes, booking code copy, airline CTA, and interactive dismissal.
    3. `✈️ Flight Schedule & Routes` (Tag: `Itinerary`): Official flight itinerary / Boarding pass card with inbound and outbound legs.
    4. `🚐 Airport Shuttle & Transfers` (Tag: `Transfer`): Airport shuttle times, meeting points, and fellow passenger badges.
  - **Mini-Heading Visual Specification (`.rubric-subheading`)**:
    - Oswald font, uppercase, letter-spacing `0.5px`, size `0.85rem` to `0.9rem`.
    - Salmon Pink accent bar (`border-left: 4px solid var(--accent)`) anchoring the left edge.
    - Accompanying `.rubric-tag` badge on the right displaying semantic context.
  - **Interactive Web Check-In Card (`.flight-checkin-card`)**:
    - High-visibility banner with custom notes (e.g. "For the return flight with Arkia, no web check in required").
    - **One-Tap Booking Code Copy (`.btn-copy-booking`)**: Code badge accompanied by a copy button with instant "Copied!" visual feedback.
    - **Direct CTA Button (`.checkin-cta-btn`)**: Prominent action button styled with "🛫 Open Web Check-In" linking straight to the airline check-in portal.
    - **Completion Toggle & Smart Collapse (`.checkin-done-checkbox`, `.flight-checkin-collapsed`)**: Checking "I've completed check-in" collapses the bulky card into a compact 32px pill ("Check-in completed ✓") with a discreet "Show details" restore button. State is preserved in `localStorage` under `imsf_checkin_done_<bookingKey>`.
    - **Auto-Expiration Rule**: When `today >= arrivalFlightDate + 1 day`, the entire check-in card is automatically hidden from the DOM to avoid cluttering the guest's view after arrival and throughout festival days.

- **Artist Briefcase Export Modal (`#artist-briefcase-modal`, `.briefcase-action-btn`)**:
  - Neo-Brutalist export dialog offering 3 discrete delivery methods for favorited artists:
    1. `📧 Send to My Email`: Sends a high-res PDF briefcase directly to the delegate's registered email via `GmailApp`.
    2. `📥 Download PDF`: Triggers a direct client download of the PDF file.
    3. `👁️ Preview in Browser`: Opens the PDF in a new browser tab for immediate viewing.
  - Terminology updated from "Band Members" to "Band / Team Members" across all briefcase export cards.
  - Includes a dedicated festival recommendation tip for delegates attending showcase concerts.



