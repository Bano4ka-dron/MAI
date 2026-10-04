// ============================================
// MAI — Главная: распад hero.png → сборка в hero3.png
// + 3D-наклон в галерее с тенью
// + 3D-наклон товаров
// + блик на карточках галереи с кулдауном 7 сек
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------
    // 1) Эффект распада hero-картинки
    // ------------------------------------------
    const canvas = document.getElementById('hero-canvas');
    const wrap = document.getElementById('hero-canvas-wrap');

    if (canvas && wrap) {
        const ctx = canvas.getContext('2d');

        const img1 = new Image();
        const img2 = new Image();
        let imagesLoaded = 0;

        img1.src = '../images/hero.png';
        img2.src = '../images/hero3.png';

        let W = 1920;
        let H = 730;
        let CELL = 20;
        let COLS = 0;
        let ROWS = 0;
        let particles = [];
        let rafId = null;
        let isHover = false;
        let progress = 0;
        const DURATION = 2200;
        const COOLDOWN = 2000;
        let startTime = 0;
        let isAnimating = false;
        let lastEndTime = 0;
        let currentState = 0;

        const PAD = 1.5;

        img1.onload = img2.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === 2) init();
        };

        function init() {
            W = img1.naturalWidth;
            H = img1.naturalHeight;
            canvas.width = W;
            canvas.height = H;

            const displayHeight = Math.round((H / W) * 1920);
            canvas.style.width = '1920px';
            canvas.style.height = displayHeight + 'px';
            wrap.style.height = displayHeight + 'px';

            CELL = Math.max(8, Math.round(W / 96));
            COLS = Math.ceil(W / CELL);
            ROWS = Math.ceil(H / CELL);

            particles = [];
            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    const x = col * CELL;
                    const y = row * CELL;
                    const ang = Math.random() * Math.PI * 2;
                    const dist = 200 + Math.random() * 400;
                    particles.push({
                        x,
                        y,
                        dx: Math.cos(ang) * dist,
                        dy: Math.sin(ang) * dist,
                        rot: (Math.random() - 0.5) * Math.PI,
                        delay: Math.random() * 0.3
                    });
                }
            }

            drawFrame(0);
        }

        function drawFrame(p) {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#0d3328';
            ctx.fillRect(0, 0, W, H);

            const src = p < 0.5 ? img1 : img2;
            const sx = src.naturalWidth / W;
            const sy = src.naturalHeight / H;

            const drawW = CELL + PAD * 2;
            const drawH = CELL + PAD * 2;

            particles.forEach(part => {
                const localP = Math.max(0, Math.min(1, (p - part.delay) / (1 - part.delay)));

                let eased;
                if (localP < 0.5) {
                    const t = localP / 0.5;
                    const easeOut = 1 - Math.pow(1 - t, 3);
                    eased = 1 - easeOut;
                } else {
                    const t = (localP - 0.5) / 0.5;
                    const easeInOut = t < 0.5
                        ? 16 * t * t * t * t * t
                        : 1 - Math.pow(-2 * t + 2, 5) / 2;
                    eased = easeInOut;
                }

                const offsetX = part.dx * (1 - eased);
                const offsetY = part.dy * (1 - eased);
                const px = part.x + offsetX;
                const py = part.y + offsetY;
                const rot = part.rot * (1 - eased);
                const alpha = 0.15 + 0.85 * eased;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(px + CELL / 2, py + CELL / 2);
                ctx.rotate(rot);

                ctx.drawImage(
                    src,
                    (part.x - PAD) * sx, (part.y - PAD) * sy, drawW * sx, drawH * sy,
                    -CELL / 2 - PAD, -CELL / 2 - PAD, drawW, drawH
                );
                ctx.restore();
            });
        }

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / DURATION, 1);
            progress = isHover ? t : 1 - t;
            drawFrame(progress);

            if (t < 1) {
                rafId = requestAnimationFrame(animate);
            } else {
                rafId = null;
                isAnimating = false;
                lastEndTime = performance.now();
                currentState = isHover ? 1 : 0;
                drawFrame(currentState);
            }
        }

        function canStartAnimation() {
            if (isAnimating) return false;
            const sinceEnd = performance.now() - lastEndTime;
            if (lastEndTime > 0 && sinceEnd < COOLDOWN) return false;
            return true;
        }

        function startTransition() {
            if (!canStartAnimation()) return;
            if (rafId) cancelAnimationFrame(rafId);
            startTime = 0;
            isAnimating = true;
            rafId = requestAnimationFrame(animate);
        }

        wrap.addEventListener('mouseenter', () => {
            if (currentState === 1 && !isAnimating) return;
            if (!canStartAnimation()) return;
            isHover = true;
            startTransition();
        });

        wrap.addEventListener('mouseleave', () => {
            if (currentState === 0 && !isAnimating) return;
            if (!canStartAnimation()) return;
            isHover = false;
            startTransition();
        });
    }

    // ------------------------------------------
    // 2) 3D-наклон карточек в галерее (сильнее)
    //    + тень, которая смещается при наклоне
    // ------------------------------------------
    document.querySelectorAll('.gallery__card').forEach(card => {
        const item = card.querySelector('.gallery__item');
        if (!item) return;

        const MAX_TILT = 12;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);

            const nx = Math.max(-1, Math.min(1, dx));
            const ny = Math.max(-1, Math.min(1, dy));

            const ry = -nx * MAX_TILT;
            const rx =  ny * MAX_TILT;

            item.style.setProperty('--rx', rx + 'deg');
            item.style.setProperty('--ry', ry + 'deg');

            // Тень смещается противоположно наклону
            const shadowX = -nx * 30;
            const shadowY =  20 + ny * 10;
            item.style.setProperty('--shadow-x', shadowX + 'px');
            item.style.setProperty('--shadow-y', shadowY + 'px');
            item.style.setProperty('--shadow-blur', '40px');
            item.style.setProperty('--shadow-opacity', '0.5');
        });

        card.addEventListener('mouseleave', () => {
            item.style.setProperty('--rx', '0deg');
            item.style.setProperty('--ry', '0deg');
            item.style.setProperty('--shadow-x', '0px');
            item.style.setProperty('--shadow-y', '20px');
            item.style.setProperty('--shadow-blur', '30px');
            item.style.setProperty('--shadow-opacity', '0.35');
        });
    });

    // ------------------------------------------
    // 3) 3D-наклон карточек товаров (слабее)
    // ------------------------------------------
    function applyTilt(card) {
        const MAX_TILT = 6;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);

            const nx = Math.max(-1, Math.min(1, dx));
            const ny = Math.max(-1, Math.min(1, dy));

            const ry = -nx * MAX_TILT;
            const rx =  ny * MAX_TILT;

            card.style.setProperty('--rx', rx + 'deg');
            card.style.setProperty('--ry', ry + 'deg');
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
        });
    }

    document.querySelectorAll('.product').forEach(applyTilt);

    // ------------------------------------------
    // 5) Рекомендуемые товары — случайная подборка
    // ------------------------------------------
    const RECOMMENDED = [
        { img: '../images/куртка.png', title: 'куртка' },
        { img: '../images/О1.png',     title: 'костюм' },
        { img: '../images/О2.png',     title: 'платье' },
        { img: '../images/О3.png',     title: 'худи' },
        { img: '../images/О4.png',     title: 'платье' },
        { img: '../images/свитер.png', title: 'кардиган' }
    ];

    const recWrap = document.getElementById('recommended');
    if (recWrap) {
        const shuffled = RECOMMENDED.slice().sort(() => Math.random() - 0.5);
        shuffled.forEach(item => {
            const card = document.createElement('article');
            card.className = 'product';
            card.innerHTML = `
                <div class="product__image">
                    <img src="${item.img}" alt="${item.title}">
                    <button class="product__favorite" type="button" aria-label="В избранное">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                </div>
                <div class="product__info">
                    <span class="product__price">цена</span>
                    <span class="product__desc">${item.title}</span>
                </div>
            `;
            recWrap.appendChild(card);
            applyTilt(card);
        });
    }

    // ------------------------------------------
    // 4) Блик на карточках галереи
    //    Общий кулдаун 7 сек, защита от двойного запуска
    // ------------------------------------------
    const SHINE_COOLDOWN = 7000;
    const SHINE_DURATION = 800;
    let lastShineTime = 0;
    let isShining = false;

    function runShine(item) {
        if (isShining) return;

        isShining = true;
        item.classList.remove('is-shining');
        void item.offsetWidth;
        item.classList.add('is-shining');
        lastShineTime = performance.now();

        setTimeout(() => {
            isShining = false;
        }, SHINE_DURATION);
    }

    document.querySelectorAll('.gallery__item').forEach(item => {
        let repeatInterval = null;
        let pendingTimeout = null;
        let isMouseInside = false;

        function scheduleShine() {
            if (pendingTimeout) return;
            if (isShining) return;

            const sinceLast = performance.now() - lastShineTime;
            const wait = Math.max(0, SHINE_COOLDOWN - sinceLast);

            if (wait === 0) {
                runShine(item);
            } else {
                pendingTimeout = setTimeout(() => {
                    pendingTimeout = null;
                    if (isMouseInside) runShine(item);
                }, wait);
            }
        }

        item.addEventListener('mouseenter', () => {
            if (isMouseInside) return;
            isMouseInside = true;

            scheduleShine();

            if (repeatInterval) clearInterval(repeatInterval);
            repeatInterval = setInterval(() => {
                if (isMouseInside && !isShining) runShine(item);
            }, SHINE_COOLDOWN);
        });

        item.addEventListener('mouseleave', () => {
            isMouseInside = false;

            if (repeatInterval) {
                clearInterval(repeatInterval);
                repeatInterval = null;
            }
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
                pendingTimeout = null;
            }
            item.classList.remove('is-shining');
        });
    });


    // ==========================================
    // ЛОГИКА ОТОБРАЖЕНИЯ КНОПКИ АДМИН-ПАНЕЛИ
    // ==========================================
    const userRole = localStorage.getItem('user_role');
    const adminLink = document.getElementById('admin-link');

    // Если роль админ и элемент найден, меняем display с 'none' на 'flex'
    // (используем 'flex', потому что у класса .header__btn в CSS стоит display: flex)
    if (userRole === 'admin' && adminLink) {
        adminLink.style.display = 'flex';
    }

    // Бонус: очистка данных при нажатии на кнопку "Выход"
    const exitBtn = document.querySelector('.header__exit');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_email'); // если вы сохраняете email при входе
            // Можно добавить редирект на страницу входа, если нужно:
            // window.location.href = '../Login/index.html';
        });
    }
});