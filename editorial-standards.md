# The Press editorial standards

## Core principles
- Publish named bylines, visible dates, and visible corrections notes.
- Put source notes at the end of each major feature.
- Prefer primary documents, official datasets, accountable reporting, and public records.
- Keep long-form features at or above 1,500 words when the subject demands explanation.
- Use only contextually relevant, rights-documented imagery.
- Disclose the use of AI-assisted editorial workflows.

## Corrections
Meaningful factual errors should be corrected on the story page and logged on the sitewide corrections page.

## Photography
Store creator, file page, license, and relevance note for every hero image before publication.

## Writing
Aim for forceful, original prose. Do not imitate specific historical or living writers line for line.

## Illustrated Feature Pacing Standard
- Build illustration-led features from the available art, source needs, and page rhythm instead of forcing a preset page count.
- Use dense factual copy. Every sentence must deliver a fact, definition, source-backed connection, number, public-record detail, historical detail, or concrete reader-useful explanation.
- Place inline source notes at the end of the sentence they support. Do not save all inline citations for the end of a multi-sentence paragraph.
- Remove sentences that only praise the art, announce the mood, defend why an image exists, or repeat a point already made.
- Expand acronyms on first use, including agency names such as Metropolitan Transportation Authority (MTA), New York City Department of Transportation (NYC DOT), Fire Department of the City of New York (FDNY), and New York Police Department (NYPD).
- Match section backgrounds to the palette of the illustration group, but leave image files visually unfiltered. Do not use CSS filters, blend modes, tint overlays, or opacity tricks on images that are meant to be read.
- Size information-rich illustrations large enough for labels, field marks, diagrams, and annotations to be legible on desktop and mobile.
- Give dense or information-rich illustrations an intentional enlargement path, such as click/tap/keyboard access to a full-size lightbox, without automatic hover/focus enlargement, column-spacing changes, or stretched cards.

## Feature Layout Architecture
- Do not place unequal left-column and right-column modules into shared CSS grid rows when the modules should move independently.
- Use `.press-editorial-region` for the parent two-column feature area and `.press-editorial-rail` for each independent vertical rail.
- Each `.press-editorial-rail` must use `display:flex`, `flex-direction:column`, and a consistent 20-32px visual gap.
- Consecutive modules in the same visual column should not have unexplained gaps larger than 40px at desktop feature widths.
- Cards, figures, ledgers, and copy blocks must end with their content. Do not stretch cards to match neighboring modules.
- Only intentionally full-width elements should use `.press-editorial-full` and wait until both columns have ended.
- Do not fix pacing with filler copy, placeholder blocks, negative margins, transforms, absolute positioning, overlap hacks, card stretching, or `grid-auto-flow:dense` as the only solution.
- Remove unnecessary fixed heights, `height:100%`, content-card `min-height`, grid-row assignments, and stretch rules from affected feature modules.
- Verify major feature layouts with a browser screenshot at desktop and mobile sizes after rebuilding. Use a cache-busted URL when checking a page already open in the in-app browser.
