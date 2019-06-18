import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 * Prevent calls `window.open` when URL match or not match with passed params
 * @param {Source} source
 * @param {number|string} [inverse] inverse matching
 * @param {string} [match] matching with URL
 */
export function preventWindowOpen(source, inverse, match) {
    const nativeOpen = window.open;

    inverse = inverse
        ? !(+inverse)
        : !!inverse;
    match = match
        ? toRegExp(match)
        : toRegExp('/.?/');

    // eslint-disable-next-line consistent-return
    const openWrapper = (str, ...args) => {
        if (inverse === match.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }
        hit(source);
    };
    window.open = openWrapper;
}

preventWindowOpen.names = [
    'prevent-window-open',
    'ubo-window.open-defuser.js',
];

preventWindowOpen.injections = [toRegExp, hit];
