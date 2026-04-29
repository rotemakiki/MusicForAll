document.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("professionals-grid");
  const countEl = document.getElementById("results-count");

  const filterType = document.getElementById("filter-type");
  const filterArea = document.getElementById("filter-area");
  const filterLanguage = document.getElementById("filter-language");
  const filterRating = document.getElementById("filter-rating");

  const teacherFiltersWrap = document.getElementById("teacher-filters");
  const filterTeacherAvailable = document.getElementById("filter-teacher-available");
  const filterTeacherOnline = document.getElementById("filter-teacher-online");
  const filterTeacherGenre = document.getElementById("filter-teacher-genre");
  const filterTeacherLessonType = document.getElementById("filter-teacher-lesson-type");

  const resetBtn = document.getElementById("filters-reset");

  if (!grid) {
    if (countEl) countEl.textContent = "";
    return;
  }

  const cards = Array.from(grid.querySelectorAll(".pro-card"));

  function parseCsvAttr(el, name) {
    const raw = (el.getAttribute(name) || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function lc(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function isTeacherModeSelected() {
    return (filterType?.value || "") === "teacher";
  }

  function setTeacherFiltersVisible() {
    const show = isTeacherModeSelected();
    if (teacherFiltersWrap) teacherFiltersWrap.style.display = show ? "block" : "none";
  }

  function matchesCard(card) {
    const types = parseCsvAttr(card, "data-types");
    const areas = parseCsvAttr(card, "data-areas");
    const languages = parseCsvAttr(card, "data-languages");
    const ratingRaw = (card.getAttribute("data-rating") || "").trim();
    const rating = ratingRaw ? Number(ratingRaw) : null;

    const selectedType = (filterType?.value || "").trim();
    const selectedArea = (filterArea?.value || "").trim();
    const selectedLanguage = (filterLanguage?.value || "").trim();
    const selectedRating = (filterRating?.value || "").trim();

    if (selectedType && !types.includes(selectedType)) return false;
    if (selectedArea && !areas.includes(selectedArea)) return false;
    if (selectedLanguage && !languages.includes(selectedLanguage)) return false;
    if (selectedRating) {
      const min = Number(selectedRating);
      if (rating === null || Number.isNaN(rating) || rating < min) return false;
    }

    // Teacher-only filters (only when teacher type explicitly selected)
    if (selectedType === "teacher") {
      const tAvailable = (card.getAttribute("data-teacher-available") || "0") === "1";
      const tOnline = (card.getAttribute("data-teacher-online") || "0") === "1";
      const tGenres = parseCsvAttr(card, "data-teacher-genres").map(lc);
      const tLessonType = lc(card.getAttribute("data-teacher-lesson-type"));

      if (filterTeacherAvailable?.checked && !tAvailable) return false;
      if (filterTeacherOnline?.checked && !tOnline) return false;

      const genreNeedle = lc(filterTeacherGenre?.value);
      if (genreNeedle) {
        const ok = tGenres.some((g) => g.includes(genreNeedle));
        if (!ok) return false;
      }

      const lessonNeedle = lc(filterTeacherLessonType?.value);
      if (lessonNeedle) {
        if (tLessonType !== lessonNeedle && tLessonType !== "both") return false;
      }
    }

    return true;
  }

  function applyFilters() {
    setTeacherFiltersVisible();

    let shown = 0;
    for (const card of cards) {
      const ok = matchesCard(card);
      card.style.display = ok ? "block" : "none";
      if (ok) shown += 1;
    }

    if (countEl) {
      countEl.textContent = `מציג ${shown} מתוך ${cards.length}`;
    }
  }

  function resetFilters() {
    if (filterType) filterType.value = "";
    if (filterArea) filterArea.value = "";
    if (filterLanguage) filterLanguage.value = "";
    if (filterRating) filterRating.value = "";

    if (filterTeacherAvailable) filterTeacherAvailable.checked = false;
    if (filterTeacherOnline) filterTeacherOnline.checked = false;
    if (filterTeacherGenre) filterTeacherGenre.value = "";
    if (filterTeacherLessonType) filterTeacherLessonType.value = "";

    applyFilters();
  }

  // Events
  const inputs = [
    filterType,
    filterArea,
    filterLanguage,
    filterRating,
    filterTeacherAvailable,
    filterTeacherOnline,
    filterTeacherGenre,
    filterTeacherLessonType,
  ].filter(Boolean);

  inputs.forEach((el) => {
    const ev = el.tagName === "INPUT" ? "input" : "change";
    el.addEventListener(ev, applyFilters);
  });

  if (resetBtn) resetBtn.addEventListener("click", resetFilters);

  // Initial state: teacher filters visible iff teacher selected
  applyFilters();

  // Accessibility: make cards keyboard-clickable
  cards.forEach((card) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
});

