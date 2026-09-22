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
