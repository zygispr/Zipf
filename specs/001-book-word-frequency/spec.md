# Feature Specification: Book Word Frequency Counter

**Feature Branch**: `001-book-word-frequency`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "I want to create a web application which would work as a word frequency counter for books. User should be able to upload a digitalized book into the website (it would not be saved anywhere) and then the application would count the frequency of the word and also visualize it. The design should be colorful with smooth animations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a book and see its word frequencies (Priority: P1)

A reader, student, or writer opens the website, selects a digital book file from their device (by
browsing or dragging it onto the page), and within moments sees a ranked list of the words in the
book with how many times each appears. Key totals are shown alongside: total words, number of
distinct words, and the most frequent word.

**Why this priority**: Counting word frequency is the core value of the product. Without it,
nothing else (visualization, filtering) has meaning. This story alone is a usable MVP.

**Independent Test**: Upload a known sample book whose word counts are already known; verify the
ranked list and totals match the expected counts exactly.

**Acceptance Scenarios**:

1. **Given** the user is on the home page, **When** they select or drop a supported book file,
   **Then** the system shows a processing indicator and then a ranked list of words with their
   counts, sorted from most to least frequent.
2. **Given** a book has been analyzed, **When** the user looks at the summary, **Then** they see
   total word count, distinct word count, and the top word with its count.
3. **Given** the text contains "The", "the", and "THE", **When** it is analyzed, **Then** all three
   are counted as the same word.
4. **Given** the text contains punctuation attached to words (e.g. "end." or "\"Hello,\""),
   **When** it is analyzed, **Then** punctuation is not part of the counted word.
5. **Given** the user has uploaded a book, **When** they close or reload the page, **Then** no
   trace of the book or its results remains, and nothing was saved anywhere.

---

### User Story 2 - Explore frequencies visually (Priority: P2)

After analysis, the user explores the results through colorful, animated visualizations that make
patterns in the book's vocabulary easy to see at a glance, including how closely the book follows
Zipf's law (a word's frequency is roughly inversely proportional to its rank).

**Why this priority**: Visualization is the second half of the user's stated goal and the main
source of delight, but it depends on the counts from Story 1.

**Independent Test**: Using a book with known counts, verify each visualization reflects the same
data as the ranked list, and that switching between visualizations animates smoothly.

**Acceptance Scenarios**:

1. **Given** a book has been analyzed, **When** results appear, **Then** a chart of the top words
   (by default the top 25) animates into view, with each word's bar or element sized by its count.
2. **Given** results are displayed, **When** the user switches visualization type, **Then** the
   view transitions smoothly to the new visualization without a page reload. Available types:
   (a) bar chart of top words, (b) word cloud with word size proportional to count, and
   (c) Zipf's law chart plotting rank against frequency with the ideal Zipf curve overlaid.
3. **Given** a visualization is displayed, **When** the user hovers over or taps a word element,
   **Then** the exact word, count, rank, and percentage of total words are shown.
4. **Given** the user prefers reduced motion in their device settings, **When** visualizations
   appear or change, **Then** animations are minimized or replaced with instant transitions.
5. **Given** the Zipf's law chart is displayed, **When** the user views it, **Then** the book's
   actual rank–frequency points and the ideal Zipf curve are shown in distinct colors with a
   legend, so the user can see how closely the book follows Zipf's law.

---

### User Story 3 - Refine and search the results (Priority: P3)

The user tailors the results to what interests them: hiding very common words (such as "the",
"and", "of"), choosing how many top words to show, and searching for a specific word to see its
count and rank.

**Why this priority**: Improves usefulness for deeper exploration, but the product is valuable
without it.

**Independent Test**: With a known book loaded, toggle common-word filtering, change the number of
top words, and search for specific words; verify the list and visualizations update correctly.

**Acceptance Scenarios**:

1. **Given** results are displayed, **When** the user turns on "Hide common words", **Then**
   common function words are removed from the list and visualizations, and the ranking updates;
   turning it off restores them.
