import { loadLayout } from "../components/layout.js";

import { createStatBars } from "../components/stat-bars.js";

import { getPokemon, getPokemonType } from "../services/pokemon-api-service.js";

import {
  clearCurrentTeam,
  getCurrentTeam,
  getEditingTeam,
  maximumTeamSize,
  removePokemonFromCurrentTeam,
  saveTeam,
  updateSavedTeam,
} from "../services/team-service.js";

import { capitalize } from "../utils.js";

const pokemonDetailsCache = new Map();
const typeDetailsCache = new Map();

const attackTypes = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

let analysisRequestNumber = 0;

// Gets Pokémon details and reuses previous API results.
async function getCachedPokemon(identifier) {
  if (!pokemonDetailsCache.has(identifier)) {
    pokemonDetailsCache.set(identifier, getPokemon(identifier));
  }

  return pokemonDetailsCache.get(identifier);
}

// Gets type details and reuses previous API results.
async function getCachedType(typeName) {
  if (!typeDetailsCache.has(typeName)) {
    typeDetailsCache.set(typeName, getPokemonType(typeName));
  }

  return typeDetailsCache.get(typeName);
}

// Updates the counters after the team changes.
function updateTeamCounters(teamSize) {
  const builderCounter = document.querySelector("#builder-team-count");

  const headerCounter = document.querySelector("#header-team-count");

  if (builderCounter) {
    builderCounter.textContent = teamSize;
  }

  if (headerCounter) {
    headerCounter.textContent = `${teamSize}/${maximumTeamSize}`;
  }
}

// Creates one occupied team slot.
function createPokemonSlot(pokemon, slotNumber) {
  const types = (pokemon.types ?? [])
    .map(
      (type) => `
        <span class="team-slot__type">
          ${capitalize(type)}
        </span>
      `,
    )
    .join("");

  return `
    <article class="team-slot team-slot--filled">
      <span class="team-slot__number">
        Slot ${slotNumber}
      </span>

      <button
        class="team-slot__remove"
        type="button"
        data-remove-pokemon="${pokemon.id}"
        aria-label="Remove ${pokemon.name} from team"
        title="Remove from team"
      >
        &times;
      </button>

      <img
        class="team-slot__image"
        src="${pokemon.image}"
        alt="${capitalize(pokemon.name)}"
      />

      <h3>${capitalize(pokemon.name)}</h3>

      <div class="team-slot__types">
        ${types}
      </div>
    </article>
  `;
}

// Creates one empty slot with a clickable plus icon.
function createEmptySlot(slotNumber) {
  const explorerUrl = import.meta.env.BASE_URL;

  return `
    <article class="team-slot team-slot--empty">
      <span class="team-slot__number">
        Slot ${slotNumber}
      </span>

      <a
        class="team-slot__empty-icon"
        href="${explorerUrl}"
        aria-label="Add a Pokémon in the Explorer"
        title="Add a Pokémon"
      >
        +
      </a>

      <p>Empty slot</p>

      <a
        class="team-slot__explore"
        href="${explorerUrl}"
      >
        Add Pokémon
      </a>
    </article>
  `;
}

// Displays all six team slots.
function renderTeamSlots() {
  const slotsContainer = document.querySelector("#team-slots");

  if (!slotsContainer) {
    return;
  }

  const currentTeam = getCurrentTeam();
  const slots = [];

  for (let index = 0; index < maximumTeamSize; index += 1) {
    const pokemon = currentTeam[index];
    const slotNumber = index + 1;

    slots.push(
      pokemon
        ? createPokemonSlot(pokemon, slotNumber)
        : createEmptySlot(slotNumber),
    );
  }

  slotsContainer.innerHTML = slots.join("");
  updateTeamCounters(currentTeam.length);
}

// Counts all types represented by the team.
function getTypeCounts(team) {
  const typeCounts = {};

  team.forEach((pokemon) => {
    (pokemon.types ?? []).forEach((type) => {
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    });
  });

  return typeCounts;
}

