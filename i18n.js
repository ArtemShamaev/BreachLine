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
    ['Mode','Режим'],['Bomb defusal','Закладка бомбы'],['Elimination','Ликвидация'],['Team deathmatch','Командный бой'],['Arms race','Гонка вооружений'],
    ['Plant or defuse the bomb. Buy between rounds.','Заложите или обезвредьте бомбу. Покупки между раундами.'],
    ['Rounds without a bomb: the last team standing wins.','Раунды без бомбы: побеждает команда, оставшаяся в живых.'],
    ['Respawn after 3 s, pick any gun, first team to the kill limit wins.','Возрождение через 3 с, любое оружие, побеждает команда, первой набравшая лимит убийств.'],
    ['Every kill swaps your gun for the next one. Finish with a knife kill.','Каждое убийство меняет оружие на следующее. Финал — убийство ножом.'],
    ['40 kills','40 убийств'],['75 kills','75 убийств'],['Short · 6 guns','Коротко · 6 стволов'],['Full · 12 guns','Полностью · 12 стволов'],
    ['Arctic research outpost. Radar yard at A, hangar at B, a frozen courtyard between.','Полярная станция. Двор с радаром на A, ангар на B, замёрзший двор между ними.'],
    ['Downtown after dark. Street-lit crossings, plazas at both ends, no straight shot down the avenue.','Ночной центр города. Освещённые перекрёстки, площади по краям, проспект не простреливается насквозь.'],
    ['Overgrown ruins. A pillared courtyard at A, a sunken plaza at B, a maze of broken walls mid.','Заросшие руины. Двор с колоннами на A, площадь на B, лабиринт разрушенных стен в центре.'],
    ['Steel works. Furnace hall at A, loading dock at B, conveyor lines through the middle.','Сталелитейный завод. Печной цех на A, погрузочная площадка на B, конвейеры в центре.'],
    ['Red-rock canyon. Two long sniper lanes and a rocky gorge in between.','Каньон из красного камня. Две длинные снайперские линии и ущелье между ними.'],
    ['Freight yard at sunset. Rows of wagons, a goods shed at A, an open loading area at B.','Товарная станция на закате. Ряды вагонов, склад на A, открытая погрузочная площадка на B.'],
    ['Close quarters under floodlights. Tight corridors, two vaults, no room for a sniper.','Ближний бой под прожекторами. Узкие коридоры, два хранилища, снайперу негде развернуться.'],
    ['Mountain hamlet in winter. Fight through the houses to the chapel square or the old barn.','Горная деревня зимой. Бой через дома к площади у часовни или к старому амбару.'],
    ['Heavy','Тяжёлое'],['RL-7 Rocket Launcher','Ракетница RL-7'],['Viper Auto','Автопистолет Viper'],['Wasp PDW','ПП Wasp'],['Breaker 12','Дробовик Breaker 12'],['HMG-90','Пулемёт HMG-90'],['Marksman DMR','Винтовка DMR'],
    ['Flashbang','Светошумовая граната'],['Incendiary','Зажигательная граната'],['Blinds anyone looking at it','Ослепляет всех, кто на неё смотрит'],['7s fire, ~32 dmg/s, smoke puts it out','Огонь 7 с, ~32 урона/с, гаснет в дыму'],
    ['No shop in arms race','В гонке вооружений нет магазина'],['Arms race · every kill gives the next gun','Гонка вооружений · каждое убийство даёт следующее оружие'],
    ['Sudden death · next kill wins','Овертайм · следующее убийство решает'],['Kill limit reached','Достигнут лимит убийств'],['Time limit reached','Время матча истекло'],['Arms race completed','Гонка вооружений пройдена'],
    ['SPAWN SHIELD','ЗАЩИТА ПОСЛЕ ВОЗРОЖДЕНИЯ'],['FLASH','СВЕТОШУМ.'],['FIRE','ОГОНЬ'],
    ['Multiplayer','Мультиплеер'],['Leaderboard','Рейтинг'],['Settings','Настройки'],['What’s new in 2.2','Что нового в 2.2'],['Version 2.2 · Season 1','Версия 2.2 · Сезон 1'],['What’s new','Что нового'],['Play','Играть'],
    ['Ranks and experience.','Звания и опыт.'],['Every finished match gives experience: 50 for playing, 150 for a win, 10 per kill. Ten ranks from Recruit to General; your rank is on the profile button.','Каждый доигранный матч даёт опыт: 50 за участие, 150 за победу, 10 за убийство. Десять званий от Рекрута до Генерала; ваше звание — на кнопке профиля.'],
    ['Leaderboard.','Рейтинг.'],['The best players by experience, wins and kills — the Leaderboard button in the menu.','Лучшие игроки по опыту, победам и убийствам — кнопка «Рейтинг» в меню.'],
    ['RL-7 rocket launcher.','Ракетница RL-7.'],['In the Heavy section of the shop and in arms race: a slow rocket with a big blast. Mind your own feet.','В разделе «Тяжёлое» магазина и в гонке вооружений: медленная ракета с большим взрывом. Не стреляйте себе под ноги.'],
    ['Smarter bots.','Умнее боты.'],['They buy and throw grenades: smokes to cover a site, flashes before a peek, frags at a target in sight, fire on a planted bomb.','Покупают и бросают гранаты: дым на точку при заходе, светошумовые перед выходом из-за угла, осколочные по видимой цели, огонь на заложенную бомбу.'],
    ['Settings.','Настройки.'],['Field of view, crosshair colour, size and centre dot, graphics quality for weak devices, FPS counter.','Поле зрения, цвет, размер и точка прицела, качество графики для слабых устройств, счётчик FPS.'],
    ['Phones and tablets.','Телефоны и планшеты.'],['Touch controls turn on by themselves: a stick for the left thumb, drag to look, buttons for the rest.','Сенсорное управление включается само: джойстик под левый палец, обзор свайпом, кнопки для остального.'],['Touch controls: left thumb moves, right thumb looks, buttons on the right. A keyboard and mouse also work.','Сенсорное управление: левый палец — движение, правый — обзор, кнопки справа. Клавиатура и мышь тоже работают.'],
    ['JUMP','ПРЫЖОК'],['DUCK','ПРИСЕСТЬ'],['SCOPE','ОПТИКА'],['RELOAD','ПЕРЕЗАР.'],['USE','ДЕЙСТВ.'],['SWAP','СМЕНА'],['BUY','КУПИТЬ'],['SCORE','СЧЁТ'],['Game','Игра'],['Field of view','Поле зрения'],['Crosshair','Прицел'],['Small','Мелкий'],['Medium','Средний'],['Large','Крупный'],['Center dot','Точка в центре'],
    ['Graphics','Графика'],['Low quality','Низкая'],['Medium quality','Средняя'],['High quality','Высокая'],['Show FPS','Показывать FPS'],['Low: no shadows, lower resolution and fewer particles — for weak laptops and phones.','Низкая: без теней, ниже разрешение и меньше частиц — для слабых ноутбуков и телефонов.'],['Best players','Лучшие игроки'],['Experience','Опыт'],['Wins','Победы'],['Kills','Убийства'],['Nobody has finished a match yet.','Ещё никто не доиграл матч.'],
    ['Your place: %a of %b','Ваше место: %a из %b'],['Sign in to appear in the leaderboard.','Войдите в аккаунт, чтобы попасть в рейтинг.'],['matches','матчей'],['Lvl','Ур.'],['Level %d','Уровень %d'],
    ['%a of %b experience to the next level','%a из %b опыта до следующего уровня'],['+%d experience','+%d опыта'],['New level %d: %s!','Новый уровень %d: %s!'],
    ['Recruit','Рекрут'],['Private','Рядовой'],['Corporal','Капрал'],['Sergeant','Сержант'],['Staff Sergeant','Старший сержант'],['Lieutenant','Лейтенант'],['Captain','Капитан'],['Major','Майор'],['Colonel','Полковник'],['General','Генерал'],['Connect','Подключиться'],['Server lobby','Лобби сервера'],['Match in progress','Идёт матч'],['leads the match','ведёт матч'],['admin','администратор'],['can start','может начать'],['you','вы'],
    ['A match is running — joining it…','Идёт матч — подключаемся…'],['You are an admin: pick the mode and map, then start the match.','Вы администратор: выберите режим и карту и начните матч.'],
    ['The server has no admins yet, so you can start: pick the mode and map, then start the match.','На сервере ещё нет администраторов, поэтому начать можете вы: выберите режим и карту и начните матч.'],
    ['Waiting for an admin to start: %s','Ждём, когда администратор начнёт матч: %s'],['Waiting for an admin to join and start the match.','Ждём администратора: начать матч может только он.'],
    ['Waiting for the first player to start the match.','Ждём, когда первый игрок начнёт матч.'],['The match ended: the host left.','Матч окончен: ведущий вышел.'],['Start match','Начать матч'],['Leave server','Выйти с сервера'],
    ['Disconnected from the server.','Соединение с сервером потеряно.'],['This nickname is already on the server','Этот ник уже на сервере'],['You were kicked from the server','Вас отключили от сервера'],
    ['Only a server admin can start the match','Начать матч может только администратор сервера'],['Players','Игроки'],['Now','Сейчас'],['a match is running','идёт матч'],['waiting in the lobby','ожидание в лобби'],['Play with friends','Игра с друзьями'],['You play as','Вы играете как'],['Nickname','Ник'],['Servers','Серверы'],['Add server','Добавить сервер'],['Edit server','Изменить сервер'],
    ['Refresh','Обновить'],['Create match','Создать матч'],['Open matches','Открытые матчи'],['Match code','Код матча'],['Server name','Название сервера'],['Address','Адрес'],['Save','Сохранить'],['Delete','Удалить'],['Cancel','Отмена'],
    ['Address and port of a Breachline server: an IP with a port, or a tunnel link from Openport, playit and the like.','Адрес и порт сервера Breachline: IP с портом или ссылка туннеля Openport, playit и подобных.'],
    ['Add a server to play over the network.','Добавьте сервер, чтобы играть по сети.'],['No open matches yet. Create one!','Открытых матчей пока нет. Создайте свой!'],
    ['in progress','идёт игра'],['online','в сети'],['offline','не в сети'],['ms','мс'],['in lobby','в лобби'],['invite only','по приглашениям'],['Match name','Название матча'],['Players, you included','Игроков, включая вас'],
    ['Allowed nicknames','Разрешённые ники'],['(optional, one per line or separated by commas)','(необязательно, по одному на строку или через запятую)'],['Confirm and create','Подтвердить и создать'],['Back','Назад'],
    ['The port belongs to the server: your own server asks for it when it starts (see start-server in the game folder); then forward it with Openport or a similar tool and give friends the address.','Порт задаётся у сервера: свой сервер спрашивает его при запуске (start-server в папке игры). Затем пробросьте порт через Openport или похожую утилиту и дайте друзьям адрес.'],
    ['Only these players can join; the match starts by itself once all %d are in.','Войти смогут только эти игроки; матч начнётся сам, когда соберутся все %d.'],
    ['Anyone with the code can join; the match starts by itself when all %d places are taken.','Войти может любой с кодом; матч начнётся сам, когда займут все %d мест.'],
    ['Match of %s','Матч %s'],['Searching for players','Поиск игроков'],['Waiting for the host','Ожидание ведущего'],['Joining the match…','Подключение к матчу…'],['Start now','Начать сейчас'],['Leave','Выйти'],['Copy','Копировать'],
    ['host','ведущий'],['ready','готов'],['waiting','ждём'],['Everyone is here — starting in %d','Все на месте — старт через %d'],
    ['Players: %d of %d. You can start now: bots take the empty places.','Игроков: %d из %d. Можно начать сейчас: свободные места займут боты.'],['Players: %d of %d','Игроков: %d из %d'],
    ['Match','Матч'],['The match has started. Press Resume.','Матч начался. Нажмите «Продолжить».'],['You are in a network match. Press Resume.','Вы в сетевом матче. Нажмите «Продолжить».'],
    ['This server has no HTTPS, so this page cannot reach it. Open the game on that server instead: ','Браузер не пускает страницу, открытую по https, к серверу без HTTPS. Откройте игру прямо на этом сервере: '],
    ['The server does not answer. Check the address and that the server is running.','Сервер не отвечает. Проверьте адрес и что сервер запущен.'],
    ['The server did not understand the game','Сервер не понял игру'],['Different game versions. Reload the page','Разные версии игры. Обновите страницу'],['Enter a nickname','Введите ник'],
    ['This nickname belongs to an account — sign in to use it','Этот ник принадлежит аккаунту — войдите в него'],['The server is full, try later','Сервер переполнен, попробуйте позже'],
    ['This match code is taken','Этот код матча занят'],['Match not found','Матч не найден'],['The match is full','Матч заполнен'],['You are not on this match’s player list','Вас нет в списке игроков этого матча'],
    ['This nickname is already in the match','Этот ник уже есть в матче'],['The host closed the match','Ведущий закрыл матч'],['Connection to host closed','Соединение с ведущим закрыто'],
    ['Planting','Установка'],['Defusing (kit)','Обезвреживание (набор)'],['Defusing','Обезвреживание'],['Hold E to plant','Удерживайте E для установки'],['Carry the bomb to site A or B','Доставьте бомбу на точку A или B'],['Hold E to defuse','Удерживайте E для обезвреживания'],
    ['Continue save','Продолжить сохранение'],['No save','Нет сохранения'],['Guest','Гость'],['Name','Имя'],['Password','Пароль'],['Log in','Войти'],['Register','Регистрация'],['Sign in','Вход'],['Create account','Создать аккаунт'],['Repeat password','Повторите пароль'],['Created: ','Создан: '],['Log out on other devices','Выйти на других устройствах'],['Change password','Сменить пароль'],['Current password','Текущий пароль'],['New password','Новый пароль'],['Delete account','Удалить аккаунт'],['Delete forever','Удалить навсегда'],
    ['Name: 3–24 letters, digits, _ or -. Password: 8+ characters, without the name.','Имя: 3–24 буквы, цифры, _ или -. Пароль: от 8 символов, без имени.'],
    ['Name: 3–24 letters, digits, _ or -','Имя: 3–24 буквы, цифры, _ или -'],['Name cannot mix Latin and Cyrillic','Имя не может смешивать латиницу и кириллицу'],['This name is taken','Это имя уже занято'],['Password: 8 to 128 characters','Пароль: от 8 до 128 символов'],['Password must not contain the name','Пароль не должен содержать имя'],['New password matches the old one','Новый пароль совпадает со старым'],
    ['Wrong name or password','Неверное имя или пароль'],['Wrong password','Неверный пароль'],['Too many attempts. Wait and try again','Слишком много попыток. Подождите и попробуйте снова'],['Session expired. Sign in again','Сессия истекла. Войдите снова'],['The server rejected the save','Сервер отклонил сохранение'],['Server error','Ошибка сервера'],['Server unavailable','Сервер недоступен'],
    ['Passwords do not match','Пароли не совпадают'],['Account created','Аккаунт создан'],['Password changed. Other devices were signed out','Пароль изменён. Другие устройства вышли из аккаунта'],['Account deleted','Аккаунт удалён'],['Other devices were signed out','Другие устройства вышли из аккаунта'],['No other active sign-ins','Других активных входов нет'],
    ['Cannot reach the game server','Нет связи с сервером игры'],['No server','Нет сервера'],['Profile','Профиль'],['Account','Аккаунт'],['Close','Закрыть'],['Icon','Значок'],['Colour','Цвет'],['Upload photo','Загрузить фото'],['Remove photo','Убрать фото'],
    ['Accounts are unavailable: the page was not opened from the game server. Open the game at the server’s address — for example the Render site, or your own server started with start-server.','Аккаунты недоступны: страница открыта не с сервера игры. Откройте игру по адресу сервера — например, сайт на Render или свой сервер, запущенный через start-server.'],
    ['Matches','Матчи'],['Wins','Победы'],['Win rate','Доля побед'],['Kills','Убийства'],['Deaths','Смерти'],['K/D','У/С'],['File is too large','Файл слишком большой'],['Could not upload the image','Не удалось загрузить изображение'],
    ['The account, stats, avatar and server save will be deleted permanently.','Аккаунт, статистика, аватар и серверное сохранение будут удалены безвозвратно.'],
