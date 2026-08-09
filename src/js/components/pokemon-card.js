import { isFavoritePokemon } from "../services/favorite-service.js";

import { isPokemonInCurrentTeam } from "../services/team-service.js";

import { capitalize, formatPokemonNumber } from "../utils.js";

// Finds one statistic in a Pokémon object.
function getStat(pokemon, statName) {
  const statistic = pokemon.stats.find((item) => item.stat.name === statName);

  return statistic?.base_stat ?? 0;
}

// Creates one complete Explorer Pokémon card.
export function createPokemonCard(pokemon) {
  const article = document.createElement("article");

  article.classList.add("pokemon-card");

  const image =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default;

  const detailsUrl =
    `${import.meta.env.BASE_URL}` +
    `pokemon-details/pokemon-details.html?id=${pokemon.id}`;

  const types = pokemon.types
    .map(
      ({ type }) => `
        <span
          class="pokemon-type pokemon-type--${type.name}"
        >
          ${type.name}
        </span>
      `,
    )
    .join("");

  const favorite = isFavoritePokemon(pokemon.id);
  const inTeam = isPokemonInCurrentTeam(pokemon.id);

  article.innerHTML = `
    <button
      class="favorite-button ${favorite ? "favorite-button--active" : ""}"
      type="button"
      aria-label="${favorite ? "Remove" : "Add"} ${pokemon.name} ${
        favorite ? "from" : "to"
      } favorites"
      aria-pressed="${favorite}"
      data-favorite-id="${pokemon.id}"
    >
      ${favorite ? "♥" : "♡"}
    </button>

    <a
      class="pokemon-card__image-link"
      href="${detailsUrl}"
      aria-label="View details for ${capitalize(pokemon.name)}"
    >
      <img
        class="pokemon-card__image"
        src="${image}"
        alt="${capitalize(pokemon.name)}"
        loading="lazy"
      />
    </a>

    <div class="pokemon-card__content">
      <div class="pokemon-card__heading">
        <span>
          ${formatPokemonNumber(pokemon.id)}
        </span>

        <h3>
          <a href="${detailsUrl}">
            ${capitalize(pokemon.name)}
          </a>
        </h3>
      </div>

      <div class="pokemon-types">
        ${types}
      </div>

      <dl class="pokemon-stats">
        <div>
          <dt>HP</dt>
          <dd>${getStat(pokemon, "hp")}</dd>
        </div>

        <div>
          <dt>ATK</dt>
          <dd>${getStat(pokemon, "attack")}</dd>
        </div>

        <div>
          <dt>DEF</dt>
          <dd>${getStat(pokemon, "defense")}</dd>
        </div>
      </dl>

      <div class="pokemon-card__actions">
        <a
          class="card-button"
          href="${detailsUrl}"
        >
          View Details
        </a>

        <button
          class="card-button card-button--primary ${
            inTeam ? "card-button--team-active" : ""
          }"
          type="button"
          data-team-id="${pokemon.id}"
          aria-pressed="${inTeam}"
        >
          ${inTeam ? "✓ In Team" : "+ Add to Team"}
        </button>
      </div>
    </div>
  `;

  return article;
}
