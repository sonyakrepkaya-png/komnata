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
//   0.88 – 1.00   свет мягко гаснет — мы внутри следующей главы
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

    // 4. свет гаснет
    d.sticky.style.opacity = 1 - ease(part(p, 0.88, 1));
  }

  function frame() {
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

  requestAnimationFrame(frame);
})();
