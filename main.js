(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var still = reduce.matches;

  var nav = doc.getElementById("nav");
  var navCheck = doc.getElementById("nav-toggle");
  var hero = doc.querySelector(".hero-media");
  var statement = doc.querySelector("[data-litext]");
  var words = [];
  var feature = doc.querySelector("[data-scale]");
  var follow = doc.getElementById("follow-us");
  var gemini = doc.querySelector(".chapter-gemini");
  var heroSec = doc.getElementById("top");
  var gallery = doc.getElementById("gallery");

  if (statement) {
    var text = statement.textContent.trim().split(/\s+/);
    statement.textContent = "";
    text.forEach(function (t, i) {
      var s = doc.createElement("span");
      s.className = "w";
      s.textContent = t;
      statement.appendChild(s);
      if (i < text.length - 1) statement.appendChild(doc.createTextNode(" "));
      words.push(s);
    });
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    nav.classList.toggle("is-scrolled", y > 24);
    root.classList.toggle("is-past-top", y > 24);
    if (hero && !still && y < vh * 1.2) {
      hero.style.transform = "translate3d(0," + (y * 0.2).toFixed(1) + "px,0)";
    }
    if (feature && !still) {
      var fr = feature.getBoundingClientRect();
      var fp = Math.max(0, Math.min(1, (vh - fr.top) / (vh * 0.75)));
      feature.style.setProperty("--s", (0.9 + 0.1 * fp).toFixed(4));
    }
    if (follow && !still) {
      var wr = follow.getBoundingClientRect();
      var wp = Math.max(0, Math.min(1, (vh - wr.top) / wr.height));
      follow.style.setProperty("--rise", wp.toFixed(3));
    }
    if (words.length) {
      var r = statement.getBoundingClientRect();
      var start = vh * 0.92;
      var done = vh * 0.62 - r.height / 2;
      if (done > start - 80) done = start - 80;
      var p = still ? 1 : (start - r.top) / (start - done);
      p = Math.max(0, Math.min(1, p));
      var lit = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle("on", i < lit);
      }
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  requestAnimationFrame(update);

  if (navCheck) {
    doc.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { navCheck.checked = false; });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") navCheck.checked = false;
    });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    doc.querySelectorAll(".reveal, [data-draw]").forEach(function (el, i) {
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (el.closest(".bento")) el.style.transitionDelay = Math.min(sib, 6) * 70 + "ms";
      io.observe(el);
    });

    var links = {};
    doc.querySelectorAll(".nav-links a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target.id === "top") {
          if (en.isIntersecting) Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          return;
        }
        var a = links[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          a.classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).concat("top").forEach(function (id) {
      var s = doc.getElementById(id);
      if (s) spy.observe(s);
    });
  } else {
    doc.querySelectorAll(".reveal, [data-draw]").forEach(function (el) { el.classList.add("is-in"); });
  }

  doc.querySelectorAll(".tile").forEach(function (t) {
    t.addEventListener("pointermove", function (e) {
      var r = t.getBoundingClientRect();
      t.style.setProperty("--mx", (e.clientX - r.left) + "px");
      t.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  var box = doc.getElementById("lightbox");
  if (box && typeof box.showModal === "function") {
    var opener = null;
    doc.querySelectorAll("[data-lightbox]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        opener = a;
        box.showModal();
      });
    });
    box.querySelector("[data-close]").addEventListener("click", function () { box.close(); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
    box.addEventListener("close", function () { if (opener) opener.focus(); });
  }

  var canvas = doc.querySelector(".sky-canvas");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) {
    root.classList.add("no-canvas");
    return;
  }
  var W = 0, H = 0, dpr = 1, stars = [], meteor = null, nextMeteor = 0, raf = 0, skyAlpha = 1;
  function near(el, pad) {
    if (!el) return false;
    var b = el.getBoundingClientRect();
    return b.bottom > -pad && b.top < H + pad;
  }
  function meteorBlocked() {
    return near(heroSec, 0) || near(gallery, 240) || (box && box.open);
  }
  var tones = ["245,245,245", "245,245,245", "200,204,216", "232,213,181", "150,158,196"];

  function seed() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(W * H / 5200);
    stars = [];
    for (var i = 0; i < n; i++) {
      var m = Math.pow(Math.random(), 3);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.35 + m * 1.25,
        a: 0.25 + m * 0.6,
        tw: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 1.2,
        c: tones[(Math.random() * tones.length) | 0]
      });
    }
  }

  function spawn(t) {
    var ang = (200 + Math.random() * 25) * Math.PI / 180;
    meteor = {
      x: W * (0.35 + Math.random() * 0.6),
      y: H * (Math.random() * 0.4),
      vx: Math.cos(ang),
      vy: -Math.sin(ang),
      len: 120 + Math.random() * 120,
      speed: 0.9 + Math.random() * 0.5,
      t0: t,
      life: 900 + Math.random() * 400
    };
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    var target = near(gemini, -H * 0.25) ? 0 : 1;
    if (skyAlpha !== target) {
      skyAlpha += (target - skyAlpha) * (still ? 1 : 0.08);
      if (Math.abs(target - skyAlpha) < 0.01) skyAlpha = target;
      canvas.style.opacity = skyAlpha.toFixed(3);
    }
    var off = still ? 0 : (window.scrollY || 0) * 0.04;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = still ? s.a : s.a * (0.72 + 0.28 * Math.sin(t * 0.001 * s.sp + s.tw));
      var yy = (s.y - off * s.r) % H;
      if (yy < 0) yy += H;
      ctx.beginPath();
      ctx.arc(s.x, yy, s.r, 0, 6.2832);
      ctx.fillStyle = "rgba(" + s.c + "," + a.toFixed(3) + ")";
      ctx.fill();
    }
    if (!still) {
      var blocked = meteorBlocked() || skyAlpha < 0.9;
      if (blocked && meteor) meteor = null;
      if (!meteor && t > nextMeteor && !blocked) spawn(t);
      if (meteor) {
        var k = (t - meteor.t0) / meteor.life;
        if (k >= 1) {
          meteor = null;
          nextMeteor = t + 20000 + Math.random() * 20000;
        } else {
          var d = k * meteor.speed * 520;
          var hx = meteor.x + meteor.vx * d;
          var hy = meteor.y + meteor.vy * d;
          var tl = meteor.len * Math.min(1, k * 3);
          var tx = hx - meteor.vx * tl;
          var ty = hy - meteor.vy * tl;
          var fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
          var g = ctx.createLinearGradient(hx, hy, tx, ty);
          g.addColorStop(0, "rgba(245,245,245," + (0.85 * fade).toFixed(3) + ")");
          g.addColorStop(0.3, "rgba(232,213,181," + (0.35 * fade).toFixed(3) + ")");
          g.addColorStop(1, "rgba(232,213,181,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    }
  }

  function start() {
    cancelAnimationFrame(raf);
    seed();
    nextMeteor = Math.max(12000, performance.now() + 4000);
    if (still) frame(0); else raf = requestAnimationFrame(frame);
  }
  var rt = 0;
  window.addEventListener("resize", function () {
    if (!booted) return;
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (window.innerWidth !== W || Math.abs(window.innerHeight - H) > 160) start();
    }, 200);
  });
  doc.addEventListener("visibilitychange", function () {
    if (doc.hidden) cancelAnimationFrame(raf);
    else if (!still && booted) raf = requestAnimationFrame(frame);
  });
  if (reduce.addEventListener) {
    reduce.addEventListener("change", function (e) { still = e.matches; if (booted) start(); update(); });
  }
  var booted = false;
  var wake = ["scroll", "pointerdown", "touchstart", "keydown", "wheel"];
  function boot() {
    if (booted) return;
    booted = true;
    wake.forEach(function (ev) { window.removeEventListener(ev, boot); });
    start();
  }
  wake.forEach(function (ev) { window.addEventListener(ev, boot, { passive: true }); });
  if ((window.scrollY || 0) > 0) boot();
})();
