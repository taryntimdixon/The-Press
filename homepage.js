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

  const revealTargets = Array.from(document.querySelectorAll(
    ".home-recency-section, .on-this-day, .below-fold-flipper, .home-cartoons"
  ));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
