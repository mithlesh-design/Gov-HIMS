"""Generate every spec .docx in docs/specs/."""
from pathlib import Path
import sys

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from gen_00_index   import build as build_00
from gen_01_brd     import build as build_01
from gen_02_trd     import build as build_02
from gen_03_appflow import build as build_03
from gen_04_uiux    import build as build_04
from gen_05_schema  import build as build_05
from gen_06_plan    import build as build_06
from gen_07_gaps    import build as build_07


GENERATORS = [
    ("00_INDEX_v1.0.docx",                 build_00),
    ("01_BRD_v1.0.docx",                    build_01),
    ("02_TRD_v1.0.docx",                    build_02),
    ("03_App_Flow_Document_v1.0.docx",       build_03),
    ("04_UI_UX_Design_Blueprint_v1.0.docx",  build_04),
    ("05_Backend_Schema_v1.0.docx",          build_05),
    ("06_Implementation_Plan_v1.0.docx",     build_06),
    ("07_Gap_Analysis_v1.0.docx",            build_07),
]


def main() -> int:
    print("Generating Umang HIMS spec suite v1.0 ...")
    for filename, builder in GENERATORS:
        target = HERE / filename
        print(f"- {filename}")
        try:
            builder(target)
        except Exception as exc:
            print(f"  FAILED: {exc}")
            return 1
    print("\nAll 8 documents generated under docs/specs/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
