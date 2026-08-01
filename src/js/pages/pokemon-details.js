import { loadLayout } from "../components/layout.js";
import { getPokemon } from "../services/pokemon-api-service.js";
import {
  capitalize,
  formatPokemonNumber,
  getQueryParameter,
  showError,
} from "../utils.js";
// Gets the selected Pokémon ID and displays its details.
async function renderPokemonDetails() {
  const container = document.querySelector("#pokemon-details");
  const pokemonId = getQueryParameter("id");

  if (!pokemonId) {
    showError(container, "No Pokémon was selected.");
    return;
  }

  try {
    const pokemon = await getPokemon(pokemonId);

    const image =
      pokemon.sprites.other["official-artwork"].front_default ||
      pokemon.sprites.front_default;

    container.innerHTML = `
      <article class="pokemon-detail">
        <img
          src="${image}"
          alt="${capitalize(pokemon.name)}"
        >

        <div>
          <p>${formatPokemonNumber(pokemon.id)}</p>
          <h1>${capitalize(pokemon.name)}</h1>

          <p>
            Height: ${pokemon.height / 10} m
          </p>

          <p>
            Weight: ${pokemon.weight / 10} kg
          </p>
        </div>
      </article>
    `;

    document.title = `${capitalize(pokemon.name)} | Pocket Team Lab`;
  } catch (error) {
    console.error(error);

    showError(container, "The Pokémon information could not be loaded.");
  }
}
// Loads the shared layout and starts the details page.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  await renderPokemonDetails();
});
