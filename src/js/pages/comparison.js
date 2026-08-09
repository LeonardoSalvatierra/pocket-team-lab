import { loadLayout } from "../components/layout.js";

import { createStatBars } from "../components/stat-bars.js";

import {
  clearComparison,
  getComparisonPokemon,
  removeComparisonPokemon,
  setComparisonPokemon,
} from "../services/comparison-service.js";

import {
  getAllPokemonList,
  getPokemon,
} from "../services/pokemon-api-service.js";

import { capitalize, formatPokemonNumber, showError } from "../utils.js";

const comparisonStatNames = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];

const comparisonStatLabels = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Attack",
  "special-defense": "Sp. Defense",
  speed: "Speed",
};

let selectedPokemonDetails = [];

// Converts names such as special-attack into Special Attack.
function formatName(value) {
  return value.split("-").map(capitalize).join(" ");
}

// Gets the preferred Pokémon image.
function getPokemonImage(pokemon) {
  return (
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default ||
    ""
  );
}

// Converts Pokémon stats into a simple object.
function getPokemonStats(pokemon) {
  return Object.fromEntries(
    pokemon.stats.map(({ base_stat, stat }) => [stat.name, base_stat]),
  );
}

// Creates type badges.
function createTypeBadges(pokemon) {
  return pokemon.types
    .map(
      ({ type }) => `
        <span class="pokemon-type pokemon-type--${type.name}">
          ${capitalize(type.name)}
        </span>
      `,
    )
    .join("");
}

// Displays a temporary page message.
function showComparisonMessage(message, successful = true) {
  const messageElement = document.querySelector("#comparison-message");

  messageElement.textContent = message;

  messageElement.className = successful
    ? "comparison-message comparison-message--success"
    : "comparison-message comparison-message--error";
}

// Creates an empty comparison slot.
function createEmptySlot(slotNumber) {
  return `
    <div class="comparison-slot__empty">
      <a
        class="comparison-slot__add"
        href="${import.meta.env.BASE_URL}"
        aria-label="Open Explorer to select Pokémon ${slotNumber}"
        title="Select a Pokémon from Explorer"
      >
        +
      </a>

      <h2>Select Pokémon ${slotNumber}</h2>

      <p>
        Search above or add a Pokémon from its details page.
      </p>

      <a
        class="comparison-slot__explore"
        href="${import.meta.env.BASE_URL}"
      >
        Explore Pokémon
      </a>
    </div>
  `;
}

// Creates one selected Pokémon.
function createSelectedPokemon(pokemon, slotIndex) {
  const stats = getPokemonStats(pokemon);

  const totalStats = Object.values(stats).reduce(
    (total, value) => total + value,
    0,
  );

  return `
    <article class="comparison-pokemon">
      <button
        class="comparison-pokemon__remove"
        type="button"
        data-remove-comparison="${slotIndex}"
        aria-label="Remove ${pokemon.name} from comparison"
        title="Remove from comparison"
      >
        &times;
      </button>

      <span class="comparison-pokemon__number">
        ${formatPokemonNumber(pokemon.id)}
      </span>

      <img
        src="${getPokemonImage(pokemon)}"
        alt="${formatName(pokemon.name)}"
      />

      <h2>${formatName(pokemon.name)}</h2>

      <div class="pokemon-types">
        ${createTypeBadges(pokemon)}
      </div>

      <p class="comparison-pokemon__total">
        Total base stats: <strong>${totalStats}</strong>
      </p>

      ${createStatBars(stats, comparisonStatNames)}

      <a
        class="button button--secondary button--full"
        href="${import.meta.env.BASE_URL}pokemon-details/pokemon-details.html?id=${pokemon.id}"
      >
        View Details
      </a>
    </article>
  `;
}

// Renders both selected Pokémon.
function renderComparisonSlots() {
  const firstContainer = document.querySelector("#comparison-slot-one");
  const secondContainer = document.querySelector("#comparison-slot-two");

  firstContainer.innerHTML = selectedPokemonDetails[0]
    ? createSelectedPokemon(selectedPokemonDetails[0], 0)
    : createEmptySlot(1);

  secondContainer.innerHTML = selectedPokemonDetails[1]
    ? createSelectedPokemon(selectedPokemonDetails[1], 1)
    : createEmptySlot(2);
}

// Determines the winner of one statistic.
function getStatResult(firstValue, secondValue, firstName, secondName) {
  if (firstValue === secondValue) {
    return "Tie";
  }

  return firstValue > secondValue
    ? `${formatName(firstName)} wins`
    : `${formatName(secondName)} wins`;
}

// Creates the direct stat comparison table.
function createComparisonRows(firstPokemon, secondPokemon) {
  const firstStats = getPokemonStats(firstPokemon);
  const secondStats = getPokemonStats(secondPokemon);

  return comparisonStatNames
    .map((statName) => {
      const firstValue = firstStats[statName];
      const secondValue = secondStats[statName];

      return `
        <div class="comparison-row">
          <strong class="${firstValue > secondValue ? "comparison-value--winner" : ""}">
            ${firstValue}
          </strong>

          <div class="comparison-row__result">
            <span>${comparisonStatLabels[statName]}</span>

            <small>
              ${getStatResult(
                firstValue,
                secondValue,
                firstPokemon.name,
                secondPokemon.name,
              )}
            </small>
          </div>

          <strong class="${secondValue > firstValue ? "comparison-value--winner" : ""}">
            ${secondValue}
          </strong>
        </div>
      `;
    })
    .join("");
}

