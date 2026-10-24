// ============================================================
// ЗАГОЛОВОК ОБЛОЖКИ ПЕЧАТАЕТСЯ ПО БУКВАМ
//
// Когда правая голова проявилась, надпись «Комната, в которой
// мы живем» набирается буква за буквой, как на машинке, с
// мигающим курсором. Когда допечатана — курсор исчезает,
// а вокруг строк мягко проявляется тёмное свечение.
//
// CHAR_MS — пауза между буквами, LINE_MS — между строками,
// START_MS — сколько ждать после загрузки (пока проявится голова)
// ============================================================

(function () {
  const CHAR_MS = 85;
  const LINE_MS = 320;
  const START_MS = 1600;

  const cover = document.querySelector(".cover");
  const lines = Array.from(document.querySelectorAll(".cover_line"));
  if (!cover || !lines.length) return;

  // каждую букву оборачиваем в отдельный элемент, чтобы показывать по одной
  const chars = [];
  lines.forEach(function (line, n) {
    const text = line.textContent;
    line.textContent = "";
    Array.from(text).forEach(function (ch) {
      const s = document.createElement("span");
      s.className = "type_char";
      s.textContent = ch;
      s.dataset.line = n;
      line.appendChild(s);
      chars.push(s);
    });
  });

  const caret = document.createElement("span");
  caret.className = "type_caret";
  caret.setAttribute("aria-hidden", "true");

  function finish() {
    chars.forEach(function (s) {
      s.classList.add("is_on");
    });
    caret.remove();
    cover.classList.add("is_typed");
  }

  // если в системе выключена анимация — сразу вся надпись
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }

  function type(i) {
    if (i >= chars.length) {
      setTimeout(finish, 500);
      return;
    }
    const s = chars[i];
    s.classList.add("is_on");
    s.after(caret);
    const next = chars[i + 1];
    const newLine = next && next.dataset.line !== s.dataset.line;
    setTimeout(function () {
      type(i + 1);
    }, newLine ? LINE_MS : CHAR_MS);
  }

  // ждём, пока страница загрузится и головы начнут появляться
  function waitReady() {
    if (document.body.classList.contains("is_ready")) {
      setTimeout(function () {
        type(0);
      }, START_MS);
    } else {
      setTimeout(waitReady, 100);
    }
  }
  waitReady();
})();
