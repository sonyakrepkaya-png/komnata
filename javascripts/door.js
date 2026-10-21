// ============================================================
// ДВЕРЬ МЕЖДУ ГЛАВАМИ (анимация по прокрутке)
//
// progress — насколько прокручена секция двери: 0 — только
// дошли до неё, 1 — прокрутили до конца. Анимация идёт по шагам:
//
//   0.00 – 0.40   линии двери прорисовываются, свечение разгорается
//   0.35 – 0.60   в проёме загорается тёплый свет
//   0.50 – 0.90   приближаемся к проёму (в 8 раз),
//   0.72 – 0.90   и свет из него заливает весь экран
//   0.90 – 1.00   экран залит светом
//   1.00          дошли до конца: свет за полсекунды гаснет, и на его
//                 месте проявляется комната следующей главы. Она уже
//                 стоит на своём месте и не выезжает снизу
//                 (см. style.css: .door.is_open и .door + .chapter)
//
// Сильное приближение (в десятки раз) заставляет браузер
// перерисовывать огромные картинки, и прокрутка назад начинала
// тормозить. Поэтому приближаемся умеренно, а остальное
// «доигрывает» заливка светом — выглядит так же, а работает легко.
//
// Чтобы колёсико мыши не дёргало картинку, анимация не прыгает
// сразу к нужному месту, а плавно догоняет прокрутку (SMOOTH).
// ============================================================

