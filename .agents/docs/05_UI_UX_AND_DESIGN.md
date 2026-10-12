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

