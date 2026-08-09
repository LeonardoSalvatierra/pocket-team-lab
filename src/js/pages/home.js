import { createPokemonCard } from "../components/pokemon-card.js";

import {
  getAllPokemonList,
  getGeneration,
  getPokemon,
  getPokemonType,
} from "../services/pokemon-api-service.js";

import {
  addPokemonToCurrentTeam,
  getCurrentTeam,
  getEditingTeam,
  maximumTeamSize,
  removePokemonFromCurrentTeam,
  saveTeam,
  updateSavedTeam,
} from "../services/team-service.js";

import { toggleFavoritePokemon } from "../services/favorite-service.js";

import { capitalize, showError } from "../utils.js";

const pageSize = 24;
const searchDelay = 350;

let allPokemonReferences = [];
let filteredPokemonReferences = [];
let loadedPokemon = [];

let currentPage = 1;
let searchTimer = null;
let controlRequestNumber = 0;

// Extracts the Pokémon ID from its PokéAPI URL.
function getPokemonIdFromUrl(url) {
  const matches = url.match(/\/pokemon\/(\d+)\//);

  return matches ? Number(matches[1]) : 0;
}

// Adds IDs to the lightweight Pokémon references.
function preparePokemonReferences(results) {
  return results.map((pokemon) => ({
    ...pokemon,
    id: getPokemonIdFromUrl(pokemon.url),
  }));
}

// Reads one base statistic.
function getStatValue(pokemon, statName) {
  return (
    pokemon.stats.find((item) => item.stat.name === statName)?.base_stat ?? 0
  );
}

// Displays a loading message in the grid.
function showExplorerLoading(message = "Loading Pokémon...") {
  const grid = document.querySelector("#pokemon-grid");

  if (grid) {
    grid.innerHTML = `
      <p class="loading-message">${message}</p>
    `;
  }
}

// Sorts lightweight references by number or name.
function sortPokemonReferences(references, sortValue) {
  const sortedReferences = [...references];

  if (sortValue === "name") {
    sortedReferences.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  } else {
    sortedReferences.sort((first, second) => first.id - second.id);
  }

  return sortedReferences;
}

// Sorts loaded details by a base statistic.
function sortLoadedPokemon(pokemonList, sortValue) {
  const sortedPokemon = [...pokemonList];

  if (["hp", "attack", "defense"].includes(sortValue)) {
    sortedPokemon.sort(
      (first, second) =>
        getStatValue(second, sortValue) - getStatValue(first, sortValue),
    );
  }

  return sortedPokemon;
}

// Displays cards in the Explorer.
function renderPokemon(pokemonList) {
  const grid = document.querySelector("#pokemon-grid");
  const resultCount = document.querySelector("#result-count");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (pokemonList.length === 0) {
    grid.innerHTML = `
      <div class="explorer-empty">
        <h3>No Pokémon found</h3>

        <p>
          Try another name, number, type, or generation.
        </p>
      </div>
    `;
  } else {
    pokemonList.forEach((pokemon) => {
      grid.appendChild(createPokemonCard(pokemon));
    });
  }

  if (resultCount) {
    resultCount.textContent = pokemonList.length;
  }
}

// Updates result totals and pagination controls.
function updatePagination() {
  const previousButton = document.querySelector("#previous-page");

  const nextButton = document.querySelector("#next-page");

  const pageIndicator = document.querySelector("#page-indicator");

  const matchCount = document.querySelector("#match-count");

  const totalMatches = filteredPokemonReferences.length;

  const totalPages = Math.max(Math.ceil(totalMatches / pageSize), 1);

  previousButton.disabled = currentPage <= 1 || totalMatches === 0;

  nextButton.disabled = currentPage >= totalPages || totalMatches === 0;

  pageIndicator.textContent =
    totalMatches === 0 ? "No pages" : `Page ${currentPage} of ${totalPages}`;

  matchCount.textContent = totalMatches;
}

// Loads details only for the current result page.
async function loadCurrentResultPage(requestNumber) {
  showExplorerLoading();

  const startIndex = (currentPage - 1) * pageSize;
  const pageReferences = filteredPokemonReferences.slice(
    startIndex,
    startIndex + pageSize,
  );

  if (pageReferences.length === 0) {
    loadedPokemon = [];

    if (requestNumber === controlRequestNumber) {
      renderPokemon([]);
      updatePagination();
    }

    return;
  }

  const pokemonDetails = await Promise.all(
    pageReferences.map((pokemon) => getPokemon(pokemon.id || pokemon.name)),
  );

  if (requestNumber !== controlRequestNumber) {
    return;
  }

  const sortValue = document.querySelector("#sort-select").value;

  loadedPokemon = sortLoadedPokemon(pokemonDetails, sortValue);

  renderPokemon(loadedPokemon);
  updatePagination();
}

// Gets names that belong to a selected type.
async function getTypeNames(typeName) {
  if (!typeName) {
    return null;
  }

  const typeData = await getPokemonType(typeName);

  return new Set(typeData.pokemon.map((entry) => entry.pokemon.name));
}

// Gets names that belong to a selected generation.
async function getGenerationNames(generationId) {
  if (!generationId) {
    return null;
  }

  const generationData = await getGeneration(generationId);

  return new Set(generationData.pokemon_species.map((pokemon) => pokemon.name));
}

// Applies search, filters, sorting, and pagination.
async function applyExplorerControls(resetPage = true) {
  const requestNumber = ++controlRequestNumber;

  const searchValue = document
    .querySelector("#pokemon-search")
    .value.trim()
    .toLowerCase();

  const typeValue = document.querySelector("#type-filter").value;

  const generationValue = document.querySelector("#generation-filter").value;

  const sortValue = document.querySelector("#sort-select").value;

  showExplorerLoading("Applying filters...");

  try {
    const [typeNames, generationNames] = await Promise.all([
      getTypeNames(typeValue),
      getGenerationNames(generationValue),
    ]);

    if (requestNumber !== controlRequestNumber) {
      return;
    }

    let references = allPokemonReferences.filter((pokemon) => {
      const matchesSearch =
        !searchValue ||
        pokemon.name.includes(searchValue) ||
        pokemon.id.toString() === searchValue;

      const matchesType = !typeNames || typeNames.has(pokemon.name);

      const matchesGeneration =
        !generationNames || generationNames.has(pokemon.name);

      return matchesSearch && matchesType && matchesGeneration;
    });

    references = sortPokemonReferences(references, sortValue);

    filteredPokemonReferences = references;

    if (resetPage) {
      currentPage = 1;
    }

    const totalPages = Math.max(Math.ceil(references.length / pageSize), 1);

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    await loadCurrentResultPage(requestNumber);
  } catch (error) {
    console.error("Explorer controls error:", error);

    if (requestNumber === controlRequestNumber) {
      showError(
        document.querySelector("#pokemon-grid"),
        "The Pokémon results could not be loaded. Check your connection.",
        {
          onRetry: () => applyExplorerControls(false),
        },
      );
    }
  }
}

// Displays the current team.
function renderCurrentTeam() {
  const teamContainer = document.querySelector("#current-team-list");

  const teamCount = document.querySelector("#team-count");

  const headerTeamCount = document.querySelector("#header-team-count");

  const currentTeam = getCurrentTeam();

  if (teamCount) {
    teamCount.textContent = `${currentTeam.length} / ${maximumTeamSize}`;
  }

  if (headerTeamCount) {
    headerTeamCount.textContent = `${currentTeam.length}/${maximumTeamSize}`;
  }

  if (!teamContainer) {
    return;
  }

  if (currentTeam.length === 0) {
    teamContainer.innerHTML = `
      <p class="placeholder-text">
        Pokémon added to the current team will appear here.
      </p>
    `;

    return;
  }

  teamContainer.innerHTML = currentTeam
    .map(
      (pokemon) => `
        <article class="team-preview">
          <img
            src="${pokemon.image}"
            alt="${capitalize(pokemon.name)}"
          />

          <span>${capitalize(pokemon.name)}</span>

          <button
            class="team-preview__remove"
            type="button"
            data-remove-team-id="${pokemon.id}"
            aria-label="Remove ${pokemon.name} from team"
            title="Remove from team"
          >
            &times;
          </button>
        </article>
      `,
    )
    .join("");
}

// Configures Explorer when editing a saved team.
function configureQuickTeamForm() {
  const editingTeam = getEditingTeam();

  if (!editingTeam) {
    return;
  }

  const nameInput = document.querySelector("#quick-team-name");

  const saveButton = document.querySelector("#quick-save-team-button");

  const editingNotice = document.querySelector("#quick-editing-team-notice");

  nameInput.value = editingTeam.name;
  saveButton.textContent = "Update Team";

  editingNotice.hidden = false;
  editingNotice.textContent = `Editing "${editingTeam.name}"`;
}

// Displays a quick-save form message.
function showQuickSaveMessage(message, messageType = "") {
  const messageElement = document.querySelector("#quick-save-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = "team-message";

  if (messageType) {
    messageElement.classList.add(`team-message--${messageType}`);
  }
}

// Adds or removes one Pokémon from the current team.
function togglePokemonInTeam(pokemonId) {
  const pokemon = loadedPokemon.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

  const currentTeam = getCurrentTeam();

  const alreadyInTeam = currentTeam.some(
    (teamPokemon) => teamPokemon.id === pokemonId,
  );

  if (alreadyInTeam) {
    removePokemonFromCurrentTeam(pokemonId);

    showQuickSaveMessage(
      `${capitalize(pokemon.name)} was removed from the team.`,
      "success",
    );
  } else {
    const teamPokemon = {
      id: pokemon.id,
      name: pokemon.name,
      image:
        pokemon.sprites.other["official-artwork"].front_default ||
        pokemon.sprites.front_default,
      types: pokemon.types.map(({ type }) => type.name),
    };

    const result = addPokemonToCurrentTeam(teamPokemon);

    if (!result.success) {
      showQuickSaveMessage(result.message, "error");
      return;
    }

    showQuickSaveMessage(
      `${capitalize(pokemon.name)} was added to the team.`,
      "success",
    );
  }

  renderCurrentTeam();
  renderPokemon(loadedPokemon);
}

// Removes one Pokémon from the current team.
function removePokemonFromTeam(pokemonId) {
  removePokemonFromCurrentTeam(pokemonId);

  renderCurrentTeam();
  renderPokemon(loadedPokemon);
}

// Saves or updates the team from Explorer.
function saveCurrentTeamFromExplorer(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const nameInput = document.querySelector("#quick-team-name");

  const editingTeam = getEditingTeam();

  const result = editingTeam
    ? updateSavedTeam(editingTeam.id, nameInput.value)
    : saveTeam(nameInput.value);

  showQuickSaveMessage(result.message, result.success ? "success" : "error");

  if (!result.success) {
    nameInput.focus();
    return;
  }

  form.reset();
  renderCurrentTeam();

  const saveButton = document.querySelector("#quick-save-team-button");

  const editingNotice = document.querySelector("#quick-editing-team-notice");

  saveButton.textContent = "Save Current Team";
  editingNotice.hidden = true;
}

// Adds or removes one Pokémon from favorites.
function togglePokemonFavorite(pokemonId, favoriteButton) {
  const pokemon = loadedPokemon.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

  const result = toggleFavoritePokemon(pokemon);

  favoriteButton.textContent = result.favorite ? "♥" : "♡";

  favoriteButton.classList.toggle("favorite-button--active", result.favorite);

  favoriteButton.setAttribute("aria-pressed", result.favorite.toString());

  favoriteButton.setAttribute(
    "aria-label",
    `${result.favorite ? "Remove" : "Add"} ${pokemon.name} ${
      result.favorite ? "from" : "to"
    } favorites`,
  );
}

// Resets search, filters, and sorting.
async function resetExplorerControls() {
  document.querySelector("#pokemon-search").value = "";
  document.querySelector("#type-filter").value = "";
  document.querySelector("#generation-filter").value = "";
  document.querySelector("#sort-select").value = "number";

  await applyExplorerControls(true);
}

// Connects all Explorer controls.
function addEventListeners() {
  const searchInput = document.querySelector("#pokemon-search");

  const typeFilter = document.querySelector("#type-filter");

  const generationFilter = document.querySelector("#generation-filter");

  const sortSelect = document.querySelector("#sort-select");

  const resetButton = document.querySelector("#reset-filters");

  const grid = document.querySelector("#pokemon-grid");

  const teamContainer = document.querySelector("#current-team-list");

  const quickSaveForm = document.querySelector("#quick-save-team-form");

  const previousButton = document.querySelector("#previous-page");

  const nextButton = document.querySelector("#next-page");

  previousButton.addEventListener("click", async () => {
    if (currentPage <= 1) {
      return;
    }

    currentPage -= 1;
    const requestNumber = ++controlRequestNumber;

    await loadCurrentResultPage(requestNumber);

    window.scrollTo({
      top: 450,
      behavior: "smooth",
    });
  });

  nextButton.addEventListener("click", async () => {
    const totalPages = Math.ceil(filteredPokemonReferences.length / pageSize);

    if (currentPage >= totalPages) {
      return;
    }

    currentPage += 1;
    const requestNumber = ++controlRequestNumber;

    await loadCurrentResultPage(requestNumber);

    window.scrollTo({
      top: 450,
      behavior: "smooth",
    });
  });

  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);

    searchTimer = window.setTimeout(() => {
      applyExplorerControls(true);
    }, searchDelay);
  });

  typeFilter.addEventListener("change", () => {
    applyExplorerControls(true);
  });

  generationFilter.addEventListener("change", () => {
    applyExplorerControls(true);
  });

  sortSelect.addEventListener("change", () => {
    applyExplorerControls(false);
  });

  resetButton.addEventListener("click", resetExplorerControls);

  grid.addEventListener("click", (event) => {
    const teamButton = event.target.closest("[data-team-id]");

    const favoriteButton = event.target.closest("[data-favorite-id]");

    if (teamButton) {
      togglePokemonInTeam(Number(teamButton.dataset.teamId));
    }

    if (favoriteButton) {
      togglePokemonFavorite(
        Number(favoriteButton.dataset.favoriteId),
        favoriteButton,
      );
    }
  });

  teamContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-team-id]");

    if (!removeButton) {
      return;
    }

    removePokemonFromTeam(Number(removeButton.dataset.removeTeamId));
  });

  quickSaveForm.addEventListener("submit", saveCurrentTeamFromExplorer);
}

// Loads the Pokémon list used by Explorer.
async function loadExplorerData() {
  const grid = document.querySelector("#pokemon-grid");

  try {
    showExplorerLoading("Preparing Pokémon Explorer...");

    const listData = await getAllPokemonList();

    allPokemonReferences = preparePokemonReferences(listData.results);

    filteredPokemonReferences = [...allPokemonReferences];

    await applyExplorerControls(true);
  } catch (error) {
    console.error("Explorer loading error:", error);

    showError(grid, "Pokémon could not be loaded. Check your connection.", {
      onRetry: loadExplorerData,
    });
  }
}

// Starts the Explorer.
export async function initializeHome() {
  renderCurrentTeam();
  configureQuickTeamForm();
  addEventListeners();

  await loadExplorerData();
}
