document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('upload-block');
    const toggle = document.getElementById('upload-toggle');
    const input = document.getElementById('upload-input');
    const nextBtn = document.getElementById('upload-next');
    const hint = document.getElementById('upload-hint');
    const userId = localStorage.getItem('user_id');

    if (!section || !toggle || !input || !nextBtn) return;

    let isOpen = true; // Теперь все карточки всегда видны
    let activeCard = null;
    const uploadedFiles = new Map(); // Храним: index -> File object

    // 1. Клик по кнопке "+" на карточке
    document.querySelectorAll('.upload-card').forEach(card => {
        const addBtn = card.querySelector('.upload-card__add');
        if (!addBtn) return;

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeCard = card;
            input.value = ''; // Сброс, чтобы можно было выбрать тот же файл повторно
            input.click();
        });
    });

    // 2. Обработка выбора файла
    input.addEventListener('change', () => {
        if (!activeCard) return;
        const file = input.files && input.files[0];
        if (!file) return;

        // Валидация размера (5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой! Максимальный размер: 5 МБ.');
            return;
        }

        const cardIndex = activeCard.dataset.index;
        uploadedFiles.set(cardIndex, file);

        // Создаем или обновляем превью
        let preview = activeCard.querySelector('.upload-card__preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'upload-card__preview';
            const img = document.createElement('img');
            img.alt = 'Загруженное фото';
            preview.appendChild(img);
            activeCard.insertBefore(preview, activeCard.firstChild);
        }

        const img = preview.querySelector('img');
        if (img) {
            const oldSrc = img.src;
            if (oldSrc && oldSrc.startsWith('blob:')) {
                URL.revokeObjectURL(oldSrc);
            }
            img.src = URL.createObjectURL(file);
        }

        // Визуально показываем, что карточка заполнена
        activeCard.classList.add('is-filled');

        // Обновляем подсказку
        if (uploadedFiles.size > 0) {
            hint.textContent = `Загружено фото: ${uploadedFiles.size} из 5`;
            hint.style.color = '#4ADE80';
        }

        activeCard = null;
    });

    // 3. Кнопка "Доп. фото" (просто заглушка, так как все карточки уже видны)
    toggle.addEventListener('click', () => {
        // Можно добавить логику сброса или показа дополнительных карточек
        // Пока оставим как информационную кнопку
        alert('Все 5 карточек уже доступны для загрузки!');
    });

    // 4. Отправка данных на сервер
    nextBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (uploadedFiles.size === 0) {
            alert('Пожалуйста, загрузите хотя бы одну фотографию.');
            return;
        }

        if (!userId || userId === '0') {
            alert('Ошибка: пользователь не авторизован.');
            return;
        }

        // Визуальное состояние загрузки
        nextBtn.classList.add('is-loading');
        const originalText = nextBtn.textContent;
        nextBtn.textContent = 'Загрузка...';

        const formData = new FormData();
        formData.append('user_id', userId);

        uploadedFiles.forEach((file, index) => {
            formData.append(`photo_${index}`, file);
        });

        try {
            const res = await fetch('http://localhost:5000/api/upload/photos', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.status === 'ok') {
                window.location.href = '../Generate/index.html';
            } else {
                alert('Ошибка загрузки: ' + data.message);
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
            alert('Не удалось соединиться с сервером. Проверьте, запущен ли он.');
        } finally {
            nextBtn.classList.remove('is-loading');
            nextBtn.textContent = originalText;
        }
    });
});