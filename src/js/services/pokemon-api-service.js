const baseUrl = "https://pokeapi.co/api/v2";

const pokemonCache = new Map();
const typeCache = new Map();
const generationCache = new Map();

let completePokemonListPromise = null;

// Sends a request to PokéAPI and returns JSON.
async function request(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`);

  if (!response.ok) {
    throw new Error(`PokéAPI request failed with status ${response.status}`);
  }

  return response.json();
}

// Gets one page of Pokémon names.
export async function getPokemonList(limit = 24, offset = 0) {
  return request(`/pokemon?limit=${limit}&offset=${offset}`);
}

// Gets the complete lightweight list of Pokémon.
export async function getAllPokemonList() {
  if (!completePokemonListPromise) {
    completePokemonListPromise = (async () => {
      const listInformation = await getPokemonList(1, 0);

      return getPokemonList(listInformation.count, 0);
    })();
  }

  return completePokemonListPromise;
}

// Gets one Pokémon and caches the result.
export async function getPokemon(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  if (!pokemonCache.has(formattedIdentifier)) {
    pokemonCache.set(
      formattedIdentifier,
      request(`/pokemon/${formattedIdentifier}`),
    );
  }

  try {
    return await pokemonCache.get(formattedIdentifier);
  } catch (error) {
    pokemonCache.delete(formattedIdentifier);
    throw error;
  }
}

// Gets species information.
export async function getPokemonSpecies(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  return request(`/pokemon-species/${formattedIdentifier}`);
}

// Gets information about one Pokémon type.
export async function getPokemonType(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  if (!typeCache.has(formattedIdentifier)) {
    typeCache.set(formattedIdentifier, request(`/type/${formattedIdentifier}`));
  }

  return typeCache.get(formattedIdentifier);
}

// Gets the Pokémon in one generation.
export async function getGeneration(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  if (!generationCache.has(formattedIdentifier)) {
    generationCache.set(
      formattedIdentifier,
      request(`/generation/${formattedIdentifier}`),
    );
  }

  return generationCache.get(formattedIdentifier);
}
