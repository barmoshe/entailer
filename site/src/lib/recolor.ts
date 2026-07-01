/* Recolor the viz truth-table SVG (which ships fixed dark/slate hexes) to the
 * watercolor palette — purely presentational, the engine + view-model are
 * untouched. Falsifying rows stay tinted, now in terracotta. This is coupled to
 * the exact hexes emitted by `truthTableToSvg` in @entailer/viz, so it lives in
 * one place shared by every page that renders a truth table. */
export function recolorTruthTable(svg: string): string {
  return svg
    .replaceAll("#1f2937", "#37535c") // header band → teal-deep
    .replaceAll("#ffffff", "#f7f0df") // satisfying rows → cream paper
    .replaceAll("#fee2e2", "#ecd5c7") // falsifying rows → soft terracotta wash
    .replaceAll("#e5e7eb", "#d8c6a2"); // cell strokes → warm line
}
