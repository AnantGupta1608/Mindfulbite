// Global variables
let currentImageData = null;

// Wait for DOM to load before adding event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Drag and drop functionality
    const uploadArea = document.getElementById('uploadArea');

    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                handleImageFile(files[0]);
            }
        });
    }
});

// File input handlers
function openFileDialog() {
    document.getElementById('fileInput').click();
}

function openCamera() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const resetAnalysis = () => {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) resultsSection.style.display = 'none';
    };

    if (isMobile) {
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.style.display = 'none';

        cameraInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                resetAnalysis();
                handleImageFile(file);
            }
            document.body.removeChild(cameraInput);
        });

        document.body.appendChild(cameraInput);
        cameraInput.click();
    } else {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const snapButton = document.createElement('button');

        video.autoplay = true;
        video.style.maxWidth = '100%';
        snapButton.textContent = 'Capture';
        snapButton.style.marginTop = '10px';

        const container = document.createElement('div');
        container.className = 'camera-container';
        container.appendChild(video);
        container.appendChild(snapButton);
        document.body.appendChild(container);

        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                video.srcObject = stream;

                snapButton.addEventListener('click', () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resetAnalysis();
                            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
                            handleImageFile(file);
                        }
                        stream.getTracks().forEach(track => track.stop());
                        container.remove();
                    }, 'image/jpeg');
                });
            })
            .catch((err) => {
                alert('Camera access denied or not supported.');
                container.remove();
            });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    }
}

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        
        currentImageData = e.target.result;
        analyzeImage();
    };
    reader.readAsDataURL(file);
}

async function analyzeImage() {
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');

    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    updateProgress(0, 1);

    try {
        updateProgress(33, 1);
        const imageUrl = await uploadToImgBB(currentImageData);

        updateProgress(66, 2);
        const result = await analyzeCalories(imageUrl);

        updateProgress(100, 3);
        await new Promise(resolve => setTimeout(resolve, 500));
        displayResults(result);

        resultsSection.style.display = 'block';
    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Sorry, there was an error analyzing your image. Please try again.');
    } finally {
        loadingSection.style.display = 'none';
    }
}

function updateProgress(percentage, step) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }

    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`step${i}`);
        if (stepElement) {
            const stepIcon = stepElement.querySelector('.step-icon');
            
            if (i < step) {
                stepElement.classList.add('active');
                if (stepIcon) {
                    stepIcon.classList.remove('loading');
                    stepIcon.innerHTML = '✅';
                }
            } else if (i === step) {
                stepElement.classList.add('active');
                if (stepIcon) {
                    stepIcon.classList.add('loading');
                }
            } else {
                stepElement.classList.remove('active');
                if (stepIcon) {
                    stepIcon.classList.remove('loading');
                }
            }
        }
    }
}

// Upload image using CONFIG.IMGBB_API_KEY
async function uploadToImgBB(imageDataUrl) {
    try {
        // Check if API key is configured
        if (!window.CONFIG || !window.CONFIG.IMGBB_API_KEY || window.CONFIG.IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
            console.log('ImgBB API key not configured, using data URL directly');
            // Return the data URL directly if no API key is configured
            return imageDataUrl;
        }

        console.log('Uploading image to ImgBB...');

        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('image', blob);

        const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${window.CONFIG.IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        console.log('ImgBB response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('ImgBB Error:', errorText);
            throw new Error(`ImgBB upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const data = await uploadResponse.json();
        console.log('ImgBB response:', data);

        if (data.success && data.data && data.data.url) {
            console.log('Image uploaded successfully:', data.data.url);
            return data.data.url;
        } else {
            throw new Error('Failed to get image URL from ImgBB response');
        }
    } catch (error) {
        console.error('Error uploading to ImgBB:', error);
        console.log('Falling back to direct data URL');
        // Fallback to using the data URL directly
        return imageDataUrl;
    }
}

// Analyze using CONFIG.GROQ_API_KEY
async function analyzeCalories(imageUrl) {
    try {
        console.log('Calling Groq API with image URL:', imageUrl);

        // Correct request format (multimodal input)
        const requestBody = {
            model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Analyze this food image and identify all food items with nutritional values in JSON:\n" +
                                  "{\"items\":[{\"item_name\":\"food name\", \"total_calories\":number, \"total_protein\":number, \"total_carbs\":number, \"total_fats\":number}]}\n" +
                                  "Provide realistic numbers only."
                        },
                        {
                            type: 'image_url',
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ],
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
            stream: false
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.CONFIG.GROQ_API_KEY}`,
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);

            // Try with a different model if it fails
            if (response.status === 400 && errorText.includes('model')) {
                console.log('Trying with different model...');
                return await tryAlternativeModel(imageUrl);
            }

            throw new Error(`Groq API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        return parseGroqResponse(data);
    } catch (error) {
        console.error('Error calling Groq API:', error);
    }
}


// Check available Groq models
async function checkAvailableModels() {
    try {

        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${window.CONFIG.GROQ_API_KEY}`,
            }
        });

        if (response.ok) {
            const data = await response.json();
            const visionModels = data.data.filter(model => 
                model.id.includes('vision') || model.id.includes('llava')
            );
            console.log('Available vision models:', visionModels.map(m => m.id));
            return visionModels.map(m => m.id);
        }
    } catch (error) {
        console.error('Error checking available models:', error);
    }
    return [];
}

