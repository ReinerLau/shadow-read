## Why
Currently, users can edit subtitle timings (start and end times) but cannot modify subtitle text content. Adding text editing capability enables users to correct transcription errors, improve translations, or customize subtitle content for their learning needs, enhancing the overall language learning experience.

## What Changes
- Add text editing capability to subtitle entries
- Extend EditModePopup or create similar UI to allow editing subtitle text
- Update database persistence to save edited text
- Ensure edited text is displayed in SubtitleList immediately after saving

## Impact
- Affected specs: New capability `subtitle-editing` (adds text editing to existing timing editing)
- Affected code:
  - `src/components/EditModePopup.tsx` - Extend to support text editing
  - `src/components/SubtitleList.tsx` - May need to update display logic
  - `src/pages/PlayPage.tsx` - Handle text editing state and save logic
  - `src/services/mediaDatabase.ts` - Already supports subtitle updates via `updateSubtitle()`

