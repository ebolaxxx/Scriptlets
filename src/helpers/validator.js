import {
    startsWith,
    substringAfter,
} from './string-utils';

import { ADG_SCRIPTLET_MASK } from './parse-rule';

import * as scriptletsList from '../scriptlets/scriptletsList';

import { redirects } from '../../scripts/compatibility-table.json';


const COMMENT_MARKER = '!';

/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 * @param {string} rule
 * @return {boolean}
 */
const isComment = (rule) => startsWith(rule, COMMENT_MARKER);


/* ************************************************************************
 *
 * Scriptlets
 *
 ************************************************************************** */


/**
 * uBlock scriptlet rule mask
 */
const UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
const UBO_SCRIPTLET_MASK_1 = '##+js';
const UBO_SCRIPTLET_MASK_2 = '##script:inject';
const UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
const UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';

/**
 * AdBlock Plus snippet rule mask
 */
const ABP_SCRIPTLET_MASK = '#$#';
const ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';

/**
 * AdGuard CSS rule mask
 */
const ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;


/**
 * Checks if the `rule` is AdGuard scriptlet rule
 * @param {string} rule - rule text
 */
const isAdgScriptletRule = (rule) => {
    return (
        !isComment(rule)
        && rule.indexOf(ADG_SCRIPTLET_MASK) > -1
    );
};

/**
 * Checks if the `rule` is uBO scriptlet rule
 * @param {string} rule rule text
 */
const isUboScriptletRule = (rule) => {
    return (
        rule.indexOf(UBO_SCRIPTLET_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_MASK_2) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_2) > -1
    )
        && UBO_SCRIPTLET_MASK_REG.test(rule)
        && !isComment(rule);
};

/**
 * Checks if the `rule` is AdBlock Plus snippet
 * @param {string} rule rule text
 */
const isAbpSnippetRule = (rule) => {
    return (
        rule.indexOf(ABP_SCRIPTLET_MASK) > -1
        || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1
    )
    && rule.search(ADG_CSS_MASK_REG) === -1
    && !isComment(rule);
};

/**
 * Finds scriptlet by it's name
 * @param {string} name - scriptlet name
 */
const getScriptletByName = (name) => {
    const scriptlets = Object.keys(scriptletsList).map((key) => scriptletsList[key]);
    return scriptlets
        .find((s) => s.names && s.names.indexOf(name) > -1);
};

/**
 * Checks if the scriptlet name is valid
 * @param {string} name - Scriptlet name
 */
const isValidScriptletName = (name) => {
    if (!name) {
        return false;
    }
    const scriptlet = getScriptletByName(name);
    if (!scriptlet) {
        return false;
    }
    return true;
};

/* ************************************************************************
 *
 * Redirects
 *
 ************************************************************************** */

/**
 * Redirect resources markers
 */
const ADG_UBO_REDIRECT_MARKER = 'redirect=';
const ABP_REDIRECT_MARKER = 'rewrite=abp-resource:';

const VALID_SOURCE_TYPES = [
    'image',
    'subdocument',
    'stylesheet',
    'script',
    'xmlhttprequest',
    'media',
];

const validAdgRedirects = redirects.filter((el) => el.adg);

/**
 * Converts array of pairs to object.
 * Sort of Object.fromEntries() polyfill.
 * @param {Array} pairs - array of pairs
 * @returns {Object}
 */
const objFromEntries = (pairs) => {
    const output = pairs
        .reduce((acc, el) => {
            const [key, value] = el;
            acc[key] = value;
            return acc;
        }, {});
    return output;
};

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for UBO -> ADG  converting
 */
