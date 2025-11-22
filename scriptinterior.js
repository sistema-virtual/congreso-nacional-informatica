import * as THREE from 'https://esm.sh/three@0.161.0';
import { GLTFLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

const CONFIG = {
    isMobile: /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent),
    maxLights: 2,
    maxModelsParallel: 1,
    modelLoadDelay: 600,
    shadowsEnabled: false,
    pixelRatio: 0.9
};

let camera, scene, renderer, controls;
let clock;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let finalPosition = new THREE.Vector3();
let targetPosition = null;
let targetRotation = null;
let ambientLight;
let currentModal = null;
const overlay = document.getElementById('overlay');

let modelQueue = [];
let isLoadingModel = false;
let loadedModels = [];

// ✅ ESTADO GLOBAL DEL VIDEO
let globalVideoState = {
    video: null,
    isPlaying: false,
    planes: [],
    textures: []
};

const CAMERA_MODAL_VIEW_OFFSET = new THREE.Vector3(50, 0, 30);
const CAMERA_SPEED = 0.05;
const CAMERA_VIEWS = {
    'modal-contacto': new THREE.Vector3(60, -10, -30),
    'modal-galeria': new THREE.Vector3(-70, -10, 30),
    'modal-informacion': new THREE.Vector3(-70, -10, -50),
    'modal-modelo3d': new THREE.Vector3(-100, 30, 0),
    'modal-convocatoria': new THREE.Vector3(-200, -10, 30),
};

const CAMERA_ROTATIONS = {
    'modal-galeria': { y: -Math.PI },
    'modal-informacion': { y: -Math.PI * 2 },
    'modal-modelo3d': { y: Math.PI / 2 },
    'modal-contacto': { y: Math.PI * 1.2 },
    'modal-convocatoria': { y: -Math.PI / 4 },
    'modal-galeriaXIII': { y: -Math.PI },
    'modal-expositoresXIII': { y: Math.PI / 2 }
};

function showModalMessage(message) {
    const modal = document.createElement('div');
    modal.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl z-50 max-w-sm text-center border-4 border-blue-500';
    modal.innerHTML = `
        <p class="text-gray-800 text-lg mb-4">${message}</p>
        <button onclick="this.parentNode.remove()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200 shadow-md">
            Cerrar
        </button>
    `;
    document.body.appendChild(modal);
}
window.alert = showModalMessage;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(CONFIG.isMobile ? window.devicePixelRatio * CONFIG.pixelRatio : window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);

    const isMobile = CONFIG.isMobile;

    
        overlay.innerHTML = "<p class='text-xl'>mover cámara.</p>";
        overlay.addEventListener("click", () => {
            controls.lock();
        });
    

    controls.addEventListener("lock", () => {
        overlay.style.display = "none";
        ocultarObjetos();
    });

    controls.addEventListener("unlock", () => {
        overlay.style.display = "flex";
        restaurarTitulos();
    });

    ambientLight = new THREE.AmbientLight(0xffffff, isMobile ? 1.5 : 0.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isMobile ? 0.5 : 0.8);
    dirLight.position.set(310, 150, 0);

    if (!isMobile && !CONFIG.shadowsEnabled) {
        dirLight.castShadow = false;
    }

    scene.add(dirLight);

    loadMainScene();

    if (!isMobile) {
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
    }

    clock = new THREE.Clock();
    window.addEventListener("resize", onWindowResize, false);

    renderer.shadowMap.enabled = CONFIG.isMobile ? false : true;
    if (!CONFIG.isMobile) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    configurarMonitorConexion();

    console.log(`🚀 App iniciada - Mobile: ${isMobile}`);
}

function queueModel(loadFn, position) {
    modelQueue.push({ loadFn, position });
}

async function processModelQueue() {
    if (isLoadingModel || modelQueue.length === 0) return;

    isLoadingModel = true;

    for (let i = 0; i < modelQueue.length; i++) {
        const item = modelQueue[i];
        console.log(`📦 Cargando modelo ${i + 1}/${modelQueue.length}...`);

        await new Promise((resolve) => {
            item.loadFn(item.position);
            setTimeout(resolve, CONFIG.modelLoadDelay);
        });

        if (i % 3 === 0 && i !== 0) {
            console.log('🧹 Limpiando memoria...');
            if (window.gc) window.gc();
        }
    }

    isLoadingModel = false;
    modelQueue = [];
    console.log('✅ Todos los modelos cargados');
}

