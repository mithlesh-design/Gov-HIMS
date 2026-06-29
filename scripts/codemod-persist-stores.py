"""Phase-1 Step-3 codemod — wrap every non-persistent Zustand store with
`persist({ skipHydration: true })` so state survives F5.

Idempotent: skips files that already have `persist(`. Skips facades (no
`create<...>(`) and stores that are intentionally session-bound or
already-bridged elsewhere.
"""
import re
from pathlib import Path

STORES = Path("src/store")
PERSIST_IMPORT = "import { persist, createJSONStorage } from 'zustand/middleware'"

SKIP = {
    "useLabStore.ts",        # facade over useLabOrdersStore
    "useRadiologyStore.ts",  # facade over useRadiologyStudiesStore
    "useCameraStore.ts",     # transient media-capture session
    "useAuditStore.ts",      # already bridged to API/audit table in Step 2
}


def transform(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")

    if "persist(" in text and "from 'zustand/middleware'" in text:
        return False  # already wrapped

    # Find the create<...>(  declaration
    m = re.search(r"(export\s+const\s+(use\w+)\s*=\s*)create<([^>]+)>\(", text)
    if not m:
        return False

    store_var = m.group(2)
    store_key = "agentix-" + re.sub(r"^use", "", store_var).lower()

    # 1. Add the persist import after the existing zustand import
    if "from 'zustand/middleware'" not in text:
        text = re.sub(
            r"(import\s+\{\s*create\s*\}\s+from\s+['\"]zustand['\"][^\n]*\n)",
            r"\1" + PERSIST_IMPORT + "\n",
            text,
            count=1,
        )

    # 2. Re-find the create<X>( pattern (positions may have shifted after import insertion)
    m = re.search(r"create<([^>]+)>\(", text)
    if not m:
        return False

    # 3. Rewrite prefix: `create<X>(` -> `create<X>()(persist(`
    text = text[: m.start()] + f"create<{m.group(1)}>()(persist(" + text[m.end():]

    # 4. Suffix: replace the LAST `}))` with `}), { config }, ))`
    config_block = (
        "}),\n"
        f"  {{\n"
        f"    name: '{store_key}', version: 1,\n"
        f"    storage: createJSONStorage(() => localStorage),\n"
        f"    skipHydration: true,\n"
        f"  }},\n"
        f"))"
    )

    # Find the last `}))` in the file
    last = text.rfind("}))")
    if last == -1:
        return False

    text = text[:last] + config_block + text[last + 3:]
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    done = []
    skipped = []
    for f in sorted(STORES.glob("use*.ts")):
        if f.name in SKIP:
            skipped.append(("skip", f.name))
            continue
        if transform(f):
            done.append(f.name)
        else:
            skipped.append(("already-or-no-create", f.name))

    print(f"Wrapped {len(done)} store(s) with persist:")
    for n in done:
        print(f"  - {n}")
    print(f"\nSkipped {len(skipped)}:")
    for r, n in skipped:
        print(f"  - {n} ({r})")


if __name__ == "__main__":
    main()