['Log out','Выйти'],['LAN multiplayer','Игра по локальной сети'],['Guest nickname','Ник гостя'],['Room code','Код комнаты'],['Create room','Создать комнату'],['Join','Подключиться'],['Save match','Сохранить матч'],
    ['Open the server address on every computer. The host creates a room; others enter the same code.','Откройте адрес сервера на всех компьютерах. Ведущий создаёт комнату, остальные вводят тот же код.'],
    ['Saved in account','Сохранено в аккаунте'],['Saved in browser','Сохранено в браузере'],['Signed in','Вход выполнен'],['Signed out','Вы вышли из аккаунта'],['Connection to host closed','Соединение с ведущим закрыто'],['Network closed','Сеть закрыта'],['Connecting to match…','Подключение к матчу…'],['You are in a network match. Press Resume.','Вы в сетевом матче. Нажмите «Продолжить».'],
    // arsenal: skins, cases, regulars
    ['Arsenal','Арсенал'],['Skins · cases · regulars','Скины · кейсы · завсегдатаи'],['Skins','Скины'],['Cases','Кейсы'],['Regulars','Завсегдатаи'],
    ['Equip','Надеть'],['Unequip','Снять'],['Wear','Износ'],['Pattern','Узор'],['Case','Кейс'],['Open','Открыть'],['Open another','Открыть ещё'],['Close','Закрыть'],
    ['Opening','Открытие'],['Drops','Награды'],['None owned','Нет в наличии'],['Equipped','Надето'],['★ Rare special item','★ Редкий особый предмет'],['no other skins','других скинов нет'],
    ['No skins yet. Open a case — you get one after every match.','Скинов пока нет. Откройте кейс — он даётся после каждого матча.'],
    ['The people behind the bots. They keep their skins between matches and open cases too.','Люди за ботами. Их скины сохраняются между матчами, и кейсы они тоже открывают.'],
    ['Entry fragger','Первый на заходе'],['Lurker','Одиночка'],['Sniper','Снайпер'],['Support','Поддержка'],['Site anchor','Держит точку'],['Rifler','Стрелок'],
    ['Mil-Spec','Армейское'],['Restricted','Запрещённое'],['Classified','Засекреченное'],['Covert','Тайное'],['Exceedingly Rare','Крайне редкое'],
    ['Factory New','Прямо с завода'],['Minimal Wear','Немного поношенное'],['Field-Tested','После полевых испытаний'],['Well-Worn','Поношенное'],['Battle-Scarred','Закалённое в боях'],
    ['%1 unboxed %2','%1 открывает %2'],
    ['Skins and cases.','Скины и кейсы.'],['43 weapon finishes in three cases, from Mil-Spec to ★ knives. Every copy is unique: its own pattern and wear, and some count your kills. Open them in the new Arsenal, equip them, inspect with F.','43 раскраски в трёх кейсах — от армейских до ★ ножей. Каждый экземпляр уникален: свой узор и износ, а некоторые считают ваши убийства. Открывайте их в новом Арсенале, надевайте, разглядывайте на F.'],
    ['Drops and credits.','Награды и кредиты.'],['Every finished match gives a case and credits for kills and wins. Buy more cases or sell skins you don’t need.','За каждый доигранный матч — кейс и кредиты за убийства и победу. Покупайте ещё кейсы или продавайте ненужные скины.'],
    ['The regulars.','Завсегдатаи.'],['The bots are now people: each has a favourite gun, a way of playing, their own skins, and they chat during the match. They open cases after matches too — see them on the Regulars tab.','Боты теперь — люди: у каждого любимое оружие, свой стиль игры, свои скины, и они пишут в чат во время матча. После матчей они тоже открывают кейсы — смотрите вкладку «Завсегдатаи».'],
  ];
  const en = new Map(pairs), ru = new Map(pairs.map(([a,b]) => [b,a]));
  // For text assembled in game code: translate the template before filling it in.
  window.I18N = { tr: text => lang === 'ru' ? (en.get(text) ?? text) : text };
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
      .replace(/Round (\d+) · first to (\d+)/g, 'Раунд $1 · до $2 побед')
      .replace(/TEAM DEATHMATCH · TO (\d+)/g, 'КОМАНДНЫЙ БОЙ · ДО $1').replace(/ARMS RACE · LEVEL (\d+)\/(\d+)/g, 'ГОНКА · УРОВЕНЬ $1/$2')
      .replace(/Team deathmatch · first to (\d+) kills/g, 'Командный бой · до $1 убийств').replace(/Arms race · (\d+) levels/g, 'Гонка вооружений · $1 уровней')
      .replace(/^Respawn in (\d+)$/, 'Возрождение через $1').replace(/^Level (\d+) · /, 'Уровень $1 · ').replace(/ kills\)/g, ' убийств)').replace(/Bomb planted at /g, 'Бомба установлена на ')
      .replace(/Spectating /g, 'Наблюдение: ').replace(/ HP · click to switch/g, ' ОЗ · нажмите для смены')
      .replace(/(Counter-Terrorists|Terrorists) take it (\d+–\d+) on /g, (_,team,score) => `${en.get(team)} побеждает ${score} на `)
      .replace(/(Enemy team eliminated|Time ran out|Target bombed|Bomb defused|Kill limit reached|Time limit reached|Arms race completed)/g, x => en.get(x))
      .replace(/^Sell · (\d+) CR$/, 'Продать · $1 CR').replace(/^Sure\? Sell for (\d+) CR$/, 'Точно? Продать за $1 CR').replace(/^Buy · (\d+) CR$/, 'Купить · $1 CR').replace(/^Owned: (\d+)$/, 'В наличии: $1')
      .replace(/^Lvl (\d+) · (.+)$/, (_, n, st) => `Ур. ${n} · ${en.get(st) || st}`).replace(/^Favourite: /, 'Любимое: ').replace(/^(\d+) skins · (\d+) cases opened$/, 'скинов: $1 · открыто кейсов: $2')
      .replace(/ opened (.+ Case): $/, ' открывает $1: ').replace(/^ · equipped$/, ' · надел').replace(/ · pattern #/, ' · узор #')
      .replace(/\b(Mil-Spec|Restricted|Classified|Covert|Exceedingly Rare|Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\b/g, x => en.get(x))
      .replace(/ dmg\)/g, ' урона)').replace(/DMG ([\d×]+) · (AUTO|SEMI) · (\d+) RDS/g, (_,d,m,n) => `УРОН ${d} · ${m === 'AUTO' ? 'АВТО' : 'ОДИН'} · ${n} ПАТР.`);
    return value;
  }
  function visit(root) {
    if (root.nodeType === 3) {
      if (!root.parentElement || root.parentElement.closest('script,style,option,input,#accountName:not(.guest),#accountTitle:not(.guest),#accountSince,#lbSlots b,#lbCode,#ranksList b,#lbServer,#srvList b,#srvList small,#srvName,#srvAddr,.room b,#mpAs,#lanState,#username,#nickname,.kf span,td:first-child,#labels,#chat,.skn,.skInfo h3,#unboxResult h3,.caseList,.regEq,.regHead b,.drop em,.spc')) return;
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