function loadMainScene() {
    const loader = new GLTFLoader();

    loader.load(
        'https://fr3d5.github.io/auditorio/public/auditorio.glb',
        function (gltf) {
            const model = gltf.scene;

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            scene.add(model);
            loadedModels.push(model);

            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);

            finalPosition.set(center.x + 130, center.y - 30, center.z);

            camera.position.copy(finalPosition);
            camera.rotation.y = 1.6;
            controls.getObject().position.copy(camera.position);

            queueModel(loadFlowers, finalPosition.clone().add(new THREE.Vector3(-280, -5, 110)));
            queueModel(loadFlowers2, finalPosition.clone().add(new THREE.Vector3(-315, -19, 183)));
            queueModel(loadFlowers3, finalPosition.clone().add(new THREE.Vector3(-315, -19, -183)));
            queueModel(loadFlowers4, finalPosition.clone().add(new THREE.Vector3(-315, 15, 183)));
            queueModel(loadFlowers5, finalPosition.clone().add(new THREE.Vector3(-315, -43, -183)));
            queueModel(loadFlowers6, finalPosition.clone().add(new THREE.Vector3(-315, -43, 183)));
            queueModel(loadFlowers7, finalPosition.clone().add(new THREE.Vector3(-315, 15, -183)));
            queueModel(loadFlowers6, finalPosition.clone().add(new THREE.Vector3(-300, -43, 150)));
            queueModel(loadFlowers6, finalPosition.clone().add(new THREE.Vector3(-300, -43, -150)));

            [78, 65, 52, 39, 27, 15, 3, -9, -21, -33, -45, -57, -69].forEach(z => {
                queueModel(loadFlowers8, finalPosition.clone().add(new THREE.Vector3(-313, -19, z)));
            });

            queueModel(loadFlowers9, finalPosition.clone().add(new THREE.Vector3(-300, 19, -105)));
            queueModel(loadFlowers9, finalPosition.clone().add(new THREE.Vector3(-300, 19, 105)));
            queueModel(loadFlowers10, finalPosition.clone().add(new THREE.Vector3(-285, -19, -90)));
            if (!CONFIG.isMobile) {
    queueModel(loadFlowers9, finalPosition.clone().add(new THREE.Vector3(-300, 19, -105)));
    queueModel(loadFlowers9, finalPosition.clone().add(new THREE.Vector3(-300, 19, 105)));
}
            processModelQueue();
        },
        function (progress) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`📥 Cargando modelo principal: ${percent}%`);
        },
        function (error) {
            console.error('❌ Error al cargar escena:', error);
            showModalMessage('Error al cargar la escena. Verifica tu conexión.');
        }
    );
}

function loadFlowers(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/bandera/public/banderas.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(30, 50, 30);
        model.rotation.y = Math.PI / 2;
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando banderas:', error); });
}

function loadFlowers2(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlante/public/parlante.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(30, 30, 30);
        model.rotation.y = Math.PI;
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando parlante:', error); });
}

function loadFlowers3(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlante/public/parlante.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(30, 30, 30);
        model.rotation.y = -Math.PI / 12;
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando parlante:', error); });
}

function loadFlowers4(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlante/public/parlante.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(20, 40, 20);
        model.rotation.y = Math.PI;
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando parlante:', error); });
}

function loadFlowers5(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlan/public/mesa.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(20, 20, 20);
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando mesa:', error); });
}

function loadFlowers6(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlan/public/mesa.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(20, 20, 20);
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando mesa:', error); });
}

function loadFlowers7(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/parlante/public/parlante.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(20, 40, 20);
        model.rotation.y = Math.PI;
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando parlante:', error); });
}

function loadFlowers8(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/silla/public/sillaMesa.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(25, 25, 25);
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando silla:', error); });
}

