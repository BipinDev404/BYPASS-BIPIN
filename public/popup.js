const $ = id => document.getElementById(id);
let unlocked = false;

// Custom Modal Logic
function customAlert(message) {
  return new Promise(resolve => {
    $('custom-modal-title').innerText = 'Alert';
    $('custom-modal-message').innerText = message;
    $('custom-modal-input').style.display = 'none';
    $('custom-modal-cancel').style.display = 'none';
    $('custom-modal-overlay').style.display = 'flex';
    
    $('custom-modal-ok').onclick = () => {
      $('custom-modal-overlay').style.display = 'none';
      resolve();
    };
  });
}

function customPrompt(message) {
  return new Promise(resolve => {
    $('custom-modal-title').innerText = 'Verification Required';
    $('custom-modal-message').innerText = message;
    $('custom-modal-input').style.display = 'block';
    $('custom-modal-input').value = '';
    $('custom-modal-cancel').style.display = 'block';
    $('custom-modal-overlay').style.display = 'flex';
    $('custom-modal-input').focus();
    
    $('custom-modal-ok').onclick = () => {
      const val = $('custom-modal-input').value;
      $('custom-modal-overlay').style.display = 'none';
      resolve(val);
    };
    
    $('custom-modal-cancel').onclick = () => {
      $('custom-modal-overlay').style.display = 'none';
      resolve(null);
    };
  });
}

// Mock chrome.storage.local if not running in extension
if (typeof chrome === 'undefined' || !chrome.storage) {
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    local: {
      get: function(keys, callback) {
        let result = {};
        keys.forEach(key => {
          const val = localStorage.getItem('chrome_storage_' + key);
          if (val) {
            try {
              result[key] = JSON.parse(val);
            } catch (e) {
              result[key] = val;
            }
          }
        });
        setTimeout(() => callback(result), 0);
      },
      set: function(items, callback) {
        for (const [key, value] of Object.entries(items)) {
          localStorage.setItem('chrome_storage_' + key, JSON.stringify(value));
        }
        if (callback) setTimeout(callback, 0);
      }
    }
  };
}

// Theme Toggle Logic
const savedTheme = localStorage.getItem('bypass-theme') || 'dark';
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
  $('icon-moon').style.display = 'none';
  $('icon-sun').style.display = 'block';
}
if (window.parent !== window) {
  setTimeout(() => window.parent.postMessage({ action: 'theme_changed', theme: savedTheme }, '*'), 50);
}

$('theme-toggle').onclick = () => {
  const isLight = document.body.classList.toggle('light-theme');
  const newTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('bypass-theme', newTheme);
  
  if (isLight) {
    $('icon-moon').style.display = 'none';
    $('icon-sun').style.display = 'block';
  } else {
    $('icon-moon').style.display = 'block';
    $('icon-sun').style.display = 'none';
  }
  
  if (window.parent !== window) {
    window.parent.postMessage({ action: 'theme_changed', theme: newTheme }, '*');
  }
};

function lockVault() {
  unlocked = false;
  if ($('master')) $('master').value = '';
  ['setup-section', 'unlock-section', 'forgot-section', 'how-to-use-section', 'vault-section'].forEach(id => {
    if ($(id)) $(id).style.display = 'none';
  });
  if (appConfig) {
    $('unlock-section').style.display = 'flex';
  } else {
    $('setup-section').style.display = 'flex';
  }
}

if ($('close-vault')) {
  $('close-vault').onclick = () => {
    lockVault();
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'close_bypass_vault' }, '*');
    } else {
      window.close();
    }
  };
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'lock_vault') {
    lockVault();
  }
});

let appConfig = null;

// Initialize app state
chrome.storage.local.get(['bypass_config'], (res) => {
  if (res.bypass_config) {
    appConfig = res.bypass_config;
    if (appConfig.name) {
      $('display-name').innerText = appConfig.name.toUpperCase();
    }
    $('unlock-section').style.display = 'flex';
  } else {
    $('setup-section').style.display = 'flex';
  }
});

