document.addEventListener('DOMContentLoaded', () => {
    const scroll = document.getElementById('fitting-scroll');
    const thumb = document.getElementById('fitting-thumb');
    const grid = document.getElementById('fitting-grid');
    const btn = document.getElementById('fitting-btn');
    const saved = document.getElementById('fitting-saved');
    const status = document.getElementById('fitting-status');
    const loader = document.getElementById('fitting-loader');
    const message = document.getElementById('fitting-message');
    const iconLeft = document.getElementById('fitting-icon-left');
    const iconRight = document.getElementById('fitting-icon-right');

    const userId = localStorage.getItem('user_id');
    let wishlistItems = [];
    let userPhotos = [];
    let state = 'idle';

    const typeNames = {
        'футболка': 'Футболки',
        'куртка': 'Куртки',
        'худи': 'Худи',
        'свитер': 'Свитера и кардиганы',
        'платье': 'Платья',
        'костюм': 'Костюмы',
        'штаны': 'Штаны и джинсы',
        'головной убор': 'Головные уборы',
        'обувь': 'Обувь',
        'аксессуар': 'Аксессуары'
    };

    // === 1. ЗАГРУЗКА ДАННЫХ ===
    async function loadData() {
        if (!userId || userId === '0') {
            grid.innerHTML = '<p class="fitting-empty-message">Пожалуйста, <a href="../Login/index.html" style="color: #FF2A6D; text-decoration: underline;">войдите в аккаунт</a>.</p>';
            return;
        }

        try {
            const [wishlistRes, photosRes] = await Promise.all([
                fetch(`http://localhost:5000/api/wishlist?user_id=${userId}`),
                fetch(`http://localhost:5000/api/user/photos?user_id=${userId}`)
            ]);

            if (!wishlistRes.ok || !photosRes.ok) throw new Error('Ошибка сети');

            wishlistItems = await wishlistRes.json();
            userPhotos = await photosRes.json();

            renderGrid();
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            grid.innerHTML = '<p class="fitting-empty-message">Не удалось загрузить данные.</p>';
        }
    }

    // === 2. ОТРИСОВКА СЕТКИ ===
    function renderGrid() {
        grid.innerHTML = '';

        // === СЕКЦИЯ: ФОТО ПОЛЬЗОВАТЕЛЯ ===
if (userPhotos.length === 0) {
    const noPhotos = document.createElement('div');
    noPhotos.className = 'fitting-section-empty';
    noPhotos.innerHTML = `
        <h3 class="fitting-category-title">Ваше фото</h3>
        <p class="fitting-empty-message">Вы ещё не загрузили фото. <a href="../Upload/index.html" style="color: #FF2A6D; text-decoration: underline;">Загрузить сейчас</a></p>
    `;
    grid.appendChild(noPhotos);
} else {
    const photoSection = document.createElement('div');
    photoSection.className = 'fitting-section';
    
    const photoTitle = document.createElement('h3');
    photoTitle.className = 'fitting-category-title';
    photoTitle.textContent = 'Ваше фото';
    photoSection.appendChild(photoTitle);

    const photoGrid = document.createElement('div');
    photoGrid.className = 'fitting-photo-grid';

    userPhotos.forEach((photoPath, index) => {
        const card = document.createElement('div');
        card.className = 'fitting-photo-card';
        
        const radioId = `photo-${index}`;
        card.innerHTML = `
            <label class="fitting-card__radio-label" for="${radioId}">
                <input 
                    type="radio" 
                    id="${radioId}"
                    name="user_photo" 
                    value="${photoPath}" 
                    class="fitting-radio"
                >
                <span class="fitting-card__radio-visual"></span>
                <span class="fitting-card__radio-text">Выбрать</span>
            </label>
            <div class="fitting-card__img">
                <img src="../${photoPath}" alt="Ваше фото">
            </div>
        `;

        photoGrid.appendChild(card);
    });

    photoSection.appendChild(photoGrid);
    grid.appendChild(photoSection);
}

        // === СЕКЦИЯ: ОДЕЖДА ИЗ ВИШЛИСТА ===
        if (wishlistItems.length === 0) {
            const noClothes = document.createElement('div');
            noClothes.className = 'fitting-section-empty';
            noClothes.innerHTML = `
                <h3 class="fitting-category-title">Одежда из избранного</h3>
                <p class="fitting-empty-message">Ваш вишлист пуст. <a href="../Catalog/index.html" style="color: #FF2A6D; text-decoration: underline;">Перейти в каталог</a></p>
            `;
            grid.appendChild(noClothes);
        } else {
            const grouped = {};
            wishlistItems.forEach(item => {
                const type = item.type || 'Другое';
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(item);
            });

            for (const [type, products] of Object.entries(grouped)) {
                const clothesSection = document.createElement('div');
                clothesSection.className = 'fitting-section';

                const title = document.createElement('h3');
                title.className = 'fitting-category-title';
                title.textContent = typeNames[type] || type;
                clothesSection.appendChild(title);

                const radioGroupName = `fitting_${type.toLowerCase().replace(/\s+/g, '_')}`;

                products.forEach(item => {
                    const card = document.createElement('article');
                    card.className = 'fitting-card';
                    card.dataset.id = item.id;
                    const radioId = `radio-${item.id}`;

                    card.innerHTML = `
                        <label class="fitting-card__radio-label" for="${radioId}">
                            <input 
                                type="radio" 
                                id="${radioId}"
                                name="${radioGroupName}" 
                                value="${item.id}" 
                                class="fitting-radio"
                            >
                            <span class="fitting-card__radio-visual"></span>
                            <span class="fitting-card__radio-text">Выбрать</span>
                        </label>
                        <div class="fitting-card__img">
                            <img src="${item.image}" alt="${item.name}">
                        </div>
                        <button class="fitting-card__trash" type="button" aria-label="Удалить из вишлиста">
                            <svg viewBox="0 0 30 30" fill="currentColor">
                                <path d="M9 25a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H9v16zM22 4h-4l-1-1h-4l-1 1H8v3h14V4z"/>
                            </svg>
                        </button>
                    `;

                    const radio = card.querySelector('.fitting-radio');
                    radio.addEventListener('change', () => {
                        document.querySelectorAll(`input[name="${radioGroupName}"]`)
                            .forEach(r => r.closest('.fitting-card').classList.remove('is-selected'));
                        if (radio.checked) {
                            card.classList.add('is-selected');
                        }
                    });

                    clothesSection.appendChild(card);
                });

                grid.appendChild(clothesSection);
            }
        }

        updateThumb();
    }

// === 3. ОБРАБОТКА ВЫБОРА ФОТО (глобальный обработчик) ===
document.addEventListener('change', (e) => {
    // Если изменилась radio-кнопка с именем user_photo
    if (e.target.matches('input[name="user_photo"]')) {
        // Снимаем выделение со ВСЕХ карточек фото
        document.querySelectorAll('.fitting-photo-card').forEach(card => {
            card.classList.remove('is-selected');
        });
        
        // Добавляем выделение только к выбранной карточке
        const selectedCard = e.target.closest('.fitting-photo-card');
        if (selectedCard) {
            selectedCard.classList.add('is-selected');
        }
    }

    // Если изменилась radio-кнопка одежды (имя начинается с fitting_)
    if (e.target.matches('input[name^="fitting_"]')) {
        const groupName = e.target.name;
        
        // Снимаем выделение со всех карточек этой группы
        document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => {
            const card = radio.closest('.fitting-card');
            if (card) card.classList.remove('is-selected');
        });
        
        // Добавляем выделение к выбранной
        const selectedCard = e.target.closest('.fitting-card');
        if (selectedCard) {
            selectedCard.classList.add('is-selected');
        }
    }
});

// === 4. ОБРАБОТКА УДАЛЕНИЯ ИЗ ВИШЛИСТА ===
grid.addEventListener('click', async (e) => {
    const trashBtn = e.target.closest('.fitting-card__trash');
    if (!trashBtn) return;

    const card = trashBtn.closest('.fitting-card');
    const productId = card.dataset.id;

    try {
        const res = await fetch('http://localhost:5000/api/wishlist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, product_id: productId })
        });

        if (res.ok) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                wishlistItems = wishlistItems.filter(i => String(i.id) !== productId);
                renderGrid();
            }, 300);
        }
    } catch (err) {
        console.error('Ошибка удаления:', err);
    }
});

    // === 4. КНОПКА "ПРИМЕРИТЬ" ===
    if (btn && saved && status && loader && message && iconLeft && iconRight) {
        btn.addEventListener('click', () => {
            if (state === 'idle') {
                // Собираем выбранное фото
                const selectedPhoto = document.querySelector('input[name="user_photo"]:checked');
                if (!selectedPhoto) {
                    alert('Пожалуйста, выберите ваше фото');
                    return;
                }

                // Собираем выбранную одежду
                const selectedCards = grid.querySelectorAll('.fitting-card.is-selected');
                if (selectedCards.length === 0) {
                    alert('Выберите хотя бы один предмет одежды');
                    return;
                }

                // === СОБИРАЕМ ВСЁ В ОДИН ОБЪЕКТ ===
                const generationData = {
                    user_id: userId,
                    photo: selectedPhoto.value,
                    items: Array.from(selectedCards).map(card => {
                        const productId = card.dataset.id;
                        return wishlistItems.find(item => String(item.id) === productId);
                    })
                };

                console.log('📦 Данные для генерации:', generationData);
                // Здесь будет fetch на ваш API генерации:
                // fetch('http://localhost:5000/api/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(generationData) })

                state = 'loading';
                status.classList.add('is-visible');
                loader.classList.add('is-visible');
                message.classList.remove('is-visible');
                iconLeft.classList.remove('is-visible');
                iconRight.classList.remove('is-visible');
                btn.textContent = 'Примерить';
                btn.disabled = true;
                btn.style.opacity = '0';
                saved.style.opacity = '0';
                saved.style.pointerEvents = 'none';

                setTimeout(() => {
                    state = 'done';
                    loader.classList.remove('is-visible');
                    message.classList.add('is-visible');
                    iconLeft.classList.add('is-visible');
                    iconRight.classList.add('is-visible');
                    btn.textContent = 'Назад';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    saved.style.opacity = '1';
                    saved.style.pointerEvents = 'auto';
                }, 10000);
            } else if (state === 'done') {
                state = 'idle';
                status.classList.remove('is-visible');
                loader.classList.remove('is-visible');
                message.classList.remove('is-visible');
                iconLeft.classList.remove('is-visible');
                iconRight.classList.remove('is-visible');
                btn.textContent = 'Примерить';
            }
        });
    }

    // === 5. СКРОЛЛБАР ===
    function updateThumb() {
        if (!scroll || !thumb) return;
        const track = thumb.parentElement;
        const maxScroll = scroll.scrollHeight - scroll.clientHeight;
        if (maxScroll <= 0) {
            thumb.style.height = track.clientHeight + 'px';
            thumb.style.top = '0px';
            return;
        }
        const ratio = scroll.clientHeight / scroll.scrollHeight;
        const h = Math.max(60, track.clientHeight * ratio);
        thumb.style.height = h + 'px';
        const progress = scroll.scrollTop / maxScroll;
        const maxTop = track.clientHeight - h;
        thumb.style.top = (progress * maxTop) + 'px';
    }

    if (scroll && thumb) {
        const track = thumb.parentElement;
        scroll.addEventListener('scroll', updateThumb);
        window.addEventListener('resize', updateThumb);

        let isDragging = false, startY = 0, startTop = 0;
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true; startY = e.clientY; startTop = thumb.offsetTop;
            thumb.style.cursor = 'grabbing'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startY;
            const maxTop = track.clientHeight - thumb.offsetHeight;
            let newTop = Math.max(0, Math.min(startTop + deltaY, maxTop));
            thumb.style.top = newTop + 'px';
            scroll.scrollTop = (newTop / maxTop) * (scroll.scrollHeight - scroll.clientHeight);
        });
        document.addEventListener('mouseup', () => { isDragging = false; thumb.style.cursor = 'grab'; });
        track.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = track.getBoundingClientRect();
            const clickY = e.clientY - rect.top - thumb.offsetHeight / 2;
            const maxTop = track.clientHeight - thumb.offsetHeight;
            const ratio = Math.max(0, Math.min(clickY / maxTop, 1));
            scroll.scrollTop = ratio * (scroll.scrollHeight - scroll.clientHeight);
        });
        updateThumb();
    }

    // Запуск
    loadData();
});