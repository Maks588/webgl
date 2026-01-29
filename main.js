// Główny plik aplikacji WebGL
// Odpowiada za inicjalizację kontekstu, zarządzanie sceną oraz obsługę interfejsu użytkownika

let gl, program;
const canvas = document.getElementById("glcanvas");

// ELEMENTY UI
const modelSelect = document.getElementById("modelSelect");
const addBtn = document.getElementById("addBtn");
const deleteBtn = document.getElementById("deleteBtn");
const objectList = document.getElementById("objectList");

const posX = document.getElementById("posX");
const posY = document.getElementById("posY");
const posZ = document.getElementById("posZ");

const rotX = document.getElementById("rotX");
const rotY = document.getElementById("rotY");
const rotZ = document.getElementById("rotZ");

const scaleInput = document.getElementById("scale");

//Struktura sceny
const objects = [];
let activeObject = null;

//przechowuje bufory wierzchołków dla każdej bryły
const geometries = {};

//SHADERY
const vsSource = `
attribute vec3 aPosition;
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`;

const fsSource = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.7, 0.8, 1.0, 1.0);
}
`;
// funkcja pomocnicza do tworzenia shaderów
function createShader(type, source) 
{
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}
// funkcja pomocnicza do tworzenia programu shaderowego
function createProgram() 
{
  const p = gl.createProgram();
  gl.attachShader(p, createShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(p);
  return p;
}

//główna funkcja startowa aplikacji
function init() 
{
  gl = canvas.getContext("webgl");

  program = createProgram();
  gl.useProgram(program);

  initGeometries();
  gl.enable(gl.DEPTH_TEST);

  //dopasowanie rozmiaru canvasa do okna
  function resizeCanvas() 
  {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();


  draw();
}

//funkcje tworzące bufory wierzchołków dla brył
function createGeometry(vertices) 
{
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  return { buffer, count: vertices.length / 3 };
}

// Inicjalizacja brył
function initGeometries() 
{
  geometries.cube = createGeometry(createCube());
  geometries.sphere = createGeometry(createSphere(16, 16));
  geometries.cone = createGeometry(createCone(20));
  geometries.cylinder = createGeometry(createCylinder(20));
}

//generuje wierzchołki bryły sześcianu
function createCube() 
{
  return [
    -1,-1, 1,  1,-1, 1,  1, 1, 1,  -1,-1, 1,  1, 1, 1, -1, 1, 1,
    -1,-1,-1, -1, 1,-1,  1, 1,-1, -1,-1,-1,  1, 1,-1,  1,-1,-1,
    -1, 1,-1, -1, 1, 1,  1, 1, 1,  -1, 1,-1,  1, 1, 1,  1, 1,-1,
    -1,-1,-1,  1,-1,-1,  1,-1, 1, -1,-1,-1,  1,-1, 1, -1,-1, 1,
     1,-1,-1,  1, 1,-1,  1, 1, 1,  1,-1,-1,  1, 1, 1,  1,-1, 1,
    -1,-1,-1, -1,-1, 1, -1, 1, 1, -1,-1,-1, -1, 1, 1, -1, 1,-1
  ];
}

//generuje wierzchołki bryły sfery
function createSphere(lat, lon) 
{
  const v = [];
  for (let i = 0; i < lat; i++) 
  {
    const t1 = i * Math.PI / lat;
    const t2 = (i + 1) * Math.PI / lat;

    for (let j = 0; j < lon; j++) 
    {
      const p1 = j * 2 * Math.PI / lon;
      const p2 = (j + 1) * 2 * Math.PI / lon;

      const a = sph(t1, p1);
      const b = sph(t2, p1);
      const c = sph(t2, p2);
      const d = sph(t1, p2);

      v.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  return v;
}

function sph(t, p) 
{
  return [
    Math.sin(t) * Math.cos(p),
    Math.cos(t),
    Math.sin(t) * Math.sin(p)
  ];
}

//generuje wierzchołki bryły stożka
function createCone(segments) 
{
  const v = [];
  for (let i = 0; i < segments; i++) 
  {
    const a = i * 2 * Math.PI / segments;
    const b = (i + 1) * 2 * Math.PI / segments;

    v.push(
      0,1,0,
      Math.cos(a),-1,Math.sin(a),
      Math.cos(b),-1,Math.sin(b)
    );
  }
  return v;
}

//generuje wierzchołki bryły walca
function createCylinder(segments) 
{
  const v = [];

  // Ściana boczna
  for (let i = 0; i < segments; i++) 
  {
    const a = i * 2 * Math.PI / segments;
    const b = (i + 1) * 2 * Math.PI / segments;

    const x1 = Math.cos(a), z1 = Math.sin(a);
    const x2 = Math.cos(b), z2 = Math.sin(b);

    v.push(
      x1,1,z1, x1,-1,z1, x2,-1,z2,
      x1,1,z1, x2,-1,z2, x2,1,z2
    );
  }

  // Pokrywa górna
  for (let i = 0; i < segments; i++) 
  {
    const a = i * 2 * Math.PI / segments;
    const b = (i + 1) * 2 * Math.PI / segments;
    v.push(
      0,1,0, Math.cos(a),1,Math.sin(a), Math.cos(b),1,Math.sin(b)
    );
  }

  // Pokrywa dolna
  for (let i = 0; i < segments; i++) 
  {
    const a = i * 2 * Math.PI / segments;
    const b = (i + 1) * 2 * Math.PI / segments;
    v.push(
      0,-1,0, Math.cos(b),-1,Math.sin(b), Math.cos(a),-1,Math.sin(a)
    );
  }

  return v;
}


//dodawanie nowego obiektu
addBtn.onclick = () => 
{
  const obj = {
    type: modelSelect.value,
    position: [0, 0, -6],
    rotation: [0, 0, 0],
    scale: 1
  };

  objects.push(obj);
  setActiveObject(obj);
  updateObjectList();
  draw();
};

//aktualizacja listy obiektów w UI
function updateObjectList() 
{
  objectList.innerHTML = "";
  objects.forEach((o, i) => {
    const li = document.createElement("li");
    li.textContent = `${i}: ${o.type}`;
    li.style.background = o === activeObject ? "#444" : "";
    li.onclick = () => { setActiveObject(o); draw(); };
    objectList.appendChild(li);
  });
}

//usuwanie aktywnego obiektu
deleteBtn.onclick = () => 
{
  if (!activeObject) return;
  const i = objects.indexOf(activeObject);
  objects.splice(i, 1);
  activeObject = objects[i] || objects[i - 1] || null;
  if (activeObject) setActiveObject(activeObject);
  updateObjectList();
  draw();
};

//ustawianie aktywnego obiektu
function setActiveObject(o) 
{
  activeObject = o;
  posX.value = o.position[0];
  posY.value = o.position[1];
  posZ.value = o.position[2];
  rotX.value = o.rotation[0];
  rotY.value = o.rotation[1];
  rotZ.value = o.rotation[2];
  scaleInput.value = o.scale;
  updateObjectList();
}

//obsługa zmiany parametrów obiektu z UI
document.querySelectorAll("#ui input").forEach(i =>
  i.oninput = () => {
    if (!activeObject) return;
    activeObject.position = [+posX.value, +posY.value, +posZ.value];
    activeObject.rotation = [+rotX.value, +rotY.value, +rotZ.value];
    activeObject.scale = +scaleInput.value;
    draw();
  }
);

//renderowanie sceny
function draw() 
{
  gl.clearColor(0.05,0.05,0.05,1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const view = mat4.create();
  const proj = mat4.create();
  mat4.lookAt(view, [0,0,0], [0,0,-6], [0,1,0]);
  mat4.perspective(proj, Math.PI/4, canvas.width/canvas.height, 0.1, 100);

  const uMVP = gl.getUniformLocation(program, "uMVP");
  const posLoc = gl.getAttribLocation(program, "aPosition");

  for (const o of objects) {
    const g = geometries[o.type];
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buffer);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    const model = mat4.create();
    mat4.translate(model, model, o.position);
    mat4.rotateX(model, model, glMatrix.toRadian(o.rotation[0]));
    mat4.rotateY(model, model, glMatrix.toRadian(o.rotation[1]));
    mat4.rotateZ(model, model, glMatrix.toRadian(o.rotation[2]));
    mat4.scale(model, model, [o.scale,o.scale,o.scale]);

    const mvp = mat4.create();
    mat4.multiply(mvp, view, model);
    mat4.multiply(mvp, proj, mvp);

    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, g.count);
  }
}

init();
