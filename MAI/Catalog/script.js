document.addEventListener('DOMContentLoaded', async () => {
    const FAV_KEY = 'mai_favorites';
    const catalogContainer = document.getElementById('catalog-container');

    // --- 1. Проверка роли админа для отображения кнопки ---
    const userRole = localStorage.getItem('user_role');
    const adminLink = document.getElementById('admin-link');
    if (userRole === 'admin' && adminLink) {
        adminLink.style.display = 'flex';
    }

    // --- 2. Логика Избранного (LocalStorage) ---
        // --- 2. Логика Избранного (через БД) ---
    const userId = localStorage.getItem('user_id');
    let favoriteIds = new Set(); // Храним ID для быстрой проверки при отрисовке

    // При загрузке страницы получаем актуальный список избранного с сервера
    async function loadUserFavorites() {
        if (!userId || userId === '0') return; 
        try {
            const res = await fetch(`http://localhost:5000/api/wishlist?user_id=${userId}`);
            if (res.ok) {
                const favs = await res.json();
                favs.forEach(item => favoriteIds.add(String(item.id)));
            }
        } catch (err) {
            console.error('Ошибка загрузки избранного:', err);
        }
    }

    // Делегирование событий для кнопок избранного
    catalogContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-fav]');
        if (!btn) return;
        
        e.stopPropagation();
        const productId = btn.dataset.fav;

        if (!userId) {
            alert('Пожалуйста, войдите в аккаунт, чтобы добавлять товары в избранное');
            return;
        }

        try {
            // ОТПРАВЛЯЕМ ЗАПРОС НА СЕРВЕР ДЛЯ СОХРАНЕНИЯ В БД
            const res = await fetch('http://localhost:5000/api/wishlist/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, product_id: productId })
            });

            if (res.ok) {
                // Переключаем визуальное состояние только после успешного ответа сервера
                if (favoriteIds.has(productId)) {
                    favoriteIds.delete(productId);
                    btn.classList.remove('product__favorite--active');
                } else {
                    favoriteIds.add(productId);
                    btn.classList.add('product__favorite--active');
                }
            } else {
                const errData = await res.json();
                alert(errData.message || 'Ошибка при обновлении избранного');
            }
        } catch (err) {
            console.error('Ошибка обновления избранного:', err);
            alert('Не удалось соединиться с сервером');
        }
    });
    // --- 3. Загрузка товаров с сервера ---
    async function loadProducts() {
        try {
            const res = await fetch('http://localhost:5000/api/products');
            
            if (!res.ok) throw new Error('Ошибка сети');
            
            const products = await res.json();
            renderProducts(products);
            
        } catch (err) {
            console.error('Ошибка загрузки каталога:', err);
            catalogContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #fff; font-family: \'JetBrains Mono\';">Не удалось загрузить товары. Проверьте, запущен ли server.py</p>';
        }
    }

    // --- 4. Рендеринг товаров ---
     async function renderProducts(products) { // <-- Добавьте async
        catalogContainer.innerHTML = '';

        // СНАЧАЛА загружаем избранное, ПОТОМ рисуем карточки
        await loadUserFavorites(); 

        products.forEach(product => {
            const article = document.createElement('article');
            article.className = 'product';
            article.dataset.id = product.id;

            // Теперь проверка идет по Set favoriteIds, а не по localStorage
            const isFav = favoriteIds.has(String(product.id)) ? 'product__favorite--active' : '';

            article.innerHTML = `
                <div class="product__image">
                    <img src="${product.image}" alt="${product.name}">
                    <button class="product__favorite ${isFav}" type="button" data-fav="${product.id}" aria-label="В избранное">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                </div>
                <div class="product__info">
                    <span class="product__price">${product.price} ₽</span>
                    <span class="product__desc">${product.name}</span>
                </div>
            `;

            catalogContainer.appendChild(article);

            // 3D Эффект наклона
            const MAX_TILT = 6;
            article.addEventListener('mousemove', (e) => {
                const rect = article.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);

                const nx = Math.max(-1, Math.min(1, dx));
                const ny = Math.max(-1, Math.min(1, dy));

                article.style.setProperty('--rx', (ny * MAX_TILT) + 'deg');
                article.style.setProperty('--ry', (-nx * MAX_TILT) + 'deg');
            });

            article.addEventListener('mouseleave', () => {
                article.style.setProperty('--rx', '0deg');
                article.style.setProperty('--ry', '0deg');
            });
        });

        updateScrollbar();
    }

    // --- 5. Логика кастомного скроллбара ---
    const scroll = document.getElementById('catalog-scroll');
    const track = document.getElementById('catalog-track');
    const thumb = document.getElementById('catalog-thumb');
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
        const maxLeft = track.clientWidth - THUMB_W;
        thumb.style.left = (progress * maxLeft) + 'px';
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

        let isDragging = false;
        let startX = 0;
        let startLeft = 0;

        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = thumb.offsetLeft;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const maxLeft = track.clientWidth - THUMB_W;
            let newLeft = Math.max(0, Math.min(startLeft + deltaX, maxLeft));
            thumb.style.left = newLeft + 'px';
            const ratio = maxLeft === 0 ? 0 : newLeft / maxLeft;
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
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

    // Запускаем загрузку при старте
    loadProducts();
});