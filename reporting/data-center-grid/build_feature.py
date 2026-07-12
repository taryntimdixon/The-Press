#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFERRED_IMAGE_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAAAACw="
REPORTING_DIR = ROOT / "reporting" / "data-center-grid"
BODY_PATH = ROOT / "content" / "bodies" / "technology-the-data-center-is-the-new-utility-bill.html"
ASIDE_PATH = ROOT / "content" / "asides" / "technology-the-data-center-is-the-new-utility-bill.html"
RAIL_MANIFEST_PATH = REPORTING_DIR / "rail-image-manifest.json"

SOURCES = json.loads((REPORTING_DIR / "source-stack.json").read_text(encoding="utf-8"))
ANALYSIS = json.loads((REPORTING_DIR / "original-analysis.json").read_text(encoding="utf-8"))
SOURCE_BY_NUMBER = {source["number"]: source for source in SOURCES}
APPROVED_RAIL_MODELS = {"gpt-image-2", "built-in-imagegen"}

RAIL_IMAGE_ALTS = {
    "EIA data": "Cinematic utility infrastructure and electricity-data thumbnail",
    "Global energy": "Cinematic grid and data-center infrastructure thumbnail",
    "Federal lab": "Cinematic laboratory, server-room, or power-equipment thumbnail",
    "Grid operator": "Cinematic grid-control and transmission thumbnail",
    "State record": "Cinematic hearing, planning, or local-infrastructure thumbnail",
    "Federal regulation": "Cinematic regulatory and grid-planning thumbnail",
    "Company record": "Cinematic data-center operations thumbnail",
    "Local reporting": "Cinematic local community, utility, or construction thumbnail",
    "Utility scenarios": "Cinematic power-supply and grid-flexibility thumbnail",
    "Flexibility": "Cinematic flexible-load and grid-control thumbnail",
}

ART_POSTERS = {
    "load-visible": {
        "src": "assets/data-center-grid/posters/illustrated-tall/load-visible-meter-cutaway-poster.png",
        "alt": "Illustrated cutaway poster of a utility meter, substation, feeder lines, server rooms, and data-center load path.",
        "caption": "Metering is the first move: the data-center load becomes a public planning problem when it can be measured, located, and separated from speculation.",
        "sources": (10, 16, 26, 62, 66),
        "position": "50% 50%",
    },
    "denominator": {
        "src": "assets/data-center-grid/posters/illustrated-tall/denominator-map-layers-poster.png",
        "alt": "Illustrated infographic poster of nested electricity denominator layers, maps, grid scale rings, substations, and a data-center block.",
        "caption": "The denominator changes the claim: national retail sales, commercial sales, state sales, and local grid limits make the same load look different.",
        "sources": (1, 2, 5, 62, 64, 66),
        "position": "50% 50%",
    },
    "one-gigawatt": {
        "src": "assets/data-center-grid/posters/illustrated-tall/one-gigawatt-cutaway-poster.png",
        "alt": "Illustrated cross-section poster of a fenced data-center campus with server halls, substations, cooling pipes, transmission lines, and city-scale load.",
        "caption": "A gigawatt campus is easier to understand as annual energy, local infrastructure, and a place on the grid than as a cloud metaphor.",
        "sources": (3, 4, 76, 81, 82),
        "position": "50% 52%",
    },
    "virginia": {
        "src": "assets/data-center-grid/posters/illustrated-tall/virginia-ratepayer-flow-poster.png",
        "alt": "Illustrated systems poster showing data-center load, grid upgrades, customer classes, household meters, and cost-allocation paths.",
        "caption": "The ratepayer question is human-scale: who pays when a private load changes the utility system that everyone else uses?",
        "sources": (21, 22, 69, 81, 82),
        "position": "44% 50%",
    },
    "water": {
        "src": "assets/data-center-grid/posters/illustrated-tall/water-cooling-cutaway-poster.png",
        "alt": "Illustrated cutaway poster of a data-center cooling system with server heat paths, towers, pumps, pipe loops, basin, and watershed boundary.",
        "caption": "Cooling is not one national fact; it is a facility design, a watershed, a drought plan, and a local disclosure question.",
        "sources": (81, 82, 89, 90, 91, 92, 93),
        "position": "48% 50%",
    },
    "counting-promises": {
        "src": "assets/data-center-grid/posters/illustrated-tall/counting-promises-queue-machine-poster.png",
        "alt": "Illustrated infographic poster of a grid-operator project queue sorting speculative data-center requests from committed load blocks.",
        "caption": "Load forecasting now has to separate projects ready to build from requests that still look like duplicate, speculative, or early-stage promises.",
        "sources": (70, 71, 73, 76, 78, 79, 80),
        "position": "52% 50%",
    },
    "rate-design": {
        "src": "assets/data-center-grid/posters/illustrated-tall/rate-design-cost-allocation-poster.png",
        "alt": "Illustrated tariff cutaway poster showing a data-center load block, substation upgrades, household meters, collateral, and branching cost paths.",
        "caption": "The public bargain lives inside the tariff: which costs stay with the large customer, and which costs drift into the shared rate base?",
        "sources": (42, 69, 71, 72, 83, 84, 87, 88),
        "position": "50% 50%",
    },
    "power-supply": {
        "src": "assets/data-center-grid/posters/illustrated-tall/power-supply-stack-poster.png",
        "alt": "Illustrated cross-section poster of a data-center power supply stack with transmission, batteries, solar, turbines, geothermal well, backup fuel, and grid nodes.",
        "caption": "Serving AI load is not a single-resource question; generation, transmission, storage, backup, permitting, and reliability move together.",
        "sources": (28, 30, 39, 41, 44, 45, 54, 59, 60, 78),
        "position": "50% 50%",
    },
    "companies": {
        "src": "assets/data-center-grid/posters/illustrated-tall/companies-procurement-system-poster.png",
        "alt": "Illustrated procurement-system poster connecting chips, land parcels, data-center modules, substations, water pipes, contracts, and permits.",
        "caption": "The corporate ledger is physical: chips, land, power contracts, cooling systems, substations, and local permission all sit behind compute growth.",
        "sources": (89, 90, 91, 92, 93, 94, 95, 96),
        "position": "52% 50%",
    },
    "local-record": {
        "src": "assets/data-center-grid/posters/illustrated-tall/local-record-civic-cutaway-poster.png",
        "alt": "Illustrated civic cutaway poster of a local data-center project with town hall, parcel maps, construction blocks, substation, water tower, neighborhood, and feeder lines.",
        "caption": "The local record is messy because each project has a different mix of power, land, water, tax policy, jobs, emissions, and consent.",
        "sources": (96, 98, 103, 104, 105, 108, 109),
        "position": "50% 50%",
    },
    "discipline": {
        "src": "assets/data-center-grid/posters/illustrated-tall/discipline-proof-systems-poster.png",
        "alt": "Illustrated proof-before-power systems poster connecting a meter, contract, water basin, substation, server rack, parcel map, flexibility switch, and household bill shield.",
        "caption": "Proof before power means the ledger is visible: load, cost, water, flexibility, local terms, and the bill if the promise changes.",
        "sources": (1, 16, 42, 69, 81, 83, 84),
        "position": "50% 50%",
    },
}


