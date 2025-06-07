// Главный модуль игры
import { gameConfig, districts, weapons, constants } from './config.js';
import { player, takeDamage, savePlayerData, loadPlayerData } from './player.js';
import { connectToServer, sendToServer, getOtherPlayers, getNetworkBullets, isMultiplayerConnected } from './multiplayer.js';
import { initControls, keys, touchMovement, touchAiming, isMobile, mouseWorldX, mouseWorldY } from './controls.js';

// Инициализация Telegram Web App
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Настройка темы
    if (tg.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#222222');
    }
    
    // Отключение закрытия при свайпе вниз
    tg.disableVerticalSwipes();
    
    // Обработка кнопки "Назад"
    tg.BackButton.onClick(() => {
        if (confirm('Вы уверены, что хотите выйти из игры?')) {
            savePlayerData();
            tg.close();
        }
    });
    
    // Показываем кнопку "Назад" когда игра загружена
    setTimeout(() => {
        tg.BackButton.show();
    }, 1000);
}

// Глобальные переменные для совместимости
window.player = player;
window.takeDamage = takeDamage;
window.createParticles = createParticles;

// Ждем загрузки DOM
window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    window.canvas = canvas; // Для совместимости с контролами
    
    // Размер канваса
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Инициализация контролов
    initControls(canvas, player, gameConfig);
    
    // Игровые объекты
    const cars = [];
    const policeCars = [];
    const policemen = [];
    const pedestrians = [];
    const gangMembers = [];
    const buildings = [];
    const bullets = [];
    const particles = [];
    const pickups = [];
    
    // Простые классы для демонстрации (урезанные версии)
    class Particle {
        constructor(x, y, color, life) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.color = color;
            this.life = life;
            this.maxLife = life;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            return this.life > 0;
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.life / this.maxLife;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x - gameConfig.camera.x, this.y - gameConfig.camera.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    class Person {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.angle = 0;
            this.health = 100;
            this.maxHealth = 100;
            this.armor = 0;
        }
        
        drawPerson(isPlayer = false) {
            ctx.save();
            ctx.translate(this.x - gameConfig.camera.x, this.y - gameConfig.camera.y);
            ctx.rotate(this.angle);
            
            // Тело
            ctx.fillStyle = this.color;
            ctx.fillRect(-7, -7, 15, 15);
            
            // Направление взгляда
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5, -2, 8, 4);
            
            ctx.restore();
            
            // Полоска здоровья для игрока
            if (isPlayer && this.health < this.maxHealth) {
                ctx.save();
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(this.x - gameConfig.camera.x - 15, this.y - gameConfig.camera.y - 20, 30, 4);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(this.x - gameConfig.camera.x - 15, this.y - gameConfig.camera.y - 20, 30 * (this.health / this.maxHealth), 4);
                ctx.restore();
            }
        }
    }
    
    class Bullet {
        constructor(x, y, angle, isPlayerBullet, damage, speed, color) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.speed = speed;
            this.isPlayerBullet = isPlayerBullet;
            this.damage = damage;
            this.color = color;
            this.life = 180; // 3 секунды при 60 FPS
        }
        
        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life--;
            return this.life > 0;
        }
        
        draw() {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x - gameConfig.camera.x, this.y - gameConfig.camera.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Функция создания частиц
    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color, 30));
        }
    }
    
    // Обновление UI
    function updateUI() {
        document.getElementById('health').textContent = Math.max(0, player.health);
        document.getElementById('armor').textContent = player.armor;
        document.getElementById('money').textContent = player.money;
        
        const wantedStars = '★'.repeat(player.wantedLevel) + '☆'.repeat(5 - player.wantedLevel);
        document.getElementById('wanted').textContent = wantedStars;
        
        const weaponName = weapons[player.currentWeapon].name;
        const ammo = player.weapons[player.currentWeapon].ammo;
        document.getElementById('weapon').textContent = weaponName;
        document.getElementById('ammo').textContent = ammo === Infinity ? '∞' : ammo;
        
        // Мультиплеер статус
        const connectionStatus = document.getElementById('connection-status');
        const playersCount = document.getElementById('players-count');
        
        if (isMultiplayerConnected()) {
            connectionStatus.textContent = '🟢 Онлайн';
            connectionStatus.style.color = '#00ff00';
            const otherPlayersCount = getOtherPlayers().size;
            playersCount.textContent = `Игроков: ${otherPlayersCount + 1}`;
        } else {
            connectionStatus.textContent = '🔴 Оффлайн';
            connectionStatus.style.color = '#ff0000';
            playersCount.textContent = 'Игроков: 1';
        }
    }
    
    // Определение района
    function getCurrentDistrict() {
        for (const [key, district] of Object.entries(districts)) {
            if (player.x >= district.x && player.x <= district.x + district.width &&
                player.y >= district.y && player.y <= district.y + district.height) {
                return district.name;
            }
        }
        return 'Неизвестная местность';
    }
    
    // Обновление игры
    function update() {
        // Проверка смерти
        if (player.health <= 0 && !player.isDead) {
            player.isDead = true;
            player.respawnTimer = 180;
            player.inCar = null;
            if (player.money > 0) {
                player.money = Math.floor(player.money * 0.5);
            }
        }
        
        // Респавн
        if (player.isDead) {
            player.respawnTimer--;
            if (player.respawnTimer <= 0) {
                player.isDead = false;
                player.health = player.maxHealth;
                player.armor = 0;
                player.x = 1500;
                player.y = 1500;
                player.wantedLevel = 0;
                player.invulnerableTime = 120;
                savePlayerData();
            }
            return;
        }
        
        // Неуязвимость после респавна
        if (player.invulnerableTime > 0) {
            player.invulnerableTime--;
        }
        
        // Кулдаун стрельбы
        if (player.shootCooldown > 0) {
            player.shootCooldown--;
        }
        
        // Управление игроком (упрощенное)
        if (!player.inCar) {
            let dx = 0, dy = 0;
            
            // Клавиатура или тач
            if (keys['w'] || keys['W'] || keys['KeyW'] || keys['ц'] || keys['Ц'] || touchMovement.y < -0.3) {
                dy -= player.speed;
            }
            if (keys['s'] || keys['S'] || keys['KeyS'] || keys['ы'] || keys['Ы'] || touchMovement.y > 0.3) {
                dy += player.speed;
            }
            if (keys['a'] || keys['A'] || keys['KeyA'] || keys['ф'] || keys['Ф'] || touchMovement.x < -0.3) {
                dx -= player.speed;
            }
            if (keys['d'] || keys['D'] || keys['KeyD'] || keys['в'] || keys['В'] || touchMovement.x > 0.3) {
                dx += player.speed;
            }
            
            if (dx !== 0 || dy !== 0) {
                player.x += dx;
                player.y += dy;
            }
            
            // Поворот к мыши (только для десктопа)
            if (!isMobile) {
                player.angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
            } else if (touchAiming.x !== 0 || touchAiming.y !== 0) {
                player.angle = Math.atan2(touchAiming.y, touchAiming.x);
            } else if (touchMovement.x !== 0 || touchMovement.y !== 0) {
                player.angle = Math.atan2(touchMovement.y, touchMovement.x);
            }
            
            // Границы
            player.x = Math.max(10, Math.min(gameConfig.mapWidth - 10, player.x));
            player.y = Math.max(10, Math.min(gameConfig.mapHeight - 10, player.y));
            
            // Отправляем позицию на сервер
            sendToServer({
                type: 'move',
                x: player.x,
                y: player.y,
                angle: player.angle
            });
        }
        
        // Обновление пуль
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].update()) {
                bullets.splice(i, 1);
            }
        }
        
        // Обновление частиц
        for (let i = particles.length - 1; i >= 0; i--) {
            if (!particles[i].update()) {
                particles.splice(i, 1);
            }
        }
        
        // Обновление камеры
        const targetCameraX = player.x - canvas.width / 2;
        const targetCameraY = player.y - canvas.height / 2;
        
        gameConfig.camera.x += (targetCameraX - gameConfig.camera.x) * 0.1;
        gameConfig.camera.y += (targetCameraY - gameConfig.camera.y) * 0.1;
        
        // Границы камеры
        gameConfig.camera.x = Math.max(0, Math.min(gameConfig.mapWidth - canvas.width, gameConfig.camera.x));
        gameConfig.camera.y = Math.max(0, Math.min(gameConfig.mapHeight - canvas.height, gameConfig.camera.y));
        
        // Обновление UI
        updateUI();
        
        // Обновление района
        document.getElementById('location').textContent = getCurrentDistrict();
    }
    
    // Отрисовка
    function draw() {
        // Очистка
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Фон районов
        Object.values(districts).forEach(district => {
            ctx.fillStyle = district.color;
            ctx.fillRect(
                district.x - gameConfig.camera.x,
                district.y - gameConfig.camera.y,
                district.width,
                district.height
            );
        });
        
        // Сетка дорог
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        for (let x = 0; x < gameConfig.mapWidth; x += gameConfig.tileSize) {
            ctx.beginPath();
            ctx.moveTo(x - gameConfig.camera.x, 0 - gameConfig.camera.y);
            ctx.lineTo(x - gameConfig.camera.x, gameConfig.mapHeight - gameConfig.camera.y);
            ctx.stroke();
        }
        for (let y = 0; y < gameConfig.mapHeight; y += gameConfig.tileSize) {
            ctx.beginPath();
            ctx.moveTo(0 - gameConfig.camera.x, y - gameConfig.camera.y);
            ctx.lineTo(gameConfig.mapWidth - gameConfig.camera.x, y - gameConfig.camera.y);
            ctx.stroke();
        }
        
        // Частицы
        particles.forEach(particle => particle.draw());
        
        // Игрок
        if (!player.inCar && !player.isDead) {
            if (player.invulnerableTime <= 0 || Math.floor(player.invulnerableTime / 5) % 2 === 0) {
                const playerPerson = new Person(player.x, player.y, '#ff9900');
                playerPerson.angle = player.angle;
                playerPerson.health = player.health;
                playerPerson.maxHealth = player.maxHealth;
                playerPerson.armor = player.armor;
                playerPerson.drawPerson(true);
            }
        }
        
        // Другие игроки (мультиплеер)
        getOtherPlayers().forEach((otherPlayer, playerId) => {
            if (!otherPlayer.inCar && !otherPlayer.isDead) {
                const otherPlayerPerson = new Person(otherPlayer.x, otherPlayer.y, '#00ff00');
                otherPlayerPerson.angle = otherPlayer.angle || 0;
                otherPlayerPerson.health = otherPlayer.health || 100;
                otherPlayerPerson.maxHealth = otherPlayer.maxHealth || 100;
                otherPlayerPerson.armor = otherPlayer.armor || 0;
                otherPlayerPerson.drawPerson(false);
                
                // Имя игрока над головой
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Player ${playerId.substring(0, 6)}`, 
                           otherPlayer.x - gameConfig.camera.x, 
                           otherPlayer.y - gameConfig.camera.y - 25);
                ctx.restore();
            }
        });
        
        // Пули
        bullets.forEach(bullet => bullet.draw());
        
        // Сетевые пули (мультиплеер)
        getNetworkBullets().forEach(bullet => {
            ctx.save();
            ctx.fillStyle = bullet.color || '#ffff00';
            ctx.beginPath();
            ctx.arc(bullet.x - gameConfig.camera.x, bullet.y - gameConfig.camera.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // Прицел (только когда не в машине)
        if (!player.inCar && !player.isDead) {
            let targetX, targetY;
            
            if (isMobile && (touchAiming.x !== 0 || touchAiming.y !== 0)) {
                const aimDistance = 100;
                targetX = (player.x - gameConfig.camera.x) + touchAiming.x * aimDistance;
                targetY = (player.y - gameConfig.camera.y) + touchAiming.y * aimDistance;
            } else if (isMobile && (touchMovement.x !== 0 || touchMovement.y !== 0)) {
                const aimDistance = 100;
                targetX = (player.x - gameConfig.camera.x) + touchMovement.x * aimDistance;
                targetY = (player.y - gameConfig.camera.y) + touchMovement.y * aimDistance;
            } else {
                targetX = mouseWorldX - gameConfig.camera.x;
                targetY = mouseWorldY - gameConfig.camera.y;
            }
            
            // Линия прицеливания
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(player.x - gameConfig.camera.x, player.y - gameConfig.camera.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            
            // Прицел
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 15, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(targetX - 20, targetY);
            ctx.lineTo(targetX + 20, targetY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(targetX, targetY - 20);
            ctx.lineTo(targetX, targetY + 20);
            ctx.stroke();
        }
        
        // Экран смерти
        if (player.isDead) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WASTED', canvas.width / 2, canvas.height / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText(`Респавн через ${Math.ceil(player.respawnTimer / 60)} сек`, canvas.width / 2, canvas.height / 2 + 60);
            ctx.restore();
        }
    }
    
    // Обработка стрельбы
    canvas.addEventListener('click', (e) => {
        if (!player.isDead && !player.inCar && player.shootCooldown <= 0) {
            const weapon = weapons[player.currentWeapon];
            const angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
            
            // Проверка патронов
            if (player.weapons[player.currentWeapon].ammo === 0) {
                return;
            }
            
            if (weapon.pellets) {
                // Дробовик - несколько пуль
                for (let i = 0; i < weapon.pellets; i++) {
                    const spread = (Math.random() - 0.5) * 0.3;
                    bullets.push(new Bullet(
                        player.x + Math.cos(angle) * 15,
                        player.y + Math.sin(angle) * 15,
                        angle + spread,
                        true,
                        weapon.damage,
                        weapon.bulletSpeed,
                        weapon.color
                    ));
                }
            } else {
                // Обычное оружие
                bullets.push(new Bullet(
                    player.x + Math.cos(angle) * 15,
                    player.y + Math.sin(angle) * 15,
                    angle,
                    true,
                    weapon.damage,
                    weapon.bulletSpeed,
                    weapon.color
                ));
            }
            
            // Отправляем выстрел на сервер
            sendToServer({
                type: 'shoot',
                x: player.x + Math.cos(angle) * 15,
                y: player.y + Math.sin(angle) * 15,
                angle: angle,
                damage: weapon.damage
            });
            
            // Расход патронов
            if (player.weapons[player.currentWeapon].ammo !== Infinity) {
                player.weapons[player.currentWeapon].ammo--;
            }
            
            player.shootCooldown = weapon.fireRate;
        }
    });
    
    // Основной цикл
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // Автосохранение
    setInterval(() => {
        if (!player.isDead) {
            savePlayerData();
        }
    }, 10000);
    
    // Сохранение при уходе со страницы
    window.addEventListener('beforeunload', () => {
        savePlayerData();
    });
    
    // Запуск игры
    loadPlayerData();
    connectToServer();
    gameLoop();
});