// ✅ FUNCIÓN CORREGIDA - Un solo video para múltiples planos
function loadFlowers9(position) {
    // Si ya existe video global, reutilizar
    if (globalVideoState.video) {
        console.log('📹 Reutilizando video existente en nueva posición');
        crearPlanoVideo(position, globalVideoState.video);
        return;
    }

    const video = document.createElement('video');
    video.id = 'videoElement_' + Date.now();
    video.style.display = 'none';
    video.autoplay = false;
    video.loop = true;
    video.muted = false;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.playsinline = true;
    video.volume = 0.05;

    const source = document.createElement('source');
    source.src = './public/img/spot.mp4';
    source.type = 'video/mp4';
    video.appendChild(source);

    document.body.appendChild(video);

    let videoTextureCreated = false;

    video.addEventListener('loadedmetadata', () => {
        if (videoTextureCreated) return;
        videoTextureCreated = true;

        console.log('✅ Video cargado:', video.duration, 'segundos');

        // Guardar el video global
        globalVideoState.video = video;

        // Crear primer plano
        crearPlanoVideo(position, video);

        // Intentar reproducir
        actualizarEstadoGlobal(globalVideoState.isPlaying);
    });

    video.addEventListener('ended', () => {
        console.log('🔄 Video terminó, reiniciando...');
        video.currentTime = 0;
        video.play().catch(e => console.warn('No se pudo reiniciar:', e));
    });

    video.addEventListener('error', (e) => {
        console.error('❌ Error cargando video:', e);
    });

    video.addEventListener('play', () => {
        console.log('▶️ Video iniciado globalmente');
        globalVideoState.isPlaying = true;
    });

    video.addEventListener('pause', () => {
        console.log('⏸️ Video pausado globalmente');
        globalVideoState.isPlaying = false;
    });
}

// ✅ FUNCIÓN AUXILIAR - Crear plano para el video
function crearPlanoVideo(position, video) {
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(16, 9);
    const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        toneMapped: false
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.y = Math.PI / 2;
    plane.scale.set(5, 5, 5);
    plane.position.copy(position);
    plane.castShadow = false;
    plane.receiveShadow = false;

    scene.add(plane);
    loadedModels.push(plane);

    // Guardar en estado global
    globalVideoState.planes.push(plane);
    globalVideoState.textures.push(videoTexture);

    console.log('📺 Plano agregado. Total planos:', globalVideoState.planes.length);
}

// ✅ ACTUALIZAR ESTADO GLOBAL
function actualizarEstadoGlobal(shouldPlay) {
    if (!globalVideoState.video) return;

    if (shouldPlay && globalVideoState.video.paused) {
        globalVideoState.video.play().catch(e => console.error('Error:', e));
        globalVideoState.isPlaying = true;
    } else if (!shouldPlay && !globalVideoState.video.paused) {
        globalVideoState.video.pause();
        globalVideoState.isPlaying = false;
    }
}

function loadFlowers10(position) {
    const loader = new GLTFLoader();
    loader.load("https://fr3d5.github.io/atril/public/atrilVidrio.glb", function (gltf) {
        const model = gltf.scene;
        model.scale.set(6, 6, 6);
        model.position.copy(position);
        scene.add(model);
        loadedModels.push(model);
    }, undefined, function (error) { console.error('Error cargando atril:', error); });
}

function onKeyDown(event) {
    switch (event.code) {
        case "KeyW": moveForward = true; break;
        case "KeyA": moveLeft = true; break;
        case "KeyS": moveBackward = true; break;
        case "KeyD": moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case "KeyW": moveForward = false; break;
        case "KeyA": moveLeft = false; break;
        case "KeyS": moveBackward = false; break;
        case "KeyD": moveRight = false; break;
    }
}

function lerpAngle(start, end, t) {
    let diff = end - start;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return start + diff * t;
}

