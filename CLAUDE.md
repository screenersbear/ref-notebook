# This folder is a copy

Ref is made in the Documenting Fictions suite, in `../Documenting Fictions/ref/`. This folder is copied out from there by `python3 tools/sync.py export ref`, run in `../Documenting Fictions`.

- Don't change the app's files here. Make the change in `../Documenting Fictions/ref/` (bump CACHE_NAME there), commit and push the suite, then export, and commit and push here.
- Only CLAUDE.md, README.md and .gitignore are this folder's own.
- A commit here of app files that the last export didn't write is refused, and an export won't write over files changed here: it lists them, so they can be moved into the suite first.
