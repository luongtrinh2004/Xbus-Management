export function plainTextHTML(text: string) {
  return (
    "<p>" +
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
      .replaceAll("\n", "<br>") +
    "</p>"
  );
}
