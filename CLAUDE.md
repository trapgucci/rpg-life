# RPG Life — правила для Claude Code

## Хранение данных
- НИКОГДА не использовать localStorage напрямую
- Для всех данных использовать `vaultStorage` из `src/lib/vaultStorage.ts`
- Для медиафайлов (фото, изображения) использовать `vaultStorage.saveMedia()`
- Для чтения/записи данных использовать `vaultStorage.read()` / `vaultStorage.write()`

## Архитектура
- Данные хранятся в файлах на диске через Electron IPC
- В браузере (dev режим) автоматически падает на localStorage — это нормально
- Новые типы данных добавлять в `src/types/domain.ts`
- Новые срезы стейта добавлять в `useRpgStore.ts` и в `VAULT_FILES` в `vaultStorage.ts`

## Стек
- React + TypeScript + Tailwind CSS
- Zustand для стейта
- Electron для десктопа
- Язык интерфейса: русский