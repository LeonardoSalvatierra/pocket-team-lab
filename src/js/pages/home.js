import { createPokemonCard } from "../components/pokemon-card.js";
import { getPokemon, getPokemonList } from "../services/pokemon-api-service.js";
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

// Updates the page number and enables or disables pagination buttons.
function updatePagination() {
  const previousButton = document.querySelector("#previous-page");

  const nextButton = document.querySelector("#next-page");

  const pageIndicator = document.querySelector("#page-indicator");

  const totalPages = Math.ceil(totalPokemon / pageSize);

  if (previousButton) {
    previousButton.disabled = currentPage === 1;
  }

  if (nextButton) {
    nextButton.disabled = currentPage === totalPages;
  }

  if (pageIndicator) {
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

// Creates and displays a card for every Pokémon in the given list.
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

// Displays the current team, including its images and remove buttons.
function renderCurrentTeam() {
  const teamContainer = document.querySelector("#current-team-list");

  const teamCount = document.querySelector("#team-count");

  const headerTeamCount = document.querySelector("#header-team-count");

  const currentTeam = getStorage(storageKeys.currentTeam, []);

  if (teamCount) {
    teamCount.textContent = `${currentTeam.length} / 6`;
  }

  if (headerTeamCount) {
    headerTeamCount.textContent = `${currentTeam.length}/6`;
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
                    >

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

// Sorts the Pokémon currently loaded on the page.
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

// Filters the Pokémon on the current page by name or number.
function filterPokemon(searchValue) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredPokemon = loadedPokemon.filter((pokemon) => {
    return (
      pokemon.name.includes(normalizedSearch) ||
      pokemon.id.toString() === normalizedSearch
    );
  });

  renderPokemon(filteredPokemon);
}

// Adds a Pokémon to the current team and saves it in localStorage.
function addPokemonToTeam(pokemonId) {
  const currentTeam = getStorage(storageKeys.currentTeam, []);

  if (currentTeam.length >= 6) {
    window.alert("Your team already has six Pokémon.");

    return;
  }

  const pokemon = loadedPokemon.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

  const alreadyAdded = currentTeam.some((item) => item.id === pokemonId);

  if (alreadyAdded) {
    window.alert("This Pokémon is already in your team.");

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

  currentTeam.push(teamPokemon);

  setStorage(storageKeys.currentTeam, currentTeam);
  renderCurrentTeam();
}

// Removes one Pokémon from the current team.
function removePokemonFromTeam(pokemonId) {
  const currentTeam = getStorage(storageKeys.currentTeam, []);

  const updatedTeam = currentTeam.filter((pokemon) => pokemon.id !== pokemonId);

  setStorage(storageKeys.currentTeam, updatedTeam);
  renderCurrentTeam();
}

// Adds a Pokémon to the favorites saved in localStorage.
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

// Connects buttons and form controls with their JavaScript actions.
function addEventListeners() {
  const searchInput = document.querySelector("#pokemon-search");

  const sortSelect = document.querySelector("#sort-select");

  const grid = document.querySelector("#pokemon-grid");

  const teamContainer = document.querySelector("#current-team-list");

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

    const pokemonId = Number(removeButton.dataset.removeTeamId);

    removePokemonFromTeam(pokemonId);
  });
}

// Starts the home page, shows the saved team, and loads page one.
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
