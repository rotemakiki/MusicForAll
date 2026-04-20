(() => {
  const STORAGE_KEY_TEXT = "play_method_tabs_text_new";
  const STORAGE_KEY_RETURN = "play_methods_return_to";

  const editor = document.getElementById("tabs-editor");
  const btnSaveReturn = document.getElementById("tabs-save-return");
  const btnTemplate = document.getElementById("tabs-insert-template");

  const returnTo = typeof window.tabsReturnTo === "string" ? window.tabsReturnTo : "/add_song";
  try { localStorage.setItem(STORAGE_KEY_RETURN, returnTo); } catch (e) { /* ignore */ }

  function defaultTemplate() {
    return [
      "e|----------------",
      "B|----------------",
      "G|----------------",
      "D|----------------",
      "A|----------------",
      "E|----------------",
      "",
    ].join("\n");
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
    } catch (e) {
      // ignore
    }
  }

  editor.addEventListener("input", persist);

  btnTemplate.addEventListener("click", () => {
    editor.value = defaultTemplate();
    persist();
  });

  btnSaveReturn.addEventListener("click", () => {
    persist();
    window.location.href = returnTo;
  });

  load();
})();

