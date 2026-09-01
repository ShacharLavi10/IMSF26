# IMSF 26 - Design Rules & Guidelines

## 1. Project Overview
This project is built using Google Apps Script (GAS) and HTML/CSS/JS for Web App interfaces.

## 2. Architecture & File Structure
- `src/Config.gs`: Application constants, environment variables, configuration parameters, and settings.
- `src/SyncEngine.gs`: Logic for synchronization, external API integrations, background processing, and batch actions.
- `src/PortalBackend.gs`: Core server-side API functions handling web request endpoints (`doGet`, `doPost`) and UI backend routines.
- `src/FileServices.gs`: Google Drive file operations, document creation, export, and file management functions.
- `src/Index.html`: Frontend HTML interface for the Web App.

## 3. Code Standards & Style Rules
- **Naming Conventions**: Use camelCase for variables and functions, PascalCase for classes/types, UPPER_SNAKE_CASE for configuration constants.
- **Error Handling**: Wrap external calls and spreadsheet/drive operations in `try...catch` blocks with clear error logging.
- **Performance**: Minimize calls to SpreadsheetApp/DriveApp; batch read/write operations wherever possible.
- **Security**: Validate all inputs from `Index.html` on the backend (`PortalBackend.gs`). Never expose service accounts or sensitive credentials in client-side code.

## 4. UI/UX & Mobile-First Guidelines
- **Mobile-First Priority**: All UI components, pages, forms, buttons, cards, typography, and information hierarchy must be designed, structured, and optimized for mobile smartphone screens first. The primary user journey happens on mobile during the festival.
- **Touch Ergonomics & Usability**: Interactive elements (buttons, inputs, dropdowns, tabs) must have generous touch targets (minimum 44x44px), readable typography without zooming, comfortable spacing, and zero unwanted horizontal scrolling on mobile devices.
- **Language & Localization (Strict English-Only)**: All UI copy, headings, labels, button text, error messages, system announcements, and placeholders must be strictly in English. No Hebrew text in the portal interface. If there is any doubt or question regarding phrasing or wording, ask for clarification.
- **Progressive Enhancement**: Desktop layouts should scale cleanly and make smart use of wider screens, but never at the expense of mobile simplicity, speed, or ergonomics.