(function () {
  const SMOOTH = 0.1; // меньше — плавнее и мягче, больше — быстрее
  const ZOOM_MAX = 8; // во сколько раз приближаемся к проёму

  // доля отрезка [a, b], в котором сейчас p (от 0 до 1)
  function part(p, a, b) {
    return Math.min(1, Math.max(0, (p - a) / (b - a)));
  }

  // плавный разгон и торможение
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const doors = Array.from(document.querySelectorAll(".door")).map(
    function (section) {
      return {
        section: section,
        sticky: section.querySelector(".door_sticky"),
        zoom: section.querySelector(".door_zoom"),
        lines: Array.from(section.querySelectorAll(".door_lines path")),
        glowLines: section.querySelector(".door_glow_lines"),
        gap: section.querySelector(".door_gap_shape"),
        glowGap: section.querySelector(".door_glow_gap"),
        flash: section.querySelector(".door_flash"),
        // глава сразу после двери — она проявляется в конце
        next:
          section.nextElementSibling &&
          section.nextElementSibling.classList.contains("chapter")
            ? section.nextElementSibling
            : null,
        open: false,
        current: 0,
        drawn: -1, // какое состояние уже нарисовано
      };
    },
  );

  function targetProgress(d) {
    const r = d.section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function render(d, p) {
    // 1. линии рисуются
    //    штрихи начинаются друг за другом с небольшим нахлёстом
    const draw = part(p, 0, 0.4);
    const n = d.lines.length;
    d.lines.forEach(function (path, i) {
      const start = (i / n) * 0.6;
      const t = ease(part(draw, start, start + 0.4));
      path.style.strokeDashoffset = 1 - t;
      // пока штрих не начался, прячем его: иначе круглый
      // кончик линии виден точкой
      path.style.opacity = t > 0.001 ? 1 : 0;
    });
    // свечение разгорается, когда дверь почти нарисована
    d.glowLines.style.opacity = ease(part(p, 0.22, 0.45));

    // 2. свет в проёме
    const light = ease(part(p, 0.35, 0.6));
    d.gap.style.opacity = light;
    d.glowGap.style.opacity = light;

    // 3. приближение к проёму (разгон: сначала медленно, потом быстрее)
    const z = part(p, 0.5, 0.9);
    const scale = Math.pow(ZOOM_MAX, Math.pow(z, 1.6));
    d.zoom.style.transform = scale > 1.001 ? "scale(" + scale + ")" : "";

    // 3б. свет из проёма заливает весь экран
    const f = ease(part(p, 0.72, 0.9));
    d.flash.style.opacity = f;

    // когда свет закрыл весь экран, дверь можно не рисовать
    d.zoom.style.visibility = f > 0.999 ? "hidden" : "";

    // 4. дошли до конца — свет гаснет, комната проявляется.
    //    это делается по времени (плавный переход в style.css),
    //    а не прокруткой, поэтому комната не сдвигается
    const open = p > 0.995;
    if (open !== d.open) {
      d.open = open;
      d.section.classList.toggle("is_open", open);
      // комната проявилась — держим ещё секунду, чтобы её разглядеть
      if (open && d.next && holding()) holdUntil = performance.now() + HOLD_MS;
    }
  }

  // ---------- остановка в комнате ----------
  //
  // Когда дверь открылась и проявилась комната, прокрутка на
  // HOLD_MS миллисекунд замирает ровно на комнате. Так даже очень
  // быстрый скролл (или инерция тачпада) не проносит мимо неё.
  // Если человек уже улетел далеко (например, перетащил полосу
  // прокрутки), не возвращаем его назад.

  const HOLD_MS = 1200;
  let holdUntil = 0;
  let holdY = 0;

  function holdAt(chapter) {
    const top = chapter.getBoundingClientRect().top;
    if (Math.abs(top) > window.innerHeight * 1.2) return;
    holdY = window.scrollY + top;
    // держим, пока дверь доигрывает и комната проявляется
    holdUntil = performance.now() + HOLD_MS * 2;
    window.scrollTo(0, holdY);
  }

  function holding() {
    return performance.now() < holdUntil;
  }

  // пока держим — колёсико, пальцы и клавиши прокрутки не работают
  function block(e) {
    if (holding()) e.preventDefault();
  }
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("keydown", function (e) {
    const keys = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"];
    if (holding() && keys.indexOf(e.key) !== -1) e.preventDefault();
  });

  // ---------- какую комнату показывать ----------
  //
  // Комната закреплена на экране и видна, только пока прокрутка
  // стоит на её «месте» (секция главы целиком закрывает экран,
  // с небольшим запасом). Ушли дальше или назад — она гаснет,
  // а на её месте уже дверь.
  const chapters = Array.from(document.querySelectorAll(".chapter"));

  // Светящийся кружок слева: когда появляется новая комната, он
  // медленно едет по линии от этапа, где был, к этапу этой комнаты.
  let lastDotTop = null;
  let lastShownChapter = null;

  function slideDot(ch) {
    const dot = ch.querySelector(".nav_dot");
    if (!dot) return;
    if (!dot.dataset.top) dot.dataset.top = dot.style.top;
    const own = dot.dataset.top;
    if (lastDotTop && lastDotTop !== own) {
      dot.style.transition = "none";
      dot.style.top = lastDotTop;
      void dot.offsetWidth;
      dot.style.transition = "top 1.6s cubic-bezier(0.45, 0, 0.2, 1) 0.3s";
      dot.style.top = own;
    }
    lastDotTop = own;
  }

  function updateChapters() {
    const vh = window.innerHeight;
    chapters.forEach(function (ch) {
      const r = ch.getBoundingClientRect();
      const shown = r.top <= vh * 0.01 && r.bottom >= vh * 0.99;
      if (shown !== ch._shown) {
        ch._shown = shown;
        ch.classList.toggle("is_shown", shown);
        if (shown) {
          slideDot(ch);
          // сообщаем chapter.js, из какой комнаты мы пришли
          window.dispatchEvent(
            new CustomEvent("room-shown", {
              detail: { chapter: ch, from: lastShownChapter },
            }),
          );
          lastShownChapter = ch;
        }
        // ушли из комнаты — карточку закрываем
        if (!shown) ch.classList.remove("is_card_open");
      }
    });
  }

  function frame() {
    updateChapters();

    // долистали дверь до конца прокруткой вниз — сразу встаём на
    // комнату; дверь доигрывает анимацию, пока страница стоит
    doors.forEach(function (d) {
      const t = targetProgress(d);
      if (!window.navScrolling && d.next && d.lastTarget !== undefined && d.lastTarget < 0.995 && t >= 0.995) {
        holdAt(d.next);
      }
      d.lastTarget = t;
    });

    // если инерция всё-таки сдвинула страницу — возвращаем на место
    if (holding() && Math.abs(window.scrollY - holdY) > 1) {
      window.scrollTo(0, holdY);
    }
    doors.forEach(function (d) {
      const target = targetProgress(d);
      d.current += (target - d.current) * SMOOTH;
      if (Math.abs(target - d.current) < 0.0005) d.current = target;
      // перерисовываем, только если что-то изменилось
      if (d.current !== d.drawn) {
        render(d, d.current);
        d.drawn = d.current;
      }
    });
    requestAnimationFrame(frame);
  }

  // если в системе выключена анимация — двигаемся без сглаживания
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    doors.forEach(function (d) {
      d.current = targetProgress(d);
    });
  }

  // nav.js после мгновенного прыжка просит двери сразу встать
  // в нужное положение, без «отматывания» анимации
  window.addEventListener("doors-snap", function () {
    doors.forEach(function (d) {
      d.current = targetProgress(d);
      d.lastTarget = d.current;
    });
  });

  requestAnimationFrame(frame);
})();
