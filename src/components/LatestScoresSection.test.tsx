import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { LatestScoresSection } from './LatestScoresSection';
import { type ParsedScore } from '@/hooks/useScores';

vi.mock('@/hooks/useAuthor', () => ({
  useAuthor: () => ({ data: { metadata: { name: 'Tester' } } }),
}));

const CARD_WIDTH = 240;
const CARD_GAP = 12;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

interface RecordedAnimation {
  element: HTMLElement;
  keyframes: Keyframe[];
  options?: KeyframeAnimationOptions;
}

let animationId = 0;
let recorded: RecordedAnimation[] = [];
const animateMock = vi.fn(function (
  this: HTMLElement,
  keyframes: Keyframe[],
  options?: KeyframeAnimationOptions,
) {
  animationId += 1;
  recorded.push({ element: this, keyframes, options });

  return {
    id: animationId,
    cancel: vi.fn(),
    finished: Promise.resolve(),
  } as unknown as Animation;
});

beforeEach(() => {
  animateMock.mockClear();
  recorded = [];
});

beforeAll(() => {
  // jsdom has no layout engine, so the strip's geometry is faked: cards are a
  // fixed width and sit a fixed step apart in the order they are rendered.
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-score-id') ? CARD_WIDTH : 0;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      const parent = this.parentElement;
      if (!parent || !this.hasAttribute('data-score-id')) return 0;

      const cards = Array.from(parent.children).filter((child) => child.hasAttribute('data-score-id'));
      return cards.indexOf(this) * CARD_STEP;
    },
  });

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animateMock,
  });

  // jsdom has no Element.scrollTo; record the calls and mirror the offset the
  // way a browser would.
  Object.defineProperty(Element.prototype, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
      this.scrollLeft = options.left ?? 0;
    }),
  });
});

function makeScore(id: string, createdAt: number): ParsedScore {
  return {
    event: {
      id,
      pubkey: 'a'.repeat(64),
      created_at: createdAt,
      kind: 30762,
      tags: [],
      content: '',
      sig: '0'.repeat(128),
    },
    gameIdentifier: 'test-game',
    score: createdAt,
    playerPubkey: 'a'.repeat(64),
  };
}

function renderStrip(scores: ParsedScore[], props: Partial<{ isLoading: boolean; hasMoreScores: boolean }> = {}) {
  return render(
    <MemoryRouter>
      <LatestScoresSection
        scores={scores}
        gameConfig={{}}
        hasMoreScores={props.hasMoreScores ?? false}
        isLoading={props.isLoading ?? false}
        onLoadMore={() => {}}
      />
    </MemoryRouter>,
  );
}

function renderedIds(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-score-id]'))
    .map((card) => card.dataset.scoreId);
}

function animationFor(id: string) {
  return recorded.find((animation) => animation.element.dataset.scoreId === id)?.keyframes;
}