// ✅ LOOP DE ANIMACIÓN - Actualizar todas las texturas
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const speed = 15;

    if (controls.isLocked) {
        if (moveForward) controls.moveForward(speed * delta);
        if (moveBackward) controls.moveForward(-speed * delta);
        if (moveLeft) controls.moveRight(-speed * delta);
        if (moveRight) controls.moveRight(speed * delta);
    }

    if (targetPosition) {
        controls.getObject().position.lerp(targetPosition, CAMERA_SPEED);
        if (controls.getObject().position.distanceTo(targetPosition) < 0.1) {
            targetPosition = null;
        }
    }

    if (targetRotation && camera) {
        camera.rotation.y = lerpAngle(camera.rotation.y, targetRotation.y, CAMERA_SPEED);
        camera.rotation.x = 0;
        camera.rotation.z = 0;

        if (Math.abs(camera.rotation.y - targetRotation.y) < 0.01) {
            camera.rotation.y = targetRotation.y;
            camera.rotation.x = 0;
            camera.rotation.z = 0;
            targetRotation = null;
        }
    }

    // ✅ ACTUALIZAR TODOS LOS VIDEOS/TEXTURAS
    if (globalVideoState.video && globalVideoState.textures.length > 0) {
        globalVideoState.textures.forEach(texture => {
            texture.needsUpdate = true;
        });
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function crearControlesMoviles() {
    const pad = document.createElement("div");
    pad.className = "controles-moviles";
    pad.innerHTML = `
    <div class="botones">
        <button id="btn-up">▲</button>
        <div>
            <button id="btn-left">◀</button>
            <button id="btn-right">▶</button>
        </div>
        <button id="btn-down">▼</button>
    </div>
    `;
    document.body.appendChild(pad);

    document.getElementById("btn-up").addEventListener("touchstart", () => (moveForward = true));
    document.getElementById("btn-up").addEventListener("touchend", () => (moveForward = false));
    document.getElementById("btn-down").addEventListener("touchstart", () => (moveBackward = true));
    document.getElementById("btn-down").addEventListener("touchend", () => (moveBackward = false));
    document.getElementById("btn-left").addEventListener("touchstart", () => (moveLeft = true));
    document.getElementById("btn-left").addEventListener("touchend", () => (moveLeft = false));
    document.getElementById("btn-right").addEventListener("touchstart", () => (moveRight = true));
    document.getElementById("btn-right").addEventListener("touchend", () => (moveRight = false));
}

const iframeModal = document.getElementById('modal-paginas');
const iframeVentana = document.getElementById('iframeVentana');

const btnInicio = document.getElementById('abrir-inicio');
const btnGaleria = document.getElementById('abrir-galeria');
const btnInformacion = document.getElementById('abrir-informacion');
const btnContacto = document.getElementById('abrir-expositores');
const btnModelo3D = document.getElementById('abrir-modelo3d');
const btnConvocatoria = document.getElementById('abrir-convocatoria');

const btnGaleriaXIII = document.getElementById('abrir-galeriaXIII');
const btnExpositoresXIII = document.getElementById('abrir-expositoresXIII');
const btnConcursoXIII = document.getElementById('abrir-concursoXIII');
const btnpresentacion1 = document.getElementById('abrir-presentacion1');
const btnconvocatoria1 = document.getElementById('abrir-convocatoria1');
const btninscripciones1 = document.getElementById('abrir-inscripciones1');
const btnCronograma1 = document.getElementById('abrir-cronograma1');

const btnGaleriaXIV = document.getElementById('abrir-galeriaXIV');
const btnExpositoresXIV = document.getElementById('abrir-expositoresXIV');
const btnConcursoXIV = document.getElementById('abrir-concursoXIV');
const btnpresentacion2 = document.getElementById('abrir-presentacion2');
const btnconvocatoria2 = document.getElementById('abrir-convocatoria2');
const btninscripciones2 = document.getElementById('abrir-inscripciones2');
const btnCronograma2 = document.getElementById('abrir-cronograma2');

function abrirIframe(url, modalId) {
    console.log('Abriendo iframe:', url);

    if (controls && controls.isLocked) controls.unlock();
    currentModal = modalId;

    if (finalPosition) {
        const offset = CAMERA_VIEWS[modalId] || CAMERA_MODAL_VIEW_OFFSET;
        targetPosition = finalPosition.clone().add(offset);
    } else {
        targetPosition = controls.getObject().position.clone().add(new THREE.Vector3(0, 1, 0));
    }

    targetRotation = CAMERA_ROTATIONS[modalId] || { y: camera.rotation.y };

    iframeVentana.src = url;
    iframeModal.style.display = 'flex';
    ocultarObjetos();

    configurarScrollIframe();
}

function ocultarObjetos() {
    if (overlay) overlay.style.display = 'none';

    setTimeout(() => {
        const h1 = document.querySelector('.contenidoinfo');
        const h2 = document.querySelector('.posicion1');

        if (h1) {
            h1.classList.add('posicion-final-h1');
            h1.style.display = 'none';
            h1.style.visibility = 'hidden';
        }
        if (h2) {
            h2.classList.add('posicion-final-h2');
            h2.style.display = 'none';
            h2.style.visibility = 'hidden';
        }
    }, 50);
}

function restaurarTitulos() {
    const h1 = document.querySelector('.contenidoinfo');
    const h2 = document.querySelector('.posicion1');

    if (h1) {
        h1.classList.remove('posicion-final-h1');
        h1.style.display = '';
        h1.style.visibility = 'visible';
    }
    if (h2) {
        h2.classList.remove('posicion-final-h2');
        h2.style.display = '';
        h2.style.visibility = 'visible';
    }
    if (overlay) overlay.style.display = 'flex';
}

function cerrarModalConRotacion() {
    restaurarTitulos();

    setTimeout(() => {
        iframeModal.style.display = 'none';
        iframeVentana.src = '';

        if (globalVideoState.video) {
            globalVideoState.video.pause();
            globalVideoState.isPlaying = false;
        }

        const oldVideos = document.querySelectorAll('video:not([id])');
        oldVideos.forEach(v => v.remove());

        currentModal = null;
        console.log('✅ Modal cerrado');
    }, 300);

    if (finalPosition) {
        targetPosition = finalPosition.clone();
        targetRotation = { y: 1.6 };
    }
}

if (btnInicio) btnInicio.addEventListener('click', (e) => { e.preventDefault(); location.reload(); });
if (btnGaleria) btnGaleria.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./inscripciones.html', 'modal-galeria'); });
if (btnInformacion) btnInformacion.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./informacion.html', 'modal-informacion'); });
if (btnContacto) btnContacto.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./expositores.html', 'modal-expositores'); });
if (btnModelo3D) btnModelo3D.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./interior.html', 'modal-modelo3d'); });
if (btnConvocatoria) btnConvocatoria.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./convocatoria.html', 'modal-convocatoria'); });

if (btnGaleriaXIII) btnGaleriaXIII.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/galeria.html', 'modal-galeriaXIII'); });
if (btnExpositoresXIII) btnExpositoresXIII.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/expositores.html', 'modal-expositoresXIII'); });
if (btnConcursoXIII) btnConcursoXIII.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/concurso.html', 'modal-concursoXIII'); });
if (btnpresentacion1) btnpresentacion1.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/presentacion1.html', 'modal-presentacion1'); });
if (btnconvocatoria1) btnconvocatoria1.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/convocatoria1.html', 'modal-convocatoria1'); });
if (btninscripciones1) btninscripciones1.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/inscripciones.html', 'modal-inscripciones1'); });
if (btnCronograma1) btnCronograma1.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIIIcongreso/cronograma.html', 'modal-cronograma'); });

if (btnGaleriaXIV) btnGaleriaXIV.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/galeria.html', 'modal-galeriaXIV'); });
if (btnExpositoresXIV) btnExpositoresXIV.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/expositores.html', 'modal-expositoresXIV'); });
if (btnConcursoXIV) btnConcursoXIV.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/concurso.html', 'modal-concursoXIV'); });
if (btnpresentacion2) btnpresentacion2.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/presentacion2.html', 'modal-presentacion2'); });
if (btnconvocatoria2) btnconvocatoria2.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/convocatoria2.html', 'modal-convocatoria2'); });
if (btninscripciones2) btninscripciones2.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/inscripciones2.html', 'modal-inscripciones2'); });
if (btnCronograma2) btnCronograma2.addEventListener('click', (e) => { e.preventDefault(); abrirIframe('./public/XIVcongreso/cronograma.html', 'modal-cronograma2'); });

function configurarScrollIframe() {
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'iframe-scroll') {
            const scrollDelta = event.data.deltaY;
            const moveSpeed = 0.5;

            if (scrollDelta < 0) {
                controls.getObject().position.x += moveSpeed;
            } else {
                controls.getObject().position.x -= moveSpeed;
            }
        }
    });
}

