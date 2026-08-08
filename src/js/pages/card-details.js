import { loadLayout } from "../components/layout.js";

import {
  isFavoriteCard,
  toggleFavoriteCard,
} from "../services/favorite-service.js";

import { getCard } from "../services/tcg-api-service.js";

import {
  formatCardPrice,
  getCardMarketPrice,
  getQueryParameter,
} from "../utils.js";

// Safely prepares API text before inserting it into HTML.
function escapeHtml(value) {
  const element = document.createElement("div");

  element.textContent = value ?? "";

  return element.innerHTML;
}

// Converts a list into readable text.
function formatList(items, fallback = "Not available") {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback;
  }

  return items.join(" · ");
}

// Creates small badges for a list of values.
function createBadges(items, fallback = "Not available") {
  if (!Array.isArray(items) || items.length === 0) {
    return `<span class="card-detail-badge">${fallback}</span>`;
  }

  return items
    .map(
      (item) => `
        <span class="card-detail-badge">
          ${escapeHtml(item)}
        </span>
      `,
    )
    .join("");
}

// Creates the card attacks.
function createAttacks(card) {
  if (!Array.isArray(card.attacks) || card.attacks.length === 0) {
    return `
      <p class="card-detail-placeholder">
        This card does not have attack information.
      </p>
    `;
  }

  return card.attacks
    .map(
      (attack) => `
        <article class="card-attack">
          <div class="card-attack__heading">
            <div>
              <h3>${escapeHtml(attack.name)}</h3>

              <p class="card-attack__cost">
                ${createBadges(attack.cost, "No energy cost")}
              </p>
            </div>

            <strong>
              ${escapeHtml(attack.damage || "—")}
            </strong>
          </div>

          ${
            attack.text
              ? `
                <p>
                  ${escapeHtml(attack.text)}
                </p>
              `
              : ""
          }
        </article>
      `,
    )
    .join("");
}

// Creates the card rules.
function createRules(card) {
  if (!Array.isArray(card.rules) || card.rules.length === 0) {
    return `
      <p class="card-detail-placeholder">
        No special rules are listed for this card.
      </p>
    `;
  }

  return card.rules
    .map(
      (rule) => `
        <li>${escapeHtml(rule)}</li>
      `,
    )
    .join("");
}

