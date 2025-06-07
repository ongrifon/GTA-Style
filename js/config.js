// Игровые конфигурации и константы

// Игровые переменные
export const gameConfig = {
    camera: { x: 0, y: 0 },
    mapWidth: 3000,
    mapHeight: 3000,
    tileSize: 100
};

// Районы города
export const districts = {
    downtown: { name: 'Центр города', x: 1000, y: 1000, width: 1000, height: 1000, color: '#444455' },
    industrial: { name: 'Промзона', x: 0, y: 0, width: 1000, height: 1000, color: '#554444' },
    residential: { name: 'Спальный район', x: 2000, y: 0, width: 1000, height: 1000, color: '#445544' },
    docks: { name: 'Доки', x: 0, y: 2000, width: 1000, height: 1000, color: '#445555' },
    chinatown: { name: 'Чайнатаун', x: 2000, y: 2000, width: 1000, height: 1000, color: '#555544' }
};

// Типы оружия
export const weapons = {
    pistol: { name: 'Пистолет', damage: 25, fireRate: 10, bulletSpeed: 15, ammo: Infinity, color: '#ffff00' },
    uzi: { name: 'Узи', damage: 20, fireRate: 3, bulletSpeed: 18, ammo: 150, color: '#ff8800' },
    shotgun: { name: 'Дробовик', damage: 15, fireRate: 30, bulletSpeed: 12, ammo: 50, color: '#ff0000', pellets: 5 },
    rifle: { name: 'Винтовка', damage: 50, fireRate: 40, bulletSpeed: 25, ammo: 30, color: '#00ff00' }
};

// Константы
export const constants = {
    maxCars: 10,
    maxPedestrians: 15,
    maxPoliceCars: 3,
    maxPolicemen: 5,
    maxGangMembers: 8,
    maxBuildings: 50
};
