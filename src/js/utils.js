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
