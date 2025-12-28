var e = Object.defineProperty,
    t = (e, t) => () => (e && (t = e(e = 0)), t),
    n = (t, n) => { let r = {}; for (var i in t) e(r, i, { get: t[i], enumerable: !0 }); return n && e(r, Symbol.toStringTag, { value: `Module` }), r; },
    r = (e => typeof require < `u` ? require : typeof Proxy < `u` ? new Proxy(e, { get: (e, t) => (typeof require < `u` ? require : e)[t] }) : e)
        (function (e) { if (typeof require < `u`) return require.apply(this, arguments); throw Error('Calling `require` for "' + e + "\" in an environment that doesn't expose the `require` function."); }); export { n, r, t };

var e = Object.defineProperty,
    t = (e, t) => () => (e && (t = e(e = 0)), t),
    n = (t, n) => { // __exportAll from https://github.com/rolldown/rolldown/blob/main/crates/rolldown/src/runtime/runtime-base.js
        let r = {};
        for (var i in t)
            e(r, i, {
                get: t[i],
                enumerable: !0
            });
        return n && e(r, Symbol.toStringTag, { value: `Module` }), r;
    },
    r = (e => typeof require < `u` ? require : typeof Proxy < `u` ? new Proxy(e, { get: (e, t) => (typeof require < `u` ? require : e)[t] }) : e)
        (function (e) {
            if (typeof require < `u`)
                return require.apply(this, arguments);
            throw Error('Calling `require` for "' + e + "\" in an environment that doesn't expose the `require` function.");
        });
export { n, r, t };

/*
//https://github.com/rolldown/rolldown/blob/main/crates/rolldown/src/runtime/runtime-tail.js

// This fallback "require" function exists so that "typeof require" can
// naturally be "function" even in non-CommonJS environments since esbuild
// emulates a CommonJS environment (issue #1202). However, people want this
// shim to fall back to "globalThis.require" even if it's defined later
// (including property accesses such as "require.resolve") so we need to
// use a proxy (issue #1614).

export var __require =
    (x =>
        typeof require !== 'undefined'
            ? require
            : typeof Proxy !== 'undefined'
                ? new Proxy(x, { get: (a, b) => (typeof require !== 'undefined' ? require : a)[b], })
                : x
    )
        (function (x) {
            if (typeof require !== 'undefined') return require.apply(this, arguments);
            throw Error('Calling `require` for "' + x + '" in an environment that doesn\'t expose the `require` function.',);
        });
*/
