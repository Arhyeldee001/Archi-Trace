// ===== dashboard.js - FIXED VERSION (Scrolling & Closing Issues Fixed) =====

document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard initialized - Loading user profile...');
  
  // DOM Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const overlayClick = document.getElementById('overlayClick');
  const startBtn = document.getElementById('startBtn');
  const tutorialBtn = document.getElementById('tutorialBtn');
  const saveBtn = document.getElementById('saveBtn');
  const themeToggle = document.getElementById('themeToggle');
  
  // Settings form elements
  const usernameInput = document.getElementById('username');
  const avatarInput = document.getElementById('avatar');
  const avatarPreview = document.getElementById('avatarPreview');
  const opacitySlider = document.getElementById('opacity');
  const scaleSlider = document.getElementById('scale');
  const lockByDefaultCheckbox = document.getElementById('lockByDefault');

  // State
  let isPanelOpen = false;
  let currentUser = null;

  // Initialize
  initTheme();
  loadProfile();
  setupEventListeners();

  // ===== THEME FUNCTIONS =====
  function initTheme() {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeButton(savedTheme);
    } else {
      // Use system preference
      const systemTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      updateThemeButton(systemTheme);
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeButton(newTheme);
      }
    });
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
    
    console.log('Theme toggled to:', newTheme);
    showToast(`Switched to ${newTheme} mode`, 'success');
  }

  function updateThemeButton(theme) {
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    }
  }

  // ===== PROFILE LOADING =====
  async function loadProfile() {
    console.log('Loading user profile from /dashboard-user...');
    
    try {
      const res = await fetch("/dashboard-user", { 
        credentials: "same-origin",
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.ok) {
        const user = await res.json();
        currentUser = user;
        console.log('User profile loaded:', user);
        
        // Update username in settings panel
        if (usernameInput && user.username) {
          usernameInput.value = user.username;
          console.log('Username set to:', user.username);
        }
        
        // Update avatar in settings panel
        if (avatarPreview && user.avatar) {
          const avatarUrl = user.avatar.startsWith('http') ? 
            user.avatar : `/static/avatars/${user.avatar}`;
          
          avatarPreview.src = avatarUrl;
          avatarPreview.style.display = 'block';
          avatarPreview.onerror = () => {
            console.warn('Avatar failed to load, using fallback');
            avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=2563eb&color=fff&size=128`;
          };
          console.log('Avatar URL set to:', avatarUrl);
        } else if (avatarPreview) {
          // No avatar from server, use default
          const defaultName = user.username || 'User';
          avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=2563eb&color=fff&size=128`;
          avatarPreview.style.display = 'block';
        }
        
        // Load user preferences
        if (user.preferences) {
          const prefs = user.preferences;
          
          if (opacitySlider && prefs.default_opacity !== undefined) {
            opacitySlider.value = prefs.default_opacity;
            console.log('Opacity set to:', prefs.default_opacity);
          }
          
          if (scaleSlider && prefs.default_scale !== undefined) {
            scaleSlider.value = prefs.default_scale;
            console.log('Scale set to:', prefs.default_scale);
          }
          
          if (lockByDefaultCheckbox && prefs.lock_by_default !== undefined) {
            lockByDefaultCheckbox.checked = prefs.lock_by_default;
            console.log('Lock by default set to:', prefs.lock_by_default);
          }
        }
        
        // Save to localStorage for offline use
        const settings = {
          username: user.username || '',
          avatar: avatarPreview ? avatarPreview.src : '',
          opacity: opacitySlider ? parseFloat(opacitySlider.value) || 0.8 : 0.8,
          scale: scaleSlider ? parseFloat(scaleSlider.value) || 1.0 : 1.0,
          lockByDefault: lockByDefaultCheckbox ? lockByDefaultCheckbox.checked || false : false
        };
        
        localStorage.setItem('archiTraceSettings', JSON.stringify(settings));
        console.log('Profile loaded successfully');
        
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
      
    } catch (err) {
      console.log('Profile load failed:', err);
      
      // Fallback to localStorage
      loadSettingsFromLocalStorage();
      
      // Set defaults
      if (usernameInput) {
        usernameInput.value = 'Guest';
      }
      
      if (avatarPreview) {
        avatarPreview.src = 'https://ui-avatars.com/api/?name=Guest&background=2563eb&color=fff&size=128';
        avatarPreview.style.display = 'block';
      }
    }
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Theme toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
      console.log('Theme toggle button found');
    }
    
    // Open settings panel
    if (settingsBtn) {
      settingsBtn.addEventListener('click', openSettingsPanel);
    }
    
    // Close settings panel
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', closeSettingsPanel);
    }
    
    // FIX: Only close when clicking directly on overlay background
    if (overlayClick) {
      overlayClick.addEventListener('click', function(event) {
        // Only close if clicking directly on overlay (not bubbled from panel)
        if (event.target === overlayClick) {
          closeSettingsPanel();
        }
      });
    }
    
    // FIX: Prevent clicks inside panel from closing it
    if (settingsPanel) {
      settingsPanel.addEventListener('click', function(event) {
        event.stopPropagation(); // Stop click from bubbling to overlay
      });
    }
    
    // Save settings
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    
    // Avatar upload
    if (avatarInput) {
      avatarInput.addEventListener('change', handleAvatarUpload);
    }
    
    // Navigation buttons
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        window.location.href = "/tracer";
      });
    }
    
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', () => {
        window.location.href = "/tutorials";
      });
    }
    
    // Close panel with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isPanelOpen) {
        closeSettingsPanel();
      }
    });
  }

  // ===== SETTINGS PANEL FUNCTIONS =====
  function openSettingsPanel() {
    console.log('Opening settings panel');
    
    if (settingsPanel) {
      settingsPanel.classList.add('open');
      overlayClick.classList.add('active');
      isPanelOpen = true;
      
      // Add class to body to prevent scrolling
      document.body.classList.add('panel-open');
      
      // Refresh profile data when opening panel
      loadProfile();
    }
  }

  function closeSettingsPanel() {
    console.log('Closing settings panel');
    
    if (settingsPanel) {
      settingsPanel.classList.remove('open');
      overlayClick.classList.remove('active');
      isPanelOpen = false;
      
      // Remove class from body to restore scrolling
      document.body.classList.remove('panel-open');
    }
  }

  // ===== SETTINGS MANAGEMENT =====
  function loadSettingsFromLocalStorage() {
    console.log('Loading settings from localStorage...');
    
    const saved = localStorage.getItem('archiTraceSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        console.log('Loaded settings:', settings);
        
        if (usernameInput && settings.username) {
          usernameInput.value = settings.username;
        }
        
        if (opacitySlider && settings.opacity !== undefined) {
          opacitySlider.value = settings.opacity;
        }
        
        if (scaleSlider && settings.scale !== undefined) {
          scaleSlider.value = settings.scale;
        }
        
        if (lockByDefaultCheckbox && settings.lockByDefault !== undefined) {
          lockByDefaultCheckbox.checked = settings.lockByDefault;
        }
        
        if (avatarPreview && settings.avatar) {
          avatarPreview.src = settings.avatar;
          avatarPreview.style.display = 'block';
        }
        
      } catch (e) {
        console.error('Error parsing localStorage:', e);
      }
    }
  }

  async function saveSettings() {
    console.log('Saving settings...');
    
    if (!saveBtn) return;
    
    // Get current values
    const settings = {
      username: usernameInput ? usernameInput.value || '' : '',
      opacity: opacitySlider ? parseFloat(opacitySlider.value) || 0.8 : 0.8,
      scale: scaleSlider ? parseFloat(scaleSlider.value) || 1.0 : 1.0,
      lockByDefault: lockByDefaultCheckbox ? lockByDefaultCheckbox.checked || false : false,
      avatar: avatarPreview ? avatarPreview.src || '' : ''
    };
    
    console.log('Settings to save:', settings);
    
    // Save to localStorage
    localStorage.setItem('archiTraceSettings', JSON.stringify(settings));
    
    // Save to backend if user is logged in
    if (currentUser) {
      await saveToBackend(settings);
    } else {
      showToast('Settings saved locally', 'info');
    }
    
    // Show save confirmation
    showSaveConfirmation();
  }

  async function saveToBackend(settings) {
    try {
      console.log('Saving to backend...');
      
      const response = await fetch("/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: settings.username,
          preferences: {
            default_opacity: settings.opacity,
            default_scale: settings.scale,
            lock_by_default: settings.lockByDefault
          }
        })
      });
      
      if (response.ok) {
        console.log('Settings saved to backend');
        showToast('Settings saved successfully', 'success');
      } else {
        throw new Error('Backend save failed');
      }
    } catch (error) {
      console.error('Failed to save to backend:', error);
      showToast('Settings saved locally', 'info');
    }
  }

  // ===== AVATAR UPLOAD =====
  function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('Avatar selected:', file.name, file.type, file.size);
    
    // Validate
    if (!file.type.match('image.*')) {
      showToast('Please select an image file', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = function(e) {
      if (avatarPreview) {
        avatarPreview.src = e.target.result;
        avatarPreview.style.display = 'block';
      }
      
      // Upload to backend
      uploadAvatar(file);
      
      // Auto-save
      setTimeout(() => saveSettings(), 500);
    };
    
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch("/update-profile", {
        method: "POST",
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Avatar uploaded:', data);
        showToast('Avatar updated', 'success');
        
        if (data.avatar && avatarPreview) {
          avatarPreview.src = `/static/avatars/${data.avatar}`;
        }
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      showToast('Avatar saved locally', 'info');
    }
  }

  // ===== UI HELPER FUNCTIONS =====
  function showSaveConfirmation() {
    if (!saveBtn) return;
    
    const originalText = saveBtn.textContent;
    const originalHTML = saveBtn.innerHTML;
    
    saveBtn.textContent = '✓ Saved!';
    saveBtn.classList.add('save-success');
    saveBtn.disabled = true;
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.innerHTML = originalHTML;
      saveBtn.classList.remove('save-success');
      saveBtn.disabled = false;
    }, 1500);
  }

  function showToast(message, type = 'success') {
    console.log('Toast:', message);
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Show with animation
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    });
    
    // Hide after delay
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // ===== INITIALIZATION COMPLETE =====
  console.log('Dashboard fully initialized');
  
  // Expose for debugging
  window.dashboard = {
    toggleTheme,
    loadProfile,
    openSettingsPanel,
    closeSettingsPanel
  };
});