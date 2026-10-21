// ============================================================
// ПЕРЕХОДЫ ПО КНОПКАМ (этапы слева и «дальше»)
//
// Обычная ссылка мгновенно прыгает к нужному месту, и дверь
// пролетает за долю секунды. Поэтому по клику мы:
//   1) незаметно встаём в начало двери перед нужной главой
//      (комната, где мы были, при этом гаснет);
//   2) медленно и плавно прокручиваем эту дверь (DOOR_MS),
//      чтобы её можно было разглядеть: линии рисуются, проём
//      загорается, свет заливает экран, и проявляется комната;
//   3) в новой комнате кружок слева доезжает до своего этапа
//      (это делает door.js).
// Пока идёт переход, колёсико и клавиши не мешают.
// ============================================================

(function () {
  const DOOR_MS = 4500; // сколько длится проход через дверь

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function pageTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  let anim = null;

  function go(target) {
    const door = target.previousElementSibling;
    const end = pageTop(target);
    // нет двери перед главой — просто плавно едем
    const start =
      door && door.classList.contains("door") ? pageTop(door) : window.scrollY;

    if (anim) cancelAnimationFrame(anim);
    window.navScrolling = true;
    window.scrollTo(0, start);
    window.dispatchEvent(new Event("doors-snap"));
    let t0 = 0;

    function step(now) {
      if (!t0) t0 = now;
      const t = Math.min(1, (now - t0) / DOOR_MS);
      window.scrollTo(0, start + (end - start) * ease(t));
      if (t < 1) {
        anim = requestAnimationFrame(step);
      } else {
        anim = null;
        window.navScrolling = false;
      }
    }
    // короткая пауза: комната, где мы были, успевает погаснуть
    setTimeout(function () {
      anim = requestAnimationFrame(step);
    }, 350);
  }

  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav_link, .next_link");
    if (!link) return;
    const id = (link.getAttribute("href") || "").slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    // уже в этой главе — никуда не едем
    if (link.classList.contains("is_active")) return;
    go(target);
  });

  // пока идёт переход — прокрутка пользователем не мешает
  function block(e) {
    if (window.navScrolling) e.preventDefault();
  }
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });
})();
