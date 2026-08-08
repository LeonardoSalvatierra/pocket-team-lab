import { loadLayout } from "../components/layout.js";

import { createStatBars } from "../components/stat-bars.js";

import {
  getAllPokemonList,
  getPokemon,
  getPokemonSpecies,
} from "../services/pokemon-api-service.js";

import {
  addPokemonToCurrentTeam,
  getCurrentTeam,
  maximumTeamSize,
} from "../services/team-service.js";

import { getDefensiveEffectiveness } from "../services/type-analysis-service.js";

import {
  isFavoritePokemon,
  toggleFavoritePokemon,
} from "../services/favorite-service.js";

import {
  capitalize,
  formatPokemonNumber,
  getQueryParameter,
  showError,
} from "../utils.js";

import {
  addPokemonToComparison,
  clearComparison,
  getComparisonPokemon,
  isPokemonInComparison,
  maximumComparisonSize,
  removePokemonFromComparison,
} from "../services/comparison-service.js";

// Safely prepares text before placing it in HTML.
function escapeHtml(value) {
  const element = document.createElement("div");

  element.textContent = value;

  return element.innerHTML;
}

// Converts names such as solar-power into Solar Power.
function formatName(value) {
  return value.split("-").map(capitalize).join(" ");
}

// Gets the preferred Pokémon image.
function getPokemonImage(pokemon) {
  return (
    pokemon.sprites.other["official-artwork"]?.front_default ||
    pokemon.sprites.other.home?.front_default ||
    pokemon.sprites.front_default
  );
}

// Converts Pokémon statistics into a simple object.
function createStatsObject(pokemon) {
  return Object.fromEntries(
    pokemon.stats.map(({ base_stat, stat }) => [stat.name, base_stat]),
  );
}

// Finds one English Pokédex description.
function getEnglishDescription(species) {
  const description = species.flavor_text_entries.find(
    (entry) => entry.language.name === "en",
  )?.flavor_text;

  if (!description) {
    return "No English Pokédex description is available.";
  }

  return description.replace(/\s+/g, " ").trim();
}

// Formats the species generation name.
function formatGeneration(generationName) {
  return formatName(generationName);
}

// Converts the gender rate into readable percentages.
function formatGenderRate(genderRate) {
  if (genderRate === -1) {
    return "Genderless";
  }

  const femalePercentage = (genderRate / 8) * 100;
  const malePercentage = 100 - femalePercentage;

  if (femalePercentage === 0) {
    return "100% male";
  }

  if (malePercentage === 0) {
    return "100% female";
  }

  return `${malePercentage}% male · ${femalePercentage}% female`;
}

