# Project Context

## Purpose
影读 (Shadow Read) is a Progressive Web Application (PWA) designed for language learning through video shadowing practice. The application enables users to:

- Import local video files or YouTube videos
- Add and manage subtitle files (SRT format)
- Practice with synchronized subtitle playback
- Use various playback modes: normal playback, single-sentence pause, and single-sentence loop
- Edit subtitle timings with precise millisecond control
- Record and practice pronunciation
- Adjust playback speed (0.6x, 0.8x, 1.0x)
- Persist playback progress and resume from last watched subtitle

The application works entirely client-side, storing video metadata and subtitles in IndexedDB, and uses File System Access API when available for direct file access.

## Tech Stack

### Core Framework & Language
- **React 19** - UI framework (https://react.dev/)
- **TypeScript 5.8** - Type-safe JavaScript
- **Vite 7** - Build tool and dev server (https://vite.dev/)

### UI & Styling
- **UnoCSS** - Atomic CSS engine (https://unocss.dev/)
- **Tailwind CSS 4** - Utility-first CSS framework (via UnoCSS preset)
- **Ant Design 5** - Desktop UI component library (https://ant.design/)
- **antd-mobile 5** - Mobile UI component library
- **Material Design Icons** - Icon library via @iconify-json/mdi (https://icon-sets.iconify.design/mdi/)

### Routing & State Management
- **React Router 7** - Client-side routing (https://reactrouter.com/)

### Data Persistence
- **IndexedDB** - Client-side database via `idb` library (https://www.npmjs.com/package/idb)
- **SessionStorage** - Fallback storage for browsers without File System Access API support

### Media & Video
- **media-chrome** - Custom media player controls (https://www.npmjs.com/package/media-chrome)
- **youtube-video-element** - YouTube video element wrapper (https://www.npmjs.com/package/youtube-video-element)

### Utilities
- **react-window** - Virtual scrolling for long lists (https://react-window.vercel.app/)
- **srt-parser-2** - SRT subtitle file parser (https://www.npmjs.com/package/srt-parser-2)
- **hash-wasm** - SHA-256 hashing for file deduplication
- **@uidotdev/usehooks** - Custom React hooks collection

### PWA
- **vite-plugin-pwa** - PWA support with auto-update functionality

## Project Conventions

### Code Style
- **Language**: TypeScript with strict type checking
- **Comments**: Use JSDoc format for all functions and variables
- **Console Logging**: **Prohibited** - Do not use `console.log()` or other console methods
- **Icons**: **Only** use Material Design Icons via UnoCSS icon classes (e.g., `i-mdi-icon-name`). Do not use Ant Design icons
- **Naming**: 
  - Components: PascalCase (e.g., `HomePage.tsx`)
  - Functions/variables: camelCase (e.g., `fetchVideos`)
  - Types/interfaces: PascalCase (e.g., `MediaFile`)
  - Constants: UPPER_SNAKE_CASE or object constants (e.g., `PlayModeValues`)
- **File Organization**:
  - Components: `src/components/`
  - Pages: `src/pages/`
  - Hooks: `src/hooks/`
  - Services: `src/services/`
  - Types: `src/types/index.ts`

### Architecture Patterns

#### Component Structure
- **Functional Components**: All components use functional components with React hooks
- **Page Components**: Top-level route components (HomePage, PlayPage)
- **Presentational Components**: Reusable UI components (VideoCard, SubtitleList, etc.)
- **Modal/Popup Components**: Overlay components (ImportVideo, EditModePopup, RecordingPopup)

#### Data Layer
- **Service Layer Pattern**: 
  - `MediaDatabaseService` - IndexedDB operations for videos and subtitles
  - `SessionStorageService` - SessionStorage fallback operations
  - `SubtitleParserService` - SRT file parsing logic
  - `VideoDataService` - Video metadata extraction utilities

#### State Management
- **Local State**: React `useState` for component-level state
- **Custom Hooks**: 
  - `useMediaInit` - Initialize media and load from database
  - `useSubtitleIndexPersist` - Persist and restore subtitle playback position
  - `useLocalVideoImport` - Handle local video file import
  - `useYoutubeVideoImport` - Handle YouTube video import

#### File Handling
- **File System Access API**: Primary method for file access (Chrome/Edge)
- **SessionStorage Fallback**: For browsers without File System Access API support
- **Blob URLs**: Used for video playback from local files
- **File Deduplication**: SHA-256 hashing to prevent duplicate video entries

#### Media Playback
- **Video Elements**: 
  - Custom video element (`youtube-video-element`) for YouTube videos
  - Standard HTML5 video element for local files
- **Media Controller**: `media-chrome` React components for unified player controls
- **Subtitle Synchronization**: Time-based subtitle highlighting and seeking

### Testing Strategy
- **Current Status**: No testing framework configured
- **Future Considerations**: Consider adding Vitest for unit tests and React Testing Library for component tests

### Git Workflow
- **Branching**: Main branch workflow (not specified in detail)
- **Commits**: Standard git commit conventions (not enforced)

## Domain Context

### Video Shadowing
Video shadowing is a language learning technique where learners:
1. Watch videos with subtitles
2. Practice repeating/mimicking the audio
3. Control playback to focus on specific sentences
4. Record themselves to compare pronunciation

### Key Features & Behaviors

#### Playback Modes
- **OFF (关闭)**: Normal continuous playback
- **SINGLE_PAUSE (单句暂停)**: Automatically pause at end of current subtitle, seek back to start on resume
- **SINGLE_LOOP (单句循环)**: Automatically loop current subtitle segment

#### Subtitle Timing
- Subtitles support precise millisecond timing (preciseStartTime, preciseEndTime)
- Users can edit timing in Edit Mode with millisecond precision
- Subtitle entries are indexed and can be navigated (previous/next)

#### Video Sources
- **Local Files**: Imported via File System Access API or file picker
- **YouTube Videos**: Imported via URL, uses `youtube-video-element`

#### Persistence
- Video metadata (name, thumbnail, duration) stored in IndexedDB
- Subtitle data stored in IndexedDB with video association
- Last played subtitle index persisted per video
- Last played timestamp used for sorting videos on homepage

### Operation Modes
- **Video Mode**: Normal video playback
- **Edit Mode**: Edit subtitle timings with precise control
- **Recording Mode**: Record and practice pronunciation (mutually exclusive with other modes)

## Important Constraints

### Browser Compatibility
- **File System Access API**: Required for persistent file access (Chrome/Edge 86+)
- **Fallback**: SessionStorage used when File System Access API unavailable (Safari, Firefox)
- **IndexedDB**: Required for data persistence (widely supported)

### Technical Constraints
- **Client-Side Only**: No backend server, all data stored locally
- **Video Format**: Browser-supported video formats (MP4, WebM, etc.)
- **Subtitle Format**: SRT (SubRip) format only
- **Storage Limits**: Subject to browser storage quotas (typically 50-90% of disk space)

### Code Constraints
- **No Console Logging**: `console.log()` and similar methods are prohibited
- **Icon Restrictions**: Only Material Design Icons allowed, no Ant Design icons
- **JSDoc Required**: All functions and variables must have JSDoc comments

### Performance Considerations
- **Virtual Scrolling**: Used for long subtitle lists via `react-window`
- **Lazy Loading**: Video metadata extracted on-demand during playback
- **Thumbnail Generation**: First frame captured on video load

## External Dependencies

### APIs & Standards
- **File System Access API**: Direct file access (when available)
- **Media Source Extensions**: Video playback capabilities
- **IndexedDB API**: Client-side database storage
- **SessionStorage API**: Fallback storage mechanism

### Third-Party Services
- **YouTube**: Video playback via `youtube-video-element` (no API key required for basic playback)

### Browser APIs Used
- `navigator.storage.estimate()` - Storage quota estimation
- `showOpenFilePicker()` - File selection dialog
- `HTMLVideoElement` - Video playback and metadata extraction
- `Canvas API` - Thumbnail generation from video frames
