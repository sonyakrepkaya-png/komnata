// ============================================================
// ФИНАЛ: камера опускается к авторам, мебель падает
//
// progress — насколько прокручена секция финала (0…1):
//   0.00 – 0.25   экран «Комната меняется. Мы — тоже.» стоит
//   0.25 – 1.00   камера плавно опускается на экран с авторами,
//                 а мебель падает сквозь светящийся пол, немного
//                 кружится и разлетается по местам из макета
//                 (куда — записано в data-dx / data-dy у предмета,
//                 насколько крутится — в data-spin)
// ============================================================

(function () {
  const section = document.querySelector(".finale");
  if (!section) return;

  const SMOOTH = 0.1;
  const world = section.querySelector(".finale_world");
  const stage = section.querySelector(".stage");
  const items = Array.from(section.querySelectorAll(".fall_item"));
  let current = 0;
  let drawn = -1;

  function part(p, a, b) {
    return Math.min(1, Math.max(0, (p - a) / (b - a)));
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // падение: сначала медленно, потом разгоняется и мягко садится
  function fall(t) {
    return t * t * (3 - 2 * t);
  }

  function target() {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function render(p) {
    const k = stage.clientWidth / 1440; // px экрана в 1 px макета
    const cam = ease(part(p, 0.25, 1));
    world.style.transform = "translateY(" + -820 * cam * k + "px)";

    items.forEach(function (item, i) {
      // предметы падают чуть вразнобой
      const start = 0.25 + i * 0.04;
      const t = fall(part(p, start, Math.min(1, start + 0.62)));
      const dx = parseFloat(item.dataset.dx) * t * k;
      const dy = parseFloat(item.dataset.dy) * t * k;
      const spin = parseFloat(item.dataset.spin) * Math.sin(t * Math.PI);
      item.style.transform =
        "translate(" + dx + "px, " + dy + "px) rotate(" + spin + "deg)";
    });
  }

  function frame() {
    const t = target();
    current += (t - current) * SMOOTH;
    if (Math.abs(t - current) < 0.0005) current = t;
    if (current !== drawn) {
      render(current);
      drawn = current;
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", function () {
    drawn = -1;
  });

  requestAnimationFrame(frame);
})();
