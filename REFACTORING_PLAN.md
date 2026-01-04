# План реорганизации кода игры

## Текущая проблема
Файл `main.ts` содержит более 2600 строк кода со смешанными системами:
- Инициализация Three.js
- Инвентарь и UI
- Крафтинг
- CLI
- Физика игрока
- Взаимодействие с блоками
- Комбат
- Здоровье
- Мобильные контроллы
- Меню
- Игровой цикл

## Предлагаемая структура

```
src/
├── core/                    # Ядро игры
│   ├── Game.ts             # Главный класс игры (координация всех систем)
│   ├── GameState.ts        # Управление состоянием игры (paused, started, menus)
│   └── Renderer.ts         # Инициализация Three.js (scene, camera, renderer, controls)
│
├── player/                  # Системы игрока
│   ├── Player.ts           # Класс игрока (движение, физика, коллизии)
│   ├── PlayerPhysics.ts    # Физика и движение игрока
│   ├── PlayerCombat.ts     # Комбат система (атака, урон)
│   └── PlayerHealth.ts     # Здоровье игрока (HP, respawn, эффекты)
│
├── inventory/               # Инвентарь
│   ├── Inventory.ts        # Класс инвентаря (данные, логика слотов)
│   ├── InventoryUI.ts      # UI инвентаря (hotbar, grid, визуализация)
│   ├── DragDrop.ts         # Drag & Drop система
│   └── SlotRenderer.ts     # Визуализация слотов (иконки, текстурки)
│
├── crafting/                # Крафтинг
│   ├── CraftingSystem.ts   # Логика крафта (проверка рецептов)
│   ├── CraftingUI.ts       # UI крафта (grid, result slot)
│   └── MobileCraftingUI.ts # Мобильный UI крафта (список рецептов)
│
├── blocks/                  # Работа с блоками
│   ├── BlockInteraction.ts # Взаимодействие (размещение, разрушение)
│   ├── BlockBreaking.ts    # Система разрушения блоков (crack texture, прогресс)
│   └── BlockCursor.ts      # Курсор выбора блока
│
├── ui/                      # UI компоненты
│   ├── CLI.ts              # Командная строка
│   ├── Menus.ts            # Меню (main, pause, settings)
│   ├── HealthBar.ts        # Полоска здоровья
│   └── HotbarLabel.ts      # Лейбл hotbar
│
├── mobile/                  # Мобильные контроллы
│   ├── MobileControls.ts   # Джойстик и кнопки
│   └── TouchHandlers.ts    # Touch события для мобильных
│
├── constants/               # Константы
│   ├── BlockNames.ts       # Названия блоков (локализация)
│   └── GameConstants.ts    # Игровые константы (GRAVITY, JUMP_HEIGHT и т.д.)
│
└── utils/                   # Утилиты
    ├── BlockColors.ts      # Функция getBlockColor
    └── ItemMap.ts          # Маппинг предметов для CLI
```

## Детальный план переноса

### 1. Константы и конфигурация

**Файлы:**
- `constants/GameConstants.ts` - физические константы (GRAVITY, JUMP_HEIGHT, ATTACK_RANGE и т.д.)
- `constants/BlockNames.ts` - BLOCK_NAMES, ITEM_MAP для CLI
- `utils/BlockColors.ts` - функция getBlockColor

**Что перенести из main.ts:**
- Строки 116-118 (GRAVITY, JUMP_HEIGHT, JUMP_IMPULSE)
- Строки 207-225 (BLOCK_NAMES)
- Строки 305-323 (ITEM_MAP)
- Строки 392-403 (getBlockColor)
- Строки 1616-1620 (ATTACK_RANGE, PUNCH_DAMAGE, ATTACK_COOLDOWN)
- Строки 1760-1762 (playerHalfWidth, playerHeight, eyeHeight)

### 2. Ядро игры

**Файл: `core/Renderer.ts`**
- Инициализация scene, camera, uiScene, uiCamera, renderer
- Настройка renderer (antialias, pixelRatio, shadows)
- Window resize handler
- Экспорт готовых объектов

**Файл: `core/GameState.ts`**
- Переменные: isPaused, isGameStarted, previousMenu
- Функции: showMainMenu, showPauseMenu, showSettingsMenu, hideSettingsMenu, togglePauseMenu
- Управление состоянием игры

**Файл: `core/Game.ts`**
- Главный класс, координирующий все системы
- Метод start(), update(), render()
- Инициализация всех подсистем

### 3. Системы игрока

**Файл: `player/PlayerPhysics.ts`**
- Класс PlayerPhysics
- Переменные: moveForward, moveBackward, moveLeft, moveRight, isOnGround, velocity
- Функции: checkCollision, updateMovement
- Keyboard handlers для движения

**Файл: `player/PlayerCombat.ts`**
- Класс PlayerCombat
- Функции: performAttack, calculateDamage
- Переменные: lastPlayerAttackTime, isAttackPressed
- Логика атаки по мобам

**Файл: `player/PlayerHealth.ts`**
- Класс PlayerHealth
- Переменные: playerHP, isInvulnerable
- Функции: takeDamage, respawn, updateHealthUI
- Эффекты (красный flash, camera shake)

**Файл: `player/Player.ts`**
- Главный класс игрока
- Объединяет Physics, Combat, Health
- Координация всех систем игрока

### 4. Инвентарь

**Файл: `inventory/Inventory.ts`**
- Класс Inventory
- Данные: inventorySlots (36 слотов), selectedSlot
- Функции: addItem, removeItem, getSlot, setSlot
- Базовые операции с инвентарем

**Файл: `inventory/DragDrop.ts`**
- Класс DragDrop
- Состояние: draggedItem, touchStartSlotIndex
- Функции: updateDragIcon, handleDragStart, handleDragEnd
- Mouse и Touch события для drag & drop

