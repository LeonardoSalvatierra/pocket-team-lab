const baseUrl = "https://api.pokemontcg.io/v2";

const metadataDuration = 30 * 24 * 60 * 60 * 1000;
const cardResultFreshDuration = 30 * 60 * 1000;
const cardResultStaleDuration = 7 * 24 * 60 * 60 * 1000;

const cardResultStorageKey = "pocket-tcg-card-results";
const maximumCachedResults = 6;

const activeRequests = new Map();
const memoryPromises = new Map();
const cardCache = new Map();

const fallbackTypes = [
  "Colorless",
  "Darkness",
  "Dragon",
  "Fairy",
  "Fighting",
  "Fire",
  "Grass",
  "Lightning",
  "Metal",
  "Psychic",
  "Water",
];

const fallbackSupertypes = ["Energy", "Pokémon", "Trainer"];

const fallbackSubtypes = [
  "Basic",
  "Stage 1",
  "Stage 2",
  "Item",
  "Supporter",
  "Stadium",
  "Tool",
  "Special",
  "Technical Machine",
  "EX",
  "GX",
  "V",
  "VMAX",
  "VSTAR",
  "Radiant",
  "ACE SPEC",
];

const fallbackRarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Ultra",
  "Rare Secret",
  "Rare Rainbow",
  "Rare Shiny",
  "Rare Shining",
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
  "Promo",
];

// Waits before retrying a failed request.
function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

// Sends one API request with timeout and retries.
async function performRequest(endpoint, { retries = 2, timeout = 25000 } = {}) {
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

      const retryAfterHeader = response.headers.get("Retry-After");

      const retryAfter = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : null;

      const delay =
        typeof retryAfter === "number" &&
        Number.isFinite(retryAfter) &&
        retryAfter > 0
          ? Math.min(retryAfter, 12000)
          : Math.min(1200 * 2 ** attempt, 8000);

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

      await wait(Math.min(1200 * 2 ** attempt, 8000));
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

// Prevents identical requests from running simultaneously.
function request(endpoint, options = {}) {
  if (activeRequests.has(endpoint)) {
    return activeRequests.get(endpoint);
  }

  const requestPromise = performRequest(endpoint, options).finally(() => {
    activeRequests.delete(endpoint);
  });

  activeRequests.set(endpoint, requestPromise);

  return requestPromise;
}

// Reads metadata and supports both old and new cache formats.
function readMetadataCache(cacheKey) {
  try {
    const storedValue = localStorage.getItem(cacheKey);

    if (!storedValue) {
      return null;
    }

    const cachedInformation = JSON.parse(storedValue);

    const cachedData = Array.isArray(cachedInformation.data)
      ? cachedInformation.data
      : cachedInformation.data?.data;

    if (!Array.isArray(cachedData)) {
      localStorage.removeItem(cacheKey);

      return null;
    }

    return {
      data: cachedData,
      expired: Date.now() - cachedInformation.savedAt > metadataDuration,
    };
  } catch (error) {
    console.error(`Could not read ${cacheKey}`, error);

    localStorage.removeItem(cacheKey);

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

// Reads all cached card result pages.
function readCardResultCache() {
  try {
    const storedValue = localStorage.getItem(cardResultStorageKey);

    if (!storedValue) {
      return [];
    }

    const entries = JSON.parse(storedValue);

    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error("Could not read cached trading cards.", error);

    return [];
  }
}

// Saves one card result page and removes older entries.
function saveCardResultCache(endpoint, response) {
  try {
    const previousEntries = readCardResultCache().filter(
      (entry) => entry.endpoint !== endpoint,
    );

    previousEntries.unshift({
      endpoint,
      savedAt: Date.now(),
      response,
    });

    localStorage.setItem(
      cardResultStorageKey,
      JSON.stringify(previousEntries.slice(0, maximumCachedResults)),
    );
  } catch (error) {
    console.error("Could not cache trading cards.", error);
  }
}

// Finds one cached card result page.
function findCachedCardResult(endpoint) {
  const entry = readCardResultCache().find(
    (cachedEntry) => cachedEntry.endpoint === endpoint,
  );

  if (!entry) {
    return null;
  }

  return {
    ...entry,
    age: Date.now() - entry.savedAt,
  };
}

// Requests cards while using fresh and stale cache safely.
async function requestCardResults(endpoint) {
  const cachedResult = findCachedCardResult(endpoint);

  if (cachedResult && cachedResult.age <= cardResultFreshDuration) {
    return {
      ...cachedResult.response,
      cacheStatus: "fresh",
    };
  }

  try {
    const response = await request(endpoint);

    saveCardResultCache(endpoint, response);

    return {
      ...response,
      cacheStatus: "network",
    };
  } catch (error) {
    if (cachedResult && cachedResult.age <= cardResultStaleDuration) {
      return {
        ...cachedResult.response,
        cacheStatus: "stale",
      };
    }

    throw error;
  }
}

// Escapes Lucene search characters.
function escapeSearchValue(value) {
  return value
    .trim()
    .replace(/([+\-!(){}[\]^"~*?:\\/])/g, "\\$1")
    .replace(/\s+/g, "*");
}

// Reads metadata from cache, API, or local fallback values.
async function getMetadata(cacheKey, endpoint, fallbackData = []) {
  const cachedInformation = readMetadataCache(cacheKey);

  if (cachedInformation && !cachedInformation.expired) {
    return {
      data: cachedInformation.data,
      source: "cache",
    };
  }

  if (!memoryPromises.has(cacheKey)) {
    memoryPromises.set(cacheKey, request(endpoint));
  }

  try {
    const response = await memoryPromises.get(cacheKey);

    saveMetadataCache(cacheKey, response.data);

    return {
      data: response.data,
      source: "network",
    };
  } catch {
    memoryPromises.delete(cacheKey);

    if (cachedInformation?.data?.length > 0) {
      return {
        data: cachedInformation.data,
        source: "stale",
      };
    }

    return {
      data: fallbackData,
      source: fallbackData.length > 0 ? "fallback" : "unavailable",
    };
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

  return requestCardResults(`/cards?${parameters.toString()}`);
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

// Gets energy types with local fallback options.
export function getCardTypes() {
  return getMetadata("pocket-tcg-types", "/types", fallbackTypes);
}

// Gets card rarities with local fallback options.
export function getCardRarities() {
  return getMetadata("pocket-tcg-rarities", "/rarities", fallbackRarities);
}

// Gets card sets and reuses expired cache if necessary.
export function getCardSets() {
  return getMetadata(
    "pocket-tcg-sets",
    "/sets?pageSize=250&orderBy=-releaseDate",
    [],
  );
}

// Gets card supertypes with local fallback options.
export function getCardSupertypes() {
  return getMetadata(
    "pocket-tcg-supertypes",
    "/supertypes",
    fallbackSupertypes,
  );
}

// Gets card subtypes with local fallback options.
export function getCardSubtypes() {
  return getMetadata("pocket-tcg-subtypes", "/subtypes", fallbackSubtypes);
}
