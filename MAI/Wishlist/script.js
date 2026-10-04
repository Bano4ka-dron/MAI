document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('wishlist-container');
    const userId = localStorage.getItem('user_id');
    
    // Проверка роли админа для отображения кнопки
    const userRole = localStorage.getItem('user_role');
    const adminLink = document.getElementById('admin-link');
    if (userRole === 'admin' && adminLink) adminLink.style.display = 'flex';

    // Если пользователь не вошел
    console.log(userId,userId);
    console.log(localStorage)
    if (!userId || userId === '0') {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #fff; font-family: \'JetBrains Mono\'; font-size: 18px;">Пожалуйста, <a href="../Login/index.html" style="color: #FF2A6D;">войдите в аккаунт</a>, чтобы увидеть вишлист.</p>';
        return;
    }

    // Загрузка товаров из БД
    async function loadWishlist() {
        try {
            const res = await fetch(`http://localhost:5000/api/wishlist?user_id=${userId}`);
            if (!res.ok) throw new Error('Ошибка сети');
            
            const products = await res.json();
            renderWishlist(products);
        } catch (err) {
            console.error('Ошибка загрузки вишлиста:', err);
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #fff;">Не удалось загрузить данные.</p>';
        }
    }

    // Отрисовка карточек
    function renderWishlist(products) {
        container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #fff; font-family: \'JetBrains Mono\'; font-size: 18px;">Ваш вишлист пуст 😔<br><br><a href="../Catalog/index.html" style="color: #FF2A6D; text-decoration: underline;">Перейти в каталог</a></p>';
            if (document.getElementById('wishlist-track')) {
                document.getElementById('wishlist-track').style.display = 'none';
            }
            return;
        }

        if (document.getElementById('wishlist-track')) {
            document.getElementById('wishlist-track').style.display = 'block';
        }

        products.forEach(product => {
            const article = document.createElement('article');
            article.className = 'product';
            article.dataset.id = product.id;

            article.innerHTML = `
                <div class="product__image">
                    <img src="${product.image}" alt="${product.name}">
                    <button class="product__favorite product__favorite--active" type="button" data-fav="${product.id}" aria-label="Убрать из избранного">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                </div>
                <div class="product__info">
                    <span class="product__price">${product.price} ₽</span>
                    <span class="product__desc">${product.name}</span>
                </div>
            `;

            container.appendChild(article);

            // 3D-эффект наклона
            const MAX_TILT = 6;
            article.addEventListener('mousemove', (e) => {
                const rect = article.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);
                article.style.setProperty('--rx', (Math.max(-1, Math.min(1, dy)) * MAX_TILT) + 'deg');
                article.style.setProperty('--ry', (-Math.max(-1, Math.min(1, dx)) * MAX_TILT) + 'deg');
            });
            article.addEventListener('mouseleave', () => {
                article.style.setProperty('--rx', '0deg');
                article.style.setProperty('--ry', '0deg');
            });
        });

        updateScrollbar();
    }

    // Обработка клика по сердечку (удаление из БД)
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-fav]');
        if (!btn) return;
        e.stopPropagation();
        
        const productId = btn.dataset.fav;

        try {
            const res = await fetch('http://localhost:5000/api/wishlist/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, product_id: productId })
            });

            if (res.ok) {
                // Перезагружаем вишлист после удаления
                loadWishlist();
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
        }
    });

    // --- Логика кастомного скроллбара ---
    const scroll = document.getElementById('wishlist-scroll');
    const track = document.getElementById('wishlist-track');
    const thumb = document.getElementById('wishlist-thumb');
    const THUMB_W = 188;

    function updateScrollbar() {
        if (!scroll || !track || !thumb) return;
        const maxScroll = scroll.scrollWidth - scroll.clientWidth;
        if (maxScroll <= 0) {
            thumb.style.left = '0px';
            track.style.display = 'none';
            return;
        }
        track.style.display = 'block';
        const progress = scroll.scrollLeft / maxScroll;
        thumb.style.left = (progress * (track.clientWidth - THUMB_W)) + 'px';
    }

    if (scroll && track && thumb) {
        track.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = track.getBoundingClientRect();
            const clickX = e.clientX - rect.left - THUMB_W / 2;
            const maxLeft = track.clientWidth - THUMB_W;
            const ratio = Math.max(0, Math.min(clickX / maxLeft, 1));
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
        });

        let isDragging = false, startX = 0, startLeft = 0;
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true; startX = e.clientX; startLeft = thumb.offsetLeft; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const maxLeft = track.clientWidth - THUMB_W;
            let newLeft = Math.max(0, Math.min(startLeft + deltaX, maxLeft));
            thumb.style.left = newLeft + 'px';
            scroll.scrollLeft = (newLeft / maxLeft) * (scroll.scrollWidth - scroll.clientWidth);
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        scroll.addEventListener('scroll', updateScrollbar);
        window.addEventListener('resize', updateScrollbar);
        scroll.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                scroll.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    // Запуск загрузки
    loadWishlist();
});