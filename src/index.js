import initOpenCascade from "opencascade.js";

import {
  loadSTEPorIGES,
  setupThreeJSViewport,
  addShapeToScene,
} from './library';

const scene = setupThreeJSViewport();
console.log('index.js')
initOpenCascade().then(openCascade => {
  document.getElementById("step-file").addEventListener('input', async (event) => { await loadSTEPorIGES(openCascade, event.srcElement.files[0], addShapeToScene, scene); });
});
