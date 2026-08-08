// Names used to organize the application's localStorage data.
export const storageKeys = {
  currentTeam: "pocket-team-current",
  savedTeams: "pocket-team-saved",
  editingTeam: "pocket-team-editing",
  favoritePokemon: "pocket-team-favorite-pokemon",
  favoriteCards: "pocket-team-favorite-cards",
};

// Reads and converts saved JSON data from localStorage.
export function getStorage(key, fallbackValue = []) {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Could not read ${key} from localStorage`, error);

    return fallbackValue;
  }
}

// Converts a value to JSON and saves it in localStorage.
export function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Removes one saved item from localStorage.
export function removeStorage(key) {
  localStorage.removeItem(key);
}
