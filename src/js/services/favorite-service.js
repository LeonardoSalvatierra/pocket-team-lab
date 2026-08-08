import { getStorage, setStorage, storageKeys } from "../storage/storage.js";

// Returns all favorite Pokémon.
export function getFavoritePokemon() {
  return getStorage(storageKeys.favoritePokemon, []);
}

// Checks whether one Pokémon is a favorite.
export function isFavoritePokemon(pokemonId) {
  return getFavoritePokemon().some((pokemon) => pokemon.id === pokemonId);
}

// Gets the preferred image from a PokéAPI object.
function getPokemonImage(pokemon) {
  return (
    pokemon.image ||
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default ||
    ""
  );
}

// Gets type names from a complete or saved Pokémon.
function getPokemonTypes(pokemon) {
  if (!Array.isArray(pokemon.types)) {
    return [];
  }

  return pokemon.types.map((typeInformation) => {
    if (typeof typeInformation === "string") {
      return typeInformation;
    }

    return typeInformation.type?.name ?? "";
  });
}

// Adds or removes a Pokémon from favorites.
export function toggleFavoritePokemon(pokemon) {
  const favorites = getFavoritePokemon();

  const favoriteIndex = favorites.findIndex(
    (favorite) => favorite.id === pokemon.id,
  );

  if (favoriteIndex >= 0) {
    favorites.splice(favoriteIndex, 1);

    setStorage(storageKeys.favoritePokemon, favorites);

    return {
      success: true,
      favorite: false,
      message: `${pokemon.name} was removed from favorites.`,
    };
  }

  favorites.push({
    id: pokemon.id,
    name: pokemon.name,
    image: getPokemonImage(pokemon),
    types: getPokemonTypes(pokemon),
  });

  setStorage(storageKeys.favoritePokemon, favorites);

  return {
    success: true,
    favorite: true,
    message: `${pokemon.name} was added to favorites.`,
  };
}

// Removes one Pokémon from favorites.
export function removeFavoritePokemon(pokemonId) {
  const favorites = getFavoritePokemon();

  const updatedFavorites = favorites.filter(
    (pokemon) => pokemon.id !== pokemonId,
  );

  setStorage(storageKeys.favoritePokemon, updatedFavorites);

  return updatedFavorites;
}
