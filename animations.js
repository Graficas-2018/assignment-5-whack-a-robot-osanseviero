var renderer = null;
var scene = null;
var camera = null;
var root = null;
var robots = []

var robot_mixer = {};
var object;
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;
var raycaster;

var duration = 1000; // ms
var currentTime = Date.now();
var now = null;

var score = 0;
var timer = 0;

var canvas;

var mapUrl = "../images/checker_large.gif";
var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;
var loaded = false;

// https://javascript.info/async-await
// Async await so it does not block animation
async function async_await(duration) {
  let promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("done!"), duration)
  });

  let result = await promise; // wait till the promise resolves
  return result
}

function reset() {
    timer = Date.now() + 5000;
    score = 0;
    $("#score").html("Score: " + score);
    $("#reset").html("Reset");
    if(!loaded) {
        loaded = true;
        loadFBX();
    }
}

function play() {
    timer = Date.now() + 5000;
    score = 0;

    // Change visibility
    $("#score").css("visibility", "visible");
    $("#reset").css("visibility", "visible");
    $("#timer").css("visibility", "visible");
    $("#play").css("visibility", "hidden");
    
    reset();
}

function updateTimer(){
    let time_left = Math.round((timer - Date.now())/1000);
    $("#timer").html("Time: " + time_left);
    if(time_left <= 0) {
        reset();
    }
}

function createDeadAnimation(robot) {
    let animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, 1], 
                    values:[
                            { x : 0 },
                            { x : - Math.PI  },
                    ],
                    target:robot.rotation
                }
            ],
        loop: false,
        duration:duration
    });
    robot.dead = animator;
}

function createIdleAnimation(robot) {
    let animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, 0.5, 1], 
                    values:[
                            { y : -40 },
                            { y : 10},
                            { y : -40},
                    ],
                    target:robot.position
                },
            ],
        loop: true,
        duration:duration*3
    });
    robot.idle = animator;
}

function loadFBX() {
    var loader = new THREE.FBXLoader();
    loader.load( '../models/Robot/robot_atk.fbx', function (obj)  {
        object = obj;
        initRobots();
        run();
    } );
}

function initRobots() {
    for(let i=-2; i<2; i++) {
        let robot = cloneFbx(object);

        robot.scale.set(0.02, 0.02, 0.02);
        robot.position.y -= 4;
        robot.position.x = 2*(i*10);
        robot.position.z = 2*(i*10);

        robot.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );

        robot.animation = "attack";
        robot.name = "robot" + i;

        scene.add(robot);
        createIdleAnimation(robot);
        createDeadAnimation(robot);
        robot.idle.start();
        
        robot_mixer["attack"] = new THREE.AnimationMixer( scene );
        robot_mixer["attack"].clipAction(robot.animations[ 0 ], robot ).play();
        robot.active = true;
        robots.push(robot);
    }
}

function animate() {
    now = Date.now();
    let deltat = now - currentTime;
    currentTime = now;
    robot_mixer[robots[0].animation].update(deltat * 0.001);
    KF.update();
}

function run() {
    requestAnimationFrame(function(){ run();});
    // Render the scene
    renderer.render(scene, camera);

    // Spin the cube for next frame
    animate();
    updateTimer();
}

function setLightColor(light, r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    light.color.setRGB(r, g, b);
}

function createScene(c) {
    canvas = c;
    
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);

    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 70, canvas.width / canvas.height, 1, 10000 );
    camera.position.set(0, 50, 40);
    camera.rotation.set(-Math.PI/3, 0, 0);
    scene.add(camera);

    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    var spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(0, 50, 40);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    var ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create a group to hold the objects
    var group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onDocumentMouseDown);

    // Now add the group to our scene
    scene.add(root);
}


function onDocumentMouseDown(event) {
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / canvas.width ) * 2 - 1;
    mouse.y = - ( event.clientY / canvas.height ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children, true);
    if ( intersects.length > 0 ) {
        CLICKED = intersects[0].object.parent;
        if(CLICKED.name.includes("robot")) {
            let robot = robots.filter(obj => {
                return obj.name === CLICKED.name;
            })[0];

            if(robot.active) {
                robot.dead.start();
                robot.active = false;

                score += 5;
                $("#score").html("Score: " + score);

                async_await(duration*1.5).then(function() {
                    scene.remove(robot);
                    // Add to scene again
                    async_await(duration*1.5).then(function() {
                        robot.active = true;
                        robot.rotation.x = 0;
                        robot.idle.start();
                        scene.add(robot);
                    });
                });
            }
        }
    } 
}