**Файл: `inventory/SlotRenderer.ts`**
- Функции для визуализации слотов
- updateSlotVisuals, getBlockColor (используется из utils)
- Логика отображения иконок и текстур

**Файл: `inventory/InventoryUI.ts`**
- Класс InventoryUI
- Элементы UI: hotbarContainer, inventoryGrid, inventoryMenu, tooltip
- Функции: initInventoryUI, refreshInventoryUI, toggleInventory
- initSlotElement, handleSlotClick
- Hotbar change handlers (wheel, keyboard 1-9)

### 5. Крафтинг

**Файл: `crafting/CraftingSystem.ts`**
- Класс CraftingSystem
- Данные: craftingSlots, craftingResult, isCraftingTable
- Функции: checkRecipes, consumeIngredients
- Логика проверки рецептов (shaped, shapeless)

**Файл: `crafting/CraftingUI.ts`**
- Класс CraftingUI
- Функции: initCraftingUI, updateCraftingGridSize, updateCraftingVisuals
- handleCraftSlotClick, handleResultClick
- UI для десктопа (2x2 и 3x3 grid)

**Файл: `crafting/MobileCraftingUI.ts`**
- Класс MobileCraftingUI
- Функция: updateMobileCraftingList
- Мобильный список рецептов

### 6. Работа с блоками

**Файл: `blocks/BlockBreaking.ts`**
- Класс BlockBreaking
- Создание crack texture и mesh
- Функции: startBreaking, updateBreaking
- Состояние: isBreaking, breakStartTime, currentBreakBlock

**Файл: `blocks/BlockCursor.ts`**
- Класс BlockCursor
- cursorMesh и его обновление
- Raycasting для выделения блока

**Файл: `blocks/BlockInteraction.ts`**
- Класс BlockInteraction
- Функции: performInteract (размещение блоков)
- Логика взаимодействия с блоками (crafting table, place block)

### 7. UI компоненты

**Файл: `ui/CLI.ts`**
- Класс CLI
- Элементы: cliContainer, cliInput
- Функции: toggleCLI, handleCommand
- Команда /give и другие

**Файл: `ui/Menus.ts`**
- Класс Menus
- Элементы: mainMenu, pauseMenu, settingsMenu, кнопки
- Функции управления меню
- Settings handlers (shadows, clouds)

**Файл: `ui/HealthBar.ts`**
- Класс HealthBar
- Инициализация и обновление health bar
- Метод updateHealthUI

**Файл: `ui/HotbarLabel.ts`**
- Класс HotbarLabel
- Функция showHotbarLabel
- Таймаут для скрытия

### 8. Мобильные контроллы

**Файл: `mobile/MobileControls.ts`**
- Класс MobileControls
- Джойстик (joystickZone, joystickStick)
- Кнопки (jump, attack, place, inv, menu)
- Touch handlers для джойстика и кнопок

**Файл: `mobile/TouchHandlers.ts`**
- Обработчики touch событий для камеры
- Look controls (перемещение камеры жестами)

### 9. Главный файл (main.ts)

**После реорганизации `main.ts` должен содержать:**
- Импорты всех систем
- Инициализацию Game класса
- Запуск игрового цикла
- Минимум кода (~100-200 строк)

## Порядок выполнения реорганизации

1. **Шаг 1: Константы** (самый простой)
   - Создать constants/ и utils/
   - Перенести константы и утилиты
   - Обновить импорты в main.ts

2. **Шаг 2: UI компоненты**
   - Создать ui/
   - Перенести CLI, Menus, HealthBar, HotbarLabel
   - Постепенно подключать к main.ts

3. **Шаг 3: Системы игрока**
   - Создать player/
   - Перенести физику, комбат, здоровье
   - Создать класс Player

4. **Шаг 4: Инвентарь**
   - Создать inventory/
   - Перенести Inventory, InventoryUI, DragDrop
   - Проверить интеграцию

5. **Шаг 5: Крафтинг**
   - Создать crafting/
   - Перенести системы крафта
   - Проверить работу

6. **Шаг 6: Блоки**
   - Создать blocks/
   - Перенести взаимодействие с блоками
   - Проверить размещение и разрушение

7. **Шаг 7: Мобильные контроллы**
   - Создать mobile/
   - Перенести контроллы
   - Проверить на мобильных устройствах

8. **Шаг 8: Ядро**
   - Создать core/
   - Создать класс Game
   - Рефакторинг main.ts до минимума

9. **Шаг 9: Финальная проверка**
   - Тестирование всех систем
   - Исправление багов
   - Оптимизация импортов

## Важные замечания

1. **Зависимости между системами:**
   - Player зависит от World, Environment
   - Inventory зависит от World (для item entities)
   - Crafting зависит от Inventory
   - BlockInteraction зависит от Inventory и World
   - Все системы зависят от Renderer (scene, camera)

2. **Глобальные переменные:**
   - Некоторые переменные должны остаться в Game классе (world, entities, mobManager)
   - Передавать через конструкторы или через Game instance

3. **Event handlers:**
   - Многие event handlers нужно будет передавать через классы
   - Использовать методы классов вместо глобальных функций

4. **Текстуры:**
   - TOOL_TEXTURES должен быть в отдельном файле или в Game
   - Передавать в системы, которым нужен доступ

5. **Тестирование:**
   - После каждого шага тестировать игру
   - Убедиться, что ничего не сломалось
   - Коммитить изменения после каждого успешного шага

## Ожидаемый результат

После реорганизации:
- `main.ts`: ~100-200 строк (только инициализация Game)
- Каждая система в отдельном файле/папке
- Легко найти нужный код
- Легко добавлять новые функции
- Легко тестировать отдельные системы
- Код более читаемый и поддерживаемый

