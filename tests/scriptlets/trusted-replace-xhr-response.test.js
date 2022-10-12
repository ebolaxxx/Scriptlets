/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { startsWith } from '../../src/helpers/string-utils';

const { test, module } = QUnit;
const name = 'trusted-replace-xhr-response';

const FETCH_OBJECTS_PATH = './test-files';
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeXhrSend = XMLHttpRequest.prototype.send;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    XMLHttpRequest.prototype.open = nativeXhrOpen;
    XMLHttpRequest.prototype.send = nativeXhrSend;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof Proxy !== 'undefined';

if (isSupported) {
    test('No args, logging', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;

        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.indexOf('trace') > -1) {
                return;
            }
            const EXPECTED_LOG_STR = `xhr( method:"${METHOD}" url:"${URL}" )`;
            assert.ok(startsWith(input, EXPECTED_LOG_STR), 'console.hit input');
        };

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Matched, response and responseText been modified by string pattern', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PATTERN = 'a1';
        const REPLACEMENT = 'x';
        const MATCH_DATA = [`${URL} method:${METHOD}`, PATTERN, REPLACEMENT];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response.includes('REPLACEMENT') && !xhr.response.includes(PATTERN), 'Response has been modified');
            assert.ok(xhr.responseText.includes('REPLACEMENT') && !xhr.responseText.includes(PATTERN), 'Response text has been modified');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    // test('Not matched, response and responseText are intact', async (assert) => {

    // });

    // test('Matched, listeners after .send work', async (assert) => {
    //     const METHOD = 'GET';
    //     const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
    //     const MATCH_DATA = [`test01.json method:${METHOD}`];

    //     runScriptlet(name, MATCH_DATA);

    //     const done1 = assert.async();
    //     const done2 = assert.async();
    //     const done3 = assert.async();
    //     assert.expect(0);

    //     const xhr = new XMLHttpRequest();
    //     xhr.open(METHOD, URL);
    //     xhr.send();
    //     xhr.addEventListener('load', () => {
    //         done1();
    //     });
    //     xhr.onload = () => {
    //         done2();
    //     };
    //     xhr.addEventListener('loadend', () => {
    //         done3();
    //     });
    // });

    // test('Args, pass partly matched', async (assert) => {
    //     const METHOD = 'GET';
    //     const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
    //     const MATCH_DATA = ['not-example.org method:GET'];

    //     runScriptlet(name, MATCH_DATA);

    //     const done = assert.async();

    //     const xhr = new XMLHttpRequest();
    //     xhr.open(METHOD, URL);
    //     xhr.onload = () => {
    //         assert.strictEqual(xhr.readyState, 4, 'Response done');
    //         assert.ok(xhr.response, 'Response data exists');
    //         assert.strictEqual(window.hit, undefined, 'hit should not fire');
    //         done();
    //     };
    //     xhr.send();
    // });

    // test('Args, pass unmatched - invalid regexp', async (assert) => {
    //     const METHOD = 'GET';
    //     const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
    //     const MATCH_DATA = ['/\\/'];

    //     runScriptlet(name, MATCH_DATA);

    //     const done = assert.async();

    //     const xhr = new XMLHttpRequest();
    //     xhr.open(METHOD, URL);
    //     xhr.onload = () => {
    //         assert.strictEqual(xhr.readyState, 4, 'Response done');
    //         assert.ok(xhr.response, 'Response data exists');
    //         assert.strictEqual(window.hit, undefined, 'hit should not fire');
    //         done();
    //     };
    //     xhr.send();
    // });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
