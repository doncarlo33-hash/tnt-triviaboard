const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'public');

const filesToCompress = [
  {
    name: 'opening-theme.mp3',
    args: ['-i', path.join(publicDir, 'opening-theme.mp3'), '-b:a', '96k', path.join(publicDir, 'opening-theme-compressed.mp3')]
  },
  {
    name: 'tnt-animation.mp4',
    args: ['-i', path.join(publicDir, 'tnt-animation.mp4'), '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', '-vf', 'scale=-2:720', path.join(publicDir, 'tnt-animation-compressed.mp4')]
  },
  {
    name: 'opening-finale-sync.mp4',
    args: ['-i', path.join(publicDir, 'opening-finale-sync.mp4'), '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', '-vf', 'scale=-2:720', path.join(publicDir, 'opening-finale-sync-compressed.mp4')]
  }
];

console.log(`Using ffmpeg at ${ffmpeg}`);

for (const file of filesToCompress) {
  console.log(`\nCompressing ${file.name}...`);
  try {
    const outPath = file.args[file.args.length - 1];
    if (fs.existsSync(outPath)) {
      fs.unlinkSync(outPath);
    }
    execSync(`"${ffmpeg}" ${file.args.map(a => `"${a}"`).join(' ')}`, { stdio: 'inherit' });
    console.log(`Success! Replaced file...`);
    fs.renameSync(outPath, path.join(publicDir, file.name));
  } catch (error) {
    console.error(`Failed to compress ${file.name}:`, error.message);
  }
}

console.log('\nCompression complete!');
