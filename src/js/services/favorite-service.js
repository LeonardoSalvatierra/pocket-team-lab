import { getStorage, setStorage, storageKeys } from "../storage/storage.js";

import { getCardMarketPrice } from "../utils.js";

// Returns all favorite Pokémon.
export function getFavoritePokemon() {
  return getStorage(storageKeys.favoritePokemon, []);
}

// Checks whether one Pokémon is a favorite.
export function isFavoritePokemon(pokemonId) {
  return getFavoritePokemon().some((pokemon) => pokemon.id === pokemonId);
}

// Gets the preferred Pokémon image.
function getPokemonImage(pokemon) {
  return (
    pokemon.image ||
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default ||
    ""
  );
}

// Gets Pokémon type names.
function getPokemonTypes(pokemon) {
  if (!Array.isArray(pokemon.types)) {
    return [];
  }

  return pokemon.types
    .map((typeInformation) => {
      if (typeof typeInformation === "string") {
        return typeInformation;
      }

      return typeInformation.type?.name ?? "";
    })
    .filter(Boolean);
}

// Adds or removes a Pokémon favorite.
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

// Removes one favorite Pokémon.
export function removeFavoritePokemon(pokemonId) {
  const favorites = getFavoritePokemon();

  const updatedFavorites = favorites.filter(
    (pokemon) => pokemon.id !== pokemonId,
  );

  setStorage(storageKeys.favoritePokemon, updatedFavorites);

  return updatedFavorites;
}

// Returns all favorite trading cards.
export function getFavoriteCards() {
  return getStorage(storageKeys.favoriteCards, []);
}

// Checks whether one card is a favorite.
export function isFavoriteCard(cardId) {
  return getFavoriteCards().some((card) => card.id === cardId);
}

// Adds or removes a trading card favorite.
export function toggleFavoriteCard(card) {
  const favorites = getFavoriteCards();

  const favoriteIndex = favorites.findIndex(
    (favorite) => favorite.id === card.id,
  );

  if (favoriteIndex >= 0) {
    favorites.splice(favoriteIndex, 1);

    setStorage(storageKeys.favoriteCards, favorites);

    return {
      success: true,
      favorite: false,
      message: `${card.name} was removed from favorites.`,
    };
  }

  favorites.push({
    id: card.id,
    name: card.name,
    number: card.number ?? "",
    supertype: card.supertype ?? "Card",
    subtypes: card.subtypes ?? [],
    hp: card.hp ?? null,
    rarity: card.rarity ?? "Unknown rarity",
    artist: card.artist ?? "Unknown artist",
    types: card.types ?? [],
    images: {
      small: card.images?.small ?? card.image ?? "",
      large:
        card.images?.large ??
        card.largeImage ??
        card.images?.small ??
        card.image ??
        "",
    },
    set: {
      id: card.set?.id ?? "",
      name: card.set?.name ?? "Unknown set",
      releaseDate: card.set?.releaseDate ?? "",
    },
    marketPrice: getCardMarketPrice(card),
  });

  setStorage(storageKeys.favoriteCards, favorites);

  return {
    success: true,
    favorite: true,
    message: `${card.name} was added to favorites.`,
  };
}

// Removes one favorite trading card.
export function removeFavoriteCard(cardId) {
  const favorites = getFavoriteCards();

  const updatedFavorites = favorites.filter((card) => card.id !== cardId);

  setStorage(storageKeys.favoriteCards, updatedFavorites);

  return updatedFavorites;
}
