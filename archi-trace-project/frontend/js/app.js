// =========================
// ELEMENTS
// =========================
const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

const imageUpload = document.getElementById("imageUpload");
const opacityInput = document.getElementById("opacity");
const scaleInput = document.getElementById("scale");

const controls = document.getElementById("controls");
const toggleBtn = document.getElementById("toggleControls");
const lockBtn = document.getElementById("lockBtn");

// Profile UI
const profileName = document.getElementById("profileName");
const profileAvatar = document.getElementById("profileAvatar");
const profileBadge = document.getElementById("profileBadge");

// Toast notification
const toast = document.getElementById("toast");

// =========================
// STATE
// =========================
let img = null;
let imgX = 0;
let imgY = 0;
let scale = 1.0;
let opacity = 0.5;
let rotation = 0;
let isLocked = false;

// Touch state
let isDragging = false;
let startX = 0, startY = 0;
let lastDistance = null;
let lastAngle = null;
let initialPinchDistance = null;

// Sensitivity - PERFECT FOR MOBILE
let ROTATION_SENSITIVITY = 0.1;
let SCALE_SENSITIVITY = 0.0015;
let PINCH_DEADZONE = 25;

// Touch boundaries
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const MIN_OPACITY = 0;
const MAX_OPACITY = 1.0;

// Animation
let animationFrameId = null;
let lastRedrawTime = 0;
const REDRAW_INTERVAL = 16;

// Mobile detection
let isMobile = false;
let isIOS = false;
let isAndroid = false;
let isChrome = false;
let cameraStarted = false;
let isHTTPS = window.location.protocol === 'https:';
let isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('192.168.'); // Allow local network IPs

// =========================
// MOBILE DETECTION
// =========================
function detectMobile() {
  const ua = navigator.userAgent;
  isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  isAndroid = /Android/.test(ua);
  isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  
  console.log(`Mobile: ${isMobile}, iOS: ${isIOS}, Android: ${isAndroid}, Chrome: ${isChrome}, HTTPS: ${isHTTPS}, Localhost: ${isLocalhost}`);
}

