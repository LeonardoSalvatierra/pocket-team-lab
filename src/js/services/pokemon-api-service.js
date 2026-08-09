const baseUrl = "https://pokeapi.co/api/v2";

const pokemonCache = new Map();
const speciesCache = new Map();
const typeCache = new Map();
const generationCache = new Map();

let completePokemonListPromise = null;

// Waits briefly before retrying a failed request.
function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

// Sends a request to PokéAPI with timeout and automatic retries.
async function request(endpoint, { retries = 1, timeout = 15000 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        signal: controller.signal,
      });

      if (response.ok) {
        return await response.json();
      }

      const error = new Error(
        `PokéAPI request failed with status ${response.status}`,
      );

      error.status = response.status;

      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === retries) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      lastError = error;

      const networkError =
        error.name === "AbortError" || error instanceof TypeError;

      const retryableStatus = error.status === 429 || error.status >= 500;

      if (attempt === retries || (!networkError && !retryableStatus)) {
        throw error;
      }
    } finally {
      window.clearTimeout(timeoutId);
    }

    await wait(800 * 2 ** attempt);
  }

  throw lastError;
}

// Uses a cached request and removes it if the request fails.
async function getCachedRequest(cache, key, endpoint) {
  if (!cache.has(key)) {
    cache.set(key, request(endpoint));
  }

  try {
    return await cache.get(key);
  } catch (error) {
    cache.delete(key);
    throw error;
  }
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

  try {
    return await completePokemonListPromise;
  } catch (error) {
    completePokemonListPromise = null;
    throw error;
  }
}

// Gets one Pokémon and caches the result.
export async function getPokemon(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  return getCachedRequest(
    pokemonCache,
    formattedIdentifier,
    `/pokemon/${formattedIdentifier}`,
  );
}

// Gets species information and caches the result.
export async function getPokemonSpecies(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  return getCachedRequest(
    speciesCache,
    formattedIdentifier,
    `/pokemon-species/${formattedIdentifier}`,
  );
}

// Gets information about one Pokémon type.
export async function getPokemonType(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  return getCachedRequest(
    typeCache,
    formattedIdentifier,
    `/type/${formattedIdentifier}`,
  );
}

// Gets the Pokémon in one generation.
export async function getGeneration(identifier) {
  const formattedIdentifier = identifier.toString().trim().toLowerCase();

  return getCachedRequest(
    generationCache,
    formattedIdentifier,
    `/generation/${formattedIdentifier}`,
  );
}
