import { getPokemonType } from "./pokemon-api-service.js";

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

// Calculates weaknesses, resistances, and immunities.
export async function getDefensiveEffectiveness(defendingTypes) {
  const typeInformation = await Promise.all(
    defendingTypes.map((typeName) => getPokemonType(typeName)),
  );

  const multipliers = Object.fromEntries(
    attackTypes.map((typeName) => [typeName, 1]),
  );

  typeInformation.forEach((typeData) => {
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

  const weaknesses = [];
  const resistances = [];
  const immunities = [];

  Object.entries(multipliers).forEach(([typeName, multiplier]) => {
    const result = {
      name: typeName,
      multiplier,
    };

    if (multiplier > 1) {
      weaknesses.push(result);
    }

    if (multiplier > 0 && multiplier < 1) {
      resistances.push(result);
    }

    if (multiplier === 0) {
      immunities.push(result);
    }
  });

  return {
    weaknesses,
    resistances,
    immunities,
  };
}
