import { nativeIsNaN } from './number-utils';
import { logMessage } from './log-message';

/**
 * Sets item to a specified storage, if storage isn't full.
 *
 * @param source scriptlet's configuration
 * @param storage storage instance to set item into
 * @param key storage key
 * @param  value staroge value
 */
export const setStorageItem = (source: Source, storage: Storage, key: string, value: string): void => {
    // setItem() may throw an exception if the storage is full.
    try {
        storage.setItem(key, value);
    } catch (e) {
        const message = `Unable to set sessionStorage item due to: ${(e as Error).message}`;
        logMessage(source, message);
    }
};

/**
 * Gets supported storage item value
 *
 * @param  value input item value
 * @returns valid item value if ok OR null if not
 */
export const getLimitedStorageItemValue = (value: string): StorageItemValue | null => {
    if (typeof value !== 'string') {
        throw new Error('Invalid value');
    }

    let validValue;
    if (value === 'undefined') {
        validValue = undefined;
    } else if (value === 'false') {
        validValue = false;
    } else if (value === 'true') {
        validValue = true;
    } else if (value === 'null') {
        validValue = null;
    } else if (value === 'emptyArr') {
        validValue = '[]';
    } else if (value === 'emptyObj') {
        validValue = '{}';
    } else if (value === '') {
        validValue = '';
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            throw new Error('Invalid value');
        }
        if (Math.abs(validValue) > 32767) {
            throw new Error('Invalid value');
        }
    } else if (value === 'yes') {
        validValue = 'yes';
    } else if (value === 'no') {
        validValue = 'no';
    } else {
        throw new Error('Invalid value');
    }

    return validValue;
};