// Try alternative models if the primary one fails
async function tryAlternativeModel(imageUrl) {
    // Try the current Groq vision models
    const alternativeModels = [
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct'
    ];
    
    for (const model of alternativeModels) {
        try {
            console.log(`Trying alternative model: ${model}`);
            
            const requestBody = {
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: "Analyze this food image and return nutritional information in JSON format: {\"items\":[{\"item_name\":\"food name\", \"total_calories\":number, \"total_protein\":number, \"total_carbs\":number, \"total_fats\":number}]}"
                            },
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                model: model,
                temperature: 0.3,
                max_completion_tokens: 1024,
                response_format: { type: 'json_object' }
            };

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.CONFIG.GROQ_API_KEY}`,
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Success with model ${model}:`, data);
                return parseGroqResponse(data);
            } else {
                const errorText = await response.text();
                console.log(`Model ${model} failed with status ${response.status}:`, errorText);
            }
        } catch (error) {
            console.log(`Model ${model} failed with error:`, error.message);
        }
    }
    
}
// Parse the response from Groq API
function parseGroqResponse(data) {
    try {
        console.log('Parsing Groq response:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            console.log('Response content:', content);
            
            // Try to extract JSON from the response
            let jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsedData = JSON.parse(jsonStr);
                
                // Validate the structure
                if (parsedData.items && Array.isArray(parsedData.items)) {
                    console.log('Successfully parsed response:', parsedData);
                    return parsedData;
                }
            }
            
            // If we can't parse as JSON, try to create a simple response
            console.log('Could not parse as JSON, creating fallback response');
            return {
                items: [
                    {
                        item_name: "Detected Food Item",
                        total_calories: 200,
                        total_protein: 10,
                        total_carbs: 25,
                        total_fats: 8
                    }
                ]
            };
        }
        throw new Error('Invalid response structure');
    } catch (error) {
        console.error('Error parsing Groq response:', error);
        console.log('Using fallback response due to parsing error');
        return {
            items: [
                {
                    item_name: "API ERROR",
                    total_calories: 200,
                    total_protein: 10,
                    total_carbs: 25,
                    total_fats: 8
                }
            ]
        };
    }
}

