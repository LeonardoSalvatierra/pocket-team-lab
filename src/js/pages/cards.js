import { loadLayout } from "../components/layout.js";

import { createTcgCard } from "../components/tcg-card.js";

import { toggleFavoriteCard } from "../services/favorite-service.js";

import {
  getCardRarities,
  getCardSets,
  getCardSubtypes,
  getCardSupertypes,
  getCardTypes,
  searchCards,
} from "../services/tcg-api-service.js";

import { getCardMarketPrice } from "../utils.js";

const pageSize = 24;
const searchDelay = 650;

let currentPage = 1;
let totalPages = 1;
let loadedCards = [];
let searchTimer = null;
let requestNumber = 0;
let cardsAreLoading = false;

// Adds API values to a select without duplicating options.
function populateSelect(
  selector,
  values,
  getValue = (value) => value,
  getLabel = (value) => value,
) {
  const select = document.querySelector(selector);

  select.options.length = 1;

  values.forEach((value) => {
    const option = document.createElement("option");

    option.value = getValue(value);
    option.textContent = getLabel(value);

    select.appendChild(option);
  });
}

// Displays a page message.
function showCardsMessage(message, messageType = "") {
  const element = document.querySelector("#cards-message");

  element.textContent = message;
  element.className = "cards-message";

  if (messageType) {
    element.classList.add(`cards-message--${messageType}`);
  }
}

// Enables or disables controls during an important request.
function setCardControlsDisabled(disabled) {
  cardsAreLoading = disabled;

  [
    "#card-supertype-filter",
    "#card-subtype-filter",
    "#card-type-filter",
    "#card-rarity-filter",
    "#card-set-filter",
    "#card-sort",
    "#reset-card-filters",
    "#previous-card-page",
    "#next-card-page",
  ].forEach((selector) => {
    const control = document.querySelector(selector);

    if (control) {
      control.disabled = disabled;
    }
  });

  document
    .querySelector("#cards-content")
    .setAttribute("aria-busy", disabled.toString());
}

// Loads filter catalogs and accepts cached fallback options.
async function loadCardFilterOptions() {
  const filters = [
    {
      loader: getCardSupertypes,
      selector: "#card-supertype-filter",
    },
    {
      loader: getCardSubtypes,
      selector: "#card-subtype-filter",
    },
    {
      loader: getCardTypes,
      selector: "#card-type-filter",
    },
    {
      loader: getCardRarities,
      selector: "#card-rarity-filter",
    },
    {
      loader: getCardSets,
      selector: "#card-set-filter",
      getValue: (set) => set.id,
      getLabel: (set) => set.name,
    },
  ];

  let backupFilters = 0;
  let unavailableFilters = 0;

  for (const filter of filters) {
    try {
      const response = await filter.loader();

      populateSelect(
        filter.selector,
        response.data,
        filter.getValue,
        filter.getLabel,
      );

      if (response.source === "fallback" || response.source === "stale") {
        backupFilters += 1;
      }

      if (response.source === "unavailable") {
        unavailableFilters += 1;
      }
    } catch (error) {
      unavailableFilters += 1;

      console.error("Card filter error:", error);
    }
  }

  if (unavailableFilters > 0) {
    showCardsMessage(
      `${unavailableFilters} filter ${
        unavailableFilters === 1 ? "catalog is" : "catalogs are"
      } temporarily unavailable. Cards can still be explored.`,
      "error",
    );

    return;
  }

  if (backupFilters > 0) {
    showCardsMessage("Some filter options were loaded from saved backup data.");
  }
}

// Displays the initial card loading state.
function showCardsLoading() {
  document.querySelector("#cards-content").innerHTML = `
    <div class="cards-loading">
      <span
        class="cards-loading__spinner"
        aria-hidden="true"
      ></span>

      <p>Loading trading cards...</p>
    </div>
  `;
}

// Displays a retryable error when no previous cards exist.
function showCardsError(message) {
  document.querySelector("#cards-content").innerHTML = `
    <div class="cards-request-error">
      <span aria-hidden="true">!</span>

      <h2>Cards could not be loaded</h2>

      <p>${message}</p>

      <button
        id="retry-cards"
        class="button button--primary"
        type="button"
      >
        Try Again
      </button>
    </div>
  `;
}

// Sorts prices on the currently visible page.
function sortCardsByVisiblePrice(cards, sortValue) {
  if (sortValue !== "price-high" && sortValue !== "price-low") {
    return cards;
  }

  return [...cards].sort((first, second) => {
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
  });
}

