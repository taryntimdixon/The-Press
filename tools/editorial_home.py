"""Static, accessible front page. Content stays in the existing story registries."""
from __future__ import annotations
import html
import json
from pathlib import Path


def h(value):
    return html.escape(str(value or ""), quote=True)


def image(story, eager=False, field="image"):
    src = story.get(field)
    if not src:
        return ''
    width = story.get("thumbnailWidth" if field == "thumbnail" else "imageWidth", 1200)
    height = story.get("thumbnailHeight" if field == "thumbnail" else "imageHeight", 800)
    priority = ' fetchpriority="high"' if eager else ''
    return f'<img src="{h(src)}" alt="{h(story.get("imageAlt") or story.get("image_alt") or story.get("title"))}" width="{h(width)}" height="{h(height)}" loading="{"eager" if eager else "lazy"}" decoding="async"{priority}>'


def date_label(story):
    from datetime import datetime
    raw = story.get("publishedIso") or story.get("published_iso")
    try:
        return datetime.fromisoformat(raw.replace('Z', '+00:00')).strftime('%b %d, %Y').replace(' 0', ' ')
    except (ValueError, TypeError, AttributeError):
        return ''


def href(story):
    return story.get("filename") or story.get("url") or ''


def save_button(story):
    return f'<button class="save-button" hidden data-save="{h(href(story))}" aria-label="Save {h(story["title"])}" aria-pressed="false" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button>'


def render_card(story, featured=False):
    featured_attrs = ' data-featured hidden' if featured else ''
    return f'''<article class="story-tile" data-story{featured_attrs} data-section="{h(story['section'])}" data-url="{h(href(story))}">
      <a class="tile-image" href="{h(href(story))}" tabindex="-1" aria-hidden="true">{image(story)}</a>
      <div class="tile-topline"><span class="kicker">{h(story['section'])}</span>{save_button(story)}</div>
      <h3><a href="{h(href(story))}">{h(story['title'])}</a></h3>
      <p class="tile-dek">{h(story.get('dek') or story.get('summary'))}</p>
      <p class="story-date">{h(date_label(story))}</p>
    </article>'''


def build_history_index(root: Path):
    summaries = (root / 'assets/on-this-day-summary.js').read_text()
    moments = json.loads(summaries.split('window.PRESS_ON_THIS_DAY_MOMENTS=', 1)[1].strip().removesuffix(';'))
    art = (root / 'assets/on-this-day-artwork.js').read_text()
    artwork = json.loads(art.split('window.PRESS_ON_THIS_DAY_ARTWORK =', 1)[1].strip().removesuffix(';'))
    rows = {key: {"year": value['year'], "title": value['title'], "text": value.get('headline') or value['text'],
                  "image": artwork.get(key, {}).get('src', ''), "alt": artwork.get(key, {}).get('alt', '')}
            for key, value in moments.items()}
    return json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n'


