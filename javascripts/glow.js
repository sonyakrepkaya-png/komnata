// ============================================================
// СВЕЧЕНИЕ НА CANVAS
//
// Зачем: браузер рисует большое размытие (как в Figma) всего
// 256 оттенками, и на тёмном фоне свет распадается на заметные
// «ступеньки»-кольца. Здесь свечение считается заново с высокой
// точностью, а в конце к каждой точке добавляется крошечная
// случайная доля оттенка — ступеньки растворяются, а шума глазом
// не видно.
//
// Как устроено в index.html:
//   <canvas class="glow" data-for="#head_left" data-color="#fae2ae">
//     data-for   — какие фигуры (path) светятся
//     data-color — цвет свечения
//   у каждой фигуры data-blur — размытия из макета Figma (в px макета)
//
// Свечение пересчитывается при загрузке и при изменении размера окна.
// ============================================================

(function () {
  // во сколько раз уменьшен рабочий холст: свечение мягкое,
  // ему не нужна полная чёткость, а считается так в разы быстрее
  const WORK_RES = 0.25;

  // чёткость видимого холста: свечение размытое, поэтому половины
  // хватает — браузер сам плавно растянет холст до нужного размера
  const OUT_RES = 0.5;

  // ---------- размытие (три прохода «коробкой» ≈ размытие по Гауссу) ----------

  function boxSizes(sigma) {
    const n = 3;
    const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal);
    if (wl % 2 === 0) wl--;
    const wu = wl + 2;
    const mIdeal =
      (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const m = Math.round(mIdeal);
    const sizes = [];
    for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
    return sizes;
  }

  // по горизонтали
  function boxH(src, dst, w, h, r) {
    const k = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = 0; x <= r && x < w; x++) acc += src[row + x];
      for (let x = 0; x < w; x++) {
        dst[row + x] = acc * k;
        const add = x + r + 1;
        const sub = x - r;
        if (add < w) acc += src[row + add];
        if (sub >= 0) acc -= src[row + sub];
      }
    }
  }

  // по вертикали
  function boxV(src, dst, w, h, r) {
    const k = 1 / (2 * r + 1);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = 0; y <= r && y < h; y++) acc += src[y * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = acc * k;
        const add = y + r + 1;
        const sub = y - r;
        if (add < h) acc += src[add * w + x];
        if (sub >= 0) acc -= src[sub * w + x];
      }
    }
  }

  function gaussBlur(mask, w, h, sigma) {
    const a = Float32Array.from(mask);
    if (sigma < 0.4) return a;
    const b = new Float32Array(a.length);
    boxSizes(sigma).forEach(function (size) {
      const r = (size - 1) / 2;
      boxH(a, b, w, h, r);
      boxV(b, a, w, h, r);
    });
    return a;
  }

  // большое размытие считаем на уменьшенной копии — результат
  // тот же (свет всё равно плавный), а работы в десятки раз меньше
  function softBlur(mask, w, h, sigma) {
    const f = Math.floor(sigma / 2);
    if (f < 2) return gaussBlur(mask, w, h, sigma);

    // уменьшаем в f раз (среднее по квадратикам f×f)
    const w2 = Math.ceil(w / f);
    const h2 = Math.ceil(h / f);
    const small = new Float32Array(w2 * h2);
    for (let y = 0; y < h; y++) {
      const sy = ((y / f) | 0) * w2;
      const row = y * w;
      for (let x = 0; x < w; x++) small[sy + ((x / f) | 0)] += mask[row + x];
    }
    const inv = 1 / (f * f);
    for (let i = 0; i < small.length; i++) small[i] *= inv;

    const b = gaussBlur(small, w2, h2, sigma / f);

    // растягиваем обратно плавно
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let fy = (y + 0.5) / f - 0.5;
      if (fy < 0) fy = 0;
      let y0 = fy | 0;
      if (y0 > h2 - 2) y0 = Math.max(0, h2 - 2);
      const ty = Math.min(1, fy - y0);
      for (let x = 0; x < w; x++) {
        let fx = (x + 0.5) / f - 0.5;
        if (fx < 0) fx = 0;
        let x0 = fx | 0;
        if (x0 > w2 - 2) x0 = Math.max(0, w2 - 2);
        const tx = Math.min(1, fx - x0);
        const i = y0 * w2 + x0;
        out[y * w + x] =
          (b[i] * (1 - tx) + b[i + 1] * tx) * (1 - ty) +
          (b[i + w2] * (1 - tx) + b[i + w2 + 1] * tx) * ty;
      }
    }
    return out;
  }

  // ---------- цвет из "#rrggbb" ----------

  function hexToRgb(hex) {
    const v = parseInt(hex.replace("#", ""), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  // ---------- рисуем одну фигуру белым на рабочем холсте ----------

  function drawShape(wctx, el, rect, pad) {
    wctx.fillStyle = "#fff";
    wctx.strokeStyle = "#fff";

    // текст: рисуем те же буквы тем же шрифтом
    if (!el.getScreenCTM) {
      const r = el.getBoundingClientRect();
      const tcs = window.getComputedStyle(el);
      wctx.setTransform(WORK_RES, 0, 0, WORK_RES, pad, pad);
      wctx.font = tcs.fontWeight + " " + tcs.fontSize + " " + tcs.fontFamily;
      wctx.textAlign = "center";
      wctx.textBaseline = "middle";
      wctx.fillText(
        el.textContent,
        r.left - rect.left + r.width / 2,
        r.top - rect.top + r.height / 2,
      );
      return;
    }

    // фигура из svg
    const m = el.getScreenCTM();
    if (!m || !el.getAttribute("d")) return;
    wctx.setTransform(
      m.a * WORK_RES,
      m.b * WORK_RES,
      m.c * WORK_RES,
      m.d * WORK_RES,
      (m.e - rect.left) * WORK_RES + pad,
      (m.f - rect.top) * WORK_RES + pad,
    );
    const shape = new Path2D(el.getAttribute("d"));
    const cs = window.getComputedStyle(el);
    if (cs.fill && cs.fill !== "none") wctx.fill(shape);
    const sw = parseFloat(cs.strokeWidth) || 0;
    if (cs.stroke && cs.stroke !== "none" && sw > 0) {
      wctx.lineWidth = sw;
      wctx.lineCap = cs.strokeLinecap || "butt";
      wctx.lineJoin = cs.strokeLinejoin || "miter";
      wctx.stroke(shape);
    }
  }

  // ---------- рисуем свечение на одном холсте ----------
  //
  // Размытия берутся у каждой фигуры (data-blur, data-gain).
  // Если они указаны у самого холста — все фигуры светятся
  // вместе одним слоем (так быстрее, когда фигур много).

  function drawGlow(canvas) {
    const stage = canvas.closest(".stage");
    // фигуры ищем рядом с холстом (в том же блоке)
    const sources = Array.from(
      canvas.parentElement.querySelectorAll(canvas.dataset.for),
    );
    if (!stage || !sources.length) return;

    const groups = canvas.dataset.blur
      ? [{ els: sources, blur: canvas.dataset.blur, gain: canvas.dataset.gain }]
      : sources.map(function (el) {
          return { els: [el], blur: el.dataset.blur, gain: el.dataset.gain };
        });

    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (!cssW || !cssH) return;
    const cw = Math.ceil(cssW * OUT_RES);
    const ch = Math.ceil(cssH * OUT_RES);
    canvas.width = cw;
    canvas.height = ch;

    // во сколько раз сцена сейчас больше или меньше макета 1440
    const k = stage.getBoundingClientRect().width / 1440;
    const rect = canvas.getBoundingClientRect();

    // самый большой радиус размытия — от него зависит запас по краям
    let maxSigma = 0;
    groups.forEach(function (g) {
      (g.blur || "").split(" ").forEach(function (s) {
        maxSigma = Math.max(maxSigma, parseFloat(s) || 0);
      });
    });
    const pad = Math.ceil(maxSigma * k * WORK_RES * 3) + 2;
    const W = Math.ceil(cssW * WORK_RES) + pad * 2;
    const H = Math.ceil(cssH * WORK_RES) + pad * 2;

    // keep — сколько фона остаётся непокрытым светом (1 — весь фон)
    const keep = new Float32Array(W * H).fill(1);

    const work = document.createElement("canvas");
    work.width = W;
    work.height = H;
    const wctx = work.getContext("2d", { willReadFrequently: true });

    groups.forEach(function (g) {
      // 1. рисуем фигуры белым — это «маска» для свечения
      wctx.setTransform(1, 0, 0, 1, 0, 0);
      wctx.clearRect(0, 0, W, H);
      g.els.forEach(function (el) {
        drawShape(wctx, el, rect, pad);
      });

      const px = wctx.getImageData(0, 0, W, H).data;
      const mask = new Float32Array(W * H);
      for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] / 255;

      // 2. каждое размытие из макета — отдельный слой света,
      //    слои складываются так же, как тени в Figma.
      //    одинаковые размытия считаем один раз (возводим в степень).
      //    data-gain (необязательно) — яркость каждого слоя, по порядку
      const counts = {};
      const gains = {};
      const gainList = (g.gain || "").split(" ");
      (g.blur || "").split(" ").forEach(function (s, n) {
        if (!parseFloat(s)) return;
        counts[s] = (counts[s] || 0) + 1;
        gains[s] = parseFloat(gainList[n]) || 1;
      });
      Object.keys(counts).forEach(function (s) {
        const sigma = parseFloat(s) * k * WORK_RES;
        const times = counts[s];
        const gain = gains[s];
        const blurred = softBlur(mask, W, H, sigma);
        for (let i = 0; i < keep.length; i++) {
          const v = 1 - Math.min(1, blurred[i] * gain);
          keep[i] *= times === 1 ? v : Math.pow(v, times);
        }
      });
    });

    // 3. переносим на видимый холст: плавно растягиваем
    //    и добавляем крошечный шум против «ступенек»
    const rgb = hexToRgb(canvas.dataset.color || "#ffffff");
    const out = canvas.getContext("2d").createImageData(cw, ch);
    const o = out.data;
    for (let y = 0; y < ch; y++) {
      const fy = ((y + 0.5) / OUT_RES) * WORK_RES - 0.5 + pad;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      for (let x = 0; x < cw; x++) {
        const fx = ((x + 0.5) / OUT_RES) * WORK_RES - 0.5 + pad;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const i = y0 * W + x0;
        const a =
          1 -
          ((keep[i] * (1 - tx) + keep[i + 1] * tx) * (1 - ty) +
            (keep[i + W] * (1 - tx) + keep[i + W + 1] * tx) * ty);
        let v = a * 255 + (Math.random() + Math.random() - 1);
        v = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
        const j = (y * cw + x) * 4;
        o[j] = rgb[0];
        o[j + 1] = rgb[1];
        o[j + 2] = rgb[2];
        o[j + 3] = v;
      }
    }
    canvas.getContext("2d").putImageData(out, 0, 0);
  }

  // перед измерением снимаем с групп анимацию уменьшения,
  // чтобы фигуры стояли точно на своих местах
  function drawAll() {
    document.body.classList.add("is_measuring");
    document.querySelectorAll("canvas.glow").forEach(drawGlow);
    void document.body.offsetWidth;
    document.body.classList.remove("is_measuring");
  }

  // при загрузке (когда загрузились и шрифты): рисуем свечение
  // и запускаем появление обложки
  window.addEventListener("load", function () {
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      drawAll();
      // небольшая пауза, чтобы браузер запомнил начальное состояние
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.classList.add("is_ready");
        });
      });
    });
  });

  // при изменении размера окна: пересчитываем (с небольшой паузой,
  // чтобы не считать на каждый пиксель движения)
  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawAll, 150);
  });
})();
