// Модуль управления

// Управление
export const keys = {};

// Мобильное управление
export let touchMovement = { x: 0, y: 0 };
export let touchAiming = { x: 0, y: 0 };
export let isMobile = false;

// Мышь
export let mouseX = 0;
export let mouseY = 0;
export let mouseWorldX = 0;
export let mouseWorldY = 0;

// Проверка мобильного устройства
export function checkMobile() {
    isMobile = ('ontouchstart' in window) || 
              (navigator.maxTouchPoints > 0) || 
              (navigator.msMaxTouchPoints > 0);
}

// Инициализация контролов
export function initControls(canvas, player, game) {
    checkMobile();
    
    // Показать/скрыть контролы в зависимости от устройства
    const mobileControls = document.getElementById('mobileControls');
    const desktopControls = document.getElementById('controls');
    
    if (isMobile) {
        mobileControls.style.display = 'block';
        desktopControls.style.display = 'none';
        setupMobileControls();
    } else {
        mobileControls.style.display = 'none';
        desktopControls.style.display = 'block';
        setupDesktopControls(canvas, game);
    }
}

function setupDesktopControls(canvas, game) {
    // События клавиатуры
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
        keys[e.key.toUpperCase()] = true;
        keys[e.code] = true;
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
        keys[e.key.toUpperCase()] = false;
        keys[e.code] = false;
    });
    
    // События мыши
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        mouseWorldX = mouseX + game.camera.x;
        mouseWorldY = mouseY + game.camera.y;
    });
    
    // Автоматическая стрельба при зажатой кнопке мыши
    let mouseDown = false;
    canvas.addEventListener('mousedown', () => mouseDown = true);
    canvas.addEventListener('mouseup', () => mouseDown = false);
    
    setInterval(() => {
        if (mouseDown && window.player && !window.player.isDead && !window.player.inCar && window.player.shootCooldown <= 0) {
            canvas.dispatchEvent(new Event('click'));
        }
    }, 50);
}

function setupMobileControls() {
    // Джойстик движения
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    let movementActive = false;

    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        movementActive = true;
    });

    joystick.addEventListener('touchmove', (e) => {
        if (!movementActive) return;
        e.preventDefault();
        
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const touch = e.touches[0];
        const x = touch.clientX - rect.left - centerX;
        const y = touch.clientY - rect.top - centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = 40;
        
        if (distance <= maxDistance) {
            joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
            touchMovement.x = x / maxDistance;
            touchMovement.y = y / maxDistance;
        } else {
            const angle = Math.atan2(y, x);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            joystickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
            touchMovement.x = limitedX / maxDistance;
            touchMovement.y = limitedY / maxDistance;
        }
    });

    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        movementActive = false;
        joystickKnob.style.transform = 'translate(0px, 0px)';
        touchMovement.x = 0;
        touchMovement.y = 0;
    });

    // Джойстик прицеливания
    const aimJoystick = document.getElementById('aimJoystick');
    const aimJoystickKnob = document.getElementById('aimJoystickKnob');
    let aimingActive = false;

    aimJoystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        aimingActive = true;
    });

    aimJoystick.addEventListener('touchmove', (e) => {
        if (!aimingActive) return;
        e.preventDefault();
        
        const rect = aimJoystick.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const touch = e.touches[0];
        const x = touch.clientX - rect.left - centerX;
        const y = touch.clientY - rect.top - centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = 40;
        
        if (distance <= maxDistance) {
            aimJoystickKnob.style.transform = `translate(${x}px, ${y}px)`;
            touchAiming.x = x / maxDistance;
            touchAiming.y = y / maxDistance;
        } else {
            const angle = Math.atan2(y, x);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            aimJoystickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
            touchAiming.x = limitedX / maxDistance;
            touchAiming.y = limitedY / maxDistance;
        }
        
        // Стрельба при движении джойстика прицеливания
        if (window.player && !window.player.isDead && !window.player.inCar && window.player.shootCooldown <= 0) {
            if (window.canvas) {
                window.canvas.dispatchEvent(new Event('click'));
            }
        }
    });

    aimJoystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        aimingActive = false;
        aimJoystickKnob.style.transform = 'translate(0px, 0px)';
        touchAiming.x = 0;
        touchAiming.y = 0;
    });

    // Кнопка действия (машина)
    const actionButton = document.getElementById('actionButton');
    actionButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (window.handleCarAction) {
            window.handleCarAction();
        }
    });

    // Кнопка смены оружия
    const weaponButton = document.getElementById('weaponButton');
    weaponButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (window.switchWeapon) {
            window.switchWeapon();
        }
    });
}