import sqlite3
from contextlib import closing
import os
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, '..', 'users_database.db')


def add_user(name, regmail, pass_hash, gender, date):
    with closing(sqlite3.connect(DB_NAME)) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (name, password, email, gender, date) VALUES (?, ?, ?, ?, ?)",
                (name, pass_hash, regmail, gender, date)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False


def get_user(email):
    with closing(sqlite3.connect(DB_NAME)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, password, email FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        return dict(user) if user else None


def get_product():
    conn = sqlite3.connect('users_database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM catalog")
    rows = cursor.fetchall()
    product = []
    for row in rows:
        product.append({
            'id': row[0], 'type': row[1], 'name': row[2], 'price': row[3], 'image': row[4]
        })
    conn.close()
    return product


def get_product_by_id(product_id):
    """Получить один товар по ID"""
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, type, name, price, image FROM catalog WHERE id = ?", (product_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"Ошибка get_product_by_id: {e}")
        return None


def add_product(name, type, price, image):
    try:
        conn = sqlite3.connect('users_database.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO catalog (name, type, price, image) VALUES (?,?,?,?)",
                       (name, type, price, image))
        conn.commit()
        conn.close()
        return True
    except:
        print(f"Ошибка добавления товара")
        return False


def delete_product(product_id):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT image FROM catalog WHERE id = ?", (product_id,))
            row = cursor.fetchone()
            if row:
                cursor.execute("DELETE FROM catalog WHERE id = ?", (product_id,))
                conn.commit()
                image_path = row[0]
                if image_path:
                    real_path = image_path.replace('../', '')
                    if os.path.exists(real_path):
                        os.remove(real_path)
                        print(f"Удален файл: {real_path}")
                return True
            return False
    except Exception as e:
        print(f"Ошибка удаления товара: {e}")
        return False


def get_all_products():
    with closing(sqlite3.connect(DB_NAME)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, type, name, price, image FROM catalog ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]


def toggle_favorite(user_id, product_id):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?",
                           (user_id, product_id))
            exists = cursor.fetchone()
            if exists:
                cursor.execute("DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?",
                               (user_id, product_id))
            else:
                cursor.execute("INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)",
                               (user_id, product_id))
            conn.commit()
            return True
    except Exception as e:
        print(f"Ошибка toggle_favorite: {e}")
        return False


def get_user_favorites(user_id):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT c.id, c.type, c.name, c.price, c.image
                FROM catalog c
                INNER JOIN user_favorites f ON c.id = f.product_id
                WHERE f.user_id = ?
                ORDER BY f.id DESC
            """, (user_id,))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"Ошибка get_user_favorites: {e}")
        return []


def save_user_data(user_id, height, weight, shoe_size, clothes_size):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_profiles (user_id, height, weight, shoe_size, clothes_size)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                height=excluded.height, weight=excluded.weight,
                shoe_size=excluded.shoe_size, clothes_size=excluded.clothes_size
            """, (user_id, height, weight, shoe_size, clothes_size))
            conn.commit()
            return True
    except Exception as e:
        print(f"Ошибка сохранения данных пользователя: {e}")
        return False


def get_user_data(user_id):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT height, weight, shoe_size, clothes_size FROM user_profiles WHERE user_id = ?",
                           (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"Ошибка получения данных пользователя: {e}")
        return None


def update_user_photo(user_id, photo_index, photo_path):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM user_photos WHERE user_id = ? AND photo_index = ?",
                           (user_id, photo_index))
            existing = cursor.fetchone()
            if existing:
                cursor.execute("UPDATE user_photos SET photo_path = ? WHERE user_id = ? AND photo_index = ?",
                               (photo_path, user_id, photo_index))
            else:
                cursor.execute("INSERT INTO user_photos (user_id, photo_index, photo_path) VALUES (?, ?, ?)",
                               (user_id, photo_index, photo_path))
            conn.commit()
            return True
    except Exception as e:
        print(f"Ошибка update_user_photo: {e}")
        return False


def get_user_photos(user_id):
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT photo_path FROM user_photos WHERE user_id = ? ORDER BY photo_index ASC",
                           (user_id,))
            return [row[0] for row in cursor.fetchall()]
    except Exception as e:
        print(f"Ошибка get_user_photos: {e}")
        return []