iframeModal.querySelector('.cerrar-modal').addEventListener('click', cerrarModalConRotacion);

window.addEventListener('click', (e) => {
    if (e.target === iframeModal) {
        cerrarModalConRotacion();
    }
});

const menu = document.querySelector('#workarea');
const toggle = document.querySelector('.menu-toggle');

if (toggle) {
    toggle.addEventListener('click', () => {
        menu.classList.toggle('workarea-open');
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#workarea') && !e.target.closest('.menu-toggle')) {
        menu.classList.remove('workarea-open');
    }
});

const linksWorkarea = document.querySelectorAll('#workarea a, #workarea button');
linksWorkarea.forEach(link => {
    link.addEventListener('click', () => {
        menu.classList.remove('workarea-open');
    });
});

let modoLuz = 0;
const botonLuz = document.querySelector('.boton-luz');

if (botonLuz) {
    botonLuz.addEventListener('click', () => {
        modoLuz = (modoLuz + 1) % 2;

        switch (modoLuz) {
            case 0:
                ambientLight.intensity = 0.1;
                showModalMessage('🌙 Modo oscuro activado');
                break;
            case 1:
                ambientLight.intensity = CONFIG.isMobile ? 1.5 : 2;
                showModalMessage('💡 Modo normal activado');
                break;
        }
    });
}