// Displays how many Pokémon belong to each type.
function renderTypeSummary() {
  const summaryContainer = document.querySelector("#type-summary-content");

  if (!summaryContainer) {
    return;
  }

  const currentTeam = getCurrentTeam();

  if (currentTeam.length === 0) {
    summaryContainer.innerHTML = `
      <p class="placeholder-text">
        Add Pokémon to see the team type summary.
      </p>
    `;

    return;
  }

  const typeCounts = getTypeCounts(currentTeam);

  summaryContainer.innerHTML = Object.entries(typeCounts)
    .sort(([firstType], [secondType]) => firstType.localeCompare(secondType))
    .map(
      ([type, count]) => `
        <div class="type-summary__item">
          <span>${capitalize(type)}</span>
          <strong>${count}</strong>
        </div>
      `,
    )
    .join("");
}

// Reads one base stat from a PokéAPI Pokémon result.
function getStatValue(pokemon, statName) {
  return (
    pokemon.stats.find((item) => item.stat.name === statName)?.base_stat ?? 0
  );
}

// Calculates the team's average base statistics.
function calculateAverageStats(pokemonDetails) {
  const statNames = ["hp", "attack", "defense"];
  const averages = {};

  statNames.forEach((statName) => {
    const total = pokemonDetails.reduce(
      (sum, pokemon) => sum + getStatValue(pokemon, statName),
      0,
    );

    averages[statName] = total / pokemonDetails.length;
  });

  return averages;
}

// Calculates the damage multiplier for one Pokémon.
function calculateDamageMultipliers(pokemon, typeDetails) {
  const multipliers = Object.fromEntries(attackTypes.map((type) => [type, 1]));

  pokemon.types.forEach(({ type }) => {
    const typeData = typeDetails.get(type.name);

    if (!typeData) {
      return;
    }

    typeData.damage_relations.double_damage_from.forEach(({ name }) => {
      multipliers[name] *= 2;
    });

    typeData.damage_relations.half_damage_from.forEach(({ name }) => {
      multipliers[name] *= 0.5;
    });

    typeData.damage_relations.no_damage_from.forEach(({ name }) => {
      multipliers[name] = 0;
    });
  });

  return multipliers;
}

// Finds shared weaknesses and resistances.
async function calculateDefensiveCoverage(pokemonDetails) {
  const uniqueTypeNames = [
    ...new Set(
      pokemonDetails.flatMap((pokemon) =>
        pokemon.types.map(({ type }) => type.name),
      ),
    ),
  ];

  const loadedTypes = await Promise.all(
    uniqueTypeNames.map(async (typeName) => [
      typeName,
      await getCachedType(typeName),
    ]),
  );

  const typeDetails = new Map(loadedTypes);

  const weaknesses = {};
  const resistances = {};

  pokemonDetails.forEach((pokemon) => {
    const multipliers = calculateDamageMultipliers(pokemon, typeDetails);

    Object.entries(multipliers).forEach(([typeName, multiplier]) => {
      if (multiplier > 1) {
        weaknesses[typeName] ??= [];
        weaknesses[typeName].push(pokemon.name);
      }

      if (multiplier < 1) {
        resistances[typeName] ??= [];
        resistances[typeName].push(pokemon.name);
      }
    });
  });

  return {
    weaknesses,
    resistances,
  };
}