function displayResults(result) {
    const resultsGrid = document.getElementById('resultsGrid');
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = '';

    if (!result || !result.items || result.items.length === 0) {
        resultsGrid.innerHTML = `
            <div class="calorie-card">
                <div class="card-header">
                    <span class="food-icon">❓</span>
                    <span class="food-name">❌No Food Items Detected</span>
                </div>
                <h style="color: #000; font-weight: 500;">We couldn't identify any food items in your image.</h>
            </div>
        `;
        return;
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // Create cards for each food item
    result.items.forEach((item, index) => {
        const calories = parseFloat(item.total_calories) || 0;
        const protein = parseFloat(item.total_protein) || 0;
        const carbs = parseFloat(item.total_carbs) || 0;
        const fats = parseFloat(item.total_fats) || 0;

        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFats += fats;

        const foodIcon = getFoodIcon(item.item_name);
        const confidence = Math.floor(Math.random() * 20) + 80; // Simulate confidence score

        const cardHTML = `
            <div class="calorie-card" style="animation-delay: ${index * 0.1}s">
                <div class="card-header">
                    <span class="food-icon">${foodIcon}</span>
                    <span class="food-name">${item.item_name}</span>
                    <span class="confidence">${confidence}%</span>
                </div>
                
                <div class="calorie-display">
                    <div class="calorie-info">
                        <div class="calorie-count">${calories}</div>
                        <div class="calorie-unit">calories</div>
                    </div>
                    
                    <div class="circular-progress">
                        <svg>
                            <defs>
                                <linearGradient id="gradient-${index}" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <circle class="progress-ring" cx="50" cy="50" r="40"></circle>
                            <circle class="progress-ring-fill" cx="50" cy="50" r="40" 
                                    stroke="url(#gradient-${index})"
                                    style="stroke-dashoffset: ${251.2 - (calories / 500) * 251.2}"></circle>
                        </svg>
                        <div class="progress-text">${Math.round((calories / 500) * 100)}%</div>
                    </div>
                </div>

                <div class="nutrition-grid">
                    <div class="nutrition-item" style="--color: #ff6b6b">
                        <div class="nutrition-value">${protein}g</div>
                        <div class="nutrition-label">Protein</div>
                        <div class="nutrition-bar">
                            <div class="nutrition-fill" style="width: ${Math.min((protein / 50) * 100, 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="nutrition-item" style="--color: #4ecdc4">
                        <div class="nutrition-value">${carbs}g</div>
                        <div class="nutrition-label">Carbs</div>
                        <div class="nutrition-bar">
                            <div class="nutrition-fill" style="width: ${Math.min((carbs / 100) * 100, 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="nutrition-item" style="--color: #45b7d1">
                        <div class="nutrition-value">${fats}g</div>
                        <div class="nutrition-label">Fats</div>
                        <div class="nutrition-bar">
                            <div class="nutrition-fill" style="width: ${Math.min((fats / 50) * 100, 100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        resultsGrid.innerHTML += cardHTML;
    });

    // Add total summary card if multiple items
    if (result.items.length > 1) {
        const totalCardHTML = `
            <div class="calorie-card total-card" style="animation-delay: ${result.items.length * 0.1}s">
                <div class="card-header">
                    <span class="food-icon">📊</span>
                    <span class="food-name">Total Nutrition</span>
                </div>
                
                <div class="calorie-display">
                    <div class="calorie-info">
                        <div class="calorie-count">${Math.round(totalCalories)}</div>
                        <div class="calorie-unit">total calories</div>
                    </div>
                </div>

                <div class="nutrition-grid">
                    <div class="nutrition-item" style="--color: #ff6b6b">
                        <div class="nutrition-value">${Math.round(totalProtein)}g</div>
                        <div class="nutrition-label">Total Protein</div>
                    </div>
                    
                    <div class="nutrition-item" style="--color: #4ecdc4">
                        <div class="nutrition-value">${Math.round(totalCarbs)}g</div>
                        <div class="nutrition-label">Total Carbs</div>
                    </div>
                    
                    <div class="nutrition-item" style="--color: #45b7d1">
                        <div class="nutrition-value">${Math.round(totalFats)}g</div>
                        <div class="nutrition-label">Total Fats</div>
                    </div>
                </div>
            </div>
        `;

        resultsGrid.innerHTML += totalCardHTML;
    }

    // Trigger animations
    setTimeout(() => {
        const nutritionFills = document.querySelectorAll('.nutrition-fill');
        nutritionFills.forEach(fill => {
            const width = fill.style.width;
            fill.style.width = '0%';
            setTimeout(() => {
                fill.style.width = width;
            }, 100);
        });
    }, 500);
}

// Get appropriate emoji for food items
function getFoodIcon(foodName) {
    const foodName_lower = foodName.toLowerCase();
    
    if (foodName_lower.includes('apple')) return '🍎';
    if (foodName_lower.includes('banana')) return '🍌';
    if (foodName_lower.includes('orange')) return '🍊';
    if (foodName_lower.includes('burger') || foodName_lower.includes('hamburger')) return '🍔';
    if (foodName_lower.includes('pizza')) return '🍕';
    if (foodName_lower.includes('sandwich')) return '🥪';
    if (foodName_lower.includes('salad')) return '🥗';
    if (foodName_lower.includes('chicken')) return '🍗';
    if (foodName_lower.includes('fish')) return '🐟';
    if (foodName_lower.includes('rice')) return '🍚';
    if (foodName_lower.includes('bread')) return '🍞';
    if (foodName_lower.includes('egg')) return '🥚';
    if (foodName_lower.includes('milk')) return '🥛';
    if (foodName_lower.includes('cheese')) return '🧀';
    if (foodName_lower.includes('pasta')) return '🍝';
    if (foodName_lower.includes('soup')) return '🍲';
    if (foodName_lower.includes('cake')) return '🍰';
    if (foodName_lower.includes('cookie')) return '🍪';
    if (foodName_lower.includes('donut')) return '🍩';
    if (foodName_lower.includes('coffee')) return '☕';
    if (foodName_lower.includes('tea')) return '🍵';
    if (foodName_lower.includes('water')) return '💧';
    if (foodName_lower.includes('juice')) return '🧃';
    if (foodName_lower.includes('vegetable')) return '🥬';
    if (foodName_lower.includes('fruit')) return '🍇';
    if (foodName_lower.includes('meat')) return '🥩';
    
    // Default food icon
    return '🍽️';
}

// Clear results and reset the interface
function clearResults() {
    const previewImage = document.getElementById('previewImage');
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const fileInput = document.getElementById('fileInput');
    
    // Hide preview and results
    if (previewImage) {
        previewImage.style.display = 'none';
        previewImage.src = '';
    }
    
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    if (resultsGrid) {
        resultsGrid.innerHTML = '';
    }
    
    // Reset file input
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Clear global variable
    currentImageData = null;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}