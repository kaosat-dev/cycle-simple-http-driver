'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createResponse$ = createResponse$;
exports.default = makeHttpDriver;

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
if (isNode) {
    var _XMLHttpRequest = require("xhr2").XMLHttpRequest;
}

function createResponse$(options) {
    var defaults = {
        method: 'get',
        encoding: 'utf8',
        mimeType: 'text/plain; charset=x-user-defined',
        responseType: undefined,
        timeout: undefined,
        send: undefined
    };
    options = Object.assign({}, defaults, options);

    var obs = new _rx2.default.Subject();

    var request = new XMLHttpRequest();

    function handleProgress(e) {
        [e].filter(function (e) {
            return e.lengthComputable;
        }).forEach(function (e) {
            obs.onNext({ progress: e.loaded / e.total, total: e.total });
        });
    }
    function handleComplete(e) {
        var response = request.response || request.responseText;

        response = options.responseType === 'json' ? JSON.parse(response) : response;
        obs.onNext({ response: response });
        obs.onCompleted();
    }

    function handleError(e) {
        console.log("error in httpDriver", e);
        obs.onError(e);
    }

    function handleAbort(e) {
        console.log("abort in httpDriver", e);
        obs.onError(e);
    }

    function handleTimeout(e) {
        console.log("timeout in httpDriver", e);
        obs.onError(e);
    }

    request.addEventListener("progress", handleProgress);
    request.addEventListener("load", handleComplete);
    request.addEventListener("error", handleError);
    request.addEventListener("abort", handleError);
    request.addEventListener("timeout", handleTimeout);

    request.open(options.method, options.url, true);
    if (options.mimeType !== null && request.overrideMimeType !== null) {
        request.overrideMimeType(options.mimeType);
    }
    request.timeout = options.timeout;
    request.responseType = options.responseType;

    request.send(options.send);

    return obs;
}

function makeHttpDriver() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? { eager: false } : arguments[0];

    var _ref$eager = _ref.eager;
    var eager = _ref$eager === undefined ? false : _ref$eager;


    return function httpDriver(request$) {
        var response$$ = request$.map(function (reqOptions) {
            var response$ = createResponse$(reqOptions);
            if (eager || reqOptions.eager) {
                response$ = response$.replay(null, 1);
                response$.connect();
            }
            response$.request = reqOptions;
            return response$;
        }).replay(null, 1);
        response$$.connect();
        return response$$;
    };
}