def render_frontpage(head, stories, issues, fiction, version):
    lead, secondary = stories[0], stories[1:3]
    cards = ''.join(render_card(story, featured=index < 3) for index, story in enumerate(stories))
    sections = sorted({story['section'] for story in stories})
    filters = ''.join(f'<button type="button" data-filter="{h(section)}" aria-pressed="false">{h(section)}</button>' for section in sections)
    side_cards = ''.join(f'''<article class="side-story"><a href="{h(href(story))}"><div class="side-image">{image(story)}</div><p class="kicker">{h(story['section'])}</p><h2>{h(story['title'])}</h2></a></article>''' for story in secondary)
    issue_cards = ''.join(f'''<a class="issue-card" href="{h(issue['url'])}"><div class="issue-cover">{image(issue, field='thumbnail')}<span>NO. {issue['issueNumber']:02d}</span></div><p class="kicker">{h(issue['dateLabel'])}</p><h3>{h(issue['title'])}</h3><span class="text-link">Open issue <span aria-hidden="true">↗</span></span></a>''' for issue in issues)
    fiction_cards = ''.join(f'''<article class="fiction-card" data-illustrated-fiction-entry="{h(entry['id'])}"><a href="{h(entry['href'])}"><div class="fiction-art">{image(entry)}</div><div class="fiction-caption"><h3>{h(entry['title'])}</h3><span aria-hidden="true">↗</span></div><p>{h(entry['teaser'])}</p></a></article>''' for entry in fiction)
    extra_search = [{"title": e['title'], "url": e['href'], "section": 'Fantasy', "dek": e['teaser']} for e in fiction]
    extra_search += [{"title": e['title'], "url": e['url'], "section": 'Below the Fold', "dek": e['dek']} for e in issues]
    extra_json = json.dumps(extra_search, ensure_ascii=False).replace('</', '<\\/')
    return f'''<!doctype html>
<html lang="en">
{head}
<body class="page-editorial-home">
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="paper">
{render_masthead()}
<main id="main-content" tabindex="-1">
  <section class="front-section" id="front-page" aria-labelledby="front-title">
    <div class="section-topline"><h1 id="front-title">The front page</h1><span>Reporting, illustrated stories &amp; ideas</span></div>
    <div class="front-grid">
      <article class="cover-story">
        <a class="cover-art" href="{h(href(lead))}" aria-label="Read {h(lead['title'])}">{image(lead, eager=True)}</a>
        <div class="cover-copy"><p class="kicker">{h(lead['section'])} <span class="kicker-rule"></span> {h(lead.get('type') or 'Feature')}</p><h2><a href="{h(href(lead))}">{h(lead['title'])}</a></h2><p class="cover-dek">{h(lead['dek'])}</p><p class="story-date">By The Press <span aria-hidden="true">/</span> {h(date_label(lead))}</p><div class="cover-actions"><a class="read-link" href="{h(href(lead))}">Read the story <span aria-hidden="true">↗</span></a>{save_button(lead)}</div></div>
      </article>
      <aside class="front-side" aria-label="Also in the edition">{side_cards}</aside>
    </div>
  </section>
  <section class="edition-section" id="more-from-edition" aria-labelledby="edition-title">
    <div class="section-heading"><div><p class="kicker">From across the newsroom</p><h2 id="edition-title">More from the edition<span class="red-dot">.</span></h2></div><a class="text-link" href="archive.html">Full archive <span aria-hidden="true">↗</span></a></div>
    <div class="edition-tools" hidden data-edition-tools><div class="filters" aria-label="Filter stories by section"><button type="button" class="active" data-filter="All" aria-pressed="true">All stories</button>{filters}<button type="button" data-filter="Saved" aria-pressed="false">Saved stories</button></div></div>
    <p class="result-status sr-only" role="status" data-result-status></p>
    <div class="story-grid">{cards}</div>
    <div class="empty-state" data-empty hidden><h3>No saved stories yet.</h3><p>Use the bookmark beside a story to keep it here on this device.</p><button class="read-link" data-reset-filter type="button">Explore all stories <span aria-hidden="true">→</span></button></div>
    <div class="load-more-row"><button class="outline-button" data-load-more type="button" hidden>More stories <span aria-hidden="true">↓</span></button><a class="text-link" href="archive.html">Explore the complete archive <span aria-hidden="true">↗</span></a></div>
  </section>
  <section class="fantasy-section" id="fantasy" aria-labelledby="fantasy-title"><div class="section-heading"><h2 id="fantasy-title">Fantasy</h2></div><div class="fiction-grid">{fiction_cards}</div></section>
  <section class="issues-section" id="below-the-fold" aria-labelledby="issues-title"><div class="section-heading"><div><p class="kicker">The newsstand</p><h2 id="issues-title">Below the Fold<span class="red-dot">.</span></h2></div><a class="text-link" href="below-the-fold.html">All issues <span aria-hidden="true">↗</span></a></div><div class="issues-grid">{issue_cards}</div></section>
  <section class="history-section" id="on-this-day" aria-labelledby="history-title"><div class="history-image" data-history-image></div><div class="history-copy"><p class="kicker">On this day <span data-history-date></span></p><h2 id="history-title">A day in history.</h2><p data-history-text>Explore the people, events, and discoveries behind the dates.</p><a class="text-link" data-history-link href="on-this-day-preview.html">Explore the history archive <span aria-hidden="true">↗</span></a></div></section>
  <div class="archive-invitation"><a href="gallery.html"><span class="kicker">See the stories</span><strong>The Gallery <span aria-hidden="true">↗</span></strong></a><a href="archive.html"><span class="kicker">Keep exploring</span><strong>The Archive <span aria-hidden="true">↗</span></strong></a></div>
</main>
{render_footer()}
</div>
{render_search()}
<script type="application/json" id="front-extra-search">{extra_json}</script>
<script src="editorial-home.js?v={h(version)}" defer></script>
</body>
</html>\n'''


