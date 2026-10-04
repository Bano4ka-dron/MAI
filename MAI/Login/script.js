document.addEventListener('DOMContentLoaded', () => {
});

btn.addEventListener('click', async (e) => {
    e.preventDefault(); 

    const email=document.getElementById('email')
    const password=document.getElementById('password')

    const payload = {
        mail: email.value.trim(),
        pass: password.value
    };
    // console.log("📦 Шаг 3: Данные:", payload);

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.style.opacity = '0.7';

    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
        }
            
        const data = await res.json();

        
        if (data.status === 'ok') {

            localStorage.setItem('user_role', data.role || 'user')
            localStorage.setItem('user_id', data.user_id);

            btn.textContent = '✓ Успешно!';
            btn.style.background = '#00FF66';
            btn.style.opacity = '1';

            window.location.href =  '../index/index.html';
                
        } else{
            alert('Пользователь не найден')
        }
        
    } catch (err) {
        // console.error("❌ ОШИБКА:", err);
        alert('Неверная почта или пароль');
        
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = '1';
    }
});