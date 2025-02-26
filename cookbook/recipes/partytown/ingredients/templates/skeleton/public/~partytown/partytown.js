/* Partytown 0.8.2 - MIT builder.io */
!(function (t, e, n, i, o, r, a, s, d, c, l, p) {
  function u() {
    p ||
      ((p = 1),
      '/' == (a = (r.lib || '/~partytown/') + (r.debug ? 'debug/' : ''))[0] &&
        ((d = e.querySelectorAll('script[type="text/partytown"]')),
        i != t
          ? i.dispatchEvent(new CustomEvent('pt1', {detail: t}))
          : ((s = setTimeout(f, 1e4)),
            e.addEventListener('pt0', w),
            o
              ? h(1)
              : n.serviceWorker
              ? n.serviceWorker
                  .register(a + (r.swPath || 'partytown-sw.js'), {scope: a})
                  .then(function (t) {
                    t.active
                      ? h()
                      : t.installing &&
                        t.installing.addEventListener(
                          'statechange',
                          function (t) {
                            'activated' == t.target.state && h();
                          },
                        );
                  }, console.error)
              : f())));
  }
  function h(t) {
    (c = e.createElement(t ? 'script' : 'iframe')),
      t ||
        ((c.style.display = 'block'),
        (c.style.width = '0'),
        (c.style.height = '0'),
        (c.style.border = '0'),
        (c.style.visibility = 'hidden'),
        c.setAttribute('aria-hidden', !0)),
      (c.src =
        a +
        'partytown-' +
        (t ? 'atomics.js?v=0.8.2' : 'sandbox-sw.html?' + Date.now())),
      e.querySelector(r.sandboxParent || 'body').appendChild(c);
  }
  function f(n, o) {
    for (
      w(),
        i == t &&
          (r.forward || []).map(function (e) {
            delete t[e.split('.')[0]];
          }),
        n = 0;
      n < d.length;
      n++
    )
      ((o = e.createElement('script')).innerHTML = d[n].innerHTML),
        (o.nonce = r.nonce),
        e.head.appendChild(o);
    c && c.parentNode.removeChild(c);
  }
  function w() {
    clearTimeout(s);
  }
  (r = t.partytown || {}),
    i == t &&
      (r.forward || []).map(function (e) {
        (l = t),
          e.split('.').map(function (e, n, i) {
            l = l[i[n]] =
              n + 1 < i.length
                ? 'push' == i[n + 1]
                  ? []
                  : l[i[n]] || {}
                : function () {
                    (t._ptf = t._ptf || []).push(i, arguments);
                  };
          });
      }),
    'complete' == e.readyState
      ? u()
      : (t.addEventListener('DOMContentLoaded', u),
        t.addEventListener('load', u));
})(window, document, navigator, top, window.crossOriginIsolated);
