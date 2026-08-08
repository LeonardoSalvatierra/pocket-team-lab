import { isFavoriteCard } from "../services/favorite-service.js";

import { formatCardPrice } from "../utils.js";

// Creates one reusable trading card.
export function createTcgCard(card) {
  const article = document.createElement("article");

  article.classList.add("tcg-card");

  const favorite = isFavoriteCard(card.id);

  const types =
    card.types?.length > 0
      ? card.types.join(" · ")
      : (card.supertype ?? "Card");

  article.innerHTML = `
    <button
      class="tcg-card__favorite ${favorite ? "tcg-card__favorite--active" : ""}"
      type="button"
      data-card-favorite="${card.id}"
      aria-label="${favorite ? "Remove" : "Add"} ${card.name} ${
        favorite ? "from" : "to"
      } favorites"
      aria-pressed="${favorite}"
    >
      ${favorite ? "♥" : "♡"}
    </button>

    <a
      class="tcg-card__image-link"
      href="${import.meta.env.BASE_URL}card-details/card-details.html?id=${encodeURIComponent(card.id)}"
      aria-label="View details for ${card.name}"
    >
      <img
        class="tcg-card__image"
        src="${card.images.small}"
        alt="${card.name}"
        loading="lazy"
      />
    </a>

    <div class="tcg-card__content">
      <div class="tcg-card__heading">
        <span>${card.number ?? "—"}</span>
        <h2>${card.name}</h2>
      </div>

      <p class="tcg-card__type">
        ${types}
      </p>

      <dl class="tcg-card__information">
        <div>
          <dt>Set</dt>
          <dd>${card.set?.name ?? "Unknown"}</dd>
        </div>

        <div>
          <dt>Rarity</dt>
          <dd>${card.rarity ?? "Unknown"}</dd>
        </div>

        <div>
          <dt>Market price</dt>
          <dd>${formatCardPrice(card)}</dd>
        </div>
      </dl>

      <a
        class="button button--secondary button--full"
        href="${import.meta.env.BASE_URL}card-details/card-details.html?id=${encodeURIComponent(card.id)}"
      >
        View Details
      </a>
    </div>
  `;

  return article;
}
