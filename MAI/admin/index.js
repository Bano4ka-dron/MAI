document.addEventListener('DOMContentLoaded', () => {
    // Проверка прав доступа
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'admin') {
        alert('Доступ запрещен!');
        window.location.href = '../Login/index.html';
        return;
    }

    // Элементы формы добавления
    const typeInput = document.getElementById('prod-type');
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const imageInput = document.getElementById('prod-image');
    const previewImg = document.getElementById('image-preview');
    const addBtn = document.getElementById('add-prod-btn');
    const productsList = document.getElementById('products-list');

    // Предпросмотр картинки
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.style.display = 'none';
        }
    });

    // ==========================================
    // ДОБАВЛЕНИЕ ТОВАРА
    // ==========================================
    addBtn.addEventListener('click', async () => {
        if (!typeInput.value || !nameInput.value || !priceInput.value || !imageInput.files[0]) {
            alert('Заполните все поля и выберите картинку!');
            return;
        }

        const formData = new FormData();
        formData.append('type', typeInput.value);
        formData.append('name', nameInput.value);
        formData.append('price', priceInput.value);
        formData.append('image', imageInput.files[0]);

        addBtn.disabled = true;
        const originalText = addBtn.textContent;
        addBtn.textContent = 'Загрузка...';
        addBtn.style.opacity = '0.7';

        try {
            const res = await fetch('http://localhost:5000/api/admin/product', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.status === 'ok') {
                alert('✅ Товар успешно добавлен!');
                typeInput.value = '';
                nameInput.value = '';
                priceInput.value = '';
                imageInput.value = '';
                previewImg.style.display = 'none';
                loadProducts(); // Перезагружаем список
            } else {
                throw new Error(data.message || 'Ошибка сервера');
            }
        } catch (err) {
            console.error('Ошибка:', err);
            alert('❌ Ошибка: ' + err.message);
        } finally {
            addBtn.disabled = false;
            addBtn.textContent = originalText;
            addBtn.style.opacity = '1';
        }
    });

    // ==========================================
    // ЗАГРУЗКА СПИСКА ТОВАРОВ
    // ==========================================
    async function loadProducts() {
        try {
            const res = await fetch('http://localhost:5000/api/admin/products');
            if (!res.ok) throw new Error('Ошибка сети');
            
            const products = await res.json();
            renderProductsList(products);
        } catch (err) {
            console.error('Ошибка загрузки списка:', err);
            productsList.innerHTML = '<p class="admin-empty">Не удалось загрузить список товаров</p>';
        }
    }

    function renderProductsList(products) {
        if (products.length === 0) {
            productsList.innerHTML = '<p class="admin-empty">Каталог пуст. Добавьте первый товар!</p>';
            return;
        }

        productsList.innerHTML = '';
        
        products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'admin-product-item';
            item.dataset.id = product.id;

            item.innerHTML = `
                <img src="${product.image}" alt="${product.name}" onerror="this.src='../images/фон.png'">
                <div class="admin-product-info">
                    <strong>${product.name}</strong>
                    <span>${product.type} • ${product.price} ₽</span>
                </div>
                <button class="admin-delete-btn" data-id="${product.id}">Удалить</button>
            `;

            productsList.appendChild(item);
        });

        // Навешиваем обработчики на кнопки удаления
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }

    // ==========================================
    // УДАЛЕНИЕ ТОВАРА
    // ==========================================
    async function handleDelete(e) {
        const btn = e.target;
        const productId = btn.dataset.id;
        const item = btn.closest('.admin-product-item');

        if (!confirm('Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = '...';

        try {
            const res = await fetch('http://localhost:5000/api/admin/product/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: productId })
            });

            const data = await res.json();

            if (data.status === 'ok') {
                // Плавно удаляем элемент из списка
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                item.style.transition = 'all 0.3s';
                
                setTimeout(() => {
                    item.remove();
                    // Если список стал пустым
                    if (productsList.children.length === 0) {
                        productsList.innerHTML = '<p class="admin-empty">Каталог пуст. Добавьте первый товар!</p>';
                    }
                }, 300);
            } else {
                throw new Error(data.message || 'Ошибка удаления');
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
            alert(' Ошибка: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Удалить';
        }
    }

    // Загружаем список при открытии страницы
    loadProducts();
});