def approved_rail_images() -> dict[int, str]:
    if not RAIL_MANIFEST_PATH.exists():
        return {}
    try:
        manifest = json.loads(RAIL_MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if len(manifest) != len(SOURCES):
        return {}

    approved: dict[int, str] = {}
    seen_images: set[str] = set()
    seen_hashes: set[str] = set()
    for item in manifest:
        if item.get("generation_model") not in APPROVED_RAIL_MODELS:
            return {}
        source_number = int(item["source"])
        rail_image = str(item["rail_image"])
        final_hash = str(item.get("final_sha256", ""))
        image_path = ROOT / rail_image
        if not image_path.exists() or rail_image in seen_images or final_hash in seen_hashes:
            return {}
        approved[source_number] = rail_image
        seen_images.add(rail_image)
        seen_hashes.add(final_hash)
    if set(approved) != {source["number"] for source in SOURCES}:
        return {}
    return approved


APPROVED_RAIL_IMAGES = approved_rail_images()


def h(value: object) -> str:
    return html.escape(str(value), quote=True)


def ref(*numbers: int) -> str:
    return "".join(
        f'<sup class="source-ref"><a href="#{h(SOURCE_BY_NUMBER[number]["id"])}">[{number}]</a></sup>'
        for number in numbers
    )


def pct(value: float) -> str:
    return f"{value:.1f}%"


def art_poster(slug: str) -> str:
    data = ART_POSTERS.get(slug)
    if not data:
        return ""
    width, height = image_dimensions(str(data["src"]))
    size_attrs = f' width="{width}" height="{height}"' if width and height else ""
    return f"""
<figure class="data-center-grid-art-poster data-center-grid-art-poster--{h(slug)}" style="--poster-position:{h(data['position'])}">
  <img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="{h(data['src'])}" alt="{h(data['alt'])}" loading="lazy" decoding="async"{size_attrs} />
  <figcaption>{h(data['caption'])}{ref(*data['sources'])}</figcaption>
</figure>
""".strip()


def image_dimensions(src: str) -> tuple[int, int]:
    path = ROOT / src
    try:
        header = path.read_bytes()[:24]
    except OSError:
        return (0, 0)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        return (0, 0)
    return struct.unpack(">II", header[16:24])


def card(source: dict) -> str:
    initials = "".join(part[0] for part in source["outlet"].replace("&", " ").split()[:2]).upper()[:3]
    image_src = APPROVED_RAIL_IMAGES.get(source["number"])
    image_alt = f"{RAIL_IMAGE_ALTS.get(source['category'], 'Photo-style source-card thumbnail')} for Source {source['number']:03d}."
    photo_html = (
        f"""
  <figure class="data-center-grid-rail-photo">
    <img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="{h(image_src)}" alt="{h(image_alt)}" loading="lazy" decoding="async" width="800" height="520" />
  </figure>""".rstrip()
        if image_src
        else ""
    )
    return f"""
<article class="press-static-post press-static-post--source press-static-post--clickable data-center-grid-rail-card" data-source-id="{h(source['id'])}" tabindex="0">
  <div class="press-static-post__top">
    <span class="press-static-post__avatar">{h(initials or 'S')}</span>
    <div><strong>{h(source['outlet'])}</strong><span>{h(source['category'])}</span></div>
  </div>
{photo_html}
  <div class="press-static-post__visual">
    <strong>{h(source['title'])}</strong>
  </div>
  <p>{h(source['category'])} record used in the data-center grid source stack.</p>
  <a href="{h(source['url'])}" target="_blank" rel="noopener noreferrer">Open source</a>
</article>
""".strip()


def row(index: int, slug: str, title: str, body_html: str, cards: list[dict]) -> str:
    left = "\n".join(card(source) for source in cards[:5])
    right = "\n".join(card(source) for source in cards[5:])
    return f"""
<div class="press-social-row press-social-row--{index}" data-section="{h(slug)}">
  <aside aria-label="Left-side source cards for {h(title)}" class="press-social-side press-social-side--left">
{left}
  </aside>
  <section aria-labelledby="{h(slug)}" class="press-social-content press-feature-segment">
    <h2 id="{h(slug)}">{h(title)}</h2>
{body_html}
  </section>
  <aside aria-label="Right-side source cards for {h(title)}" class="press-social-side press-social-side--right">
{right}
  </aside>
</div>
""".strip()


def section_body(slug: str, blocks: list[str]) -> str:
    poster = art_poster(slug)
    if not poster:
        return "\n".join(blocks)

    insert_at = min(2, len(blocks))
    return "\n".join([*blocks[:insert_at], poster, *blocks[insert_at:]])


def p(text: str) -> str:
    return f"<p>{text}</p>"


def source_notes() -> str:
    items = "\n".join(
        f'<li id="{h(source["id"])}"><span class="source-label">{source["number"]}.</span> '
        f'<strong>{h(source["outlet"])}</strong>, <a href="{h(source["url"])}" target="_blank" rel="noopener noreferrer">{h(source["title"])}</a>.</li>'
        for source in SOURCES
    )
    return f"""
<section id="source-notes" class="press-social-sources">
  <h2>Source notes</h2>
  <p>The article uses 110 public source links. The stack favors official statistics, government records, grid-operator documents, national-lab work, company reports, regulatory filings, and selected local reporting.</p>
  <ol class="source-list data-center-grid-source-list">
{items}
  </ol>
</section>
""".strip()


def metrics_panel() -> str:
    comparisons = ANALYSIS["projection_comparisons"]
    states = {row["state"]: row for row in ANALYSIS["state_comparisons"]}
    return f"""
<div class="data-center-grid-finding-board" id="original-findings">
  <article>
    <span>EPRI 2024 range</span>
    <strong>{pct(comparisons['EPRI_2024_low_twh']['pct_2024_us_sales'])}-{pct(comparisons['EPRI_2024_high_twh']['pct_2024_us_sales'])}</strong>
    <p>of 2024 U.S. retail electricity sales, using EIA Electric Power Annual sales as the denominator.</p>
  </article>
  <article>
    <span>EPRI 2030 range</span>
    <strong>{pct(comparisons['EPRI_2030_low_twh']['pct_2024_us_sales'])}-{pct(comparisons['EPRI_2030_high_twh']['pct_2024_us_sales'])}</strong>
    <p>of 2024 U.S. retail sales if compared against today&apos;s grid size; a scale check, not a frozen-grid forecast.</p>
  </article>
  <article>
    <span>1 GW at 95%</span>
    <strong>8.3 TWh</strong>
    <p>per year, before transmission losses and before asking which local grid absorbs the load.</p>
  </article>
  <article>
    <span>Virginia comparison</span>
    <strong>{pct(states['Virginia']['one_gw_95pct_as_pct_all_sales'])}</strong>
    <p>of Virginia&apos;s 2024 all-sector sales for one 1 GW load running at 95% utilization.</p>
  </article>
</div>
""".strip()


def annotated_figure(path: str, alt: str, caption: str, labels: list[tuple[str, str]]) -> str:
    return f"""
<figure class="data-center-grid-figure data-center-grid-figure--annotated">
  <div class="data-center-grid-figure__media">
    <img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="{h(path)}" alt="{h(alt)}" loading="lazy" decoding="async" />
  </div>
  <figcaption>{caption}</figcaption>
</figure>
""".strip()


sections = [
    (
        "load-visible",
        "The load has meter readings",
        [
            p(
                f"The software story now has an electrical signature: EIA said on Jan. 13, 2026 that U.S. electricity demand was headed for its strongest four-year growth since 2000, with large computing facilities including data centers named as a driver.{ref(10)} EIA then launched a pilot survey on March 25, 2026 to measure data-center energy use in Texas, Washington, Northern Virginia, and Washington, D.C., which is a quiet admission that older national measurement tools were not built for this scale or speed.{ref(16)}"
            ),
            p(
                f"The IEA's special report is blunt about why the measurement problem matters: it says a typical AI-focused data center can consume as much electricity as 100,000 households, while the largest under construction can consume 20 times that much.{ref(26,27)} EPRI's 2026 scenarios put U.S. data-center electricity use at roughly 177 to 192 TWh in 2024 and 380 to 790 TWh by 2030, depending on buildout and assumptions.{ref(62,64)} Lawrence Berkeley National Laboratory estimated 176 TWh in 2023 and projected 325 to 580 TWh by 2028, so the reputable forecasts disagree on the top of the range but not on the direction of travel.{ref(66)}"
            ),
            p(
                f"My read from those numbers is narrow and practical: the question is not whether AI is good or bad, and not whether every announced campus will actually be built. The question is whether public utility systems, which were designed to plan slowly and socialize many costs across broad customer classes, can absorb private loads that arrive in city-sized blocks before regulators have fully priced, measured, or locally negotiated them.{ref(42,62,69)}"
            ),
            p(
                f"The public argument often tries to settle the issue with a single adjective: clean, wasteful, strategic, reckless, subsidized, or necessary. The documents point to a narrower sentence: data centers are now large enough that the accounting choices around them can matter almost as much as the engineering choices.{ref(37,42,62,83)}"
            ),
        ],
    ),
    (
        "denominator",
        "The denominator changes the debate",
        [
            p(
                f"EIA's Electric Power Annual says U.S. retail electricity sales were 3,975.4 TWh in 2024, and total end use, including direct use, was 4,110.4 TWh.{ref(1,2)} Commercial-sector sales were 1,450.9 TWh and residential sales were 1,482.9 TWh, so data-center demand belongs in a commercial-load concentration debate as much as a national-share debate.{ref(1,5)}"
            ),
            p(
                f"The Press calculation is simple: compare EPRI's 177 to 192 TWh 2024 data-center range with EIA's 2024 retail-sales denominator. That range equals 4.5% to 4.8% of all U.S. retail sales, but it equals 12.2% to 13.2% of today's commercial-sector sales.{ref(1,62,64)}"
            ),
            p(
                f"Using the same denominator, EPRI's 380 to 790 TWh 2030 range equals 9.6% to 19.9% of 2024 U.S. retail sales and 26.2% to 54.4% of 2024 commercial sales.{ref(1,62,64)} That comparison is not a claim that the 2030 grid will stay the size of the 2024 grid. It is a scale check: if the denominator has to grow fast, someone must build, permit, finance, and rate-base that growth."
            ),
            metrics_panel(),
            p(
                f"LBNL's 2023 estimate lands in the same neighborhood from a different method: 176 TWh was 4.5% of 2023 U.S. retail sales and 12.5% of commercial-sector sales in The Press calculation using EIA's 2023 annual table.{ref(1,66)} Its 2028 projection range of 325 to 580 TWh would equal 8.4% to 15.0% of 2023 retail sales if compared against that historical denominator.{ref(66)} That scale helps explain why utility planners are treating the issue as a system problem rather than a single-industry footnote.{ref(78)}"
            ),
        ],
    ),
    (
        "one-gigawatt",
        "One gigawatt is a small city inside one fence",
        [
            p(
                f"A 1 GW load running at 95% utilization uses about 8.3 TWh per year: 1,000 MW times 8,760 hours times 0.95. That arithmetic is not a forecast, but it is a useful smell test for project announcements, because it turns a headline megawatt number into annual energy that can be compared with state electricity sales.{ref(3,4)}"
            ),
            p(
                f"In Virginia, EIA's 2024 all-sector retail sales were 138.0 TWh, so one 1 GW load at 95% utilization equals about 6.0% of statewide annual sales; a hypothetical 10 GW campus at the same utilization equals about 60.3%.{ref(3,4)} In Texas, the same 1 GW load equals about 1.6% of 2024 all-sector sales because Texas sold 505.4 TWh, but even there a 10 GW load equals about 16.5% of annual sales.{ref(3,76)}"
            ),
            p(
                f"The same calculation looks sharper in smaller or fast-growing states. One 1 GW load at 95% utilization equals about 5.5% of Georgia's 2024 all-sector sales, 5.4% of Ohio's, 6.2% of Illinois's, 13.9% of Oregon's, 15.2% of Iowa's, and 23.6% of Nebraska's.{ref(3,4)} That is why national percentages can understate the local fight: a load that looks manageable on a U.S. chart can be enormous at a substation, county, balancing area, or rate case."
            ),
            p(
                f"That state math also explains why the industry's favorite abstraction, 'the cloud,' is so politically unhelpful. A cloud service can serve users everywhere, but the power draw is attached to a place, the transmission upgrade is attached to a place, the cooling question is attached to a place, and the local tax bargain is attached to a place.{ref(81,82,86)}"
            ),
        ],
    ),
    (
        "virginia",
        "Virginia is the warning label",
        [
            p(
                f"Virginia is the cleanest case study because it is both a success story and a warning. JLARC says Virginia's data-center industry benefited from a strong fiber network, reliable cheap energy, available land, proximity to major national customers, and a state data-center tax incentive.{ref(81,82,86)} That list is not incidental; it is the recipe that other states are now trying to copy."
            ),
            p(
                f"JLARC also found that data centers provide positive economic benefits mostly through capital investment and construction activity, not because they produce large permanent workforces like a labor-intensive factory.{ref(81,82)} That distinction matters for local politics: construction cranes are visible, tax-base effects can be real, but the long-run operating footprint may be mostly land, equipment, utility infrastructure, and a small staff relative to the load."
            ),
            p(
                f"The most important JLARC number is a household-bill warning, not a data-center marketing number. Its report says a typical Dominion Energy residential customer could face generation- and transmission-related costs rising by an estimated $14 to $37 per month in real dollars by 2040, independent of inflation.{ref(81,82)} It also names separate data-center customer classes, cost-allocation changes, and more frequent utility-rate adjustments as tools that could help insulate other customers.{ref(81,82)}"
            ),
            annotated_figure(
                "assets/data-center-grid/ratepayer-meter-still-life.png",
                "Editorial still life of a household electric meter and utility bill with a data-center reflection",
                f"The household-bill question is not whether data centers alone explain every rate increase. It is whether a utility system can prove which costs are caused by which loads before households absorb them.{ref(21,22,69,82)}",
                [("top-left", "bill"), ("mid-right", "load"), ("bottom-left", "risk")],
            ),
            p(
                f"That is why I would be careful with the slogan that data centers 'raise bills.' Weather, fuel prices, grid hardening, aging infrastructure, generation mix, storm recovery, and ordinary rate-case decisions all matter.{ref(8,14,15,68)} The more defensible claim is narrower: if data-center-driven infrastructure costs are not assigned carefully, household and small-business customers can be exposed to costs they did not cause and cannot control.{ref(42,69,71,72)}"
            ),
        ],
    ),
    (
        "counting-promises",
        "Grid operators are learning to count promises",
        [
            p(
                f"PJM's 2026 forecast process shows why counting load is hard. PJM said its updated forecast lowered near-term peak-demand expectations through 2032 partly because it improved the vetting of requested adjustments for data centers and large loads.{ref(71)} The point is not that the boom disappeared; planners are trying to separate real load from speculative requests, duplicate queues, early-stage site control, and wishful project timing."
            ),
            p(
                f"PJM's board also outlined plans to integrate large loads reliably while preserving affordability, and its load-forecast materials now treat data centers and other large loads as a planning issue rather than a generic commercial category.{ref(70,73,74,75)} The fact that the country's largest grid operator needs special procedures for the category is itself evidence that the old categories are wearing thin."
            ),
            p(
                f"ERCOT's 2026 preliminary long-term load forecast draws the same lesson from Texas. ERCOT says it is collecting information through transmission and distribution utilities that work directly with medium loads of 25 MW to 74.9 MW and large loads of 75 MW and above, including data centers, cryptocurrency mining, industrial load, and oil-and-gas processes.{ref(76)} Its 2025 constraints-and-needs report puts large-load growth inside the same planning world as transmission constraints, resource additions, and reliability obligations.{ref(77)}"
            ),
            p(
                f"NERC's reliability work adds the risk frame: large loads create forecasting, modeling, interconnection, and operational questions that do not fit neatly into yesterday's demand-growth assumptions.{ref(78,79,80)} My conclusion from PJM, ERCOT, and NERC is not that data centers are uniquely impossible to serve. It is that the electric system needs better proof of project maturity before it builds public infrastructure around private announcements."
            ),
        ],
    ),
    (
        "rate-design",
        "Rate design is infrastructure politics in numbers",
        [
            p(
                f"FERC's RM26-4 large-load docket puts the technical problem into regulatory language: how should very large loads interconnect to the transmission system without damaging reliability, delaying other customers, or shifting costs to people who did not create the demand?{ref(83,84)} Commissioner Judy Chang's testimony framed the same consumer-protection concern in plain terms, warning against leaving families and small businesses to pay for upgrades needed by large customers.{ref(69)}"
            ),
            p(
                f"DOE and LBNL have both treated large-load rate design as an active policy problem, and LBNL's work points toward evolving practices such as clearer tariffs, minimum payment obligations, contract terms, and cost-allocation structures for customers whose arrival can force large network investments.{ref(42,71,72)} Those tools sound dry until a project is delayed, downsized, or canceled after a utility has already planned around it."
            ),
            p(
                f"The basic accounting question is simple: if a data center requires a new substation, transmission upgrade, generation resource, or standby arrangement, which dollars are assigned to the developer and which dollars are spread across the rate base?{ref(42,69,71)} If the answer is hidden inside confidential contracts or slow rate cases, the public may not know whether it is buying grid capacity for itself or underwriting a private compute campus."
            ),
            p(
                f"The Brattle Group's flexibility argument is the best pro-growth counterweight: better use of existing grid capacity could reduce consumer costs and speed interconnection if customers can shape or shift load instead of demanding firm service at every hour.{ref(87,88)} That is a real opening, but it should be proven through tariffs, metering, performance rules, and penalties rather than accepted as a sales pitch."
            ),
        ],
    ),
    (
        "power-supply",
        "Power supply has moved into cloud strategy",
        [
            p(
                f"DOE's data-center work now sits beside geothermal, nuclear, transmission, efficiency, and clean-energy-resource materials because serving AI load is not a single-resource problem.{ref(39,41,44,45,52,54)} IEA's supply chapter reaches a similar conclusion: renewables, natural gas, nuclear, storage, grids, and efficiency all matter, but their relevance depends on local resource mix, timing, permitting, and reliability needs.{ref(28,30,33)}"
            ),
            p(
                f"That is why on-site generation keeps appearing in project discussions. A campus that can bring power with it may reduce pressure on existing customers, but only if the arrangement also accounts for emissions, backup, interconnection, water, fuel delivery, market impacts, and what happens when the facility still needs the grid.{ref(41,49,50,51)}"
            ),
            p(
                f"Transmission is the slowest part of the romance. DOE's SPARK initiative, transmission-tool work, and permitting recommendations all point to the same non-glamorous constraint: lines, reconductoring, siting, and interconnection studies take institutional time even when capital is available.{ref(54,59,60)} AI can order chips faster than the public can build a high-voltage corridor."
            ),
            p(
                f"The cleaner way to say it is this: the AI industry is learning that it cannot buy electricity the way it buys cloud regions. Electricity is an obligation system. It has reliability standards, shared costs, planning horizons, land-use fights, and physical bottlenecks that do not move at product-launch speed.{ref(78,83,84)}"
            ),
        ],
    ),
    (
        "water",
        "Water turns a national boom into a local argument",
        [
            p(
                f"Water is not the same problem everywhere. Google, Microsoft, Amazon, and Meta all publish sustainability materials that discuss data-center efficiency, water stewardship, energy procurement, and operational metrics, but those reports do not make water risk disappear at the local level.{ref(89,90,91,92,93)} The same cooling design can feel routine in one watershed and politically explosive in another."
            ),
            p(
                f"JLARC's Virginia review is more nuanced than the loudest public debate: it says data-center water use is currently sustainable in Virginia, but growing.{ref(81,82)} It also says most data centers use about the same amount of water or less than an average large office building, while a few require substantially more and some require less than a typical household.{ref(81,82)} That finding argues against panic, but it also argues for measurement."
            ),
            annotated_figure(
                "assets/data-center-grid/cooling-water-yard.png",
                "Photorealistic editorial image of data-center cooling infrastructure and a retention basin",
                f"Cooling is a design choice and a local-resource question. The policy problem is knowing which facilities need water, how much, at what hours, and under which drought or heat conditions.{ref(81,82,89,90)}",
                [("top-left", "heat"), ("mid-right", "cooling"), ("bottom-left", "water")],
            ),
            p(
                f"My cautious read: water should not be used as a universal veto, because the facts differ by facility, climate, cooling system, and supply source. It should be used as a disclosure requirement, because the public cannot evaluate a project from a tax-abatement memo if the cooling design, annual withdrawals, consumptive use, and drought contingencies are vague.{ref(81,82,90,92,93)}"
            ),
        ],
    ),
    (
        "companies",
        "Cloud firms are infrastructure buyers",
        [
            p(
                f"The largest cloud and AI firms have moved beyond servers into power, land, chips, cooling systems, grid access, and political patience. Company sustainability reports from Google, Microsoft, Amazon, and Meta describe efficiency gains and energy or water programs, but they also show the physical ledger behind compute growth: energy, water, land, hardware, and local infrastructure.{ref(89,90,91,92,93)}"
            ),
            p(
                f"That corporate ledger should be read beside public records, not instead of them. A company can improve power-usage effectiveness, sign clean-energy contracts, and invest in water replenishment while still placing a large load on a constrained local grid or asking a utility to plan around growth projections that might change.{ref(70,76,82,89)}"
            ),
            p(
                f"Selected AP reporting shows the social-license side of that shift: communities have increasingly challenged data-center projects, and Microsoft has publicly argued that Big Tech should pay its way for AI data centers.{ref(94,95,96)} State fights over tax breaks, capacity additions, and local pollution concerns have moved the issue into ordinary politics.{ref(98,103,105)}"
            ),
            p(
                f"The best version of the industry case is not that data centers have no costs. It is that the costs can be made transparent, assigned properly, and paired with new resources that leave the grid stronger. The worst version of the industry case is that speed alone should excuse weak disclosure, speculative load queues, or cross-subsidies hidden inside utility planning.{ref(42,69,87,88)}"
            ),
        ],
    ),
    (
        "local-record",
        "The local record is messy because the projects are different",
        [
            p(
                f"News examples are useful only if they are not mistaken for a universal rule. Maine's moratorium debate, Georgia's capacity expansion, Virginia's tax-break fight, Memphis-area pollution concerns around xAI, Microsoft taking over a Texas expansion, and Ohio's 10 GW proposal all describe different mixes of electricity, land, water, tax policy, fuel, and local consent.{ref(96,98,103,104,105,108,109)}"
            ),
            p(
                f"That variety is why I do not think the right national answer is a blanket yes or a blanket no. A data center attached to new firm power, transparent water reporting, full-cost grid upgrades, and enforceable flexibility is not the same civic bargain as a speculative campus asking a utility to reserve scarce capacity while the public sees only the tax-base upside.{ref(49,50,51,76,87)}"
            ),
            p(
                f"The harder conclusion is that America probably needs more compute and stricter gatekeeping at the same time. More compute without gatekeeping risks hidden transfer payments and local backlash. Gatekeeping without a build path risks pushing strategic infrastructure into less transparent places or slower jurisdictions.{ref(26,37,83,84,88)}"
            ),
            p(
                f"That balance is less satisfying than a slogan, but it matches the evidence better. The data-center question is not whether the future should use electricity. The question is whether each project can show enough numbers, contracts, flexibility, and local safeguards to deserve the electricity it wants.{ref(1,42,62,69,81)}"
            ),
        ],
    ),
    (
        "discipline",
        "What discipline would look like",
        [
            p(
                f"A disciplined data-center policy would start with measurement. EIA's pilot survey should become a durable public statistical program that can distinguish existing load, committed load, speculative load, cooling technology, customer class, geography, and timing without exposing legitimate security details.{ref(16)} Without that denominator, every rate case is forced to work partly in fog."
            ),
            p(
                f"Second, large-load tariffs should force more of the project-specific cost onto the project-specific customer. That means minimum bills, collateral, exit charges, construction contributions, or other mechanisms strong enough to protect other customers if a proposed campus changes size after the grid has already planned around it.{ref(42,69,71,72)}"
            ),
            p(
                f"Third, flexibility should be rewarded only when it is operationally real. A customer that can curtail, shift non-urgent workloads, use on-site storage, or coordinate with grid conditions deserves a different interconnection conversation than a customer demanding 24/7 firm service with no meaningful operating flexibility.{ref(65,87,88)}"
            ),
            p(
                f"Fourth, local disclosure should treat water, backup generation, noise, tax incentives, and land use as part of the same bargain as electricity. A project that is nationally valuable can still be locally sloppy; a project that is locally attractive can still be nationally inefficient if it locks in expensive or high-emission supply in the wrong place.{ref(41,81,82,90,92)}"
            ),
            annotated_figure(
                "assets/data-center-grid/grid-ledger-collage.png",
                "Editorial collage of grid diagrams, utility ledger sheets, server racks, and meter imagery",
                f"The useful question is not whether AI is weightless or monstrous. It is whether the ledger is visible: load, cost, water, emissions, flexibility, tax treatment, and who pays if the promise changes.{ref(1,42,62,81)}",
                [("top-left", "meter"), ("mid-right", "compute"), ("bottom-left", "ledger")],
            ),
            p(
                f"My bottom line is deliberately less dramatic than the politics around the issue. Data centers are more than warehouses with servers, and they are not automatically civic villains. They are private industrial loads arriving inside public utility systems, and the public should demand the ordinary virtues that make infrastructure legitimate: measurement, pricing, disclosure, enforceable contracts, and a fair answer to the bill.{ref(16,42,69,83,84)}"
            ),
        ],
    ),
]


def build_body() -> str:
    rows = []
    source_chunks = [SOURCES[i : i + 10] for i in range(0, len(SOURCES), 10)]
    gallery = f"""
<details class="article-rail-gallery article-rail-gallery--top data-center-grid-gallery" id="article-gallery" data-gallery-open-mode="manual">
  <summary>Article Gallery</summary>
  <div class="article-rail-gallery__grid">
    <a class="article-rail-gallery__card" href="#load-visible"><img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="assets/data-center-grid/data-center-cooling-campus-thumbnail.jpg" alt="Data-center cooling yard beside a desert retention pond and nearby neighborhoods" loading="lazy" decoding="async" /></a>
    <a class="article-rail-gallery__card" href="#discipline"><img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="assets/data-center-grid/grid-ledger-collage.png" alt="Grid ledger collage with meter, substation drawings and server racks" loading="lazy" decoding="async" /></a>
    <a class="article-rail-gallery__card" href="#water"><img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="assets/data-center-grid/cooling-water-yard.png" alt="Data-center cooling equipment, pipes and retention basin" loading="lazy" decoding="async" /></a>
    <a class="article-rail-gallery__card" href="#virginia"><img src="{DEFERRED_IMAGE_PLACEHOLDER}" data-press-lazy-src="assets/data-center-grid/ratepayer-meter-still-life.png" alt="Household electric meter and utility bill with data-center reflection" loading="lazy" decoding="async" /></a>
  </div>
</details>
""".strip()
    hero_echo = annotated_figure(
        "assets/data-center-grid/data-center-cooling-campus-thumbnail.jpg",
        "Photorealistic editorial image of data-center cooling infrastructure beside a desert water basin and nearby neighborhoods",
        "Editorial art created for The Press. It is used as a visual explanation of the system under discussion, not as documentary evidence of a specific facility.",
        [("top-left", "cloud"), ("mid-right", "substation"), ("bottom-left", "homes")],
    )
    rows.append(hero_echo)
    for index, (slug, title, paragraphs) in enumerate(sections, 1):
        rows.append(row(index, slug, title, section_body(slug, paragraphs), source_chunks[index - 1]))
    rows.append(source_notes())
    return f"""
<section class="article-body press-feature-body data-center-grid-feature">
  <div class="atla-editor-note data-center-grid-note">
    <strong>Reader note:</strong> This feature uses 110 linked source notes and original calculations from EIA annual electricity-sales tables. The side cards are source cards, not simulated social-media posts. The images are editorial art created for The Press and are not documentary photographs of specific facilities.
  </div>
  <div class="article-jump-strip"><a href="#article-gallery">Article Gallery</a><a href="#original-findings">Original Findings</a><a href="#source-notes">110 Source Notes</a></div>
  <div class="press-social-feature press-feature-social-feature data-center-grid-social-feature" data-social-card-count="110" data-source-count="110" data-source-label="Data-center grid source stack">
{gallery}
{chr(10).join(rows)}
  </div>
</section>
""".strip()


def build_aside() -> str:
    return """
<section class="aside-card">
  <h3>Key points</h3>
  <ul>
    <li>The article compares public data-center demand projections against EIA 2024 electricity-sales denominators to show scale.</li>
    <li>EPRI's high 2030 U.S. data-center scenario equals about 19.9% of 2024 retail sales in The Press calculation.</li>
    <li>A 1 GW load running at 95% utilization uses about 8.3 TWh a year, enough to matter sharply in smaller state systems.</li>
    <li>The central fight is not only power supply. It is measurement, rate design, local disclosure, water, and who pays if forecasts change.</li>
    <li>The article uses 110 public source links and source cards, plus original EIA-based calculations stored in the reporting folder.</li>
  </ul>
</section>
<section class="aside-card">
  <h3>On this page</h3>
  <ol>
    <li><a href="#article-gallery">Article Gallery</a></li>
    <li><a href="#load-visible">The load has meter readings</a></li>
    <li><a href="#denominator">The denominator changes the debate</a></li>
    <li><a href="#one-gigawatt">One gigawatt is a small city inside one fence</a></li>
    <li><a href="#virginia">Virginia is the warning label</a></li>
    <li><a href="#counting-promises">Grid operators are learning to count promises</a></li>
    <li><a href="#rate-design">Rate design is infrastructure politics in numbers</a></li>
    <li><a href="#power-supply">Power supply moved into cloud strategy</a></li>
    <li><a href="#water">Water turns a national boom local</a></li>
    <li><a href="#companies">Cloud firms are infrastructure buyers</a></li>
    <li><a href="#local-record">The local record is messy</a></li>
    <li><a href="#discipline">What discipline would look like</a></li>
    <li><a href="#source-notes">Source notes</a></li>
  </ol>
</section>
<section class="aside-card">
  <h3>How this story was built</h3>
  <p>The Press downloaded EIA Electric Power Annual tables, calculated national and state-scale comparisons, validated a 110-link source stack, and built source cards from the same IDs used in the inline citations.</p>
</section>
<section class="aside-card">
  <h3>Story file</h3>
  <p><strong>Section:</strong> Technology</p>
  <p><strong>Type:</strong> Investigation</p>
  <p><strong>Sources:</strong> 110</p>
  <p><strong>Visuals:</strong> Photorealistic editorial art, source cards, and ledger-style inline illustrations.</p>
</section>
""".strip()


def main() -> None:
    BODY_PATH.write_text(build_body(), encoding="utf-8")
    ASIDE_PATH.write_text(build_aside(), encoding="utf-8")
    print(f"wrote {BODY_PATH.relative_to(ROOT)}")
    print(f"wrote {ASIDE_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
