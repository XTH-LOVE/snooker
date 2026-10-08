import { TableGeometry } from "./tablegeometry"
import { PocketGeometry } from "./pocketgeometry"
import { R } from "../model/physics/constants"

/**
 * Single coordinator for table + pocket geometry configuration.
 *
 * `PocketGeometry` is derived from `TableGeometry` (pocket positions read
 * `TableGeometry.tableX/Y/X/Y`), so the two must always be (re)configured
 * together in that order. Previously every caller had to remember the paired
 * incantation; this enforces it in one spot.
 */
export class TableConfig {
  /** Size used when a rule has no entry in `defaultTableSize`. */
  static readonly fallbackTableSize = 10

  /**
   * Per-rule default for the `tableSize` parameter.
   *
   * The table is laid out in ball radii (`TableGeometry.scaleToRadius`), so
   * `tableSize` is really "how many ball diameters long is the table":
   *
   *     table length in ball diameters = 4.3 * tableSize
   *
   * Real-world references, for anyone tempted to change these:
   *   9ft pool      2540mm / 57.15mm = 44.4 diameters  -> tableSize 10.3
   *   12ft snooker  3569mm / 52.5mm  = 68.0 diameters  -> tableSize 15.8
   *
   * Upstream ships 10, which makes the "snooker" table a pool table with
   * snooker rules painted on. 16 gives the real 12ft proportions (68.8
   * diameters). An explicit `tableSize` in the URL still wins.
   */
  static readonly defaultTableSize: Record<string, number> = {
    snooker: 16,
  }

  /**
   * Apply table geometry for a rule and the given tableSize, then re-derive
   * pocket geometry from the updated table dimensions.
   */
  static apply(ruleType: string, tableSize: number = 10): void {
    TableGeometry.configureForRule(ruleType, tableSize)
    PocketGeometry.scaleToRadius(R)
  }

  /**
   * Read the `tableSize` URL query parameter, falling back to the rule's
   * default and then to `fallbackTableSize`.
   */
  static tableSizeFromUrl(): number {
    const urlParams = new URLSearchParams(globalThis.location?.search ?? "")
    const explicit = urlParams.get("tableSize")
    if (explicit !== null && explicit !== "") {
      return parseFloat(explicit)
    }
    const ruletype = urlParams.get("ruletype") ?? "nineball"
    return (
      TableConfig.defaultTableSize[ruletype] ?? TableConfig.fallbackTableSize
    )
  }

  /**
   * Write the rule's default `tableSize` back into the page URL when the URL
   * does not name one.
   *
   * `tableSize` is read straight off `location.search` in a dozen unrelated
   * modules (`assets`, `container`, `recorder`, `matchresult`, the particle
   * system, ...), each with its own hard-coded fallback of 10. Teaching every
   * one of them about per-rule defaults would be a running invitation to
   * drift, so resolve the default once here and put it where they all already
   * look. Must run before anything reads the URL.
   */
  static applyRuleTableSizeDefault(): void {
    if (typeof globalThis.location === "undefined") return
    let url: URL
    try {
      url = new URL(globalThis.location.href)
    } catch {
      return
    }
    if (url.searchParams.has("tableSize")) return

    const ruletype = url.searchParams.get("ruletype") ?? "nineball"
    const size = TableConfig.defaultTableSize[ruletype]
    if (size === undefined) return

    url.searchParams.set("tableSize", String(size))
    try {
      globalThis.history.replaceState(null, "", url.toString())
    } catch {
      // Sandboxed frames and file:// refuse history writes. The rule-aware
      // fallback in `tableSizeFromUrl` still covers the geometry path.
    }
  }
}