function showError(elId, msg) {
  const el = $(elId);
  el.innerText = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// Setup Flow
$('setup-btn').onclick = () => {
  const name = $('setup-name').value.trim();
  const master = $('setup-master').value;
  const confirm = $('setup-master-confirm').value;
  const question = $('setup-question').value.trim();
  const answer = $('setup-answer').value.trim();

  if (!name || !master || !confirm || !question || !answer) {
    return showError('setup-error', 'Please fill all fields.');
  }
  if (master !== confirm) {
    return showError('setup-error', 'Passwords do not match.');
  }
  
  appConfig = { name, master, question, answer: answer.toLowerCase() };
  chrome.storage.local.set({ bypass_config: appConfig }, () => {
    $('display-name').innerText = name.toUpperCase();
    $('setup-section').style.display = 'none';
    $('unlock-section').style.display = 'flex';
  });
};

// Unlock Flow
function attemptUnlock() {
  if (appConfig && $('master').value === appConfig.master) {
    unlocked = true;
    $('unlock-section').style.display = 'none';
    $('vault-section').style.display = 'block';
    load();
  } else {
    showError('error-msg', 'Invalid master password.');
  }
}

$('unlock').onclick = attemptUnlock;

$('master').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    attemptUnlock();
  }
});

// Forgot Password Flow
$('forgot-link').onclick = (e) => {
  e.preventDefault();
  if (!appConfig) return;
  $('unlock-section').style.display = 'none';
  $('forgot-section').style.display = 'flex';
  $('forgot-question-text').innerText = appConfig.question;
  $('reset-pw-group').style.display = 'none';
  $('forgot-answer').value = '';
};

$('forgot-verify-btn').onclick = () => {
  const ans = $('forgot-answer').value.trim().toLowerCase();
  if (ans === appConfig.answer) {
    $('forgot-verify-btn').style.display = 'none';
    $('forgot-answer').style.display = 'none';
    $('reset-pw-group').style.display = 'block';
  } else {
    showError('forgot-error', 'Incorrect answer.');
  }
};

$('reset-btn').onclick = () => {
  const master = $('reset-master').value;
  const confirm = $('reset-master-confirm').value;
  
  if (!master || !confirm) return showError('forgot-error', 'Fill all fields.');
  if (master !== confirm) return showError('forgot-error', 'Passwords do not match.');
  
  appConfig.master = master;
  chrome.storage.local.set({ bypass_config: appConfig }, () => {
    $('forgot-section').style.display = 'none';
    $('unlock-section').style.display = 'flex';
    
    // Reset view state
    $('forgot-verify-btn').style.display = 'block';
    $('forgot-answer').style.display = 'block';
    $('reset-pw-group').style.display = 'none';
    $('master').value = '';
  });
};

$('back-to-login-from-forgot').onclick = () => {
  $('forgot-section').style.display = 'none';
  $('unlock-section').style.display = 'flex';
  $('forgot-verify-btn').style.display = 'block';
  $('forgot-answer').style.display = 'block';
  $('reset-pw-group').style.display = 'none';
};

// How to use logic
if ($('how-to-use-link')) {
  $('how-to-use-link').onclick = (e) => {
    e.preventDefault();
    $('unlock-section').style.display = 'none';
    $('how-to-use-section').style.display = 'block';
  };
}

if ($('back-to-login')) {
  $('back-to-login').onclick = () => {
    $('how-to-use-section').style.display = 'none';
    $('unlock-section').style.display = 'flex';
  };
}

$('toggle-add').onclick = () => {
  const form = $('add-form');
  const btn = $('toggle-add');
  if (form.style.display === 'none') {
    form.style.display = 'block';
    btn.innerText = 'Cancel ';
    btn.classList.remove('primary');
  } else {
    form.style.display = 'none';
    btn.innerText = 'New Password + ';
    btn.classList.add('primary');
    // Reset form and update state
    $('name').value = '';
    $('user').value = '';
    $('pass').value = '';
    delete $('save').dataset.editId;
    $('save').innerText = 'Save to Vault';
  }
};

$('gen').onclick = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let p = ''; 
  for (let i = 0; i < 16; i++) p += chars[Math.floor(Math.random() * chars.length)];
  $('pass').value = p;
};

