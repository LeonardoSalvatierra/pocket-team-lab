import { loadLayout } from "./components/layout.js";
import { initializeHome } from "./pages/home.js";
// Starts the shared layout and the home page after HTML is ready.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  await initializeHome();
});