// =========================
// TOAST NOTIFICATION
// =========================
function showToast(message, type = 'info', duration = 3000) {
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'flex';
  
  if (isMobile) {
    toast.style.top = '12px';
    toast.style.left = '12px';
    toast.style.right = '12px';
    toast.style.maxWidth = 'none';
  }
  
  // Animate in
  toast.style.transform = 'translateY(-20px)';
  toast.style.opacity = '0';
  
  requestAnimationFrame(() => {
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });
  
  // Auto-dismiss
  setTimeout(() => {
    toast.style.transform = 'translateY(-20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, duration);
}

// =========================
// CAMERA SETUP - WORKING FIX FOR ALL BROWSERS
// =========================
async function setupCamera() {
  // Check if camera is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('Camera API not supported');
    showToast('📸 Camera not supported on this browser', 'warning', 3000);
    return;
  }
  
  // Check HTTPS requirement
  // Modern browsers require HTTPS except localhost
  if (!isHTTPS && !isLocalhost) {
    console.log('Camera requires HTTPS or localhost');
    
    // Show camera button for HTTP (will fail but show proper error)
    createCameraButton();
    return;
  }
  
  // Try to start camera automatically
  try {
    await startCameraStream();
  } catch (error) {
    console.log('Auto-camera failed, showing camera button:', error);
    createCameraButton();
  }
}

// Create camera button for manual activation
function createCameraButton() {
  // Remove any existing button
  const existingBtn = document.getElementById('manualCameraBtn');
  if (existingBtn) existingBtn.remove();
  
  // Create camera button
  const cameraBtn = document.createElement('button');
  cameraBtn.id = 'manualCameraBtn';
  cameraBtn.innerHTML = `
    <span class="camera-icon">📸</span>
    <span class="camera-text">Enable Camera</span>
  `;
  
  // Style the button
  cameraBtn.style.cssText = `
    position: fixed;
    bottom: 180px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 16px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    z-index: 1001;
    box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    min-width: 200px;
    justify-content: center;
  `;
  
  // Add styles for icon
  const style = document.createElement('style');
  style.textContent = `
    .camera-icon {
      font-size: 20px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    #manualCameraBtn:active {
      transform: translateX(-50%) scale(0.95);
    }
    
    @media (max-width: 768px) {
      #manualCameraBtn {
        bottom: 160px;
        padding: 14px 20px;
        font-size: 15px;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(cameraBtn);
  
  // Click handler
  cameraBtn.addEventListener('click', async () => {
    cameraBtn.innerHTML = '<span class="loading-spinner-small"></span> Accessing Camera...';
    cameraBtn.style.pointerEvents = 'none';
    cameraBtn.style.opacity = '0.7';
    
    try {
      await startCameraStream();
      
      // Success - hide button
      cameraBtn.style.opacity = '0';
      cameraBtn.style.transform = 'translateX(-50%) scale(0.9)';
      setTimeout(() => {
        cameraBtn.style.display = 'none';
      }, 300);
      
    } catch (error) {
      console.error('Camera access failed:', error);
      
      // Show specific error message
      let errorMessage = 'Camera access failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied';
        if (isAndroid) {
          errorMessage += ' - Check Chrome Settings → Site Settings → Camera';
        } else if (isIOS) {
          errorMessage += ' - Check Safari Settings → Camera';
        }
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on device';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another app';
      } else if (!isHTTPS && !isLocalhost) {
        errorMessage = 'Camera requires HTTPS connection';
      }
      
      showToast(`❌ ${errorMessage}`, 'error', 5000);
      
      // Reset button
      cameraBtn.innerHTML = `
        <span class="camera-icon">📸</span>
        <span class="camera-text">Try Enable Camera</span>
      `;
      cameraBtn.style.pointerEvents = 'auto';
      cameraBtn.style.opacity = '1';
    }
  });
}

// Start camera stream
async function startCameraStream() {
  console.log('Starting camera stream...');
  
  // Stop any existing stream
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
  
  // Camera constraints - different for iOS/Android
  let constraints = {
    video: {
      facingMode: { ideal: "environment" }, // Prefer back camera
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };
  
  // Android Chrome can be more flexible
  if (isAndroid) {
    constraints.video = {
      facingMode: { ideal: "environment" }
      // Don't specify resolution for better compatibility
    };
  }
  
  // iOS needs specific attributes
  if (isIOS) {
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', 'muted');
    video.setAttribute('webkit-playsinline', '');
  }
  
  try {
    // Request camera with timeout
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera timeout')), 10000)
      )
    ]);
    
    console.log('Camera stream obtained');
    
    // Set video source
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 5000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        console.log('Video metadata loaded');
        resolve();
      };
      
      video.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
    });
    
    // Play video
    await video.play();
    
    // Set video styles
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* Mirror for front camera */
      position: absolute;
      top: 0;
      left: 0;
      background: #000;
      display: block !important;
    `;
    
    cameraStarted = true;
    showToast('✅ Camera activated', 'success', 2000);
    
    return true;
    
  } catch (error) {
    console.error('Camera stream error:', error);
    throw error;
  }
}

// =========================
// PROFILE BADGE - FIXED DISPLAY
// =========================
async function loadProfile() {
  try {
    const res = await fetch("/dashboard-user", { 
      credentials: "same-origin",
      headers: { 'Accept': 'application/json' }
    });
    
    if (res.ok) {
      const user = await res.json();
      
      // Update profile name
      if (profileName) {
        profileName.textContent = user.username || 'Guest';
        profileName.style.display = 'block';
      }
      
      // Update profile avatar
      if (profileAvatar) {
        if (user.avatar) {
          // Try different avatar paths
          const avatarUrl = user.avatar.startsWith('http') ? 
            user.avatar : `/avatars/${user.avatar}`;
          
          profileAvatar.src = avatarUrl;
          profileAvatar.onerror = () => {
            // Fallback to default avatar
            profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'Guest')}&background=2563eb&color=fff&size=128`;
          };
        } else {
          // Default avatar
          profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'Guest')}&background=2563eb&color=fff&size=128`;
        }
        profileAvatar.style.display = 'block';
      }
      
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
    
  } catch (err) {
    console.log('Profile load failed:', err);
    
    // Set defaults
    if (profileName) {
      profileName.textContent = 'Guest';
      profileName.style.display = 'block';
    }
    
    if (profileAvatar) {
      profileAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=2563eb&color=fff&size=128';
      profileAvatar.style.display = 'block';
    }
  }
  
  // Ensure badge is visible
  if (profileBadge) {
    profileBadge.style.display = 'flex';
    profileBadge.style.opacity = '1';
    
    // Add click handler
    profileBadge.addEventListener("click", (e) => {
      if (e.target.closest('.theme-toggle')) return;
      
      profileBadge.classList.add('clicked');
      setTimeout(() => {
        profileBadge.classList.remove('clicked');
      }, 300);
      
      setTimeout(() => {
        window.location.href = "/";
      }, 150);
    });
  }
}

