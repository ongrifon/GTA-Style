// Модуль игрока
import { sendToServer } from './multiplayer.js';

// Игрок
export const player = {
    x: 1500,
    y: 1500,
    width: 15,
    height: 15,
    speed: 3,
    angle: 0,
    health: 100,
    maxHealth: 100,
    armor: 0,
    maxArmor: 100,
    money: 0,
    wantedLevel: 0,
    inCar: null,
    isDead: false,
    respawnTimer: 0,
    invulnerableTime: 0,
    shootCooldown: 0,
    currentWeapon: 'pistol',
    weapons: {
        pistol: { unlocked: true, ammo: Infinity },
        uzi: { unlocked: false, ammo: 0 },
        shotgun: { unlocked: false, ammo: 0 },
        rifle: { unlocked: false, ammo: 0 }
    }
};

// Telegram Web App
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
}

// Функция получения урона игроком
export function takeDamage(damage) {
    if (player.isDead || player.invulnerableTime > 0) return;
    
    // Сначала урон по броне
    if (player.armor > 0) {
        const armorDamage = Math.min(player.armor, damage);
        player.armor -= armorDamage;
        damage -= armorDamage;
    }
    
    // Урон по здоровью
    player.health = Math.max(0, player.health - damage);
    
    // Отправляем урон на сервер
    sendToServer({
        type: 'takeDamage',
        damage: damage
    });
    
    // Создаем частицы крови
    if (window.createParticles) {
        window.createParticles(player.x, player.y, '#ff0000', 5);
    }
    
    // Неуязвимость после урона
    player.invulnerableTime = 30;
}

// Функции сохранения и загрузки профиля через Telegram Cloud Storage
export function savePlayerData() {
    if (tg && tg.CloudStorage) {
        const playerData = {
            x: player.x,
            y: player.y,
            health: player.health,
            armor: player.armor,
            money: player.money,
            wantedLevel: player.wantedLevel,
            currentWeapon: player.currentWeapon,
            weapons: player.weapons,
            timestamp: Date.now()
        };
        
        tg.CloudStorage.setItem('playerData', JSON.stringify(playerData), function(error) {
            if (error) {
                console.log('Ошибка сохранения:', error);
            } else {
                console.log('Профиль сохранен');
            }
        });
    }
}

export function loadPlayerData() {
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem('playerData', function(error, data) {
            if (error) {
                console.log('Ошибка загрузки:', error);
                return;
            }
            
            if (data) {
                try {
                    const savedData = JSON.parse(data);
                    
                    // Загружаем сохраненные данные
                    player.x = savedData.x || 1500;
                    player.y = savedData.y || 1500;
                    player.health = savedData.health || 100;
                    player.armor = savedData.armor || 0;
                    player.money = savedData.money || 0;
                    player.wantedLevel = savedData.wantedLevel || 0;
                    player.currentWeapon = savedData.currentWeapon || 'pistol';
                    
                    if (savedData.weapons) {
                        Object.assign(player.weapons, savedData.weapons);
                    }
                    
                    console.log('Профиль загружен');
                } catch (e) {
                    console.log('Ошибка парсинга данных:', e);
                }
            } else {
                console.log('Сохранения не найдены');
            }
        });
    }
}