document.addEventListener('DOMContentLoaded', () => {
    const height = document.getElementById('data-height');
    const weight = document.getElementById('data-weight');
    const shoe = document.getElementById('data-shoe');
    const clothes = document.getElementById('data-clothes');
    const nextBtn = document.getElementById('data-next');
    const userId = localStorage.getItem('user_id');

    const errHeight = document.getElementById('err-height');
    const errWeight = document.getElementById('err-weight');
    const errShoe = document.getElementById('err-shoe');
    const errClothes = document.getElementById('err-clothes');

    // === 1. ЗАГРУЗКА СОХРАНЁННЫХ ДАННЫХ ===
    async function loadData() {
        if (!userId || userId === '0') return;
        try {
            const res = await fetch(`http://localhost:5000/api/user/data?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.height) height.value = data.height + ' см';
                if (data.weight) weight.value = data.weight + ' кг';
                if (data.shoe_size) shoe.value = data.shoe_size;
                if (data.clothes_size) clothes.value = data.clothes_size;
            }
        } catch (err) {
            console.error('Не удалось загрузить данные:', err);
        }
    }

    // === 2. ВАЛИДАЦИЯ И ОШИБКИ ===
    function showError(input, errEl, message) {
        input.classList.add('data-field--invalid');
        errEl.textContent = message;
        errEl.classList.add('is-visible');
    }

    function clearError(input, errEl) {
        input.classList.remove('data-field--invalid');
        errEl.textContent = '';
        errEl.classList.remove('is-visible');
    }

    function validateHeight() {
        const v = parseInt(height.value, 10);
        if (!height.value) { showError(height, errHeight, 'Введите рост'); return false; }
        if (isNaN(v) || v < 30 || v > 300) { showError(height, errHeight, 'Рост от 30 до 300 см'); return false; }
        clearError(height, errHeight); return true;
    }

    function validateWeight() {
        const v = parseInt(weight.value, 10);
        if (!weight.value) { showError(weight, errWeight, 'Введите вес'); return false; }
        if (isNaN(v) || v < 2 || v > 700) { showError(weight, errWeight, 'Вес от 2 до 700 кг'); return false; }
        clearError(weight, errWeight); return true;
    }

    function validateShoe() {
        const v = parseInt(shoe.value, 10);
        if (!shoe.value) { showError(shoe, errShoe, 'Введите размер'); return false; }
        if (isNaN(v) || v < 30 || v > 60) { showError(shoe, errShoe, 'Размер от 30 до 60'); return false; }
        clearError(shoe, errShoe); return true;
    }

    function validateClothes() {
        if (!clothes.value) { showError(clothes, errClothes, 'Выберите размер'); return false; }
        clearError(clothes, errClothes); return true;
    }

    // === 3. УМНЫЕ СУФФИКСЫ (см, кг) ===
    function attachSuffix(input, suffix, errEl) {
        const SUFFIX_FULL = ' ' + suffix;
        function apply() {
            const digits = input.value.replace(/\D/g, '');
            if (!digits) { input.value = ''; return; }
            if (input.value !== digits + SUFFIX_FULL) {
                input.value = digits + SUFFIX_FULL;
                input.setSelectionRange(digits.length, digits.length);
            }
        }
        input.addEventListener('input', () => { apply(); clearError(input, errEl); });
        input.addEventListener('focus', apply);
        input.addEventListener('blur', () => { apply(); validateByInput(input); });
    }

    function validateByInput(input) {
        if (input === height) validateHeight();
        else if (input === weight) validateWeight();
        else if (input === shoe) validateShoe();
    }

    attachSuffix(height, 'см', errHeight);
    attachSuffix(weight, 'кг', errWeight);
    
    // Для обуви суффикс не нужен, просто цифры
    shoe.addEventListener('input', () => {
        shoe.value = shoe.value.replace(/\D/g, '');
        clearError(shoe, errShoe);
    });

    clothes.addEventListener('change', () => clearError(clothes, errClothes));

    // === 4. СОХРАНЕНИЕ И ПЕРЕХОД ===
    if (nextBtn) {
        nextBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Останавливаем переход, пока не сохраним

            if (!validateHeight() || !validateWeight() || !validateShoe() || !validateClothes()) {
                return;
            }

            const payload = {
                user_id: userId,
                height: height.value.replace(/\D/g, ''),
                weight: weight.value.replace(/\D/g, ''),
                shoe_size: shoe.value.replace(/\D/g, ''),
                clothes_size: clothes.value
            };

            nextBtn.textContent = 'Сохранение...';
            nextBtn.style.opacity = '0.7';

            try {
                const res = await fetch('http://localhost:5000/api/user/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.status === 'ok') {
                    window.location.href = '../Upload/index.html';
                } else {
                    alert('Ошибка сохранения: ' + data.message);
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка сети. Проверьте, запущен ли сервер.');
            } finally {
                nextBtn.textContent = 'Сохранить и перейти к загрузке фото';
                nextBtn.style.opacity = '1';
            }
        });
    }

    // Запускаем загрузку данных при старте
    loadData();
});