// Creates weakness and resistance information.
function createTypeEffectiveness(items, fallback) {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <span class="card-detail-placeholder">
        ${fallback}
      </span>
    `;
  }

  return items
    .map(
      (item) => `
        <span class="card-effectiveness">
          ${escapeHtml(item.type)}

          <strong>
            ${escapeHtml(item.value)}
          </strong>
        </span>
      `,
    )
    .join("");
}

// Creates available market-price rows.
function createMarketPrices(card) {
  const priceGroups = Object.entries(card.tcgplayer?.prices ?? {});

  if (priceGroups.length === 0) {
    return `
      <p class="card-detail-placeholder">
        Market prices are not currently available.
      </p>
    `;
  }

  return priceGroups
    .map(([variant, prices]) => {
      const price = prices.market ?? prices.mid ?? prices.low ?? null;

      return `
        <div class="card-price-row">
          <span>${escapeHtml(variant.replaceAll("-", " "))}</span>

          <strong>
            ${typeof price === "number" ? `$${price.toFixed(2)}` : "Unavailable"}
          </strong>
        </div>
      `;
    })
    .join("");
}

// Updates the favorite button after adding or removing the card.
function updateFavoriteButton(cardId) {
  const button = document.querySelector("#card-favorite-button");

  if (!button) {
    return;
  }

  const favorite = isFavoriteCard(cardId);

  button.classList.toggle("card-detail-action--favorite", favorite);

  button.textContent = favorite ? "♥ Saved to Favorites" : "♡ Add to Favorites";

  button.setAttribute("aria-pressed", favorite.toString());
}

// Displays feedback after a card action.
function showActionMessage(message) {
  const messageElement = document.querySelector("#card-action-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
}

// Creates all the information on the card details page.
function renderCardDetails(card) {
  const container = document.querySelector("#card-details");

  const marketPrice = getCardMarketPrice(card);

  container.innerHTML = `
    <article class="card-detail">
      <section class="card-detail__hero">
        <div class="card-detail__image-panel">
          <span class="card-detail__number">
            ${escapeHtml(card.number ?? "Unknown number")}
          </span>

          <img
            src="${card.images?.large ?? card.images?.small ?? ""}"
            alt="${escapeHtml(card.name)}"
          />
        </div>

        <div class="card-detail__introduction">
          <p class="card-detail__category">
            ${escapeHtml(card.supertype ?? "Trading Card")}
          </p>

          <h1>${escapeHtml(card.name)}</h1>

          <div class="card-detail__badges">
            ${createBadges(card.types ?? card.subtypes)}
          </div>

          ${
            card.flavorText
              ? `
                <p class="card-detail__description">
                  ${escapeHtml(card.flavorText)}
                </p>
              `
              : ""
          }

          <div class="card-detail__actions">
            <button
              id="card-favorite-button"
              class="card-detail-action card-detail-action--primary"
              type="button"
              aria-pressed="false"
            >
              ♡ Add to Favorites
            </button>

            <a
              class="card-detail-action"
              href="${import.meta.env.BASE_URL}cards/cards.html"
            >
              Back to Trading Cards
            </a>
          </div>

          <p
            id="card-action-message"
            class="card-action-message"
            aria-live="polite"
          ></p>

          <dl class="card-basic-information">
            <div>
              <dt>Set</dt>
              <dd>${escapeHtml(card.set?.name ?? "Unknown")}</dd>
            </div>

            <div>
              <dt>Rarity</dt>
              <dd>${escapeHtml(card.rarity ?? "Unknown")}</dd>
            </div>

            <div>
              <dt>HP</dt>
              <dd>${escapeHtml(card.hp ?? "—")}</dd>
            </div>

            <div>
              <dt>Artist</dt>
              <dd>${escapeHtml(card.artist ?? "Unknown")}</dd>
            </div>

            <div>
              <dt>Card number</dt>
              <dd>
                ${escapeHtml(card.number ?? "—")}
                ${
                  card.set?.printedTotal
                    ? ` / ${escapeHtml(card.set.printedTotal)}`
                    : ""
                }
              </dd>
            </div>

            <div>
              <dt>Market price</dt>
              <dd>
                ${
                  marketPrice === null ? "Not available" : formatCardPrice(card)
                }
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div class="card-detail__content">
        <div class="card-detail__column">
          <section class="panel card-detail-section">
            <div class="card-detail-heading">
              <div>
                <p>Battle information</p>
                <h2>Attacks</h2>
              </div>
            </div>

            <div class="card-attacks">
              ${createAttacks(card)}
            </div>
          </section>

          <section class="panel card-detail-section">
            <div class="card-detail-heading">
              <div>
                <p>Card text</p>
                <h2>Rules</h2>
              </div>
            </div>

            <ul class="card-rules">
              ${createRules(card)}
            </ul>
          </section>
        </div>

        <div class="card-detail__column">
          <section class="panel card-detail-section">
            <div class="card-detail-heading">
              <div>
                <p>Defense</p>
                <h2>Battle Characteristics</h2>
              </div>
            </div>

            <div class="card-characteristic">
              <h3>Weaknesses</h3>

              <div>
                ${createTypeEffectiveness(
                  card.weaknesses,
                  "No weakness listed",
                )}
              </div>
            </div>

            <div class="card-characteristic">
              <h3>Resistances</h3>

              <div>
                ${createTypeEffectiveness(
                  card.resistances,
                  "No resistance listed",
                )}
              </div>
            </div>

            <div class="card-characteristic">
              <h3>Retreat Cost</h3>

              <div>
                ${createBadges(card.retreatCost, "No retreat cost")}
              </div>
            </div>
          </section>

          <section class="panel card-detail-section">
            <div class="card-detail-heading">
              <div>
                <p>Collection</p>
                <h2>Card Information</h2>
              </div>
            </div>

            <dl class="card-collection-information">
              <div>
                <dt>Set</dt>
                <dd>${escapeHtml(card.set?.name ?? "Unknown")}</dd>
              </div>

              <div>
                <dt>Series</dt>
                <dd>${escapeHtml(card.set?.series ?? "Unknown")}</dd>
              </div>

              <div>
                <dt>Release date</dt>
                <dd>${escapeHtml(card.set?.releaseDate ?? "Unknown")}</dd>
              </div>

              <div>
                <dt>Pokédex number</dt>
                <dd>
                  ${escapeHtml(
                    formatList(card.nationalPokedexNumbers, "Not available"),
                  )}
                </dd>
              </div>

              <div>
                <dt>Regulation mark</dt>
                <dd>${escapeHtml(card.regulationMark ?? "Not available")}</dd>
              </div>

              <div>
                <dt>Legalities</dt>
                <dd>
                  ${
                    card.legalities
                      ? escapeHtml(
                          Object.entries(card.legalities)
                            .map(([format, status]) => `${format}: ${status}`)
                            .join(" · "),
                        )
                      : "Not available"
                  }
                </dd>
              </div>
            </dl>
          </section>

          <section class="panel card-detail-section">
            <div class="card-detail-heading">
              <div>
                <p>TCGPlayer</p>
                <h2>Market Prices</h2>
              </div>
            </div>

            <div class="card-market-prices">
              ${createMarketPrices(card)}
            </div>

            ${
              card.tcgplayer?.url
                ? `
                  <a
                    class="button button--secondary button--full"
                    href="${card.tcgplayer.url}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on TCGPlayer
                  </a>
                `
                : ""
            }
          </section>
        </div>
      </div>
    </article>
  `;

  document.title = `${card.name} | Pocket Team Lab`;

  updateFavoriteButton(card.id);

  document
    .querySelector("#card-favorite-button")
    .addEventListener("click", () => {
      const result = toggleFavoriteCard(card);

      updateFavoriteButton(card.id);
      showActionMessage(result.message);
    });
}

// Displays an error with an option to retry.
function renderCardError(message) {
  const container = document.querySelector("#card-details");

  container.innerHTML = `
    <div class="card-details-error" role="alert">
      <h1>Card information unavailable</h1>

      <p>${escapeHtml(message)}</p>

      <button
        id="retry-card-button"
        class="button button--primary"
        type="button"
      >
        Try Again
      </button>
    </div>
  `;

  document
    .querySelector("#retry-card-button")
    .addEventListener("click", loadSelectedCard);
}

// Loads the selected card from the API.
async function loadSelectedCard() {
  const cardId = getQueryParameter("id");

  if (!cardId) {
    renderCardError("No trading card was selected.");
    return;
  }

  try {
    const response = await getCard(cardId);

    renderCardDetails(response.data);
  } catch (error) {
    console.error("Card details loading error:", error);

    renderCardError(
      "The card could not be loaded. Please check your connection and try again.",
    );
  }
}

// Loads the shared layout and starts Card Details.
document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  await loadSelectedCard();
});
