// Мультиплеер модуль

let socket = null;
let playerId = null;
let otherPlayers = new Map();
let networkBullets = [];
let networkCars = [];
let isConnected = false;

// Подключение к серверу
export function connectToServer() {
    try {
        const wsUrl = location.protocol === 'https:' ? 'wss://' : 'ws://';
        socket = new WebSocket(wsUrl + location.host);
        
        socket.onopen = () => {
            console.log('Подключение к серверу установлено');
            isConnected = true;
        };
        
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleServerMessage(message);
        };
        
        socket.onclose = () => {
            console.log('Подключение к серверу закрыто');
            isConnected = false;
            // Переподключение через 3 секунды
            setTimeout(connectToServer, 3000);
        };
        
        socket.onerror = (error) => {
            console.error('Ошибка WebSocket:', error);
        };
    } catch (error) {
        console.error('Ошибка подключения:', error);
        setTimeout(connectToServer, 3000);
    }
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'init':
            playerId = message.playerId;
            // Обновляем позицию игрока из сервера
            if (window.player) {
                window.player.x = message.player.x;
                window.player.y = message.player.y;
            }
            // Загружаем других игроков
            message.players.forEach(p => {
                if (p.id !== playerId) {
                    otherPlayers.set(p.id, p);
                }
            });
            // Загружаем машины
            networkCars = message.cars || [];
            break;
            
        case 'playerJoined':
            if (message.player.id !== playerId) {
                otherPlayers.set(message.player.id, message.player);
            }
            break;
            
        case 'playerLeft':
            otherPlayers.delete(message.playerId);
            break;
            
        case 'playerMove':
            if (message.playerId !== playerId) {
                const otherPlayer = otherPlayers.get(message.playerId);
                if (otherPlayer) {
                    otherPlayer.x = message.x;
                    otherPlayer.y = message.y;
                    otherPlayer.angle = message.angle;
                }
            }
            break;
            
        case 'bulletFired':
            networkBullets.push(message.bullet);
            break;
            
        case 'bulletsUpdate':
            networkBullets = message.bullets;
            break;
            
        case 'bulletHit':
            if (message.targetId === playerId && window.takeDamage) {
                window.takeDamage(message.damage);
            }
            break;
            
        case 'playerRespawn':
            if (message.playerId === playerId && window.player) {
                window.player.x = message.x;
                window.player.y = message.y;
                window.player.health = message.health;
            } else {
                const otherPlayer = otherPlayers.get(message.playerId);
                if (otherPlayer) {
                    otherPlayer.x = message.x;
                    otherPlayer.y = message.y;
                    otherPlayer.health = message.health;
                }
            }
            break;
            
        case 'playerEnteredCar':
            const otherPlayer = otherPlayers.get(message.playerId);
            if (otherPlayer) {
                otherPlayer.inCar = true;
                otherPlayer.carId = message.carId;
            }
            break;
            
        case 'playerExitedCar':
            const player2 = otherPlayers.get(message.playerId);
            if (player2) {
                player2.inCar = false;
                player2.carId = null;
            }
            break;
            
        case 'carMove':
            const car = networkCars.find(c => c.id === message.carId);
            if (car) {
                car.x = message.x;
                car.y = message.y;
                car.angle = message.angle;
            }
            break;
    }
}

export function sendToServer(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

// Геттеры для других модулей
export function getPlayerId() {
    return playerId;
}

export function getOtherPlayers() {
    return otherPlayers;
}

export function getNetworkBullets() {
    return networkBullets;
}

export function getNetworkCars() {
    return networkCars;
}

export function isMultiplayerConnected() {
    return isConnected;
}