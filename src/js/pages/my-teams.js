import { loadLayout } from "../components/layout.js";

import {
  beginEditingSavedTeam,
  deleteSavedTeam,
  getCurrentTeam,
  getSavedTeams,
  loadSavedTeam,
} from "../services/team-service.js";

import { capitalize } from "../utils.js";

// Converts a saved ISO date into a readable date.
function formatSavedDate(dateValue) {
  if (!dateValue) {
    return "Unknown date";
  }

  const date = new Date(dateValue);

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// Safely prepares user-created text before adding it to HTML.
function escapeHtml(value) {
  const element = document.createElement("div");

  element.textContent = value;

  return element.innerHTML;
}

// Creates the small Pokémon images shown inside a saved team.
function createTeamMembers(team) {
  return team.pokemon
    .map(
      (pokemon) => `
        <div
          class="saved-team-member"
          title="${capitalize(pokemon.name)}"
        >
          <img
            src="${pokemon.image}"
            alt="${capitalize(pokemon.name)}"
          />

          <span>${capitalize(pokemon.name)}</span>
        </div>
      `,
    )
    .join("");
}

// Creates the HTML for one saved team.
function createSavedTeamCard(team) {
  return `
    <article class="saved-team-card">
      <header class="saved-team-card__header">
        <div>
          <h2>${escapeHtml(team.name)}</h2>

          <p>
            ${team.pokemon.length} Pokémon ·
            Saved ${formatSavedDate(team.createdAt)}
          </p>
        </div>

        <span class="saved-team-card__count">
          ${team.pokemon.length}/6
        </span>
      </header>

      <div class="saved-team-members">
        ${createTeamMembers(team)}
      </div>

      <div class="saved-team-card__actions">
        <button
          class="button button--primary"
          type="button"
          data-load-team="${team.id}"
        >
          Load Team
        </button>

        <button
          class="button button--secondary"
          type="button"
          data-edit-team="${team.id}"
        >
          Edit in Builder
        </button>

        <button
          class="saved-team-card__delete"
          type="button"
          data-delete-team="${team.id}"
        >
          Delete
        </button>
      </div>
    </article>
  `;
}

// Shows a message above the saved teams list.
function showTeamsMessage(message, messageType = "") {
  const messageElement = document.querySelector("#saved-teams-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = "saved-teams-message";

  if (messageType) {
    messageElement.classList.add(`saved-teams-message--${messageType}`);
  }
}

// Displays all saved teams or an empty state.
function renderSavedTeams() {
  const teamsContainer = document.querySelector("#saved-teams-content");

  const totalElement = document.querySelector("#saved-teams-total");

  if (!teamsContainer) {
    return;
  }

  const savedTeams = getSavedTeams();

  if (totalElement) {
    totalElement.textContent = savedTeams.length;
  }

  if (savedTeams.length === 0) {
    teamsContainer.innerHTML = `
      <div class="saved-teams-empty">
        <span aria-hidden="true">+</span>

        <h2>No saved teams yet</h2>

        <p>
          Build a Pokémon team and save it to see it here.
        </p>

        <a
          class="button button--primary"
          href="${import.meta.env.BASE_URL}"
        >
          Explore Pokémon
        </a>
      </div>
    `;

    return;
  }

  teamsContainer.innerHTML = savedTeams.map(createSavedTeamCard).join("");
}

// Updates the team counter displayed in the shared header.
function updateHeaderTeamCount() {
  const currentTeam = getCurrentTeam();

  const headerCounter = document.querySelector("#header-team-count");

  if (headerCounter) {
    headerCounter.textContent = `${currentTeam.length}/6`;
  }
}

// Loads a saved team or prepares it for editing.
function handleLoadTeam(teamId, openBuilder = false) {
  const currentTeam = getCurrentTeam();

  if (currentTeam.length > 0) {
    const shouldReplace = window.confirm(
      "Replace the team you are currently building?",
    );

    if (!shouldReplace) {
      return;
    }
  }

  const result = openBuilder
    ? beginEditingSavedTeam(teamId)
    : loadSavedTeam(teamId);

  showTeamsMessage(result.message, result.success ? "success" : "error");

  if (!result.success) {
    return;
  }

  updateHeaderTeamCount();

  if (openBuilder) {
    window.location.href =
      `${import.meta.env.BASE_URL}` + "team-builder/team-builder.html";
  }
}

// Deletes a team after asking for confirmation.
function handleDeleteTeam(teamId) {
  const savedTeams = getSavedTeams();

  const selectedTeam = savedTeams.find((team) => team.id === teamId);

  if (!selectedTeam) {
    return;
  }

  const shouldDelete = window.confirm(`Delete "${selectedTeam.name}"?`);

  if (!shouldDelete) {
    return;
  }

  deleteSavedTeam(teamId);
  renderSavedTeams();

  showTeamsMessage(`"${selectedTeam.name}" was deleted.`);
}

// Connects saved-team buttons with their actions.
function addSavedTeamsListeners() {
  const teamsContainer = document.querySelector("#saved-teams-content");

  teamsContainer?.addEventListener("click", (event) => {
    const loadButton = event.target.closest("[data-load-team]");

    const editButton = event.target.closest("[data-edit-team]");

    const deleteButton = event.target.closest("[data-delete-team]");

    if (loadButton) {
      handleLoadTeam(loadButton.dataset.loadTeam);
    }

    if (editButton) {
      handleLoadTeam(editButton.dataset.editTeam, true);
    }

    if (deleteButton) {
      handleDeleteTeam(deleteButton.dataset.deleteTeam);
    }
  });
}

// Loads the shared layout and starts the My Teams page.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();

  renderSavedTeams();
  addSavedTeamsListeners();
});
