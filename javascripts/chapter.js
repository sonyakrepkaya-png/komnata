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
})();
