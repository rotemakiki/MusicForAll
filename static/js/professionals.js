document.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("professionals-grid");
  const countEl = document.getElementById("results-count");

  const filterType = document.getElementById("filter-type");
  const filterArea = document.getElementById("filter-area");
  const filterLanguage = document.getElementById("filter-language");
  const filterRating = document.getElementById("filter-rating");

  const areaDropdown = document.getElementById("area-filter-dropdown");
  const areaToggle = document.getElementById("area-filter-toggle");
  const areaMenu = document.getElementById("area-filter-menu");
  const areaLabel = document.getElementById("area-filter-label");
  const areaSearch = document.getElementById("area-filter-search");

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

  function normalizeAreaValue(value) {
    return lc(value)
      .replace(/[״"׳']/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*-\s*/g, "-");
  }

  function getSelectedAreaValues() {
    const selectedArea = (filterArea?.value || "").trim();
    if (!selectedArea) return [];

    const matchValues = (filterArea?.dataset.matchValues || selectedArea)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    return Array.from(new Set([selectedArea, ...matchValues]));
  }

  function matchesArea(areas, selectedValues) {
    if (!selectedValues.length) return true;

    const normalizedAreas = areas.map(normalizeAreaValue).filter(Boolean);
    const normalizedSelected = selectedValues.map(normalizeAreaValue).filter(Boolean);

    return normalizedSelected.some((needle) =>
      normalizedAreas.some((haystack) =>
        haystack === needle || haystack.includes(needle) || needle.includes(haystack)
      )
    );
  }

  function isTeacherModeSelected() {
    return (filterType?.value || "") === "teacher";
  }

  function hasActiveTeacherFilter() {
    return Boolean(
      filterTeacherAvailable?.checked ||
        filterTeacherOnline?.checked ||
        (filterTeacherGenre?.value || "").trim() ||
        (filterTeacherLessonType?.value || "").trim()
    );
  }

  function setTeacherFiltersVisible() {
    const selectedType = (filterType?.value || "").trim();
    const show = !selectedType || isTeacherModeSelected() || hasActiveTeacherFilter();
    if (teacherFiltersWrap) teacherFiltersWrap.style.display = show ? "block" : "none";
  }

  function matchesCard(card) {
    const types = parseCsvAttr(card, "data-types");
    const areas = parseCsvAttr(card, "data-areas");
    const languages = parseCsvAttr(card, "data-languages");
    const ratingRaw = (card.getAttribute("data-rating") || "").trim();
    const rating = ratingRaw ? Number(ratingRaw) : null;

    const selectedType = (filterType?.value || "").trim();
    const selectedAreaValues = getSelectedAreaValues();
    const selectedLanguage = (filterLanguage?.value || "").trim();
    const selectedRating = (filterRating?.value || "").trim();

    if (selectedType && !types.includes(selectedType)) return false;
    if (!matchesArea(areas, selectedAreaValues)) return false;
    if (selectedLanguage && !languages.includes(selectedLanguage)) return false;
    if (selectedRating) {
      const min = Number(selectedRating);
      if (rating === null || Number.isNaN(rating) || rating < min) return false;
    }

    // Teacher-specific filters also work from the general directory view.
    if (selectedType === "teacher" || hasActiveTeacherFilter()) {
      const isTeacher = types.includes("teacher");
      if (!isTeacher) return false;

      const tAvailable = (card.getAttribute("data-teacher-available") || "0") === "1";
      const tOnline = (card.getAttribute("data-teacher-online") || "0") === "1";
      const tGenres = parseCsvAttr(card, "data-teacher-genres").map(lc);
      const tLessonType = lc(card.getAttribute("data-teacher-lesson-type"));

      if (filterTeacherAvailable?.checked && !tAvailable) return false;
      if (filterTeacherOnline?.checked && !tOnline) return false;

      const genreNeedle = lc(filterTeacherGenre?.value);
      if (genreNeedle) {
        // teacher_genres stores canonical values (e.g. "blues")
        if (!tGenres.includes(genreNeedle)) return false;
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

  function setAreaMenuOpen(open) {
    if (!areaMenu || !areaToggle) return;

    areaMenu.hidden = !open;
    areaToggle.setAttribute("aria-expanded", open ? "true" : "false");

    if (open && areaSearch) {
      window.setTimeout(() => areaSearch.focus(), 0);
    }
  }

  function updateAreaLabel() {
    if (!areaLabel || !filterArea) return;

    areaLabel.textContent = filterArea.dataset.label || "הכל";

    const selected = filterArea.value || "";
    areaDropdown?.querySelectorAll(".area-option").forEach((option) => {
      option.classList.toggle("is-active", option.getAttribute("data-area-value") === selected);
    });
  }

  function setAreaValue(option) {
    if (!filterArea || !option) return;

    filterArea.value = option.getAttribute("data-area-value") || "";
    filterArea.dataset.label = option.getAttribute("data-area-label") || "הכל";
    filterArea.dataset.matchValues = option.getAttribute("data-area-match-values") || filterArea.value;

    updateAreaLabel();
    applyFilters();
    setAreaMenuOpen(false);
  }

  function filterAreaOptions() {
    if (!areaDropdown || !areaSearch) return;

    const query = normalizeAreaValue(areaSearch.value);

    areaDropdown.querySelectorAll(".area-group").forEach((group) => {
      let hasVisibleOption = false;
      const options = Array.from(group.querySelectorAll(".area-option"));
      const groupOptions = group.querySelector(".area-group-options");
      const groupToggle = group.querySelector(".area-group-toggle");

      options.forEach((option) => {
        const searchText = normalizeAreaValue(
          option.getAttribute("data-area-search") || option.textContent || ""
        );
        const visible = !query || searchText.includes(query);
        option.hidden = !visible;
        hasVisibleOption = hasVisibleOption || visible;
      });

      group.hidden = !hasVisibleOption;

      if (query && hasVisibleOption) {
        if (groupOptions) groupOptions.hidden = false;
        if (groupToggle) groupToggle.setAttribute("aria-expanded", "true");
      } else if (!query && groupOptions && groupToggle?.getAttribute("aria-expanded") !== "true") {
        groupOptions.hidden = true;
      }
    });
  }

  function resetAreaFilter() {
    if (!filterArea) return;

    filterArea.value = "";
    filterArea.dataset.label = "הכל";
    filterArea.dataset.matchValues = "";
    if (areaSearch) areaSearch.value = "";
    filterAreaOptions();
    updateAreaLabel();
  }

  function setupAreaFilter() {
    if (!areaDropdown || !areaToggle || !areaMenu) return;

    areaToggle.addEventListener("click", function () {
      setAreaMenuOpen(areaMenu.hidden);
    });

    areaDropdown.querySelectorAll(".area-group-toggle").forEach((toggle) => {
      toggle.addEventListener("click", function () {
        const options = toggle.nextElementSibling;
        const open = options?.hidden !== false;
        if (options) options.hidden = !open;
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });

    areaDropdown.querySelectorAll(".area-option").forEach((option) => {
      option.addEventListener("click", function () {
        setAreaValue(option);
      });
    });

    if (areaSearch) {
      areaSearch.addEventListener("input", filterAreaOptions);
    }

    document.addEventListener("click", function (event) {
      if (!areaDropdown.contains(event.target)) {
        setAreaMenuOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setAreaMenuOpen(false);
      }
    });

    updateAreaLabel();
  }

  function resetFilters() {
    if (filterType) filterType.value = "";
    resetAreaFilter();
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

  setupAreaFilter();

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