# =========================================
# ГЕНЕРАЦИИ (примерка)
# =========================================

def save_generation(user_id, source_photo, product_ids, result_path):
    """Сохраняет результат примерки в БД и возвращает ID записи."""
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            # product_ids — список, сохраняем как строку через запятую
            product_ids_str = ",".join(str(pid) for pid in product_ids)

            cursor.execute("""
                INSERT INTO generations (user_id, source_photo, product_ids, result_path)
                VALUES (?, ?, ?, ?)
            """, (user_id, source_photo, product_ids_str, result_path))

            conn.commit()
            return cursor.lastrowid
    except Exception as e:
        print(f"Ошибка save_generation: {e}")
        return None


def get_user_generations(user_id):
    """Возвращает все генерации пользователя (для страницы 'Сохранённые')."""
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, source_photo, product_ids, result_path, created_at
                FROM generations
                WHERE user_id = ?
                ORDER BY id DESC
            """, (user_id,))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"Ошибка get_user_generations: {e}")
        return []


def delete_generation(gen_id):
    """Удаляет генерацию по ID (вместе с файлом)."""
    try:
        with closing(sqlite3.connect(DB_NAME)) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT result_path FROM generations WHERE id = ?", (gen_id,))
            row = cursor.fetchone()
            if row:
                result_path = row[0]
                cursor.execute("DELETE FROM generations WHERE id = ?", (gen_id,))
                conn.commit()
                # Удаляем файл с диска
                if result_path:
                    real_path = result_path  # уже "uploads/user_X/xxx.png"
                    if os.path.exists(real_path):
                        try:
                            os.remove(real_path)
                            print(f"Удалён файл генерации: {real_path}")
                        except Exception as e:
                            print(f"Не удалось удалить {real_path}: {e}")
                return True
            return False
    except Exception as e:
        print(f"Ошибка delete_generation: {e}")
        return False


def init_db():
    """Создать таблицы, если их нет, и мигрировать user_photos при необходимости."""
    with closing(sqlite3.connect(DB_NAME)) as conn:
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                gender TEXT,
                date DATE
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                price INTEGER,
                image TEXT NOT NULL UNIQUE
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                UNIQUE(user_id, product_id) ON CONFLICT REPLACE
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                height INTEGER,
                weight INTEGER,
                shoe_size INTEGER,
                clothes_size TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                photo_index INTEGER NOT NULL,
                photo_path TEXT NOT NULL,
                UNIQUE(user_id, photo_index)
            )
        ''')

        # --- НОВАЯ ТАБЛИЦА: generations ---
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS generations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                source_photo TEXT NOT NULL,
                product_ids TEXT NOT NULL,
                result_path TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # --- Миграция user_photos ---
        cursor.execute("PRAGMA table_info(user_photos)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'photo_index' not in columns:
            print("⚠ Миграция user_photos: добавляю колонку photo_index...")
            cursor.execute("ALTER TABLE user_photos RENAME TO user_photos_old")
            cursor.execute('''
                CREATE TABLE user_photos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    photo_index INTEGER NOT NULL,
                    photo_path TEXT NOT NULL,
                    UNIQUE(user_id, photo_index)
                )
            ''')
            try:
                cursor.execute('''
                    INSERT INTO user_photos (user_id, photo_index, photo_path)
                    SELECT user_id,
                           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id),
                           photo_path
                    FROM user_photos_old
                ''')
            except sqlite3.OperationalError:
                cursor.execute("SELECT id, user_id, photo_path FROM user_photos_old ORDER BY user_id, id")
                rows = cursor.fetchall()
                current_user = None
                idx = 0
                for row in rows:
                    _, uid, path = row
                    if uid != current_user:
                        current_user = uid
                        idx = 1
                    else:
                        idx += 1
                    cursor.execute(
                        "INSERT INTO user_photos (user_id, photo_index, photo_path) VALUES (?, ?, ?)",
                        (uid, idx, path)
                    )
            cursor.execute("DROP TABLE user_photos_old")
            print("✅ Миграция user_photos завершена.")

        conn.commit()


init_db()