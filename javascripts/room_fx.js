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
//  5) Секреты: в каждой комнате один предмет что-то прячет.
//     В его карточке иконка мерцает искоркой — нажмите на неё.
//     А кубики в детской рассыпаются, если «потрясти» над ними мышкой.
//  6) В семейной комнате теплее: мягкий свет, будто от двери.
//  7) У каждой комнаты свой курсор (только с мышкой).
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
      const col = d.color || "255, 239, 186";
      g.addColorStop(0, "rgba(" + col + ", " + p.a * flick + ")");
      g.addColorStop(0.35, "rgba(" + col + ", " + p.a * flick * 0.35 + ")");
      g.addColorStop(1, "rgba(" + col + ", 0)");
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
  // 5) СЕКРЕТЫ В ПРЕДМЕТАХ
  //
  // комната → предмет → что он прячет. glyph — чем «брызгает»
  // иконка, когда секрет открыли (︎ — чтобы ♥ и ♪ не
  // превращались на телефоне в цветные смайлики)
  // ---------------------------------------------------------

  const SECRETS = {
    childhood: {
      "Кровать": {
        glyph: "✦",
        text: "Секрет из-под кровати: фонарик, фантик от конфеты и записка «никому не показывать».",
      },
    },
    teen: {
      "Наушники": {
        glyph: "♪︎",
        text: "В наушниках — одна и та же песня на повторе. Сорок раз подряд, и всё равно мало.",
      },
    },
    adult: {
      "Цветочек": {
        glyph: "✿︎",
        text: "Его поливали чаще, чем звонили домой. Он выжил — и это уже маленькая победа.",
      },
    },
    family: {
      "Мишка": {
        glyph: "♥︎",
        text: "Тот самый мишка из детства. Теперь его обнимает кто-то совсем маленький.",
      },
    },
  };

  window.addEventListener("card-open", function (e) {
    const card = e.detail.card;
    const item = e.detail.item;
    const label = item.querySelector(".item_label").textContent.trim();
    const room = SECRETS[e.detail.chapter.id] || {};
    const secret = room[label] || null;

    // убираем секрет от прошлой карточки
    const oldText = card.querySelector(".card_secret");
    if (oldText) oldText.remove();
    card.classList.remove("has_secret", "is_secret_open");
    card._secret = secret;
    if (secret) card.classList.add("has_secret");
    card.classList.remove("is_lifted");
    fitCard(card);

    // иконка-кнопка и искорка-подсказка создаются один раз
    if (!card._secretReady) {
      card._secretReady = true;
      const spark = document.createElement("span");
      spark.className = "card_spark";
      spark.setAttribute("aria-hidden", "true");
      spark.textContent = "✦";
      card.appendChild(spark);

      const icon = card.querySelector(".card_icon");
      icon.addEventListener("click", function () {
        const s = card._secret;
        if (!s || card.classList.contains("is_secret_open")) return;
        card.classList.add("is_secret_open");
        const p = document.createElement("p");
        p.className = "card_secret";
        p.textContent = s.text;
        card.querySelector(".card_text").after(p);
        fitCard(card);
        burst(card, icon, s.glyph);
        // иконка ещё раз делает своё движение
        const anim = icon.dataset.anim;
        icon.dataset.anim = "";
        void icon.getBoundingClientRect();
        icon.dataset.anim = anim;
      });
    }
  });

  // карточка не должна вылезать ниже комнаты: если после текста
  // секрета она стала длиннее, плавно поднимаем её вверх
  const ROOM_BOTTOM = 740; // нижняя стена комнаты, px макета
  const ROOM_TOP = 130; // верхняя стена комнаты, px макета
  function fitCard(card) {
    const stage = card.parentElement;
    const k = stage.clientWidth / 1440; // px экрана в 1 px макета
    const top = card.offsetTop / k;
    const h = card.offsetHeight / k;
    if (top + h > ROOM_BOTTOM) {
      const newTop = Math.max(ROOM_TOP, ROOM_BOTTOM - h);
      card.classList.add("is_lifted");
      card.style.top = newTop / 14.4 + "cqw";
    }
  }

  // из иконки вылетают значки и гаснут
  function burst(card, icon, glyph) {
    if (reduce) return;
    const cr = card.getBoundingClientRect();
    const ir = icon.getBoundingClientRect();
    const k = cr.width / 403; // px экрана в 1 px макета (ширина карточки)
    const x0 = ir.left - cr.left + ir.width / 2;
    const y0 = ir.top - cr.top + ir.height / 2;
    for (let i = 0; i < 12; i++) {
      const b = document.createElement("span");
      b.className = "card_burst";
      b.textContent = glyph;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const dist = (50 + Math.random() * 80) * k;
      b.style.left = x0 + "px";
      b.style.top = y0 + "px";
      b.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      b.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
      b.style.setProperty("--rot", ((Math.random() - 0.5) * 80).toFixed(0) + "deg");
      b.style.fontSize = ((10 + Math.random() * 10) * k).toFixed(1) + "px";
      b.style.animationDelay = (Math.random() * 0.25).toFixed(2) + "s";
      card.appendChild(b);
      setTimeout(function () {
        b.remove();
      }, 2200);
    }
  }

  // кубики в детской рассыпаются, если быстро водить над ними мышкой
  // туда-сюда («потрясти»): считаем, сколько раз мышь сменила
  // направление за последнюю секунду
  if (child) {
    child.querySelectorAll(".item").forEach(function (item) {
      if (item.querySelector(".item_label").textContent.trim() !== "Кубики") return;
      let lastX = null;
      let dir = 0;
      let turns = [];
      item.addEventListener("mousemove", function (e) {
        if (lastX !== null) {
          const dx = e.clientX - lastX;
          if (Math.abs(dx) > 2) {
            const d = dx > 0 ? 1 : -1;
            if (dir && d !== dir) turns.push(performance.now());
            dir = d;
          }
        }
        lastX = e.clientX;
        const now = performance.now();
        turns = turns.filter(function (t) {
          return now - t < 1000;
        });
        if (turns.length >= 5 && !item.classList.contains("is_crash")) {
          turns = [];
          item.classList.add("is_crash");
          setTimeout(function () {
            item.classList.remove("is_crash");
          }, 3100);
        }
      });
      item.addEventListener("mouseleave", function () {
        lastX = null;
        dir = 0;
      });
    });
  }

  // ---------------------------------------------------------
  // 6) ТЁПЛАЯ СЕМЕЙНАЯ КОМНАТА
  // ---------------------------------------------------------

  const family = document.getElementById("family");
  if (family) {
    const stage = family.querySelector(".stage");
    const warm = document.createElement("div");
    warm.className = "family_warm";
    warm.setAttribute("aria-hidden", "true");
    stage.insertBefore(warm, family.querySelector(".room"));
    // пылинки тут тёплые, золотисто-оранжевые
    if (family._dust) family._dust.color = "255, 206, 140";
  }

  // ---------------------------------------------------------
  // 7) СВОЙ КУРСОР В КАЖДОЙ КОМНАТЕ
  //
  // детство — звёздочка, подростки — маленькое кольцо (там и так
  // фонарик), взросление — аккуратный кружок с точкой,
  // семья — сердечко. Только там, где есть мышка.
  // ---------------------------------------------------------

  const CURSORS = {
    childhood:
      '<path d="M12 1.5l2.6 6.6 7 .5-5.4 4.5 1.7 6.9L12 16.2 6.1 20l1.7-6.9L2.4 8.6l7-.5z"/>',
    teen: '<circle cx="12" cy="12" r="5.5"/>',
    adult: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" class="fill"/>',
    family:
      '<path d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8 2.6c0 5.7-8 10.6-8 10.6z"/>',
  };

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cursor = document.createElement("div");
  cursor.className = "room_cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<svg viewBox="0 0 24 24"></svg>';
  document.body.appendChild(cursor);
  const cursorSvg = cursor.querySelector("svg");

  let mx = -100;
  let my = -100;
  let px = mx;
  let py = my;
  let kind = "";
  let seen = false; // мышь уже двигалась по странице

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (!seen) {
      seen = true;
      px = mx;
      py = my;
    }
    // над тем, что можно нажать, курсор становится больше
    const hot = e.target.closest && e.target.closest("a, button");
    cursor.classList.toggle("is_hot", !!hot);
  });
  document.addEventListener("mouseleave", function () {
    seen = false;
    cursor.classList.remove("is_on");
  });

  (function cursorLoop() {
    const room =
      fine.matches && seen && active && active.classList.contains("is_shown")
        ? active.id
        : "";
    const want = CURSORS[room] ? room : "";
    if (want !== kind) {
      kind = want;
      if (kind) {
        cursorSvg.innerHTML = CURSORS[kind];
        cursor.dataset.kind = kind;
      }
      cursor.classList.toggle("is_on", !!kind);
      document.documentElement.classList.toggle("has_room_cursor", !!kind);
    }
    if (kind) {
      // мягко догоняет мышь, но почти без отставания
      px += (mx - px) * (reduce ? 1 : 0.45);
      py += (my - py) * (reduce ? 1 : 0.45);
      cursor.style.transform =
        "translate(" + px.toFixed(1) + "px, " + py.toFixed(1) + "px)";
    }
    requestAnimationFrame(cursorLoop);
  })();

  // ---------------------------------------------------------
  // какая комната сейчас на экране
  // ---------------------------------------------------------

  window.addEventListener("room-shown", function (e) {
    const ch = e.detail.chapter;
    active = ch && ch._dust ? ch : null;
    if (ch && !ch.classList.contains("finale")) typeQuote(ch);
  });
})();
