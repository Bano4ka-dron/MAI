from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import users_bd
from werkzeug.security import generate_password_hash, check_password_hash
import os
import uuid
import time
import shutil

# =========================================
# УВЕЛИЧИВАЕМ ТАЙМАУТЫ httpx
# =========================================
import httpx

httpx._config.DEFAULT_TIMEOUT_CONFIG = httpx.Timeout(300.0, connect=60.0)

_orig_get = httpx.get
def _patched_get(*args, **kwargs):
    if kwargs.get("timeout") is None:
        kwargs["timeout"] = 300.0
    return _orig_get(*args, **kwargs)
httpx.get = _patched_get

_orig_client_init = httpx.Client.__init__
def _patched_client_init(self, *args, **kwargs):
    if kwargs.get("timeout") is None:
        kwargs["timeout"] = httpx.Timeout(300.0, connect=60.0)
    _orig_client_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_client_init

os.environ["GRADIO_CLIENT_TIMEOUT"] = "300"


# =========================================
# Импорт gradio_client
# =========================================
try:
    from gradio_client import Client, handle_file
    GRADIO_AVAILABLE = True
except ImportError:
    GRADIO_AVAILABLE = False
    print("⚠ gradio_client не установлен. Выполните: pip install gradio_client")


# =========================================
# HF токен
# =========================================
try:
    from dotenv import load_dotenv
    _env_dir = os.path.dirname(os.path.abspath(__file__))
    _env_root = os.path.abspath(os.path.join(_env_dir, '..'))
    _env_path = os.path.join(_env_root, '.env')
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
        print(f"📄 Загружен .env из {_env_path}")
    else:
        print(f"⚠ Файл .env не найден по пути {_env_path}")
except ImportError:
    print("⚠ python-dotenv не установлен")

HF_TOKEN = os.getenv('HF_TOKEN')
if HF_TOKEN:
    print(f"✅ Hugging Face токен загружен (начинается с {HF_TOKEN[:6]}...)")
else:
    print("ℹ️  Hugging Face токен не задан (работаем без авторизации)")


app = Flask(__name__)
CORS(app)


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


# =========================================
# ПУТИ
# =========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))
UPLOADS_DIR = os.path.join(PROJECT_ROOT, 'uploads')
IMAGES_DIR = os.path.join(PROJECT_ROOT, 'images')

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

UPLOAD_FOLDER = IMAGES_DIR
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_photo(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# =========================================
# СТАТИКА
# =========================================

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)


@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(IMAGES_DIR, filename)


# =========================================
# GRADIO КЛИЕНТ (ленивый)
# Kolors Virtual Try-On — Space от Kwai-Kolors
# =========================================
_gradio_client = None
GRADIO_SPACE = "Kwai-Kolors/Kolors-Virtual-Try-On"


def get_gradio_client():
    global _gradio_client
    if _gradio_client is None:
        print(f"🔌 Подключаюсь к {GRADIO_SPACE}...")
        kwargs = {}
        if HF_TOKEN:
            kwargs["token"] = HF_TOKEN
        try:
            _gradio_client = Client(
                GRADIO_SPACE,
                httpx_kwargs={"timeout": httpx.Timeout(300.0, connect=60.0)},
                **kwargs
            )
        except TypeError:
            _gradio_client = Client(GRADIO_SPACE, **kwargs)
        print("✅ Клиент Gradio готов")
    return _gradio_client


# =========================================
# РЕГИСТРАЦИЯ / ЛОГИН
# =========================================

@app.route('/api/save', methods=['POST'])
def save_data():
    data = request.get_json()
    name = data.get('name')
    regmail = data.get('email')
    regpass = data.get('password')
    pass_hash = generate_password_hash(regpass)
    gender = data.get('gender')
    date = data.get('date')

    success = users_bd.add_user(name, regmail, pass_hash, gender, date)

    if success:
        return jsonify({"status": "ok", "message": "Регистрация успешна"})
    return jsonify({
        "status": "error",
        "message": "Ошибка БД: возможно, пользователь с таким Email или Логином уже существует"
    }), 400


