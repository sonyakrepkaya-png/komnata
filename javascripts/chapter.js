// ============================================================
// ГЛАВЫ: КАРТОЧКИ ПРЕДМЕТОВ
//
// Наведение на предмет — он загорается (это делает style.css).
// Нажатие — на месте рамки предмета открывается светящаяся
// карточка с его историей, а комната затемняется.
// Закрыть: кнопка «—», клик мимо карточки или клавиша Esc.
//
// Текст карточки берётся из data-card у кнопки предмета
// в index.html, а название и иконка — из самого предмета.
// ============================================================

(function () {
  const ROOM_RIGHT = 1329; // правая стена комнаты, px макета
  const CARD_W = 403; // ширина карточки, px макета

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
      icon.setAttribute(
        "viewBox",
        box.x + " " + box.y + " " + box.width + " " + box.height,
      );
      icon.innerHTML = srcIcon.innerHTML;
      icon.dataset.anim = animOf(item);

      // место: левый верхний угол рамки предмета,
      // но так, чтобы карточка не вылезала за правую стену
      const k = stage.clientWidth / 1440; // px экрана в 1 px макета
      let left = item.offsetLeft / k + 4;
      const top = item.offsetTop / k + 4;
      if (left + CARD_W > ROOM_RIGHT) left = ROOM_RIGHT - CARD_W;
      card.style.left = left / 14.4 + "cqw";
      card.style.top = top / 14.4 + "cqw";

      chapter.classList.add("is_card_open");
      openedFrom = item;
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      if (!chapter.classList.contains("is_card_open")) return;
      chapter.classList.remove("is_card_open");
      if (openedFrom) openedFrom.focus({ preventScroll: true });
      openedFrom = null;
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
