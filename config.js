// config.js


const CONFIG = {
  IMGBB_API_KEY: '0536db87cc9bc37357c549a93ec3cf5a',
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