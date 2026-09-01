## ✨ Added

- File explorer now renders PDF, XLSX, and DOCX files directly in the frontend.
- PPTX preview renders actual slide thumbnails via `pptx-preview`, replacing the previous "not supported" message, with a slide thumbnail rail added for navigation.

## 🔄 Changed

- Replaced the Radix UI toast implementation with sonner for improved toast management.
- justfile now uses cargo watch for automatic backend recompilation.

## 🐛 Fixed

- Fixed the debounce ref type in hooks to use `ReturnType<typeof setTimeout>`.
