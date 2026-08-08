import {
  getStorage,
  removeStorage,
  setStorage,
  storageKeys,
} from "../storage/storage.js";

export const maximumTeamSize = 6;

// Returns the Pokémon currently being used to build a team.
export function getCurrentTeam() {
  return getStorage(storageKeys.currentTeam, []);
}

// Returns every saved team.
export function getSavedTeams() {
  return getStorage(storageKeys.savedTeams, []);
}

// Returns information about the team currently being edited.
export function getEditingTeam() {
  return getStorage(storageKeys.editingTeam, null);
}

// Removes the editing state.
export function clearEditingTeam() {
  removeStorage(storageKeys.editingTeam);
}

// Adds one Pokémon to the current team.
export function addPokemonToCurrentTeam(pokemon) {
  const currentTeam = getCurrentTeam();

  if (currentTeam.length >= maximumTeamSize) {
    return {
      success: false,
      message: "Your team already has six Pokémon.",
    };
  }

  const alreadyAdded = currentTeam.some(
    (teamPokemon) => teamPokemon.id === pokemon.id,
  );

  if (alreadyAdded) {
    return {
      success: false,
      message: "This Pokémon is already in your team.",
    };
  }

  currentTeam.push({
    ...pokemon,
    types: [...(pokemon.types ?? [])],
  });

  setStorage(storageKeys.currentTeam, currentTeam);

  return {
    success: true,
    message: `${pokemon.name} was added to the team.`,
    team: currentTeam,
  };
}

// Removes one Pokémon from the current team.
export function removePokemonFromCurrentTeam(pokemonId) {
  const currentTeam = getCurrentTeam();

  const updatedTeam = currentTeam.filter((pokemon) => pokemon.id !== pokemonId);

  setStorage(storageKeys.currentTeam, updatedTeam);

  return updatedTeam;
}

// Removes every Pokémon from the current team.
export function clearCurrentTeam() {
  removeStorage(storageKeys.currentTeam);
}

// Creates a unique ID for a new team.
function createTeamId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

// Copies the current Pokémon before saving them.
function copyCurrentTeam() {
  return getCurrentTeam().map((pokemon) => ({
    ...pokemon,
    types: [...(pokemon.types ?? [])],
  }));
}

// Checks the common team form requirements.
function validateTeam(teamName, currentTeam) {
  if (!teamName) {
    return "Please enter a name for your team.";
  }

  if (currentTeam.length === 0) {
    return "Add at least one Pokémon before saving the team.";
  }

  return "";
}

// Saves a new team.
export function saveTeam(name, { clearAfterSave = true } = {}) {
  const teamName = name.trim();
  const currentTeam = getCurrentTeam();
  const validationMessage = validateTeam(teamName, currentTeam);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const savedTeams = getSavedTeams();

  const nameAlreadyExists = savedTeams.some(
    (team) => team.name.toLowerCase() === teamName.toLowerCase(),
  );

  if (nameAlreadyExists) {
    return {
      success: false,
      message: "A saved team already uses this name.",
    };
  }

  const newTeam = {
    id: createTeamId(),
    name: teamName,
    pokemon: copyCurrentTeam(),
    createdAt: new Date().toISOString(),
  };

  savedTeams.push(newTeam);
  setStorage(storageKeys.savedTeams, savedTeams);

  if (clearAfterSave) {
    clearCurrentTeam();
  }

  clearEditingTeam();

  return {
    success: true,
    message: `"${teamName}" was saved successfully.`,
    team: newTeam,
  };
}

// Prepares a saved team for editing in Team Builder.
export function beginEditingSavedTeam(teamId) {
  const savedTeams = getSavedTeams();

  const selectedTeam = savedTeams.find((team) => team.id === teamId);

  if (!selectedTeam) {
    return {
      success: false,
      message: "The selected team could not be found.",
    };
  }

  const editablePokemon = selectedTeam.pokemon.map((pokemon) => ({
    ...pokemon,
    types: [...(pokemon.types ?? [])],
  }));

  setStorage(storageKeys.currentTeam, editablePokemon);

  setStorage(storageKeys.editingTeam, {
    id: selectedTeam.id,
    name: selectedTeam.name,
  });

  return {
    success: true,
    message: `"${selectedTeam.name}" is ready to edit.`,
    team: selectedTeam,
  };
}

// Updates an existing saved team.
export function updateSavedTeam(teamId, name) {
  const teamName = name.trim();
  const currentTeam = getCurrentTeam();
  const validationMessage = validateTeam(teamName, currentTeam);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const savedTeams = getSavedTeams();

  const selectedTeamIndex = savedTeams.findIndex((team) => team.id === teamId);

  if (selectedTeamIndex === -1) {
    return {
      success: false,
      message: "The team being edited could not be found.",
    };
  }

  const nameAlreadyExists = savedTeams.some(
    (team) =>
      team.id !== teamId && team.name.toLowerCase() === teamName.toLowerCase(),
  );

  if (nameAlreadyExists) {
    return {
      success: false,
      message: "Another saved team already uses this name.",
    };
  }

  const originalTeam = savedTeams[selectedTeamIndex];

  const updatedTeam = {
    ...originalTeam,
    name: teamName,
    pokemon: copyCurrentTeam(),
    updatedAt: new Date().toISOString(),
  };

  savedTeams[selectedTeamIndex] = updatedTeam;

  setStorage(storageKeys.savedTeams, savedTeams);

  clearCurrentTeam();
  clearEditingTeam();

  return {
    success: true,
    message: `"${teamName}" was updated successfully.`,
    team: updatedTeam,
  };
}

// Loads a saved team without editing the saved original.
export function loadSavedTeam(teamId) {
  const savedTeams = getSavedTeams();

  const selectedTeam = savedTeams.find((team) => team.id === teamId);

  if (!selectedTeam) {
    return {
      success: false,
      message: "The selected team could not be found.",
    };
  }

  const currentTeam = selectedTeam.pokemon.map((pokemon) => ({
    ...pokemon,
    types: [...(pokemon.types ?? [])],
  }));

  setStorage(storageKeys.currentTeam, currentTeam);
  clearEditingTeam();

  return {
    success: true,
    message: `"${selectedTeam.name}" is now your current team.`,
    team: selectedTeam,
  };
}

// Deletes one saved team.
export function deleteSavedTeam(teamId) {
  const savedTeams = getSavedTeams();

  const updatedTeams = savedTeams.filter((team) => team.id !== teamId);

  setStorage(storageKeys.savedTeams, updatedTeams);

  const editingTeam = getEditingTeam();

  if (editingTeam?.id === teamId) {
    clearEditingTeam();
  }

  return updatedTeams;
}
