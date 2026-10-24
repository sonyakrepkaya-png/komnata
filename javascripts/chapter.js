// ============================================================
// ГЛАВЫ: КАРТОЧКИ ПРЕДМЕТОВ
//
// Наведение на предмет — он загорается (это делает style.css).
// Нажатие — карточка с историей предмета «поднимается» из его
// рамки и встаёт по центру экрана, как модальное окно; комната
// затемняется. При закрытии карточка улетает обратно в предмет.
// Закрыть: кнопка «—», клик мимо карточки или клавиша Esc.
//
// Текст карточки берётся из data-card у кнопки предмета
// в index.html, а название и иконка — из самого предмета.
// ============================================================

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OPEN_MS = 520; // как долго карточка вылетает из предмета
  const CLOSE_MS = 380; // как долго улетает обратно

  // «Живые» иконки: у каждого предмета своё движение
  // (сами движения описаны в style.css, раздел «живые иконки»).
  // При наведении предмет делает его один раз, в карточке — по кругу.
  const ANIM = {
    "Компьютерный стол": "blink",
    "Мишка": "wiggle",
    "Тумбочка с лампой": "flicker",
    "Диван": "squish",
    "Кровать": "breathe",
    "Кубики": "tumble",
    "Лошадка-качалка": "rock",
    "Наушники": "beat",
    "Скейт": "roll",
    "Цветочек": "grow",
  };

  // во сколько раз увеличить иконку в карточке
  // (кубики широкие, поэтому чуть меньше, чтобы на глаз
  //  были одного размера с остальными)
  const ICON_ZOOM = {
    "Кубики": 0.88,
  };

  function animOf(item) {
    return ANIM[item.querySelector(".item_label").textContent.trim()] || "";
  }

  document.querySelectorAll(".chapter").forEach(function (chapter) {
    const stage = chapter.querySelector(".stage");

    // затемнение и карточка — по одной на главу
    const dim = document.createElement("div");
    dim.className = "room_dim";

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "dialog");
    card.innerHTML =
      '<svg class="card_icon" aria-hidden="true"></svg>' +
      '<p class="card_title"></p>' +
      '<p class="card_text"></p>' +
      '<button class="card_close" type="button" aria-label="Закрыть"></button>';

    stage.appendChild(dim);
    stage.appendChild(card);

    const icon = card.querySelector(".card_icon");
    const title = card.querySelector(".card_title");
    const text = card.querySelector(".card_text");
    const closeBtn = card.querySelector(".card_close");
    let openedFrom = null;

    function open(item) {
      // текст и иконка
      title.textContent = item.querySelector(".item_label").textContent;
      text.textContent = item.dataset.card;
      const srcIcon = item.querySelector(".item_icon");
      const box = srcIcon.getBBox();
      // некоторые иконки в карточке крупнее (рамка видимой области
      // меньше — значит, рисунок больше)
      const z = ICON_ZOOM[item.querySelector(".item_label").textContent.trim()] || 1;
      const w = box.width / z;
      const h = box.height / z;
      icon.setAttribute(
        "viewBox",
        box.x + (box.width - w) / 2 + " " + (box.y + (box.height - h) / 2) + " " + w + " " + h,
      );
      icon.innerHTML = srcIcon.innerHTML;
      icon.dataset.anim = animOf(item);

      // room_fx.js по этому событию прячет в карточку секрет
      // (до полёта, чтобы размер карточки был уже окончательный)
      window.dispatchEvent(
        new CustomEvent("card-open", {
          detail: { chapter: chapter, item: item, card: card },
        }),
      );
      chapter.classList.remove("is_card_closing");
      chapter.classList.add("is_card_open");
      item.classList.add("is_out");
      fly(item, true);
      openedFrom = item;
      closeBtn.focus({ preventScroll: true });
    }

    // Карточка летит между рамкой предмета и центром экрана.
    // Считаем, на сколько сдвинуть и уменьшить карточку, чтобы она
    // совпала с рамкой предмета, и анимируем от/до этого положения.
    function fly(item, opening) {
      if (card._anim) card._anim.cancel();
      const c = card.getBoundingClientRect();
      const r = item.querySelector(".item_box").getBoundingClientRect();
      const dx = r.left + r.width / 2 - (c.left + c.width / 2);
      const dy = r.top + r.height / 2 - (c.top + c.height / 2);
      const s = Math.max(0.2, Math.min(1, r.width / c.width));
      const away =
        "translate(-50%, -50%) translate(" + dx + "px, " + dy + "px) scale(" + s + ")";
      const home = "translate(-50%, -50%)";
      const frames = [
        { transform: away, opacity: 0 },
        { transform: home, opacity: 1 },
      ];
      if (reduce) {
        card._anim = null;
        return;
      }
      card._anim = card.animate(opening ? frames : frames.reverse(), {
        duration: opening ? OPEN_MS : CLOSE_MS,
        easing: opening ? "cubic-bezier(0.2, 0.8, 0.2, 1)" : "cubic-bezier(0.5, 0, 0.75, 0.3)",
        fill: "forwards",
      });
      return card._anim;
    }

    function close() {
      if (!chapter.classList.contains("is_card_open")) return;
      const from = openedFrom;
      openedFrom = null;
      const done = function () {
        chapter.classList.remove("is_card_open");
        if (from) from.classList.remove("is_out");
      };
      const a = from ? fly(from, false) : null;
      if (a) {
        // комната светлеет одновременно с полётом карточки
        chapter.classList.add("is_card_closing");
        a.onfinish = function () {
          chapter.classList.remove("is_card_closing");
          done();
        };
      } else {
        done();
      }
      if (from) from.focus({ preventScroll: true });
    }

    chapter.querySelectorAll(".item").forEach(function (item) {
      item.querySelector(".item_icon").dataset.anim = animOf(item);
      item.addEventListener("click", function () {
        open(item);
      });
    });

    closeBtn.addEventListener("click", close);
    dim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  });

  // ----------------------------------------------------------
  // КОМНАТА ПЕРЕСТРАИВАЕТСЯ
  //
  // Когда появляется новая комната (door.js сообщает об этом
  // событием "room-shown"), мы сравниваем её с комнатой, где были.
  // В тех рамках, где предмет поменялся, сначала виден старый
  // предмет, он гаснет, а на его место проявляется новый и
  // несколько раз мягко вспыхивает светом. То, что осталось,
  // стоит как было. Так видно, что ушло, а что осталось с нами.
  // ----------------------------------------------------------

  const MORPH_MS = 3200; // сколько длится перестройка

  window.addEventListener("room-shown", function (e) {
    const cur = e.detail.chapter;
    const prev = e.detail.from;
    if (!cur || !prev || cur === prev) return;
    const curItems = cur.querySelectorAll(".item");
    const prevItems = prev.querySelectorAll(".item");
    if (!curItems.length || !prevItems.length) return;

    curItems.forEach(function (item, k) {
      const old = prevItems[k];
      if (!old) return;
      const newLabel = item.querySelector(".item_label");
      const oldLabel = old.querySelector(".item_label");
      if (newLabel.textContent.trim() === oldLabel.textContent.trim()) return;

      // старая иконка и подпись — поверх новой, потом гаснут
      const ghost = old.querySelector(".item_icon").cloneNode(true);
      ghost.setAttribute("class", "item_ghost");
      item.querySelector("svg").appendChild(ghost);

      const ghostLabel = oldLabel.cloneNode(true);
      ghostLabel.className = "item_label item_ghost_label";
      item.appendChild(ghostLabel);

      item.classList.remove("is_morph");
      void item.offsetWidth;
      item.classList.add("is_morph");

      clearTimeout(item._morphTimer);
      item._morphTimer = setTimeout(function () {
        item.classList.remove("is_morph");
        ghost.remove();
        ghostLabel.remove();
      }, MORPH_MS);
    });
  });
})();