def render_masthead(reading=False):
    markup = """<header class="front-masthead" id="top">
  <div class="edition-line"><time data-today></time><span>Independent · Human-led · AI-powered</span><a href="about.html">About The Press <span aria-hidden="true">↗</span></a></div>
  <a class="wordmark" href="index.html" aria-label="The Press home">THE PRESS</a>
  <div class="masthead-caption"><span>AI Powered Journalism</span><span>Source notes. Clear dates.</span></div>
</header>
<nav class="front-nav" aria-label="Main navigation">
  <div class="nav-links"><a href="#front-page" aria-current="location">Front page</a><a href="#more-from-edition">The edition</a><a href="#fantasy">Fantasy</a><a href="#below-the-fold">Below the Fold</a><a href="#on-this-day">On this day</a><a href="archive.html">Archive <span aria-hidden="true">↗</span></a></div>
  <div class="nav-actions" hidden><button type="button" data-show-saved aria-label="Show saved stories">Saved <span data-saved-count>0</span></button><button type="button" data-theme aria-label="Switch to dark mode"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/></svg></button><button type="button" data-open-search aria-label="Search The Press"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Search</span></button></div>
</nav>"""
    if reading:
        markup = markup.replace('href="#', 'href="index.html#')
        markup = markup.replace('href="index.html#front-page" aria-current="location"', 'href="index.html#front-page"')
        markup = markup.replace('href="index.html#fantasy"', 'href="index.html#fantasy" aria-current="location"')
        start = markup.index('<button type="button" data-show-saved')
        end = markup.index('</button>', start) + len('</button>')
        markup = markup[:start] + markup[end:]
    return markup


def render_footer():
    return """<footer class="front-footer"><a class="footer-wordmark" href="#top">THE PRESS</a><div class="footer-links"><a href="about.html">About</a><a href="authors.html">Masthead</a><a href="standards.html">Standards</a><a href="corrections.html">Corrections</a><a href="feed.xml">RSS</a></div><div class="footer-bottom"><span>© <span data-year>2026</span> The Press</span><span>Independent · Source-forward · AI-powered</span><a href="#top">Back to top ↑</a></div></footer>"""


def render_search():
    return """<dialog class="search-dialog" aria-labelledby="search-title"><div class="dialog-top"><p class="kicker">The Press / Search</p><button type="button" data-close-search aria-label="Close search">Close <kbd>Esc</kbd></button></div><h2 id="search-title">Find your next story.</h2><label class="sr-only" for="front-search">Search headlines, sections, and topics</label><input id="front-search" type="search" placeholder="Try New York, space, technology…" autocomplete="off"><p class="search-status" role="status" data-search-status>Search the full archive.</p><div data-search-results></div><a class="text-link" href="archive.html">Browse the archive <span aria-hidden="true">↗</span></a></dialog>
<div class="sr-only" role="status" data-save-status></div>"""


def render_fantasy_story(head, entry, extras, version):
    search_json = json.dumps(extras, ensure_ascii=False).replace('</', '<\\/')
    paragraphs = ''.join(f'<p>{h(paragraph)}</p>' for paragraph in entry['story'])
    return f'''<!doctype html>
<html lang="en">
{head}
<body class="page-editorial-home page-fantasy-story">
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="paper">
{render_masthead(reading=True)}
<main id="main-content" tabindex="-1" class="fiction-reading" data-illustrated-fiction-reading="{h(entry['id'])}">
<nav class="fiction-back" aria-label="Fantasy navigation"><a class="text-link" href="index.html#fantasy">← Back to Fantasy</a></nav>
<article>
<header class="fantasy-reading__header"><h1>{h(entry['title'])}</h1></header>
<figure class="fantasy-reading__art">{image(entry, eager=True)}</figure>
<div class="fantasy-reading__story">{paragraphs}</div>
<p class="fiction-end"><a class="read-link" href="index.html#fantasy">More from Fantasy <span aria-hidden="true">↗</span></a></p>
</article>
</main>
{render_footer()}
</div>
{render_search()}
<script type="application/json" id="front-extra-search">{search_json}</script>
<script src="editorial-home.js?v={h(version)}" defer></script>
</body>
</html>\n'''
