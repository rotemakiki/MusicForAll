// Tutorial videos manager for add/edit song forms.
// - Edit mode: uploads immediately to /api/songs/<id>/tutorial-videos and shows existing videos.
// - Add mode: queues videos in memory; song_form_manager.js uploads them after the song is created
//   via the exposed window.uploadPendingTutorialVideos(songId) hook.

(function () {
    const group = document.getElementById("tutorial-videos-group");
    if (!group) return;

    const mode = group.dataset.mode === "edit" ? "edit" : "add";
    const songId = group.dataset.songId || null;
    const currentUser = group.dataset.currentUser || "";
    const maxPerSong = parseInt(group.dataset.maxPerSong || "6", 10);
    const maxPerTeacher = parseInt(group.dataset.maxPerTeacher || "2", 10);

    const listEl = document.getElementById("tutorial-videos-list");
    const titleEl = document.getElementById("tutorial-video-title");
    const fileEl = document.getElementById("tutorial-video-file");
    const addBtn = document.getElementById("tutorial-video-add-btn");
    const statusEl = document.getElementById("tutorial-videos-status");

    let serverVideos = []; // {id, title, url, uploaded_by}
    let pending = []; // {title, file}

    function escapeHtml(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function setStatus(msg, kind) {
        statusEl.textContent = msg || "";
        statusEl.className = "tutorial-videos-status" + (kind ? " " + kind : "");
    }

    function myCount() {
        const serverMine = serverVideos.filter((v) => v.uploaded_by === currentUser).length;
        return serverMine + pending.length;
    }

    function totalCount() {
        return serverVideos.length + pending.length;
    }

    function canAddMore() {
        return totalCount() < maxPerSong && myCount() < maxPerTeacher;
    }

    function updateUploaderState() {
        const ok = canAddMore();
        addBtn.disabled = !ok;
        fileEl.disabled = !ok;
        titleEl.disabled = !ok;
        if (!ok) {
            setStatus("הגעת למגבלת ההעלאות לשיר זה (עד " + maxPerTeacher + " סרטונים).", "info");
        } else if (statusEl.classList.contains("info")) {
            setStatus("");
        }
    }

    function renderServerItem(v) {
        const li = document.createElement("li");
        li.className = "tutorial-video-item";

        const info = document.createElement("div");
        info.className = "tv-info";
        info.innerHTML =
            '<span class="tv-title">🎬 ' + escapeHtml(v.title) + "</span>" +
            '<video class="tv-preview" src="' + encodeURI(v.url) + '" controls preload="metadata"></video>';
        li.appendChild(info);

        const actions = document.createElement("div");
        actions.className = "tv-actions";
        // Owner can delete from the edit page (admin deletion is allowed server-side too).
        if (mode === "edit" && v.uploaded_by === currentUser) {
            const del = document.createElement("button");
            del.type = "button";
            del.className = "tv-delete-btn";
            del.innerHTML = "🗑️ מחק";
            del.addEventListener("click", function () {
                deleteServerVideo(v.id, del);
            });
            actions.appendChild(del);
        }
        li.appendChild(actions);
        return li;
    }

    function renderPendingItem(p, index) {
        const li = document.createElement("li");
        li.className = "tutorial-video-item pending";

        const info = document.createElement("div");
        info.className = "tv-info";
        info.innerHTML =
            '<span class="tv-title">⏳ ' + escapeHtml(p.title) +
            ' <em>(יעלה עם שמירת השיר)</em></span>' +
            '<span class="tv-file">' + escapeHtml(p.file.name) + "</span>";
        li.appendChild(info);

        const actions = document.createElement("div");
        actions.className = "tv-actions";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "tv-delete-btn";
        del.innerHTML = "✖ הסר";
        del.addEventListener("click", function () {
            pending.splice(index, 1);
            render();
        });
        actions.appendChild(del);
        li.appendChild(actions);
        return li;
    }

    function render() {
        listEl.innerHTML = "";
        serverVideos.forEach(function (v) {
            listEl.appendChild(renderServerItem(v));
        });
        pending.forEach(function (p, i) {
            listEl.appendChild(renderPendingItem(p, i));
        });
        updateUploaderState();
    }

    function resetInputs() {
        titleEl.value = "";
        fileEl.value = "";
    }

    async function uploadOne(sid, title, file) {
        addBtn.disabled = true;
        setStatus("מעלה סרטון... (עשוי לקחת זמן בהתאם לגודל הקובץ)", "info");
        try {
            const fd = new FormData();
            fd.append("title", title);
            fd.append("video_file", file);
            const resp = await fetch("/api/songs/" + sid + "/tutorial-videos", {
                method: "POST",
                body: fd,
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error((data && data.error) || "שגיאה בהעלאה");
            }
            serverVideos.push(data.video);
            resetInputs();
            setStatus("✅ הסרטון הועלה בהצלחה!", "success");
            render();
        } catch (e) {
            setStatus("❌ " + (e.message || "שגיאה בהעלאת הסרטון"), "error");
        } finally {
            addBtn.disabled = false;
            updateUploaderState();
        }
    }

    async function deleteServerVideo(id, btn) {
        if (!window.confirm("למחוק את הסרטון לצמיתות?")) return;
        btn.disabled = true;
        try {
            const resp = await fetch("/api/songs/" + songId + "/tutorial-videos/" + id, {
                method: "DELETE",
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error((data && data.error) || "שגיאה במחיקה");
            }
            serverVideos = data.videos || serverVideos.filter((v) => v.id !== id);
            setStatus("הסרטון נמחק.", "success");
            render();
        } catch (e) {
            setStatus("❌ " + (e.message || "שגיאה במחיקת הסרטון"), "error");
            btn.disabled = false;
        }
    }

    addBtn.addEventListener("click", function () {
        const title = (titleEl.value || "").trim();
        const file = fileEl.files && fileEl.files[0];
        if (!title) {
            setStatus("יש להזין כותרת לסרטון.", "error");
            return;
        }
        if (!file) {
            setStatus("יש לבחור קובץ וידאו.", "error");
            return;
        }
        if (!canAddMore()) {
            setStatus("ניתן להעלות עד " + maxPerTeacher + " סרטונים לשיר זה.", "error");
            return;
        }

        if (mode === "edit" && songId) {
            uploadOne(songId, title, file);
        } else {
            pending.push({ title: title, file: file });
            resetInputs();
            setStatus("הסרטון נוסף לתור ויעלה עם שמירת השיר.", "success");
            render();
        }
    });

    // Hook used by song_form_manager.js after a new song is created.
    window.uploadPendingTutorialVideos = async function (newSongId) {
        if (!newSongId || !pending.length) return;
        const queue = pending.slice();
        for (const p of queue) {
            try {
                const fd = new FormData();
                fd.append("title", p.title);
                fd.append("video_file", p.file);
                await fetch("/api/songs/" + newSongId + "/tutorial-videos", {
                    method: "POST",
                    body: fd,
                });
            } catch (e) {
                // Best effort: keep going even if one upload fails.
                console.error("Tutorial video upload failed:", e);
            }
        }
        pending = [];
    };

    window.hasPendingTutorialVideos = function () {
        return pending.length > 0;
    };

    // Initial load.
    if (mode === "edit" && songId) {
        fetch("/api/songs/" + songId + "/tutorial-videos")
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.success) serverVideos = d.videos || [];
                render();
            })
            .catch(function () { render(); });
    } else {
        render();
    }
})();
