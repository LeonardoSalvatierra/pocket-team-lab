import { capitalize, formatPokemonNumber } from "../utils.js";
// Finds and returns one statistic from a Pokémon object.
function getStat(pokemon, statName) {
  const statistic = pokemon.stats.find((item) => item.stat.name === statName);

  return statistic?.base_stat ?? 0;
}
// Creates the complete HTML card for one Pokémon.
export function createPokemonCard(pokemon) {
  const article = document.createElement("article");
  article.classList.add("pokemon-card");

  const image =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default;

  const types = pokemon.types
    .map(
      ({ type }) =>
        `<span class="pokemon-type pokemon-type--${type.name}">
          ${type.name}
        </span>`,
    )
    .join("");

  article.innerHTML = `
    <button
      class="favorite-button"
      type="button"
      aria-label="Add ${pokemon.name} to favorites"
      data-favorite-id="${pokemon.id}"
    >
      ♡
    </button>

    <img
      class="pokemon-card__image"
      src="${image}"
      alt="${capitalize(pokemon.name)}"
      loading="lazy"
    >

    <div class="pokemon-card__content">
      <div class="pokemon-card__heading">
        <span>${formatPokemonNumber(pokemon.id)}</span>
        <h3>${capitalize(pokemon.name)}</h3>
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
          href="${import.meta.env.BASE_URL}pokemon-details/pokemon-details.html?id=${pokemon.id}"
        >
          View Details
        </a>

        <button
          class="card-button card-button--primary"
          type="button"
          data-team-id="${pokemon.id}"
        >
          + Add to Team
        </button>
      </div>
    </div>
  `;

  return article;
}
