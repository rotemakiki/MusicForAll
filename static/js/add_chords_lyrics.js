(() => {
  const STORAGE_KEY_TEXT = "play_method_chords_lyrics_text_new";
  const STORAGE_KEY_RETURN = "play_methods_return_to";

  const editor = document.getElementById("acl-editor");
  const btnAdd = document.getElementById("acl-add-line");
  const btnImport = document.getElementById("acl-import");
  const btnExport = document.getElementById("acl-export");
  const btnSaveReturn = document.getElementById("acl-save-return");

  const modal = document.getElementById("acl-modal");
  const modalText = document.getElementById("acl-modal-text");
  const modalApply = document.getElementById("acl-modal-apply");

  let modalMode = "import"; // import | export

  function getReturnTo() {
    const fromGlobal = typeof window.aclReturnTo === "string" ? window.aclReturnTo : null;
    try {
      const fromLS = localStorage.getItem(STORAGE_KEY_RETURN);
      return fromGlobal || fromLS || "/add_song";
    } catch (e) {
      return fromGlobal || "/add_song";
    }
  }

  function setReturnTo(returnTo) {
    try {
      localStorage.setItem(STORAGE_KEY_RETURN, returnTo);
    } catch (e) {
      // ignore
    }
  }

  function createLine(chords = "", lyrics = "") {
    const wrap = document.createElement("div");
    wrap.className = "acl-line";

    const fields = document.createElement("div");
    fields.className = "acl-line-fields";

    const chordsInput = document.createElement("input");
    chordsInput.type = "text";
    chordsInput.className = "acl-input acl-chords";
    chordsInput.placeholder = "אקורדים (למשל: Am      G      C)";
    chordsInput.value = chords;

    const lyricsInput = document.createElement("input");
    lyricsInput.type = "text";
    lyricsInput.className = "acl-input acl-lyrics";
    lyricsInput.placeholder = "מילים...";
    lyricsInput.value = lyrics;

    fields.appendChild(chordsInput);
    fields.appendChild(lyricsInput);

    const actions = document.createElement("div");
    actions.className = "acl-line-actions";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "acl-mini-btn";
    upBtn.title = "הזז למעלה";
    upBtn.textContent = "↑";

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "acl-mini-btn";
    downBtn.title = "הזז למטה";
    downBtn.textContent = "↓";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "acl-mini-btn acl-mini-btn-danger";
    delBtn.title = "מחק שורה";
    delBtn.textContent = "🗑";

    upBtn.addEventListener("click", () => {
      const prev = wrap.previousElementSibling;
      if (prev) editor.insertBefore(wrap, prev);
      persist();
    });
    downBtn.addEventListener("click", () => {
      const next = wrap.nextElementSibling;
      if (next) editor.insertBefore(next, wrap);
      persist();
    });
    delBtn.addEventListener("click", () => {
      wrap.remove();
      if (editor.children.length === 0) {
        editor.appendChild(createLine("", ""));
      }
      persist();
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);

    wrap.appendChild(fields);
    wrap.appendChild(actions);

    const onChange = () => persist();
    chordsInput.addEventListener("input", onChange);
    lyricsInput.addEventListener("input", onChange);

    return wrap;
  }

  function parseTextToLines(text) {
    const raw = String(text || "").replace(/\r\n/g, "\n");
    const lines = raw.split("\n");
    const out = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const next = lines[i + 1] ?? "";

      // Heuristic: if a line contains mostly chord-like tokens, treat it as chords line
      const looksLikeChords = /(^|\s)([A-Ga-g][#b]?)(m|maj|min|dim|aug|sus|add)?\d*(\/[A-Ga-g][#b]?)?(\s|$)/.test(line);

      if (looksLikeChords) {
        out.push({ chords: line, lyrics: next });
        i += 1;
      } else if (line.trim() === "" && next.trim() === "") {
        // collapse empty pairs into a single empty line (keeps spacing manageable)
        continue;
      } else {
        // lyrics only line
        out.push({ chords: "", lyrics: line });
      }
    }

    return out.length ? out : [{ chords: "", lyrics: "" }];
  }

  function exportLinesToText() {
    const parts = [];
    Array.from(editor.children).forEach((row) => {
      const chords = row.querySelector(".acl-chords")?.value ?? "";
      const lyrics = row.querySelector(".acl-lyrics")?.value ?? "";
      if (chords.trim() !== "" || lyrics.trim() !== "") {
        if (chords.trim() !== "") parts.push(chords);
        parts.push(lyrics);
        parts.push(""); // blank line between pairs
      }
    });
    // If everything empty, return empty string
    const joined = parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    return joined;
  }

  function persist() {
    const text = exportLinesToText();
    try {
      localStorage.setItem(STORAGE_KEY_TEXT, text);
    } catch (e) {
      // ignore
    }
  }

  function loadInitial() {
    const returnTo = getReturnTo();
    setReturnTo(returnTo);

    let text = "";
    try {
      text = localStorage.getItem(STORAGE_KEY_TEXT) || "";
    } catch (e) {
      text = "";
    }

    const parsed = parseTextToLines(text);
    editor.innerHTML = "";
    parsed.forEach((l) => editor.appendChild(createLine(l.chords, l.lyrics)));
    if (editor.children.length === 0) editor.appendChild(createLine("", ""));
  }

  function openModal(mode, initialText) {
    modalMode = mode;
    modal.hidden = false;
    modalText.value = initialText || "";
    modalText.focus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  function bindModal() {
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") !== null) {
        closeModal();
      }
    });
    document.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", (e) => {
      if (!modal.hidden && e.key === "Escape") closeModal();
    });

    modalApply.addEventListener("click", async () => {
      if (modalMode === "import") {
        const parsed = parseTextToLines(modalText.value);
        editor.innerHTML = "";
        parsed.forEach((l) => editor.appendChild(createLine(l.chords, l.lyrics)));
        if (editor.children.length === 0) editor.appendChild(createLine("", ""));
        persist();
        closeModal();
      } else {
        // export mode: copy to clipboard
        try {
          await navigator.clipboard.writeText(modalText.value || "");
          modalApply.textContent = "הועתק!";
          setTimeout(() => (modalApply.textContent = "החל"), 1200);
        } catch (e) {
          // ignore; user can copy manually
        }
      }
    });
  }

  function bindToolbar() {
    btnAdd.addEventListener("click", () => {
      editor.appendChild(createLine("", ""));
      persist();
    });

    btnImport.addEventListener("click", () => {
      openModal("import", "");
    });

    btnExport.addEventListener("click", () => {
      openModal("export", exportLinesToText());
    });

    btnSaveReturn.addEventListener("click", () => {
      persist();
      window.location.href = getReturnTo();
    });
  }

  function init() {
    bindModal();
    bindToolbar();
    loadInitial();
  }

  init();
})();

