/* eslint-disable no-underscore-dangle, no-restricted-globals */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-src';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

const createTagWithSetAttr = (src, nodeName, assert) => {
    const done1 = assert.async();
    const done2 = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done1();
    };
    node.addEventListener('load', () => {
        assert.ok(true, 'eventListener on "load" triggered');
        done2();
    });
    node.setAttribute('src', src);
    document.body.append(node);
    return node;
};

const createTagWithSrcProp = (src, nodeName, assert) => {
    const done1 = assert.async();
    const done2 = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done1();
    };
    node.addEventListener('load', () => {
        assert.ok(true, 'eventListener on "load" triggered');
        done2();
    });
    node.src = src;
    document.body.append(node);
    return node;
};

module(name, { beforeEach, afterEach });

test('setAttribute, matching script element', (assert) => {
    const scriptletArgs = ['adsbygoogle', 'script'];
    runScriptlet(name, scriptletArgs);

    const elem = createTagWithSetAttr('adsbygoogle.js', 'script', assert);
    assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    elem.remove();
});

test('setAttribute, matching image element', (assert) => {
    const scriptletArgs = ['adsbygoogle', 'img'];
    runScriptlet(name, scriptletArgs);

    const elem = createTagWithSetAttr('adsbygoogle.js', 'img', assert);
    assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    elem.remove();
});

// test('setAttribute, matching iframe element', (assert) => {
//     const scriptletArgs = ['adsbygoogle', 'iframe'];
//     runScriptlet(name, scriptletArgs);

//     const elem = createTagWithSetAttr('adsbygoogle.js', 'iframe', assert);
//     assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
//     assert.strictEqual(window.hit, 'FIRED', 'hit fired');
//     elem.remove();
// });

test('src prop, matching script element', (assert) => {
    const scriptletArgs = ['adsbygoogle', 'script'];
    runScriptlet(name, scriptletArgs);

    const elem = createTagWithSrcProp('adsbygoogle.js', 'script', assert);
    assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    elem.remove();
});

test('src prop, matching image element', (assert) => {
    const scriptletArgs = ['adsbygoogle', 'img'];
    runScriptlet(name, scriptletArgs);

    const elem = createTagWithSrcProp('adsbygoogle.js', 'img', assert);
    assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    elem.remove();
});

// test('src prop, matching iframe element', (assert) => {
//     const scriptletArgs = ['adsbygoogle', 'iframe'];
//     runScriptlet(name, scriptletArgs);

//     const elem = createTagWithSrcProp('adsbygoogle.js', 'iframe', assert);
//     assert.ok(elem.src.indexOf('data:') > -1, 'src was mocked');
//     assert.strictEqual(window.hit, 'FIRED', 'hit fired');
//     elem.remove();
// });