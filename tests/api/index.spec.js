import {
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
    isValidScriptletRule,
} from '../../src/helpers/converter';

import validator from '../../src/helpers/validator';

describe('Test scriptlet api methods', () => {
    describe('isValidScriptletRule()', () => {
        const validRules = [
            "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
            'example.org##+js(setTimeout-defuser.js, [native code], 8000)',
            // scriptlet rule converted from ubo syntax
            "example.org#%#//scriptlet('ubo-setTimeout-defuser.js', '[native code]', '8000')",
            'example.org#@%#//scriptlet("ubo-aopw.js", "notDetected")',
            // no space between parameters
            'example.org##+js(aopr,__cad.cpm_popup)',
            // set-constant empty string
            'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
            // multiple selectors for remove-attr/class
            'example.org##+js(ra, href|target, #image > [href][onclick]\\, #page_effect > [href][onclick])',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(isValidScriptletRule(rule)).toBeTruthy();
        });

        const invalidRules = [
            // unknown scriptlet name
            'example.org#@%#//scriptlet("ubo-abort-scriptlet.js", "notDetected")',
            // few abp snippets rule
            // eslint-disable-next-line max-len
            'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'',
            // single abp snippet rule
            'example.org#$#hide-if-contains li.item \'li.item div.label\'',
            // invalid due to missed arg quotes
            'example.com#%#//scriptlet("abp-abort-current-inline-script", console.log", "Hello")',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(isValidScriptletRule(rule)).toBeFalsy();
        });
    });

    describe('convertScriptletToAdg(comment)', () => {
        const testCases = [
            {
                actual: "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
            },
            {
                actual: '! ||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '! ||example.com^$xmlhttprequest,redirect=nooptext',
            },
            {
                actual: '!||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '!||example.com^$xmlhttprequest,redirect=nooptext',
            },
            {
                actual: '!!!  ||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '!!!  ||example.com^$xmlhttprequest,redirect=nooptext',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });
    });

    describe('convertScriptletToAdg(adg-rule)', () => {
        const validTestCases = [
            {
                actual: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
            },
            {
                actual: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });

        // invalid syntax rule
        const invalidRule = "example.org#%#//scriptlet('abort-on-property-read', I10C')";
        expect(convertScriptletToAdg(invalidRule).length).toBe(0);
    });

    describe('convertScriptletToAdg(ubo-rule) -> adg', () => {
        const validTestCases = [
            {
                actual: 'example.org##+js(setTimeout-defuser.js, [native code], 8000)',
                expected: 'example.org#%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')',
            },
            {
                // no space between parameters
                actual: 'example.org##+js(aopr,__ad)',
                expected: 'example.org#%#//scriptlet(\'ubo-aopr.js\', \'__ad\')',
            },
            {
                // '$' as parameter
                actual: 'example.org##+js(abort-current-inline-script, $, popup)',
                expected: 'example.org#%#//scriptlet(\'ubo-abort-current-inline-script.js\', \'$\', \'popup\')',
            },
            {
                // '' as set-constant parameter
                actual: 'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
                expected: 'example.org#%#//scriptlet(\'ubo-set-constant.js\', \'config.ads.desktopAd\', \'\')',
            },
            {
                // multiple selectors for remove-attr/class
                // eslint-disable-next-line max-len
                actual: 'example.com##+js(ra, href, area[href*="discord-app.com/"]\\, area[href*="facebook.com/"]\\, area[href*="instagram.com/"])',
                // eslint-disable-next-line max-len
                expected: 'example.com#%#//scriptlet(\'ubo-ra.js\', \'href\', \'area[href*="discord-app.com/"], area[href*="facebook.com/"], area[href*="instagram.com/"]\')',
            },
            {
                // empty selector and specified applying for remove-attr/class
                actual: 'example.com##+js(rc, cookie--not-set, , stay)',
                expected: "example.com#%#//scriptlet('ubo-rc.js', 'cookie--not-set', '', 'stay')",
            },
            {
                // specified selectors and applying for remove-attr/class
                actual: 'memo-book.pl##+js(rc, .locked, body\\, html, stay)',
                expected: "memo-book.pl#%#//scriptlet('ubo-rc.js', '.locked', 'body, html', 'stay')",
            },
            {
                // specified selectors and applying for remove-attr/class - one backslash
                // eslint-disable-next-line no-useless-escape
                actual: 'memo-book.pl##+js(rc, .locked, body\, html, stay)',
                expected: "memo-book.pl#%#//scriptlet('ubo-rc.js', '.locked', 'body, html', 'stay')",
            },
            {
                // just two args for remove-attr/class
                actual: 'example.com##+js(ra, onselectstart)',
                expected: "example.com#%#//scriptlet('ubo-ra.js', 'onselectstart')",
            },
            {
                // double quotes in scriptlet parameter
                actual: 'example.com#@#+js(remove-attr.js, href, a[data-st-area="back"])',
                expected: 'example.com#@%#//scriptlet(\'ubo-remove-attr.js\', \'href\', \'a[data-st-area="back"]\')',
            },
            {
                // the same but with single quotes
                actual: 'example.com#@#+js(remove-attr.js, href, a[data-st-area=\'back\'])',
                expected: 'example.com#@%#//scriptlet(\'ubo-remove-attr.js\', \'href\', \'a[data-st-area="back"]\')',
            },
            {
                // name without '.js' at the end
                actual: 'example.org##+js(addEventListener-defuser, load, 2000)',
                expected: 'example.org#%#//scriptlet(\'ubo-addEventListener-defuser.js\', \'load\', \'2000\')',
            },
            {
                // short form of name
                actual: 'example.org##+js(nano-stb, timeDown)',
                expected: 'example.org#%#//scriptlet(\'ubo-nano-stb.js\', \'timeDown\')',
            },
            {
                actual: 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)',
                expected: 'example.org#@%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')',
            },
            {
                actual: 'example.org#@#script:inject(abort-on-property-read.js, some.prop)',
                expected: 'example.org#@%#//scriptlet(\'ubo-abort-on-property-read.js\', \'some.prop\')',
            },
            {
                actual: 'example.org#@#+js(aopw, notDetected)',
                expected: 'example.org#@%#//scriptlet(\'ubo-aopw.js\', \'notDetected\')',
            },
            {
                // wildcard tld
                actual: 'example.*##+js(abort-on-stack-trace, Object.prototype.parallax, window.onload)',
                // eslint-disable-next-line max-len
                expected: 'example.*#%#//scriptlet(\'ubo-abort-on-stack-trace.js\', \'Object.prototype.parallax\', \'window.onload\')',
            },
            {
                actual: 'example.com##+js(remove-class, blur, , stay)',
                expected: "example.com#%#//scriptlet('ubo-remove-class.js', 'blur', '', 'stay')",
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });
    });

    describe('convertScriptletToAdg(abp-rule) -> adg', () => {
        const testCases = [
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#abort-on-property-read atob; abort-on-property-write Fingerprint2; abort-on-property-read decodeURIComponent; abort-on-property-read RegExp',
                expected: [
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'atob')",
                    "example.org#%#//scriptlet('abp-abort-on-property-write', 'Fingerprint2')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'decodeURIComponent')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'RegExp')",
                ],
            },
            {
                actual: 'example.com#$#abort-current-inline-script onload;',
                expected: [
                    "example.com#%#//scriptlet('abp-abort-current-inline-script', 'onload')",
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#abort-on-property-read Object.prototype.createHostAsserter; abort-on-property-read Object.prototype.DlEDrf;',
                expected: [
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'Object.prototype.createHostAsserter')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'Object.prototype.DlEDrf')",
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'',
                expected: [
                    // eslint-disable-next-line max-len
                    'example.org#%#//scriptlet(\'abp-hide-if-has-and-matches-style\', \'d[id^="_"]\', \'div > s\', \'display: none\')',
                    'example.org#%#//scriptlet(\'abp-hide-if-contains\', \'/.*/\', \'.p\', \'a[href^="/ad__c?"]\')',
                ],
            },
        ];

        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('convertAdgScriptletToUbo(adg-rule) -> ubo', () => {
        const testCases = [
            {
                actual: 'example.org#%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')',
                expected: 'example.org##+js(no-setTimeout-if, [native code], 8000)',
            },
            {
                // '' as set-constant parameter
                actual: 'example.org#%#//scriptlet(\'set-constant\', \'config.ads.desktopAd\', \'\')',
                expected: 'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
            },
            {
                // multiple selectors parameter for remove-attr/class
                // eslint-disable-next-line max-len
                actual: 'example.org#%#//scriptlet(\'remove-class\', \'promo\', \'a.class, div#id, div > #ad > .test\')',
                expected: 'example.org##+js(remove-class, promo, a.class\\, div#id\\, div > #ad > .test)',
            },
            {
                // scriptlet with no parameters
                actual: 'example.com#%#//scriptlet("prevent-adfly")',
                expected: 'example.com##+js(adfly-defuser)',
            },
            {
                actual: 'example.org#@%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')',
                expected: 'example.org#@#+js(no-setTimeout-if, [native code], 8000)',
            },
            {
                actual: 'example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")',
                expected: 'example.org##+js(abort-on-property-read, alert)',
            },
            {
                actual: 'example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")',
                expected: 'example.com##+js(abort-current-script, console.log, Hello)',
            },
            {
                actual: 'example.com#%#//scriptlet(\'prevent-fetch\', \'*\')',
                expected: 'example.com##+js(no-fetch-if, /^/)',
            },
            {
                actual: 'example.com#%#//scriptlet(\'close-window\')',
                expected: 'example.com##+js(window-close-if)',
            },
            {
                // emptyArr as set-constant parameter
                actual: "example.org#%#//scriptlet('set-constant', 'adUnits', 'emptyArr')",
                expected: 'example.org##+js(set-constant, adUnits, [])',
            },
            {
                // emptyObj as set-constant parameter
                actual: "example.org#%#//scriptlet('set-constant', 'adUnits', 'emptyObj')",
                expected: 'example.org##+js(set-constant, adUnits, {})',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertAdgScriptletToUbo(actual)).toStrictEqual(expected);
        });
    });
});

