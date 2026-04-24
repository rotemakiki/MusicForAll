// Tutorials Page - dynamic list + search/filters
document.addEventListener("DOMContentLoaded", () => {
  const searchEl = document.getElementById("tutorialSearch");
  const subjectEl = document.getElementById("subjectFilter");
  const teacherEl = document.getElementById("teacherFilter");
  const typeEl = document.getElementById("typeFilter");
  const sortEl = document.getElementById("sortFilter");
  const minRatingEl = document.getElementById("minRatingFilter");

  const state = {
    q: "",
    subject: "",
    teacherId: "",
    type: "all",
    sort: "new",
    minRating: "0",
    debounceTimer: null,
  };

  const load = () => loadTutorials(state);

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      state.q = searchEl.value || "";
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(load, 250);
    });
  }
  if (typeEl) typeEl.addEventListener("change", () => ((state.type = typeEl.value), load()));
  if (sortEl) sortEl.addEventListener("change", () => ((state.sort = sortEl.value), load()));
  if (minRatingEl) minRatingEl.addEventListener("change", () => ((state.minRating = minRatingEl.value), load()));
  if (teacherEl) teacherEl.addEventListener("change", () => ((state.teacherId = teacherEl.value), load()));
  if (subjectEl) {
    subjectEl.addEventListener("input", () => {
      state.subject = subjectEl.value || "";
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(load, 250);
    });
  }

  load();
});

function setVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    sp.set(k, s);
  });
  return sp.toString();
}

async function loadTutorials(state) {
  setVisible("errorState", false);
  setVisible("emptyState", false);
  setVisible("tutorialsGrid", false);
  setVisible("loadingState", true);

  try {
    const qs = buildQuery({
      q: state.q,
      type: state.type,
      sort: state.sort,
      min_rating: state.minRating,
      teacher_id: state.teacherId,
      subject: state.subject,
    });
    const res = await fetch(`/api/tutorials?${qs}`);
    const data = await res.json();

    setVisible("loadingState", false);

    if (!data || !data.success) {
      setVisible("errorState", true);
      return;
    }

    const list = data.tutorials || [];
    if (!list.length) {
      setVisible("emptyState", true);
      return;
    }

    hydrateTeacherFilter(list);
    renderTutorials(list);
    setVisible("tutorialsGrid", true);
  } catch (e) {
    console.error("Error loading tutorials:", e);
    setVisible("loadingState", false);
    setVisible("errorState", true);
  }
}

function hydrateTeacherFilter(list) {
  const teacherEl = document.getElementById("teacherFilter");
  if (!teacherEl) return;

  const current = teacherEl.value || "";
  const options = new Map();
  list.forEach((t) => {
    if (!t.teacher_id) return;
    options.set(t.teacher_id, t.teacher_name || "לא ידוע");
  });

  // Only repopulate if empty (first load) to avoid jumping around.
  if (teacherEl.dataset.hydrated === "1") return;
  teacherEl.dataset.hydrated = "1";

  const sorted = Array.from(options.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "he"));
  sorted.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    teacherEl.appendChild(opt);
  });
  teacherEl.value = current;
}

function renderTutorials(tutorials) {
  const grid = document.getElementById("tutorialsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  tutorials.forEach((t) => {
    const card = document.createElement("div");
    card.className = "tutorial-card";
    card.tabIndex = 0;

    const isVideo = (t.content_type || "video") === "video";
    const icon = isVideo ? "🎬" : "📝";
    const badgeClass = isVideo ? "badge badge-video" : "badge badge-written";
    const badgeLabel = isVideo ? "סרטון" : "כתוב";
    const teacherName = t.teacher_name || "לא ידוע";
    const subject = t.subject || "כללי";

    const ratingText =
      t.avg_rating && t.reviews_count
        ? `⭐ ${t.avg_rating} (${t.reviews_count})`
        : "⭐ אין דירוגים";

    const durationText = t.duration_minutes ? `⏱️ ${t.duration_minutes} דק׳` : "⏱️ —";
    const viewsText = `👁️ ${Number(t.views || 0).toLocaleString("he-IL")} צפיות`;

    const teacherImg = t.teacher_profile_image
      ? `<img src="${escapeHtml(t.teacher_profile_image)}" alt="תמונת פרופיל">`
      : `<img src="data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='55%' text-anchor='middle' font-size='34' fill='#64748b'>👤</text></svg>`
        )}" alt="תמונת פרופיל">`;

    card.innerHTML = `
      <div class="tutorial-header">
        <div class="tutorial-icon">${icon}</div>
        <h3>${escapeHtml(t.title || "ללא כותרת")}</h3>
      </div>
      <div class="tutorial-content">
        <div class="tutorial-meta-row">
          <div class="tutorial-badges">
            <span class="${badgeClass}">${badgeLabel}</span>
            <span class="badge">${escapeHtml(subject)}</span>
          </div>
          <a class="teacher-chip" href="/teacher/${encodeURIComponent(t.teacher_id || "")}">
            ${teacherImg}
            <span>${escapeHtml(teacherName)}</span>
          </a>
        </div>

        <p>${escapeHtml(t.description || "").slice(0, 160)}${(t.description || "").length > 160 ? "..." : ""}</p>

        <div class="tutorial-stats">
          <span class="duration">${durationText}</span>
          <span class="views">${viewsText}</span>
        </div>

        <div class="tutorial-stats" style="border-top: none; margin-top: 0; padding-top: 0;">
          <span class="duration" style="background: #f8fafc !important; color:#334155 !important;">${ratingText}</span>
          <span class="views" style="background: #f8fafc !important; color:#334155 !important;">#${escapeHtml(t.id || "")}</span>
        </div>

        <button class="open-tutorial-btn" type="button">
          פתח הדרכה
        </button>
      </div>
    `;

    const open = () => {
      if (!t.id) return;
      window.location.href = `/tutorial/${encodeURIComponent(t.id)}`;
    };
    card.addEventListener("click", (e) => {
      if (e.target && e.target.closest && e.target.closest("a")) return;
      open();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    card.querySelector(".open-tutorial-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });

    grid.appendChild(card);
  });
}