2. **Given** results are displayed, **When** the user changes the number of top words shown
   (e.g. 10, 25, 50, 100), **Then** the list and visualizations update with an animated
   transition.
3. **Given** results are displayed, **When** the user searches for a word that appears in the
   book, **Then** its count and rank are shown; **When** the word does not appear, **Then** the
   user is told it was not found.
4. **Given** results are displayed, **When** the user chooses to analyze another book, **Then**
   the current results are cleared and the upload screen is shown again.

---

### User Story 4 - Export the results (Priority: P4)

The user downloads the word frequency table so they can use it elsewhere (e.g. in a spreadsheet).

**Why this priority**: Useful for students and researchers, but optional for the core experience.

**Independent Test**: Export results for a known book and verify the downloaded file contains every
word and count matching the on-screen data.

**Acceptance Scenarios**:

1. **Given** results are displayed, **When** the user chooses "Download results", **Then** a
   spreadsheet-compatible file with columns for rank, word, count, and percentage is saved to
   their device, reflecting the current filter settings.

---

### Edge Cases

- **Unsupported file type**: The user is told which formats are supported; nothing is processed.
- **File too large** (over the size limit): The user is told the limit before any processing
  starts.
- **Empty or text-less file** (e.g. a scanned book with images only, or a blank file): The user is
  told no readable words were found.
- **Corrupted or password-protected file**: The user sees a clear message that the file could not
  be read and is invited to try another file.
- **Non-English text and accented characters** (e.g. "café", "naïve", Cyrillic, Greek): Words are
  counted correctly as whole words; letters are not split or dropped.
- **Hyphenated words and contractions** ("well-known", "don't", "it's"): Treated as single words.
- **Numbers** ("1984", "42"): Not counted as words.
- **Very small text** (fewer distinct words than the selected top-N): All words are shown without
  errors or empty placeholders.
- **User uploads a second file while the first is still processing**: The first analysis is
  cancelled and the new file is processed.
- **Long processing**: Progress is shown, and the page stays responsive (the user can cancel).

## Requirements *(mandatory)*

### Functional Requirements

**Upload & privacy**

- **FR-001**: Users MUST be able to choose a book file from their device via a file picker and by
  dragging and dropping it onto the page.
- **FR-002**: System MUST accept book files in plain text (.txt) and EPUB (.epub) formats. For
  EPUB, only the book's readable body text is counted (markup and metadata are excluded).
- **FR-003**: System MUST accept files up to 50 MB and reject larger files with an explanatory
  message before processing.
- **FR-004**: The book's contents MUST NOT be stored, uploaded to, or transmitted to any server or
  third party; analysis MUST happen on the user's own device, and all book data MUST be discarded
  when the user leaves or reloads the page or starts a new analysis.
- **FR-005**: System MUST state the privacy guarantee of FR-004 clearly on the upload screen.
- **FR-006**: System MUST NOT require an account, sign-in, or any personal information.

**Counting**

- **FR-007**: System MUST count every word occurrence in the book's readable text and present
  words ranked by count, highest first; ties MUST be ordered alphabetically.
- **FR-008**: Word matching MUST be case-insensitive and MUST ignore surrounding punctuation.
- **FR-009**: Hyphenated words and contractions MUST be counted as single words; standalone numbers
  MUST NOT be counted as words.
- **FR-010**: Word recognition MUST work for letters from any alphabet, including accented and
  non-Latin characters.
- **FR-011**: System MUST show summary statistics: total words, distinct words, and the most
  frequent word with its count.
- **FR-012**: For each word, the system MUST show its rank, count, and percentage of total words.

**Visualization & design**

- **FR-013**: System MUST visualize the top words (default 25) as an animated chart that matches
  the counts in the ranked list exactly.
