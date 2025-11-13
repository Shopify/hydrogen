var privacyBanner = (function (n) {
  'use strict';
  var e = function () {
    return (
      (e =
        Object.assign ||
        function (n) {
          for (var e, t = 1, o = arguments.length; t < o; t++)
            for (var r in (e = arguments[t]))
              Object.prototype.hasOwnProperty.call(e, r) && (n[r] = e[r]);
          return n;
        }),
      e.apply(this, arguments)
    );
  };
  function t(n, e, t, o) {
    return new (t || (t = Promise))(function (r, a) {
      function i(n) {
        try {
          s(o.next(n));
        } catch (n) {
          a(n);
        }
      }
      function c(n) {
        try {
          s(o.throw(n));
        } catch (n) {
          a(n);
        }
      }
      function s(n) {
        var e;
        n.done
          ? r(n.value)
          : ((e = n.value),
            e instanceof t
              ? e
              : new t(function (n) {
                  n(e);
                })).then(i, c);
      }
      s((o = o.apply(n, e || [])).next());
    });
  }
  function o(n, e) {
    var t,
      o,
      r,
      a = {
        label: 0,
        sent: function () {
          if (1 & r[0]) throw r[1];
          return r[1];
        },
        trys: [],
        ops: [],
      },
      i = Object.create(
        ('function' == typeof Iterator ? Iterator : Object).prototype,
      );
    return (
      (i.next = c(0)),
      (i.throw = c(1)),
      (i.return = c(2)),
      'function' == typeof Symbol &&
        (i[Symbol.iterator] = function () {
          return this;
        }),
      i
    );
    function c(c) {
      return function (s) {
        return (function (c) {
          if (t) throw new TypeError('Generator is already executing.');
          for (; i && ((i = 0), c[0] && (a = 0)), a; )
            try {
              if (
                ((t = 1),
                o &&
                  (r =
                    2 & c[0]
                      ? o.return
                      : c[0]
                        ? o.throw || ((r = o.return) && r.call(o), 0)
                        : o.next) &&
                  !(r = r.call(o, c[1])).done)
              )
                return r;
              switch (((o = 0), r && (c = [2 & c[0], r.value]), c[0])) {
                case 0:
                case 1:
                  r = c;
                  break;
                case 4:
                  return (a.label++, {value: c[1], done: !1});
                case 5:
                  (a.label++, (o = c[1]), (c = [0]));
                  continue;
                case 7:
                  ((c = a.ops.pop()), a.trys.pop());
                  continue;
                default:
                  if (
                    !((r = a.trys),
                    (r = r.length > 0 && r[r.length - 1]) ||
                      (6 !== c[0] && 2 !== c[0]))
                  ) {
                    a = 0;
                    continue;
                  }
                  if (3 === c[0] && (!r || (c[1] > r[0] && c[1] < r[3]))) {
                    a.label = c[1];
                    break;
                  }
                  if (6 === c[0] && a.label < r[1]) {
                    ((a.label = r[1]), (r = c));
                    break;
                  }
                  if (r && a.label < r[2]) {
                    ((a.label = r[2]), a.ops.push(c));
                    break;
                  }
                  (r[2] && a.ops.pop(), a.trys.pop());
                  continue;
              }
              c = e.call(n, a);
            } catch (n) {
              ((c = [6, n]), (o = 0));
            } finally {
              t = r = 0;
            }
          if (5 & c[0]) throw c[1];
          return {value: c[0] ? c[1] : void 0, done: !0};
        })([c, s]);
      };
    }
  }
  'function' == typeof SuppressedError && SuppressedError;
  var r = 'trackingConsentAccepted',
    a = 'trackingConsentDeclined',
    i = 'firstPartyMarketingConsentAccepted',
    c = 'thirdPartyMarketingConsentAccepted',
    s = 'analyticsConsentAccepted',
    l = 'preferencesConsentAccepted',
    u = 'firstPartyMarketingConsentDeclined',
    d = 'thirdPartyMarketingConsentDeclined',
    p = 'analyticsConsentDeclined',
    f = 'preferencesConsentDeclined',
    h = 'visitorConsentCollected',
    m = 'consentTrackingApiLoaded',
    y = 'yes',
    g = 'no',
    v = 'no_interaction',
    b = '',
    w = '',
    C = '1',
    x = '0',
    k = 'p',
    _ = 'a',
    I = 'm',
    D = 't',
    E = 'm',
    O = 'a',
    A = 'p',
    B = 's',
    T = 'marketing',
    P = 'analytics',
    S = 'preferences',
    M = 'sale_of_data',
    R = 'email',
    j = 'headlessStorefront',
    H = 'rootDomain',
    L = 'checkoutRootDomain',
    N = 'storefrontRootDomain',
    F = 'storefrontAccessToken',
    W = 'isExtensionToken',
    q = 'metafields';
  function U(n, e) {
    ((this.v = n), (this.k = e));
  }
  function z(n, e) {
    (null == e || e > n.length) && (e = n.length);
    for (var t = 0, o = Array(e); t < e; t++) o[t] = n[t];
    return o;
  }
  function G(n, e, t, o, r, a, i) {
    try {
      var c = n[a](i),
        s = c.value;
    } catch (n) {
      return void t(n);
    }
    c.done ? e(s) : Promise.resolve(s).then(o, r);
  }
  function J(n) {
    return function () {
      var e = this,
        t = arguments;
      return new Promise(function (o, r) {
        var a = n.apply(e, t);
        function i(n) {
          G(a, o, r, i, c, 'next', n);
        }
        function c(n) {
          G(a, o, r, i, c, 'throw', n);
        }
        i(void 0);
      });
    };
  }
  function V(n, e) {
    for (var t = 0; t < e.length; t++) {
      var o = e[t];
      ((o.enumerable = o.enumerable || !1),
        (o.configurable = !0),
        'value' in o && (o.writable = !0),
        Object.defineProperty(n, ln(o.key), o));
    }
  }
  function K(n, e, t) {
    return (
      e && V(n.prototype, e),
      t && V(n, t),
      Object.defineProperty(n, 'prototype', {writable: !1}),
      n
    );
  }
  function X(n, e, t) {
    return (
      (e = ln(e)) in n
        ? Object.defineProperty(n, e, {
            value: t,
            enumerable: !0,
            configurable: !0,
            writable: !0,
          })
        : (n[e] = t),
      n
    );
  }
  function $(n) {
    return (
      ($ = Object.setPrototypeOf
        ? Object.getPrototypeOf.bind()
        : function (n) {
            return n.__proto__ || Object.getPrototypeOf(n);
          }),
      $(n)
    );
  }
  function Z(n, e) {
    if ('function' != typeof e && null !== e)
      throw new TypeError('Super expression must either be null or a function');
    ((n.prototype = Object.create(e && e.prototype, {
      constructor: {value: n, writable: !0, configurable: !0},
    })),
      Object.defineProperty(n, 'prototype', {writable: !1}),
      e && cn(n, e));
  }
  function Y() {
    try {
      var n = !Boolean.prototype.valueOf.call(
        Reflect.construct(Boolean, [], function () {}),
      );
    } catch (n) {}
    return (Y = function () {
      return !!n;
    })();
  }
  function Q() {
    /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
    var n,
      e,
      t = 'function' == typeof Symbol ? Symbol : {},
      o = t.iterator || '@@iterator',
      r = t.toStringTag || '@@toStringTag';
    function a(t, o, r, a) {
      var s = o && o.prototype instanceof c ? o : c,
        l = Object.create(s.prototype);
      return (
        on(
          l,
          '_invoke',
          (function (t, o, r) {
            var a,
              c,
              s,
              l = 0,
              u = r || [],
              d = !1,
              p = {
                p: 0,
                n: 0,
                v: n,
                a: f,
                f: f.bind(n, 4),
                d: function (e, t) {
                  return ((a = e), (c = 0), (s = n), (p.n = t), i);
                },
              };
            function f(t, o) {
              for (c = t, s = o, e = 0; !d && l && !r && e < u.length; e++) {
                var r,
                  a = u[e],
                  f = p.p,
                  h = a[2];
                t > 3
                  ? (r = h === o) &&
                    ((s = a[(c = a[4]) ? 5 : ((c = 3), 3)]), (a[4] = a[5] = n))
                  : a[0] <= f &&
                    ((r = t < 2 && f < a[1])
                      ? ((c = 0), (p.v = o), (p.n = a[1]))
                      : f < h &&
                        (r = t < 3 || a[0] > o || o > h) &&
                        ((a[4] = t), (a[5] = o), (p.n = h), (c = 0)));
              }
              if (r || t > 1) return i;
              throw ((d = !0), o);
            }
            return function (r, u, h) {
              if (l > 1) throw TypeError('Generator is already running');
              for (
                d && 1 === u && f(u, h), c = u, s = h;
                (e = c < 2 ? n : s) || !d;

              ) {
                a ||
                  (c
                    ? c < 3
                      ? (c > 1 && (p.n = -1), f(c, s))
                      : (p.n = s)
                    : (p.v = s));
                try {
                  if (((l = 2), a)) {
                    if ((c || (r = 'next'), (e = a[r]))) {
                      if (!(e = e.call(a, s)))
                        throw TypeError('iterator result is not an object');
                      if (!e.done) return e;
                      ((s = e.value), c < 2 && (c = 0));
                    } else
                      (1 === c && (e = a.return) && e.call(a),
                        c < 2 &&
                          ((s = TypeError(
                            "The iterator does not provide a '" +
                              r +
                              "' method",
                          )),
                          (c = 1)));
                    a = n;
                  } else if ((e = (d = p.n < 0) ? s : t.call(o, p)) !== i)
                    break;
                } catch (e) {
                  ((a = n), (c = 1), (s = e));
                } finally {
                  l = 1;
                }
              }
              return {value: e, done: d};
            };
          })(t, r, a),
          !0,
        ),
        l
      );
    }
    var i = {};
    function c() {}
    function s() {}
    function l() {}
    e = Object.getPrototypeOf;
    var u = [][o]
        ? e(e([][o]()))
        : (on((e = {}), o, function () {
            return this;
          }),
          e),
      d = (l.prototype = c.prototype = Object.create(u));
    function p(n) {
      return (
        Object.setPrototypeOf
          ? Object.setPrototypeOf(n, l)
          : ((n.__proto__ = l), on(n, r, 'GeneratorFunction')),
        (n.prototype = Object.create(d)),
        n
      );
    }
    return (
      (s.prototype = l),
      on(d, 'constructor', l),
      on(l, 'constructor', s),
      (s.displayName = 'GeneratorFunction'),
      on(l, r, 'GeneratorFunction'),
      on(d),
      on(d, r, 'Generator'),
      on(d, o, function () {
        return this;
      }),
      on(d, 'toString', function () {
        return '[object Generator]';
      }),
      (Q = function () {
        return {w: a, m: p};
      })()
    );
  }
  function nn(n, e, t, o, r) {
    var a = en(n, e, t, o, r);
    return a.next().then(function (n) {
      return n.done ? n.value : a.next();
    });
  }
  function en(n, e, t, o, r) {
    return new tn(Q().w(n, e, t, o), r || Promise);
  }
  function tn(n, e) {
    function t(o, r, a, i) {
      try {
        var c = n[o](r),
          s = c.value;
        return s instanceof U
          ? e.resolve(s.v).then(
              function (n) {
                t('next', n, a, i);
              },
              function (n) {
                t('throw', n, a, i);
              },
            )
          : e.resolve(s).then(
              function (n) {
                ((c.value = n), a(c));
              },
              function (n) {
                return t('throw', n, a, i);
              },
            );
      } catch (n) {
        i(n);
      }
    }
    var o;
    (this.next ||
      (on(tn.prototype),
      on(
        tn.prototype,
        ('function' == typeof Symbol && Symbol.asyncIterator) ||
          '@asyncIterator',
        function () {
          return this;
        },
      )),
      on(
        this,
        '_invoke',
        function (n, r, a) {
          function i() {
            return new e(function (e, o) {
              t(n, a, e, o);
            });
          }
          return (o = o ? o.then(i, i) : i());
        },
        !0,
      ));
  }
  function on(n, e, t, o) {
    var r = Object.defineProperty;
    try {
      r({}, '', {});
    } catch (n) {
      r = 0;
    }
    ((on = function (n, e, t, o) {
      if (e)
        r
          ? r(n, e, {value: t, enumerable: !o, configurable: !o, writable: !o})
          : (n[e] = t);
      else {
        function a(e, t) {
          on(n, e, function (n) {
            return this._invoke(e, t, n);
          });
        }
        (a('next', 0), a('throw', 1), a('return', 2));
      }
    }),
      on(n, e, t, o));
  }
  function rn(n) {
    var e = Object(n),
      t = [];
    for (var o in e) t.unshift(o);
    return function n() {
      for (; t.length; )
        if ((o = t.pop()) in e) return ((n.value = o), (n.done = !1), n);
      return ((n.done = !0), n);
    };
  }
  function an(n) {
    if (null != n) {
      var e =
          n[('function' == typeof Symbol && Symbol.iterator) || '@@iterator'],
        t = 0;
      if (e) return e.call(n);
      if ('function' == typeof n.next) return n;
      if (!isNaN(n.length))
        return {
          next: function () {
            return (
              n && t >= n.length && (n = void 0),
              {value: n && n[t++], done: !n}
            );
          },
        };
    }
    throw new TypeError(typeof n + ' is not iterable');
  }
  function cn(n, e) {
    return (
      (cn = Object.setPrototypeOf
        ? Object.setPrototypeOf.bind()
        : function (n, e) {
            return ((n.__proto__ = e), n);
          }),
      cn(n, e)
    );
  }
  function sn(n, e) {
    return (
      (function (n) {
        if (Array.isArray(n)) return n;
      })(n) ||
      (function (n, e) {
        var t =
          null == n
            ? null
            : ('undefined' != typeof Symbol && n[Symbol.iterator]) ||
              n['@@iterator'];
        if (null != t) {
          var o,
            r,
            a,
            i,
            c = [],
            s = !0,
            l = !1;
          try {
            if (((a = (t = t.call(n)).next), 0 === e)) {
              if (Object(t) !== t) return;
              s = !1;
            } else
              for (
                ;
                !(s = (o = a.call(t)).done) &&
                (c.push(o.value), c.length !== e);
                s = !0
              );
          } catch (n) {
            ((l = !0), (r = n));
          } finally {
            try {
              if (!s && null != t.return && ((i = t.return()), Object(i) !== i))
                return;
            } finally {
              if (l) throw r;
            }
          }
          return c;
        }
      })(n, e) ||
      (function (n, e) {
        if (n) {
          if ('string' == typeof n) return z(n, e);
          var t = {}.toString.call(n).slice(8, -1);
          return (
            'Object' === t && n.constructor && (t = n.constructor.name),
            'Map' === t || 'Set' === t
              ? Array.from(n)
              : 'Arguments' === t ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)
                ? z(n, e)
                : void 0
          );
        }
      })(n, e) ||
      (function () {
        throw new TypeError(
          'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.',
        );
      })()
    );
  }
  function ln(n) {
    var e = (function (n, e) {
      if ('object' != typeof n || !n) return n;
      var t = n[Symbol.toPrimitive];
      if (void 0 !== t) {
        var o = t.call(n, e);
        if ('object' != typeof o) return o;
        throw new TypeError('@@toPrimitive must return a primitive value.');
      }
      return ('string' === e ? String : Number)(n);
    })(n, 'string');
    return 'symbol' == typeof e ? e : e + '';
  }
  function un(n) {
    return (
      (un =
        'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
          ? function (n) {
              return typeof n;
            }
          : function (n) {
              return n &&
                'function' == typeof Symbol &&
                n.constructor === Symbol &&
                n !== Symbol.prototype
                ? 'symbol'
                : typeof n;
            }),
      un(n)
    );
  }
  function dn(n) {
    var e = 'function' == typeof Map ? new Map() : void 0;
    return (
      (dn = function (n) {
        if (
          null === n ||
          !(function (n) {
            try {
              return -1 !== Function.toString.call(n).indexOf('[native code]');
            } catch (e) {
              return 'function' == typeof n;
            }
          })(n)
        )
          return n;
        if ('function' != typeof n)
          throw new TypeError(
            'Super expression must either be null or a function',
          );
        if (void 0 !== e) {
          if (e.has(n)) return e.get(n);
          e.set(n, t);
        }
        function t() {
          return (function (n, e, t) {
            if (Y()) return Reflect.construct.apply(null, arguments);
            var o = [null];
            o.push.apply(o, e);
            var r = new (n.bind.apply(n, o))();
            return (t && cn(r, t.prototype), r);
          })(n, arguments, $(this).constructor);
        }
        return (
          (t.prototype = Object.create(n.prototype, {
            constructor: {
              value: t,
              enumerable: !1,
              writable: !0,
              configurable: !0,
            },
          })),
          cn(t, n)
        );
      }),
      dn(n)
    );
  }
  function pn() {
    var n = Q(),
      e = n.m(pn),
      t = (Object.getPrototypeOf ? Object.getPrototypeOf(e) : e.__proto__)
        .constructor;
    function o(n) {
      var e = 'function' == typeof n && n.constructor;
      return (
        !!e && (e === t || 'GeneratorFunction' === (e.displayName || e.name))
      );
    }
    var r = {throw: 1, return: 2, break: 3, continue: 3};
    function a(n) {
      var e, t;
      return function (o) {
        (e ||
          ((e = {
            stop: function () {
              return t(o.a, 2);
            },
            catch: function () {
              return o.v;
            },
            abrupt: function (n, e) {
              return t(o.a, r[n], e);
            },
            delegateYield: function (n, r, a) {
              return ((e.resultName = r), t(o.d, an(n), a));
            },
            finish: function (n) {
              return t(o.f, n);
            },
          }),
          (t = function (n, t, r) {
            ((o.p = e.prev), (o.n = e.next));
            try {
              return n(t, r);
            } finally {
              e.next = o.n;
            }
          })),
          e.resultName && ((e[e.resultName] = o.v), (e.resultName = void 0)),
          (e.sent = o.v),
          (e.next = o.n));
        try {
          return n.call(this, e);
        } finally {
          ((o.p = e.prev), (o.n = e.next));
        }
      };
    }
    return (pn = function () {
      return {
        wrap: function (e, t, o, r) {
          return n.w(a(e), t, o, r && r.reverse());
        },
        isGeneratorFunction: o,
        mark: n.m,
        awrap: function (n, e) {
          return new U(n, e);
        },
        AsyncIterator: tn,
        async: function (n, e, t, r, i) {
          return (o(e) ? en : nn)(a(n), e, t, r, i);
        },
        keys: rn,
        values: an,
      };
    })();
  }
  function fn(n, e) {
    if (null === n) return 'null';
    if (Array.isArray(n))
      return (
        '[' +
        n
          .map(function (n) {
            return fn(n, !0);
          })
          .join(',') +
        ']'
      );
    if ('object' === un(n)) {
      var t = [];
      for (var o in n)
        n.hasOwnProperty(o) &&
          void 0 !== n[o] &&
          t.push(o + ':' + fn(n[o], !0));
      var r = t.join(',');
      return e ? '{' + r + '}' : r;
    }
    return 'string' == typeof n ? '"' + n + '"' : '' + n;
  }
  function hn(n) {
    try {
      return decodeURIComponent(n);
    } catch (n) {
      return '';
    }
  }
  var mn = function () {
      return 'undefined' != typeof __CtaTestEnv__ && 'true' === __CtaTestEnv__;
    },
    yn = K(function () {});
  ((yn.warn = function (n) {
    mn() || console.warn(n);
  }),
    (yn.error = function (n) {
      mn() || console.error(n);
    }),
    (yn.info = function (n) {
      mn() || console.info(n);
    }),
    (yn.debug = function (n) {
      mn() || console.debug(n);
    }),
    (yn.trace = function (n) {
      mn() || console.trace(n);
    }));
  var gn = yn,
    vn = '_tracking_consent';
  function bn(n, e) {
    void 0 === e && (e = !1);
    for (
      var t = (function () {
          try {
            return document.cookie;
          } catch (n) {
            return !1;
          }
        })()
          ? document.cookie.split('; ')
          : [],
        o = 0;
      o < t.length;
      o++
    ) {
      var r = sn(t[o].split('='), 2),
        a = r[0],
        i = r[1];
      if (n === hn(a)) return hn(i);
    }
    if (
      e &&
      '_tracking_consent' === n &&
      !window.localStorage.getItem('tracking_consent_fetched')
    ) {
      if (mn()) return;
      return (
        console.debug('_tracking_consent missing'),
        (function (n) {
          void 0 === n && (n = '/');
          var e = new XMLHttpRequest();
          (e.open('HEAD', n, !1), (e.withCredentials = !0), e.send());
        })(),
        window.localStorage.setItem('tracking_consent_fetched', 'true'),
        bn(n, !1)
      );
    }
  }
  function wn(n) {
    return n === encodeURIComponent(hn(n));
  }
  function Cn(n, e, t, o) {
    if (!wn(o))
      throw new TypeError('Cookie value is not correctly URI encoded.');
    if (!wn(n))
      throw new TypeError('Cookie name is not correctly URI encoded.');
    var r = n + '=' + o;
    ((r += '; path=/'),
      e && (r += '; domain=' + e),
      (r += '; expires=' + new Date(new Date().getTime() + t).toUTCString()),
      (document.cookie = r));
  }
  function xn() {
    var n,
      e,
      t,
      o =
        ((t =
          null === (n = window.Shopify) ||
          void 0 === n ||
          null === (e = n.customerPrivacy) ||
          void 0 === e
            ? void 0
            : e.cachedConsent)
          ? hn(t)
          : void 0) ||
        new URLSearchParams(window.location.search).get('_cs') ||
        void 0 ||
        bn(vn) ||
        (function () {
          try {
            var n,
              e = sn(
                null === (n = performance) || void 0 === n
                  ? void 0
                  : n.getEntriesByType('navigation'),
                1,
              )[0],
              t =
                null == e
                  ? void 0
                  : e.serverTiming.find(function (n) {
                      return '_cmp' === n.name;
                    }),
              o = null == t ? void 0 : t.description;
            if (!o) return;
            try {
              o = decodeURIComponent(o);
            } catch (n) {}
            return o;
          } catch (n) {
            return;
          }
        })();
    if (void 0 !== o)
      return (function (n) {
        if ('%' == n.slice(0, 1))
          try {
            n = decodeURIComponent(n);
          } catch (n) {}
        var e = n.slice(0, 1);
        if ('{' == e)
          return (function (n) {
            var e, t;
            try {
              t = JSON.parse(n);
            } catch (n) {
              return;
            }
            if ('2.1' !== t.v) return;
            if (null === (e = t.con) || void 0 === e || !e.CMP) return;
            return t;
          })(n);
        if ('3' == e)
          return (function (n) {
            var e,
              t,
              o = n.slice(1).split('_'),
              r = sn(o, 5),
              a = r[0],
              i = r[1],
              c = r[2],
              s = r[3],
              l = r[4];
            try {
              e = o[5] ? JSON.parse(o.slice(5).join('_')) : void 0;
            } catch (n) {}
            if (l) {
              var u = l.replace(/\*/g, '/').replace(/-/g, '+'),
                d = Array.from(atob(u))
                  .map(function (n) {
                    return n.charCodeAt(0).toString(16).padStart(2, '0');
                  })
                  .join('');
              t = [8, 13, 18, 23].reduce(function (n, e) {
                return n.slice(0, e) + '-' + n.slice(e);
              }, d);
            }
            function p(n) {
              var e = a.split('.')[0];
              return e.includes(n.toLowerCase())
                ? x
                : e.includes(n.toUpperCase())
                  ? C
                  : w;
            }
            function f(n) {
              return a.includes(n.replace('t', 's').toUpperCase());
            }
            return {
              v: '3',
              con: {CMP: X(X(X(X({}, O, p(O)), A, p(A)), E, p(E)), B, p(B))},
              region: i || '',
              cus: e,
              purposes: X(X(X(X({}, _, f(_)), k, f(k)), I, f(I)), D, f(D)),
              sale_of_data_region: 't' == s,
              display_banner: 't' == c,
              consent_id: t,
            };
          })(n);
        return;
      })(o);
  }
  function kn() {
    try {
      var n = xn();
      if (!n) return;
      return n;
    } catch (n) {
      return;
    }
  }
  function _n() {
    return {m: An(E), a: An(O), p: An(A), s: An(B)};
  }
  function In() {
    return _n()[B];
  }
  function Dn(n) {
    return (void 0 === n && (n = null), null === n && (n = kn()), void 0 === n);
  }
  function En(n) {
    switch (n) {
      case C:
        return y;
      case x:
        return g;
      default:
        return b;
    }
  }
  function On(n) {
    switch (n) {
      case O:
        return P;
      case E:
        return T;
      case A:
        return S;
      case B:
        return M;
    }
  }
  function An(n) {
    var e = kn();
    if (!e) return w;
    var t = e.con.CMP;
    return t ? t[n] : w;
  }
  function Bn(n) {
    var e = xn();
    if (!e || !e.purposes) return !0;
    var t = e.purposes[n];
    return 'boolean' != typeof t || t;
  }
  function Tn() {
    return Bn(k);
  }
  function Pn() {
    return Bn(_);
  }
  function Sn() {
    return Bn(I);
  }
  function Mn() {
    return Bn(D);
  }
  function Rn() {
    var n = xn();
    return !!n && 'boolean' == typeof n.display_banner && n.display_banner;
  }
  function jn() {
    var n = xn();
    return (n && n.sale_of_data_region) || !1;
  }
  function Hn() {
    var n = xn();
    return (n && n.consent_id) || '';
  }
  var Ln = 'v0.2';
  function Nn(n) {
    void 0 !== n.granular_consent &&
      (function (n) {
        var e = n[I],
          t = n[D],
          o = n[_],
          m = n[k];
        !0 === e ? Fn(i) : !1 === e && Fn(u);
        !0 === t ? Fn(c) : !1 === t && Fn(d);
        !0 === o ? Fn(s) : !1 === o && Fn(p);
        !0 === m ? Fn(l) : !1 === m && Fn(f);
        var y = (function (n) {
          var e = {
            marketingAllowed: n[I],
            saleOfDataAllowed: n[D],
            analyticsAllowed: n[_],
            preferencesAllowed: n[k],
            firstPartyMarketingAllowed: n[I],
            thirdPartyMarketingAllowed: n[D],
          };
          return e;
        })(n);
        Fn(h, y);
        var g = [o, m, e, t];
        g.every(function (n) {
          return !0 === n;
        }) && Fn(r);
        g.every(function (n) {
          return !1 === n;
        }) && Fn(a);
      })(X(X(X(X({}, k, Tn()), _, Pn()), I, Sn()), D, Mn()));
  }
  function Fn(n, e) {
    document.dispatchEvent(new CustomEvent(n, {detail: e || {}}));
  }
  function Wn(n, e) {
    if (n) {
      var t = (function (n) {
        var e = new URL(n, window.location.origin),
          t = Un(n) ? qn(e) : qn(e).replace(window.location.origin, '');
        return document.querySelectorAll('a[href^="' + t + '"]');
      })(n);
      if (t.length)
        for (
          var o = Hn(),
            r = (function (n) {
              var e = n();
              if (!e) return null;
              if (
                !(
                  ('analytics' in e) &&
                  ('marketing' in e) &&
                  ('preferences' in e)
                )
              )
                return null;
              var t = zn(e.analytics),
                o = zn(e.marketing),
                r = zn(e.preferences);
              return '' === t && '' === o && '' === r
                ? null
                : 'a' + t + 'm' + o + 'p' + r;
            })(e),
            a = 0,
            i = Array.from(t);
          a < i.length;
          a++
        ) {
          var c = i[a],
            s = c.getAttribute('href');
          if (s) {
            var l = new URL(s, window.location.origin);
            if (
              (o && l.searchParams.set('consent_id', o),
              r && l.searchParams.set('consent', r),
              o || r)
            ) {
              var u = Un(n)
                ? l.toString()
                : l.toString().replace(window.location.origin, '');
              c.setAttribute('href', u);
            }
          }
        }
    }
  }
  function qn(n) {
    return '' + n.origin + n.pathname.replace(/\/$/, '');
  }
  function Un(n) {
    return n.startsWith('http://') || n.startsWith('https://');
  }
  function zn(n) {
    switch (n) {
      case y:
        return '1';
      case g:
        return '0';
      default:
        return '';
    }
  }
  var Gn = '_landing_page',
    Jn = '_orig_referrer';
  function Vn(n) {
    var e = n.granular_consent;
    return {
      query:
        'query { consentManagement { cookies(' +
        fn(
          Object.assign(
            Object.assign(
              {
                visitorConsent: Object.assign(
                  {
                    marketing: e.marketing,
                    analytics: e.analytics,
                    preferences: e.preferences,
                    saleOfData: e.sale_of_data,
                  },
                  e.metafields && {metafields: e.metafields},
                ),
              },
              e.email && {visitorEmail: e.email},
            ),
            {},
            {origReferrer: n.referrer, landingPage: n.landing_page},
          ),
        ) +
        ') { trackingConsentCookie cookieDomain landingPageCookie origReferrerCookie } customerAccountUrl } }',
      variables: {},
    };
  }
  function Kn(n, e, t) {
    var o = e.granular_consent,
      r =
        o.storefrontAccessToken ||
        (function () {
          var n = document.documentElement.querySelector('#shopify-features'),
            e = 'Could not find liquid access token';
          if (!n) return void gn.warn(e);
          var t = JSON.parse(n.textContent || '').accessToken;
          if (!t) return void gn.warn(e);
          return t;
        })(),
      a = o.checkoutRootDomain || window.location.host,
      i = o.isExtensionToken
        ? 'Shopify-Storefront-Extension-Token'
        : 'x-shopify-storefront-access-token',
      c = {
        headers: Object.assign(
          X({'content-type': 'application/json'}, i, r),
          mn() ? {'x-test-payload': JSON.stringify(e)} : {},
        ),
        body: JSON.stringify(Vn(e)),
        method: 'POST',
      };
    return fetch('https://' + a + '/api/unstable/graphql.json', c)
      .then(function (n) {
        if (n.ok) return n.json();
        throw new Error('Server error');
      })
      .then(function (r) {
        var a,
          i,
          c = 31536e6,
          s = 12096e5,
          l = r.data.consentManagement.cookies.cookieDomain,
          u = l || o.checkoutRootDomain || window.location.hostname,
          d = o.storefrontRootDomain || l || window.location.hostname,
          p = r.data.consentManagement.cookies.trackingConsentCookie,
          f = r.data.consentManagement.cookies.landingPageCookie,
          h = r.data.consentManagement.cookies.origReferrerCookie,
          m =
            null !==
              (a =
                null === (i = r.data.consentManagement) || void 0 === i
                  ? void 0
                  : i.customerAccountUrl) && void 0 !== a
              ? a
              : '';
        return (
          p &&
            (function (n) {
              var e;
              ((null !== (e = window.Shopify) &&
                void 0 !== e &&
                e.customerPrivacy) ||
                ((window.Shopify = window.Shopify || {}),
                (window.Shopify.customerPrivacy = {})),
                (window.Shopify.customerPrivacy.cachedConsent = n));
            })(p),
          o.headlessStorefront &&
            (Cn(vn, u, c, p),
            f && h && (Cn(Gn, u, s, f), Cn(Jn, u, s, h)),
            d !== u &&
              (Cn(vn, d, c, p), f && h && (Cn(Gn, d, s, f), Cn(Jn, d, s, h)))),
          Nn(e),
          Wn(m, n),
          void 0 !== t && t(null, r),
          r
        );
      })
      .catch(function (n) {
        var e = 'Error while setting storefront API consent: ' + n.message;
        if (void 0 === t) throw {error: e};
        t({error: e});
      });
  }
  var Xn = (function () {
    return K(
      function n(e) {
        if (
          (void 0 === e && (e = !1), (this.useInstrumentation = !1), n.instance)
        )
          return n.instance;
        ((n.instance = this), (this.useInstrumentation = e));
      },
      [
        {
          key: 'instrumentationEnabled',
          value: function () {
            return this.useInstrumentation;
          },
        },
        {
          key: 'setUseInstrumentation',
          value: function (n) {
            this.useInstrumentation = n;
          },
        },
        {
          key: 'produce',
          value: function (n, e) {
            if (this.instrumentationEnabled() && Pn())
              try {
                var t = {
                    schema_id: 'customer_privacy_api_events/2.0',
                    payload: {
                      shop_domain: window.location.host,
                      method_name: n,
                      call_details: e || null,
                    },
                  },
                  o = {
                    accept: '*/*',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'content-type': 'application/json; charset=utf-8',
                    'x-monorail-edge-event-created-at-ms': String(Date.now()),
                    'x-monorail-edge-event-sent-at-ms': String(Date.now()),
                  };
                if (!window.location.host.endsWith('spin.dev'))
                  return fetch(
                    'https://monorail-edge.shopifysvc.com/v1/produce',
                    {
                      headers: o,
                      body: JSON.stringify(t),
                      method: 'POST',
                      mode: 'cors',
                      credentials: 'omit',
                    },
                  );
                console.log('Monorail event from consent API:', o, t);
              } catch (n) {}
          },
        },
      ],
    );
  })();
  function $n(n, e) {
    if (
      (new Xn().produce('setTrackingConsent', Ln),
      (function (n) {
        if ('boolean' != typeof n && 'object' !== un(n))
          throw TypeError(
            'setTrackingConsent must be called with a boolean or object consent value',
          );
        if ('object' === un(n)) {
          var e = Object.keys(n);
          if (0 === e.length)
            throw TypeError('The submitted consent object is empty.');
          for (
            var t = [T, P, S, M, R, H, L, N, F, j, W, q], o = 0, r = e;
            o < r.length;
            o++
          ) {
            var a = r[o];
            if (!t.includes(a))
              throw TypeError(
                'The submitted consent object should only contain the following keys: ' +
                  t.join(', ') +
                  '. Extraneous key: ' +
                  a +
                  '.',
              );
          }
        }
      })(n),
      void 0 !== e && 'function' != typeof e)
    )
      throw TypeError(
        'setTrackingConsent must be called with a callback function if the callback argument is provided',
      );
    var t = (function (n) {
        if (!n) return null;
        return Qn() ? document.referrer : '';
      })(n.analytics),
      o = (function (n) {
        if (!n) return null;
        return Qn() ? window.location.pathname + window.location.search : '/';
      })(n.analytics);
    return Kn(
      ie,
      Object.assign(
        Object.assign({granular_consent: n}, null !== t && {referrer: t}),
        null !== o && {landing_page: o},
      ),
      e,
    );
  }
  function Zn() {
    if ((new Xn().produce('getTrackingConsent', Ln), Dn())) return b;
    var n = _n();
    return n[E] === C && n[O] === C ? y : n[E] === x || n[O] === x ? g : v;
  }
  function Yn() {
    return Dn((n = kn())) ? '' : n.region || '';
    var n;
  }
  function Qn() {
    if ('' === document.referrer) return !0;
    var n = document.createElement('a');
    return (
      (n.href = document.referrer),
      window.location.hostname != n.hostname
    );
  }
  function ne() {
    return !!Dn() || (Sn() && Pn());
  }
  function ee() {
    return jn()
      ? 'string' == typeof navigator.globalPrivacyControl
        ? '1' !== navigator.globalPrivacyControl
        : 'boolean' == typeof navigator.globalPrivacyControl
          ? !navigator.globalPrivacyControl
          : null
      : null;
  }
  function te() {
    return Rn() && Zn() === v;
  }
  function oe() {
    return !1 === ee() ? g : ((n = In()), Dn() ? b : n === w ? v : En(n));
    var n;
  }
  function re() {
    return !0;
  }
  function ae(n) {
    return (function (n) {
      var e = kn();
      if (!Dn(e) && e.cus) {
        var t = e.cus[encodeURIComponent(n)];
        return t ? decodeURIComponent(t) : t;
      }
    })(n);
  }
  function ie() {
    for (var n = {}, e = _n(), t = 0, o = Object.keys(e); t < o.length; t++) {
      var r = o[t];
      n[On(r)] = En(e[r]);
    }
    return n;
  }
  function ce() {
    return Hn();
  }
  Xn.instance = void 0;
  var se = '95ba910bcec4542ef2a0b64cd7ca666c';
  function le(n, e, t) {
    try {
      var o;
      !(function (n) {
        var e = new XMLHttpRequest();
        (e.open(
          'POST',
          'https://error-analytics-production.shopifysvc.com',
          !0,
        ),
          e.setRequestHeader('Content-Type', 'application/json'),
          e.setRequestHeader('Bugsnag-Api-Key', se),
          e.setRequestHeader('Bugsnag-Payload-Version', '5'));
        var t = (function (n) {
          var e = (function (n) {
              return n.stackTrace || n.stack || n.description || n.name;
            })(n.error),
            t = sn((e || 'unknown error').split('\n')[0].split(':'), 2),
            o = t[0],
            r = t[1];
          return JSON.stringify({
            payloadVersion: 5,
            notifier: {name: 'ConsentTrackingAPI', version: 'latest', url: '-'},
            events: [
              {
                exceptions: [
                  {
                    errorClass: (o || '').trim(),
                    message: (r || '').trim(),
                    stacktrace: [
                      {
                        file: 'consent-tracking-api.js',
                        lineNumber: '1',
                        method: e,
                      },
                    ],
                    type: 'browserjs',
                  },
                ],
                context: n.context || 'general',
                app: {id: 'ConsentTrackingAPI', version: 'latest'},
                metaData: {
                  request: {shopId: n.shopId, shopUrl: window.location.href},
                  device: {userAgent: window.navigator.userAgent},
                  'Additional Notes': n.notes,
                },
                unhandled: !1,
              },
            ],
          });
        })(n);
        e.send(t);
      })({
        error: n,
        context: null != e ? e : '',
        shopId:
          de() ||
          (null === (o = window.Shopify) || void 0 === o ? void 0 : o.shop),
        notes: null != t ? t : '',
      });
    } catch (n) {}
  }
  function ue(n) {
    return function () {
      try {
        return n.apply(void 0, arguments);
      } catch (n) {
        throw (le(n), n);
      }
    };
  }
  function de() {
    try {
      var n,
        e =
          null === (n = document.getElementById('shopify-features')) ||
          void 0 === n
            ? void 0
            : n.textContent;
      return e ? JSON.parse(e).shopId : null;
    } catch (n) {
      return null;
    }
  }
  function pe() {
    return Sn();
  }
  function fe() {
    return Pn();
  }
  function he() {
    return Tn();
  }
  function me() {
    return Mn();
  }
  var ye, ge, ve, be, we, Ce;
  function xe(n) {
    return (
      void 0 === n && (n = {useBugsnagReporting: !1, useInstrumentation: !1}),
      (function (n) {
        var e = n.useBugsnagReporting,
          t = n.useInstrumentation;
        In() != x &&
          !1 === ee() &&
          $n({sale_of_data: !1}, function () {
            return !1;
          });
        var o = {
          analyticsProcessingAllowed: Pn,
          currentVisitorConsent: ie,
          doesMerchantSupportGranularConsent: re,
          firstPartyMarketingAllowed: pe,
          getCCPAConsent: oe,
          getRegion: Yn,
          getTrackingConsent: Zn,
          getTrackingConsentMetafield: ae,
          marketingAllowed: pe,
          preferencesProcessingAllowed: Tn,
          saleOfDataAllowed: me,
          saleOfDataRegion: jn,
          setTrackingConsent: $n,
          shouldShowBanner: Rn,
          shouldShowGDPRBanner: te,
          thirdPartyMarketingAllowed: me,
          userCanBeTracked: ne,
          consentId: ce,
          unstable: {},
          __metadata__: {
            name: '@shopify/consent-tracking-api',
            version: Ln,
            description: 'Shopify Consent Tracking API',
          },
        };
        if ((new Xn(t), !e)) return o;
        var r = ['unstable'];
        for (var a in o)
          o.hasOwnProperty(a) && (o[a] = r.includes(a) ? o[a] : ue(o[a]));
        return o;
      })(n)
    );
  }
  (!(function (n) {
    ((n.BottomCenter = 'bottom_center'),
      (n.BottomFullWidth = 'bottom_full_width'),
      (n.BottomLeft = 'bottom_left'),
      (n.BottomRight = 'bottom_right'),
      (n.Center = 'center'));
  })(ye || (ye = {})),
    (function (n) {
      ((n.Custom = 'custom'), (n.Dark = 'dark'), (n.Light = 'light'));
    })(ge || (ge = {})),
    (function (n) {
      ((n[(n.Yes = 1)] = 'Yes'), (n[(n.No = 0)] = 'No'));
    })(ve || (ve = {})),
    (function (n) {
      ((n.StylesContainerId = 'shopify-pc__banner__styles'),
        (n.DialogId = 'shopify-pc__banner'),
        (n.DialogClass = 'shopify-pc__banner__dialog'),
        (n.WrapperClass = 'shopify-pc__banner__wrapper'),
        (n.BodyClass = 'shopify-pc__banner__body'),
        (n.BodyTitleId = 'shopify-pc__banner__body-title'),
        (n.BodyCopyPolicyLinkId = 'shopify-pc__banner__body-policy-link'),
        (n.ButtonsClass = 'shopify-pc__banner__btns'),
        (n.ButtonsGranularClass = 'shopify-pc__banner__btns-granular'),
        (n.ButtonAcceptId = 'shopify-pc__banner__btn-accept'),
        (n.ButtonAcceptClass = 'shopify-pc__banner__btn-accept'),
        (n.ButtonDeclineId = 'shopify-pc__banner__btn-decline'),
        (n.ButtonDeclineClass = 'shopify-pc__banner__btn-decline'),
        (n.ButtonManagePrefsId = 'shopify-pc__banner__btn-manage-prefs'),
        (n.ButtonManagePrefsClass = 'shopify-pc__banner__btn-manage-prefs'));
    })(be || (be = {})),
    (function (n) {
      ((n.StylesContainerId = 'shopify-pc__prefs__styles'),
        (n.OverlayId = 'shopify-pc__prefs__overlay'),
        (n.OverlayClass = 'shopify-pc__prefs__overlay'),
        (n.WrapperId = 'shopify-pc__prefs'),
        (n.WrapperClass = 'shopify-pc__prefs'),
        (n.DialogId = 'shopify-pc__prefs__dialog'),
        (n.DialogClass = 'shopify-pc__prefs__dialog'),
        (n.DialogScrollableClass = 'shopify-pc__prefs__scrollable'),
        (n.HeaderTitleId = 'shopify-pc__prefs__header-title'),
        (n.HeaderActionsClass = 'shopify-pc__prefs__header-actions'),
        (n.HeaderSaveId = 'shopify-pc__prefs__header-save'),
        (n.HeaderAcceptId = 'shopify-pc__prefs__header-accept'),
        (n.HeaderDeclineId = 'shopify-pc__prefs__header-decline'),
        (n.HeaderCloseId = 'shopify-pc__prefs__header-close'),
        (n.HeaderCloseClass = 'shopify-pc__prefs__header-close'),
        (n.IntroClass = 'shopify-pc__prefs__intro'),
        (n.IntroMainClass = 'shopify-pc__prefs__intro-main'),
        (n.IntroExplainWrapperClass = 'shopify-pc__prefs__intro-explain'),
        (n.IntroExplainAcceptClass = 'shopify-pc__prefs__intro-explain-accept'),
        (n.IntroExplainDeclineClass =
          'shopify-pc__prefs__intro-explain-decline'),
        (n.OptionWrapperClass = 'shopify-pc__prefs__options'),
        (n.OptionClass = 'shopify-pc__prefs__option'),
        (n.OptionEssentialId = 'shopify-pc__prefs__essential'),
        (n.OptionEssentialInputId = 'shopify-pc__prefs__essential-input'),
        (n.OptionMarketingId = 'shopify-pc__prefs__marketing'),
        (n.OptionMarketingInputId = 'shopify-pc__prefs__marketing-input'),
        (n.OptionAnalyticsId = 'shopify-pc__prefs__analytics'),
        (n.OptionAnalyticsInputId = 'shopify-pc__prefs__analytics-input'),
        (n.OptionPreferencesId = 'shopify-pc__prefs__preferences'),
        (n.OptionPreferencesInputId = 'shopify-pc__prefs__preferences-input'));
    })(we || (we = {})),
    (function (n) {
      ((n.Black = '#333'),
        (n.White = '#fff'),
        (n.Gray = '#ccc'),
        (n.Green = '#3AA83A'),
        (n.LightGray = '#F7F8F9'),
        (n.DarkGray = '#36454F'),
        (n.VeryDarkGray = '#666'),
        (n.VeryLightGray = '#e5e5e5'));
    })(Ce || (Ce = {})));
  var ke = function (n) {
    return '\n    border: 1px solid '
      .concat(n.button.borderColor, ';\n    color: ')
      .concat(n.button.fontColor, ';\n    background: ')
      .concat(n.button.backgroundColor, ';\n  ');
  };
  function _e(n, e, t, o) {
    (void 0 === e && (e = '0,0,100,100'),
      void 0 === t && (t = '0,0,0,100'),
      void 0 === o && (o = '0,0,100,100'));
    var r = n.split(','),
      a = r[0],
      i = r[1],
      c = r[2],
      s = r[3],
      l = e.split(','),
      u = l[0],
      d = l[1],
      p = l[2],
      f = l[3],
      h = t.split(','),
      m = h[0],
      y = h[1],
      g = h[2],
      v = h[3],
      b = o.split(','),
      w = b[0],
      C = b[1],
      x = b[2],
      k = b[3],
      _ = {
        hue: Number(a),
        saturation: Number(i),
        lightness: Number(c),
        alpha: Number(s),
      },
      I = {
        hue: Number(u),
        saturation: Number(d),
        lightness: Number(p),
        alpha: Number(f),
      },
      D = {
        hue: Number(m),
        saturation: Number(y),
        lightness: Number(g),
        alpha: Number(v),
      },
      E = {
        hue: Number(w),
        saturation: Number(C),
        lightness: Number(x),
        alpha: Number(k),
      },
      O = {
        hue: _.hue,
        saturation: _.saturation,
        lightness: _.lightness,
        alpha: _.alpha - 10,
      },
      A = {
        hue: I.hue,
        saturation: I.saturation,
        lightness: I.lightness < 50 ? I.lightness + 14 : I.lightness - 12,
        alpha: I.alpha,
      },
      B = {
        hue: 201,
        saturation: I.lightness < 50 ? 60 : 90,
        lightness: I.lightness < 50 ? 60 : 80,
        alpha: I.lightness < 50 ? 80 : 100,
      };
    return {
      font: Ie(_),
      fontSubdued: Ie(O),
      buttonFont: Ie(D),
      buttonBackground: Ie(E),
      background: Ie(I),
      divider: Ie(A),
      focused: Ie(B),
    };
  }
  function Ie(n) {
    return 'hsl('
      .concat(n.hue, 'deg, ')
      .concat(n.saturation, '%, ')
      .concat(n.lightness, '%, ')
      .concat(n.alpha, '%)');
  }
  function De(n, e, t, o, r) {
    var a = '0,0,0,100',
      i = '0,0,100,100',
      c = _e('0,0,12,100', '0,0,100,100', '0,0,12,100', '0,0,100,100'),
      s = _e('0,0,100,87', '0,0,12,100', '0,0,100,87', '0,0,12,100'),
      l = _e(
        null != e ? e : a,
        null != t ? t : i,
        null != o ? o : a,
        null != r ? r : i,
      ),
      u = (function () {
        switch (n) {
          case ge.Light:
            return c;
          case ge.Dark:
            return s;
          case ge.Custom:
            return l;
          default:
            return c;
        }
      })();
    return {
      backgroundColor: u.background,
      fontColor: u.font,
      fontSubduedColor: u.fontSubdued,
      sectionDivider: u.divider,
      iconColor: u.font,
      focused: u.focused,
      button: {
        borderColor: u.buttonFont,
        backgroundColor: u.buttonBackground,
        fontColor: u.buttonFont,
      },
      primaryButton: {
        borderColor: u.buttonBackground,
        backgroundColor: u.buttonFont,
        fontColor: u.buttonBackground,
      },
    };
  }
  function Ee(n) {
    var e = n.bannerData,
      t = n.selectorPrefix,
      o = t ? ''.concat(t, ' ') : '',
      r = De(
        e.theme.theme,
        e.theme.fontColor,
        e.theme.backgroundColor,
        e.theme.buttonFontColor,
        e.theme.buttonBackgroundColor,
      ),
      a = (function (n, e, t) {
        var o = '1280px',
          r = '\n    '
            .concat(t, '.')
            .concat(
              be.WrapperClass,
              ' {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      flex-direction: column;\n    }\n  ',
            ),
          a =
            '\n    position: fixed;\n    z-index: 2000000;\n    box-shadow: 0px 4px 10px rgb(63 63 68 / 40%);\n    max-height: 90%;\n    box-sizing: border-box;\n    opacity: 1;\n    padding: 32px;\n    background-color: '.concat(
              e.backgroundColor,
              ';\n    overflow: auto;\n    -ms-overflow-style: none;\n    scrollbar-width: none;\n    border: none;\n    text-align: left;\n  ',
            ),
          i = function () {
            var n = '\n      '
              .concat(t, '.')
              .concat(
                be.ButtonsClass,
                ' {\n        flex-direction: column;\n        gap: 3px;\n      }\n      ',
              )
              .concat(t, '.')
              .concat(
                be.ButtonsGranularClass,
                ' :nth-child(1) {\n        order: 3;\n      }\n      ',
              )
              .concat(t, '.')
              .concat(
                be.ButtonsGranularClass,
                ' :nth-child(2) {\n        order: 1;\n      }\n      ',
              )
              .concat(t, '.')
              .concat(
                be.ButtonsGranularClass,
                ' :nth-child(3) {\n        order: 2;\n      }\n    ',
              );
            return '\n      @media only screen and (max-width: 480px) {\n        '.concat(
              n,
              '\n      }\n    ',
            );
          },
          c = '\n    '
            .concat(t, '.')
            .concat(be.DialogClass, ' {\n      ')
            .concat(a, '\n      bottom: 0%;\n      width: 100%;\n    }\n    ')
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' button {\n      margin: 0 10px 0 0;\n    }\n    @media only screen and (max-width: ',
            )
            .concat(o, ') {\n      ')
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' button {\n        margin: 15px 10px 0 0;\n      }\n    }\n    ',
            )
            .concat(r, '\n    ')
            .concat(t, '.')
            .concat(
              be.WrapperClass,
              ' {\n      flex-direction: row;\n    }\n    @media only screen and (max-width: ',
            )
            .concat(o, ') {\n      ')
            .concat(t, '.')
            .concat(
              be.WrapperClass,
              ' {\n        flex-direction: column;\n      }\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n      margin-right: 5%;\n      margin-bottom: 0;\n    }\n    @media only screen and (max-width: ',
            )
            .concat(o, ') {\n      ')
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n        margin-right: 0;\n        margin-bottom: 10px;\n        width: 100%;\n      }\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n      display: flex;\n      min-width: 580px;\n      flex-direction: row;\n      gap: 20px;\n    }\n    @media only screen and (max-width: ',
            )
            .concat(o, ') {\n      ')
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n        min-width: auto;\n        width: 100%;\n        justify-content: flex-end;\n      }\n    }\n    ',
            )
            .concat(i(), '\n  '),
          s = '\n    '
            .concat(t, '.')
            .concat(be.DialogClass, ' {\n      ')
            .concat(
              a,
              '\n      top: 50%;\n      left: 25%;\n      width: 50%;\n      transform: translate(0, -50%);\n      min-width: 280px;\n      border-radius: 3px;\n    }\n    ',
            )
            .concat(
              r,
              '\n    @media only screen and (max-width: 1300px) {\n      ',
            )
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' {\n        left: 15%;\n        width: 70%;\n      }\n    }\n    @media only screen and (max-width: 900px) {\n      ',
            )
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' {\n        left: 5%;\n        width: 90%;\n      }\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n      width: 100%;\n      margin-bottom: 10px;\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n      display: flex;\n      width: 100%;\n      justify-content: flex-end;\n      flex-direction: row;\n      gap: 20px;\n    }\n    ',
            )
            .concat(i(), '\n  '),
          l = '\n    '
            .concat(t, '.')
            .concat(be.DialogClass, ' {\n      ')
            .concat(
              a,
              '\n      bottom: 0;\n      left: 0;\n      max-width: 650px;\n      border-top-right-radius: 3px;\n    }\n    ',
            )
            .concat(r, '\n    ')
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n      width: 100%;\n      margin-bottom: 10px;\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n      display: flex;\n      justify-content: flex-end;\n      width: 100%;\n      flex-direction: row;\n      gap: 20px;\n    }\n    ',
            )
            .concat(i(), '\n  '),
          u = '\n    '
            .concat(t, '.')
            .concat(be.DialogClass, ' {\n      ')
            .concat(
              a,
              '\n      bottom: 0;\n      right: 0;\n      max-width: 650px;\n      border-top-left-radius: 3px;\n    }\n    ',
            )
            .concat(r, '\n    ')
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n      width: 100%;\n      margin-bottom: 10px;\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n      display: flex;\n      justify-content: flex-end;\n      width: 100%;\n      flex-direction: row;\n      gap: 20px;\n    }\n    ',
            )
            .concat(i(), '\n  '),
          d = '\n    '
            .concat(t, '.')
            .concat(be.DialogClass, ' {\n      ')
            .concat(
              a,
              '\n      bottom: 0;\n      left: 25%;\n      width: 50%;\n      min-width: 280px;\n      border-top-right-radius: 3px;\n      border-top-left-radius: 3px;\n    }\n    ',
            )
            .concat(
              r,
              '\n    @media only screen and (max-width: 1300px) {\n      ',
            )
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' {\n        left: 15%;\n        width: 70%;\n      }\n    }\n    @media only screen and (max-width: 900px) {\n      ',
            )
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' {\n        left: 5%;\n        width: 90%;\n      }\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.BodyClass,
              ' {\n      width: 100%;\n      margin-bottom: 10px;\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.ButtonsClass,
              ' {\n      display: flex;\n      width: 100%;\n      justify-content: flex-end;\n      flex-direction: row;\n      gap: 20px;\n    }\n    ',
            )
            .concat(t, '.')
            .concat(
              be.DialogClass,
              ' h2 {\n      line-height: initial;\n    }\n    ',
            )
            .concat(i(), '\n  ');
        switch (n) {
          case ye.BottomFullWidth:
            return c;
          case ye.Center:
            return s;
          case ye.BottomLeft:
            return l;
          case ye.BottomRight:
            return u;
          case ye.BottomCenter:
            return d;
          default:
            return c;
        }
      })(e.position, r, o),
      i = (function (n, e) {
        if (n === ge.Custom)
          return {
            accept: ke(e),
            decline: ke(e),
            manage:
              ((t = e),
              '\n    border: none;\n    color: '.concat(
                t.fontColor,
                ';\n    background: transparent;\n  ',
              )),
          };
        var t,
          o = n === ge.Dark,
          r = Ce.White,
          a = Ce.Black;
        return {
          accept: '\n    background: '
            .concat(o ? Ce.Black : r, ';\n    color: ')
            .concat(o ? Ce.White : a, ';\n  '),
          decline: '\n    background: '
            .concat(o ? Ce.Black : r, ';\n    color: ')
            .concat(o ? Ce.White : a, ';\n  '),
          manage:
            '\n    background: transparent;\n    border: none;\n    color: '.concat(
              o ? Ce.White : Ce.Black,
              ';\n  ',
            ),
        };
      })(e.theme.theme, r);
    return '\n    '
      .concat(o, '.')
      .concat(be.DialogClass, ' h2 {\n      color: ')
      .concat(
        r.fontColor,
        ';\n      font-family: inherit;\n      font-size: 120%;\n      margin: 0 0 .5em 0;\n      padding: 0;\n      font-weight: bold;\n    }\n    ',
      )
      .concat(o, '.')
      .concat(be.DialogClass, ' p {\n      color: ')
      .concat(
        r.fontColor,
        ';\n      font-family: inherit;\n      line-height: 1.3;\n      margin: 0;\n      padding: 0;\n    }\n    ',
      )
      .concat(o, '.')
      .concat(be.DialogClass, ' a {\n      color: ')
      .concat(r.fontColor, ';\n      text-decoration: underline;\n    }\n    ')
      .concat(o, '.')
      .concat(
        be.DialogClass,
        ' button {\n      border: none;\n      text-decoration: none;\n      font-family: inherit;\n      padding: 10px 25px;\n      margin-top: 15px;\n      font-size: 100%;\n      flex-basis: 50%;\n      border-radius: 2px;\n      line-height: 120%;\n      height: unset;\n      text-align: center;\n    }\n    ',
      )
      .concat(o, '.')
      .concat(
        be.DialogClass,
        ' button:focus {\n      outline: none;\n      box-shadow: 0 0 0 4px ',
      )
      .concat(r.focused, ';\n    }\n    ')
      .concat(o, '.')
      .concat(
        be.DialogClass,
        ' button:hover {\n      cursor: pointer;\n    }\n    ',
      )
      .concat(o, '.')
      .concat(be.DialogClass, ' button.')
      .concat(be.ButtonAcceptClass, ' {\n      border: 1px solid ')
      .concat(r.button.borderColor, ';\n      ')
      .concat(i.accept, '\n    }\n    ')
      .concat(o, '.')
      .concat(be.DialogClass, ' button.')
      .concat(
        be.ButtonManagePrefsClass,
        ' {\n      text-decoration: underline;\n      padding: 0;\n      ',
      )
      .concat(i.manage, '\n    }\n    ')
      .concat(o, '.')
      .concat(be.DialogClass, ' button.')
      .concat(
        be.ButtonManagePrefsClass,
        ':focus {\n      box-shadow: none;\n    }\n    ',
      )
      .concat(o, '.')
      .concat(be.DialogClass, ' button.')
      .concat(
        be.ButtonManagePrefsClass,
        ':focus span {\n      outline: 2px solid ',
      )
      .concat(r.focused, ';\n    }\n    ')
      .concat(o, '.')
      .concat(be.DialogClass, ' button.')
      .concat(be.ButtonDeclineClass, ' {\n      border: 1px solid ')
      .concat(r.button.borderColor, ';\n      ')
      .concat(i.decline, '\n    }\n    ')
      .concat(o, '.')
      .concat(be.BodyClass, ' p a:focus {\n      outline: 2px solid ')
      .concat(r.focused, ';\n      box-shadow: none;\n    }\n    ')
      .concat(a, '\n  ');
  }
  var Oe = '8e9cb600c40a8849ba2b6151bb05805c';
  function Ae(n, e, t) {
    var o;
    try {
      !(function (n) {
        var e = new XMLHttpRequest();
        (e.open(
          'POST',
          'https://error-analytics-production.shopifysvc.com',
          !0,
        ),
          e.setRequestHeader('Content-Type', 'application/json'),
          e.setRequestHeader('Bugsnag-Api-Key', Oe),
          e.setRequestHeader('Bugsnag-Payload-Version', '5'));
        var t = (function (n) {
          var e = (function (n) {
              return n.stackTrace || n.stack || n.description || n.name;
            })(n.error),
            t =
              (n.error &&
                'string' == typeof n.error.name &&
                n.error.name.trim()) ||
              '',
            o =
              (n.error &&
                'string' == typeof n.error.message &&
                n.error.message.trim()) ||
              '',
            r = (e || 'unknown error').split('\n')[0],
            a = t || 'Error',
            i = o || r;
          return JSON.stringify({
            payloadVersion: 5,
            notifier: {name: 'privacyBanner', version: 'latest', url: '-'},
            events: [
              {
                exceptions: [
                  {
                    errorClass: a.trim(),
                    message: (i || '').trim(),
                    stacktrace: [
                      {
                        file: 'storefront-banner.js',
                        lineNumber: '1',
                        method: e,
                      },
                    ],
                    type: 'browserjs',
                  },
                ],
                context: n.context || 'general',
                app: {id: 'privacyBanner', version: 'latest'},
                metaData: {
                  request: {shopId: n.shopId, shopUrl: window.location.href},
                  device: {userAgent: window.navigator.userAgent},
                  'Additional Notes': n.notes,
                },
                unhandled: !1,
              },
            ],
          });
        })(n);
        e.send(t);
      })({
        error: n,
        context: e,
        shopId:
          Be() ||
          (null === (o = window.Shopify) || void 0 === o ? void 0 : o.shop),
        notes: t,
      });
    } catch (n) {}
  }
  function Be() {
    var n;
    try {
      var e =
        null ===
          (n =
            null === document || void 0 === document
              ? void 0
              : document.getElementById('shopify-features')) || void 0 === n
          ? void 0
          : n.textContent;
      return e ? JSON.parse(e).shopId : null;
    } catch (n) {
      return null;
    }
  }
  function Te(n) {
    var e = window.location.search.substring(1);
    if (0 === e.length) return null;
    var t = e.split('&').map(function (n) {
        return n.split('=');
      }),
      o = t.filter(function (e) {
        return e[0] === n;
      })[0];
    return (o ? o[1] : null) || null;
  }
  function Pe(n) {
    var e = {
      marketing: n.marketing,
      analytics: n.analytics,
      preferences: n.preferences,
      sale_of_data: n.sale_of_data,
    };
    (n.storefrontAccessToken &&
      ((e.headlessStorefront = !0),
      (e.checkoutRootDomain = n.checkoutRootDomain),
      (e.storefrontRootDomain = n.storefrontRootDomain),
      (e.storefrontAccessToken = n.storefrontAccessToken)),
      $n(e, n.callback));
  }
  var Se = function () {
      var n = ie();
      return n.marketing === b && n.analytics === b && n.preferences === b;
    },
    Me = ['127.0.0.1'],
    Re = function () {
      var n,
        e = Rn() && Se();
      return (
        !window.location.pathname.match(/\/password$/) &&
        ((n = window.location.hostname || window.location.host || ''),
        !Me.some(function (e) {
          return n.startsWith(e);
        })) &&
        e
      );
    },
    je = function () {
      return '1' === Te('preview_privacy_banner');
    },
    He = function () {
      var n;
      return (
        Boolean(
          !0 ===
            (null ===
              (n =
                null === window || void 0 === window
                  ? void 0
                  : window.Shopify) || void 0 === n
              ? void 0
              : n.previewMode),
        ) && Se()
      );
    },
    Le = function () {
      return je() || He();
    },
    Ne = (function () {
      function n() {}
      return (
        (n.getServerData = function (n, e, r, a) {
          return t(this, void 0, void 0, function () {
            return o(this, function (t) {
              return (
                (this.domain = n),
                (this.accessToken = e || this.liquidAccessToken()),
                (this.locale = r),
                (this.country = a),
                [2, this.getDataFromStorefrontApi()]
              );
            });
          });
        }),
        (n.getEmbeddedData = function () {
          var n = document.getElementById('scb4127');
          if (n) return JSON.parse(n.textContent || '');
        }),
        (n.fetchParams = function (n) {
          var e = n.accessToken,
            t = n.unlocalized,
            o = this.currentLanguage(),
            r = this.currentCountry(),
            a =
              !o || !r || t
                ? ''
                : '@inContext(language: '
                    .concat(o, ', country: ')
                    .concat(r, ')'),
            i = Le();
          return {
            headers: {
              'content-type': 'application/json',
              'x-shopify-storefront-access-token': e,
            },
            body: JSON.stringify({
              query: '\n        query bannerQuery ($isPreviewMode: Boolean = '
                .concat(i, ') ')
                .concat(
                  a,
                  ' {\n          consentManagement {\n            banner {\n              enabled\n              position\n              policyLinkText\n              policyLinkUrl\n              title\n              text\n              buttonPrefsOpenText\n              buttonAcceptText\n              buttonDeclineText\n              regionVisibility @include(if: $isPreviewMode)\n              theme {\n                theme\n                fontColor\n                backgroundColor\n                buttonFontColor\n                buttonBackgroundColor\n              }\n              preferences {\n                title\n                introTitle\n                introText\n                buttonAcceptText\n                buttonDeclineText\n                buttonSaveText\n                bulletPoints {\n                  enabled\n                  title\n                  firstText\n                  secondText\n                  thirdText\n                }\n                purposes {\n                  essentialName\n                  essentialDesc\n                  performanceName\n                  performanceDesc\n                  preferencesName\n                  preferencesDesc\n                  marketingName\n                  marketingDesc\n                }\n              }\n            }\n          }\n        }',
                ),
              variables: {isPreviewMode: Le()},
            }),
            method: 'POST',
          };
        }),
        (n.getDataFromStorefrontApi = function (n) {
          return t(this, void 0, void 0, function () {
            var t, r, a, i, c, s, l;
            return o(this, function (o) {
              switch (o.label) {
                case 0:
                  if (!this.accessToken)
                    throw new Error('Missing access token');
                  return (
                    (t = this.domain ? 'https://'.concat(this.domain) : ''),
                    (r = ''.concat(t, '/api/unstable/graphql.json')),
                    [
                      4,
                      fetch(
                        r,
                        this.fetchParams({
                          accessToken: this.accessToken,
                          unlocalized: n,
                        }),
                      ),
                    ]
                  );
                case 1:
                  return 200 !== (a = o.sent()).status ? [3, 3] : [4, a.json()];
                case 2:
                  if ((i = o.sent()).errors) {
                    if (
                      (c = i.errors.find(function (n) {
                        return (
                          'argumentLiteralsIncompatible' ===
                            n.extensions.code ||
                          'variableLiteralsIncompatible' === n.extensions.code
                        );
                      })) &&
                      !n
                    )
                      return (
                        (s = c.message || ''),
                        (l =
                          s.includes("Directive 'inContext'") &&
                          s.includes('invalid value')),
                        window.Weglot || l
                          ? console.log('Banner localization error', c.message)
                          : Ae(new Error(c.message), 'DataFetching'),
                        [2, this.getDataFromStorefrontApi(!0)]
                      );
                    throw new Error(i.errors[0].message);
                  }
                  return [2, e({}, i.data.consentManagement.banner)];
                case 3:
                  throw new Error('Could not reach the server');
              }
            });
          });
        }),
        (n.liquidAccessToken = function () {
          var n = document.documentElement.querySelector('#shopify-features');
          if (n) {
            var e = JSON.parse(n.textContent || '').accessToken;
            if (e) return e;
            console.warn('Could not find liquid access token');
          } else console.warn('Could not find liquid access token');
        }),
        (n.currentLanguage = function () {
          var n = this.locale;
          if (n) {
            n = n.replace('-', '_').toUpperCase();
            return (
              ['PT_BR', 'PT_PT', 'ZH_CN', 'ZH_TW'].includes(n) ||
                (n = n.split('_')[0]),
              n
            );
          }
        }),
        (n.currentCountry = function () {
          var n;
          return null === (n = this.country) || void 0 === n
            ? void 0
            : n.toUpperCase();
        }),
        n
      );
    })();
  function Fe(n, e, t) {
    return (
      (e = (function (n) {
        var e = (function (n, e) {
          if ('object' != un(n) || !n) return n;
          var t = n[Symbol.toPrimitive];
          if (void 0 !== t) {
            var o = t.call(n, e);
            if ('object' != un(o)) return o;
            throw new TypeError('@@toPrimitive must return a primitive value.');
          }
          return ('string' === e ? String : Number)(n);
        })(n, 'string');
        return 'symbol' == un(e) ? e : e + '';
      })(e)) in n
        ? Object.defineProperty(n, e, {
            value: t,
            enumerable: !0,
            configurable: !0,
            writable: !0,
          })
        : (n[e] = t),
      n
    );
  }
  function We(n, e) {
    var t = Object.keys(n);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(n);
      (e &&
        (o = o.filter(function (e) {
          return Object.getOwnPropertyDescriptor(n, e).enumerable;
        })),
        t.push.apply(t, o));
    }
    return t;
  }
  function qe(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = null != arguments[e] ? arguments[e] : {};
      e % 2
        ? We(Object(t), !0).forEach(function (e) {
            Fe(n, e, t[e]);
          })
        : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(t))
          : We(Object(t)).forEach(function (e) {
              Object.defineProperty(
                n,
                e,
                Object.getOwnPropertyDescriptor(t, e),
              );
            });
    }
    return n;
  }
  var Ue = 'http://localhost:8082',
    ze = 'https://monorail-edge.shopifysvc.com',
    Ge = '/v1/produce';
  var Je = (function () {
    return K(
      function (n) {
        this.producer = n;
      },
      [
        {
          key: 'do',
          value: function (n, e) {
            return void 0 !== n.schemaId
              ? this.producer.produce(n)
              : this.producer.produceBatch(n);
          },
        },
      ],
    );
  })();
  function Ve() {
    if (
      'undefined' != typeof crypto &&
      crypto &&
      'function' == typeof crypto.randomUUID
    )
      return crypto.randomUUID();
    for (var n = new Array(36), e = 0; e < 36; e++)
      n[e] = Math.floor(16 * Math.random());
    return (
      (n[14] = 4),
      (n[19] = n[19] &= -5),
      (n[19] = n[19] |= 8),
      (n[8] = n[13] = n[18] = n[23] = '-'),
      n
        .map(function (n) {
          return n.toString(16);
        })
        .join('')
    );
  }
  function Ke(n, e) {
    return (
      void 0 === e && (e = !0),
      n && Object.keys(n).length && e
        ? Object.keys(n)
            .map(function (e) {
              return X(
                {},
                e
                  .split(/(?=[A-Z])/)
                  .join('_')
                  .toLowerCase(),
                n[e],
              );
            })
            .reduce(function (n, e) {
              return qe(qe({}, n), e);
            })
        : n
    );
  }
  function Xe(n) {
    return n.events.map(function (n) {
      var e = !0,
        t = !0;
      return (
        n &&
          n.options &&
          Object.prototype.hasOwnProperty.call(n.options, 'convertEventCase') &&
          (e = Boolean(n.options.convertEventCase)),
        n &&
          n.options &&
          Object.prototype.hasOwnProperty.call(
            n.options,
            'convertMetaDataCase',
          ) &&
          (t = Boolean(n.options.convertMetaDataCase)),
        {
          schema_id: n.schemaId,
          payload: Ke(n.payload, e),
          metadata: Ke(n.metadata, t),
        }
      );
    });
  }
  var $e = (function (n) {
      function e(t) {
        var o;
        return (
          ((o =
            n.call(
              this,
              'Error producing to the Monorail Edge. Response received: ' +
                JSON.stringify(t),
            ) || this).response = t),
          Object.setPrototypeOf(o, e.prototype),
          o
        );
      }
      return (Z(e, n), K(e));
    })(dn(Error)),
    Ze = (function (n) {
      function e(t) {
        var o;
        return (
          (o =
            n.call(
              this,
              'Error producing to the Monorail Edge. Response received: ' +
                JSON.stringify(t),
            ) || this),
          Object.setPrototypeOf(o, e.prototype),
          (o.response = t),
          o
        );
      }
      return (Z(e, n), K(e));
    })(dn(Error)),
    Ye = (function (n) {
      function e(t) {
        var o;
        return (
          (o =
            n.call(
              this,
              'Error completing request. A network failure may have prevented the request from completing. Error: ' +
                t,
            ) || this),
          Object.setPrototypeOf(o, e.prototype),
          o
        );
      }
      return (Z(e, n), K(e));
    })(dn(Error)),
    Qe = (function () {
      function n(n, e) {
        (void 0 === n && (n = Ue),
          void 0 === e && (e = !1),
          (this.edgeDomain = n),
          (this.keepalive = e));
      }
      return K(
        n,
        [
          {
            key: 'produceBatch',
            value:
              ((t = J(
                pn().mark(function n(e) {
                  var t, o, r;
                  return pn().wrap(
                    function (n) {
                      for (;;)
                        switch ((n.prev = n.next)) {
                          case 0:
                            return (
                              (t = {events: Xe(e), metadata: Ke(e.metadata)}),
                              (n.prev = 1),
                              (n.next = 4),
                              fetch(this.produceBatchEndpoint(), {
                                method: 'post',
                                headers: nt(e.metadata),
                                body: JSON.stringify(t),
                                keepalive: this.keepalive,
                              })
                            );
                          case 4:
                            ((o = n.sent), (n.next = 10));
                            break;
                          case 7:
                            throw (
                              (n.prev = 7),
                              (n.t0 = n.catch(1)),
                              new Ye(n.t0)
                            );
                          case 10:
                            if (207 !== o.status) {
                              n.next = 15;
                              break;
                            }
                            return ((n.next = 13), o.json());
                          case 13:
                            throw ((r = n.sent), new Ze(r));
                          case 15:
                            if (o.ok) {
                              n.next = 23;
                              break;
                            }
                            return (
                              (n.t1 = $e),
                              (n.t2 = o.status),
                              (n.next = 20),
                              o.text()
                            );
                          case 20:
                            throw (
                              (n.t3 = n.sent),
                              (n.t4 = {status: n.t2, message: n.t3}),
                              new n.t1(n.t4)
                            );
                          case 23:
                            return n.abrupt('return', {status: o.status});
                          case 24:
                          case 'end':
                            return n.stop();
                        }
                    },
                    n,
                    this,
                    [[1, 7]],
                  );
                }),
              )),
              function (n) {
                return t.apply(this, arguments);
              }),
          },
          {
            key: 'produce',
            value:
              ((e = J(
                pn().mark(function n(e) {
                  var t, o;
                  return pn().wrap(
                    function (n) {
                      for (;;)
                        switch ((n.prev = n.next)) {
                          case 0:
                            return (
                              (t = !0),
                              e &&
                                e.options &&
                                Object.prototype.hasOwnProperty.call(
                                  e.options,
                                  'convertEventCase',
                                ) &&
                                (t = Boolean(e.options.convertEventCase)),
                              (n.prev = 2),
                              (n.next = 5),
                              et({
                                endpoint: this.produceEndpoint(),
                                keepalive: this.keepalive,
                                event: qe(
                                  qe({}, e),
                                  {},
                                  {payload: Ke(e.payload, t)},
                                ),
                              })
                            );
                          case 5:
                            ((o = n.sent), (n.next = 11));
                            break;
                          case 8:
                            throw (
                              (n.prev = 8),
                              (n.t0 = n.catch(2)),
                              new Ye(n.t0)
                            );
                          case 11:
                            if (o) {
                              n.next = 13;
                              break;
                            }
                            throw new $e({message: 'No response from edge'});
                          case 13:
                            if (o.ok) {
                              n.next = 21;
                              break;
                            }
                            return (
                              (n.t1 = $e),
                              (n.t2 = o.status),
                              (n.next = 18),
                              o.text()
                            );
                          case 18:
                            throw (
                              (n.t3 = n.sent),
                              (n.t4 = {status: n.t2, message: n.t3}),
                              new n.t1(n.t4)
                            );
                          case 21:
                            return n.abrupt('return', {status: o.status});
                          case 22:
                          case 'end':
                            return n.stop();
                        }
                    },
                    n,
                    this,
                    [[2, 8]],
                  );
                }),
              )),
              function (n) {
                return e.apply(this, arguments);
              }),
          },
          {
            key: 'produceBatchEndpoint',
            value: function () {
              return this.edgeDomain + '/unstable/produce_batch';
            },
          },
          {
            key: 'produceEndpoint',
            value: function () {
              return this.edgeDomain + Ge;
            },
          },
        ],
        [
          {
            key: 'withEndpoint',
            value: function (e) {
              return new n('https://' + new URL(e).hostname);
            },
          },
        ],
      );
      var e, t;
    })();
  function nt(n) {
    var e = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Monorail-Edge-Event-Created-At-Ms': (
        (n && n.eventCreatedAtMs) ||
        Date.now()
      ).toString(),
      'X-Monorail-Edge-Event-Sent-At-Ms': Date.now().toString(),
      'X-Monorail-Edge-Client-Message-Id': (
        (n && n.clientMessageId) ||
        Ve()
      ).toString(),
    };
    return (
      n && n.userAgent && (e['User-Agent'] = n.userAgent),
      n && n.remoteIp && (e['X-Forwarded-For'] = n.remoteIp),
      e
    );
  }
  function et(n) {
    return tt.apply(this, arguments);
  }
  function tt() {
    return (tt = J(
      pn().mark(function n(e) {
        var t, o, r;
        return pn().wrap(function (n) {
          for (;;)
            switch ((n.prev = n.next)) {
              case 0:
                return (
                  (t = e.endpoint),
                  (o = e.event),
                  (r = e.keepalive),
                  n.abrupt(
                    'return',
                    fetch(null != t ? t : ze + Ge, {
                      method: 'post',
                      headers: nt(o.metadata),
                      body: JSON.stringify({
                        schema_id: o.schemaId,
                        payload: o.payload,
                      }),
                      keepalive: r,
                    }),
                  )
                );
              case 2:
              case 'end':
                return n.stop();
            }
        }, n);
      }),
    )).apply(this, arguments);
  }
  var ot,
    rt,
    at,
    it,
    ct = (function () {
      return K(
        function n(e) {
          ((this.sendToConsole = e), e && n.printWelcomeMessage(e));
        },
        [
          {
            key: 'produce',
            value: function (n) {
              return (
                this.sendToConsole && console.log('Monorail event produced', n),
                new Promise(function (e) {
                  e(n);
                })
              );
            },
          },
          {
            key: 'produceBatch',
            value: function (n) {
              return (
                this.sendToConsole &&
                  console.log('Monorail Batch event produced', n),
                new Promise(function (e) {
                  e(n);
                })
              );
            },
          },
        ],
        [
          {
            key: 'printWelcomeMessage',
            value: function (n) {
              console.log(
                "%cðŸ‘‹ from Monorail%c\n\nWe've noticed that you're" +
                  (n ? '' : ' not') +
                  ' running in debug mode. As such, we will ' +
                  (n ? 'produce' : 'not produce') +
                  ' Monorail events to the console. \n\nIf you want Monorail events to ' +
                  (n ? 'stop' : 'start') +
                  ' appearing here, %cset debugMode=' +
                  (!n).toString() +
                  '%c, for the Monorail Log Producer in your code.',
                'font-size: large;',
                'font-size: normal;',
                'font-weight: bold;',
                'font-weight: normal;',
              );
            },
          },
        ],
      );
    })(),
    st = (function () {
      function n(e, t) {
        ((this.producer = e),
          (this.middleware = t),
          (this.executeChain = n.buildMiddlewareChain(
            this.middleware.concat(new Je(e)),
          )));
      }
      return K(
        n,
        [
          {
            key: 'produce',
            value: function (n) {
              return (
                (n.metadata = qe(
                  {eventCreatedAtMs: Date.now(), clientMessageId: Ve()},
                  n.metadata,
                )),
                this.executeChain(n)
              );
            },
          },
          {
            key: 'produceBatch',
            value: function (n) {
              return this.executeChain(n);
            },
          },
        ],
        [
          {
            key: 'createLogProducer',
            value: function (e) {
              return new n(new ct(e.debugMode), e.middleware || []);
            },
          },
          {
            key: 'createHttpProducerWithEndpoint',
            value: function (e, t) {
              return (void 0 === t && (t = []), new n(Qe.withEndpoint(e), t));
            },
          },
          {
            key: 'createHttpProducer',
            value: function (e) {
              var t = e.options && e.options.keepalive;
              return new n(
                e.production ? new Qe(ze, t) : new Qe(Ue, t),
                e.middleware || [],
              );
            },
          },
          {
            key: 'buildMiddlewareChain',
            value: function (n, e) {
              var t = this;
              return (
                void 0 === e && (e = 0),
                e === n.length
                  ? this.identityFn
                  : function (o) {
                      return n[e].do(o, t.buildMiddlewareChain(n, e + 1));
                    }
              );
            },
          },
        ],
      );
    })(),
    lt = (function () {
      function n(n) {
        var e = void 0 === n ? {} : n,
          t = e.shopDomain,
          o = e.isHeadless;
        ((this.VISIT_TOKEN = '_shopify_s'),
          (this.shopDomain = t),
          (this.isHeadless = o),
          (this.monorail = st.createHttpProducer({production: !0})));
      }
      return (
        (n.prototype.shouldEmit = function () {
          return !(this.isHeadless && !0);
        }),
        (n.prototype.emitInteraction = function (n, t) {
          if ((void 0 === t && (t = ''), this.shouldEmit())) {
            var o = this.getCommonPayload();
            this.monorail.produce({
              schemaId: 'privacy_banner_interact/1.2',
              payload: e(e(e({}, o), t && {interactionMetadata: t}), {
                interactionType: n,
              }),
            });
          }
        }),
        (n.prototype.emitRender = function () {
          if (this.shouldEmit()) {
            var n = this.getCommonPayload();
            this.monorail.produce({
              schemaId: 'privacy_banner_render/1.1',
              payload: e({}, n),
            });
          }
        }),
        (n.prototype.emitInitialized = function () {
          if (this.shouldEmit()) {
            var n = this.getCommonPayload();
            this.monorail.produce({
              schemaId: 'privacy_banner_initialized/1.0',
              payload: e({}, n),
            });
          }
        }),
        (n.prototype.visitorRegion = function () {
          var n = document.cookie.split(';').find(function (n) {
            return n.includes('_tracking_consent=');
          });
          if (!n) return null;
          var e = {};
          try {
            e = JSON.parse(unescape(n.split('=')[1]));
          } catch (n) {
            return null;
          }
          return e.region || null;
        }),
        (n.prototype.getCommonPayload = function () {
          var n,
            t =
              this.shopDomain ||
              (null === (n = window.Shopify) || void 0 === n ? void 0 : n.shop),
            o =
              (function (n) {
                for (
                  var e = 0, t = decodeURIComponent(document.cookie).split(';');
                  e < t.length;
                  e++
                ) {
                  var o = t[e].split('='),
                    r = o[0],
                    a = o[1];
                  if (r.trim() === n) return a;
                }
                return '';
              })(this.VISIT_TOKEN) || '0',
            r = window.location.pathname,
            a = this.visitorRegion();
          return e(
            {
              shopPermanentDomain: t,
              sessionToken: o,
              regulation: 'CMP',
              path: r,
            },
            a && {region: a},
          );
        }),
        n
      );
    })();
  function ut(n, e) {
    return (
      (null == e ? void 0 : e.id) && n.setAttribute('id', e.id),
      (null == e ? void 0 : e.class) && n.setAttribute('class', e.class),
      (null == e ? void 0 : e.onClick) &&
        n.addEventListener('click', e.onClick),
      (null == e ? void 0 : e.appendTo) && e.appendTo.appendChild(n),
      (null == e ? void 0 : e.role) && n.setAttribute('role', e.role),
      (null == e ? void 0 : e.autofocus) && n.setAttribute('autofocus', ''),
      (null == e ? void 0 : e.ariaHidden) &&
        n.setAttribute(
          'aria-hidden',
          ''.concat(null == e ? void 0 : e.ariaHidden),
        ),
      n
    );
  }
  function dt(n) {
    var e = ut(document.createElement('div'), n);
    return (
      (null == n ? void 0 : n.text) && (e.textContent = n.text),
      (null == n ? void 0 : n.ariaModal) &&
        e.setAttribute('aria-modal', n.ariaModal),
      (null == n ? void 0 : n.ariaLabelledby) &&
        e.setAttribute('aria-labelledby', n.ariaLabelledby),
      e
    );
  }
  function pt(n) {
    var e = ut(document.createElement('span'), n);
    return ((null == n ? void 0 : n.text) && (e.textContent = n.text), e);
  }
  function ft(n) {
    var e,
      t = ut(document.createElement('button'), n);
    return (
      (t.textContent =
        null !== (e = null == n ? void 0 : n.text) && void 0 !== e ? e : null),
      n.disabled && t.setAttribute('disabled', ''),
      n.ariaHaspopup && t.setAttribute('aria-haspopup', n.ariaHaspopup),
      n.type && t.setAttribute('type', n.type),
      n.ariaLabel && t.setAttribute('aria-label', n.ariaLabel),
      t
    );
  }
  function ht(n) {
    var e = ut(document.createElement('p'), n);
    return ((e.textContent = n.text), e);
  }
  function mt(n, e) {
    var t = ut(document.createElement(n), e);
    return ((t.textContent = e.text), t);
  }
  function yt(n) {
    return mt(at.H2, n);
  }
  function gt(n) {
    return mt(at.H3, n);
  }
  function vt(n) {
    var e = ut(document.createElement('style'), n);
    return ((e.textContent = n.content), e);
  }
  function bt(n) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    (e.setAttributeNS(null, 'width', n.width),
      e.setAttributeNS(null, 'height', n.height),
      e.setAttributeNS(
        null,
        'viewBox',
        '0 0 '.concat(n.width, ' ').concat(n.height),
      ),
      (null == n ? void 0 : n.fillRule) &&
        e.setAttributeNS(null, 'fill-rule', n.fillRule),
      (null == n ? void 0 : n.clipRule) &&
        e.setAttributeNS(null, 'clip-rule', n.clipRule));
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    return (
      t.setAttributeNS(null, 'fill', (null == n ? void 0 : n.colour) || '#000'),
      t.setAttributeNS(null, 'd', n.path),
      e.appendChild(t),
      (null == n ? void 0 : n.id) && e.setAttribute('id', n.id),
      (null == n ? void 0 : n.class) && e.setAttribute('class', n.class),
      (null == n ? void 0 : n.dataIconType) &&
        e.setAttribute('data-icon-type', n.dataIconType),
      (null == n ? void 0 : n.ariaHidden) &&
        e.setAttribute(
          'aria-hidden',
          ''.concat(null == n ? void 0 : n.ariaHidden),
        ),
      (null == n ? void 0 : n.focusable) &&
        e.setAttribute(
          'focusable',
          ''.concat(null == n ? void 0 : n.focusable),
        ),
      (null == n ? void 0 : n.appendTo) && n.appendTo.appendChild(e),
      e
    );
  }
  function wt(n) {
    var e = ut(document.createElement('section'), n);
    return (
      (null == n ? void 0 : n.text) && (e.textContent = n.text),
      (null == n ? void 0 : n.ariaModal) &&
        e.setAttribute('aria-modal', n.ariaModal),
      (null == n ? void 0 : n.ariaLabelledby) &&
        e.setAttribute('aria-labelledby', n.ariaLabelledby),
      e
    );
  }
  function Ct(n) {
    var e = n.bannerData,
      t = wt({
        id: be.DialogId,
        class: be.DialogClass,
        role: 'alertdialog',
        ariaModal: 'false',
        ariaLabelledby: be.BodyTitleId,
      }),
      o = dt({class: be.WrapperClass});
    t.appendChild(o);
    var r = dt({class: be.BodyClass});
    o.appendChild(r);
    var a = dt({class: be.ButtonsClass});
    return (
      a.classList.add(be.ButtonsGranularClass),
      o.appendChild(a),
      (function (n, e) {
        if (n.title) {
          var t = yt({id: be.BodyTitleId, text: n.title});
          e.appendChild(t);
        }
      })(e, r),
      (function (n, e) {
        var t = ht({text: ''.concat(n.text, ' ')}),
          o = (function (n) {
            var e = ut(document.createElement('a'), n);
            return (
              e.setAttribute('href', n.href),
              (e.textContent = n.text),
              e.setAttribute(
                'target',
                void 0 === n.target ? '_blank' : n.target,
              ),
              (n.target && '_blank' !== n.target) ||
                e.setAttribute('rel', 'noopener noreferrer'),
              e
            );
          })({
            id: be.BodyCopyPolicyLinkId,
            href: n.policyLinkUrl,
            target: '_blank',
            text: n.policyLinkText ? n.policyLinkText : 'Privacy Policy',
          });
        (t.appendChild(o), e.appendChild(t));
      })(e, r),
      (function (n, e) {
        var t = pt({text: n.buttonPrefsOpenText}),
          o = ft({
            id: be.ButtonManagePrefsId,
            class: be.ButtonManagePrefsClass,
            ariaHaspopup: 'dialog',
            type: 'button',
          });
        (o.appendChild(t), e.appendChild(o));
      })(e, a),
      (function (n, e) {
        e.appendChild(
          ft({
            id: be.ButtonAcceptId,
            class: be.ButtonAcceptClass,
            type: 'button',
            text: n.buttonAcceptText,
          }),
        );
      })(e, a),
      (function (n, e) {
        e.appendChild(
          ft({
            id: be.ButtonDeclineId,
            class: be.ButtonDeclineClass,
            type: 'button',
            text: n.buttonDeclineText,
          }),
        );
      })(e, a),
      t
    );
  }
  function xt(n, e) {
    var t,
      o,
      r,
      a,
      i = ((t = {appendTo: n}), ut(document.createElement('header'), t));
    ((o = i),
      (r = 'Close dialog'),
      bt({
        appendTo: (a = ft({
          id: we.HeaderCloseId,
          class: we.HeaderCloseClass,
          ariaLabel: r,
          type: 'button',
          text: '',
        })),
        ariaHidden: !0,
        width: '12',
        height: '12',
        path: 'M7.41401 6.00012L11.707 1.70721C12.098 1.31622 12.098 0.684236 11.707 0.293244C11.316 -0.097748 10.684 -0.097748 10.293 0.293244L6.00001 4.58615L1.70701 0.293244C1.31601 -0.097748 0.684006 -0.097748 0.293006 0.293244C-0.0979941 0.684236 -0.0979941 1.31622 0.293006 1.70721L4.58601 6.00012L0.293006 10.293C-0.0979941 10.684 -0.0979941 11.316 0.293006 11.707C0.488006 11.902 0.744006 12 1.00001 12C1.25601 12 1.51201 11.902 1.70701 11.707L6.00001 7.4141L10.293 11.707C10.488 11.902 10.744 12 11 12C11.256 12 11.512 11.902 11.707 11.707C12.098 11.316 12.098 10.684 11.707 10.293L7.41401 6.00012Z',
      }),
      o.appendChild(a),
      yt({id: we.HeaderTitleId, text: e.preferences.title, appendTo: i}));
    var c = dt({class: we.HeaderActionsClass, appendTo: i});
    return (
      (function (n, e) {
        n.appendChild(ft({id: we.HeaderAcceptId, type: 'button', text: e}));
      })(c, e.preferences.buttonAcceptText),
      (function (n, e) {
        n.appendChild(ft({id: we.HeaderDeclineId, type: 'button', text: e}));
      })(c, e.preferences.buttonDeclineText),
      (function (n, e) {
        n.appendChild(ft({id: we.HeaderSaveId, type: 'button', text: e}));
      })(c, e.preferences.buttonSaveText),
      i
    );
  }
  function kt(n, e) {
    var t = dt({class: we.IntroClass, appendTo: n});
    return (
      (function (n, e) {
        var t = dt({class: we.IntroMainClass, appendTo: n});
        (gt({text: e.preferences.introTitle, appendTo: t}),
          ht({text: e.preferences.introText, appendTo: t}));
      })(t, e),
      e.preferences.bulletPoints.enabled &&
        (function (n, e) {
          var t = dt({class: we.IntroExplainWrapperClass, appendTo: n}),
            o = dt({class: we.IntroExplainAcceptClass, appendTo: t});
          gt({text: e.preferences.bulletPoints.title || '', appendTo: o});
          var r = [];
          e.preferences.bulletPoints.firstText &&
            r.push(e.preferences.bulletPoints.firstText);
          e.preferences.bulletPoints.secondText &&
            r.push(e.preferences.bulletPoints.secondText);
          e.preferences.bulletPoints.thirdText &&
            r.push(e.preferences.bulletPoints.thirdText);
          (function (n) {
            var e = ut(document.createElement('ul'), n);
            n.lis &&
              n.lis.forEach(function (n) {
                var t = document.createElement('li');
                ((t.textContent = n), e.appendChild(t));
              });
          })({lis: r, appendTo: o});
        })(t, e),
      t
    );
  }
  function _t(n) {
    var t = n.themeColours,
      o = n.purpose,
      r = n.ids,
      a = n.parent,
      i = r.input === we.OptionEssentialInputId,
      c = bt({
        dataIconType: 'unchecked',
        width: '24',
        height: '24',
        path: 'M5 2c-1.654 0-3 1.346-3 3v14c0 1.654 1.346 3 3 3h14c1.654 0 3-1.346 3-3v-14c0-1.654-1.346-3-3-3h-14zm19 3v14c0 2.761-2.238 5-5 5h-14c-2.762 0-5-2.239-5-5v-14c0-2.761 2.238-5 5-5h14c2.762 0 5 2.239 5 5z',
        colour: t.iconColor,
        focusable: !0,
      }),
      s = (function (n) {
        return bt({
          dataIconType: 'checked',
          width: '24',
          height: '24',
          path: 'M19 0h-14c-2.762 0-5 2.239-5 5v14c0 2.761 2.238 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-8.959 17l-4.5-4.319 1.395-1.435 3.08 2.937 7.021-7.183 1.422 1.409-8.418 8.591z',
          colour: n,
          focusable: !0,
        });
      })(t.iconColor),
      l = dt({class: we.OptionClass, id: r.section}),
      u = (function (n) {
        var e = ut(document.createElement('label'), n);
        return (
          e.setAttribute('for', n.for),
          (null == n ? void 0 : n.text) && (e.textContent = n.text),
          e
        );
      })({appendTo: l, for: r.input, text: o.description});
    !(function (n) {
      var e = ut(document.createElement('input'), n);
      (e.setAttribute('type', n.type),
        n.checked && e.setAttribute('checked', 'true'),
        n.disabled && e.setAttribute('disabled', ''.concat(n.disabled)),
        (null == n ? void 0 : n.onChange) &&
          e.addEventListener('change', n.onChange),
        n.tabindex && e.setAttribute('tabindex', ''.concat(n.tabindex)),
        !0 === n.ariaReadonly &&
          e.setAttribute('aria-readonly', ''.concat(n.ariaReadonly)));
    })(
      e(
        {
          appendTo: u,
          id: r.input,
          type: 'checkbox',
          checked: i,
          ariaReadonly: i,
        },
        n.tabindex && {tabindex: n.tabindex},
      ),
    );
    var d = pt({appendTo: u, ariaHidden: !0});
    (d.appendChild(s),
      d.appendChild(c),
      ht({appendTo: l, text: o.longDescription}),
      i
        ? ((s.style.display = 'block'), (c.style.display = 'none'))
        : ((s.style.display = 'none'), (c.style.display = 'block')),
      a.appendChild(l));
  }
  function It(n) {
    var e = n.bannerData,
      t = dt({id: we.WrapperId, class: we.WrapperClass}),
      o = dt({id: we.OverlayId, class: we.OverlayClass, text: ' '});
    t.appendChild(o);
    var r = wt({
      id: we.DialogId,
      class: we.DialogClass,
      role: 'dialog',
      ariaModal: 'true',
      ariaLabelledby: we.HeaderTitleId,
    });
    (t.appendChild(r), xt(r, e));
    var a = dt({class: we.DialogScrollableClass});
    return (
      r.appendChild(a),
      kt(a, e),
      (function (n, e) {
        var t = De(
            e.theme.theme,
            e.theme.fontColor,
            e.theme.backgroundColor,
            e.theme.buttonFontColor,
            e.theme.buttonBackgroundColor,
          ),
          o = dt({class: we.OptionWrapperClass});
        (n.appendChild(o),
          _t({
            themeColours: t,
            ids: {
              section: we.OptionEssentialId,
              input: we.OptionEssentialInputId,
            },
            purpose: {
              description: e.preferences.purposes.essentialName,
              longDescription: e.preferences.purposes.essentialDesc,
            },
            parent: o,
            tabindex: '-1',
          }),
          _t({
            themeColours: t,
            ids: {
              section: we.OptionPreferencesId,
              input: we.OptionPreferencesInputId,
            },
            purpose: {
              description: e.preferences.purposes.preferencesName,
              longDescription: e.preferences.purposes.preferencesDesc,
            },
            parent: o,
          }),
          _t({
            themeColours: t,
            ids: {
              section: we.OptionMarketingId,
              input: we.OptionMarketingInputId,
            },
            purpose: {
              description: e.preferences.purposes.marketingName,
              longDescription: e.preferences.purposes.marketingDesc,
            },
            parent: o,
          }),
          _t({
            themeColours: t,
            ids: {
              section: we.OptionAnalyticsId,
              input: we.OptionAnalyticsInputId,
            },
            purpose: {
              description: e.preferences.purposes.performanceName,
              longDescription: e.preferences.purposes.performanceDesc,
            },
            parent: o,
          }));
      })(a, e),
      t
    );
  }
  (!(function (n) {
    ((n.Accepted = 'accept'),
      (n.Declined = 'decline'),
      (n.AcceptedAll = 'accept_all'),
      (n.DeclinedAll = 'decline_all'),
      (n.ManagePreferences = 'manage_preferences'),
      (n.Save = 'save'),
      (n.LeavePreferences = 'leave_preferences'),
      (n.PrivacyPolicyView = 'privacy_policy_view'));
  })(ot || (ot = {})),
    (function (n) {
      ((n.BottomFullWidth = 'bottom-full-width'),
        (n.BottomLeft = 'bottom-left'),
        (n.Center = 'center'),
        (n.BottomRight = 'bottom-right'),
        (n.BottomCenter = 'bottom-center'));
    })(rt || (rt = {})),
    (function (n) {
      ((n.H1 = 'h1'), (n.H2 = 'h2'), (n.H3 = 'h3'));
    })(at || (at = {})),
    (function (n) {
      ((n.Escape = 'Escape'), (n.Tab = 'Tab'));
    })(it || (it = {})));
  var Dt = (function () {
      function n(n) {
        var e = n.bannerData,
          t = n.storefrontAccessToken,
          o = n.checkoutRootDomain,
          r = n.storefrontRootDomain;
        ((this.bannerData = e),
          t
            ? ((this.storefrontAccessToken = t),
              (this.checkoutRootDomain = o),
              (this.storefrontRootDomain = r),
              (this.logger = new lt({shopDomain: o, isHeadless: !0})))
            : (this.logger = new lt()));
      }
      return (
        (n.show = function () {
          var n = document.getElementById(we.WrapperId);
          null !== n &&
            ((n.style.display = 'block'),
            document.body.style.setProperty('overflow', 'hidden'));
        }),
        (n.hide = function (n) {
          var e = document.getElementById(we.WrapperId);
          (null !== e &&
            ((e.style.display = 'none'),
            document.body.style.removeProperty('overflow')),
            n && n.focus());
        }),
        (n.hideModalAndBanner = function (e) {
          n.hide();
          var t = document.getElementById(be.DialogId);
          (null !== t && (t.style.display = 'none'), e && e.focus());
        }),
        (n.selectedConsent = function () {
          var n = document.getElementById(we.OptionMarketingInputId),
            e = document.getElementById(we.OptionAnalyticsInputId),
            t = document.getElementById(we.OptionPreferencesInputId),
            o = n.checked ? '1' : '0',
            r = e.checked ? '1' : '0',
            a = t.checked ? '1' : '0';
          return ''.concat(o).concat(r).concat(a);
        }),
        (n.prototype.init = function () {
          return t(this, void 0, void 0, function () {
            return o(this, function (n) {
              return (this.render(), [2]);
            });
          });
        }),
        (n.prototype.setCheckboxesToCurrentConsent = function () {
          var n = document.getElementById(we.OptionAnalyticsInputId),
            e = document.getElementById(we.OptionPreferencesInputId),
            t = document.getElementById(we.OptionMarketingInputId);
          (this.handleOptionChange({
            target: n,
            isReadOnly: !1,
            sectionId: we.OptionAnalyticsId,
            checked: fe(),
          }),
            this.handleOptionChange({
              target: e,
              isReadOnly: !1,
              sectionId: we.OptionPreferencesId,
              checked: he(),
            }),
            this.handleOptionChange({
              target: t,
              isReadOnly: !1,
              sectionId: we.OptionMarketingId,
              checked: pe(),
            }));
        }),
        (n.prototype.render = function () {
          (this.addCSS(this.bannerData),
            this.addHTML(this.bannerData),
            (this.previouslyFocusedElement = document.activeElement),
            n.show(),
            this.setupCheckboxEventHandlers(),
            this.setupButtonEventHandlers(),
            this.setupKeyboardEventHandlers(),
            this.logger.emitInteraction(ot.ManagePreferences));
        }),
        (n.prototype.addCSS = function (n) {
          var e = (function (n) {
              var e = n.bannerData,
                t = n.selectorPrefix,
                o = t ? ''.concat(t, ' ') : '',
                r = De(
                  e.theme.theme,
                  e.theme.fontColor,
                  e.theme.backgroundColor,
                  e.theme.buttonFontColor,
                  e.theme.buttonBackgroundColor,
                );
              return '\n    '
                .concat(o, '.')
                .concat(
                  we.WrapperClass,
                  ' {\n      position: relative;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.WrapperClass,
                  ':after {\n      content: "";\n      display: block;\n      clear: both;\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' {\n      box-shadow: 0 5px 10px rgb(63 63 68 / 50%);\n      position: fixed;\n      z-index: 2000002;\n      opacity: 1;\n      background-color: ',
                )
                .concat(
                  r.backgroundColor,
                  ';\n      max-height: 80%;\n      overflow-y: auto;\n      top: 50%;\n      transform: translate(0, -50%);\n      min-width: 280px;\n      border-radius: 3px;\n      display: flex;\n      flex-direction: column;\n      left: 25%;\n      width: 50%;\n      text-align: left;\n    }\n    @media only screen and (max-width: 1900px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' {\n        left: 20%;\n        width: 60%;\n      }\n    }\n    @media only screen and (max-width: 1600px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' {\n        left: 15%;\n        width: 70%;\n      }\n    }\n    @media only screen and (max-width: 1350px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' {\n        left: 5%;\n        width: 90%;\n      }\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OverlayClass,
                  ' {\n      z-index: 2000001;\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      background-color: rgba(0, 0, 0, 0.6);\n    }\n\n    /* Header */\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' header {\n      display: flex;\n      flex-direction: row;\n      justify-content: space-between;\n      align-items: center;\n      padding: 32px 32px 20px 32px;\n      border-bottom: 1px solid ',
                )
                .concat(
                  r.sectionDivider,
                  ';\n      position: relative;\n      background: transparent;\n    }\n\n    @media only screen and (max-width: 1200px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' header {\n        flex-direction: column;\n      }\n    }\n    @media only screen and (max-width: 400px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' header {\n        padding: 15px 20px 10px 20px;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(we.DialogClass, ' header h2 {\n      color: ')
                .concat(
                  r.fontColor,
                  ';\n      font-family: inherit;\n      margin: 0;\n      padding: 0 20px 0 0 !important;\n      font-weight: 600;\n      font-size: 130%;\n      line-height: 1.2;\n      width: 100%;\n      text-align: left;\n      word-break: normal;\n    }\n    @media only screen and (max-width: 1200px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' header h2 {\n        margin: 0 0 .8em 0;\n        padding: 0 !important;\n        text-align: center;\n      }\n    }\n    @media only screen and (max-width: 750px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogClass,
                  ' header h2 {\n        text-align: left;\n        padding: 0 25px 0 0 !important;\n      }\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ' {\n      position: absolute;\n      top: 40px;\n      right: 35px;\n      width: 24px;\n      height: 24px;\n      padding: 0;\n      margin: 0;\n      background: transparent;\n      border: none;\n      outline: none;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      align-content: center;\n      border-radius: 50%;\n      min-width: 24px;\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ' svg {\n      height: 12px;\n      width: 12px;\n    }\n\n    @media only screen and (max-width: 1200px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ' {\n        top: 20px;\n        right: 20px;\n      }\n    }\n    @media only screen and (max-width: 750px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ' {\n        top: 30px;\n        right: 30px;\n      }\n    }\n    @media only screen and (max-width: 400px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ' {\n        top: 15px;\n        right: 15px;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ':hover {\n      cursor: pointer;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ':focus {\n      outline: none;\n      box-shadow: 0 0 0 3px ',
                )
                .concat(r.focused, ';\n    }\n    ')
                .concat(o, '.')
                .concat(we.HeaderCloseClass, ' svg path {\n      fill: ')
                .concat(r.fontColor, ';\n    }\n    ')
                .concat(o, '.')
                .concat(
                  we.HeaderCloseClass,
                  ':disabled svg path {\n      fill: ',
                )
                .concat(r.sectionDivider, ';\n    }\n\n    ')
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' {\n      margin: 0;\n      display: flex;\n      justify-content: space-around;\n      flex-direction: row;\n      padding: 0 50px 0 0;\n      width: auto;\n    }\n\n    @media only screen and (max-width: 750px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' {\n        flex-direction: column;\n        width: 100%;\n      }\n    }\n    @media only screen and (max-width: 1200px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' {\n        padding: 0;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button {\n      text-decoration: none;\n      font-family: inherit;\n      padding: 8px 25px 10px 25px;\n      margin: 0 20px 0 0;\n      font-size: 110%;\n      background: ',
                )
                .concat(r.button.backgroundColor, ';\n      color: ')
                .concat(r.button.fontColor, ';\n      border: 1px solid ')
                .concat(
                  r.button.borderColor,
                  ';\n      white-space: nowrap;\n      border-radius: 2px;\n      line-height: 120%;\n      height: unset;\n    }\n    @media only screen and (max-width: 750px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button {\n        width: 100%;\n        margin-bottom: 15px;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button.primary {\n      background: ',
                )
                .concat(r.primaryButton.backgroundColor, ';\n      color: ')
                .concat(
                  r.primaryButton.fontColor,
                  ';\n      border: 1px solid ',
                )
                .concat(r.primaryButton.borderColor, ';\n    }\n    ')
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button:last-child {\n      margin-right: 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button:hover {\n      cursor: pointer;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.HeaderActionsClass,
                  ' button:focus {\n      outline: none;\n      box-shadow: 0 0 0 4px ',
                )
                .concat(r.focused, ';\n    }\n\n    ')
                .concat(o, '.')
                .concat(
                  we.DialogScrollableClass,
                  ' {\n      overflow-y: auto;\n      position: relative;\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.DialogScrollableClass,
                  '::-webkit-scrollbar {\n      width: 0px;\n      background: transparent;\n    }\n\n    /* Intro */\n\n    ',
                )
                .concat(o, '.')
                .concat(we.IntroClass, ' h3 {\n      color: ')
                .concat(
                  r.fontColor,
                  ';\n      font-family: inherit;\n      margin: 0 0 15px 0;\n      padding: 0 !important;\n      font-weight: 600;\n      line-height: 1.2;\n      text-align: left;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(we.IntroClass, ' p {\n      color: ')
                .concat(
                  r.fontSubduedColor,
                  ';\n      font-family: inherit;\n      margin: 0;\n      padding: 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroClass,
                  ' ul {\n      margin: 0;\n      padding: 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroClass,
                  ' ul li {\n      margin: 0 0 0.5em 1.7em;\n      padding: 0;\n      line-height: 1.2;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroMainClass,
                  ' {\n      padding: 20px 32px 0 32px;\n      line-height: 1.5;\n    }\n    @media only screen and (max-width: 400px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroMainClass,
                  ' {\n        padding: 20px 20px 0 20px;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroMainClass,
                  ' p {\n      padding-bottom: 20px;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroMainClass,
                  ' h3 {\n      font-size: 110%;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroMainClass,
                  ' p {\n      font-size: 105%;\n      margin: 0;\n      padding: 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainWrapperClass,
                  ' {\n      display: flex;\n      flex-direction: row;\n      justify-content: center;\n      margin: 0;\n      padding: 20px 32px 0 32px;\n      color: ',
                )
                .concat(
                  r.fontSubduedColor,
                  ';\n    }\n    @media only screen and (max-width: 700px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainWrapperClass,
                  ' {\n        flex-direction: column;\n        padding-bottom: 0;\n      }\n    }\n    @media only screen and (max-width: 400px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainWrapperClass,
                  ' {\n        padding: 20px 20px 0 20px;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainAcceptClass,
                  ' {\n      width: 100%;\n      padding: 0 40px 0 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainAcceptClass,
                  ' li {\n      list-style-type: disc;\n    }\n    @media only screen and (max-width: 700px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainAcceptClass,
                  ' {\n        width: 100%;\n        padding-right: 0;\n      }\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.IntroExplainAcceptClass,
                  ' h3 {\n      font-size: 110%;\n    }\n\n    /* Options */\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionWrapperClass,
                  ' {\n      padding: 0 32px 32px 32px;\n      color: ',
                )
                .concat(
                  r.fontColor,
                  ';\n    }\n    @media only screen and (max-width: 400px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionWrapperClass,
                  ' {\n        padding: 0 20px 15px 20px;\n      }\n    }\n\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' {\n      margin: 0;\n      font-size: 100%;\n      line-height: 1.1;\n      padding: 20px 0 0 0;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ':first-child {\n      padding: 25px 0 0 0;\n      margin: 20px 0 0 0;\n      border-top: 1px solid ',
                )
                .concat(r.sectionDivider, ';\n    }\n    ')
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label {\n      display: flex;\n      gap: 20px;\n      color: ',
                )
                .concat(
                  r.fontColor,
                  ';\n      cursor: pointer;\n      font-family: inherit;\n      margin: 0 0 5px 0;\n      padding: 0;\n      font-weight: 600;\n      font-size: 110%;\n      line-height: 1.2;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label input {\n      position: absolute;\n      clip: rect(1px, 1px, 1px, 1px);\n      padding: 0;\n      border: 0;\n      height: 1px;\n      width: 1px;\n      overflow: hidden;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label span {\n      order: -1;\n      display: inline-block;\n      background-color: ',
                )
                .concat(
                  r.backgroundColor,
                  ';\n      width: 24px;\n      height: 24px;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label span svg {\n      background-color: ',
                )
                .concat(
                  r.backgroundColor,
                  ';\n      border-radius: 3px;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label input[aria-readonly="true"] ~ span svg {\n      opacity: 0.2;\n      cursor: not-allowed;\n    }\n    ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label input:focus ~ span {\n      background-color: ',
                )
                .concat(r.focused, ';\n    }\n    ')
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' label input:focus ~ span svg {\n      outline: none;\n      border-radius: 5px;\n      box-shadow: 0 0 0 4px ',
                )
                .concat(r.focused, ';\n    }\n    ')
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' p {\n      line-height: 1.3;\n      font-size: 100%;\n      color: ',
                )
                .concat(
                  r.fontSubduedColor,
                  ';\n      margin: 0;\n      padding: 0 0 0 45px;\n    }\n    @media only screen and (max-width: 700px) {\n      ',
                )
                .concat(o, '.')
                .concat(
                  we.OptionClass,
                  ' p {\n        width: 100%;\n        line-height: 1.4;\n      }\n    }\n  ',
                );
            })({bannerData: n}),
            t = vt({id: we.StylesContainerId, content: e});
          document.head.appendChild(t);
        }),
        (n.prototype.addHTML = function (e) {
          var t,
            o,
            r,
            a = It({bannerData: e}),
            i = document.getElementById(be.DialogId);
          ((o = a),
            null === (r = null == (t = i) ? void 0 : t.parentNode) ||
              void 0 === r ||
              r.insertBefore(o, t.nextSibling));
          var c = document.getElementById(we.DialogId);
          (c &&
            (this.setCheckboxesToCurrentConsent(),
            (c.dataset.consent = n.selectedConsent())),
            n.hide());
        }),
        (n.prototype.handleOptionChange = function (e) {
          var t = e.target,
            o = e.isReadOnly,
            r = e.sectionId,
            a = e.checked;
          ((void 0 !== a && a) || o) && (t.checked = !0);
          var i,
            c,
            s,
            l = t.checked,
            u = document.getElementById(r),
            d = u.querySelector('svg[data-icon-type="checked"]'),
            p = u.querySelector('svg[data-icon-type="unchecked"]');
          (l
            ? ((d.style.display = 'block'), (p.style.display = 'none'))
            : ((d.style.display = 'none'), (p.style.display = 'block')),
            (i = n.selectedConsent()),
            (c = document.getElementById(we.DialogId)),
            (s = document.getElementById(we.HeaderSaveId)),
            (null == c ? void 0 : c.dataset.consent) &&
            (null == c ? void 0 : c.dataset.consent) !== i
              ? (s.className = 'primary')
              : (s.className = ''));
        }),
        (n.prototype.setupCheckboxEventHandlers = function () {
          var n = this,
            e = document.getElementById(we.OptionEssentialInputId);
          null == e ||
            e.addEventListener('change', function (e) {
              n.handleOptionChange({
                target: e.target,
                isReadOnly: !0,
                sectionId: we.OptionEssentialId,
              });
            });
          var t = document.getElementById(we.OptionAnalyticsInputId);
          null == t ||
            t.addEventListener('change', function (e) {
              n.handleOptionChange({
                target: e.target,
                isReadOnly: !1,
                sectionId: we.OptionAnalyticsId,
              });
            });
          var o = document.getElementById(we.OptionPreferencesInputId);
          null == o ||
            o.addEventListener('change', function (e) {
              n.handleOptionChange({
                target: e.target,
                isReadOnly: !1,
                sectionId: we.OptionPreferencesId,
              });
            });
          var r = document.getElementById(we.OptionMarketingInputId);
          null == r ||
            r.addEventListener('change', function (e) {
              n.handleOptionChange({
                target: e.target,
                isReadOnly: !1,
                sectionId: we.OptionMarketingId,
              });
            });
        }),
        (n.prototype.setupButtonEventHandlers = function () {
          var e = this,
            t = document.getElementById(we.HeaderCloseId);
          null == t ||
            t.addEventListener('click', function () {
              (n.hide(e.previouslyFocusedElement),
                e.logger.emitInteraction(ot.LeavePreferences));
            });
          var o = document.getElementById(we.HeaderSaveId);
          null == o ||
            o.addEventListener('click', function () {
              if (je()) n.hideModalAndBanner(e.previouslyFocusedElement);
              else {
                var t = document.getElementById(we.OptionMarketingInputId),
                  o = document.getElementById(we.OptionAnalyticsInputId),
                  r = document.getElementById(we.OptionPreferencesInputId),
                  a = t.checked,
                  i = o.checked,
                  c = r.checked;
                (Pe({
                  marketing: a,
                  analytics: i,
                  preferences: c,
                  checkoutRootDomain: e.checkoutRootDomain,
                  storefrontRootDomain: e.storefrontRootDomain,
                  storefrontAccessToken: e.storefrontAccessToken,
                  callback: function () {
                    n.hideModalAndBanner(e.previouslyFocusedElement);
                  },
                }),
                  e.logger.emitInteraction(
                    ot.Save,
                    ''
                      .concat(a ? 'm' : '')
                      .concat(i ? 'a' : '')
                      .concat(c ? 'p' : ''),
                  ));
              }
            });
          var r = document.getElementById(we.HeaderAcceptId);
          null == r ||
            r.addEventListener('click', function () {
              je()
                ? n.hideModalAndBanner(e.previouslyFocusedElement)
                : (Pe({
                    marketing: !0,
                    analytics: !0,
                    preferences: !0,
                    checkoutRootDomain: e.checkoutRootDomain,
                    storefrontRootDomain: e.storefrontRootDomain,
                    storefrontAccessToken: e.storefrontAccessToken,
                    callback: function () {
                      n.hideModalAndBanner(e.previouslyFocusedElement);
                    },
                  }),
                  e.logger.emitInteraction(ot.AcceptedAll));
            });
          var a = document.getElementById(we.HeaderDeclineId);
          null == a ||
            a.addEventListener('click', function () {
              je()
                ? n.hideModalAndBanner(e.previouslyFocusedElement)
                : (Pe({
                    marketing: !1,
                    analytics: !1,
                    preferences: !1,
                    checkoutRootDomain: e.checkoutRootDomain,
                    storefrontRootDomain: e.storefrontRootDomain,
                    storefrontAccessToken: e.storefrontAccessToken,
                    callback: function () {
                      n.hideModalAndBanner(e.previouslyFocusedElement);
                    },
                  }),
                  e.logger.emitInteraction(ot.DeclinedAll));
            });
        }),
        (n.prototype.setupKeyboardEventHandlers = function () {
          var n = this,
            e = document.getElementById(we.DialogId);
          if (e) {
            var t = this.getFocusableElements(e);
            (e.addEventListener('keydown', function (e) {
              (n.escToClose(e), n.tabTrap(e, t));
            }),
              this.focusFirstEle(t));
          }
        }),
        (n.prototype.getFocusableElements = function (n) {
          return Array.from(
            n.querySelectorAll(
              'button, [href], input:not([tabindex="-1"]), select, textarea, [tabindex="0"]',
            ),
          );
        }),
        (n.prototype.focusFirstEle = function (n) {
          (null == n ? void 0 : n.length) && n[0].focus();
        }),
        (n.prototype.escToClose = function (e) {
          e.key === it.Escape &&
            (n.hide(this.previouslyFocusedElement),
            this.logger.emitInteraction(ot.LeavePreferences));
        }),
        (n.prototype.tabTrap = function (n, e) {
          if ((null == e ? void 0 : e.length) && n.key === it.Tab) {
            var t = e[0],
              o = e[e.length - 1];
            t &&
              o &&
              (n.shiftKey && document.activeElement === t
                ? (n.preventDefault(), o.focus())
                : n.shiftKey ||
                  document.activeElement !== o ||
                  (n.preventDefault(), t.focus()));
          }
        }),
        n
      );
    })(),
    Et = (function () {
      function n(n) {
        var e = void 0 === n ? {} : n,
          t = e.storefrontAccessToken,
          o = e.checkoutRootDomain,
          r = e.storefrontRootDomain,
          a = e.locale,
          i = e.country;
        ((this.locale = a),
          (this.country = i),
          (this.storefrontAccessToken = t));
        var c = t;
        (c && ((this.checkoutRootDomain = o), (this.storefrontRootDomain = r)),
          (this.logger = new lt({shopDomain: o, isHeadless: Boolean(c)})),
          (this.preferencesModal = void 0));
      }
      return (
        (n.show = function () {
          var n = document.getElementById(be.DialogId);
          if (null !== n) {
            n.style.display = 'block';
            var e = function (n) {
              if ('Tab' === n.code) {
                n.preventDefault();
                var t = document.getElementById(be.ButtonManagePrefsId);
                null == t || t.focus();
              }
              window.removeEventListener('keydown', e);
            };
            window.addEventListener('keydown', e);
          }
        }),
        (n.hide = function () {
          var n = document.getElementById(be.DialogId);
          null !== n && (n.style.display = 'none');
        }),
        (n.prototype.init = function () {
          return t(this, arguments, void 0, function (t) {
            var r, a;
            return (
              void 0 === t && (t = !1),
              o(this, function (o) {
                switch (o.label) {
                  case 0:
                    return (
                      o.trys.push([0, 3, , 4]),
                      [
                        4,
                        Ne.getServerData(
                          this.checkoutRootDomain,
                          this.storefrontAccessToken,
                          this.locale,
                          this.country,
                        ),
                      ]
                    );
                  case 1:
                    return (r = o.sent()) && Object.keys(r).length
                      ? [
                          4,
                          'loading' !== document.readyState
                            ? Promise.resolve()
                            : new Promise(function (n) {
                                document.addEventListener(
                                  'DOMContentLoaded',
                                  n,
                                );
                              }),
                        ]
                      : (console.warn(
                          'banner not rendered due to lack of saved data',
                        ),
                        [2, Promise.resolve(!1)]);
                  case 2:
                    return (
                      o.sent(),
                      this.removeExistingElements(),
                      this.render(e({}, r)),
                      t &&
                        ((this.preferencesModal = new Dt({
                          bannerData: r,
                          storefrontAccessToken: this.storefrontAccessToken,
                          checkoutRootDomain: this.checkoutRootDomain,
                          storefrontRootDomain: this.storefrontRootDomain,
                        })),
                        this.preferencesModal.init(),
                        n.hide()),
                      [2, Promise.resolve(!0)]
                    );
                  case 3:
                    return (
                      (a = o.sent()),
                      this.removeExistingElements(),
                      [2, Promise.reject(a)]
                    );
                  case 4:
                    return [2];
                }
              })
            );
          });
        }),
        (n.prototype.render = function (e) {
          var t = e.enabled,
            o = window.Shopify.country,
            r = He() && this.isCountryInRegionVisibility(o, e),
            a = je() || r || t;
          (a &&
            !document.getElementById(be.DialogId) &&
            (this.addCSS(e), this.addBannerHTML(e)),
            a && Re() && (n.show(), He() || this.logger.emitRender()));
        }),
        (n.prototype.isCountryInRegionVisibility = function (n, e) {
          var t;
          return null === (t = e.regionVisibility) || void 0 === t
            ? void 0
            : t.includes(n);
        }),
        (n.prototype.addCSS = function (n) {
          var e = vt({id: be.StylesContainerId, content: Ee({bannerData: n})});
          document.head.appendChild(e);
        }),
        (n.prototype.addBannerHTML = function (n) {
          var e = Ct({bannerData: n}),
            t = document.getElementsByTagName('body')[0];
          (t.insertBefore(e, t.firstChild), this.addEventListeners(n));
        }),
        (n.prototype.removeExistingElements = function () {
          var n,
            e,
            t,
            o,
            r = document.getElementById(be.DialogId),
            a = document.getElementById(be.StylesContainerId),
            i = document.getElementById(we.WrapperId),
            c = document.getElementById(we.StylesContainerId);
          (null === (n = null == r ? void 0 : r.parentNode) ||
            void 0 === n ||
            n.removeChild(r),
            null === (e = null == a ? void 0 : a.parentNode) ||
              void 0 === e ||
              e.removeChild(a),
            null === (t = null == i ? void 0 : i.parentNode) ||
              void 0 === t ||
              t.removeChild(i),
            null === (o = null == c ? void 0 : c.parentNode) ||
              void 0 === o ||
              o.removeChild(c));
        }),
        (n.prototype.addEventListeners = function (n) {
          var e = this;
          (this.addEssentialEventListeners(),
            je() || this.addMetricsEventListeners());
          var t = document.getElementById(be.ButtonManagePrefsId);
          null == t ||
            t.addEventListener('click', function (t) {
              (t.preventDefault(),
                (e.preferencesModal = new Dt({
                  bannerData: n,
                  storefrontAccessToken: e.storefrontAccessToken,
                  checkoutRootDomain: e.checkoutRootDomain,
                  storefrontRootDomain: e.storefrontRootDomain,
                })),
                e.preferencesModal.init());
            });
        }),
        (n.prototype.addEssentialEventListeners = function () {
          var e = this,
            t = document.getElementById(be.ButtonAcceptId);
          null == t ||
            t.addEventListener('click', function () {
              je()
                ? n.hide()
                : Pe({
                    marketing: !0,
                    analytics: !0,
                    preferences: !0,
                    checkoutRootDomain: e.checkoutRootDomain,
                    storefrontRootDomain: e.storefrontRootDomain,
                    storefrontAccessToken: e.storefrontAccessToken,
                    callback: n.hide,
                  });
            });
          var o = document.getElementById(be.ButtonDeclineId);
          null == o ||
            o.addEventListener('click', function () {
              je()
                ? n.hide()
                : Pe({
                    marketing: !1,
                    analytics: !1,
                    preferences: !1,
                    checkoutRootDomain: e.checkoutRootDomain,
                    storefrontRootDomain: e.storefrontRootDomain,
                    storefrontAccessToken: e.storefrontAccessToken,
                    callback: n.hide,
                  });
            });
        }),
        (n.prototype.addMetricsEventListeners = function () {
          var n = this,
            e = document.getElementById(be.BodyCopyPolicyLinkId);
          null == e ||
            e.addEventListener('click', function () {
              n.logger.emitInteraction(ot.PrivacyPolicyView);
            });
          var t = document.getElementById(be.ButtonAcceptId);
          null == t ||
            t.addEventListener('click', function () {
              n.logger.emitInteraction(ot.Accepted);
            });
          var o = document.getElementById(be.ButtonDeclineId);
          null == o ||
            o.addEventListener('click', function () {
              n.logger.emitInteraction(ot.Declined);
            });
        }),
        n
      );
    })(),
    Ot = '#shopifyReshowConsentBanner';
  function At(n, e) {
    var t,
      o = n.target;
    (null == (t = o) ? void 0 : t.closest('a[href$="'.concat(Ot, '"]'))) &&
      e(n);
  }
  function Bt() {
    return t(this, arguments, void 0, function (n) {
      var e,
        r,
        a,
        i,
        c,
        s = this,
        l = void 0 === n ? {} : n,
        u = l.storefrontAccessToken,
        d = l.checkoutRootDomain,
        p = l.storefrontRootDomain,
        f = l.showPreferences,
        h = void 0 !== f && f,
        y = l.locale,
        g = l.country;
      return o(this, function (n) {
        return (
          d || (d = window.location.hostname),
          p || (p = window.location.hostname),
          y ||
            (y =
              null ===
                (i =
                  null === window || void 0 === window
                    ? void 0
                    : window.Shopify) || void 0 === i
                ? void 0
                : i.locale),
          g ||
            (g =
              null ===
                (c =
                  null === window || void 0 === window
                    ? void 0
                    : window.Shopify) || void 0 === c
                ? void 0
                : c.country),
          (e = function () {
            return t(s, void 0, void 0, function () {
              var n, e, t;
              return o(this, function (o) {
                switch (o.label) {
                  case 0:
                    return (
                      o.trys.push([0, 3, , 4]),
                      (n = Boolean(u)),
                      (e = new lt({shopDomain: d, isHeadless: n})),
                      !(Le() || Re() || h) ||
                      (function () {
                        var n;
                        return (
                          (null ===
                            (n =
                              null === window || void 0 === window
                                ? void 0
                                : window.Shopify) || void 0 === n
                            ? void 0
                            : n.designMode) || !1
                        );
                      })()
                        ? [3, 2]
                        : [
                            4,
                            new Et({
                              storefrontAccessToken: u,
                              checkoutRootDomain: d,
                              storefrontRootDomain: p,
                              locale: y,
                              country: g,
                            }).init(h),
                          ]
                    );
                  case 1:
                    (o.sent() && Fn(m), (o.label = 2));
                  case 2:
                    return (e.emitInitialized(), [3, 4]);
                  case 3:
                    return (
                      (t = o.sent()),
                      console.error('Error initializing banner', t),
                      [3, 4]
                    );
                  case 4:
                    return [2];
                }
              });
            });
          }),
          u
            ? ((r = ie()),
              Pe({
                marketing: (a = {yes: !0, no: !1})[r.marketing],
                analytics: a[r.analytics],
                preferences: a[r.preferences],
                sale_of_data: a[r.sale_of_data],
                storefrontAccessToken: u,
                checkoutRootDomain: d,
                storefrontRootDomain: p,
                callback: e,
              }))
            : e(),
          [2]
        );
      });
    });
  }
  function Tt(n) {
    n &&
      ((window.Shopify = window.Shopify || {}),
      (window.Shopify.customerPrivacy && window.Shopify.trackingConsent) ||
        (window.Shopify.customerPrivacy = window.Shopify.trackingConsent =
          xe()));
  }
  function Pt() {
    return t(this, arguments, void 0, function (n) {
      return (
        void 0 === n && (n = {}),
        o(this, function (t) {
          switch (t.label) {
            case 0:
              return (
                Tt(Boolean(n.storefrontAccessToken)),
                [4, Bt(e(e({}, n), {showPreferences: !0}))]
              );
            case 1:
              return (t.sent(), [2]);
          }
        })
      );
    });
  }
  return (
    (function () {
      if ('0' !== Te('pb')) {
        var n = Boolean(window.Shopify);
        (Tt(!n), n && Bt());
        var e = function (n) {
          (n.preventDefault(), Pt());
        };
        document.addEventListener('click', function (n) {
          At(n, e);
        });
      }
    })(),
    (n.loadBanner = Bt),
    (n.showPreferences = Pt),
    n
  );
})({});