// Creates the Pokémon type badges.
function createTypeBadges(pokemon) {
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

// Creates the abilities list.
function createAbilities(pokemon) {
  return pokemon.abilities
    .map(
      ({ ability, is_hidden }) => `
        <li>
          <strong>${formatName(ability.name)}</strong>

          ${
            is_hidden
              ? `<span class="hidden-ability">
                  Hidden ability
                </span>`
              : ""
          }
        </li>
      `,
    )
    .join("");
}

// Displays a limited group of moves.
function createMoves(pokemon) {
  const moves = pokemon.moves
    .map(({ move }) => move.name)
    .sort((first, second) => first.localeCompare(second))
    .slice(0, 16);

  return moves
    .map(
      (moveName) => `
        <span class="move-chip">
          ${formatName(moveName)}
        </span>
      `,
    )
    .join("");
}

// Creates type effectiveness badges.
function createEffectivenessBadges(items) {
  if (items.length === 0) {
    return `
      <p class="placeholder-text">
        None
      </p>
    `;
  }

  return items
    .sort((first, second) => second.multiplier - first.multiplier)
    .map(
      ({ name, multiplier }) => `
        <span class="effectiveness-chip">
          ${capitalize(name)}

          <strong>
            ${multiplier === 0 ? "0×" : `${multiplier}×`}
          </strong>
        </span>
      `,
    )
    .join("");
}

// Updates the favorite button appearance.
function updateFavoriteButton(pokemonId) {
  const button = document.querySelector("#detail-favorite-button");

  if (!button) {
    return;
  }

  const favorite = isFavoritePokemon(pokemonId);

  button.classList.toggle("detail-action--favorite-active", favorite);

  button.innerHTML = favorite ? "♥ Saved to Favorites" : "♡ Add to Favorites";

  button.setAttribute("aria-pressed", favorite.toString());
}

// Adds or removes this Pokémon from favorites.
// Adds or removes this Pokémon from favorites.
function toggleFavorite(pokemon) {
  const result = toggleFavoritePokemon(pokemon);

  updateFavoriteButton(pokemon.id);
  showActionMessage(result.message, true);
}

// Displays a temporary action message.
function showActionMessage(message, successful = true) {
  const messageElement = document.querySelector("#detail-action-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;

  messageElement.className = successful
    ? "detail-action-message detail-action-message--success"
    : "detail-action-message detail-action-message--error";
}

// Adds the current Pokémon to the active team.
function addPokemonToTeam(pokemon) {
  const result = addPokemonToCurrentTeam({
    id: pokemon.id,
    name: pokemon.name,
    image: getPokemonImage(pokemon),
    types: pokemon.types.map(({ type }) => type.name),
  });

  showActionMessage(result.message, result.success);

  if (!result.success) {
    return;
  }

  const headerCounter = document.querySelector("#header-team-count");

  const currentTeam = getCurrentTeam();

  if (headerCounter) {
    headerCounter.textContent = `${currentTeam.length}/${maximumTeamSize}`;
  }

  const button = document.querySelector("#detail-team-button");

  if (button) {
    button.textContent = "Added to Team";
  }
}

// Updates the comparison controls on Pokémon Details.
function updateComparisonControls(pokemon) {
  const button = document.querySelector("#detail-comparison-button");
  const status = document.querySelector("#detail-comparison-status");
  const selectedNames = document.querySelector("#detail-comparison-names");

  if (!button || !status || !selectedNames) {
    return;
  }

  const comparison = getComparisonPokemon();
  const selected = isPokemonInComparison(pokemon.id);
  const full = comparison.length >= maximumComparisonSize;

  status.textContent = `Comparison ${comparison.length}/${maximumComparisonSize}`;

  selectedNames.textContent =
    comparison.length > 0
      ? comparison.map((item) => formatName(item.name)).join(" vs. ")
      : "No Pokémon selected yet.";

  button.classList.toggle("detail-action--favorite-active", selected);

  if (selected) {
    button.textContent = "Remove from Comparison";
    button.disabled = false;
    return;
  }

  if (full) {
    button.textContent = "Comparison Full";
    button.disabled = true;
    return;
  }

  button.textContent = "+ Add to Comparison";
  button.disabled = false;
}

// Adds or removes the current Pokémon from comparison.
function toggleComparisonPokemon(pokemon) {
  if (isPokemonInComparison(pokemon.id)) {
    removePokemonFromComparison(pokemon.id);

    showActionMessage(
      `${formatName(pokemon.name)} was removed from the comparison.`,
      true,
    );
  } else {
    const result = addPokemonToComparison(pokemon);

    showActionMessage(result.message, result.success);
  }

  updateComparisonControls(pokemon);
}

// Clears the current comparison from Pokémon Details.
function clearPokemonComparison(pokemon) {
  clearComparison();

  showActionMessage("The comparison was cleared.", true);

  updateComparisonControls(pokemon);
}

// Creates the previous and next navigation.
function renderPokemonNavigation(allPokemon, currentPokemon) {
  const navigation = document.querySelector("#pokemon-navigation");

  const currentIndex = allPokemon.findIndex(
    (pokemon) => pokemon.name === currentPokemon.name,
  );

  const previousPokemon =
    currentIndex > 0 ? allPokemon[currentIndex - 1] : null;

  const nextPokemon =
    currentIndex >= 0 && currentIndex < allPokemon.length - 1
      ? allPokemon[currentIndex + 1]
      : null;

  const createNavigationLink = (pokemon, label, direction) => {
    if (!pokemon) {
      return `
        <span
          class="pokemon-navigation-link pokemon-navigation-link--disabled"
          aria-disabled="true"
        >
          ${direction === "previous" ? "←" : ""}
          ${label}
          ${direction === "next" ? "→" : ""}
        </span>
      `;
    }

    return `
      <a
        class="pokemon-navigation-link"
        href="${import.meta.env.BASE_URL}pokemon-details/pokemon-details.html?id=${pokemon.name}"
      >
        ${
          direction === "previous"
            ? `← ${formatName(pokemon.name)}`
            : `${formatName(pokemon.name)} →`
        }
      </a>
    `;
  };

  navigation.innerHTML = `
    ${createNavigationLink(previousPokemon, "Previous", "previous")}

    <a
      class="pokemon-navigation-back"
      href="${import.meta.env.BASE_URL}"
    >
      Back to Explorer
    </a>

    ${createNavigationLink(nextPokemon, "Next", "next")}
  `;
}

// Displays the complete Pokémon page.
function renderPokemonDetails(pokemon, species, effectiveness) {
  const container = document.querySelector("#pokemon-details");

  const image = getPokemonImage(pokemon);
  const stats = createStatsObject(pokemon);

  const totalStats = Object.values(stats).reduce(
    (total, value) => total + value,
    0,
  );

  const description = escapeHtml(getEnglishDescription(species));

  container.innerHTML = `
    <article class="pokemon-detail">
      <section class="pokemon-detail__hero">
        <div class="pokemon-detail__image-panel">
          <span class="pokemon-detail__number">
            ${formatPokemonNumber(pokemon.id)}
          </span>

          <img
            src="${image}"
            alt="${capitalize(pokemon.name)}"
          />
        </div>

        <div class="pokemon-detail__introduction">
          <div class="pokemon-detail__title">
            <div>
              <p class="pokemon-detail__category">
                ${formatName(
                  species.genera.find((entry) => entry.language.name === "en")
                    ?.genus ?? "Pokémon",
                )}
              </p>

              <h1>${formatName(pokemon.name)}</h1>
            </div>

            <div class="pokemon-types">
              ${createTypeBadges(pokemon)}
            </div>
          </div>

          <p class="pokemon-detail__description">
            ${description}
          </p>

                    <div class="pokemon-detail__actions">
            <button
              id="detail-team-button"
              class="detail-action detail-action--primary"
              type="button"
            >
              + Add to Team
            </button>

            <button
              id="detail-favorite-button"
              class="detail-action"
              type="button"
              aria-pressed="false"
            >
              ♡ Add to Favorites
            </button>

            <button
              id="detail-comparison-button"
              class="detail-action"
              type="button"
            >
              + Add to Comparison
            </button>
          </div>

          <aside class="detail-comparison-panel">
            <div>
              <strong id="detail-comparison-status">
                Comparison 0/2
              </strong>

              <span id="detail-comparison-names">
                No Pokémon selected yet.
              </span>
            </div>

            <div class="detail-comparison-panel__actions">
              <a
                class="text-button"
                href="${import.meta.env.BASE_URL}comparison/comparison.html"
              >
                View Comparison
              </a>

              <button
                id="clear-detail-comparison"
                class="text-button"
                type="button"
              >
                Clear
              </button>
            </div>
          </aside>

          <p
            id="detail-action-message"
            class="detail-action-message"
            aria-live="polite"
          ></p>

          <dl class="pokemon-basic-information">
            <div>
              <dt>Height</dt>
              <dd>${pokemon.height / 10} m</dd>
            </div>

            <div>
              <dt>Weight</dt>
              <dd>${pokemon.weight / 10} kg</dd>
            </div>

            <div>
              <dt>Base experience</dt>
              <dd>${pokemon.base_experience ?? "Unknown"}</dd>
            </div>

            <div>
              <dt>Generation</dt>
              <dd>
                ${formatGeneration(species.generation.name)}
              </dd>
            </div>

            <div>
              <dt>Gender</dt>
              <dd>
                ${formatGenderRate(species.gender_rate)}
              </dd>
            </div>

            <div>
              <dt>Habitat</dt>
              <dd>
                ${
                  species.habitat ? formatName(species.habitat.name) : "Unknown"
                }
              </dd>
            </div>
          </dl>
        </div>
      </section>

            <div class="pokemon-detail__content">
        <!-- Left detail column -->

        <div class="pokemon-detail__column">
          <section class="panel pokemon-stat-panel">
            <div class="detail-section-heading">
              <div>
                <p>Performance</p>
                <h2>Base Statistics</h2>
              </div>

              <span>
                Total <strong>${totalStats}</strong>
              </span>
            </div>

            ${createStatBars(stats, [
              "hp",
              "attack",
              "defense",
              "special-attack",
              "special-defense",
              "speed",
            ])}
          </section>

          <section class="panel pokemon-effectiveness">
            <div class="detail-section-heading">
              <div>
                <p>Defense</p>
                <h2>Type Effectiveness</h2>
              </div>
            </div>

            <div class="effectiveness-group">
              <h3>Weaknesses</h3>

              <div class="effectiveness-list">
                ${createEffectivenessBadges(effectiveness.weaknesses)}
              </div>
            </div>

            <div class="effectiveness-group">
              <h3>Resistances</h3>

              <div class="effectiveness-list">
                ${createEffectivenessBadges(effectiveness.resistances)}
              </div>
            </div>

            <div class="effectiveness-group">
              <h3>Immunities</h3>

              <div class="effectiveness-list">
                ${createEffectivenessBadges(effectiveness.immunities)}
              </div>
            </div>
          </section>
        </div>

        <!-- Right detail column -->

        <div class="pokemon-detail__column">
          <section class="panel pokemon-abilities-panel">
            <div class="detail-section-heading">
              <div>
                <p>Characteristics</p>
                <h2>Abilities</h2>
              </div>
            </div>

            <ul class="pokemon-abilities">
              ${createAbilities(pokemon)}
            </ul>
          </section>

          <section class="panel pokemon-moves-panel">
            <div class="detail-section-heading">
              <div>
                <p>Move Collection</p>
                <h2>Example Moves</h2>
              </div>

              <span>
                Showing 16 of ${pokemon.moves.length}
              </span>
            </div>

            <div class="pokemon-moves">
              ${createMoves(pokemon)}
            </div>
          </section>
        </div>
      </div>
    </article>
  `;

  document.title = `${formatName(pokemon.name)} | Pocket Team Lab`;

  updateFavoriteButton(pokemon.id);
  updateComparisonControls(pokemon);

  document
    .querySelector("#detail-team-button")
    .addEventListener("click", () => {
      addPokemonToTeam(pokemon);
    });

  document
    .querySelector("#detail-favorite-button")
    .addEventListener("click", () => {
      toggleFavorite(pokemon);
    });
  document
    .querySelector("#detail-comparison-button")
    .addEventListener("click", () => {
      toggleComparisonPokemon(pokemon);
    });

  document
    .querySelector("#clear-detail-comparison")
    .addEventListener("click", () => {
      clearPokemonComparison(pokemon);
    });
}

// Gets the selected Pokémon and displays the page.
async function renderSelectedPokemon() {
  const container = document.querySelector("#pokemon-details");

  const pokemonIdentifier = getQueryParameter("id");

  if (!pokemonIdentifier) {
    showError(container, "No Pokémon was selected.");
    return;
  }

  try {
    const [pokemon, allPokemonData] = await Promise.all([
      getPokemon(pokemonIdentifier),
      getAllPokemonList(),
    ]);

    const [species, effectiveness] = await Promise.all([
      getPokemonSpecies(pokemon.species.name),

      getDefensiveEffectiveness(pokemon.types.map(({ type }) => type.name)),
    ]);

    renderPokemonNavigation(allPokemonData.results, pokemon);

    renderPokemonDetails(pokemon, species, effectiveness);
  } catch (error) {
    console.error(error);

    showError(container, "The Pokémon information could not be loaded.");
  }
}

// Loads the shared layout and starts Details.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  await renderSelectedPokemon();
});
