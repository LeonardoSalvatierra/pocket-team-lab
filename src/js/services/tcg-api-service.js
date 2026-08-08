const baseUrl = "https://api.pokemontcg.io/v2";

const metadataDuration = 7 * 24 * 60 * 60 * 1000;

const memoryPromises = new Map();
const cardCache = new Map();

// Waits before retrying a failed request.
function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

// Reads API metadata cached in localStorage.
function readMetadataCache(cacheKey) {
  try {
    const storedValue = localStorage.getItem(cacheKey);

    if (!storedValue) {
      return null;
    }

    const cachedInformation = JSON.parse(storedValue);

    const expired = Date.now() - cachedInformation.savedAt > metadataDuration;

    if (expired) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cachedInformation.data;
  } catch (error) {
    console.error(`Could not read ${cacheKey}`, error);

    return null;
  }
}

// Saves API metadata in localStorage.
function saveMetadataCache(cacheKey, data) {
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      }),
    );
  } catch (error) {
    console.error(`Could not save ${cacheKey}`, error);
  }
}

// Sends a request with timeout and automatic retries.
async function request(endpoint, { retries = 2, timeout = 15000 } = {}) {
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
        `Pokémon TCG API request failed with status ${response.status}`,
      );

      error.status = response.status;

      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === retries) {
        throw error;
      }

      const retryAfter = Number(response.headers.get("Retry-After")) * 1000;

      const delay = Number.isFinite(retryAfter)
        ? Math.min(retryAfter, 5000)
        : 700 * 2 ** attempt;

      lastError = error;
      await wait(delay);
    } catch (error) {
      lastError = error;

      const networkError =
        error.name === "AbortError" || error instanceof TypeError;

      const retryableStatus = error.status === 429 || error.status >= 500;

      if (attempt === retries || (!networkError && !retryableStatus)) {
        throw error;
      }

      await wait(700 * 2 ** attempt);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

// Escapes Lucene search characters.
function escapeSearchValue(value) {
  return value
    .trim()
    .replace(/([+\-!(){}[\]^"~*?:\\/])/g, "\\$1")
    .replace(/\s+/g, "*");
}

// Reads metadata from cache or API.
async function getMetadata(cacheKey, endpoint) {
  const cachedData = readMetadataCache(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  if (!memoryPromises.has(cacheKey)) {
    memoryPromises.set(cacheKey, request(endpoint));
  }

  try {
    const response = await memoryPromises.get(cacheKey);

    saveMetadataCache(cacheKey, response);

    return response;
  } catch (error) {
    memoryPromises.delete(cacheKey);
    throw error;
  }
}

// Searches cards with server pagination.
export async function searchCards({
  searchTerm = "",
  type = "",
  rarity = "",
  setId = "",
  supertype = "",
  subtype = "",
  page = 1,
  pageSize = 24,
  orderBy = "name",
} = {}) {
  const queryParts = [];

  if (searchTerm.trim()) {
    const safeSearch = escapeSearchValue(searchTerm);

    queryParts.push(`name:${safeSearch}*`);
  }

  if (type) {
    queryParts.push(`types:${type}`);
  }

  if (rarity) {
    queryParts.push(`rarity:"${rarity.replaceAll('"', '\\"')}"`);
  }

  if (setId) {
    queryParts.push(`set.id:${setId}`);
  }

  if (supertype) {
    queryParts.push(`supertype:"${supertype}"`);
  }

  if (subtype) {
    queryParts.push(`subtypes:"${subtype}"`);
  }

  const parameters = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy,
    select:
      "id,name,supertype,subtypes,hp,types,number,artist,rarity,set,images,tcgplayer",
  });

  if (queryParts.length > 0) {
    parameters.set("q", queryParts.join(" "));
  }

  return request(`/cards?${parameters.toString()}`);
}

// Gets one complete card.
export async function getCard(cardId) {
  if (!cardCache.has(cardId)) {
    cardCache.set(cardId, request(`/cards/${encodeURIComponent(cardId)}`));
  }

  try {
    return await cardCache.get(cardId);
  } catch (error) {
    cardCache.delete(cardId);
    throw error;
  }
}

// Gets energy types.
export function getCardTypes() {
  return getMetadata("pocket-tcg-types", "/types");
}

// Gets card rarities.
export function getCardRarities() {
  return getMetadata("pocket-tcg-rarities", "/rarities");
}

// Gets card sets.
export function getCardSets() {
  return getMetadata(
    "pocket-tcg-sets",
    "/sets?pageSize=250&orderBy=-releaseDate",
  );
}

// Gets card supertypes.
export function getCardSupertypes() {
  return getMetadata("pocket-tcg-supertypes", "/supertypes");
}

// Gets card subtypes.
export function getCardSubtypes() {
  return getMetadata("pocket-tcg-subtypes", "/subtypes");
}
