// ============================================================
// ЖИВЫЕ КОМНАТЫ: эффекты, у каждой главы свои
//
//  1) Цитата в углу каждой комнаты печатается по буквам,
//     когда комната появляется (как заголовок на обложке).
//  2) Во всех комнатах в воздухе медленно плавают светящиеся
//     пылинки, как пыль в луче лампы.
//  3) Подростковая комната в темноте: свет только вокруг
//     курсора (или пальца), как фонарик под одеялом.
//  4) В детской на стенах мерцают звёздочки от ночника.
//
// Комнату, которая сейчас на экране, сообщает door.js
// событием "room-shown".
// ============================================================

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const chapters = Array.from(document.querySelectorAll(".chapter:not(.finale)"));

  // ---------------------------------------------------------
  // 1) ЦИТАТА ПО БУКВАМ
  // ---------------------------------------------------------

  const QUOTE_CHAR_MS = 28; // пауза между буквами
  const QUOTE_START_MS = 700; // ждём, пока комната проявится

  chapters.forEach(function (ch) {
    const q = ch.querySelector(".chapter_quote");
    if (!q) return;
    const text = q.textContent;
    q.textContent = "";
    q._chars = Array.from(text).map(function (c) {
      const s = document.createElement("span");
      s.className = "type_char is_on";
      s.textContent = c;
      q.appendChild(s);
      return s;
    });
  });

  function typeQuote(ch) {
    const q = ch.querySelector(".chapter_quote");
    if (!q || !q._chars || reduce) return;
    clearTimeout(q._timer);
    q._chars.forEach(function (s) {
      s.classList.remove("is_on");
    });
    let i = 0;
    function next() {
      if (i >= q._chars.length) return;
      q._chars[i].classList.add("is_on");
      i++;
      q._timer = setTimeout(next, QUOTE_CHAR_MS);
    }
    q._timer = setTimeout(next, QUOTE_START_MS);
  }

  // ---------------------------------------------------------
  // 2) ПЫЛИНКИ В СВЕТЕ
  // ---------------------------------------------------------

  const DUST_COUNT = 46;

  chapters.forEach(function (ch) {
    const stage = ch.querySelector(".stage");
    const c = document.createElement("canvas");
    c.className = "dust";
    c.setAttribute("aria-hidden", "true");
    stage.insertBefore(c, stage.firstChild);
    ch._dust = {
      canvas: c,
      ctx: c.getContext("2d"),
      parts: Array.from({ length: DUST_COUNT }, function () {
        return {
          x: Math.random(),
          y: Math.random(),
          r: 0.6 + Math.random() * 1.8, // размер, px макета
          vx: (Math.random() - 0.5) * 0.00012,
          vy: -0.00004 - Math.random() * 0.00012, // плывут вверх
          a: 0.15 + Math.random() * 0.45,
          ph: Math.random() * Math.PI * 2,
        };
      }),
    };
  });

  let active = null; // комната, которая сейчас на экране

  function drawDust(ch, t) {
    const d = ch._dust;
    const c = d.canvas;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const k = (w / 1440) * dpr;
    const ctx = d.ctx;
    ctx.clearRect(0, 0, c.width, c.height);
    d.parts.forEach(function (p) {
      if (!reduce) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
      }
      // мерцают, как пыль, попадающая в луч
      const flick = 0.6 + 0.4 * Math.sin(t / 900 + p.ph);
      const x = p.x * c.width;
      const y = p.y * c.height;
      const r = p.r * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, "rgba(255, 239, 186, " + p.a * flick + ")");
      g.addColorStop(0.35, "rgba(255, 239, 186, " + p.a * flick * 0.35 + ")");
      g.addColorStop(1, "rgba(255, 239, 186, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function loop(t) {
    if (active && active._dust) drawDust(active, t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------------------------------------------------------
  // 3) ПОДРОСТКОВАЯ КОМНАТА В ТЕМНОТЕ
  // ---------------------------------------------------------

  const teen = document.getElementById("teen");
  if (teen) {
    const stage = teen.querySelector(".stage");
    const dark = document.createElement("div");
    dark.className = "teen_dark";
    dark.setAttribute("aria-hidden", "true");
    stage.appendChild(dark);

    // подсказка меняется: сначала надо посветить
    const hint = teen.querySelector(".chapter_hint");
    if (hint) {
      hint.textContent = window.matchMedia("(hover: none)").matches
        ? "Проведите пальцем — в комнате темно"
        : "Посветите курсором — в комнате темно";
    }

    // фонарик плавно догоняет курсор
    let tx = 0.5;
    let ty = 0.5;
    let cx = tx;
    let cy = ty;

    function aim(clientX, clientY) {
      const r = dark.getBoundingClientRect();
      tx = (clientX - r.left) / r.width;
      ty = (clientY - r.top) / r.height;
    }
    teen.addEventListener("mousemove", function (e) {
      aim(e.clientX, e.clientY);
    });
    teen.addEventListener(
      "touchstart",
      function (e) {
        aim(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true },
    );
    teen.addEventListener(
      "touchmove",
      function (e) {
        aim(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true },
    );

    (function follow() {
      cx += (tx - cx) * (reduce ? 1 : 0.14);
      cy += (ty - cy) * (reduce ? 1 : 0.14);
      dark.style.setProperty("--x", (cx * 100).toFixed(2) + "%");
      dark.style.setProperty("--y", (cy * 100).toFixed(2) + "%");
      requestAnimationFrame(follow);
    })();
  }

  // ---------------------------------------------------------
  // 4) ЗВЁЗДОЧКИ НОЧНИКА В ДЕТСКОЙ
  // ---------------------------------------------------------

  const child = document.getElementById("childhood");
  if (child) {
    const stage = child.querySelector(".stage");
    const sky = document.createElement("div");
    sky.className = "night_stars";
    sky.setAttribute("aria-hidden", "true");
    // звёзды только внутри комнаты (стены: 228…1329 × 126…728 px макета)
    for (let i = 0; i < 34; i++) {
      const s = document.createElement("span");
      s.className = "night_star";
      const x = 240 + Math.random() * 1075;
      const y = 140 + Math.random() * 570;
      const size = 3 + Math.random() * 5;
      s.style.left = (x / 14.4).toFixed(3) + "cqw";
      s.style.top = (y / 14.4).toFixed(3) + "cqw";
      s.style.width = s.style.height = (size / 14.4).toFixed(3) + "cqw";
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      s.style.animationDuration = (2.5 + Math.random() * 3).toFixed(2) + "s";
      sky.appendChild(s);
    }
    // звёзды под предметами, но над стенами
    const room = child.querySelector(".room");
    stage.insertBefore(sky, room);
  }

  // ---------------------------------------------------------
  // какая комната сейчас на экране
  // ---------------------------------------------------------

  window.addEventListener("room-shown", function (e) {
    const ch = e.detail.chapter;
    active = ch && ch._dust ? ch : null;
    if (ch && !ch.classList.contains("finale")) typeQuote(ch);
  });
})();