const btnMas = document.getElementById('abrir-modal-contacto');
const menuDesplegable = document.getElementById('menuDesplegable');
const modalContacto = document.getElementById('modal-contacto');

const btnOpcion1 = document.getElementById('btnOpcion1');
const btnOpcion2 = document.getElementById('btnOpcion2');
const submenu1 = document.getElementById('submenu1');
const submenu2 = document.getElementById('submenu2');
const chevron1 = document.getElementById('chevron1');
const chevron2 = document.getElementById('chevron2');

if (btnMas) {
    btnMas.addEventListener('click', function (e) {
        e.stopPropagation();
        menuDesplegable.classList.toggle('active');
        submenu1.classList.remove('active');
        submenu2.classList.remove('active');
        chevron1.classList.remove('active');
        chevron2.classList.remove('active');
    });
}

if (btnOpcion1) {
    btnOpcion1.addEventListener('click', function (e) {
        e.stopPropagation();
        submenu1.classList.toggle('active');
        chevron1.classList.toggle('active');
        submenu2.classList.remove('active');
        chevron2.classList.remove('active');
    });
}

if (btnOpcion2) {
    btnOpcion2.addEventListener('click', function (e) {
        e.stopPropagation();
        submenu2.classList.toggle('active');
        chevron2.classList.toggle('active');
        submenu1.classList.remove('active');
        chevron1.classList.remove('active');
    });
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-principal')) {
        if (menuDesplegable) menuDesplegable.classList.remove('active');
        if (submenu1) submenu1.classList.remove('active');
        if (submenu2) submenu2.classList.remove('active');
        if (chevron1) chevron1.classList.remove('active');
        if (chevron2) chevron2.classList.remove('active');
    }
});

document.querySelectorAll('.submenu a').forEach(link => {
    link.addEventListener('click', function () {
        if (menuDesplegable) menuDesplegable.classList.remove('active');
        if (submenu1) submenu1.classList.remove('active');
        if (submenu2) submenu2.classList.remove('active');
        if (chevron1) chevron1.classList.remove('active');
        if (chevron2) chevron2.classList.remove('active');
    });
});

let videoControlsVisible = false;

function crearControlesVideo() {
    const controles = document.createElement('div');
    controles.id = 'video-controls-container';
    controles.className = 'video-controls-hidden';
    controles.innerHTML = `
        <div class="video-controls-panel">
            <div class="video-info">
                <span id="video-tiempo">0:00</span>
                <span class="video-duracion"> / <span id="video-duracion-total">0:00</span></span>
            </div>
            
            <div class="video-barra-progreso">
                <div id="video-progress-bar" class="progress-bar">
                    <div id="video-progress-fill" class="progress-fill"></div>
                </div>
            </div>
            
            <div class="video-botones">
                <button id="btn-play-pause" class="btn-video" title="Play/Pause">▶️</button>
                <button id="btn-stop" class="btn-video" title="Detener">⏹️</button>
                <button id="btn-retroceso" class="btn-video" title="Retroceso 5s">⏪</button>
                <button id="btn-avance" class="btn-video" title="Avance 5s">⏩</button>
                <div class="separador-controles"></div>
                <button id="btn-volumen" class="btn-video" title="Volumen">🔊</button>
                <input id="slider-volumen" type="range" min="0" max="100" value="5" class="slider-volumen">
                <div class="separador-controles"></div>
                <button id="btn-pantalla-completa" class="btn-video" title="Pantalla Completa">⛶</button>
                <button id="btn-cerrar-controles" class="btn-video" title="Cerrar">✕</button>
            </div>
            
            <div class="video-velocidad">
                <label for="select-velocidad">Velocidad:</label>
                <select id="select-velocidad" class="select-velocidad">
                    <option value="0.5">0.5x</option>
                    <option value="1" selected>1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                </select>
            </div>
        </div>
    `;

    document.body.appendChild(controles);
    inicializarControlesVideo();
}

