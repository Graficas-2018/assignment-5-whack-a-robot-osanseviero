var renderer = null, 
scene = null, 
camera = null,
root = null,
robot_idle = null,
group = null,
orbitControls = null;

var robot_mixer = {};
var deadAnimator;
var morphs = [];
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;
var raycaster;

var duration = 1000; // ms
var currentTime = Date.now();

var score = 0;

var animation = "attack";

function createDeadAnimation() {
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
                    target:robot_idle.rotation
                },
                { 
                    keys:[0,  1], 
                    values:[
                            { y : -4.02 },
                            { y : 7},
                    ],
                    target:robot_idle.position
                },

            ],
        loop: false,
        duration:duration
    });
    animator.start();

}

function loadFBX() {
    var loader = new THREE.FBXLoader();
    loader.load( '../models/Robot/robot_atk.fbx', function (object)  {
        object.scale.set(0.02, 0.02, 0.02);
        object.position.y -= 4;
        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        robot_idle = object;
        scene.add(robot_idle);
        
        robot_mixer["attack"] = new THREE.AnimationMixer( scene );
        robot_mixer["attack"].clipAction( object.animations[ 0 ], robot_idle ).play();
    } );

}

function animate() {

    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;

    if(robot_idle && robot_mixer[animation])
    {
        robot_mixer[animation].update(deltat * 0.001);
    }

    if(animation =="dead")
    {
        KF.update();
    }
}

function run() {
    requestAnimationFrame(function() { run(); });
        // Render the scene
        renderer.render( scene, camera );

        // Spin the cube for next frame
        animate();

}

function setLightColor(light, r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "../images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {
    
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
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set(0, 50, 40);
    camera.rotation.set(-Math.PI/3, 0, 0);
    scene.add(camera);
    console.log(camera)

    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(0, 50, 40);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create the objects
    loadFBX();

    // Create a group to hold the objects
    group = new THREE.Object3D;
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
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera( mouse, camera );
    var intersects = raycaster.intersectObjects(scene.children, true);

    if ( intersects.length > 0 ) {
        CLICKED = intersects[ 0 ].object;
        if(CLICKED.name === "Robot1") {
            if(animation != "dead") {
                animation = "dead"
                createDeadAnimation();
                score += 5;
                $("#score").html("Score: " + score);
            }
        }
    } 
}