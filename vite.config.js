import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview === true ? "/pocket-team-lab/" : "/",

  preview: {
    open: "/pocket-team-lab/",
  },

  build: {
    rollupOptions: {
      input: {
        home: resolve(process.cwd(), "index.html"),

        cards: resolve(process.cwd(), "cards/cards.html"),

        cardDetails: resolve(process.cwd(), "card-details/card-details.html"),

        favorites: resolve(process.cwd(), "favorites/favorites.html"),

        myTeams: resolve(process.cwd(), "my-teams/my-teams.html"),

        pokemonDetails: resolve(
          process.cwd(),
          "pokemon-details/pokemon-details.html",
        ),

        teamBuilder: resolve(process.cwd(), "team-builder/team-builder.html"),
      },
    },
  },
}));
