const baseUrl = "https://api.pokemontcg.io/v2";
// Sends a request to the Pokémon TCG API and returns its JSON.
async function request(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `Pokémon TCG API request failed with status ${response.status}`,
    );
  }

  return response.json();
}
// Searches for trading cards using a name and pagination.
export async function searchCards(searchTerm = "", page = 1, pageSize = 20) {
  const parameters = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy: "name",
  });

  if (searchTerm.trim()) {
    parameters.set("q", `name:${searchTerm.trim()}*`);
  }

  return request(`/cards?${parameters.toString()}`);
}
// Gets the complete information for one trading card.
export async function getCard(cardId) {
  return request(`/cards/${cardId}`);
}
