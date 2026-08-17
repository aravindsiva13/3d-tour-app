const fs = require('fs');
const https = require('https');
const path = require('path');

const dirs = [
  'public/media/clips',
  'public/media/posters',
  'public/media/pano',
  'public/media/plans'
];

dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      // Handle redirects for picsum
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log("Downloading mock video...");
  await download('https://www.w3schools.com/html/mov_bbb.mp4', 'public/media/clips/mock.mp4');
  
  console.log("Downloading mock poster...");
  await download('https://picsum.photos/id/10/1920/1080.jpg', 'public/media/posters/mock.jpg');
  
  console.log("Downloading mock panorama...");
  await download('https://picsum.photos/id/16/4096/2048.jpg', 'public/media/pano/mock.jpg');
  
  console.log("Downloading mock plan...");
  await download('https://picsum.photos/id/20/800/800.jpg', 'public/media/plans/mock.jpg');
  
  const clips = [
    'hub-entrance.mp4', 'entrance-hub.mp4',
    'hub-lobby.mp4', 'lobby-hub.mp4',
    'hub-clubhouse.mp4', 'clubhouse-hub.mp4',
    'hub-pool.mp4', 'pool-hub.mp4',
    'hub-residence.mp4', 'residence-hub.mp4'
  ];
  clips.forEach(c => fs.copyFileSync('public/media/clips/mock.mp4', `public/media/clips/${c}`));
  
  const posters = ['hub.jpg', 'entrance.jpg', 'lobby.jpg', 'clubhouse.jpg', 'pool.jpg', 'residence.jpg'];
  posters.forEach(p => fs.copyFileSync('public/media/posters/mock.jpg', `public/media/posters/${p}`));
  
  const panos = ['entrance.jpg', 'clubhouse.jpg', 'residence.jpg'];
  panos.forEach(p => fs.copyFileSync('public/media/pano/mock.jpg', `public/media/pano/${p}`));
  
  const plans = ['3bhk.jpg', '4bhk.jpg', 'penthouse.jpg'];
  plans.forEach(p => fs.copyFileSync('public/media/plans/mock.jpg', `public/media/plans/${p}`));

  console.log("Mock assets populated successfully!");
}

run().catch(console.error);
