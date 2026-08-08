// Changes the first letter of a word to uppercase.
export function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
// Formats a Pokémon number with four digits.
export function formatPokemonNumber(number) {
  return `#${number.toString().padStart(4, "0")}`;
}
// Reads one parameter from the current page URL.
export function getQueryParameter(parameterName) {
  const parameters = new URLSearchParams(window.location.search);
  return parameters.get(parameterName);
}
// Displays an error message inside the selected container.
export function showError(container, message) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="error-message" role="alert">
      <p>${message}</p>
    </div>
  `;
}
// Finds the lowest available market price for one card.
export function getCardMarketPrice(card) {
  if (typeof card.marketPrice === "number") {
    return card.marketPrice;
  }

  const priceGroups = Object.values(card.tcgplayer?.prices ?? {});

  const availablePrices = priceGroups
    .map((prices) => prices.market ?? prices.mid ?? prices.low ?? null)
    .filter((price) => typeof price === "number");

  if (availablePrices.length === 0) {
    return null;
  }

  return Math.min(...availablePrices);
}

// Formats a card price or returns a fallback.
export function formatCardPrice(card) {
  const price = getCardMarketPrice(card);

  return price === null ? "Not available" : `From $${price.toFixed(2)}`;
}
