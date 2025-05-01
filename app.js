
const upload = document.getElementById('upload');
const canvasOriginal = document.getElementById('canvasOriginal');
const canvasPosterized = document.getElementById('canvasPosterized');
const ctxOriginal = canvasOriginal.getContext('2d');
const ctxPosterized = canvasPosterized.getContext('2d');
const download = document.getElementById('download');
const analysis = document.getElementById('analysis');

upload.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Resize canvas to image
      canvasOriginal.width = canvasPosterized.width = img.width;
      canvasOriginal.height = canvasPosterized.height = img.height;

      // Draw original image
      ctxOriginal.drawImage(img, 0, 0);

      // Run analysis on original image
      analyzeImage();

      // Draw 6-value posterized image
      ctxPosterized.drawImage(img, 0, 0);
      posterizeImage(6); // default to 6 values
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
});

function calculateValueContrast(imageData) {
  const data = imageData.data;
  let total = 0;
  let totalSq = 0;
  const n = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    total += brightness;
    totalSq += brightness * brightness;
  }

  const mean = total / n;
  const stdDev = Math.sqrt(totalSq / n - mean * mean);
  const contrastPercent = (stdDev / mean) * 100;
  return contrastPercent.toFixed(2);
}

function calculateEdgeSimplicity(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = new Uint8ClampedArray(width * height);
  const edgeMask = new Uint8ClampedArray(width * height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i+1];
    const b = imageData.data[i+2];
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const dx = gray[i+1] - gray[i-1];
      const dy = gray[i+width] - gray[i-width];
      const gradient = Math.sqrt(dx*dx + dy*dy);
      edgeMask[i] = gradient > 30 ? 1 : 0;
    }
  }

  const edgePixels = edgeMask.reduce((a, b) => a + b, 0);
  const simplicity = 100 - (edgePixels / (width * height)) * 100;
  return simplicity.toFixed(2);
}

function analyzeImage() {
  const imageData = ctxOriginal.getImageData(0, 0, canvasOriginal.width, canvasOriginal.height);
  const contrast = parseFloat(calculateValueContrast(imageData));
  const simplicity = parseFloat(calculateEdgeSimplicity(ctxOriginal, canvasOriginal.width, canvasOriginal.height));

  let comment = '';
  if (contrast >= 48 && simplicity >= 65) {
    comment = "✅ This image has strong value contrast and clear shapes — ideal for painting.";
  } else if (contrast < 48 && simplicity >= 85) {
    comment = "🌻 This image is shape-driven and beautifully simplified — paintable even with subtle contrast.";
  } else if (contrast < 48 && simplicity >= 70) {
    comment = "✨ This image has subtle value drama with strong shape clarity — beautifully paintable with restraint.";
  } else if (contrast >= 43 && simplicity >= 63) {
    comment = "🟡 This image is borderline — gentle contrast and moderate clarity. Could be great with simplification.";
  } else if (contrast < 48 && simplicity >= 65) {
    comment = "⚠️ Strong shapes, but low value contrast. Consider boosting light/dark separation.";
  } else if (contrast >= 48 && simplicity < 65) {
    comment = "⚠️ Good contrast, but many small shapes. Try squinting or simplifying.";
  } else {
    comment = "❌ This image may be too flat or complex for painting. Consider another reference.";
  }

  analysis.innerHTML =
    `<strong>🌗 Value Contrast:</strong> ${contrast}%<br>
     <strong>🔲 Edge Simplicity:</strong> ${simplicity}%<br>
     <em>${comment}</em>`;
}

function posterizeImage(levels) {
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

download.addEventListener('click', function() {
  const link = document.createElement('a');
  link.download = 'posterized-image.png';
  link.href = canvasPosterized.toDataURL();
  link.click();
});
