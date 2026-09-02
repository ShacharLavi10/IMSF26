# IMSF 26 - Design Rules & Guidelines

## 1. Project Overview
This project is built using a modern decoupled architecture:
- **Frontend**: Vite (Vanilla HTML5 / CSS3 / JavaScript ES6) hosted on **Vercel**.
- **Backend API**: **Google Apps Script** as a headless REST API (`doPost`) reading and writing to Google Sheets and Google Drive.

## 2. Architecture & File Structure (`IMSF 26 VERCEL`)
- `index.html`: Main single-page application structure and views (Landing, Auth, Onboarding, Dashboard Tabs).
- `style.css`: Complete styling rules (Linear dark theme, Glassmorphism, CSS variables, typography, animations, responsive breakpoints).
- `main.js`: Client-side logic, session/OTP management, navigation routing, DOM rendering, and API Polyfill for backend communication.
- `PortalBackend-Vercel.gs`: Google Apps Script API backend receiving JSON actions from Vercel frontend.
- `.env`: Environment variables (e.g. `VITE_GAS_API_URL`).
- `PROJECT_CONTEXT.md`: System-wide vision, roles, architecture, and core development principles.
- `DESIGN_RULES.md`: Design system, code standards, and UI/UX freeze rules.
- `DATA_STRUCTURE_AND_WORKFLOW.md`: Master specification of Sheets, columns, data schemas, and deployment workflow.
- `ENVIRONMENTS_MAP.md`: IDs, URLs, and directory configurations for Production and Sandbox.
- `TASKS_BACKLOG.md`: Prioritized task roadmap and future feature backlog.

## 3. Code Standards & Style Rules
- **Naming Conventions**: Use camelCase for variables and functions, PascalCase for classes/types, UPPER_SNAKE_CASE for configuration constants.
- **Error Handling**: Wrap API fetch calls and backend spreadsheet/drive operations in `try...catch` blocks with clear error logging and user-friendly visual feedback.
- **Performance**: Minimize DOM reflows, batch Spreadsheet operations on the backend, and optimize image assets.
- **Security**: Validate all inputs on both frontend and backend (`PortalBackend-Vercel.gs`). Never expose service accounts or administrative credentials in client-side code.

## 4. UI/UX & Mobile-First Guidelines
- **Mobile-First Priority**: All UI components, pages, forms, buttons, cards, typography, and information hierarchy must be designed, structured, and optimized for mobile smartphone screens first. The primary user journey happens on mobile during the festival.
- **Touch Ergonomics & Usability**: Interactive elements (buttons, inputs, dropdowns, tabs) must have generous touch targets (minimum 44x44px), readable typography without zooming, comfortable spacing, and zero unwanted horizontal scrolling on mobile devices.
- **Language & Localization (Strict English-Only)**: All UI copy, headings, labels, button text, error messages, system announcements, and placeholders must be strictly in English. No Hebrew text in the portal interface. If there is any doubt or question regarding phrasing or wording, ask for clarification.
- **Progressive Enhancement**: Desktop layouts should scale cleanly and make smart use of wider screens, but never at the expense of mobile simplicity, speed, or ergonomics.