- **FR-014**: System MUST offer three visualization types: a bar chart of top words, a word cloud
  (word size proportional to count), and a Zipf's law chart (rank against frequency for all
  words, with the ideal Zipf curve overlaid). Users MUST be able to switch between them with
  smooth animated transitions.
- **FR-015**: Hovering over or tapping any visual word element MUST reveal its word, count, rank,
  and percentage.
- **FR-016**: The interface MUST use a vibrant, multi-color palette and smooth animations for page
  transitions, the processing state, and appearance of results, while keeping all text legible
  with sufficient contrast.
- **FR-017**: System MUST respect the user's reduced-motion preference by minimizing animations.
- **FR-018**: The interface MUST be fully usable on desktop and mobile screen sizes and with a
  keyboard alone.

**Refinement & export**

- **FR-019**: Users MUST be able to toggle hiding of common words (stop words) for the book's
  language; the setting MUST be off by default so the raw counts are shown first.
- **FR-020**: Users MUST be able to choose how many top words are shown (10, 25, 50, or 100).
- **FR-021**: Users MUST be able to search for a word and see its count and rank, or a "not found"
  message.
- **FR-022**: Users MUST be able to download the full frequency table (rank, word, count,
  percentage) as a spreadsheet-compatible file, reflecting the current common-word setting.
- **FR-023**: Users MUST be able to start over with a new book, which clears all current results.

**Feedback & errors**

- **FR-024**: System MUST show an animated progress indicator while a book is being processed and
  allow the user to cancel processing.
- **FR-025**: System MUST show a clear, plain-language message for unsupported, oversized, empty,
  corrupted, or protected files, explaining what to do next.

### Key Entities

- **Book (in-session only)**: The file the user provides; has a name, format, size, and extracted
  readable text. Exists only in the current page session and is never stored.
- **Word Entry**: A distinct normalized word with its count, rank, and percentage of total words.
- **Frequency Result**: The full set of Word Entries for a book plus summary statistics (total
  words, distinct words, top word), and the current view settings (common-word filter, top-N,
  selected visualization).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a typical novel (about 100,000 words), results appear within 3 seconds of
  selecting the file on a mid-range laptop, and within 6 seconds on a mid-range phone.
- **SC-002**: Word counts match a manually verified reference count for test books with 100%
  accuracy under the rules in FR-008 to FR-010.
- **SC-003**: A first-time user can go from landing on the site to seeing visualized results in
  under 30 seconds without instructions.
- **SC-004**: At least 90% of test users successfully upload a book and interpret its top words on
  their first attempt.
- **SC-005**: Animations and visualization transitions play smoothly with no visible stutter on a
  mid-range laptop and phone, and the page never becomes unresponsive during processing.
- **SC-006**: Zero bytes of book content are sent from the user's device during an analysis, as
  verified by observing all network traffic during testing.
- **SC-007**: In usability feedback, at least 80% of test users describe the design as attractive
  or enjoyable.

## Assumptions

- Target users are readers, students, writers, and language learners who own or have legal access
  to digital copies of books; the product does not provide or distribute books.
- Only one book is analyzed at a time; comparing multiple books is out of scope for this release.
- A "word" is a sequence of letters, optionally including internal hyphens or apostrophes; numbers
  and symbols are ignored. Words are not reduced to dictionary forms (e.g. "run" and "running" are
  counted separately).
- Common-word (stop word) lists are provided at least for English; for other languages the toggle
  may be unavailable.
- Scanned books containing only images of pages are out of scope (no text recognition).
- PDF and other formats (e.g. .docx, .mobi) are out of scope for this release; DRM-protected EPUB
  files cannot be read and are reported as protected files.
- The ideal Zipf curve is the classic form in which frequency is inversely proportional to rank,
  scaled to the book's most frequent word.
- No user accounts, history, or saved sessions; results last only for the current page session.
- Users have a modern web browser; the site may be loaded over the internet, but book processing
  does not require a connection once the page is loaded.
- Default performance targets from the project constitution apply where this spec is silent.
