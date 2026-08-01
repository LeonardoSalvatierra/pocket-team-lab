const baseUrl = "https://pokeapi.co/api/v2";
// Sends a request to PokéAPI and returns the JSON response.
async function request(endpoint) {
    const response = await fetch(`${baseUrl}${endpoint}`);

    if (!response.ok) {
        throw new Error(
            `PokéAPI request failed with status ${response.status}`
        );
    }

    return response.json();
}
// Gets one page of Pokémon names using a limit and offset.
export async function getPokemonList(limit = 24, offset = 0) {
    return request(`/pokemon?limit=${limit}&offset=${offset}`);
}
// Gets the complete information for one Pokémon.
export async function getPokemon(identifier) {
    const formattedIdentifier = identifier
        .toString()
        .trim()
        .toLowerCase();

    return request(`/pokemon/${formattedIdentifier}`);
}
// Gets species information such as descriptions and evolution data.
export async function getPokemonSpecies(identifier) {
    const formattedIdentifier = identifier
        .toString()
        .trim()
        .toLowerCase();

    return request(`/pokemon-species/${formattedIdentifier}`);
}
// Gets information about one Pokémon type.
export async function getPokemonType(identifier) {
    const formattedIdentifier = identifier
        .toString()
        .trim()
        .toLowerCase();

    return request(`/type/${formattedIdentifier}`);
}
// Gets the Pokémon that belong to a specific generation.
export async function getGeneration(identifier) {
    return request(`/generation/${identifier}`);
}