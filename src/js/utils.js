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
// Displays an error and optionally provides a retry button.
export function showError(
  container,
  message,
  { retryLabel = "Try Again", onRetry = null } = {},
) {
  if (!container) {
    return;
  }

  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.setAttribute("role", "alert");

  const messageElement = document.createElement("p");
  messageElement.textContent = message;

  errorElement.appendChild(messageElement);

  if (typeof onRetry === "function") {
    const retryButton = document.createElement("button");

    retryButton.className = "button button--primary error-message__retry";
    retryButton.type = "button";
    retryButton.textContent = retryLabel;

    retryButton.addEventListener("click", async () => {
      retryButton.disabled = true;
      retryButton.textContent = "Retrying...";

      try {
        await onRetry();
      } finally {
        if (retryButton.isConnected) {
          retryButton.disabled = false;
          retryButton.textContent = retryLabel;
        }
      }
    });

    errorElement.appendChild(retryButton);
  }

  container.replaceChildren(errorElement);
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