@app.route('/api/login', methods=['POST'])
def login_data():
    data = request.get_json()
    mail_log = data.get('mail')
    pass_log = data.get('pass')

    if mail_log == 'admin' and pass_log == 'admin':
        return jsonify({"status": "ok", "message": "Вход выполнен", "role": "admin"}), 200

    bd_data = users_bd.get_user(mail_log)

    if bd_data:
        correct = check_password_hash(bd_data['password'], pass_log)
        if correct:
            return jsonify({
                "status": "ok",
                "message": "Вход выполнен",
                "role": "user",
                "user_id": bd_data['id']
            }), 200
        return jsonify({"status": "error 1", "message": "Неверный пароль"}), 401
    return jsonify({"status": "error", "message": "Пользователь не найден"}), 404


# =========================================
# ТОВАРЫ
# =========================================

@app.route('/api/products', methods=['GET'])
def products_data():
    return jsonify(users_bd.get_product())


@app.route('/api/admin/product', methods=['POST'])
def product_add():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "Файл картинки не найден"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"status": "error", "message": "Файл не выбран"}), 400

    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        type = request.form.get('type')
        name = request.form.get('name')
        price = request.form.get('price')
        image = f"../images/{unique_filename}"

        success = users_bd.add_product(name, type, price, image)

        if success:
            return jsonify({"status": "ok", "message": "Товар успешно добавлен"}), 200
        return jsonify({"status": "error", "message": "Ошибка при добавлении в БД"}), 500
    return jsonify({"status": "error", "message": "Недопустимый формат"}), 400


@app.route('/api/admin/products', methods=['GET'])
def get_all_products():
    return jsonify(users_bd.get_all_products())


@app.route('/api/admin/product/delete', methods=['POST'])
def delete_product():
    data = request.get_json()
    product_id = data.get('id')
    if not product_id:
        return jsonify({"status": "error", "message": "Не указан ID товара"}), 400

    success = users_bd.delete_product(product_id)
    if success:
        return jsonify({"status": "ok", "message": "Товар удален"}), 200
    return jsonify({"status": "error", "message": "Товар не найден"}), 404


# =========================================
# ИЗБРАННОЕ
# =========================================

@app.route('/api/wishlist', methods=['GET'])
def get_wishlist():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Не указан user_id"}), 400
    return jsonify(users_bd.get_user_favorites(user_id))


@app.route('/api/wishlist/toggle', methods=['POST'])
def toggle_wishlist():
    data = request.get_json()
    user_id = data.get('user_id')
    product_id = data.get('product_id')
    if not user_id or not product_id:
        return jsonify({"status": "error", "message": "Не хватает данных"}), 400

    success = users_bd.toggle_favorite(user_id, product_id)
    if success:
        return jsonify({"status": "ok", "message": "Список обновлен"}), 200
    return jsonify({"status": "error", "message": "Ошибка БД"}), 500


# =========================================
# ПАРАМЕТРЫ ПОЛЬЗОВАТЕЛЯ
# =========================================

@app.route('/api/user/data', methods=['GET', 'POST'])
def handle_user_data():
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"status": "error", "message": "Не указан user_id"}), 400
        data = users_bd.get_user_data(user_id)
        return jsonify(data if data else {}), 200

    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Не указан user_id"}), 400

    success = users_bd.save_user_data(
        user_id=user_id,
        height=data.get('height'),
        weight=data.get('weight'),
        shoe_size=data.get('shoe_size'),
        clothes_size=data.get('clothes_size')
    )
    if success:
        return jsonify({"status": "ok", "message": "Данные сохранены"}), 200
    return jsonify({"status": "error", "message": "Ошибка БД"}), 500


# =========================================
# ЗАГРУЗКА ФОТО
# =========================================

