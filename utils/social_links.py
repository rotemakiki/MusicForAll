"""Profile social/portfolio links shared by edit and display views."""

from __future__ import annotations

from urllib.parse import urlparse


SOCIAL_LINK_OPTIONS: list[dict[str, str]] = [
    {
        "id": "facebook",
        "label": "Facebook",
        "hint": "דף עסקי בלבד, לא פרופיל אישי",
        "placeholder": "https://www.facebook.com/your-page",
    },
    {
        "id": "instagram",
        "label": "Instagram",
        "hint": "קישור לפרופיל",
        "placeholder": "https://www.instagram.com/your-profile",
    },
    {
        "id": "spotify",
        "label": "Spotify",
        "hint": "דף אמן או פלייליסט",
        "placeholder": "https://open.spotify.com/artist/...",
    },
    {
        "id": "apple_music",
        "label": "Apple Music",
        "hint": "דף אמן, אלבום או פלייליסט",
        "placeholder": "https://music.apple.com/...",
    },
    {
        "id": "youtube",
        "label": "YouTube",
        "hint": "ערוץ, דף אמן או פלייליסט",
        "placeholder": "https://www.youtube.com/@your-channel",
    },
]

_VALID_IDS = {item["id"] for item in SOCIAL_LINK_OPTIONS}
_LEGACY_FIELDS = {
    "facebook": ("facebook", "facebook_url", "facebook_link"),
    "instagram": ("instagram", "instagram_url", "instagram_link"),
    "spotify": ("spotify", "spotify_url", "spotify_link"),
    "apple_music": ("apple_music", "apple_music_url", "apple_music_link", "appleMusic"),
    "youtube": ("youtube", "youtube_url", "youtube_link"),
}


def _normalize_url(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return ""
    return raw


def _host_matches(host: str, domains: tuple[str, ...]) -> bool:
    return any(host == domain or host.endswith(f".{domain}") for domain in domains)


def _is_allowed_for_platform(platform_id: str, url: str) -> bool:
    if not url:
        return True

    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/").lower()

    if platform_id == "facebook":
        if not _host_matches(host, ("facebook.com", "fb.com")):
            return False
        personal_markers = ("profile.php", "people/", "friends", "me/")
        return not any(marker in path for marker in personal_markers)
    if platform_id == "instagram":
        return _host_matches(host, ("instagram.com",))
    if platform_id == "spotify":
        return _host_matches(host, ("spotify.com",))
    if platform_id == "apple_music":
        return _host_matches(host, ("music.apple.com", "itunes.apple.com"))
    if platform_id == "youtube":
        return _host_matches(host, ("youtube.com", "youtu.be"))
    return False


def sanitize_social_links(raw_links: dict | None) -> tuple[dict[str, str], dict[str, str]]:
    links: dict[str, str] = {}
    errors: dict[str, str] = {}

    for platform_id in _VALID_IDS:
        url = _normalize_url((raw_links or {}).get(platform_id, ""))
        if not url:
            continue
        if not _is_allowed_for_platform(platform_id, url):
            errors[platform_id] = "קישור לא מתאים לפלטפורמה"
            continue
        links[platform_id] = url

    return links, errors


def social_links_from_user(user: dict) -> dict[str, str]:
    saved = user.get("social_links") or {}
    if not isinstance(saved, dict):
        saved = {}

    raw_links: dict[str, str] = {}
    for platform_id in _VALID_IDS:
        if saved.get(platform_id):
            raw_links[platform_id] = saved.get(platform_id)
            continue
        for legacy_field in _LEGACY_FIELDS.get(platform_id, ()):
            if user.get(legacy_field):
                raw_links[platform_id] = user.get(legacy_field)
                break

    links, _ = sanitize_social_links(raw_links)
    return links


def social_links_for_display(user: dict) -> list[dict[str, str]]:
    links = social_links_from_user(user)
    return [
        {**option, "url": links[option["id"]]}
        for option in SOCIAL_LINK_OPTIONS
        if links.get(option["id"])
    ]
