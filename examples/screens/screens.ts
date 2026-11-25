import type { SnapshotExtension } from "parallax"
import { compareScreens } from "./compare.ts"
import { contactSheetPage } from "./contact-sheet/contact-sheet.tsx"
import type { Screens } from "./contact-sheet/screen.ts"
import type { ScreensSnapshot } from "./extract.ts"
import { extractScreens } from "./extract.ts"

export function screens(): SnapshotExtension<ScreensSnapshot, Screens> {
  return {
    name: "screens",
    extract: extractScreens,
    compare: (base, head) => {
      if (base.screens.length === 0 && head.screens.length === 0) {
        throw new Error("the site at examples/screens/site has no screens at either commit")
      }

      const compared = compareScreens(base.screens, head.screens)
      return compared.every((screen) => screen.status === "unchanged") ? undefined : { screens: compared }
    },
    show: (delta) => [{ title: "Screens", html: contactSheetPage(delta) }],
  }
}
