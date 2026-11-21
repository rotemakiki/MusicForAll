// Shared arrangement helpers for the chord editor and the player.
// The sidebar stores each part once. The arrangement stores order and repeats.
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.SongArrangement = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
    function chordToken(chord) {
        const name = chord && chord.chord != null ? String(chord.chord) : "";
        const beats = Number(chord && (chord.beats || chord.width)) || 0;
        return name + "|" + beats;
    }

    function loopTokens(loop) {
        const tokens = [];
        (loop && loop.measures ? loop.measures : []).forEach((measure) => {
            (measure && measure.chords ? measure.chords : []).forEach((chord) => {
                tokens.push(chordToken(chord));
            });
        });
        return tokens;
    }

    function chordTokens(chords) {
        const tokens = [];
        (Array.isArray(chords) ? chords : []).forEach((line) => {
            if (!Array.isArray(line)) return;
            line.forEach((chord) => tokens.push(chordToken(chord)));
        });
        return tokens;
    }

    function expandedTokenCount(items) {
        return (items || []).reduce((sum, item) => {
            const repeats = Math.max(1, parseInt(item && item.repeatCount, 10) || 1);
            return sum + loopTokens(item).length * repeats;
        }, 0);
    }

    function measuresKey(measures) {
        try {
            return JSON.stringify(measures || []);
        } catch (error) {
            return "";
        }
    }

    function partName(item) {
        return ((item && (item.customName || item.name)) || "").toString().trim();
    }

    function cloneMeasures(measures) {
        try {
            return JSON.parse(JSON.stringify(measures || []));
        } catch (error) {
            return [];
        }
    }

    function toArrangementItem(item, repeatCount) {
        const measures = cloneMeasures(item && item.measures);
        const name = partName(item);
        return {
            customName: name,
            name: name,
            measures: measures,
            measureCount: measures.length,
            repeatCount: Math.max(1, parseInt(repeatCount, 10) || parseInt(item && item.repeatCount, 10) || 1),
            sourceLoopId: item && item.sourceLoopId ? item.sourceLoopId : null
        };
    }

    function uniqueLibrary(items) {
        const seen = new Set();
        const library = [];
        (items || []).forEach((item) => {
            if (!item || !Array.isArray(item.measures) || item.measures.length === 0) return;
            const key = partName(item) + "||" + measuresKey(item.measures);
            if (seen.has(key)) return;
            seen.add(key);
            library.push(toArrangementItem(item, 1));
        });
        return library;
    }

    function tokensMatch(tokens, pos, partTokens) {
        if (!partTokens.length || pos + partTokens.length > tokens.length) return false;
        for (let i = 0; i < partTokens.length; i++) {
            if (tokens[pos + i] !== partTokens[i]) return false;
        }
        return true;
    }

    // Rebuild order and repeat counts by walking the saved chord stream.
    // Identical parts keep a combined name, because the chords alone cannot tell them apart.
    function reconstruct(library, chords) {
        const tokens = chordTokens(chords);
        if (!tokens.length || !library.length) return [];

        const prepared = library
            .map((loop) => ({ loop: loop, tokens: loopTokens(loop) }))
            .filter((entry) => entry.tokens.length > 0);
        if (!prepared.length) return [];

        const result = [];
        let pos = 0;

        while (pos < tokens.length) {
            const matches = prepared.filter((entry) => tokensMatch(tokens, pos, entry.tokens));
            if (!matches.length) return [];

            const maxLen = Math.max.apply(null, matches.map((entry) => entry.tokens.length));
            const best = matches.filter((entry) => entry.tokens.length === maxLen);
            const signature = best[0].tokens.join("~");
            const names = [];
            best.forEach((entry) => {
                const name = partName(entry.loop);
                if (name && names.indexOf(name) === -1) names.push(name);
            });

            const base = best[0].loop;
            const label = names.length ? names.join(" / ") : partName(base);
            const last = result[result.length - 1];
            if (last && last._signature === signature) {
                last.repeatCount += 1;
            } else {
                const item = toArrangementItem(
                    {
                        customName: label,
                        name: label,
                        measures: base.measures,
                        sourceLoopId: names.length === 1 ? base.sourceLoopId : null
                    },
                    1
                );
                item._signature = signature;
                result.push(item);
            }
            pos += maxLen;
        }

        if (pos !== tokens.length) return [];
        return result.map((item) => {
            delete item._signature;
            return item;
        });
    }

    function resolve(songData) {
        const data = songData || {};
        const structure = Array.isArray(data.structure) ? data.structure : [];
        const loops = Array.isArray(data.loops) ? data.loops : [];
        const chords = Array.isArray(data.chords) ? data.chords : [];

        const savedArrangement = structure.length ? structure : loops;
        const library = uniqueLibrary(loops.length ? loops : savedArrangement);
        const savedCount = expandedTokenCount(savedArrangement);
        const chordCount = chordTokens(chords).length;

        let arrangement = savedArrangement.map((item) => toArrangementItem(item, item.repeatCount));
        let recovered = false;

        if (chordCount > savedCount && library.length) {
            const rebuilt = reconstruct(library, chords);
            if (rebuilt.length && expandedTokenCount(rebuilt) > savedCount) {
                arrangement = rebuilt;
                recovered = true;
            }
        }

        return {
            library: library.length ? library : uniqueLibrary(arrangement),
            arrangement: arrangement,
            recovered: recovered
        };
    }

    return {
        resolve: resolve,
        uniqueLibrary: uniqueLibrary,
        reconstruct: reconstruct,
        expandedTokenCount: expandedTokenCount
    };
});
