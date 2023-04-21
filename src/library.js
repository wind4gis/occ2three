import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Color,
  Geometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import openCascadeHelper from './common/openCascadeHelper';

const loadFileAsync = (file) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  })
}

const loadSTEPorIGES = async (openCascade, inputFile, addFunction, scene) => {
  await loadFileAsync(inputFile).then(async (fileText) => {
    const fileType = (() => {
      switch (inputFile.name.toLowerCase().split(".").pop()) {
        case "step":
        case "stp":
          return "step";
        case "iges":
        case "igs":
          return "iges";
        default:
          return undefined;
      }
    })();
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    openCascade.FS.createDataFile("/", `file.${fileType}`, fileText, true, true);

    // Choose the correct OpenCascade file parsers to read the CAD file
    var reader = null;
    if (fileType === "step") {
      reader = new openCascade.STEPControl_Reader_1();
    } else if (fileType === "iges") {
      reader = new openCascade.IGESControl_Reader_1();
    } else { console.error("opencascade.js can't parse this extension! (yet)"); }
    const readResult = reader.ReadFile(`file.${fileType}`);            // Read the file
    if (readResult === openCascade.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log("file loaded successfully!     Converting to OCC now...");
      const numRootsTransferred = reader.TransferRoots(new openCascade.Message_ProgressRange_1());    // Translate all transferable roots to OpenCascade
      const stepShape = reader.OneShape();         // Obtain the results of translation in one OCCT shape
      console.log(inputFile.name + " converted successfully!  Triangulating now...");

      // Out with the old, in with the new!
      scene.remove(scene.getObjectByName("shape"));
      await addFunction(openCascade, stepShape, scene);
      console.log(inputFile.name + " triangulated and added to the scene!");

      // Remove the file when we're done (otherwise we run into errors on reupload)
      openCascade.FS.unlink(`/file.${fileType}`);
    } else {
      console.error("Something in OCCT went wrong trying to read " + inputFile.name);
    }
  });
};
export { loadSTEPorIGES };


const setupThreeJSViewport = () => {
  var scene = new Scene();
  var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  var renderer = new WebGLRenderer({ antialias: true });
  const viewport = document.getElementById("viewport");
  const viewportRect = viewport.getBoundingClientRect();
  renderer.setSize(viewportRect.width, viewportRect.height);
  viewport.appendChild(renderer.domElement);

  const light = new AmbientLight(0x404040);
  scene.add(light);
  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0.5, 0.5, 0.5);
  scene.add(directionalLight);

  camera.position.set(0, 50, 100);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0, 50, 0);
  controls.update();

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
  return scene;
}
export { setupThreeJSViewport };

const addShapeToScene = async (openCascade, shape, scene) => {
  openCascadeHelper.setOpenCascade(openCascade);
  // 根据传入的形状返回拆分后的面信息
  const facelist = await openCascadeHelper.tessellate(shape);
  // 整合面信息对应的顶点、法线和朝向数据
  const [locVertexcoord, locNormalcoord, locTriIndices] = await openCascadeHelper.joinPrimitives(facelist);
  const tot_triangle_count = facelist.reduce((a, b) => a + b.number_of_triangles, 0);
  const [vertices, faces] = await openCascadeHelper.generateGeometry(tot_triangle_count, locVertexcoord, locNormalcoord, locTriIndices);

  const objectMat = new MeshStandardMaterial({
    color: new Color(0.9, 0.9, 0.9)
  });
  const geometry = new Geometry();
  geometry.vertices = vertices;
  geometry.faces = faces;
  const object = new Mesh(geometry, objectMat);
  object.name = "shape";
  object.rotation.x = -Math.PI / 2;
  scene.add(object);
}
export { addShapeToScene };
