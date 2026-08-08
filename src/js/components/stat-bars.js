export const maximumBaseStat = 255;

const statSettings = {
  hp: {
    label: "HP",
    colorClass: "stat-bar--hp",
  },
  attack: {
    label: "ATK",
    colorClass: "stat-bar--attack",
  },
  defense: {
    label: "DEF",
    colorClass: "stat-bar--defense",
  },
};

// Keeps a bar percentage between zero and one hundred.
function calculatePercentage(value, maximum) {
  const percentage = (value / maximum) * 100;

  return Math.min(Math.max(percentage, 0), 100);
}

// Creates reusable stat bars for teams and individual Pokémon.
export function createStatBars(
  stats,
  statNames = ["hp", "attack", "defense"],
  maximum = maximumBaseStat,
) {
  const bars = statNames
    .map((statName) => {
      const settings = statSettings[statName];

      if (!settings) {
        return "";
      }

      const value = Math.round(stats[statName] ?? 0);
      const percentage = calculatePercentage(value, maximum);

      return `
        <div class="stat-bar ${settings.colorClass}">
          <div class="stat-bar__heading">
            <span>${settings.label}</span>
            <strong>${value}</strong>
          </div>

          <div
            class="stat-bar__track"
            role="progressbar"
            aria-label="${settings.label}"
            aria-valuemin="0"
            aria-valuemax="${maximum}"
            aria-valuenow="${value}"
          >
            <span
              class="stat-bar__fill"
              style="width: ${percentage}%"
            ></span>
          </div>
        </div>
      `;
    })
    .join("");

  return `<div class="stat-bars">${bars}</div>`;
}
