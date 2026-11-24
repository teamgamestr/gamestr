import { describe, expect, test } from 'vitest';

import { planScoreStripMotion } from './scoreStripMotion';

function positions(entries: Record<string, number>) {
  return new Map(Object.entries(entries));
}

describe('planScoreStripMotion', () => {
  test('reports every card pushed right by a new one at the head', () => {
    const previous = positions({ b: 0, c: 252 });
    const current = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 252 },
      { id: 'c', offset: 504 },
    ];

    expect(planScoreStripMotion(previous, current)).toEqual({
      moved: [
        { id: 'b', dx: -252 },
        { id: 'c', dx: -252 },
      ],
      entering: ['a'],
    });
  });

  test('ignores cards appended at the end, such as loading more scores', () => {
    const previous = positions({ a: 0, b: 252 });
    const current = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 252 },
      { id: 'c', offset: 504 },
      { id: 'd', offset: 756 },
    ];

    expect(planScoreStripMotion(previous, current)).toEqual({ moved: [], entering: [] });
  });

  test('treats a card inserted between existing ones as entering', () => {
    const previous = positions({ a: 0, c: 252 });
    const current = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 252 },
      { id: 'c', offset: 504 },
    ];

    expect(planScoreStripMotion(previous, current)).toEqual({
      moved: [{ id: 'c', dx: -252 }],
      entering: ['b'],
    });
  });

  test('reports nothing when the strip has not moved', () => {
    const previous = positions({ a: 0, b: 252 });
    const current = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 252 },
    ];

    expect(planScoreStripMotion(previous, current)).toEqual({ moved: [], entering: [] });
  });

  test('does not animate a whole strip that arrived at once', () => {
    const current = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 252 },
    ];

    expect(planScoreStripMotion(new Map(), current)).toEqual({ moved: [], entering: [] });
  });

  test('reports the cards that moved when one drops off the end', () => {
    const previous = positions({ a: 0, b: 252, c: 504 });
    const current = [
      { id: 'b', offset: 0 },
      { id: 'c', offset: 252 },
    ];

    expect(planScoreStripMotion(previous, current)).toEqual({
      moved: [
        { id: 'b', dx: 252 },
        { id: 'c', dx: 252 },
      ],
      entering: [],
    });
  });
});
