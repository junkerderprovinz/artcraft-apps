"""The download buttons the README shows, read by gen_download_buttons.py.

Each entry names a button the generator knows and where it leads. The rows,
their order, the colours and the words are the generator's, the same in every
repository.
"""

REPO = "artcraft-apps"

BUTTONS = {
    # Thirteen templates, so this leads to the search that lists them all.
    "unraid": "https://ca.unraid.net/apps?q=craft",
    "mos": "https://mos-official.net/apps.html?search=Craft",
    "zimaos": "https://github.com/junkerderprovinz/zimaos-apps#install",
    "umbrel": "https://github.com/junkerderprovinz/umbrel-apps#install",
    # One compose file per app, so this leads to the folder that holds them.
    "compose": "https://github.com/junkerderprovinz/artcraft-apps/tree/main/compose",
    # A release's "Source code (zip)" is the whole repository at that tag, and
    # GitHub gives the newest one no fixed address, so this leads to the release
    # that lists it.
    "source": "https://github.com/junkerderprovinz/artcraft-apps/releases/latest",
}
