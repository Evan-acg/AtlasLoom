# Refactor Within the Character Profiles Boundary

AtlasLoom will keep projects, characters, tags, workspaces, and their archival behavior within the single `character-profiles` capability during the refactor. Internal responsibilities may be separated by UI, state, business rules, storage, and encoding, but the capability will not be split into multiple features because these concepts form one product boundary and premature separation would add coupling without a second owner.
