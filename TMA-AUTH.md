# TMA (Telegram Mini App) Authorization

## Настройка

1. **Создайте Telegram бота:**
   - Напишите @BotFather в Telegram
   - Создайте нового бота командой `/newbot`
   - Получите токен бота

2. **Настройте переменные окружения:**

   ```bash
   cp .env.example .env
   ```

   Заполните `.env` файл:

   ```env
   BOT_TOKEN="your-telegram-bot-token"
   DATABASE_URL="your-database-url"
   JWT_ACCESS_SECRET="your-jwt-secret"
   JWT_REFRESH_SECRET="your-jwt-refresh-secret"
   ```

3. **Настройте Mini App в BotFather:**
   - Отправьте команду `/newapp` боту @BotFather
   - Выберите вашего бота
   - Укажите URL вашего frontend приложения
   - Загрузите иконку (необязательно)

## API Endpoints

### POST /auth/tma

Авторизация через Telegram Mini App

**Request Body:**

```json
{
  "initData": "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1662771648&hash=c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2"
}
```

**Response:**

```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "uuid",
    "telegramId": 279058397,
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe"
  }
}
```

## Как это работает

1. **Frontend** получает `initData` из Telegram WebApp SDK
2. **Frontend** отправляет `initData` на `/auth/tma`
3. **Backend** валидирует данные с помощью bot token
4. **Backend** проверяет свежесть данных (не старше 1 дня)
5. **Backend** создает или находит пользователя по `telegramId`
6. **Backend** возвращает JWT токены

## Безопасность

- Все данные валидируются через HMAC-SHA256 с использованием bot token
- Данные проверяются на свежесть (не старше 24 часов)
- Создается уникальный пользователь для каждого Telegram ID
- Временный email генерируется автоматически

## Тестирование

```bash
node test-tma-auth.js
```
