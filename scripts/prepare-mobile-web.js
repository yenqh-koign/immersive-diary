const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'mobile-web');

const filesToCopy = [
    'index.html',
    'manifest.webmanifest',
    'service-worker.js'
];

const directoriesToCopy = [
    'assets',
    'src'
];

const nodeModuleAssets = [
    ['node_modules', 'quill', 'dist', 'quill.js'],
    ['node_modules', 'quill', 'dist', 'quill.snow.css'],
    ['node_modules', 'jszip', 'dist', 'jszip.min.js'],
    ['node_modules', 'file-saver', 'dist', 'FileSaver.min.js']
];

function ensureDirectory(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function removeDirectory(targetPath) {
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
    }
}

function copyFileRelative(relativePath) {
    const sourcePath = path.join(projectRoot, relativePath);
    const destinationPath = path.join(outputDir, relativePath);
    ensureDirectory(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectoryRelative(relativePath) {
    const sourcePath = path.join(projectRoot, relativePath);
    const destinationPath = path.join(outputDir, relativePath);
    fs.cpSync(sourcePath, destinationPath, {
        recursive: true,
        force: true
    });
}

function main() {
    removeDirectory(outputDir);
    ensureDirectory(outputDir);

    filesToCopy.forEach(copyFileRelative);
    directoriesToCopy.forEach(copyDirectoryRelative);
    nodeModuleAssets.forEach((segments) => copyFileRelative(path.join(...segments)));

    console.log(`Prepared mobile web bundle at ${outputDir}`);
}

main();
