export interface StripCardPosition {
  id: string;
  /** Layout position of the card inside the strip, ignoring scrolling. */
  offset: number;
}

export interface ScoreStripMotion {
  /** Cards already on screen that changed slot, with the distance they came from. */
  moved: Array<{ id: string; dx: number }>;
  /** Cards that were not on screen before and were inserted ahead of the existing ones. */
  entering: string[];
}

/**
 * Compare two passes of the Latest Scores strip to work out which cards have
 * to travel. `dx` is measured from the card's previous slot, so a negative
 * value means the layout pushed it to the right.
 *
 * A card that was not there before only counts as entering when an existing
 * card follows it: cards appended at the end (the "load more" chevron) have
 * not displaced anything and should just appear.
 */
export function planScoreStripMotion(
  previous: ReadonlyMap<string, number>,
  current: readonly StripCardPosition[],
): ScoreStripMotion {
  const moved: ScoreStripMotion['moved'] = [];
  const entering: ScoreStripMotion['entering'] = [];
  const lastKnownIndex = current.reduce(
    (last, card, index) => (previous.has(card.id) ? index : last),
    -1,
  );

  current.forEach((card, index) => {
    const before = previous.get(card.id);

    if (before === undefined) {
      if (index < lastKnownIndex) entering.push(card.id);
      return;
    }

    const dx = before - card.offset;
    if (dx !== 0) moved.push({ id: card.id, dx });
  });

  return { moved, entering };
}
