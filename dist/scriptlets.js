
/**
 * AdGuard Scriptlets
 * Version 1.0.1
 */

(function () {
    function randomId() {
      return Math.random().toString(36).substr(2, 9);
    }

    function setPropertyAccess(object, property, descriptor) {
      var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
      if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
      }
      Object.defineProperty(object, property, descriptor);
      return true;
    }

    function getPropertyInChain(base, chain) {
      var pos = chain.indexOf('.');
      if (pos === -1) {
        return {
          base: base,
          prop: chain
        };
      }
      var prop = chain.slice(0, pos);
      var own = base[prop];
      chain = chain.slice(pos + 1);
      if (own !== undefined) {
        return getPropertyInChain(own, chain);
      }
      Object.defineProperty(base, prop, {
        configurable: true
      });
      return {
        base: own,
        prop: prop,
        chain: chain
      };
    }

    var escapeRegExp = function escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    var toRegExp = function toRegExp(str) {
      if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
      }
      var escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped);
    };

    function createOnErrorHandler(rid) {
      var nativeOnError = window.onerror;
      return function onError(error) {
        if (typeof error === 'string' && error.indexOf(rid) !== -1) {
          return true;
        }
        if (nativeOnError instanceof Function) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeOnError.apply(this, [error].concat(args));
        }
        return false;
      };
    }

    var noop = function noop() {};

    var createHitFunction = function createHitFunction(source) {
      var getFuncBody = function getFuncBody(func) {
        var regexp = /(?:(?:\((?:.*)\))|(?:(?:[^ ]*) *=>))\s?({?[\s\S]*}?)/;
        var funcString = func.toString();
        return funcString.match(regexp)[1];
      };
      var getFuncArgs = function getFuncArgs(func) {
        return func.toString().match(/(?:\((.*)\))|(?:([^ ]*) *=>)/).slice(1, 3).find(function (capture) {
          return typeof capture === 'string';
        }).split(/, */).filter(function (arg) {
          return arg !== '';
        }).map(function (arg) {
          return arg.replace(/\/\*.*\*\//, '');
        });
      };
      var stringToFunc = function stringToFunc(str) {
        if (!str) {
          return function () {};
        }
        var body = '';
        var args = '';
        var hitArgs = getFuncArgs(str);
        if (hitArgs.length > 0) {
          body = getFuncBody(str);
          args = hitArgs;
        }
        if (args && body) {
          return Function.apply(null, args.concat(body));
        }
        return new Function("(".concat(str, ")()"));
      };
      var hit = source.hit;
      var func = stringToFunc(hit);
      return func.bind(null, source);
    };



    var dependencies = /*#__PURE__*/Object.freeze({
        randomId: randomId,
        setPropertyAccess: setPropertyAccess,
        getPropertyInChain: getPropertyInChain,
        escapeRegExp: escapeRegExp,
        toRegExp: toRegExp,
        createOnErrorHandler: createOnErrorHandler,
        noop: noop,
        createHitFunction: createHitFunction
    });

    function log() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      console.log(args);
    }
    log.names = ['log'];

    function abortOnPropertyRead(source, property) {
      if (!property) {
        return;
      }
      var hit = createHitFunction(source);
      var rid = randomId();
      var abort = function abort() {
        hit();
        throw new ReferenceError(rid);
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          get: abort,
          set: function set() {}
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortOnPropertyRead.names = ['abort-on-property-read', 'ubo-abort-on-property-read.js', 'abp-abort-on-property-read'];
    abortOnPropertyRead.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, createHitFunction];

    function abortOnPropertyWrite(source, property) {
      if (!property) {
        return;
      }
      var hit = createHitFunction(source);
      var rid = randomId();
      var abort = function abort() {
        hit();
        throw new ReferenceError(rid);
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          set: abort
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortOnPropertyWrite.names = ['abort-on-property-write', 'ubo-abort-on-property-write.js', 'abp-abort-on-property-write'];
    abortOnPropertyWrite.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, createHitFunction];

    function preventSetTimeout(source, match, delay) {
      var hit = createHitFunction(source);
      var nativeTimeout = window.setTimeout;
      delay = parseInt(delay, 10);
      delay = Number.isNaN(delay) ? null : delay;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var timeoutWrapper = function timeoutWrapper(cb, d) {
        if ((!delay || d === delay) && match.test(cb.toString())) {
          hit();
          return nativeTimeout(function () {}, d);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeTimeout.apply(window, [cb, d].concat(args));
      };
      window.setTimeout = timeoutWrapper;
    }
    preventSetTimeout.names = ['prevent-setTimeout', 'ubo-setTimeout-defuser.js'];
    preventSetTimeout.injections = [toRegExp, createHitFunction];

    function preventSetInterval(source, match, interval) {
      var hit = createHitFunction(source);
      var nativeInterval = window.setInterval;
      interval = parseInt(interval, 10);
      interval = Number.isNaN(interval) ? null : interval;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var intervalWrapper = function intervalWrapper(cb, d) {
        if ((!interval || d === interval) && match.test(cb.toString())) {
          hit();
          return nativeInterval(function () {}, d);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeInterval.apply(window, [cb, d].concat(args));
      };
      window.setInterval = intervalWrapper;
    }
    preventSetInterval.names = ['prevent-setInterval', 'ubo-setInterval-defuser.js'];
    preventSetInterval.injections = [toRegExp, createHitFunction];

    function preventWindowOpen(source) {
      var inverse = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var match = arguments.length > 2 ? arguments[2] : undefined;
      var nativeOpen = window.open;
      var hit = createHitFunction(source);
      inverse = inverse ? !+inverse : inverse;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var openWrapper = function openWrapper(str) {
        if (inverse === match.test(str)) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeOpen.apply(window, [str].concat(args));
        }
        hit();
      };
      window.open = openWrapper;
    }
    preventWindowOpen.names = ['prevent-window-open', 'ubo-window.open-defuser.js'];
    preventWindowOpen.injections = [toRegExp, createHitFunction];

    function abortCurrentInlineScript(source, property) {
      var search = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var regex = search ? toRegExp(search) : null;
      var rid = randomId();
      var hit = createHitFunction(source);
      var getCurrentScript = function getCurrentScript() {
        if (!document.currentScript) {
          var scripts = document.getElementsByTagName('script');
          return scripts[scripts.length - 1];
        }
        return document.currentScript;
      };
      var ourScript = getCurrentScript();
      var abort = function abort() {
        var scriptEl = getCurrentScript();
        if (scriptEl instanceof HTMLScriptElement && scriptEl.textContent.length > 0 && scriptEl !== ourScript && (!regex || regex.test(scriptEl.textContent))) {
          hit();
          throw new ReferenceError(rid);
        }
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        var currentValue = base[prop];
        setPropertyAccess(base, prop, {
          set: function set(value) {
            abort();
            currentValue = value;
          },
          get: function get() {
            abort();
            return currentValue;
          }
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortCurrentInlineScript.names = ['abort-current-inline-script', 'ubo-abort-current-inline-script.js', 'abp-abort-current-inline-script'];
    abortCurrentInlineScript.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp, createOnErrorHandler, createHitFunction];

    function setConstant(source, property, value) {
      if (!property) {
        return;
      }
      var constantValue;
      if (value === 'undefined') {
        constantValue = undefined;
      } else if (value === 'false') {
        constantValue = false;
      } else if (value === 'true') {
        constantValue = true;
      } else if (value === 'null') {
        constantValue = null;
      } else if (value === 'noopFunc') {
        constantValue = function constantValue() {};
      } else if (value === 'trueFunc') {
        constantValue = function constantValue() {
          return true;
        };
      } else if (value === 'falseFunc') {
        constantValue = function constantValue() {
          return false;
        };
      } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (Number.isNaN(constantValue)) {
          return;
        }
        if (Math.abs(constantValue) > 0x7FFF) {
          return;
        }
      } else if (value === '') {
        constantValue = '';
      } else {
        return;
      }
      var hit = createHitFunction(source);
      var canceled = false;
      var mustCancel = function mustCancel(value) {
        if (canceled) {
          return canceled;
        }
        canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue;
        return canceled;
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        if (mustCancel(base[prop])) {
          return;
        }
        hit();
        setPropertyAccess(base, prop, {
          get: function get() {
            return constantValue;
          },
          set: function set(a) {
            if (mustCancel(a)) {
              constantValue = a;
            }
          }
        });
      };
      setChainPropAccess(window, property);
    }
    setConstant.names = ['set-constant', 'ubo-set-constant.js'];
    setConstant.injections = [getPropertyInChain, setPropertyAccess, createHitFunction];

    function removeCookie(source, match) {
      var hit = createHitFunction(source);
      var regex = match ? toRegExp(match) : toRegExp('/.?/');
      var removeCookieFromHost = function removeCookieFromHost(cookieName, hostName) {
        var cookieSpec = "".concat(cookieName, "=");
        var domain1 = "; domain=".concat(hostName);
        var domain2 = "; domain=.".concat(hostName);
        var path = '; path=/';
        var expiration = '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = cookieSpec + expiration;
        document.cookie = cookieSpec + domain1 + expiration;
        document.cookie = cookieSpec + domain2 + expiration;
        document.cookie = cookieSpec + path + expiration;
        document.cookie = cookieSpec + domain1 + path + expiration;
        document.cookie = cookieSpec + domain2 + path + expiration;
        hit();
      };
      var rmCookie = function rmCookie() {
        document.cookie.split(';').forEach(function (cookieStr) {
          var pos = cookieStr.indexOf('=');
          if (pos === -1) {
            return;
          }
          var cookieName = cookieStr.slice(0, pos).trim();
          if (!regex.test(cookieName)) {
            return;
          }
          var hostParts = document.location.hostname.split('.');
          for (var i = 0; i < hostParts.length - 1; i += 1) {
            var hostName = hostParts.slice(i).join('.');
            if (hostName) {
              removeCookieFromHost(cookieName, hostName);
            }
          }
        });
      };
      rmCookie();
      window.addEventListener('beforeunload', rmCookie);
    }
    removeCookie.names = ['remove-cookie', 'ubo-cookie-remover.js'];
    removeCookie.injections = [toRegExp, createHitFunction];

    function preventAddEventListener(source, event, funcStr) {
      var hit = createHitFunction(source);
      event = event ? toRegExp(event) : toRegExp('/.?/');
      funcStr = funcStr ? toRegExp(funcStr) : toRegExp('/.?/');
      var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(eventName, callback) {
        if (event.test(eventName.toString()) && funcStr.test(callback.toString())) {
          hit();
          return undefined;
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(this, [eventName, callback].concat(args));
      }
      window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
    }
    preventAddEventListener.names = ['prevent-addEventListener', 'ubo-addEventListener-defuser.js'];
    preventAddEventListener.injections = [toRegExp, createHitFunction];

    function preventBab(source) {
      var _this = this;
      var hit = createHitFunction(source);
      var nativeSetTimeout = window.setTimeout;
      var babRegex = /\.bab_elementid.$/;
      window.setTimeout = function (callback) {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeSetTimeout.call.apply(nativeSetTimeout, [_this, callback].concat(args));
        }
        hit();
      };
      var signatures = [['blockadblock'], ['babasbm'], [/getItem\('babn'\)/], ['getElementById', 'String.fromCharCode', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'charAt', 'DOMContentLoaded', 'AdBlock', 'addEventListener', 'doScroll', 'fromCharCode', '<<2|r>>4', 'sessionStorage', 'clientWidth', 'localStorage', 'Math', 'random']];
      var check = function check(str) {
        for (var i = 0; i < signatures.length; i += 1) {
          var tokens = signatures[i];
          var match = 0;
          for (var j = 0; j < tokens.length; j += 1) {
            var token = tokens[j];
            var found = token instanceof RegExp ? token.test(str) : str.includes(token);
            if (found) {
              match += 1;
            }
          }
          if (match / tokens.length >= 0.8) {
            return true;
          }
        }
        return false;
      };
      var nativeEval = window.eval;
      window.eval = function (str) {
        if (!check(str)) {
          return nativeEval(str);
        }
        hit();
        var bodyEl = document.body;
        if (bodyEl) {
          bodyEl.style.removeProperty('visibility');
        }
        var el = document.getElementById('babasbmsgx');
        if (el) {
          el.parentNode.removeChild(el);
        }
      };
    }
    preventBab.names = ['prevent-bab', 'ubo-bab-defuser.js'];
    preventBab.injections = [createHitFunction];

    function nowebrtc(source) {
      var hit = createHitFunction(source);
      var propertyName = '';
      if (window.RTCPeerConnection) {
        propertyName = 'RTCPeerConnection';
      } else if (window.webkitRTCPeerConnection) {
        propertyName = 'webkitRTCPeerConnection';
      }
      if (propertyName === '') {
        return;
      }
      var rtcReplacement = function rtcReplacement(config) {
        hit("Document tried to create an RTCPeerConnection: ".concat(config));
      };
      var noop$$1 = function noop$$1() {};
      rtcReplacement.prototype = {
        close: noop$$1,
        createDataChannel: noop$$1,
        createOffer: noop$$1,
        setRemoteDescription: noop$$1
      };
      var rtc = window[propertyName];
      window[propertyName] = rtcReplacement;
      if (rtc.prototype) {
        rtc.prototype.createDataChannel = function (a, b) {
          return {
            close: noop$$1,
            send: noop$$1
          };
        }.bind(null);
      }
    }
    nowebrtc.names = ['nowebrtc', 'ubo-nowebrtc.js'];
    nowebrtc.injections = [createHitFunction];

    function logAddEventListener(source) {
      var hit = createHitFunction(source);
      var log = console.log.bind(console);
      var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(eventName, callback) {
        log("addEventListener(\"".concat(eventName, "\", ").concat(callback.toString(), ")"));
        hit();
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(this, [eventName, callback].concat(args));
      }
      window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
    }
    logAddEventListener.names = ['log-addEventListener', 'addEventListener-logger.js'];
    logAddEventListener.injections = [createHitFunction];

    function logSetInterval(source) {
      var hit = createHitFunction(source);
      var nativeSetInterval = window.setInterval;
      var log = console.log.bind(console);
      function setIntervalWrapper(callback, timeout) {
        hit();
        log("setInterval(\"".concat(callback.toString(), "\", ").concat(timeout, ")"));
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeSetInterval.apply(window, [callback, timeout].concat(args));
      }
      window.setInterval = setIntervalWrapper;
    }
    logSetInterval.names = ['log-setInterval', 'setInterval-logger.js'];
    logSetInterval.injections = [createHitFunction];

    function logSetTimeout(source) {
      var hit = createHitFunction(source);
      var nativeSetTimeout = window.setTimeout;
      var log = console.log.bind(console);
      function setTimeoutWrapper(callback, timeout) {
        hit();
        log("setTimeout(\"".concat(callback.toString(), "\", ").concat(timeout, ")"));
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeSetTimeout.apply(window, [callback, timeout].concat(args));
      }
      window.setTimeout = setTimeoutWrapper;
    }
    logSetTimeout.names = ['log-setTimeout', 'setTimeout-logger.js'];
    logSetTimeout.injections = [createHitFunction];

    function logEval(source) {
      var hit = createHitFunction(source);
      var log = console.log.bind(console);
      var nativeEval = window.eval;
      function evalWrapper(str) {
        hit();
        log("eval(\"".concat(str, "\")"));
        return nativeEval(str);
      }
      window.eval = evalWrapper;
      var nativeFunction = window.Function;
      function FunctionWrapper() {
        hit();
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        log("new Function(".concat(args.join(', '), ")"));
        return nativeFunction.apply(this, [].concat(args));
      }
      FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
      FunctionWrapper.prototype.constructor = FunctionWrapper;
      window.Function = FunctionWrapper;
    }
    logEval.names = ['log-eval'];
    logEval.injections = [createHitFunction];

    function noeval(source) {
      var hit = createHitFunction(source);
      window.eval = function evalWrapper(s) {
        hit("AdGuard has prevented eval:\n".concat(s));
      }.bind();
    }
    noeval.names = ['noeval.js', 'silent-noeval.js', 'noeval'];
    noeval.injections = [createHitFunction];

    function preventEvalIf(source, search) {
      var hit = createHitFunction(source);
      search = search ? toRegExp(search) : toRegExp('/.?/');
      var nativeEval = window.eval;
      window.eval = function (payload) {
        if (!search.test(payload.toString())) {
          return nativeEval.call(window, payload);
        }
        hit(payload);
        return undefined;
      }.bind(window);
    }
    preventEvalIf.names = ['noeval-if.js', 'prevent-eval-if'];
    preventEvalIf.injections = [toRegExp, createHitFunction];

    function preventFab(source) {
      var hit = createHitFunction(source);
      hit();
      var Fab = function Fab() {};
      Fab.prototype.check = noop;
      Fab.prototype.clearEvent = noop;
      Fab.prototype.emitEvent = noop;
      Fab.prototype.on = function (a, b) {
        if (!a) {
          b();
        }
        return this;
      };
      Fab.prototype.onDetected = function () {
        return this;
      };
      Fab.prototype.onNotDetected = function (a) {
        a();
        return this;
      };
      Fab.prototype.setOption = noop;
      window.FuckAdBlock = window.BlockAdBlock = Fab;
      window.fuckAdBlock = window.blockAdBlock = new Fab();
    }
    preventFab.names = ['prevent-fab-3.2.0', 'fuckadblock.js-3.2.0'];
    preventFab.injections = [noop, createHitFunction];

    function setPopadsDummy(source) {
      var hit = createHitFunction(source);
      delete window.PopAds;
      delete window.popns;
      Object.defineProperties(window, {
        PopAds: {
          get: function get() {
            hit();
            return {};
          }
        },
        popns: {
          get: function get() {
            hit();
            return {};
          }
        }
      });
    }
    setPopadsDummy.names = ['set-popads-dummy', 'popads-dummy.js'];
    setPopadsDummy.injections = [createHitFunction];

    function preventPopadsNet(source) {
      var hit = createHitFunction(source);
      var rid = randomId();
      var throwError = function throwError() {
        throw new ReferenceError(rid);
      };
      delete window.PopAds;
      delete window.popns;
      Object.defineProperties(window, {
        PopAds: {
          set: throwError
        },
        popns: {
          set: throwError
        }
      });
      window.onerror = createOnErrorHandler(rid).bind();
      hit();
    }
    preventPopadsNet.names = ['prevent-popads-net', 'popads.net.js'];
    preventPopadsNet.injections = [createOnErrorHandler, randomId, createHitFunction];

    function preventAdfly(source) {
      var hit = createHitFunction(source);
      var isDigit = function isDigit(data) {
        return /^\d$/.test(data);
      };
      var handler = function handler(encodedURL) {
        var evenChars = '';
        var oddChars = '';
        for (var i = 0; i < encodedURL.length; i += 1) {
          if (i % 2 === 0) {
            evenChars += encodedURL.charAt(i);
          } else {
            oddChars = encodedURL.charAt(i) + oddChars;
          }
        }
        var data = (evenChars + oddChars).split('');
        for (var _i = 0; _i < data.length; _i += 1) {
          if (isDigit(data[_i])) {
            for (var ii = _i + 1; ii < data.length; ii += 1) {
              if (isDigit(data[ii])) {
                var temp = parseInt(data[_i], 10) ^ parseInt(data[ii], 10);
                if (temp < 10) {
                  data[_i] = temp.toString();
                }
                _i = ii;
                break;
              }
            }
          }
        }
        data = data.join('');
        var decodedURL = window.atob(data).slice(16, -16);
        window.stop();
        window.onbeforeunload = null;
        window.location.href = decodedURL;
      };
      var val;
      var applyHandler = true;
      var result = setPropertyAccess(window, 'ysmm', {
        configurable: false,
        set: function set(value) {
          if (applyHandler) {
            applyHandler = false;
            try {
              if (typeof value === 'string') {
                handler(value);
              }
            } catch (err) {}
          }
          val = value;
        },
        get: function get() {
          return val;
        }
      });
      if (result) {
        hit();
      } else {
        window.console.error('Failed to set up prevent-adfly scriptlet');
      }
    }
    preventAdfly.names = ['prevent-adfly', 'adfly-defuser.js'];
    preventAdfly.injections = [setPropertyAccess, createHitFunction];



    var scriptletList = /*#__PURE__*/Object.freeze({
        log: log,
        abortOnPropertyRead: abortOnPropertyRead,
        abortOnPropertyWrite: abortOnPropertyWrite,
        preventSetTimeout: preventSetTimeout,
        preventSetInterval: preventSetInterval,
        preventWindowOpen: preventWindowOpen,
        abortCurrentInlineScript: abortCurrentInlineScript,
        setConstant: setConstant,
        removeCookie: removeCookie,
        preventAddEventListener: preventAddEventListener,
        preventBab: preventBab,
        nowebrtc: nowebrtc,
        logAddEventListener: logAddEventListener,
        logSetInterval: logSetInterval,
        logSetTimeout: logSetTimeout,
        logEval: logEval,
        noeval: noeval,
        preventEvalIf: preventEvalIf,
        preventFab: preventFab,
        setPopadsDummy: setPopadsDummy,
        preventPopadsNet: preventPopadsNet,
        preventAdfly: preventAdfly
    });

    function attachDependencies(scriptlet) {
      var _scriptlet$injections = scriptlet.injections,
          injections = _scriptlet$injections === void 0 ? [] : _scriptlet$injections;
      return injections.reduce(function (accum, dep) {
        return "".concat(accum, "\n").concat(dependencies[dep.name]);
      }, scriptlet.toString());
    }
    function addScriptletCall(scriptlet, code) {
      return "".concat(code, ";\n        const updatedArgs = args ? [].concat(source).concat(args) : [source];\n        ").concat(scriptlet.name, ".apply(this, updatedArgs);\n    ");
    }
    function passSourceAndPropsToScriptlet(source, code) {
      if (source.hit) {
        source.hit = source.hit.toString();
      }
      var sourceString = JSON.stringify(source);
      var argsString = source.args ? "[".concat(source.args.map(JSON.stringify), "]") : undefined;
      var params = argsString ? "".concat(sourceString, ", ").concat(argsString) : sourceString;
      return "(function(source, args){\n".concat(code, "\n})(").concat(params, ");");
    }
    function wrapInNonameFunc(code) {
      return "function(source, args){\n".concat(code, "\n}");
    }
    function getScriptletByName(name) {
      return Object.values(scriptletList).find(function (s) {
        return s.names && s.names.includes(name);
      });
    }
    function isValidScriptletSource(source) {
      if (!source.name) {
        return false;
      }
      var scriptlet = getScriptletByName(source.name);
      if (!scriptlet) {
        return false;
      }
      return true;
    }
    function getScriptletCode(source) {
      if (!isValidScriptletSource(source)) {
        return null;
      }
      var scriptlet = getScriptletByName(source.name);
      var result = attachDependencies(scriptlet);
      result = addScriptletCall(scriptlet, result);
      result = source.engine === 'corelibs' ? wrapInNonameFunc(result) : passSourceAndPropsToScriptlet(source, result);
      return result;
    }

    scriptlets = function () {
      return {
        invoke: getScriptletCode
      };
    }();

}());

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
//# sourceMappingURL=scriptlets.js.map