// =========================
// CANVAS SETUP & RESIZE
// =========================
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  ctx.scale(dpr, dpr);
  
  // Re-center image if exists
  if (img) {
    centerImage();
  }
  
  redraw();
}

function centerImage() {
  if (!img) return;
  
  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
  
  imgX = (canvasWidth - img.width * scale) / 2;
  imgY = (canvasHeight - img.height * scale) / 2;
}

window.addEventListener("resize", () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(resizeCanvas);
});

// =========================
// IMAGE HANDLING - OPTIMIZED
// =========================
function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error', 3000);
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    img = new Image();
    
    img.onload = () => {
      const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
      
      // Calculate scale to fit 70% of screen
      const scaleX = (canvasWidth * 0.7) / img.width;
      const scaleY = (canvasHeight * 0.7) / img.height;
      scale = Math.min(scaleX, scaleY, 1.0);
      scale = Math.max(scale, 0.3); // Minimum 30%
      
      // Center image
      centerImage();
      rotation = 0;
      
      // Update controls
      if (scaleInput) {
        scaleInput.value = Math.round(scale * 100);
        updateScaleSlider();
      }
      
      if (opacityInput) {
        opacityInput.value = Math.round(opacity * 100);
        updateOpacitySlider();
      }
      
      redraw();
      
      showToast(`✅ Image loaded (${img.width}×${img.height})`, 'success', 2000);
      
      // Auto-expand controls on mobile
      if (isMobile && controls && controls.classList.contains('collapsed') && toggleBtn) {
        setTimeout(() => {
          toggleBtn.click();
        }, 300);
      }
    };
    
    img.onerror = () => {
      showToast('❌ Failed to load image', 'error', 3000);
    };
    
    img.src = e.target.result;
  };
  
  reader.onerror = () => {
    showToast('❌ Failed to read file', 'error', 3000);
  };
  
  reader.readAsDataURL(file);
}

if (imageUpload) {
  imageUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });
}

// =========================
// DRAW FUNCTION - OPTIMIZED
// =========================
function redraw() {
  const now = performance.now();
  if (now - lastRedrawTime < REDRAW_INTERVAL) {
    return;
  }
  
  lastRedrawTime = now;
  
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  
  // Clear with background color
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  
  if (!img) return;
  
  ctx.save();
  ctx.translate(imgX + (img.width * scale) / 2, imgY + (img.height * scale) / 2);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(
    img,
    -img.width * scale / 2,
    -img.height * scale / 2,
    img.width * scale,
    img.height * scale
  );
  
  ctx.restore();
}

// =========================
// CONTROLS - FIXED
// =========================
function updateOpacitySlider() {
  if (!opacityInput) return;
  
  const value = opacityInput.value;
  opacityInput.style.setProperty('--slider-value', `${value}%`);
  opacity = parseInt(value) / 100;
  redraw();
}

function updateScaleSlider() {
  if (!scaleInput) return;
  
  const value = parseInt(scaleInput.value);
  scale = value / 100;
  
  const normalized = ((value - 10) / 490) * 100;
  scaleInput.style.setProperty('--slider-value', `${normalized}%`);
  redraw();
}

if (opacityInput) {
  opacityInput.addEventListener("input", updateOpacitySlider);
  updateOpacitySlider(); // Initial update
}

if (scaleInput) {
  scaleInput.addEventListener("input", updateScaleSlider);
  updateScaleSlider(); // Initial update
}

// =========================
// LOCK BUTTON
// =========================
if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    isLocked = !isLocked;
    
    lockBtn.classList.toggle('locked');
    lockBtn.classList.toggle('unlocked');
    
    if (isLocked) {
      lockBtn.innerHTML = '🔒';
      lockBtn.title = 'Image locked - Tap to unlock';
      showToast('🔒 Image locked', 'success', 1500);
    } else {
      lockBtn.innerHTML = '🔓';
      lockBtn.title = 'Image unlocked - Tap to lock';
      showToast('🔓 Image unlocked', 'info', 1500);
    }
    
    lockBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      lockBtn.style.transform = '';
    }, 150);
  });
}

