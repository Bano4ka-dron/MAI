document.addEventListener('DOMContentLoaded', () => {
    const login = document.getElementById('reg-login');
    const email = document.getElementById('reg-email');
    const password = document.getElementById('reg-password');
    const gender = document.getElementById('reg-gender');
    const birth = document.getElementById('reg-birth');
    const birthPicker = document.getElementById('reg-birth-picker');
    const birthNative = document.getElementById('reg-birth-native');
    const eyeBtn = document.getElementById('reg-password-eye');
    const btn = document.getElementById('reg-btn');

    const errLogin = document.getElementById('err-login');
    const errEmail = document.getElementById('err-email');
    const errPassword = document.getElementById('err-password');
    const errGender = document.getElementById('err-gender');
    const errBirth = document.getElementById('err-birth');

    const LOGIN_RE = /^[A-Za-z0-9]{3,32}$/;
    const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(ru|com|net|org|edu|gov|io|info|biz)$/i;

    function showError(input, errEl, message) {
        input.classList.add('auth-field--invalid');
        errEl.textContent = message;
        errEl.classList.add('is-visible');
    }

    function clearError(input, errEl) {
        input.classList.remove('auth-field--invalid');
        errEl.textContent = '';
        errEl.classList.remove('is-visible');
    }

    function validateLogin() {
        const v = login.value.trim();
        if (!v) {
            showError(login, errLogin, 'Введите логин');
            return false;
        }
        if (!LOGIN_RE.test(v)) {
            showError(login, errLogin, 'Только буквы и цифры, 3–32 символа');
            return false;
        }
        clearError(login, errLogin);
        return true;
    }

    function validateEmail() {
        const v = email.value.trim();
        if (!v) {
            showError(email, errEmail, 'Введите почту');
            return false;
        }
        if (!v.includes('@')) {
            showError(email, errEmail, 'В адресе должен быть символ @');
            return false;
        }
        const parts = v.split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            showError(email, errEmail, 'Проверьте адрес: до и после @ должны быть символы');
            return false;
        }
        if (!parts[1].includes('.')) {
            showError(email, errEmail, 'После @ нужен домен, например mail.ru');
            return false;
        }
        if (!EMAIL_RE.test(v)) {
            showError(email, errEmail, 'Пример верного адреса: name@mail.ru');
            return false;
        }
        clearError(email, errEmail);
        return true;
    }

    function validatePassword() {
        const v = password.value;
        if (!v) {
            showError(password, errPassword, 'Введите пароль');
            return false;
        }

        const problems = [];
        if (v.length < 6) problems.push('минимум 6 символов');
        if (!/[A-Z]/.test(v)) problems.push('заглавная буква');
        if (!/[a-z]/.test(v)) problems.push('строчная буква');
        if (!/[0-9]/.test(v)) problems.push('цифра');

        if (problems.length) {
            showError(password, errPassword, 'Нужно: ' + problems.join(', '));
            return false;
        }

        clearError(password, errPassword);
        return true;
    }

    function validateGender() {
        const v = gender.value;
        if (!v) {
            showError(gender, errGender, 'Выберите пол');
            return false;
        }
        clearError(gender, errGender);
        return true;
    }

    function validateBirth() {
        const v = birth.value.trim();
        if (!v) {
            showError(birth, errBirth, 'Введите дату рождения');
            return false;
        }
        const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (!m) {
            showError(birth, errBirth, 'Формат: ДД.ММ.ГГГГ');
            return false;
        }
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        const now = new Date();
        const currentYear = now.getFullYear();

        if (month < 1 || month > 12) {
            showError(birth, errBirth, 'Месяц от 01 до 12');
            return false;
        }
        if (day < 1 || day > 31) {
            showError(birth, errBirth, 'День от 01 до 31');
            return false;
        }
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
            showError(birth, errBirth, 'В этом месяце нет такого дня');
            return false;
        }
        if (year < 1900 || year > currentYear) {
            showError(birth, errBirth, 'Год от 1900 до ' + currentYear);
            return false;
        }
        const candidate = new Date(year, month - 1, day);
        if (candidate > now) {
            showError(birth, errBirth, 'Дата в будущем');
            return false;
        }
        clearError(birth, errBirth);
        return true;
    }

    login.addEventListener('blur', validateLogin);
    email.addEventListener('blur', validateEmail);
    password.addEventListener('blur', validatePassword);
    gender.addEventListener('change', validateGender);
    birth.addEventListener('blur', validateBirth);

    login.addEventListener('input', () => clearError(login, errLogin));
    email.addEventListener('input', () => clearError(email, errEmail));
    password.addEventListener('input', () => clearError(password, errPassword));
    gender.addEventListener('change', () => clearError(gender, errGender));

    birth.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 8);
        let out = '';
        if (v.length > 0) out += v.slice(0, 2);
        if (v.length >= 3) out += '.' + v.slice(2, 4);
        if (v.length >= 5) out += '.' + v.slice(4, 8);
        e.target.value = out;
        clearError(birth, errBirth);
    });

    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    if (birthPicker && birthNative) {
        birthPicker.addEventListener('click', () => {
            const current = birth.value.trim();
            const m = current.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
            if (m) {
                birthNative.value = `${m[3]}-${m[2]}-${m[1]}`;
            } else {
                birthNative.value = '';
            }

            birthNative.classList.add('is-active');

            if (typeof birthNative.showPicker === 'function') {
                try {
                    birthNative.showPicker();
                } catch (e) {
                    birthNative.click();
                }
            } else {
                birthNative.click();
            }
        });

        birthNative.addEventListener('change', () => {
            const v = birthNative.value;
            if (v) {
                const parts = v.split('-');
                if (parts.length === 3) {
                    birth.value = `${parts[2]}.${parts[1]}.${parts[0]}`;
                    clearError(birth, errBirth);
                    validateBirth();
                }
            }
            birthNative.classList.remove('is-active');
        });

        birthNative.addEventListener('blur', () => {
            birthNative.classList.remove('is-active');
        });
    }

            btn.addEventListener('click', async (e) => {
    e.preventDefault(); 

    const isLoginValid = validateLogin();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isGenderValid = validateGender();
    const isBirthValid = validateBirth();

    if (!isLoginValid || !isEmailValid || !isPasswordValid || !isGenderValid || !isBirthValid) {
        return;
    }

    const payload = {
        name: login.value.trim(),
        email: email.value.trim(),
        password: password.value,
        gender: gender.value,
        date: birth.value.trim()
    };


    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.style.opacity = '0.7';

    try {
        // console.log("🌐 Шаг 4: Отправка запроса...");
        
        const res = await fetch('http://localhost:5000/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
        }
        
        const data = await res.json();
        // console.log("📥 Шаг 5: Ответ Flask:", data);
        
        // if(data.status==='error'){
        //     alert('email уже занят')
        // }else{
        //     console.log(data);
            
        // }
        
        if (data.status === 'ok') {
            localStorage.setItem('user_role', data.role || 'user')
            btn.textContent = '✓ Успешно!';
            btn.style.background = '#00FF66';
            btn.style.opacity = '1';
            
            // ПРЯМО СЕЙЧАС выполняем переход, без setTimeout
            // console.log("🚀 Шаг 7: Переход на: " + window.location.origin + '/MAI/index/index.html');
            
            // Используем абсолютный путь вместо относительногоwindow.location.origin +
            window.location.href =  '../index/index.html';
            
            // Альтернатива - если не сработает, попробуйте:
            // window.location.replace('../index/index.html');
                
        } else {
            throw new Error(data.message || 'Ошибка данных');
        }
        
    } catch (err) {
        console.error("❌ ОШИБКА:", err);
        // alert('email уже занят');
        
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = '1';
    }
});

    if (eyeBtn) {
        eyeBtn.addEventListener('click', () => {
            const isMasked = password.classList.contains('is-masked');
            password.classList.toggle('is-masked', !isMasked);
            eyeBtn.classList.toggle('is-visible', isMasked);
            eyeBtn.setAttribute('aria-label', isMasked ? 'Скрыть пароль' : 'Показать пароль');
            password.focus();
        });
    }
});