describe('Test redirects api methods', () => {
    describe('isAdgRedirectRule()', () => {
        const validRules = [
            '||example.org$xmlhttprequest,redirect=noopvast-4.0',
            '||example.org^$xmlhttprequest,redirect=noopjson',
            '||youtube.com/embed/$redirect=click2load.html,domain=example.org',
            '||cloudflare.com/ajax/libs/fingerprintjs2/$script,redirect=fingerprint2.js,important',
            // obsolete googletagmanager-gtm should be true as it is an alias for google-analytics
            '||example.org/script.js$script,redirect=googletagmanager-gtm',
            '||example.org/script.js$script,redirect-rule=googletagmanager-gtm',
            // old alias for adsbygoogle redirect should be valid
            '||example.org^$script,redirect=googlesyndication.com/adsbygoogle.js',
            '||example.org^$script,redirect-rule=googlesyndication.com/adsbygoogle.js',
            // rule with 'redirect=' marker should be considered as redirect rules
            '/blockadblock.$script,redirect=nobab.js',
            '/blockadblock.$script,redirect-rule=nobab.js',
            // redirect name is wrong, but this one only for checking ADG redirect marker "redirect="
            '||example.com/banner$image,redirect=redirect.png',
            '||example.com/banner$image,redirect-rule=redirect.png',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isAdgRedirectRule(rule)).toBeTruthy();
        });

        const invalidRules = [
            // js-rule with 'redirect=' should not be considered as redirect rule
            'example.com#%#document.cookie = "app_redirect=false; path=/;";',
            'example.com#%#document.cookie = "app_redirect-rule=false; path=/;";',
            // basic rules with 'redirect=' are not valid redirect rules as well
            '_redirect=*://look.$popup',
            '_redirect-rule=*://look.$popup',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isAdgRedirectRule(rule)).toBeFalsy();
        });
    });

    describe('isValidAdgRedirectRule()', () => {
        const validRules = [
            '||example.org$xmlhttprequest,redirect=noopvast-2.0',
            '||example.com/log$redirect=empty',
            '||example.org$xmlhttprequest,redirect=noopvast-4.0',
            '||example.org^$xmlhttprequest,redirect=noopjson',
            '||youtube.com/embed/$redirect=click2load.html,domain=example.org',
            // obsolete googletagmanager-gtm should be true as it is an alias for google-analytics
            '||example.org/script.js$script,redirect=googletagmanager-gtm',
            // valid adg name for the redirect
            '||cloudflare.com/ajax/libs/fingerprintjs2/$script,redirect=fingerprintjs2,important',
            // $redirect-rule
            '||example.org$xmlhttprequest,redirect-rule=noopvast-2.0',
            '||example.org/script.js$script,redirect-rule=googletagmanager-gtm',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isValidAdgRedirectRule(rule)).toBeTruthy();
        });

        const invalidRules = [
            // fingerprint2.js is not a valid name for the AdGuard redirect resource
            '||cloudflare.com/ajax/libs/fingerprintjs2/$script,redirect=fingerprint2.js,important',
            // ubo redirect name is not a valid adg redirect name
            '/blockadblock.$script,redirect=nobab.js',
            '/blockadblock.$script,redirect-rule=nobab.js',
            // invalid adg redirect name
            '||example.com/banner$image,redirect=redirect.png',
            '||example.com/banner$image,redirect-rule=redirect.png',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isValidAdgRedirectRule(rule)).toBeFalsy();
        });
    });

    describe('isAdgRedirectCompatibleWithUbo()', () => {
        const validRules = [
            '||example.orf^$media,redirect=noopmp4-1s,third-party',
            '||example.com/log$redirect=empty',
            '||example.com^$redirect=prevent-bab',
            '||example.com/ad/vmap/*$xmlhttprequest,redirect=noopvmap-1.0',
            '||example.orf^$media,redirect-rule=noopmp4-1s,third-party',
            '||example.com^$redirect-rule=prevent-bab',
            '||example.com/ad/vmap/*$xmlhttprequest,redirect-rule=noopvmap-1.0',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isAdgRedirectCompatibleWithUbo(rule)).toBeTruthy();
        });

        const invalidRules = [
            // invalid redirect name
            '||example.orf^$media,redirect=no-mp4',
            // rules with 'redirect=' marker in base rule part should be skipped
            '_redirect=*://look.$popup',
            // js-rule with 'redirect=' in it should not be considered as redirect rule
            'example.com#%#document.cookie = "app_redirect=false; path=/;";',
            // $redirect-rule
            '||example.orf^$media,redirect-rule=no-mp4',
            '_redirect-rule=*://look.$popup',
            'example.com#%#document.cookie = "app_redirect-rule=false; path=/;";',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isAdgRedirectCompatibleWithUbo(rule)).toBeFalsy();
        });
    });

    describe('isUboRedirectCompatibleWithAdg()', () => {
        const validRules = [
            '||example.orf^$media,redirect=noop-1s.mp4,third-party',
            '||example.org^$redirect=nobab.js,third-party',
            '||example.orf^$media,redirect-rule=noop-1s.mp4,third-party',
            '||example.org^$redirect-rule=nobab.js,third-party',
            '*$image,redirect-rule=1x1.gif,domain=play.example.com',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isUboRedirectCompatibleWithAdg(rule)).toBeTruthy();
        });

        const invalidRules = [
            // invalid redirect name
            '||example.orf^$media,redirect=no-mp4',
            // js-rule with 'redirect=' in it should not be considered as redirect rule
            'example.com#%#document.cookie = "app_redirect=false; path=/;";',
            // rules with 'redirect=' marker in base rule part should be skipped
            '&pub_redirect=',
            '@@||example.com/gdpr.html?redirect=',
            // do not break on cosmetic rules
            'example.org##div[data-render-state] + div[class^="jsx-"][class$=" undefined"]',
            // do not break on JS rules
            'example.org#%#var str = /[class$=" undefined"]/; console.log(str);',
            // $redirect-rule
            '||example.orf^$media,redirect-rule=no-mp4',
            '&pub_redirect-rule=',
            '@@||example.com/gdpr.html?redirect-rule=',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isUboRedirectCompatibleWithAdg(rule)).toBeFalsy();
        });
    });

    describe('isAbpRedirectCompatibleWithAdg()', () => {
        const validRules = [
            '||example.com^$script,rewrite=abp-resource:blank-js',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isAbpRedirectCompatibleWithAdg(rule)).toBeTruthy();
        });

        const invalidRules = [
            // invalid abp redirect name
            '||example.com^$script,rewrite=abp-resource:noop-js',
            // js-rule with 'redirect=' in it should not be considered as redirect rule
            'example.com#%#document.cookie = "app_redirect=false; path=/;";',
            // do not break on cosmetic rules
            'example.org##div[data-render-state] + div[class^="jsx-"][class$=" undefined"]',
            // do not break on JS rules
            'example.org#%#var str = /[class$=" undefined"]/; console.log(str);',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isAbpRedirectCompatibleWithAdg(rule)).toBeFalsy();
        });
    });

    describe('convertRedirectToAdg(ubo) -> adg', () => {
        const testCases = [
            {
                actual: '||example.com/banner$image,redirect=32x32-transparent.png',
                expected: '||example.com/banner$image,redirect=32x32-transparent.png',
            },
            {
                actual: '||example.com/banner$image,redirect=32x32.png',
                expected: '||example.com/banner$image,redirect=32x32-transparent.png',
            },
            {
                actual: '||example.orf^$media,redirect=noop-1s.mp4,third-party',
                expected: '||example.orf^$media,redirect=noopmp4-1s,third-party',
            },
            {
                // old ubo adsbygoogle alias works
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect=googlesyndication.com/adsbygoogle.js,domain=example.org',
                expected: '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                // new adsbygoogle alias works as well
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect=googlesyndication_adsbygoogle.js,domain=example.org',
                expected: '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                actual: '||g9g.eu^*fa.js$script,redirect=fuckadblock.js-3.2.0',
                expected: '||g9g.eu^*fa.js$script,redirect=prevent-fab-3.2.0',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima3,domain=example.org',
            },
            {
                actual: '||example.org^$stylesheet,redirect=noop.css,third-party',
                expected: '||example.org^$stylesheet,redirect=noopcss,third-party',
            },
            // $redirect-rule
            {
                actual: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
                expected: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
            },
            {
                actual: '||example.com/banner$image,redirect-rule=32x32.png',
                expected: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
            },
            {
                actual: '||example.orf^$media,redirect-rule=noop-1s.mp4,third-party',
                expected: '||example.orf^$media,redirect-rule=noopmp4-1s,third-party',
            },
            {
                // old ubo adsbygoogle alias works
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect-rule=googlesyndication.com/adsbygoogle.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                // newer alias works as well
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect-rule=googlesyndication_adsbygoogle.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                actual: '||googletagmanager.com/gtag/js$script,redirect-rule=googletagmanager_gtm.js',
                expected: '||googletagmanager.com/gtag/js$script,redirect-rule=googletagmanager-gtm',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertRedirectToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('convertRedirectToAdg(abp-rule) -> adg', () => {
        const testCases = [
            {
                actual: '||example.com^$script,rewrite=abp-resource:blank-js',
                expected: '||example.com^$script,redirect=noopjs',
            },
            {
                actual: '||*/ad/$rewrite=abp-resource:blank-mp3,domain=example.org',
                expected: '||*/ad/$redirect=noopmp3-0.1s,domain=example.org',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertRedirectToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('hasValidContentType() -- needed for adg->ubo redirect conversion', () => {
        const validRules = [
            '||example.com^$xmlhttprequest,redirect=nooptext',
            '||example.orf^$media,redirect=noopmp4-1s,third-party',
            '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org',
            // no source type for 'empty' is allowed
            '||example.org^$redirect=empty,third-party',
            // all source types for 'empty' are allowed
            '||example.org^$script,redirect=empty,third-party',
            // all source types for 'media' are allowed too as well
            '||example.org^$stylesheet,media,redirect=empty,third-party',
            // apb redirects should not be passed to adg->ubo conversion but content type is valid
            '||example.com^$script,rewrite=abp-resource:blank-js',
            // rules with the $redirect-rule modifier
            '||example.com^$xmlhttprequest,redirect-rule=nooptext',
            '||example.orf^$media,redirect-rule=noopmp4-1s,third-party',
            '||example.com/images/*.png$image,important,redirect-rule=1x1-transparent.gif,domain=example.com|',
            '||example.org^$redirect-rule=empty,third-party',
            '||example.org^$script,redirect-rule=empty,third-party',
            '||example.org^$stylesheet,media,redirect-rule=empty,third-party',
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.hasValidContentType(rule)).toBeTruthy();
        });

        const invalidRules = [
            // no source type specified
            '||example.com^$important,redirect=nooptext',
            '||example.com^$important,redirect-rule=nooptext',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.hasValidContentType(rule)).toBeFalsy();
        });
    });

    describe('convertAdgRedirectToUbo(adg-rule) -> ubo', () => {
        const validTestCases = [
            {
                actual: '||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '||example.com^$xmlhttprequest,redirect=noop.txt',
            },
            {
                actual: '||example.com/*.css$important,redirect=noopcss',
                expected: '||example.com/*.css$important,redirect=noop.css,stylesheet',
            },
            {
                // image type is supported by nooptext too
                actual: '||example.com^$image,redirect=nooptext',
                expected: '||example.com^$image,redirect=noop.txt',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org',
                expected: '||example.com/images/*.png$image,important,redirect=1x1.gif,domain=example.com|example.org',
            },
            {
                actual: '||example.com/vast/$important,redirect=empty,~third-party',
                expected: '||example.com/vast/$important,redirect=empty,~third-party',
            },
            {
                // add source type modifiers while conversion if there is no one of them
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$redirect=1x1-transparent.gif,domain=example.com|example.org,important',
                expected: '||example.com/images/*.png$redirect=1x1.gif,domain=example.com|example.org,important,image',
            },
            {
                actual: '||example.com/*.mp4$important,redirect=noopmp4-1s,~third-party',
                expected: '||example.com/*.mp4$important,redirect=noop-1s.mp4,~third-party,media',
            },
            {
                actual: '||example.com/*.css$important,redirect=noopcss',
                expected: '||example.com/*.css$important,redirect=noop.css,stylesheet',
            },
            {
                actual: '||ad.example.com^$redirect=nooptext,important',
                // eslint-disable-next-line max-len
                expected: '||ad.example.com^$redirect=noop.txt,important,image,media,subdocument,stylesheet,script,xmlhttprequest,other',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima3,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima.js,domain=example.org',
            },
            // $redirect-rule
            {
                actual: '||example.com^$xmlhttprequest,redirect-rule=nooptext',
                expected: '||example.com^$xmlhttprequest,redirect-rule=noop.txt',
            },
            {
                // image type is supported by nooptext too
                actual: '||example.com^$image,redirect-rule=nooptext',
                expected: '||example.com^$image,redirect-rule=noop.txt',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$image,important,redirect-rule=1x1-transparent.gif,domain=example.com|example.org',
                // eslint-disable-next-line max-len
                expected: '||example.com/images/*.png$image,important,redirect-rule=1x1.gif,domain=example.com|example.org',
            },
            {
                actual: '||example.com/vast/$important,redirect-rule=empty,~third-party',
                expected: '||example.com/vast/$important,redirect-rule=empty,~third-party',
            },
            {
                // add source type modifiers while conversion if there is no one of them
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$redirect-rule=1x1-transparent.gif,domain=example.com|example.org,important',
                // eslint-disable-next-line max-len
                expected: '||example.com/images/*.png$redirect-rule=1x1.gif,domain=example.com|example.org,important,image',
            },
            {
                actual: '||example.com/*.mp4$important,redirect-rule=noopmp4-1s,~third-party',
                expected: '||example.com/*.mp4$important,redirect-rule=noop-1s.mp4,~third-party,media',
            },
            {
                actual: '||ad.example.com^$redirect-rule=nooptext,important',
                // eslint-disable-next-line max-len
                expected: '||ad.example.com^$redirect-rule=noop.txt,important,image,media,subdocument,stylesheet,script,xmlhttprequest,other',
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertAdgRedirectToUbo(actual)).toStrictEqual(expected);
        });

        const NO_UBO_CONVERSION_ERROR = 'Unable to convert for uBO';
        const invalidRules = [
            '||example.com/ad/vmap/*$xmlhttprequest,redirect=noopvast-2.0',
            '||example.com/ad/vmap/*$redirect=scorecardresearch-beacon',
            '||example.com/ad/vmap/*$xmlhttprequest,redirect-rule=noopvast-2.0',
            '||example.com/ad/vmap/*$redirect-rule=scorecardresearch-beacon',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(() => {
                convertAdgRedirectToUbo(rule);
            }).toThrow(NO_UBO_CONVERSION_ERROR);
        });
    });
});
