(function(source, args){
function NaverWcslog(source) {
  window.wcs_add = {};
  window.wcs_do = noopFunc;
  window.wcs = {
    inflow: noopFunc
  };
  hit(source);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }

  try {
    var _log = console.log.bind(console);

    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';

    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;

      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      } // delete all domains from ruleText and leave just rule part


      var rulePart = source.ruleText.slice(ruleStartIndex); // prepare applied scriptlet rule for specific domain

      prefix = "".concat(source.domainName).concat(rulePart);
    } // Used to check if scriptlet uses 'hit' function for logging


    var LOG_MARKER = 'log: ';

    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        _log("".concat(prefix, " message:\n").concat(message));
      } else {
        _log(message.slice(LOG_MARKER.length));
      }
    }

    _log("".concat(prefix, " trace start"));

    if (trace) {
      trace();
    }

    _log("".concat(prefix, " trace end"));
  } catch (e) {// try catch for Edge 15
    // In according to this issue https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/14495220/
    // console.log throws an error
  } // This is necessary for unit-tests only!


  if (typeof window.__debug === 'function') {
    window.__debug(source);
  }
}
function noopFunc() {}
const updatedArgs = args ? [].concat(source).concat(args) : [source];
try {
    NaverWcslog.apply(this, updatedArgs);
} catch (e) {
    console.log(e);
}
})({"name":"naver-wcslog","args":[]}, []);