// ✅ CONTROLES DE VIDEO MODIFICADOS - Con booleano isPlaying
function inicializarControlesVideo() {
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnStop = document.getElementById('btn-stop');
    const btnRetroceso = document.getElementById('btn-retroceso');
    const btnAvance = document.getElementById('btn-avance');
    const btnVolumen = document.getElementById('btn-volumen');
    const sliderVolumen = document.getElementById('slider-volumen');
    const btnPantallaCompleta = document.getElementById('btn-pantalla-completa');
    const btnCerrarControles = document.getElementById('btn-cerrar-controles');
    const selectVelocidad = document.getElementById('select-velocidad');
    const progressBar = document.getElementById('video-progress-bar');

    // ✅ PLAY/PAUSE - Usa booleano
    btnPlayPause.addEventListener('click', () => {
        if (!globalVideoState.video) return;

        const nuevoEstado = !globalVideoState.isPlaying;
        actualizarEstadoGlobal(nuevoEstado);
        btnPlayPause.textContent = nuevoEstado ? '⏸️' : '▶️';
        console.log(nuevoEstado ? '▶️ Reproduciendo' : '⏸️ Pausado');
        mostrarControlesVideo();
    });

    // ✅ STOP
    btnStop.addEventListener('click', () => {
        if (!globalVideoState.video) return;
        globalVideoState.video.pause();
        globalVideoState.video.currentTime = 0;
        globalVideoState.isPlaying = false;
        btnPlayPause.textContent = '▶️';
        actualizarBarraProgreso();
        console.log('⏹️ Detenido');
    });

    // ✅ RETROCESO
    btnRetroceso.addEventListener('click', () => {
        if (!globalVideoState.video) return;
        globalVideoState.video.currentTime = Math.max(0, globalVideoState.video.currentTime - 5);
        console.log('⏪ Retroceso a:', globalVideoState.video.currentTime);
        mostrarControlesVideo();
    });

    // ✅ AVANCE
    btnAvance.addEventListener('click', () => {
        if (!globalVideoState.video) return;
        globalVideoState.video.currentTime = Math.min(globalVideoState.video.duration, globalVideoState.video.currentTime + 5);
        console.log('⏩ Avance a:', globalVideoState.video.currentTime);
        mostrarControlesVideo();
    });

    // ✅ VOLUMEN
    btnVolumen.addEventListener('click', () => {
        if (!globalVideoState.video) return;

        if (globalVideoState.video.volume > 0) {
            globalVideoState.video.volume = 0;
            btnVolumen.textContent = '🔇';
            sliderVolumen.value = 0;
        } else {
            globalVideoState.video.volume = sliderVolumen.value / 100;
            btnVolumen.textContent = globalVideoState.video.volume < 0.5 ? '🔉' : '🔊';
        }
    });

    // ✅ SLIDER VOLUMEN
    sliderVolumen.addEventListener('input', (e) => {
        if (!globalVideoState.video) return;
        globalVideoState.video.volume = e.target.value / 100;
        if (globalVideoState.video.volume === 0) {
            btnVolumen.textContent = '🔇';
        } else if (globalVideoState.video.volume < 0.5) {
            btnVolumen.textContent = '🔉';
        } else {
            btnVolumen.textContent = '🔊';
        }
    });

    // ✅ PANTALLA COMPLETA
    btnPantallaCompleta.addEventListener('click', () => {
        if (!globalVideoState.video) return;
        if (globalVideoState.video.requestFullscreen) {
            globalVideoState.video.requestFullscreen().catch(err => console.error('Error:', err));
        }
    });

    // ✅ CERRAR CONTROLES
    btnCerrarControles.addEventListener('click', () => {
        ocultarControlesVideo();
    });

    // ✅ VELOCIDAD
    selectVelocidad.addEventListener('change', (e) => {
        if (!globalVideoState.video) return;
        globalVideoState.video.playbackRate = parseFloat(e.target.value);
    });

    // ✅ BARRA DE PROGRESO
    progressBar.addEventListener('click', (e) => {
        if (!globalVideoState.video) return;
        const rect = progressBar.getBoundingClientRect();
        const porcentaje = (e.clientX - rect.left) / rect.width;
        globalVideoState.video.currentTime = porcentaje * globalVideoState.video.duration;
    });

    // ✅ ACTUALIZAR BARRA CONTINUAMENTE
    setInterval(() => {
        if (globalVideoState.video && globalVideoState.isPlaying) {
            actualizarBarraProgreso();
        }
    }, 100);
}

