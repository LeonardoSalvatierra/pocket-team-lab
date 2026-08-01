import { getStorage, storageKeys } from "../storage/storage.js";
// Loads a reusable HTML partial inside the selected container.
async function loadPartial(selector, fileName) {
  const container = document.querySelector(selector);

  if (!container) {
    return;
  }

  const partialUrl = `${import.meta.env.BASE_URL}partials/${fileName}`;

  const response = await fetch(partialUrl);

  if (!response.ok) {
    throw new Error(`Could not load ${fileName}`);
  }

  container.innerHTML = await response.text();
}
// Gives every navigation link its complete application URL.
function configureNavigation() {
  const baseUrl = import.meta.env.BASE_URL;

  document.querySelectorAll("[data-route]").forEach((link) => {
    const route = link.dataset.route;
    link.href = `${baseUrl}${route}`;
  });
}
// Highlights the navigation link for the current page.
function markActiveNavigation() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".desktop-navigation a").forEach((link) => {
    const linkPage =
      new URL(link.href).pathname.split("/").pop() || "index.html";

    if (linkPage === currentPage) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}
// Reads the saved team and updates the header counter.
function updateHeaderTeamCount() {
  const team = getStorage(storageKeys.currentTeam, []);
  const counter = document.querySelector("#header-team-count");

  if (counter) {
    counter.textContent = `${team.length}/6`;
  }
}
// Loads the shared header and footer and prepares the navigation.
export async function loadLayout() {
  try {
    await Promise.all([
      loadPartial("#site-header", "header.html"),
      loadPartial("#site-footer", "footer.html"),
    ]);

    configureNavigation();
    markActiveNavigation();
    updateHeaderTeamCount();
  } catch (error) {
    console.error("Layout error:", error);
  }
}
