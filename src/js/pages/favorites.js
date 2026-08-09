import { loadLayout } from "../components/layout.js";

import { createTcgCard } from "../components/tcg-card.js";

import {
  getFavoriteCards,
  getFavoritePokemon,
  removeFavoritePokemon,
  toggleFavoriteCard,
} from "../services/favorite-service.js";

import { getPokemon } from "../services/pokemon-api-service.js";

import {
  addPokemonToCurrentTeam,
  getCurrentTeam,
  maximumTeamSize,
} from "../services/team-service.js";

import {
  capitalize,
  formatPokemonNumber,
  getCardMarketPrice,
} from "../utils.js";

let favoritePokemonDetails = [];
let favoriteCardItems = [];

// Gets the preferred Pokémon image.
function getPokemonImage(pokemon) {
  return (
    pokemon.sprites.other["official-artwork"]?.front_default ||
    pokemon.sprites.front_default
  );
}

// Creates type badges.
function createPokemonTypes(pokemon) {
  return pokemon.types
    .map(
      ({ type }) => `
        <span
          class="pokemon-type pokemon-type--${type.name}"
        >
          ${capitalize(type.name)}
        </span>
      `,
    )
    .join("");
}

// Displays a page action message.
function showFavoritesMessage(message, messageType = "") {
  const messageElement = document.querySelector("#favorites-message");

  messageElement.textContent = message;
  messageElement.className = "favorites-message";

  if (messageType) {
    messageElement.classList.add(`favorites-message--${messageType}`);
  }
}

// Creates one favorite Pokémon card.
function createFavoritePokemonCard(pokemon) {
  return `
    <article class="favorite-pokemon-card">
      <button
        class="favorite-pokemon-card__remove"
        type="button"
        data-remove-favorite="${pokemon.id}"
        aria-label="Remove ${pokemon.name} from favorites"
        title="Remove from favorites"
      >
        ♥
      </button>

      <div class="favorite-pokemon-card__image">
        <img
          src="${getPokemonImage(pokemon)}"
          alt="${capitalize(pokemon.name)}"
          loading="lazy"
        />
      </div>

      <div class="favorite-pokemon-card__content">
        <div class="favorite-pokemon-card__heading">
          <span>
            ${formatPokemonNumber(pokemon.id)}
          </span>

          <h2>${capitalize(pokemon.name)}</h2>
        </div>

        <div class="pokemon-types">
          ${createPokemonTypes(pokemon)}
        </div>

        <div class="favorite-pokemon-card__actions">
          <a
            class="button button--secondary"
            href="${import.meta.env.BASE_URL}pokemon-details/pokemon-details.html?id=${pokemon.id}"
          >
            View Details
          </a>

          <button
            class="button button--primary"
            type="button"
            data-add-favorite-team="${pokemon.id}"
          >
            + Add to Team
          </button>
        </div>
      </div>
    </article>
  `;
}

