(() => {
  'use strict';
  const pairs = [
    ['5v5 bomb defusal · runs in your browser','Обезвреживание бомбы 5 на 5 · в браузере'],
    ['GO','ВПЕРЁД'],['KNIFE','НОЖ'],['BOMB','БОМБА'],['SMOKE','ДЫМ'],['Map','Карта'],['Side','Сторона'],['Terrorists','Террористы'],['Counter-Terrorists','Спецназ'],['Counter-T','Спецназ'],['Auto','Авто'],
    ['Bot skill','Сложность ботов'],['Easy','Легко'],['Normal','Средне'],['Hard','Сложно'],['Match length','Длительность матча'],['First to 5','До 5 побед'],['First to 8','До 8 побед'],['Deploy','Начать игру'],
    ['Needs a keyboard and mouse to play. The live bot match keeps running here.','Для игры нужны клавиатура и мышь. Здесь идёт демонстрационный матч ботов.'],
    ['move · Shift walk · C / Ctrl crouch · Space jump','движение · Shift шаг · C / Ctrl присесть · Пробел прыжок'],
    ['aim · LMB fire · RMB scope / heavy stab / lob','прицел · ЛКМ огонь · ПКМ оптика / сильный удар / бросок'],
    ['primary, pistol, knife, grenades · last weapon','основное, пистолет, нож, гранаты · предыдущее оружие'],
    ['reload · buy menu · hold to plant / defuse','перезарядка · магазин · удерживать: установка / обезвреживание'],
    ['scoreboard · pause','счёт · пауза'],['Mouse','Мышь'],['Live bot match','Матч ботов в прямом эфире'],
    ['Built by Claude Opus 5.5 · own WebGL2 engine, no assets loaded','Создано Claude Opus 5.5 · собственный движок WebGL2'],
    ['Buy menu · number keys or click','Магазин · цифровые клавиши или мышь'],['Armory','Арсенал'],['Close · B','Закрыть · B'],
    ['Paused','Пауза'],['Hold the line','Держи позицию'],['Sensitivity','Чувствительность'],['Volume','Громкость'],['Resume','Продолжить'],['Leave match','Выйти из матча'],
    ['Match over','Матч завершён'],['Rematch','Новый матч'],['Main menu','Главное меню'],['Match won','Победа в матче'],['Match lost','Поражение в матче'],
    ['Breachline needs WebGL2. Try a recent desktop Chrome, Edge, Firefox or Safari.','Breachline требуется WebGL2. Откройте игру в современном браузере Chrome, Edge, Firefox или Safari.'],
    ['Sun-baked market quarter. Long A, tight B tunnels, open courtyard mid.','Рыночный квартал. Длинный проход A, узкие тоннели B и открытый двор в центре.'],
    ['Container port at dusk. Open lanes, stacked boxes, a warehouse in the middle.','Порт в сумерках. Открытые проходы, контейнеры и склад в центре.'],
    ['B · BUY MENU OPEN','B · МАГАЗИН ОТКРЫТ'],['ARMOR','БРОНЯ'],['HELMET','ШЛЕМ'],['KIT','НАБОР'],['HP','ОЗ'],
    ['Buy time is over','Время покупки закончилось'],['You carry the bomb — plant it at A or B','У вас бомба — установите её на A или B'],
    ['Enemy team eliminated','Команда противника уничтожена'],['Time ran out','Время истекло'],['Target bombed','Объект взорван'],['Bomb defused','Бомба обезврежена'],['You picked up the bomb','Вы подобрали бомбу'],
    ['Terrorists win','Террористы победили'],['Counter-Terrorists win','Спецназ победил'],['You died','Вы погибли'],['Killed by ','Вас убил '],['traded','размен'],[' HP left',' ОЗ осталось'],
    ['Player','Игрок'],['Pistols','Пистолеты'],['Rifles','Винтовки'],['SMG','Пистолеты-пулемёты'],['Gear','Снаряжение'],['Grenades','Гранаты'],['OWNED','КУПЛЕНО'],
    ['Knife','Нож'],['P9 Sidearm','Пистолет P9'],['M5 Carbine','Карабин M5'],['HE Grenade','Осколочная граната'],['Smoke Grenade','Дымовая граната'],['Kevlar Vest','Бронежилет'],['Kevlar + Helmet','Бронежилет + шлем'],['Defuse Kit','Набор сапёра'],
    ['Absorbs body damage','Защищает корпус'],['Vest + head protection','Защищает корпус и голову'],['Defuse in 5s instead of 10s','Обезвреживание за 5 с вместо 10 с'],['Frag, ~100 dmg at center','Осколочная, ~100 урона в центре'],['18s vision block','Дым на 18 секунд'],
    ['Planting','Установка'],['Defusing (kit)','Обезвреживание (набор)'],['Defusing','Обезвреживание'],['Hold E to plant','Удерживайте E для установки'],['Carry the bomb to site A or B','Доставьте бомбу на точку A или B'],['Hold E to defuse','Удерживайте E для обезвреживания'],
    ['Continue save','Продолжить сохранение'],['No save','Нет сохранения'],['Guest','Гость'],['Name','Имя'],['Password','Пароль'],['Log in','Войти'],['Register','Регистрация'],['Sign in','Вход'],['Create account','Создать аккаунт'],['Repeat password','Повторите пароль'],['Created: ','Создан: '],['Log out on other devices','Выйти на других устройствах'],['Change password','Сменить пароль'],['Current password','Текущий пароль'],['New password','Новый пароль'],['Delete account','Удалить аккаунт'],['Delete forever','Удалить навсегда'],
    ['Name: 3–24 letters, digits, _ or -. Password: 8+ characters, without the name.','Имя: 3–24 буквы, цифры, _ или -. Пароль: от 8 символов, без имени.'],
    ['Name: 3–24 letters, digits, _ or -','Имя: 3–24 буквы, цифры, _ или -'],['Name cannot mix Latin and Cyrillic','Имя не может смешивать латиницу и кириллицу'],['This name is taken','Это имя уже занято'],['Password: 8 to 128 characters','Пароль: от 8 до 128 символов'],['Password must not contain the name','Пароль не должен содержать имя'],['New password matches the old one','Новый пароль совпадает со старым'],
    ['Wrong name or password','Неверное имя или пароль'],['Wrong password','Неверный пароль'],['Too many attempts. Wait and try again','Слишком много попыток. Подождите и попробуйте снова'],['Session expired. Sign in again','Сессия истекла. Войдите снова'],['The server rejected the save','Сервер отклонил сохранение'],['Server error','Ошибка сервера'],['Server unavailable','Сервер недоступен'],
    ['Passwords do not match','Пароли не совпадают'],['Account created','Аккаунт создан'],['Password changed. Other devices were signed out','Пароль изменён. Другие устройства вышли из аккаунта'],['Account deleted','Аккаунт удалён'],['Other devices were signed out','Другие устройства вышли из аккаунта'],['No other active sign-ins','Других активных входов нет'],
    ['Cannot reach the game server','Нет связи с сервером игры'],['No server','Нет сервера'],['Profile','Профиль'],['Account','Аккаунт'],['Close','Закрыть'],['Avatar','Аватар'],['Upload photo','Загрузить фото'],['Remove photo','Убрать фото'],
    ['Accounts are unavailable: the page was opened without the game server. Run','Аккаунты недоступны: страница открыта без сервера игры. Запустите'],['and open','и откройте'],
    ['Matches','Матчи'],['Wins','Победы'],['Win rate','Доля побед'],['Kills','Убийства'],['Deaths','Смерти'],['K/D','У/С'],['File is too large','Файл слишком большой'],['Could not upload the image','Не удалось загрузить изображение'],
    ['The account, stats, avatar and server save will be deleted permanently.','Аккаунт, статистика, аватар и серверное сохранение будут удалены безвозвратно.'],
['Log out','Выйти'],['LAN multiplayer','Игра по локальной сети'],['Guest nickname','Ник гостя'],['Room code','Код комнаты'],['Create room','Создать комнату'],['Join','Подключиться'],['Save match','Сохранить матч'],
    ['Open the server address on every computer. The host creates a room; others enter the same code.','Откройте адрес сервера на всех компьютерах. Ведущий создаёт комнату, остальные вводят тот же код.'],
    ['Saved in account','Сохранено в аккаунте'],['Saved in browser','Сохранено в браузере'],['Signed in','Вход выполнен'],['Signed out','Вы вышли из аккаунта'],['Connection to host closed','Соединение с ведущим закрыто'],['Network closed','Сеть закрыта'],['Connecting to match…','Подключение к матчу…'],['You are in a network match. Press Resume.','Вы в сетевом матче. Нажмите «Продолжить».']
  ];
  const en = new Map(pairs), ru = new Map(pairs.map(([a,b]) => [b,a]));
  let lang = 'ru'; try { lang = localStorage.getItem('bl_language') || 'ru'; } catch {}
  if (!['ru','en'].includes(lang)) lang = 'ru';
  const cache = new WeakMap();
  function translate(value) {
    const map = lang === 'ru' ? en : ru;
    if (map.has(value)) return map.get(value);
    const trimmed = value.trim();
    if (map.has(trimmed)) return value.replace(trimmed, map.get(trimmed));
    if (lang === 'ru') return value
      .replace(/ROUND (\d+) · TO (\d+)/g, 'РАУНД $1 · ДО $2').replace(/Round (\d+) · Buy phase/g, 'Раунд $1 · Время покупки')
      .replace(/Round (\d+) · first to (\d+)/g, 'Раунд $1 · до $2 побед').replace(/Bomb planted at /g, 'Бомба установлена на ')
      .replace(/Spectating /g, 'Наблюдение: ').replace(/ HP · click to switch/g, ' ОЗ · нажмите для смены')
      .replace(/(Counter-Terrorists|Terrorists) take it (\d+–\d+) on /g, (_,team,score) => `${en.get(team)} побеждает ${score} на `)
      .replace(/(Enemy team eliminated|Time ran out|Target bombed|Bomb defused)/g, x => en.get(x))
      .replace(/ dmg\)/g, ' урона)').replace(/DMG (\d+) · (AUTO|SEMI) · (\d+) RDS/g, (_,d,m,n) => `УРОН ${d} · ${m === 'AUTO' ? 'АВТО' : 'ОДИН'} · ${n} ПАТР.`);
    return value;
  }
  function visit(root) {
    if (root.nodeType === 3) {
      if (!root.parentElement || root.parentElement.closest('script,style,option,input,#accountName:not(.guest),#accountTitle:not(.guest),#accountSince,#lanState,#username,#nickname,.kf span,td:first-child,#labels')) return;
      const old = cache.get(root), current = root.nodeValue;
      const source = old && current === old.output ? old.source : current;
      const output = translate(source);
      cache.set(root, { source, output }); if (current !== output) root.nodeValue = output;
    } else if (root.nodeType === 1) for (const child of root.childNodes) visit(child);
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const r of records) { if (r.type === 'characterData') visit(r.target); else for (const node of r.addedNodes) visit(node); }
    observe();
  });
  function observe() { observer.observe(document.body, { subtree: true, childList: true, characterData: true }); }
  function apply() { observer.disconnect(); document.documentElement.lang = lang; visit(document.body); observe(); }
  document.querySelector('#language').value = lang;
  document.querySelector('#language').onchange = ev => { lang = ev.target.value; try { localStorage.setItem('bl_language', lang); } catch {} apply(); };
  apply();
})();
