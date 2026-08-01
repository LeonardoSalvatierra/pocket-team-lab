import { loadLayout } from "../components/layout.js";
// Loads the shared layout when the team builder page is ready.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
});
