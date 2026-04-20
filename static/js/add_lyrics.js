(() => {
  const STORAGE_KEY_TEXT = "play_method_lyrics_text_new";
  const STORAGE_KEY_RETURN = "play_methods_return_to";

  const editor = document.getElementById("lyrics-editor");
  const btnSaveReturn = document.getElementById("lyrics-save-return");
  const btnClear = document.getElementById("lyrics-clear");

  const returnTo = typeof window.lyricsReturnTo === "string" ? window.lyricsReturnTo : "/add_song";
  try { localStorage.setItem(STORAGE_KEY_RETURN, returnTo); } catch (e) { /* ignore */ }

  function load() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_TEXT);
      if (v !== null && v !== undefined) editor.value = v;
    } catch (e) {
      // ignore
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY_TEXT, editor.value || "");
    } catch (e) {
      // ignore
    }
  }

  editor.addEventListener("input", persist);

  btnClear.addEventListener("click", () => {
    editor.value = "";
    persist();
  });

  btnSaveReturn.addEventListener("click", () => {
    persist();
    window.location.href = returnTo;
  });

  load();
})();