const uboToAdgCompatibility = objFromEntries(
    validAdgRedirects
        .filter((el) => el.ubo)
        .map((el) => {
            return [el.ubo, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
 * It's used for ABP -> ADG  converting
 */
const abpToAdgCompatibility = objFromEntries(
    validAdgRedirects
        .filter((el) => el.abp)
        .map((el) => {
            return [el.abp, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for ADG -> UBO  converting
 */
const adgToUboCompatibility = objFromEntries(
    validAdgRedirects
        .filter((el) => el.ubo)
        .map((el) => {
            return [el.adg, el.ubo];
        }),
);


const REDIRECT_RULE_TYPES = {
    ADG: {
        marker: ADG_UBO_REDIRECT_MARKER,
        compatibility: adgToUboCompatibility,
    },
    UBO: {
        marker: ADG_UBO_REDIRECT_MARKER,
        compatibility: uboToAdgCompatibility,
    },
    ABP: {
        marker: ABP_REDIRECT_MARKER,
        compatibility: abpToAdgCompatibility,
    },
};

/**
 * Parses redirect rule modifiers
 * @param {string} rule
 * @returns {Array}
 */
const parseModifiers = (rule) => substringAfter(rule, '$').split(',');

/**
 * Gets redirect resource name
 * @param {string} rule
 * @param {string} marker - specific Adg/Ubo or Abp redirect resources marker
 * @returns {string} - redirect resource name
 */
const getRedirectName = (rule, marker) => {
    const ruleModifiers = parseModifiers(rule);
    const redirectNamePart = ruleModifiers
        .find((el) => el.indexOf(marker) > -1);
    return substringAfter(redirectNamePart, marker);
};


/**
 * Checks if the `rule` satisfies the `type`
 * @param {string} rule - rule text
 * @param {'ADG'|'UBO'|'ABP'} type - type of a redirect rule
 */
const isRedirectRule = (rule, type) => {
    const { marker, compatibility } = REDIRECT_RULE_TYPES[type];

    if ((!isComment(rule))
        && (rule.indexOf(marker) > -1)) {
        const redirectName = getRedirectName(rule, marker);

        return redirectName === Object
            .keys(compatibility)
            .find((el) => el === redirectName);
    }
    return false;
};

/**
* Checks if the `rule` is AdGuard redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isAdgRedirectRule = (rule) => {
    return isRedirectRule(rule, 'ADG');
};

/**
* Checks if the `rule` is Ubo redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isUboRedirectRule = (rule) => {
    return isRedirectRule(rule, 'UBO');
};

/**
* Checks if the `rule` is Abp redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isAbpRedirectRule = (rule) => {
    return isRedirectRule(rule, 'ABP');
};

/**
 * Validates any redirect rule
 * @param {string} rule - can be Adguard or Ubo or Abp redirect rule
 * @returns {boolean}
 */
const validateRedirectRule = (rule) => {
    return (isAdgRedirectRule(rule)
        || isUboRedirectRule(rule)
        || isAbpRedirectRule(rule));
};

/**
 * Checks if the rule has specified content type before Adg -> Ubo conversion.
 *
 * Used ONLY for Adg -> Ubo conversion
 * because Ubo redirect rules must contain content type, but Adg and Abp must not.
 *
 * Also source type can not be added automatically because of such valid rules:
 * ! Abp:
 * $rewrite=abp-resource:blank-js,xmlhttprequest
 * ! Adg:
 * $script,redirect=noopvast-2.0
 * $xmlhttprequest,redirect=noopvast-2.0
 *
 * @param {string} rule
 * @returns {boolean}
 */
const isValidContentType = (rule) => {
    if (isRedirectRule(rule, 'ADG')) {
        const ruleModifiers = parseModifiers(rule);
        const sourceType = ruleModifiers
            .find((el) => VALID_SOURCE_TYPES.indexOf(el) > -1);

        return sourceType !== undefined;
    }
    return false;
};

const validator = {
    UBO_SCRIPTLET_MASK_REG,
    ABP_SCRIPTLET_MASK,
    ABP_SCRIPTLET_EXCEPTION_MASK,
    isComment,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    getScriptletByName,
    isValidScriptletName,
    REDIRECT_RULE_TYPES,
    validateRedirectRule,
    isAdgRedirectRule,
    isUboRedirectRule,
    isAbpRedirectRule,
    parseModifiers,
    getRedirectName,
    isValidContentType,
};

export default validator;