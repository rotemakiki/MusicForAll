(() => {
  function getStorageKeyText() {
    try {
      const editingSongId = localStorage.getItem("editingSongId");
      if (editingSongId) return `play_method_tabs_text_edit_${editingSongId}`;
    } catch (e) {
      // ignore
    }
    return "play_method_tabs_text_new";
  }

  const STORAGE_KEY_TEXT = getStorageKeyText();
  const STORAGE_KEY_RETURN = "play_methods_return_to";

  const editor = document.getElementById("tabs-editor");
  const btnSaveReturn = document.getElementById("tabs-save-return");
  const btnTemplate = document.getElementById("tabs-insert-template");
  const templateSelect = document.getElementById("tabs-template-select");

  const returnTo = typeof window.tabsReturnTo === "string" ? window.tabsReturnTo : "/add_song";
  try { localStorage.setItem(STORAGE_KEY_RETURN, returnTo); } catch (e) { /* ignore */ }

  function buildTemplate(sectionName = "פתיח (Intro)", measures = 4) {
    const measureLine = ["        "];
    const countLine = ["        "];
    const stringLine = "|----------------";

    for (let i = 1; i <= measures; i += 1) {
      measureLine.push(`|${String(i).padEnd(16, " ")}`);
      countLine.push("|1 & 2 & 3 & 4 & ");
    }

    return [
      `[${sectionName}]`,
      `${measureLine.join("")}|`,
      `${countLine.join("")}|`,
      `e${stringLine.repeat(measures)}|`,
      `B${stringLine.repeat(measures)}|`,
      `G${stringLine.repeat(measures)}|`,
      `D${stringLine.repeat(measures)}|`,
      `A${stringLine.repeat(measures)}|`,
      `E${stringLine.repeat(measures)}|`,
      "",
    ].join("\n");
  }

  function defaultTemplate() {
    return buildTemplate();
  }

  function load() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_TEXT);
      if (v !== null && v !== undefined) editor.value = v;
    } catch (e) {
      // ignore
    }
    if (!editor.value) editor.value = defaultTemplate();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY_TEXT, editor.value || "");
      localStorage.setItem(`${STORAGE_KEY_TEXT}_dirty`, "true");
    } catch (e) {
      // ignore
    }
  }

  function markReturningToSongForm() {
    try {
      localStorage.setItem("returningFromPlayMethodEditor", "true");
    } catch (e) {
      // ignore
    }
  }

  editor.addEventListener("input", persist);

  btnTemplate.addEventListener("click", () => {
    const template = buildTemplate(templateSelect ? templateSelect.value : undefined);
    const currentValue = editor.value || "";
    const start = editor.selectionStart || 0;
    const end = editor.selectionEnd || 0;
    const needsSeparator = currentValue.trim().length > 0 && start > 0;
    const insertText = `${needsSeparator ? "\n" : ""}${template}`;

    editor.value = `${currentValue.slice(0, start)}${insertText}${currentValue.slice(end)}`;
    editor.focus();
    const cursor = start + insertText.length;
    editor.setSelectionRange(cursor, cursor);
    persist();
  });

  btnSaveReturn.addEventListener("click", () => {
    persist();
    markReturningToSongForm();
    window.location.href = returnTo;
  });

  load();
})();