// Displays a list of defensive type results and member names.
function createCoverageList(items, emptyMessage) {
  if (items.length === 0) {
    return `
      <p class="placeholder-text">
        ${emptyMessage}
      </p>
    `;
  }

  return `
    <div class="coverage-list">
      ${items
        .map(
          ([typeName, members]) => `
            <div class="coverage-item">
              <div class="coverage-item__heading">
                <span class="coverage-item__type">
                  ${capitalize(typeName)}
                </span>

                <strong>
                  ${members.length}
                  ${members.length === 1 ? "member" : "members"}
                </strong>
              </div>

              <p class="coverage-item__names">
                ${members.map(capitalize).join(", ")}
              </p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

// Displays the team's average stats.
function renderAverageStats(averages) {
  const barsContainer = document.querySelector("#team-stat-bars");

  const summaryContainer = document.querySelector("#stat-summary");

  barsContainer.innerHTML = createStatBars(averages);

  const orderedStats = Object.entries(averages).sort(
    ([, firstValue], [, secondValue]) => secondValue - firstValue,
  );

  const strongestStat = orderedStats[0];
  const weakestStat = orderedStats[orderedStats.length - 1];

  summaryContainer.innerHTML = `
    <div class="analysis-summary__item">
      <span>Strongest average</span>
      <strong>
        ${capitalize(strongestStat[0])}
        ${Math.round(strongestStat[1])}
      </strong>
    </div>

    <div class="analysis-summary__item">
      <span>Lowest average</span>
      <strong>
        ${capitalize(weakestStat[0])}
        ${Math.round(weakestStat[1])}
      </strong>
    </div>
  `;
}

// Displays shared team weaknesses.
function renderWeaknesses(weaknesses) {
  const container = document.querySelector("#weakness-summary");

  const sharedWeaknesses = Object.entries(weaknesses)
    .filter(([, members]) => members.length >= 2)
    .sort(
      ([, firstMembers], [, secondMembers]) =>
        secondMembers.length - firstMembers.length,
    );

  container.innerHTML = createCoverageList(
    sharedWeaknesses,
    "No shared weaknesses were found.",
  );
}

// Creates simple team balance suggestions.
function renderBalance(team, averages, coverage) {
  const container = document.querySelector("#balance-summary");

  const typeCount = Object.keys(getTypeCounts(team)).length;

  const seriousWeaknesses = Object.entries(coverage.weaknesses)
    .filter(([, members]) => members.length >= 3)
    .sort(
      ([, firstMembers], [, secondMembers]) =>
        secondMembers.length - firstMembers.length,
    );

  const warnings = [];

  if (team.length < maximumTeamSize) {
    warnings.push(
      `${maximumTeamSize - team.length} team slots are still empty.`,
    );
  }

  if (typeCount < 4 && team.length >= 3) {
    warnings.push("The team has limited type diversity.");
  }

  seriousWeaknesses.forEach(([typeName, members]) => {
    warnings.push(
      `${members.length} members are weak to ${capitalize(typeName)}: ` +
        `${members.map(capitalize).join(", ")}.`,
    );
  });

  const statValues = Object.values(averages);
  const statDifference = Math.max(...statValues) - Math.min(...statValues);

  if (statDifference >= 40) {
    warnings.push("The team's main base stats are uneven.");
  }

  const strongestResistances = Object.entries(coverage.resistances)
    .sort(
      ([, firstMembers], [, secondMembers]) =>
        secondMembers.length - firstMembers.length,
    )
    .slice(0, 3);

  container.innerHTML = `
    <div class="balance-overview">
      <div>
        <span>Team size</span>
        <strong>${team.length}/${maximumTeamSize}</strong>
      </div>

      <div>
        <span>Different types</span>
        <strong>${typeCount}</strong>
      </div>
    </div>

    <h4>Best resistances</h4>

    ${createCoverageList(
      strongestResistances,
      "No resistance information available.",
    )}

    <h4>Suggestions</h4>

    ${
      warnings.length > 0
        ? `
          <ul class="analysis-warnings">
            ${warnings.map((warning) => `<li>${warning}</li>`).join("")}
          </ul>
        `
        : `
          <p class="analysis-success">
            The team has good basic balance and coverage.
          </p>
        `
    }
  `;
}

// Resets all analysis panels.
function renderEmptyAnalysis() {
  document.querySelector("#analysis-status").textContent =
    "Add Pokémon to analyze your team.";

  document.querySelector("#team-stat-bars").innerHTML = `
    <p class="placeholder-text">
      No statistics available yet.
    </p>
  `;

  document.querySelector("#stat-summary").innerHTML = "";

  document.querySelector("#weakness-summary").innerHTML = `
    <p class="placeholder-text">
      No weaknesses available yet.
    </p>
  `;

  document.querySelector("#balance-summary").innerHTML = `
    <p class="placeholder-text">
      No balance information available yet.
    </p>
  `;
}

// Loads complete API information and analyzes the team.
async function renderTeamAnalysis() {
  const requestNumber = ++analysisRequestNumber;
  const currentTeam = getCurrentTeam();
  const status = document.querySelector("#analysis-status");

  if (currentTeam.length === 0) {
    renderEmptyAnalysis();
    return;
  }

  status.textContent = "Analyzing team...";

  try {
    const pokemonDetails = await Promise.all(
      currentTeam.map((pokemon) => getCachedPokemon(pokemon.id)),
    );

    const averages = calculateAverageStats(pokemonDetails);

    const coverage = await calculateDefensiveCoverage(pokemonDetails);

    if (requestNumber !== analysisRequestNumber) {
      return;
    }

    renderAverageStats(averages);
    renderWeaknesses(coverage.weaknesses);

    renderBalance(currentTeam, averages, coverage);

    status.textContent = `${currentTeam.length} Pokémon analyzed`;
  } catch (error) {
    console.error("Team analysis error:", error);

    if (requestNumber !== analysisRequestNumber) {
      return;
    }

    status.textContent = "The analysis could not be loaded.";

    document.querySelector("#team-stat-bars").innerHTML = `
      <p class="error-message">
        PokéAPI information is temporarily unavailable.
      </p>
    `;
  }
}

// Displays validation and success messages.
function showTeamMessage(message, messageType = "") {
  const messageElement = document.querySelector("#team-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = "team-message";

  if (messageType) {
    messageElement.classList.add(`team-message--${messageType}`);
  }
}

// Prepares the form when editing an existing team.
function configureEditingMode() {
  const editingTeam = getEditingTeam();

  if (!editingTeam) {
    return;
  }

  const teamNameInput = document.querySelector("#team-name");

  const saveButton = document.querySelector("#save-team-button");

  const editingNotice = document.querySelector("#editing-team-notice");

  teamNameInput.value = editingTeam.name;
  saveButton.textContent = "Update Team";

  editingNotice.hidden = false;
  editingNotice.textContent = `Editing "${editingTeam.name}"`;
}

// Removes one Pokémon and refreshes the page.
function removePokemonFromTeam(pokemonId) {
  removePokemonFromCurrentTeam(pokemonId);

  renderTeamSlots();
  renderTypeSummary();
  renderTeamAnalysis();

  showTeamMessage("Pokémon removed from the current team.");
}

// Clears the current team after confirmation.
function confirmClearCurrentTeam() {
  const currentTeam = getCurrentTeam();

  if (currentTeam.length === 0) {
    showTeamMessage("The current team is already empty.");

    return;
  }

  const shouldClear = window.confirm(
    "Remove every Pokémon from the current team?",
  );

  if (!shouldClear) {
    return;
  }

  clearCurrentTeam();

  renderTeamSlots();
  renderTypeSummary();
  renderTeamAnalysis();

  showTeamMessage("The current team was cleared.");
}

// Saves a new team or updates an existing team.
function handleTeamSubmission(event) {
  event.preventDefault();

  const teamNameInput = document.querySelector("#team-name");

  const editingTeam = getEditingTeam();

  const result = editingTeam
    ? updateSavedTeam(editingTeam.id, teamNameInput.value)
    : saveTeam(teamNameInput.value);

  showTeamMessage(result.message, result.success ? "success" : "error");

  if (!result.success) {
    teamNameInput.focus();
    return;
  }

  renderTeamSlots();
  renderTypeSummary();
  renderTeamAnalysis();

  window.setTimeout(() => {
    window.location.href =
      `${import.meta.env.BASE_URL}` + "my-teams/my-teams.html";
  }, 800);
}

// Connects Team Builder controls.
function addTeamBuilderListeners() {
  const slotsContainer = document.querySelector("#team-slots");

  const clearButton = document.querySelector("#clear-team");

  const saveForm = document.querySelector("#save-team-form");

  slotsContainer?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-pokemon]");

    if (!removeButton) {
      return;
    }

    removePokemonFromTeam(Number(removeButton.dataset.removePokemon));
  });

  clearButton?.addEventListener("click", confirmClearCurrentTeam);

  saveForm?.addEventListener("submit", handleTeamSubmission);
}

// Loads the layout and starts Team Builder.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();

  configureEditingMode();
  renderTeamSlots();
  renderTypeSummary();
  addTeamBuilderListeners();

  await renderTeamAnalysis();
});
