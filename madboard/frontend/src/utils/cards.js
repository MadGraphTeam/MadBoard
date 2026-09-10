// A process directory holds a handful of cards that are actually used next to
// a dozen untouched templates ("*_default.*") and the cards MadGraph has
// switched off by prefixing them with a dot. Only the first group is of
// interest most of the time.
export function isTemplate(cardName) {
  return cardName.startsWith(".") || /_default\.[^.]+$/.test(cardName);
}

/** Name of the template a card can be reset to, e.g. run_card_default.toml */
export function defaultCardName(cardName) {
  const dot = cardName.lastIndexOf(".");
  if (dot <= 0) return `${cardName}_default`;
  return `${cardName.slice(0, dot)}_default${cardName.slice(dot)}`;
}
