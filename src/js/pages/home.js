import { createPokemonCard } from "../components/pokemon-card.js";

import { getPokemon, getPokemonList } from "../services/pokemon-api-service.js";

import {
  addPokemonToCurrentTeam,
  getCurrentTeam,
  maximumTeamSize,
  removePokemonFromCurrentTeam,
  saveTeam,
} from "../services/team-service.js";

import { getStorage, setStorage, storageKeys } from "../storage/storage.js";

import { capitalize, showError } from "../utils.js";

const pageSize = 24;

let loadedPokemon = [];
let currentPage = 1;
let totalPokemon = 0;

// Loads the Pokémon that belong to the selected page.
async function loadPokemonPage(page) {
  const grid = document.querySelector("#pokemon-grid");

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <p class="loading-message">Loading Pokémon...</p>
  `;

  const offset = (page - 1) * pageSize;
  const listData = await getPokemonList(pageSize, offset);

  totalPokemon = listData.count;

  loadedPokemon = await Promise.all(
    listData.results.map((pokemon) => getPokemon(pokemon.name)),
  );

  currentPage = page;

  renderPokemon(loadedPokemon);
  updatePagination();
}

// Updates the pagination buttons and page number.
function updatePagination() {
  const previousButton = document.querySelector("#previous-page");
  const nextButton = document.querySelector("#next-page");
  const pageIndicator = document.querySelector("#page-indicator");

  const totalPages = Math.ceil(totalPokemon / pageSize);

  if (previousButton) {
    previousButton.disabled = currentPage === 1;
  }

  if (nextButton) {
    nextButton.disabled = currentPage >= totalPages;
  }

  if (pageIndicator) {
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

// Displays Pokémon cards in the explorer grid.
function renderPokemon(pokemonList) {
  const grid = document.querySelector("#pokemon-grid");
  const resultCount = document.querySelector("#result-count");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  pokemonList.forEach((pokemon) => {
    grid.appendChild(createPokemonCard(pokemon));
  });

  if (resultCount) {
    resultCount.textContent = pokemonList.length;
  }
}

// Displays the current team in the Explorer sidebar.
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

// Displays a message under the quick-save form.
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

// Sorts the Pokémon currently loaded.
function sortPokemon(sortValue) {
  const sortedPokemon = [...loadedPokemon];

  if (sortValue === "name") {
    sortedPokemon.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  if (sortValue === "number") {
    sortedPokemon.sort((first, second) => first.id - second.id);
  }

  if (sortValue === "hp") {
    sortedPokemon.sort((first, second) => {
      const firstHp =
        first.stats.find((stat) => stat.stat.name === "hp")?.base_stat ?? 0;

      const secondHp =
        second.stats.find((stat) => stat.stat.name === "hp")?.base_stat ?? 0;

      return secondHp - firstHp;
    });
  }

  renderPokemon(sortedPokemon);
}

// Filters the current page by Pokémon name or number.
function filterPokemon(searchValue) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredPokemon = loadedPokemon.filter(
    (pokemon) =>
      pokemon.name.includes(normalizedSearch) ||
      pokemon.id.toString() === normalizedSearch,
  );

  renderPokemon(filteredPokemon);
}

// Adds one Pokémon to the current team.
function addPokemonToTeam(pokemonId) {
  const pokemon = loadedPokemon.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

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
    window.alert(result.message);
    return;
  }

  renderCurrentTeam();
}

// Removes one Pokémon from the current team.
function removePokemonFromTeam(pokemonId) {
  removePokemonFromCurrentTeam(pokemonId);
  renderCurrentTeam();
}

// Saves the current team directly from the Explorer.
function saveCurrentTeamFromExplorer(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const nameInput = document.querySelector("#quick-team-name");

  const result = saveTeam(nameInput.value);

  showQuickSaveMessage(result.message, result.success ? "success" : "error");

  if (!result.success) {
    nameInput.focus();
    return;
  }

  form.reset();
  renderCurrentTeam();
}

// Adds one Pokémon to favorites.
function addPokemonToFavorites(pokemonId) {
  const favorites = getStorage(storageKeys.favoritePokemon, []);

  const pokemon = loadedPokemon.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

  const alreadyFavorite = favorites.some((item) => item.id === pokemonId);

  if (alreadyFavorite) {
    return;
  }

  favorites.push({
    id: pokemon.id,
    name: pokemon.name,
    image:
      pokemon.sprites.other["official-artwork"].front_default ||
      pokemon.sprites.front_default,
  });

  setStorage(storageKeys.favoritePokemon, favorites);
}

// Connects the home page controls.
function addEventListeners() {
  const searchInput = document.querySelector("#pokemon-search");
  const sortSelect = document.querySelector("#sort-select");
  const grid = document.querySelector("#pokemon-grid");

  const teamContainer = document.querySelector("#current-team-list");

  const quickSaveForm = document.querySelector("#quick-save-team-form");

  const previousButton = document.querySelector("#previous-page");

  const nextButton = document.querySelector("#next-page");

  previousButton?.addEventListener("click", async () => {
    if (currentPage > 1) {
      await loadPokemonPage(currentPage - 1);

      window.scrollTo({
        top: 450,
        behavior: "smooth",
      });
    }
  });

  nextButton?.addEventListener("click", async () => {
    const totalPages = Math.ceil(totalPokemon / pageSize);

    if (currentPage < totalPages) {
      await loadPokemonPage(currentPage + 1);

      window.scrollTo({
        top: 450,
        behavior: "smooth",
      });
    }
  });

  searchInput?.addEventListener("input", (event) => {
    filterPokemon(event.target.value);
  });

  sortSelect?.addEventListener("change", (event) => {
    sortPokemon(event.target.value);
  });

  grid?.addEventListener("click", (event) => {
    const teamButton = event.target.closest("[data-team-id]");

    const favoriteButton = event.target.closest("[data-favorite-id]");

    if (teamButton) {
      addPokemonToTeam(Number(teamButton.dataset.teamId));
    }

    if (favoriteButton) {
      addPokemonToFavorites(Number(favoriteButton.dataset.favoriteId));

      favoriteButton.textContent = "♥";
      favoriteButton.classList.add("favorite-button--active");
    }
  });

  teamContainer?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-team-id]");

    if (!removeButton) {
      return;
    }

    removePokemonFromTeam(Number(removeButton.dataset.removeTeamId));
  });

  quickSaveForm?.addEventListener("submit", saveCurrentTeamFromExplorer);
}

// Starts the Explorer.
export async function initializeHome() {
  const grid = document.querySelector("#pokemon-grid");

  renderCurrentTeam();
  addEventListeners();

  try {
    await loadPokemonPage(1);
  } catch (error) {
    console.error(error);

    showError(grid, "Pokémon could not be loaded. Please try again.");
  }
}
