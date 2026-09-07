# The Press Studio

This folder turns the static site into a repeatable publishing workflow.

## What controls the site

- `master-edition.json` is the single control file for story metadata, homepage order, section pages, authors, search, and feeds.
- `content/asides/*.html` holds the sidebar modules for each story: key points, table of contents, and reporting notes.
- `content/bodies/*.html` holds the main article body for each story.
- `templates/story-template.html` is the blank story shell for new features.
- `editorial-standards.md` defines the fact-density, source, image, and independent-rail layout rules for future features.
- `build.py` regenerates the public pages.

## Publishing a new story

1. Duplicate `templates/story-template.html` and use it as your drafting shell.
2. Create two files:
   - `content/asides/<slug>.html`
   - `content/bodies/<slug>.html`
3. Add the story metadata to `master-edition.json`.
4. Add the local image file to `assets/`.
5. For illustration-led features, use `.press-editorial-region` with two `.press-editorial-rail` stacks so short modules can move upward independently of taller neighboring modules.
6. Run:

```bash
python studio/build.py
```

## Living article standard

- Every full story should keep `body.page-article`, an `.article` or `.article-shell` wrapper, and an `.article-body` or `[data-article-body]` container.
- Source notes should live in `#source-notes`, `.source-notes`, or `.article-sources` so the Source Board can group the receipts.
- Story headings inside the article body become the Timeline; place and entity lenses come from the local dictionaries in `app.js`.
- `build.py` and the daily automation now include the living kit automatically through `app.js`, so new stories get Place Lens, Share Studio, Source Board, Timeline, Entity Cards, Listen, Focus, Follow Topic, reading memory, and the combined reading-progress/top control without an API.

## Front page and Fantasy

The front page uses `tools/editorial_home.py`, `editorial-home.css`, and `editorial-home.js`. Story metadata and order still come from `master-edition.json` and the live content index. The first configured story is the stable lead; the next two are companion stories. The edition grid adds section filters and a reading list stored on the reader's device. Search loads the full index on demand.

Fantasy uses the existing supplied artwork and story registry. The homepage shows the complete square illustrations and teasers; each reading page shares the front-page masthead and presents its full story below the artwork. Below the Fold is a shelf of links to complete issues. The compact history index is generated from the existing daily-history sources.

Refresh this presentation while preserving reporting pages and live indexes:

```bash
python3 build.py --homepage-only
python3 tools/test_mobile_reading_experience.py
```

The full legacy build also regenerates these surfaces. It retains its explicit opt-in because it replaces the richer search index; use the homepage-only command for presentation changes. The browser checks cover five widths, navigation, search and failures, bookmarks, dark mode, supplied-art reading views, and existing article zoom behavior.

## What gets rebuilt

- `index.html`
- `archive.html`
- `authors.html`
- every `section-*.html` page
- every story page listed in `master-edition.json`
- `edition.json`
- `search-index.json`
- `photo-records.json`
- `feed.xml`
- `sitemap.xml`
- `404.html`

## Notes

- The build assumes `styles.css`, `app.js`, and `assets/` stay in the site root.
- Article thumbnails and hero images are local files, so story images still work offline.
- Static trust pages like `about.html`, `standards.html`, `corrections.html`, `contact.html`, and `photo-workflow.html` stay in the public root and can be edited separately.
