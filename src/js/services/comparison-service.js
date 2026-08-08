const comparisonStorageKey = "pocket-team-comparison";

export const maximumComparisonSize = 2;

// Returns the Pokémon currently selected for comparison.
export function getComparisonPokemon() {
  try {
    const storedValue = sessionStorage.getItem(comparisonStorageKey);

    if (!storedValue) {
      return [];
    }

    const comparison = JSON.parse(storedValue);

    return Array.isArray(comparison) ? comparison.slice(0, 2) : [];
  } catch (error) {
    console.error("Could not read the current comparison.", error);

    return [];
  }
}

// Saves the current comparison in sessionStorage.
function saveComparisonPokemon(comparison) {
  sessionStorage.setItem(
    comparisonStorageKey,
    JSON.stringify(comparison.slice(0, maximumComparisonSize)),
  );
}

// Creates the small Pokémon object saved temporarily.
function normalizeComparisonPokemon(pokemon) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    image:
      pokemon.image ||
      pokemon.sprites?.other?.["official-artwork"]?.front_default ||
      pokemon.sprites?.other?.home?.front_default ||
      pokemon.sprites?.front_default ||
      "",
    types: (pokemon.types ?? [])
      .map((typeInformation) => {
        if (typeof typeInformation === "string") {
          return typeInformation;
        }

        return typeInformation.type?.name ?? "";
      })
      .filter(Boolean),
  };
}

// Checks whether one Pokémon is currently selected.
export function isPokemonInComparison(pokemonId) {
  return getComparisonPokemon().some(
    (pokemon) => pokemon.id === Number(pokemonId),
  );
}

// Adds one Pokémon if a comparison slot is available.
export function addPokemonToComparison(pokemon) {
  const comparison = getComparisonPokemon();

  if (comparison.some((item) => item.id === pokemon.id)) {
    return {
      success: false,
      message: `${pokemon.name} is already in the comparison.`,
    };
  }

  if (comparison.length >= maximumComparisonSize) {
    return {
      success: false,
      message: "The comparison is full. Remove a Pokémon or clear it first.",
    };
  }

  comparison.push(normalizeComparisonPokemon(pokemon));

  saveComparisonPokemon(comparison);

  return {
    success: true,
    message: `${pokemon.name} was added to the comparison.`,
  };
}

// Places a Pokémon into a specific comparison slot.
export function setComparisonPokemon(slotIndex, pokemon) {
  const comparison = getComparisonPokemon();

  const duplicateIndex = comparison.findIndex((item) => item.id === pokemon.id);

  if (duplicateIndex >= 0 && duplicateIndex !== slotIndex) {
    return {
      success: false,
      message: `${pokemon.name} is already selected in the other slot.`,
    };
  }

  comparison[slotIndex] = normalizeComparisonPokemon(pokemon);

  saveComparisonPokemon(comparison.filter(Boolean));

  return {
    success: true,
    message: `${pokemon.name} was selected.`,
  };
}

// Removes the Pokémon from one comparison slot.
export function removeComparisonPokemon(slotIndex) {
  const comparison = getComparisonPokemon();

  comparison.splice(slotIndex, 1);

  saveComparisonPokemon(comparison);

  return comparison;
}

// Removes one Pokémon using its ID.
export function removePokemonFromComparison(pokemonId) {
  const comparison = getComparisonPokemon().filter(
    (pokemon) => pokemon.id !== Number(pokemonId),
  );

  saveComparisonPokemon(comparison);

  return comparison;
}

// Clears both comparison slots.
export function clearComparison() {
  sessionStorage.removeItem(comparisonStorageKey);
}
