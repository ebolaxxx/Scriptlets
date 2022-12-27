/**
 * @typedef { import('../scriptlets/index').Source } Source
 */

/**
 * Conditionally logs message to console.
 * Convention is to log messages by source.verbose if such log
 * is not a part of scriptlet's functionality, eg on invalid input,
 * and use 'forced' argument otherwise.
 * @param {Source} source required
 * @param {string} message required, message to log
 * @param {boolean} [forced=false] to log message unconditionally
 */
export const logMessage = (source, message, forced = false) => {
    const {
        name,
        ruleText,
        verbose,
    } = source;

    if (!forced && !verbose) {
        return;
    }

    let messageStr = `${name}: ${message};`;

    // Extract scriptlet part from rule text
    if (ruleText) {
        const RULE_MARKER = '#%#';
        const markerIdx = ruleText.indexOf(RULE_MARKER);
        const extension = ruleText.slice(markerIdx, ruleText.length);
        messageStr += ` cannot apply rule: ${extension}`;
    }

    // eslint-disable-next-line no-console
    console.log(messageStr);
};