@app.route('/api/upload/photos', methods=['POST'])
def upload_photos():
    user_id = request.form.get('user_id')
    photo_index = request.form.get('photo_index')

    if not user_id or not photo_index:
        return jsonify({"status": "error", "message": "Не хватает данных"}), 400

    user_upload_dir = os.path.join(UPLOADS_DIR, f'user_{user_id}')
    os.makedirs(user_upload_dir, exist_ok=True)

    file_key = f'photo_{photo_index}'
    if file_key not in request.files:
        return jsonify({"status": "error", "message": f"Файл {file_key} не найден"}), 400

    file = request.files[file_key]
    if file.filename == '':
        return jsonify({"status": "error", "message": "Файл не выбран"}), 400

    if not allowed_photo(file.filename):
        return jsonify({"status": "error", "message": f"Недопустимый формат: {file.filename}"}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(user_upload_dir, unique_filename)
    file.save(filepath)

    relative_path = f"uploads/user_{user_id}/{unique_filename}"
    success = users_bd.update_user_photo(user_id, int(photo_index), relative_path)

    if success:
        return jsonify({"status": "ok", "message": "Фото сохранено", "path": relative_path}), 200
    return jsonify({"status": "error", "message": "Ошибка БД"}), 500


@app.route('/api/user/photos', methods=['GET'])
def get_user_photos_endpoint():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Не указан user_id"}), 400
    return jsonify(users_bd.get_user_photos(user_id)), 200


# =========================================
# ВИРТУАЛЬНАЯ ПРИМЕРКА (Kolors Virtual Try-On)
# =========================================

def _extract_image_path(outputs):
    """Достаёт путь к изображению из ответа Gradio."""
    if outputs is None:
        return None

    if isinstance(outputs, str):
        return outputs

    if isinstance(outputs, (list, tuple)):
        for item in outputs:
            if isinstance(item, str):
                return item
            if isinstance(item, dict):
                if "path" in item:
                    return item["path"]
                if "url" in item:
                    return item["url"]
        if outputs:
            return _extract_image_path(outputs[0])

    if isinstance(outputs, dict):
        if "path" in outputs:
            return outputs["path"]
        if "url" in outputs:
            return outputs["url"]

    return None


def _wait_job_done(job, timeout_sec=300, check_every=1.0):
    """Ждёт завершения Gradio-job и возвращает ПОСЛЕДНИЙ эмит."""
    start = time.time()
    last_outputs = None

    while True:
        elapsed = time.time() - start

        if elapsed > timeout_sec:
            raise TimeoutError(f"Задача не завершилась за {timeout_sec} сек")

        if job.done():
            try:
                outputs = job.outputs()
                if outputs:
                    last_outputs = outputs[-1]
            except Exception as e:
                print(f"⚠ Ошибка получения outputs: {e}")
            break

        if int(elapsed) % 10 == 0 and int(elapsed) > 0:
            print(f"⏳ Ждём Space... прошло {int(elapsed)} сек")

        time.sleep(check_every)

    return last_outputs


def _run_kolors(client, person_path, garment_path):
    """
    Один вызов Kolors Virtual Try-On.
    Возвращает путь к готовой картинке.
    """
    print(f"📤 Отправляю в Kolors: {os.path.basename(person_path)} + {os.path.basename(garment_path)}")

    # Kolors принимает два изображения: человека и одежды, + seed
    result = client.predict(
        human_image=handle_file(person_path),
        garment_image=handle_file(garment_path),
        seed=42,
        api_name="/submit"
    )

    print(f"📥 Kolors вернул: {type(result).__name__}")

    result_path = _extract_image_path(result)

    if not result_path:
        raise ValueError(f"Kolors вернул пустой результат: {result}")

    if not os.path.exists(result_path):
        if isinstance(result_path, str) and result_path.startswith("http"):
            print("🌐 Скачиваю результат по URL...")
            r = httpx.get(result_path, timeout=60.0)
            if r.status_code == 200:
                tmp_path = os.path.join(UPLOADS_DIR, f"tmp_{uuid.uuid4().hex}.png")
                with open(tmp_path, "wb") as f:
                    f.write(r.content)
                return tmp_path
            raise ValueError(f"Не удалось скачать: HTTP {r.status_code}")
        raise ValueError(f"Файл не найден: {result_path}")

    return result_path


def _generate_tryon_internal(user_id, source_photo, product_ids):
    """
    Возвращает (success, result_path, error).
    Kolors примеряет по одному предмету — если несколько, делаем последовательно.
    """
    if not GRADIO_AVAILABLE:
        return False, None, "gradio_client не установлен"

    person_path = os.path.join(PROJECT_ROOT, source_photo)
    if not os.path.exists(person_path):
        return False, None, f"Фото человека не найдено: {person_path}"

    # Собираем товары
    products = []
    for pid in product_ids:
        product = users_bd.get_product_by_id(pid)
        if product and product.get('image'):
            rel = product['image'].replace('../', '')
            full_path = os.path.join(PROJECT_ROOT, rel)
            if not os.path.exists(full_path):
                return False, None, f"Файл одежды не найден: {full_path}"
            products.append({
                "path": full_path,
                "name": product.get('name') or "clothing item",
                "type": product.get('type') or "clothing"
            })

    if not products:
        return False, None, "Нет товаров для примерки"

    try:
        client = get_gradio_client()
    except Exception as e:
        return False, None, f"Не удалось создать клиент: {type(e).__name__}: {e}"

    # Примеряем по очереди
    current_person = person_path
    saved_results = []

    try:
        for i, product in enumerate(products, 1):
            print(f"👕 Примеряю {i}/{len(products)}: {product['name']} ({product['type']})")

            result_path = _run_kolors(
                client=client,
                person_path=current_person,
                garment_path=product['path']
            )

            user_result_dir = os.path.join(UPLOADS_DIR, f'user_{user_id}')
            os.makedirs(user_result_dir, exist_ok=True)

            step_filename = f"gen_{uuid.uuid4().hex}.png"
            step_final = os.path.join(user_result_dir, step_filename)
            shutil.copy(result_path, step_final)

            saved_results.append(step_final)
            current_person = step_final

            print(f"💾 Шаг {i} сохранён: {step_filename}")

        relative_result = f"uploads/user_{user_id}/{os.path.basename(saved_results[-1])}"
        return True, relative_result, None

    except Exception as e:
        import traceback
        traceback.print_exc()
        return False, None, f"{type(e).__name__}: {e}"


@app.route('/api/generate/tryon', methods=['POST'])
def generate_tryon():
    data = request.get_json()
    user_id = data.get('user_id')
    source_photo = data.get('source_photo')
    product_ids = data.get('product_ids', [])

    if not user_id or not source_photo or not product_ids:
        return jsonify({"status": "error", "message": "Не хватает данных"}), 400

    if not GRADIO_AVAILABLE:
        return jsonify({
            "status": "error",
            "message": "gradio_client не установлен"
        }), 500

    MAX_ATTEMPTS = 2
    last_error = "Неизвестная ошибка"

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"🔄 Попытка {attempt}/{MAX_ATTEMPTS} для user_id={user_id}")

        success, result_path, error = _generate_tryon_internal(
            user_id=user_id,
            source_photo=source_photo,
            product_ids=product_ids
        )

        if success:
            gen_id = users_bd.save_generation(
                user_id=user_id,
                source_photo=source_photo,
                product_ids=product_ids,
                result_path=result_path
            )

            if gen_id:
                print(f"✅ Примерка успешна (id={gen_id})")
                return jsonify({
                    "status": "ok",
                    "message": "Примерка выполнена",
                    "generation_id": gen_id,
                    "result": result_path
                }), 200
            return jsonify({"status": "error", "message": "Не удалось сохранить в БД"}), 500

        last_error = error
        print(f"❌ Попытка {attempt} провалилась: {error}")

        if attempt < MAX_ATTEMPTS:
            print("⏸ Пауза 3 сек...")
            time.sleep(3)

    return jsonify({
        "status": "error",
        "message": f"Не удалось за {MAX_ATTEMPTS} попытки",
        "details": last_error
    }), 500


# =========================================
# СОХРАНЁННЫЕ ГЕНЕРАЦИИ
# =========================================

@app.route('/api/generations', methods=['GET'])
def get_generations():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Не указан user_id"}), 400
    return jsonify(users_bd.get_user_generations(user_id)), 200


@app.route('/api/generations/delete', methods=['POST'])
def delete_generation():
    data = request.get_json()
    gen_id = data.get('id')
    if not gen_id:
        return jsonify({"status": "error", "message": "Не указан ID"}), 400

    success = users_bd.delete_generation(gen_id)
    if success:
        return jsonify({"status": "ok", "message": "Удалено"}), 200
    return jsonify({"status": "error", "message": "Не найдено"}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)