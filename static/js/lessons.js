// Lessons Page - dynamic list + search/filters
document.addEventListener("DOMContentLoaded", () => {
  const searchEl = document.getElementById("lessonSearch");
  const subjectEl = document.getElementById("subjectFilter");
  const teacherEl = document.getElementById("teacherFilter");
  const sortEl = document.getElementById("sortFilter");
  const minRatingEl = document.getElementById("minRatingFilter");

  const state = {
    q: "",
    subject: "",
    teacherId: "",
    sort: "new",
    minRating: "0",
    debounceTimer: null,
  };

  const load = () => loadLessons(state);

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      state.q = searchEl.value || "";
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(load, 250);
    });
  }
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

async function loadLessons(state) {
  setVisible("errorState", false);
  setVisible("emptyState", false);
  setVisible("lessonsGrid", false);
  setVisible("loadingState", true);

  try {
    const qs = buildQuery({
      q: state.q,
      sort: state.sort,
      min_rating: state.minRating,
      teacher_id: state.teacherId,
      subject: state.subject,
    });
    const res = await fetch(`/api/lessons?${qs}`);
    const data = await res.json();

    setVisible("loadingState", false);

    if (!data || !data.success) {
      setVisible("errorState", true);
      return;
    }

    const list = data.lessons || [];
    if (!list.length) {
      setVisible("emptyState", true);
      return;
    }

    hydrateTeacherFilter(list);
    renderLessons(list);
    setVisible("lessonsGrid", true);
  } catch (e) {
    console.error("Error loading lessons:", e);
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

function renderLessons(lessons) {
  const grid = document.getElementById("lessonsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  lessons.forEach((l) => {
    const card = document.createElement("div");
    card.className = "lesson-card";
    card.tabIndex = 0;

    const teacherName = l.teacher_name || "לא ידוע";
    const subject = l.subject || "כללי";

    const ratingText =
      l.avg_rating && l.reviews_count ? `⭐ ${l.avg_rating} (${l.reviews_count})` : "⭐ אין דירוגים";

    const durationText = l.duration_minutes ? `⏱️ ${l.duration_minutes} דק׳` : "⏱️ —";
    const viewsText = `👁️ ${Number(l.views || 0).toLocaleString("he-IL")} צפיות`;

    const teacherImg = l.teacher_profile_image
      ? `<img src="${escapeHtml(l.teacher_profile_image)}" alt="תמונת פרופיל">`
      : `<img src="data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='55%' text-anchor='middle' font-size='34' fill='#64748b'>👤</text></svg>`
        )}" alt="תמונת פרופיל">`;

    const cover = l.cover_image
      ? `<img src="${escapeHtml(l.cover_image)}" alt="תמונה" style="width:100%; height:100%; object-fit:cover;">`
      : `<div style="font-size:40px;">🎼</div>`;

    card.innerHTML = `
      <div class="lesson-cover">${cover}</div>
      <div class="lesson-body">
        <h3 class="lesson-title">${escapeHtml(l.title || "ללא כותרת")}</h3>
        <p class="lesson-desc">${escapeHtml(l.description || "").slice(0, 150)}${(l.description || "").length > 150 ? "..." : ""}</p>
        <div class="lesson-meta-row">
          <span class="badge">🏷️ ${escapeHtml(subject)}</span>
          <a class="teacher-chip" href="/teacher/${encodeURIComponent(l.teacher_id || "")}">
            ${teacherImg}
            <span>${escapeHtml(teacherName)}</span>
          </a>
        </div>
        <div class="lesson-meta-row" style="margin-top:10px;">
          <span class="badge">${durationText}</span>
          <span class="badge">${viewsText}</span>
          <span class="badge">${ratingText}</span>
        </div>
      </div>
    `;

    const open = () => {
      // Detail page will be added later; keep UX predictable now.
      if (!l.id) return;
      window.location.href = `/lessons#${encodeURIComponent(l.id)}`;
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

    grid.appendChild(card);
  });
}