// Displays the final comparison result.
function renderComparisonResults() {
  const container = document.querySelector("#comparison-results");

  if (selectedPokemonDetails.length < 2) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const [firstPokemon, secondPokemon] = selectedPokemonDetails;

  const firstStats = getPokemonStats(firstPokemon);
  const secondStats = getPokemonStats(secondPokemon);

  const firstTotal = comparisonStatNames.reduce(
    (total, statName) => total + firstStats[statName],
    0,
  );

  const secondTotal = comparisonStatNames.reduce(
    (total, statName) => total + secondStats[statName],
    0,
  );

  let overallResult = "Both Pokémon have the same total base stats.";

  if (firstTotal > secondTotal) {
    overallResult = `${formatName(firstPokemon.name)} has the higher total base stats.`;
  }

  if (secondTotal > firstTotal) {
    overallResult = `${formatName(secondPokemon.name)} has the higher total base stats.`;
  }

  container.hidden = false;

  container.innerHTML = `
    <div class="comparison-results__header">
      <div>
        <p>Comparison Results</p>

        <h2>
          ${formatName(firstPokemon.name)}
          vs.
          ${formatName(secondPokemon.name)}
        </h2>
      </div>

      <strong>${overallResult}</strong>
    </div>

    <div class="comparison-table">
      <div class="comparison-table__names">
        <strong>${formatName(firstPokemon.name)}</strong>
        <span>Statistic</span>
        <strong>${formatName(secondPokemon.name)}</strong>
      </div>

      ${createComparisonRows(firstPokemon, secondPokemon)}
    </div>
  `;
}

// Loads complete information for the selected Pokémon.
async function loadComparisonPokemon() {
  const savedComparison = getComparisonPokemon();

  if (savedComparison.length === 0) {
    selectedPokemonDetails = [];

    renderComparisonSlots();
    renderComparisonResults();
    showComparisonMessage("");
    return;
  }

  try {
    showComparisonMessage("Loading selected Pokémon...");

    selectedPokemonDetails = await Promise.all(
      savedComparison.map((pokemon) => getPokemon(pokemon.id)),
    );

    renderComparisonSlots();
    renderComparisonResults();
    showComparisonMessage("");
  } catch (error) {
    console.error("Comparison loading error:", error);

    showError(
      document.querySelector("#comparison-message"),
      "The selected Pokémon could not be loaded. Check your connection.",
      {
        onRetry: loadComparisonPokemon,
      },
    );
  }
}

// Selects or replaces a Pokémon using one search form.
async function handlePokemonSearch(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const slotIndex = Number(form.dataset.comparisonForm);
  const input = form.elements.pokemon;
  const identifier = input.value.trim();

  if (!identifier) {
    input.focus();
    return;
  }

  try {
    showComparisonMessage("Loading Pokémon...");

    const pokemon = await getPokemon(identifier);

    const result = setComparisonPokemon(slotIndex, pokemon);

    if (!result.success) {
      showComparisonMessage(result.message, false);
      return;
    }

    input.value = "";

    showComparisonMessage(result.message);

    await loadComparisonPokemon();
  } catch (error) {
    console.error("Pokémon search error:", error);

    showComparisonMessage(
      "Pokémon not found. Check the name or Pokédex number.",
      false,
    );

    input.focus();
  }
}

// Removes one selected Pokémon.
async function handleComparisonRemoval(slotIndex) {
  removeComparisonPokemon(slotIndex);

  showComparisonMessage("The Pokémon was removed from the comparison.");

  await loadComparisonPokemon();
}

// Removes both selections.
async function handleClearComparison() {
  clearComparison();

  showComparisonMessage("The comparison was cleared.");

  await loadComparisonPokemon();
}

// Loads Pokémon names into the browser suggestions.
async function loadPokemonSuggestions() {
  try {
    const listData = await getAllPokemonList();

    const datalist = document.querySelector("#pokemon-suggestions");

    datalist.innerHTML = listData.results
      .map(
        (pokemon, index) => `
          <option value="${pokemon.name}">
            #${index + 1} ${formatName(pokemon.name)}
          </option>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Pokémon suggestions loading error:", error);
  }
}

// Connects all Comparison page controls.
function addComparisonListeners() {
  document.querySelectorAll("[data-comparison-form]").forEach((form) => {
    form.addEventListener("submit", handlePokemonSearch);
  });

  document
    .querySelector("#clear-comparison")
    .addEventListener("click", handleClearComparison);

  document
    .querySelector(".comparison-selectors")
    .addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-comparison]");

      if (!removeButton) {
        return;
      }

      handleComparisonRemoval(Number(removeButton.dataset.removeComparison));
    });
}

// Loads the shared layout and starts Comparison.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();

  addComparisonListeners();

  await loadComparisonPokemon();

  loadPokemonSuggestions();
});
