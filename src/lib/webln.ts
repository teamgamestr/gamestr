/**
 * Resolving a usable WebLN provider.
 *
 * `window.webln` is not one shape. Some extensions inject the whole API up
 * front; others inject a stub carrying only `enable()`, and that call returns
 * the real provider — or resolves to `void`, or to `true`. Swapping in whatever
 * `enable()` resolved to and calling `sendPayment` on it produces
 * "sendPayment is not a function" from inside minified code: an error that
 * names nothing the user can act on and reads like the wallet is broken.
 *
 * So the value that comes back is only trusted if it is an object that can
 * actually pay, and a provider that cannot is reported as such — naming the
 * methods it does expose, which is the one detail worth having when a
 * particular extension misbehaves.
 */
import type { WebLNProvider } from '@webbtc/webln-types';

/** Raised when the browser's WebLN provider cannot be asked to pay at all. */
export class WebLnUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebLnUnavailableError';
  }
}

/** Whether a value is a WebLN provider that can actually send a payment. */
export function canPayWithWebLn(value: unknown): value is WebLNProvider {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as WebLNProvider).sendPayment === 'function'
  );
}

/** Names of the callable properties a provider exposes, for diagnostics. */
function providerMethods(provider: unknown): string {
  if (!provider || typeof provider !== 'object') return `a ${typeof provider}`;

  const names = new Set<string>();
  for (let proto: object | null = provider; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const key of Object.getOwnPropertyNames(proto)) names.add(key);
  }

  const methods = [...names]
    .filter((name) => typeof (provider as Record<string, unknown>)[name] === 'function')
    .sort();

  return methods.length > 0 ? methods.map((name) => `${name}()`).join(', ') : 'no methods';
}

/**
 * Get a provider that can send payments, enabling it first when it asks to be.
 *
 * Throws {@link WebLnUnavailableError} — never a TypeError from inside the
 * call site — when nothing present can pay.
 */
export async function resolveWebLnProvider(webln: WebLNProvider | null): Promise<WebLNProvider> {
  if (!webln) {
    throw new WebLnUnavailableError('No WebLN provider is present in this browser.');
  }

  let provider: unknown = webln;
  if (typeof webln.enable === 'function') {
    const enabled = await webln.enable();
    // Some return themselves, some a new object, some `true` or nothing. Only
    // an object that can pay is worth swapping in.
    if (canPayWithWebLn(enabled)) provider = enabled;
  }

  if (!canPayWithWebLn(provider)) {
    throw new WebLnUnavailableError(
      `This browser's WebLN provider cannot send payments — it exposes ${providerMethods(provider)} ` +
      'and no sendPayment(). Use the QR code, or a wallet extension that implements WebLN.',
    );
  }

  return provider;
}
