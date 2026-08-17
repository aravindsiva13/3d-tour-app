const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const directories = [
  'public/media/360',
  'public/media/gallery/interior',
  'public/media/gallery/exterior'
];

async function optimizeImages() {
  for (const dir of directories) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

    for (const file of files) {
      if (file.endsWith('.webp')) continue;
      
      const inputPath = path.join(dirPath, file);
      const outputName = file.replace(/\.(png|jpe?g)$/i, '.webp');
      const outputPath = path.join(dirPath, outputName);

      if (fs.existsSync(outputPath)) {
        console.log(`Skipping (already exists): ${outputPath}`);
        continue;
      }

      console.log(`Optimizing: ${inputPath} -> ${outputPath}`);
      try {
        await sharp(inputPath)
          .webp({ quality: 80, effort: 4 })
          .toFile(outputPath);
          
        console.log(`✓ Optimized: ${outputName}`);
      } catch (err) {
        console.error(`✗ Error processing ${file}:`, err);
      }
    }
  }
}

optimizeImages().then(() => console.log('Done optimizing images!'));