describe('LatestScoresSection', () => {
  const first = makeScore('1'.repeat(64), 3000);
  const second = makeScore('2'.repeat(64), 2000);
  const third = makeScore('3'.repeat(64), 1000);

  test('keeps the newest score first', () => {
    const { container } = renderStrip([first, second, third]);

    expect(renderedIds(container)).toEqual([first.event.id, second.event.id, third.event.id]);
    expect(screen.getAllByText('Tester')).toHaveLength(3);
  });

  test('does not animate the strip that was there on first paint', () => {
    renderStrip([first, second, third]);

    expect(animateMock).not.toHaveBeenCalled();
  });

  test('pushes the older cards right when a new score arrives', () => {
    const { container, rerender } = renderStrip([second, third]);

    rerender(
      <MemoryRouter>
        <LatestScoresSection
          scores={[first, second, third]}
          gameConfig={{}}
          hasMoreScores={false}
          isLoading={false}
          onLoadMore={() => {}}
        />
      </MemoryRouter>,
    );

    expect(renderedIds(container)).toEqual([first.event.id, second.event.id, third.event.id]);

    expect(animationFor(second.event.id)).toEqual([
      { transform: `translateX(-${CARD_STEP}px)` },
      { transform: 'translateX(0px)' },
    ]);
    expect(animationFor(third.event.id)).toEqual([
      { transform: `translateX(-${CARD_STEP}px)` },
      { transform: 'translateX(0px)' },
    ]);
  });

  test('slides the new score in from the left', () => {
    const { rerender } = renderStrip([second, third]);

    rerender(
      <MemoryRouter>
        <LatestScoresSection
          scores={[first, second, third]}
          gameConfig={{}}
          hasMoreScores={false}
          isLoading={false}
          onLoadMore={() => {}}
        />
      </MemoryRouter>,
    );

    expect(animationFor(first.event.id)).toEqual([
      { transform: `translateX(-${CARD_STEP}px)`, opacity: 0 },
      { transform: 'translateX(0px)', opacity: 1 },
    ]);
  });

  test('lets scores appended by "load more" appear without motion', () => {
    const { container, rerender } = renderStrip([first]);

    rerender(
      <MemoryRouter>
        <LatestScoresSection
          scores={[first, second, third]}
          gameConfig={{}}
          hasMoreScores={false}
          isLoading={false}
          onLoadMore={() => {}}
        />
      </MemoryRouter>,
    );

    expect(renderedIds(container)).toEqual([first.event.id, second.event.id, third.event.id]);
    expect(animateMock).not.toHaveBeenCalled();
  });

  test('holds the scroll offset so the old cards are pushed right', () => {
    const { container, rerender } = renderStrip([second, third]);
    const row = container.querySelector<HTMLElement>('[data-score-id]')!.parentElement!;

    row.scrollLeft = 584;
    act(() => {
      row.dispatchEvent(new Event('scroll'));
    });
    vi.mocked(Element.prototype.scrollTo).mockClear();

    rerender(
      <MemoryRouter>
        <LatestScoresSection
          scores={[first, second, third]}
          gameConfig={{}}
          hasMoreScores={false}
          isLoading={false}
          onLoadMore={() => {}}
        />
      </MemoryRouter>,
    );

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ left: 584, behavior: 'instant' });
  });

  test('suspends snapping while the push runs, then restores it', () => {
    vi.useFakeTimers();

    try {
      const { container, rerender } = renderStrip([second, third]);

      rerender(
        <MemoryRouter>
          <LatestScoresSection
            scores={[first, second, third]}
            gameConfig={{}}
            hasMoreScores={false}
            isLoading={false}
            onLoadMore={() => {}}
          />
        </MemoryRouter>,
      );

      const row = container.querySelector<HTMLElement>('[data-score-id]')!.parentElement!;
      expect(row.style.scrollSnapType).toBe('none');

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(row.style.scrollSnapType).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  test('restores snapping when scores arrive in quick succession', () => {
    vi.useFakeTimers();

    try {
      const { container, rerender } = renderStrip([second, third]);
      const fourth = makeScore('4'.repeat(64), 900);

      rerender(
        <MemoryRouter>
          <LatestScoresSection
            scores={[first, second, third]}
            gameConfig={{}}
            hasMoreScores={false}
            isLoading={false}
            onLoadMore={() => {}}
          />
        </MemoryRouter>,
      );

      rerender(
        <MemoryRouter>
          <LatestScoresSection
            scores={[fourth, first, second, third]}
            gameConfig={{}}
            hasMoreScores={false}
            isLoading={false}
            onLoadMore={() => {}}
          />
        </MemoryRouter>,
      );

      const row = container.querySelector<HTMLElement>('[data-score-id]')!.parentElement!;
      expect(row.style.scrollSnapType).toBe('none');

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(row.style.scrollSnapType).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  test('holds the cards still when the visitor asks for reduced motion', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = renderStrip([second, third]);

    rerender(
      <MemoryRouter>
        <LatestScoresSection
          scores={[first, second, third]}
          gameConfig={{}}
          hasMoreScores={false}
          isLoading={false}
          onLoadMore={() => {}}
        />
      </MemoryRouter>,
    );

    expect(animateMock).not.toHaveBeenCalled();

    vi.mocked(window.matchMedia).mockReset();
  });
});