// =========================
// COLLAPSIBLE CONTROLS - FIXED
// =========================
if (toggleBtn && controls) {
  // Auto-expand on mobile
  if (isMobile) {
    controls.classList.remove('collapsed');
    controls.classList.add('expanded');
    toggleBtn.classList.add('rotated');
    toggleBtn.innerHTML = "▼";
    toggleBtn.title = "Hide controls";
  }
  
  toggleBtn.addEventListener("click", () => {
    const isCollapsed = controls.classList.contains("collapsed");
    
    if (isCollapsed) {
      // Expand
      controls.classList.remove("collapsed");
      controls.classList.add("expanded");
      toggleBtn.classList.add("rotated");
      toggleBtn.innerHTML = "▼";
      toggleBtn.title = "Hide controls";
    } else {
      // Collapse
      controls.classList.add("collapsed");
      controls.classList.remove("expanded");
      toggleBtn.classList.remove("rotated");
      toggleBtn.innerHTML = "▲";
      toggleBtn.title = "Show controls";
    }
    
    // Button feedback
    toggleBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      toggleBtn.style.transform = '';
    }, 150);
  });
}

// =========================
// TOUCH HANDLING - SMOOTH FOR MOBILE
// =========================
function setupTouchHandling() {
  if (!canvas) return;
  
  canvas.addEventListener("touchstart", e => {
    if (isLocked || !img) return;
    
    e.preventDefault();
    
    const touches = e.touches;
    
    if (touches.length === 1) {
      const touch = touches[0];
      isDragging = true;
      startX = touch.clientX - imgX;
      startY = touch.clientY - imgY;
    }
    
    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      lastDistance = Math.sqrt(dx * dx + dy * dy);
      lastAngle = Math.atan2(dy, dx);
    }
  }, { passive: false });
  
  canvas.addEventListener("touchmove", e => {
    if (isLocked || !img) return;
    
    e.preventDefault();
    
    const touches = e.touches;
    
    // Single touch drag
    if (touches.length === 1 && isDragging) {
      const touch = touches[0];
      imgX = touch.clientX - startX;
      imgY = touch.clientY - startY;
      redraw();
    }
    
    // Two touch pinch/rotate
    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx);
      
      // Pinch zoom
      if (lastDistance !== null) {
        const distanceChange = currentDistance - lastDistance;
        
        if (Math.abs(distanceChange) > PINCH_DEADZONE) {
          const scaleChange = distanceChange * SCALE_SENSITIVITY;
          scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + scaleChange));
          
          if (scaleInput) {
            scaleInput.value = Math.round(scale * 100);
            updateScaleSlider();
          }
        }
      }
      
      // Rotation
      if (lastAngle !== null) {
        const angleChange = currentAngle - lastAngle;
        
        if (Math.abs(angleChange) > 0.02) {
          rotation += angleChange * ROTATION_SENSITIVITY;
          if (rotation > Math.PI * 2) rotation -= Math.PI * 2;
          if (rotation < -Math.PI * 2) rotation += Math.PI * 2;
        }
      }
      
      lastDistance = currentDistance;
      lastAngle = currentAngle;
      
      redraw();
    }
  }, { passive: false });
  
  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    isDragging = false;
    lastDistance = null;
    lastAngle = null;
  }, { passive: false });
}

// =========================
// DRAG & DROP
// =========================
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  }
});

// =========================
// INITIALIZATION
// =========================
async function init() {
  try {
    // Detect device
    detectMobile();
    
    // Setup canvas
    resizeCanvas();
    
    // Load profile
    await loadProfile();
    
    // Setup camera
    await setupCamera();
    
    // Setup touch handling
    setupTouchHandling();
    
    // Welcome message
    if (isMobile) {
      if (isHTTPS || isLocalhost) {
        showToast('📱 Upload image or enable camera', 'info', 4000);
      } else {
        showToast('📱 Upload image to start tracing', 'info', 4000);
      }
    }
    
  } catch (error) {
    console.error('Init error:', error);
  }
}

// =========================
// START APPLICATION
// =========================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.log('SW failed:', err));
  });
}