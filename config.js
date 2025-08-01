// config.js


const CONFIG = {
  IMGBB_API_KEY: '8fb6c49d1ec7b148d7e626cbef3f6be7',
  GROQ_API_KEY: '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',
};
window.CONFIG = CONFIG;

console.log('Configuration loaded:');
console.log('- ImgBB API Key configured:', CONFIG.IMGBB_API_KEY !== 'YOUR_IMGBB_API_KEY_HERE');
console.log('- Groq API Key configured:', CONFIG.GROQ_API_KEY !== 'YOUR_GROQ_API_KEY_HERE');

if (CONFIG.IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE' && CONFIG.GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    console.log('⚠️ No API keys configured. The app will work with simulated data.');
    console.log('To use real AI analysis:');
    console.log('1. Get ImgBB API key from: https://api.imgbb.com/');
    console.log('2. Get Groq API key from: https://console.groq.com/');
    console.log('3. Replace the placeholder values in config.js');
}