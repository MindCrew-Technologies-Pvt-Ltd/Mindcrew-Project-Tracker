const importDynamic = new Function('modulePath', 'return import(modulePath)');

async function run() {
  try {
    const pdfjsLib = await importDynamic('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('pdfjsLib loaded successfully');
    console.log('Version:', pdfjsLib.version);
  } catch (err) {
    console.error('Error loading pdfjs-dist:', err);
  }
}

run();
