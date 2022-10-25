import { randomId } from './random-id';
/**
 * Prevent infinite loops when trapping props that could be used by scriptlet's own helpers
 * Example: window.RegExp, that is used by matchStackTrace > toRegExp
 *
 * https://github.com/AdguardTeam/Scriptlets/issues/251
 * https://github.com/AdguardTeam/Scriptlets/issues/226
 * https://github.com/AdguardTeam/Scriptlets/issues/232
 *
 * @return {Object}
 */
export function getDescriptorAddon() {
    return {
        isAbortingSuspended: false,
        isolateCallback(cb, ...args) {
            this.isAbortingSuspended = true;
            // try...catch is required in case if there are more than one inline scripts
            // which should be aborted.
            // so after the first successful abortion, `cb(...args);` will throw error,
            // and we should not stop on that and continue to abort other scripts
            try {
                const result = cb(...args);
                this.isAbortingSuspended = false;
                return result;
            } catch {
                this.isAbortingSuspended = false;
                const rid = randomId();
                // It's necessary to throw error
                // otherwise script will be not aborted
                throw new ReferenceError(rid);
            }
        },
    };
}
