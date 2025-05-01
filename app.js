
const upload = document.getElementById('upload');
const canvasOriginal = document.getElementById('canvasOriginal');
const canvasPosterized = document.getElementById('canvasPosterized');
const ctxOriginal = canvasOriginal.getContext('2d');
const ctxPosterized = canvasPosterized.getContext('2d');
const download = document.getElementById('download');
const analysis = document.getElementById('analysis');
const valueSlider = document.getElementById('valueSlider');
const chromaSlider = document.getElementById('chromaSlider');
const notanToggle = document.getElementById('notanToggle');
const simplifyShapesToggle = document.getElementById('simplifyShapesToggle');
const simplifyColorToggle = document.getElementById('simplifyColorToggle');
const gridToggle = document.getElementById('gridToggle');

let originalImage = null;

upload.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      valueSlider.value = 6;
      canvasOriginal.width = canvasPosterized.width = img.width;
      canvasOriginal.height = canvasPosterized.height = img.height;
      ctxOriginal.drawImage(img, 0, 0);
      originalImage = img;
      analyzeImage();
      renderPosterized();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function renderPosterized() {
  if (!originalImage) return;
  ctxPosterized.clearRect(0, 0, canvasPosterized.width, canvasPosterized.height);
  ctxPosterized.drawImage(originalImage, 0, 0);

  if (notanToggle.checked) {
    applyNotan();
  } else else { applyPosterization(parseInt(valueSlider.value)); }
    applyPosterization(parseInt(valueSlider.value));
  }

  simplifyColors();
    simplifyColors();
  }

  if (gridToggle.checked) {
    drawGrid();
  }
}

function applyNotan() {
  const imageData = ctxPosterized.getImageData(0, 0, canvasPosterized.width, canvasPosterized.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    const val = brightness > 128 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = val;
  }
  ctxPosterized.putImageData(imageData, 0, 0);
}

function applyPosterization(levels) {
  const imageData = ctxPosterized.getImageData(0, 0, canvasPosterized.width, canvasPosterized.height);
  const data = imageData.data;
  const step = Math.floor(255 / (levels - 1));
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
  ctxPosterized.putImageData(imageData, 0, 0);
}

function simplifyColors() {
  const imageData = ctxPosterized.getImageData(0, 0, canvasPosterized.width, canvasPosterized.height);
  const data = imageData.data;
  const chromaScale = chromaSlider.value / 100;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    data[i] = avg + (data[i] - avg) * chromaScale;
    data[i+1] = avg + (data[i+1] - avg) * chromaScale;
    data[i+2] = avg + (data[i+2] - avg) * chromaScale;
  }
  ctxPosterized.putImageData(imageData, 0, 0);
}

function drawGrid() {
  const thirdsX = canvasPosterized.width / 3;
  const thirdsY = canvasPosterized.height / 3;
  ctxPosterized.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let i = 1; i < 3; i++) {
    let x = i * thirdsX;

    ctxPosterized.beginPath();
    ctxPosterized.moveTo(x, 0);
    ctxPosterized.lineTo(x, canvasPosterized.height);
    ctxPosterized.stroke();
  }
  for (let i = 1; i < 3; i++) {
    let y = i * thirdsY;

    ctxPosterized.beginPath();
    ctxPosterized.moveTo(0, y);
    ctxPosterized.lineTo(canvasPosterized.width, y);
    ctxPosterized.stroke();
  }
}

function analyzeImage() {
  const imageData = ctxOriginal.getImageData(0, 0, canvasOriginal.width, canvasOriginal.height);
  const data = imageData.data;
  let total = 0, totalSq = 0, n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    total += brightness;
    totalSq += brightness * brightness;
  }
  const mean = total / n;
  const stdDev = Math.sqrt(totalSq / n - mean * mean);
  const contrast = (stdDev / mean) * 100;

  const gray = new Uint8ClampedArray(canvasOriginal.width * canvasOriginal.height);
  const edgeMask = new Uint8ClampedArray(canvasOriginal.width * canvasOriginal.height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
  }
  for (let y = 1; y < canvasOriginal.height - 1; y++) {
    for (let x = 1; x < canvasOriginal.width - 1; x++) {
      const i = y * canvasOriginal.width + x;
      const dx = gray[i+1] - gray[i-1];
      const dy = gray[i+canvasOriginal.width] - gray[i-canvasOriginal.width];
      const gradient = Math.sqrt(dx*dx + dy*dy);
      edgeMask[i] = gradient > 30 ? 1 : 0;
    }
  }
  const edgePixels = edgeMask.reduce((a, b) => a + b, 0);
  const simplicity = 100 - (edgePixels / (canvasOriginal.width * canvasOriginal.height)) * 100;

  let comment = '';
  if (contrast >= 48 && simplicity >= 65) {
    comment = "✅ This image has strong value contrast and clear shapes — ideal for painting.";
  } else if (contrast < 48 && simplicity >= 85) {
    comment = "🌻 This image is shape-driven and beautifully simplified — paintable even with subtle contrast.";
  } else if (contrast < 48 && simplicity >= 70) {
    comment = "✨ Subtle value drama with strong shape clarity — beautifully paintable with restraint.";
  } else if (contrast >= 43 && simplicity >= 63) {
    comment = "🟡 Borderline — gentle contrast and moderate clarity. Could be great with simplification.";
  } else if (contrast < 48 && simplicity >= 65) {
    comment = "⚠️ Strong shapes, but low value contrast. Consider boosting light/dark separation.";
  } else if (contrast >= 48 && simplicity < 65) {
    comment = "⚠️ Good contrast, but many small shapes. Try squinting or simplifying.";
  } else {
    comment = "❌ This image may be too flat or complex for painting. Consider another reference.";
  }

  analysis.innerHTML =
    `<strong>🌗 Value Contrast:</strong> ${contrast.toFixed(2)}%<br>
     <strong>🔲 Edge Simplicity:</strong> ${simplicity.toFixed(2)}%<br>
     <em>${comment}</em>`;
}

valueSlider.addEventListener('input', renderPosterized);
chromaSlider.addEventListener('input', renderPosterized);
notanToggle.addEventListener('change', renderPosterized);
simplifyShapesToggle.addEventListener('change', renderPosterized);
simplifyColorToggle.addEventListener('change', renderPosterized);
gridToggle.addEventListener('change', renderPosterized);

download.addEventListener('click', function() {
  const link = document.createElement('a');
  link.download = 'posterized-image.png';
  link.href = canvasPosterized.toDataURL();
  link.click();
});