// Displays card results.
function renderCards(cards) {
  const container = document.querySelector("#cards-content");

  container.innerHTML = "";

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="cards-empty">
        <span aria-hidden="true">◇</span>

        <h2>No cards found</h2>

        <p>Try another search or filter.</p>
      </div>
    `;

    return;
  }

  cards.forEach((card) => {
    container.appendChild(createTcgCard(card));
  });
}

// Updates pagination.
function updateCardPagination(response) {
  totalPages = Math.max(Math.ceil(response.totalCount / pageSize), 1);

  document.querySelector("#card-result-count").textContent = response.count;

  document.querySelector("#card-total-count").textContent = response.totalCount;

  document.querySelector("#card-page-indicator").textContent =
    response.totalCount === 0
      ? "No pages"
      : `Page ${currentPage} of ${totalPages}`;

  document.querySelector("#previous-card-page").disabled =
    currentPage <= 1 || response.totalCount === 0;

  document.querySelector("#next-card-page").disabled =
    currentPage >= totalPages || response.totalCount === 0;
}

// Maps special client-side sorting to API sorting.
function getApiOrder(sortValue) {
  if (sortValue === "price-high" || sortValue === "price-low") {
    return "name";
  }

  return sortValue;
}

// Reads all active card controls.
function getCardControlValues() {
  const sortValue = document.querySelector("#card-sort").value;

  return {
    searchTerm: document.querySelector("#card-search").value.trim(),

    supertype: document.querySelector("#card-supertype-filter").value,

    subtype: document.querySelector("#card-subtype-filter").value,

    type: document.querySelector("#card-type-filter").value,

    rarity: document.querySelector("#card-rarity-filter").value,

    setId: document.querySelector("#card-set-filter").value,

    sortValue,

    orderBy: getApiOrder(sortValue),
  };
}

// Loads one page while preserving previous cards on failure.
async function loadCards(resetPage = false) {
  if (resetPage) {
    currentPage = 1;
  }

  const currentRequest = ++requestNumber;
  const controls = getCardControlValues();
  const hasPreviousCards = loadedCards.length > 0;

  if (!hasPreviousCards) {
    showCardsLoading();
  } else {
    showCardsMessage("Updating trading cards...");
  }

  setCardControlsDisabled(true);

  try {
    const response = await searchCards({
      ...controls,
      page: currentPage,
      pageSize,
    });

    if (currentRequest !== requestNumber) {
      return;
    }

    loadedCards = sortCardsByVisiblePrice(response.data, controls.sortValue);

    renderCards(loadedCards);
    updateCardPagination(response);

    if (response.cacheStatus === "stale") {
      showCardsMessage(
        "The API is temporarily unavailable. Showing recently saved results.",
        "error",
      );
    } else if (response.cacheStatus === "fresh") {
      showCardsMessage("Loaded quickly from saved results.");
    } else {
      showCardsMessage("");
    }
  } catch (error) {
    console.error("Trading cards error:", error);

    if (currentRequest !== requestNumber) {
      return;
    }

    const errorMessage =
      error.status === 429
        ? "The API request limit was reached. Wait a moment before retrying."
        : "The external card service is temporarily unavailable.";

    if (hasPreviousCards) {
      showCardsMessage(
        `${errorMessage} Previous results are still displayed.`,
        "error",
      );
    } else {
      showCardsError(errorMessage);
    }
  } finally {
    if (currentRequest === requestNumber) {
      setCardControlsDisabled(false);
    }
  }
}

// Changes one card's favorite state.
function toggleCardFavorite(cardId, button) {
  const card = loadedCards.find((item) => item.id === cardId);

  if (!card) {
    return;
  }

  const result = toggleFavoriteCard(card);

  button.textContent = result.favorite ? "♥" : "♡";

  button.classList.toggle("tcg-card__favorite--active", result.favorite);

  button.setAttribute("aria-pressed", result.favorite.toString());

  showCardsMessage(result.message, "success");
}

// Resets all controls.
async function resetCardControls() {
  if (cardsAreLoading) {
    return;
  }

  document.querySelector("#card-search").value = "";

  [
    "#card-supertype-filter",
    "#card-subtype-filter",
    "#card-type-filter",
    "#card-rarity-filter",
    "#card-set-filter",
  ].forEach((selector) => {
    document.querySelector(selector).value = "";
  });

  document.querySelector("#card-sort").value = "name";

  await loadCards(true);
}

// Connects page controls.
function addCardListeners() {
  const cardsContainer = document.querySelector("#cards-content");

  document.querySelector("#card-search").addEventListener("input", () => {
    window.clearTimeout(searchTimer);

    searchTimer = window.setTimeout(() => {
      loadCards(true);
    }, searchDelay);
  });

  [
    "#card-supertype-filter",
    "#card-subtype-filter",
    "#card-type-filter",
    "#card-rarity-filter",
    "#card-set-filter",
    "#card-sort",
  ].forEach((selector) => {
    document.querySelector(selector).addEventListener("change", () => {
      if (!cardsAreLoading) {
        loadCards(true);
      }
    });
  });

  document
    .querySelector("#reset-card-filters")
    .addEventListener("click", resetCardControls);

  document
    .querySelector("#previous-card-page")
    .addEventListener("click", async () => {
      if (!cardsAreLoading && currentPage > 1) {
        currentPage -= 1;

        await loadCards();
      }
    });

  document
    .querySelector("#next-card-page")
    .addEventListener("click", async () => {
      if (!cardsAreLoading && currentPage < totalPages) {
        currentPage += 1;

        await loadCards();
      }
    });

  cardsContainer.addEventListener("click", (event) => {
    const retryButton = event.target.closest("#retry-cards");

    const favoriteButton = event.target.closest("[data-card-favorite]");

    if (retryButton) {
      loadCards();
    }

    if (favoriteButton) {
      toggleCardFavorite(favoriteButton.dataset.cardFavorite, favoriteButton);
    }
  });
}

// Starts Cards progressively.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();

  addCardListeners();

  await loadCards(true);

  loadCardFilterOptions();
});
