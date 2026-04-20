# Glassleaf Product Plan

## Vision

Build a personal ebook cloud that feels closer to Apple Books than to a typical admin dashboard:

- calm surfaces
- typography-first reading
- layered glass depth
- touch-native controls
- fast return to the exact place a reader stopped

## Information Architecture

- `Home`: continue reading, recent books, quick stats
- `Library`: search, filter, grid/list switch, fast reopen
- `Reader`: immersive reading surface, appearance controls, bookmarks, notes
- `Upload`: drag/drop or tap-to-upload, parse feedback, latest imports
- `Profile`: account state, sync summary, reading defaults
- `Auth`: sign in / sign up

## Layout Strategy

### Mobile

- bottom navigation
- full-screen reader
- sheets for contents, bookmarks, notes, and appearance
- touch targets sized for one-handed use

### Desktop

- left sidebar navigation
- wide reading canvas
- persistent or semi-persistent side drawer
- denser library browsing layouts

## Reader Interaction Model

- Tap the reading canvas to show or hide chrome.
- Use left and right edge zones for previous and next navigation.
- Keep explicit buttons for every important gesture so the reader never depends only on touch behavior.
- Save progress continuously with a small debounce instead of waiting for manual confirmation.
- Use bookmarks for location memory and notes for content memory.

## Performance Priorities

- Lazy-load heavy reader code by format.
- Keep EPUB parsing lightweight on upload by extracting metadata first.
- Stream or blob-load book files only when a reader opens them.
- Split format readers into separate chunks.
- Use a fast initial shell for Home and Library before deeper content arrives.

## P0 Scope

- authentication
- upload and library storage
- EPUB, PDF, TXT, MD support
- responsive library UI
- reader surface
- bookmarks
- notes
- progress sync

## P1 Scope

- richer EPUB table of contents jumping
- cover extraction and richer metadata preview
- better recent-reading analytics
- batch library actions

## P2 Scope

- dual-page desktop mode
- highlight color presets
- export or share annotations
- deeper reading statistics
