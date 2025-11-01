## 1. Implementation
- [x] 1.1 Extend EditModePopup component to include text input field for editing subtitle text
- [x] 1.2 Update PlayPage to manage edited text state alongside edited time state
- [x] 1.3 Implement save logic to persist edited text to IndexedDB via MediaDatabaseService.updateSubtitle()
- [x] 1.4 Ensure SubtitleList displays updated text immediately after save
- [x] 1.5 Handle edge cases: empty text validation, text that exceeds reasonable length

## 2. UI/UX
- [x] 2.1 Design text input UI that matches existing EditModePopup styling
- [x] 2.2 Ensure text input is accessible and works well on mobile devices
- [x] 2.3 Add visual feedback when text is successfully saved

## 3. Validation
- [ ] 3.1 Test editing text for current subtitle entry
- [ ] 3.2 Verify edited text persists after page refresh
- [ ] 3.3 Verify edited text displays correctly in SubtitleList
- [ ] 3.4 Test editing flow: enter edit mode → modify text → save → verify persistence

