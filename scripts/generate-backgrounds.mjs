import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'public', 'devotional-backgrounds');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BACKGROUNDS = [
  { stops: [['#FF6B35','0%'],['#F7C59F','30%'],['#EFEFD0','60%'],['#004E89','100%']], angle: 135 },
  { stops: [['#0F2027','0%'],['#203A43','40%'],['#2C5364','100%']], angle: 180 },
  { stops: [['#FFF1EB','0%'],['#ACE0F9','100%']], angle: 135 },
  { stops: [['#200122','0%'],['#6F0000','100%']], angle: 160 },
  { stops: [['#E8CBC0','0%'],['#636FA4','100%']], angle: 135 },
  { stops: [['#F0C27F','0%'],['#4B1248','100%']], angle: 135 },
  { stops: [['#1A2980','0%'],['#26D0CE','100%']], angle: 135 },
  { stops: [['#C33764','0%'],['#1D2671','100%']], angle: 135 },
  { stops: [['#FDC830','0%'],['#F37335','100%']], angle: 135 },
  { stops: [['#00B4DB','0%'],['#0083B0','100%']], angle: 180 },
  { stops: [['#2C3E50','0%'],['#4CA1AF','100%']], angle: 135 },
  { stops: [['#F5AF19','0%'],['#F12711','100%']], angle: 160 },
  { stops: [['#373B44','0%'],['#4286F4','100%']], angle: 135 },
  { stops: [['#834D9B','0%'],['#D04ED6','100%']], angle: 135 },
  { stops: [['#DA4453','0%'],['#89216B','100%']], angle: 135 },
  { stops: [['#1F1C2C','0%'],['#928DAB','100%']], angle: 135 },
  { stops: [['#FF9966','0%'],['#FF5E62','100%']], angle: 135 },
  { stops: [['#56AB2F','0%'],['#A8E063','100%']], angle: 135 },
  { stops: [['#614385','0%'],['#516395','100%']], angle: 135 },
  { stops: [['#000428','0%'],['#004E92','100%']], angle: 180 },
  { stops: [['#3A1C71','0%'],['#D76D77','50%'],['#FFAF7B','100%']], angle: 135 },
  { stops: [['#4568DC','0%'],['#B06AB3','100%']], angle: 135 },
  { stops: [['#EC6F66','0%'],['#F3A183','100%']], angle: 135 },
  { stops: [['#FFC371','0%'],['#FF5F6D','100%']], angle: 160 },
  { stops: [['#11998E','0%'],['#38EF7D','100%']], angle: 135 },
  { stops: [['#FC5C7D','0%'],['#6A82FB','100%']], angle: 135 },
  { stops: [['#0F0C29','0%'],['#302B63','50%'],['#24243E','100%']], angle: 180 },
  { stops: [['#FEAC5E','0%'],['#C779D0','50%'],['#4BC0C8','100%']], angle: 135 },
  { stops: [['#A770EF','0%'],['#CF8BF3','50%'],['#FDB99B','100%']], angle: 135 },
  { stops: [['#0B486B','0%'],['#F56217','100%']], angle: 135 },
  { stops: [['#1D4350','0%'],['#A43931','100%']], angle: 160 },
  { stops: [['#E65C00','0%'],['#F9D423','100%']], angle: 135 },
  { stops: [['#2B5876','0%'],['#4E4376','100%']], angle: 135 },
  { stops: [['#141E30','0%'],['#243B55','100%']], angle: 180 },
  { stops: [['#FF416C','0%'],['#FF4B2B','100%']], angle: 135 },
  { stops: [['#654EA3','0%'],['#EAAFC8','100%']], angle: 135 },
  { stops: [['#009FFF','0%'],['#EC2F4B','100%']], angle: 135 },
  { stops: [['#C0392B','0%'],['#8E44AD','100%']], angle: 160 },
  { stops: [['#3C3B3F','0%'],['#605C3C','100%']], angle: 135 },
  { stops: [['#0F3443','0%'],['#34E89E','100%']], angle: 135 },
  { stops: [['#D38312','0%'],['#A83279','100%']], angle: 135 },
  { stops: [['#1E130C','0%'],['#9A8478','100%']], angle: 180 },
  { stops: [['#005AA7','0%'],['#FFFDE4','100%']], angle: 135 },
  { stops: [['#E55D87','0%'],['#5FC3E4','100%']], angle: 135 },
  { stops: [['#403B4A','0%'],['#E7E9BB','100%']], angle: 160 },
  { stops: [['#F09819','0%'],['#EDDE5D','100%']], angle: 135 },
  { stops: [['#780206','0%'],['#061161','100%']], angle: 135 },
  { stops: [['#1488CC','0%'],['#2B32B2','100%']], angle: 135 },
  { stops: [['#CC2B5E','0%'],['#753A88','100%']], angle: 160 },
  { stops: [['#42275A','0%'],['#734B6D','100%']], angle: 135 },
];

function buildSvg(bg, index) {
  const w = 1080, h = 1080;
  const stops = bg.stops.map(([color, offset]) =>
    `<stop offset="${offset}" stop-color="${color}"/>`
  ).join('\n      ');

  const angle = bg.angle || 135;
  const rad = (angle * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  const seed = index * 137;
  const cx1 = 20 + (seed % 60);
  const cy1 = 15 + ((seed * 3) % 50);
  const r1 = 200 + (seed % 200);
  const cx2 = 60 + ((seed * 7) % 30);
  const cy2 = 50 + ((seed * 11) % 40);
  const r2 = 150 + ((seed * 5) % 180);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      ${stops}
    </linearGradient>
    <radialGradient id="glow1" cx="${cx1}%" cy="${cy1}%" r="${r1 / 10}%">
      <stop offset="0%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="${cx2}%" cy="${cy2}%" r="${r2 / 10}%">
      <stop offset="0%" stop-color="white" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow1)"/>
  <rect width="${w}" height="${h}" fill="url(#glow2)"/>
  <circle cx="${cx1 * w / 100}" cy="${cy1 * h / 100}" r="${r1}" fill="white" fill-opacity="0.04" filter="url(#blur)"/>
  <circle cx="${cx2 * w / 100}" cy="${cy2 * h / 100}" r="${r2}" fill="white" fill-opacity="0.03" filter="url(#blur)"/>
</svg>`;
}

async function generate() {
  console.log(`Generating ${BACKGROUNDS.length} background images...`);
  for (let i = 0; i < BACKGROUNDS.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const svg = buildSvg(BACKGROUNDS[i], i);
    const outPath = join(OUT, `bg${num}.jpg`);
    await sharp(Buffer.from(svg))
      .resize(1080, 1080)
      .jpeg({ quality: 85 })
      .toFile(outPath);
    console.log(`  Created bg${num}.jpg`);
  }
  console.log('Done!');
}

generate().catch(console.error);