function actualizarBarraProgreso() {
    if (globalVideoState.video) {
        const progressFill = document.getElementById('video-progress-fill');
        const tiempoActual = document.getElementById('video-tiempo');
        const duracionTotal = document.getElementById('video-duracion-total');

        if (globalVideoState.video.duration) {
            const porcentaje = (globalVideoState.video.currentTime / globalVideoState.video.duration) * 100;
            progressFill.style.width = porcentaje + '%';
            tiempoActual.textContent = formatearTiempo(globalVideoState.video.currentTime);
            duracionTotal.textContent = formatearTiempo(globalVideoState.video.duration);
        }
    }
}

function formatearTiempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

function mostrarControlesVideo() {
    const container = document.getElementById('video-controls-container');
    if (container) {
        container.classList.remove('video-controls-hidden');
        container.classList.add('video-controls-visible');
        videoControlsVisible = true;
    }
}

function ocultarControlesVideo() {
    const container = document.getElementById('video-controls-container');
    if (container) {
        container.classList.remove('video-controls-visible');
        container.classList.add('video-controls-hidden');
        videoControlsVisible = false;
    }
}

// ✅ ATAJOS DE TECLADO - Con booleano isPlaying
document.addEventListener('keydown', (e) => {
    if (!globalVideoState.video) return;

    const btnPlayPause = document.getElementById('btn-play-pause');

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            const nuevoEstado = !globalVideoState.isPlaying;
            actualizarEstadoGlobal(nuevoEstado);
            btnPlayPause.textContent = nuevoEstado ? '⏸️' : '▶️';
            mostrarControlesVideo();
            break;

        case 'ArrowRight':
            e.preventDefault();
            globalVideoState.video.currentTime = Math.min(globalVideoState.video.duration, globalVideoState.video.currentTime + 5);
            mostrarControlesVideo();
            break;

        case 'ArrowLeft':
            e.preventDefault();
            globalVideoState.video.currentTime = Math.max(0, globalVideoState.video.currentTime - 5);
            mostrarControlesVideo();
            break;

        case 'ArrowUp':
            e.preventDefault();
            globalVideoState.video.volume = Math.min(1, globalVideoState.video.volume + 0.1);
            document.getElementById('slider-volumen').value = globalVideoState.video.volume * 100;
            mostrarControlesVideo();
            break;

        case 'ArrowDown':
            e.preventDefault();
            globalVideoState.video.volume = Math.max(0, globalVideoState.video.volume - 0.1);
            document.getElementById('slider-volumen').value = globalVideoState.video.volume * 100;
            mostrarControlesVideo();
            break;

        case 'KeyF':
            e.preventDefault();
            document.getElementById('btn-pantalla-completa').click();
            break;

        case 'Escape':
            e.preventDefault();
            ocultarControlesVideo();
            break;
    }
});

function configurarMonitorConexion() {
    window.addEventListener('offline', function () {
        console.error('🔴 SIN CONEXIÓN');
        if (!navigator.onLine) {
            showModalMessage('⚠️ No hay conexión a Internet');
        }
    });

    window.addEventListener('online', function () {
        console.log('🟢 CONECTADO');
    });
}

window.addEventListener('load', () => {
    crearControlesVideo();
    console.log('✅ Aplicación completamente cargada');
});