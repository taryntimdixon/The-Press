/* THE PRESS — front-page progress, motion, and editorial detail polish. */
(() => {
  const body = document.body;
  if (!body?.classList.contains("page-home") || body.dataset.pressTwentyMillionReady === "true") return;

  body.dataset.pressTwentyMillionReady = "true";

  const progress = document.createElement("div");
  progress.className = "press-scroll-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Front page reading progress");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.setAttribute("aria-valuenow", "0");
  body.append(progress);

  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    const scrollTop = Math.max(body.scrollTop, document.documentElement.scrollTop, window.scrollY || 0);
    const viewport = body.clientHeight || window.innerHeight;
    const scrollHeight = Math.max(body.scrollHeight, document.documentElement.scrollHeight);
    const maxScroll = Math.max(1, scrollHeight - viewport);
    const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
    progress.style.transform = `scaleX(${ratio})`;
    progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  };

  const queueProgress = () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateProgress);
  };

  body.addEventListener("scroll", queueProgress, { passive: true });
  window.addEventListener("scroll", queueProgress, { passive: true });
  window.addEventListener("resize", queueProgress, { passive: true });
  updateProgress();

  const switcher = document.querySelector(".lead-switcher");
  const polishHeroDetails = () => {
    const panels = Array.from(document.querySelectorAll(".lead-panel"));
    panels.forEach((panel, index) => {
      panel.dataset.tmLead = `LEAD / ${String(index + 1).padStart(2, "0")}`;
      const summary = panel.querySelector(".press-why summary");
      if (summary && summary.textContent.trim() !== "Why this lead") summary.textContent = "Why this lead";
    });
  };

  polishHeroDetails();

  if (switcher && "MutationObserver" in window) {
    const heroObserver = new MutationObserver(polishHeroDetails);
    heroObserver.observe(switcher, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  if (switcher && window.matchMedia("(pointer: fine)").matches) {
    switcher.addEventListener("pointermove", (event) => {
      const box = switcher.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = Math.round(((event.clientX - box.left) / box.width) * 100);
      const y = Math.round(((event.clientY - box.top) / box.height) * 100);
      switcher.style.setProperty("--tm-focus-x", `${Math.min(100, Math.max(0, x))}%`);
      switcher.style.setProperty("--tm-focus-y", `${Math.min(100, Math.max(0, y))}%`);
    }, { passive: true });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sectionNav = document.querySelector(".home-section-nav");
  const sectionNavScroller = sectionNav?.querySelector(".home-section-nav__links");
  const sectionNavLinks = Array.from(sectionNav?.querySelectorAll('a[href^="#"]') || []);
  const sectionNavTargets = sectionNavLinks
    .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
    .filter((item) => item.target);
  const pageScroller = body;
  const pageScrollTop = () => Math.max(
    pageScroller.scrollTop,
    document.documentElement.scrollTop,
    window.scrollY || 0
  );

  const setCurrentSection = (targetId) => {
    sectionNavTargets.forEach(({ link, target }) => {
      const isCurrent = target.id === targetId;
      if (isCurrent) {
        link.setAttribute("aria-current", "location");
        if (sectionNavScroller) {
          const left = link.offsetLeft - ((sectionNavScroller.clientWidth - link.offsetWidth) / 2);
          sectionNavScroller.scrollTo({ left: Math.max(0, left), behavior: "auto" });
        }
      } else link.removeAttribute("aria-current");
    });
  };

  let sectionStateFrame = 0;
  const updateCurrentSection = () => {
    sectionStateFrame = 0;
    if (!sectionNavTargets.length) return;
    const navBottom = sectionNav?.getBoundingClientRect().bottom || 0;
    const activationLine = navBottom + Math.min(150, window.innerHeight * 0.18);
    const viewportHeight = pageScroller.clientHeight || window.innerHeight;
    const atPageEnd = pageScrollTop() + viewportHeight >= pageScroller.scrollHeight - 2;
    let current = sectionNavTargets[0];

    sectionNavTargets.forEach((item) => {
      if (item.target.getBoundingClientRect().top <= activationLine) current = item;
    });
    if (atPageEnd) current = sectionNavTargets[sectionNavTargets.length - 1];
    setCurrentSection(current.target.id);
  };

  const queueSectionState = () => {
    if (sectionStateFrame) return;
    sectionStateFrame = window.requestAnimationFrame(updateCurrentSection);
  };

  body.addEventListener("scroll", queueSectionState, { passive: true });
  window.addEventListener("scroll", queueSectionState, { passive: true });
  window.addEventListener("resize", queueSectionState, { passive: true });
  updateCurrentSection();

  let sectionJumpFrame = 0;
  const animateSectionJump = (target) => {
    if (sectionJumpFrame) window.cancelAnimationFrame(sectionJumpFrame);
    const start = pageScrollTop();
    const scrollMargin = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    const viewportHeight = pageScroller.clientHeight || window.innerHeight;
    const maximum = Math.max(0, pageScroller.scrollHeight - viewportHeight);
    const destination = Math.min(maximum, Math.max(0, start + target.getBoundingClientRect().top - scrollMargin));
    const distance = destination - start;

    if (reduceMotion || Math.abs(distance) < 2) {
      pageScroller.scrollTo({ top: destination, behavior: "auto" });
      updateCurrentSection();
      return;
    }

    const duration = Math.min(820, Math.max(360, 320 + Math.abs(distance) * 0.035));
    const startedAt = window.performance.now();
    const step = (now) => {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      const eased = elapsed < 0.5
        ? 4 * elapsed * elapsed * elapsed
        : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
      pageScroller.scrollTo(0, start + (distance * eased));
      if (elapsed < 1) sectionJumpFrame = window.requestAnimationFrame(step);
      else {
        sectionJumpFrame = 0;
        updateCurrentSection();
      }
    };
    sectionJumpFrame = window.requestAnimationFrame(step);
  };

  sectionNavLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const item = sectionNavTargets.find(({ link: candidate }) => candidate === link);
      if (!item) return;
      event.preventDefault();
      window.history.pushState(null, "", link.hash);
      animateSectionJump(item.target);
    });
  });

  const revealTargets = Array.from(document.querySelectorAll(
    ".home-recency-section, .on-this-day, .home-illustrated-fiction"
  ));

  revealTargets.forEach((node) => node.classList.add("press-preview-reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealTargets.forEach((node) => revealObserver.observe(node));
})();
