import { loadLayout } from "../components/layout.js";
import {
    getStorage,
    storageKeys
} from "../storage/storage.js";
import { capitalize } from "../utils.js";
// Reads and displays the favorite Pokémon saved in localStorage.
function renderFavoritePokemon() {
    const container = document.querySelector("#favorites-content");

    if (!container) {
        return;
    }

    const favorites = getStorage(
        storageKeys.favoritePokemon,
        []
    );

    if (favorites.length === 0) {
        container.innerHTML = "<p>No favorite Pokémon saved yet.</p>";
        return;
    }

    container.innerHTML = favorites
        .map(
            (pokemon) => `
        <article class="favorite-item">
          <img src="${pokemon.image}" alt="${capitalize(pokemon.name)}">
          <h2>${capitalize(pokemon.name)}</h2>
        </article>
      `
        )
        .join("");
}
// Loads the shared layout and then displays the favorites.
document.addEventListener("DOMContentLoaded", async () => {
    await loadLayout();
    renderFavoritePokemon();
});