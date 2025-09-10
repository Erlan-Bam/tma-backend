import { TelegramAuthUtils } from '../src/shared/utils/telegram-auth.utils';

// Пример использования TMA авторизации
const exampleInitData =
  'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1662771648&hash=c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2';

console.log('=== TMA Auth Test ===');

// Парсинг данных
const parsedData = TelegramAuthUtils.parseInitData(exampleInitData);
console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

// Проверка свежести данных
if (parsedData.auth_date) {
  const isFresh = TelegramAuthUtils.isDataFresh(parsedData.auth_date);
  console.log('Data is fresh:', isFresh);
}

console.log('=== End Test ===');
