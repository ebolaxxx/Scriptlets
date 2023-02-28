/**
 * Conditionally logs message to console.
 * Convention is to log messages by source.verbose if such log
 * is not a part of scriptlet's functionality, eg on invalid input,
 * and use 'forced' argument otherwise.
 *
 * @param {Object} source required, scriptlet properties
 * @param {any} message required, message to log
 * @param {boolean} [forced=false] to log message unconditionally
 * @param {boolean} [convertMessageToString=true] to convert message to string
 */
export const logMessage = (source, message, forced = false, convertMessageToString = true) => {
    const {
        name,
        ruleText,
        verbose,
    } = source;

    if (!forced && !verbose) {
        return;
    }

    // eslint-disable-next-line no-console
    const nativeConsole = console.log;

    if (!convertMessageToString) {
        // Template literals convert object to string,
        // so 'message' should not be passed to template literals
        // as it will not be logged correctly
        nativeConsole(`${name}:`, message);
        return;
    }

    let messageStr = `${name}: ${message}`;

    // Extract scriptlet part from rule text
    if (ruleText) {
        const RULE_MARKER = '#%#//scriptlet';
        const markerIdx = ruleText.indexOf(RULE_MARKER);
        if (markerIdx > -1) {
            const ruleWithoutDomains = ruleText.slice(markerIdx, ruleText.length);
            messageStr += `; cannot apply rule: ${ruleWithoutDomains}`;
        }
    }
    nativeConsole(messageStr);
};