$('save').onclick = () => {
  if (!unlocked) return;
  const name = $('name').value.trim();
  const user = $('user').value.trim();
  const pass = $('pass').value.trim();
  
  if (!name || !user || !pass) return customAlert('Fill all fields');

  chrome.storage.local.get(['vault'], r => {
    let v = r.vault || [];
    const editId = $('save').dataset.editId;
    
    if (editId) {
      const idx = v.findIndex(x => x.id == editId);
      if (idx !== -1) {
        v[idx] = { id: parseInt(editId), name, user, pass };
      }
      delete $('save').dataset.editId;
      $('save').innerText = 'Save to Vault';
    } else {
      v.push({ id: Date.now(), name, user, pass });
    }
    
    chrome.storage.local.set({ vault: v }, () => {
      $('name').value = '';
      $('user').value = '';
      $('pass').value = '';
      $('add-form').style.display = 'none';
      $('toggle-add').innerText = '+ Add New Password';
      $('toggle-add').classList.add('primary');
      load();
    });
  });
};

function renderList(items) {
  const ul = $('list'); 
  ul.innerHTML = '';
  
  items.forEach(e => {
    // Generate best-guess domain for the icon
    const domain = e.name.toLowerCase().replace(/\s+/g, '') + '.com';
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="li-header">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <img src="https://icons.duckduckgo.com/ip3/${domain}.ico" width="18" height="18" style="background: rgba(255,255,255,0.8); border-radius: 4px; padding: 2px;" onerror="this.style.display='none'">
          <span class="li-name">${e.name}</span>
          <span style="color: #666; font-size: 14px; margin: 0 4px;">|</span>
          <span class="li-user" style="margin-top: 0;">${e.user}</span>
        </div>
      </div>
      
      <div id="inline-pass-${e.id}" class="inline-pass" style="display: none; padding: 10px; margin-top: 10px; background: #000; border: 1px solid #333; border-radius: 6px; font-family: monospace; font-size: 14px; color: #fff; word-break: break-all; transition: all 0.3s ease;">
        ${e.pass}
      </div>

      <div class="actions">
        <button class="view-btn" data-id="${e.id}" data-pass="${e.pass}">
          <svg class="icon-view" style="vertical-align: middle; margin-right: 4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <svg class="icon-hide" style="vertical-align: middle; margin-right: 4px; display: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          <span class="btn-text">VIEW</span>
        </button>
        <button class="copy-btn" data-pass="${e.pass}">
          <svg style="vertical-align: middle; margin-right: 4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          COPY
        </button>
        <button class="update-btn" data-id="${e.id}" data-name="${e.name}" data-user="${e.user}" data-pass="${e.pass}">
          <svg style="vertical-align: middle; margin-right: 4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          UPDATE
        </button>
        <button class="btn-del" data-id="${e.id}">
          <svg style="vertical-align: middle; margin-right: 4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          DELETE
        </button>
      </div>
    `;
    ul.appendChild(li);
  });

  // Attach Copy events
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = (event) => {
      navigator.clipboard.writeText(event.target.closest('button').dataset.pass);
      const original = event.target.closest('button').innerHTML;
      event.target.closest('button').innerHTML = 'Copied!';
      setTimeout(() => event.target.closest('button').innerHTML = original, 1200);
    };
  });

  // Attach View events
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = (event) => {
      const button = event.target.closest('button');
      const passBox = $('inline-pass-' + button.dataset.id);
      const isHidden = passBox.style.display === 'none';
      
      if (isHidden) {
        passBox.style.display = 'block';
        passBox.classList.add('inline-pass-anim');
        button.querySelector('.icon-view').style.display = 'none';
        button.querySelector('.icon-hide').style.display = 'inline-block';
        button.querySelector('.btn-text').innerText = 'HIDE';
      } else {
        passBox.style.display = 'none';
        passBox.classList.remove('inline-pass-anim');
        button.querySelector('.icon-view').style.display = 'inline-block';
        button.querySelector('.icon-hide').style.display = 'none';
        button.querySelector('.btn-text').innerText = 'VIEW';
      }
    };
  });

  // Attach Update events
  document.querySelectorAll('.update-btn').forEach(btn => {
    btn.onclick = (event) => {
      const b = event.target.closest('button');
      $('name').value = b.dataset.name;
      $('user').value = b.dataset.user;
      $('pass').value = b.dataset.pass;
      $('save').innerText = 'Update Password';
      $('save').dataset.editId = b.dataset.id;
      $('add-form').style.display = 'block';
      $('toggle-add').innerText = 'Cancel ';
      $('toggle-add').classList.remove('primary');
      $('add-form').scrollIntoView({ behavior: 'smooth' });
    };
  });

  // Attach Delete events
  document.querySelectorAll('.btn-del').forEach(btn => {
    btn.onclick = (event) => {
      const id = parseInt(event.target.dataset.id);
      chrome.storage.local.get(['vault'], r => {
        const v = (r.vault || []).filter(x => x.id !== id);
        chrome.storage.local.set({ vault: v }, load);
      });
    };
  });
  
  if ($('dev-credit')) {
    // Only check the absolute vault length, not the filtered items, so it always stays if they have >= 5 items total
    chrome.storage.local.get(['vault'], r => {
      const totalItems = r.vault ? r.vault.length : 0;
      $('dev-credit').style.display = totalItems >= 5 ? 'block' : 'none';
    });
  }
}

function load() {
  chrome.storage.local.get(['vault'], r => renderList(r.vault || []));
}

$('search').oninput = e => {
  const q = e.target.value.toLowerCase();
  chrome.storage.local.get(['vault'], r => {
    const filtered = (r.vault || []).filter(x => 
      x.name.toLowerCase().includes(q) || x.user.toLowerCase().includes(q)
    );
    renderList(filtered);
  });
};

$('export-btn').onclick = async () => {
  if (!unlocked) return;
  const pw = await customPrompt("Please enter your Master Password to export your vault:");
  if (pw !== appConfig.master) {
    if (pw !== null) await customAlert("Incorrect Master Password.");
    return;
  }
  chrome.storage.local.get(['vault'], async r => {
    const v = r.vault || [];
    if (v.length === 0) return await customAlert('Vault is empty!');
    
    // Create JSON blob
    const dataStr = JSON.stringify(v, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `bypass_vault_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); // Firefox requirement
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

$('import-btn').onclick = async () => {
  if (!unlocked) return;
  const pw = await customPrompt("Please enter your Master Password to import passwords:");
  if (pw !== appConfig.master) {
    if (pw !== null) await customAlert("Incorrect Master Password.");
    return;
  }
  $('import-file').click();
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if(lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  
  const results = [];
  for(let i = 1; i < lines.length; i++) {
    let chars = lines[i];
    let fields = [];
    let current = '';
    let inQuotes = false;
    for(let j = 0; j < chars.length; j++) {
      let c = chars[j];
      if(c === '"') {
        if(inQuotes && chars[j+1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if(c === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    fields.push(current);
    
    let item = {};
    for(let j = 0; j < headers.length; j++) {
      item[headers[j]] = fields[j] ? fields[j].trim() : '';
    }
    results.push(item);
  }
  return results;
}

$('import-file').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      let data = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const parsed = parseCSV(event.target.result);
        data = parsed.map(item => ({
          name: item.name || item.url || 'Unknown',
          user: item.username || item.user || item.email || 'Unknown',
          pass: item.password || item.pass || ''
        })).filter(item => item.pass !== '');
      } else {
        data = JSON.parse(event.target.result);
      }
      
      if (!Array.isArray(data)) throw new Error('Invalid format');
      
      chrome.storage.local.get(['vault'], r => {
        let v = r.vault || [];
        const existingMap = new Set(v.map(item => item.name + '|' + item.user));
        let addedCount = 0;
        
        data.forEach(item => {
          if (item.name && item.user && item.pass) {
            const key = item.name + '|' + item.user;
            if (!existingMap.has(key)) {
              v.push({
                id: Date.now() + Math.random(),
                name: item.name,
                user: item.user,
                pass: item.pass
              });
              existingMap.add(key);
              addedCount++;
            }
          }
        });
        
        chrome.storage.local.set({ vault: v }, () => {
          load();
          customAlert(`Import successful! Added ${addedCount} new items.`);
        });
      });
    } catch (err) {
      customAlert('Error parsing file. Please ensure it is a valid BYPASS JSON export or a standard CSV format.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
};