// Displays favorite Pokémon after search and sorting.
function renderFavoritePokemon() {
  const container = document.querySelector("#favorite-pokemon-content");

  const searchValue = document
    .querySelector("#favorite-search")
    .value.trim()
    .toLowerCase();

  const sortValue = document.querySelector("#favorite-sort").value;

  const filteredPokemon = favoritePokemonDetails.filter(
    (pokemon) =>
      pokemon.name.includes(searchValue) ||
      pokemon.id.toString() === searchValue,
  );

  if (sortValue === "name") {
    filteredPokemon.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  } else {
    filteredPokemon.sort((first, second) => first.id - second.id);
  }

  if (filteredPokemon.length === 0) {
    const hasFavorites = favoritePokemonDetails.length > 0;

    container.innerHTML = `
      <div class="favorites-empty">
        <span aria-hidden="true">
          ${hasFavorites ? "⌕" : "♡"}
        </span>

        <h2>
          ${hasFavorites ? "No matching favorites" : "No favorite Pokémon yet"}
        </h2>

        <p>
          ${
            hasFavorites
              ? "Try searching for another Pokémon."
              : "Use the heart button in Explorer or Pokémon Details."
          }
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

  container.innerHTML = filteredPokemon.map(createFavoritePokemonCard).join("");
}

// Updates all favorite counters.
function updateFavoriteCounters() {
  const favoriteCards = getFavoriteCards();

  const pokemonCount = favoritePokemonDetails.length;
  const cardCount = favoriteCards.length;
  const totalCount = pokemonCount + cardCount;

  document.querySelector("#favorite-pokemon-count").textContent = pokemonCount;

  document.querySelector("#favorite-card-count").textContent = cardCount;

  document.querySelector("#favorite-total-count").textContent = totalCount;

  document.querySelector("#favorite-pokemon-section-count").textContent =
    `${pokemonCount} ${pokemonCount === 1 ? "saved" : "saved"}`;

  document.querySelector("#favorite-card-section-count").textContent =
    `${cardCount} ${cardCount === 1 ? "saved" : "saved"}`;
}

// Loads complete information for saved favorites.
async function loadFavoritePokemon() {
  const savedFavorites = getFavoritePokemon();

  if (savedFavorites.length === 0) {
    favoritePokemonDetails = [];
    updateFavoriteCounters();
    renderFavoritePokemon();
    return;
  }

  try {
    favoritePokemonDetails = await Promise.all(
      savedFavorites.map((pokemon) => getPokemon(pokemon.id)),
    );

    updateFavoriteCounters();
    renderFavoritePokemon();
  } catch (error) {
    console.error("Favorites loading error:", error);

    showFavoritesMessage("Some favorite Pokémon could not be loaded.", "error");
  }
}

// Removes one favorite.
function removePokemonFavorite(pokemonId) {
  const selectedPokemon = favoritePokemonDetails.find(
    (pokemon) => pokemon.id === pokemonId,
  );

  removeFavoritePokemon(pokemonId);

  favoritePokemonDetails = favoritePokemonDetails.filter(
    (pokemon) => pokemon.id !== pokemonId,
  );

  updateFavoriteCounters();
  renderFavoritePokemon();

  if (selectedPokemon) {
    showFavoritesMessage(
      `${capitalize(selectedPokemon.name)} was removed from favorites.`,
    );
  }
}

// Adds one favorite Pokémon to the current team.
function addFavoriteToTeam(pokemonId) {
  const pokemon = favoritePokemonDetails.find((item) => item.id === pokemonId);

  if (!pokemon) {
    return;
  }

  const result = addPokemonToCurrentTeam({
    id: pokemon.id,
    name: pokemon.name,
    image: getPokemonImage(pokemon),
    types: pokemon.types.map(({ type }) => type.name),
  });

  showFavoritesMessage(result.message, result.success ? "success" : "error");

  if (!result.success) {
    return;
  }

  const headerCounter = document.querySelector("#header-team-count");

  const currentTeam = getCurrentTeam();

  if (headerCounter) {
    headerCounter.textContent = `${currentTeam.length}/${maximumTeamSize}`;
  }
}

// Switches between Pokémon, both, and card favorites.
function changeFavoritesTab(tabName) {
  const pokemonSection = document.querySelector("#favorite-pokemon-section");

  const cardsSection = document.querySelector("#favorite-cards-section");

  pokemonSection.hidden = tabName === "cards";
  cardsSection.hidden = tabName === "pokemon";

  document.querySelectorAll("[data-favorites-tab]").forEach((button) => {
    const active = button.dataset.favoritesTab === tabName;

    button.classList.toggle("favorites-tab--active", active);

    button.setAttribute("aria-pressed", active.toString());
  });
}

// Connects Favorites page controls.
function addFavoritesListeners() {
  const container = document.querySelector("#favorite-pokemon-content");
  const favoriteCardsContainer = document.querySelector(
    "#favorite-cards-content",
  );

  document
    .querySelector("#favorite-card-search")
    .addEventListener("input", renderFavoriteCards);

  document
    .querySelector("#favorite-card-sort")
    .addEventListener("change", renderFavoriteCards);

  favoriteCardsContainer.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-card-favorite]");

    if (!favoriteButton) {
      return;
    }

    const cardId = favoriteButton.dataset.cardFavorite;

    const card = favoriteCardItems.find((item) => item.id === cardId);

    if (!card) {
      return;
    }

    toggleFavoriteCard(card);

    favoriteCardItems = favoriteCardItems.filter((item) => item.id !== cardId);

    updateFavoriteCounters();
    renderFavoriteCards();

    showFavoritesMessage(`${card.name} was removed from favorites.`);
  });
  document
    .querySelector("#favorite-search")
    .addEventListener("input", renderFavoritePokemon);

  document
    .querySelector("#favorite-sort")
    .addEventListener("change", renderFavoritePokemon);

  document
    .querySelector(".favorites-tabs")
    .addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-favorites-tab]");

      if (tabButton) {
        changeFavoritesTab(tabButton.dataset.favoritesTab);
      }
    });

  container.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-favorite]");

    const teamButton = event.target.closest("[data-add-favorite-team]");

    if (removeButton) {
      removePokemonFavorite(Number(removeButton.dataset.removeFavorite));
    }

    if (teamButton) {
      addFavoriteToTeam(Number(teamButton.dataset.addFavoriteTeam));
    }
  });
}

// Loads the shared layout and Favorites.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();

  addFavoritesListeners();
  loadFavoriteCards();
  await loadFavoritePokemon();
});

// Normalizes cards saved before the latest update.
function normalizeFavoriteCard(card) {
  return {
    ...card,
    supertype: card.supertype ?? "Card",
    subtypes: card.subtypes ?? [],
    images: card.images ?? {
      small: card.image ?? "",
      large: card.largeImage ?? card.image ?? "",
    },
    set: card.set ?? {
      id: "",
      name: "Unknown set",
      releaseDate: "",
    },
  };
}

// Displays favorite trading cards.
function renderFavoriteCards() {
  const container = document.querySelector("#favorite-cards-content");

  const searchValue = document
    .querySelector("#favorite-card-search")
    .value.trim()
    .toLowerCase();

  const sortValue = document.querySelector("#favorite-card-sort").value;

  let cards = favoriteCardItems.filter(
    (card) =>
      card.name.toLowerCase().includes(searchValue) ||
      card.id.toLowerCase().includes(searchValue),
  );

  cards = [...cards].sort((first, second) => {
    if (sortValue === "newest") {
      return second.set.releaseDate.localeCompare(first.set.releaseDate);
    }

    if (sortValue === "rarity") {
      return (first.rarity ?? "").localeCompare(second.rarity ?? "");
    }

    if (sortValue === "price-high" || sortValue === "price-low") {
      const firstPrice = getCardMarketPrice(first);

      const secondPrice = getCardMarketPrice(second);

      if (firstPrice === null) {
        return 1;
      }

      if (secondPrice === null) {
        return -1;
      }

      return sortValue === "price-high"
        ? secondPrice - firstPrice
        : firstPrice - secondPrice;
    }

    return first.name.localeCompare(second.name);
  });

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="favorites-empty">
        <span aria-hidden="true">◇</span>

        <h2>
          ${
            favoriteCardItems.length > 0
              ? "No matching cards"
              : "No favorite cards yet"
          }
        </h2>

        <p>
          Save cards from the Trading Cards page.
        </p>

        <a
          class="button button--primary"
          href="${import.meta.env.BASE_URL}cards/cards.html"
        >
          Explore Trading Cards
        </a>
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  cards.forEach((card) => {
    container.appendChild(createTcgCard(card));
  });
}

// Loads locally saved favorite cards.
function loadFavoriteCards() {
  favoriteCardItems = getFavoriteCards().map(normalizeFavoriteCard);

  renderFavoriteCards();
}
