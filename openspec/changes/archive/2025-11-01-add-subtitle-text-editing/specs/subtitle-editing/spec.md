## ADDED Requirements

### Requirement: Subtitle Text Editing
The system SHALL allow users to edit the text content of subtitle entries.

#### Scenario: User edits subtitle text in edit mode
- **WHEN** user enters edit mode for a subtitle entry
- **THEN** the system SHALL display a text input field containing the current subtitle text
- **AND** the user SHALL be able to modify the text content
- **AND** upon saving, the system SHALL persist the edited text to IndexedDB
- **AND** the edited text SHALL be immediately visible in the SubtitleList component

#### Scenario: Edited text persists across sessions
- **WHEN** user edits subtitle text and saves
- **AND** the user navigates away from the play page or refreshes the application
- **THEN** the edited text SHALL remain in the database
- **AND** when the user returns to the play page, the edited text SHALL be displayed

#### Scenario: Text editing integrates with existing timing editing
- **WHEN** user enters edit mode for a subtitle entry
- **THEN** the system SHALL allow editing both text content and timing (start/end times) in the same edit session
- **AND** saving SHALL persist both text and timing changes together

