// DOM Elements
const elements = {
    passwordDisplay: document.getElementById('password-display'),
    copyButton: document.getElementById('copy-button'),
    saveButton: document.getElementById('save-button'),
    speakButton: document.getElementById('speak-button'),
    generateButton: document.getElementById('generate-button'),
    clearVault: document.getElementById('clear-vault'),
    themeToggle: document.getElementById('theme-toggle'),
    lengthSlider: document.getElementById('length-slider'),
    lengthValue: document.getElementById('length-value'),
    lengthWarning: document.getElementById('length-warning'),
    strengthText: document.getElementById('password-strength-text'),
    strengthFill: document.querySelector('.strength-fill'),
    vaultList: document.getElementById('vault-list'),
    vaultStatus: document.getElementById('vault-status'),
    pronunciationText: document.getElementById('pronunciation-text'),
    pronunciationGuide: document.getElementById('pronunciation-guide'),
    showPronunciation: document.getElementById('show-pronunciation'),
    lengthDetail: document.getElementById('length-detail'),
    uppercaseDetail: document.getElementById('uppercase-detail'),
    lowercaseDetail: document.getElementById('lowercase-detail'),
    numbersDetail: document.getElementById('numbers-detail'),
    symbolsDetail: document.getElementById('symbols-detail'),
    includeLetters: document.getElementById('include-letters'),
    includeMixedCase: document.getElementById('include-mixed-case'),
    includeNumbers: document.getElementById('include-numbers'),
    includePunctuation: document.getElementById('include-punctuation'),
    noRepeating: document.getElementById('no-repeating'),
    noSequential: document.getElementById('no-sequential'),
    noAmbiguous: document.getElementById('no-ambiguous'),
    customSymbols: document.getElementById('custom-symbols')
};

// State
let passwordHistory = JSON.parse(localStorage.getItem('passwordHistory')) || [];
let currentTheme = localStorage.getItem('theme') || 'light';
let debounceTimer;

// Initialize
function init() {
    updateTheme();
    updateVaultList();
    addEventListeners();
    updateLength();
    generatePassword();
    adaptLayout();
    
    // Initialize pronunciation visibility (default hidden)
    const showPronunciation = localStorage.getItem('showPronunciation') === 'true';
    elements.pronunciationGuide.style.display = showPronunciation ? 'flex' : 'none';
    elements.showPronunciation.checked = showPronunciation;
    
    // Setup collapsible sections
    document.querySelectorAll('.collapsible').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
        });
    });
}

// Event Listeners
function addEventListeners() {
    elements.generateButton.addEventListener('click', generatePassword);
    elements.copyButton.addEventListener('click', copyPassword);
    elements.saveButton.addEventListener('click', savePassword);
    elements.speakButton.addEventListener('click', speakPassword);
    elements.clearVault.addEventListener('click', clearVault);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.lengthSlider.addEventListener('input', updateLength);
    
    // Pronunciation toggle listener
    elements.showPronunciation.addEventListener('change', (e) => {
        const show = e.target.checked;
        localStorage.setItem('showPronunciation', show);
        elements.pronunciationGuide.style.display = show ? 'flex' : 'none';
    });
    
    // Option change listeners
    const options = [
        elements.includeLetters,
        elements.includeMixedCase,
        elements.includeNumbers,
        elements.includePunctuation,
        elements.noRepeating,
        elements.noSequential,
        elements.noAmbiguous,
        elements.customSymbols
    ];
    
    options.forEach(option => {
        option.addEventListener('change', generatePassword);
    });
    
    // Responsive listeners
    window.addEventListener('resize', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            adaptLayout();
        }, 100);
    });
}

// Theme Functions
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Password Generation
function generatePassword() {
    const length = parseInt(elements.lengthSlider.value);
    const options = getOptions();
    
    // Don't generate if no character types selected
    if (!options.letters && !options.numbers && !options.symbols) {
        showToast('Please select at least one character type');
        return;
    }
    
    let password = '';
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        password = generatePasswordAttempt(length, options);
        attempts++;
    } while (attempts < maxAttempts && !validatePassword(password, options));
    
    elements.passwordDisplay.value = password;
    updatePasswordDetails(password);
    updatePasswordStrength(password);
    updatePronunciation(password);
    
    // Show warning if password is very weak
    if (length <= 4) {
        showToast('Warning: Very short passwords are insecure');
    }
}

function getOptions() {
    const length = Math.max(4, parseInt(elements.lengthSlider.value));
    return {
        length: length,
        letters: elements.includeLetters.checked,
        mixedCase: elements.includeMixedCase.checked,
        numbers: elements.includeNumbers.checked,
        symbols: elements.includePunctuation.checked,
        noRepeating: elements.noRepeating.checked,
        noSequential: elements.noSequential.checked,
        noAmbiguous: elements.noAmbiguous.checked,
        customSymbols: elements.customSymbols.value
    };
}

function generatePasswordAttempt(length, options) {
    let charset = '';
    const ambiguousChars = '1lI0Oo';
    
    if (options.letters) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (options.mixedCase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.numbers) charset += '0123456789';
    if (options.symbols) charset += options.customSymbols || '!@#$%^&*';
    
    if (options.noAmbiguous) {
        charset = charset.split('').filter(c => !ambiguousChars.includes(c)).join('');
    }
    
    if (!charset) return '';
    
    let password = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    
    // Ensure at least one of each selected type
    if (options.letters) password += getRandomChar('abcdefghijklmnopqrstuvwxyz', array[0]);
    if (options.mixedCase) password += getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ', array[1]);
    if (options.numbers) password += getRandomChar('0123456789', array[2]);
    if (options.symbols) password += getRandomChar(options.customSymbols || '!@#$%^&*', array[3]);
    
    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
        let char;
        let attempts = 0;
        
        do {
            char = charset[array[i] % charset.length];
            attempts++;
            
            if (attempts > 50) break;
            
            if (options.noRepeating && i > 0 && char === password[i-1]) continue;
            
            if (options.noSequential && i > 0) {
                const prevChar = password[i-1];
                if (isSequential(prevChar, char)) continue;
            }
            
            break;
        } while (true);
        
        password += char;
    }
    
    return shuffleString(password);
}

function getRandomChar(charset, randomValue) {
    return charset[randomValue % charset.length];
}

function isSequential(a, b) {
    const charCodeA = a.charCodeAt(0);
    const charCodeB = b.charCodeAt(0);
    return Math.abs(charCodeB - charCodeA) === 1;
}

function shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
}

function validatePassword(password, options) {
    if (!password) return false;
    
    if (options.letters && !/[a-z]/.test(password)) return false;
    if (options.mixedCase && !/[A-Z]/.test(password)) return false;
    if (options.numbers && !/\d/.test(password)) return false;
    if (options.symbols && !new RegExp(`[${escapeRegExp(options.customSymbols || '!@#$%^&*')}]`).test(password)) return false;
    
    if (options.noRepeating) {
        for (let i = 1; i < password.length; i++) {
            if (password[i] === password[i-1]) return false;
        }
    }
    
    if (options.noSequential) {
        for (let i = 1; i < password.length; i++) {
            if (isSequential(password[i-1], password[i])) return false;
        }
    }
    
    return true;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Password Actions
function copyPassword() {
    const password = elements.passwordDisplay.value;
    if (!password) return;
    
    navigator.clipboard.writeText(password).then(() => {
        showToast('Password copied to clipboard!');
    });
}

function speakPassword() {
    const password = elements.passwordDisplay.value;
    if (!password) return;
    
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = elements.pronunciationText.textContent || password.split('').join(' ');
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
}

function savePassword() {
    const password = elements.passwordDisplay.value;
    if (!password) {
        showToast('No password to save');
        return;
    }

    if (password.length <= 6) {
        if (!confirm('This password is very short. Are you sure you want to save it?')) {
            return;
        }
    }

    const name = prompt('Name this password (optional):', `Password ${passwordHistory.length + 1}`);
    if (name === null) return;

    const entry = {
        id: Date.now(),
        name: name || `Password ${passwordHistory.length + 1}`,
        password: password,
        date: new Date().toLocaleString(),
        strength: elements.strengthText.textContent
    };

    passwordHistory.unshift(entry);
    if (passwordHistory.length > 50) passwordHistory.pop();

    localStorage.setItem('passwordHistory', JSON.stringify(passwordHistory));
    updateVaultList();
    showToast(`"${entry.name}" saved to vault`);
}

// Password Analysis
function updatePasswordDetails(password) {
    if (!password) {
        elements.lengthDetail.textContent = '0';
        elements.uppercaseDetail.textContent = '0';
        elements.lowercaseDetail.textContent = '0';
        elements.numbersDetail.textContent = '0';
        elements.symbolsDetail.textContent = '0';
        return;
    }
    
    elements.lengthDetail.textContent = password.length;
    elements.uppercaseDetail.textContent = (password.match(/[A-Z]/g) || []).length;
    elements.lowercaseDetail.textContent = (password.match(/[a-z]/g) || []).length;
    elements.numbersDetail.textContent = (password.match(/\d/g) || []).length;
    elements.symbolsDetail.textContent = (password.match(/[^a-zA-Z0-9]/g) || []).length;
}

function updatePasswordStrength(password) {
    if (!password) {
        elements.strengthText.textContent = 'Strength: -';
        elements.strengthFill.style.width = '0%';
        return;
    }
    
    let score = 0;
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    const uniqueChars = new Set(password).size;
    
    if (length >= 16) score += 4;
    else if (length >= 12) score += 3;
    else if (length >= 8) score += 2;
    else if (length >= 6) score += 1;
    else if (length <= 4) score = 0;
    
    if (hasUpper && hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbol) score += 1;
    
    if (uniqueChars >= length * 0.9) score += 1;
    else if (uniqueChars >= length * 0.7) score += 0.5;
    
    if (/(.)\1{2,}/.test(password)) score -= 1;
    if (/(abc|123|987|zyx)/i.test(password)) score -= 1;
    
    let strength, width, color;
    if (length <= 4) {
        strength = 'Very Weak';
        width = '10%';
        color = 'var(--danger)';
    } else if (length <= 6 || score <= 2) {
        strength = 'Weak';
        width = '20%';
        color = 'var(--danger)';
    } else if (length <= 8 || score <= 3) {
        strength = 'Fair';
        width = '40%';
        color = 'var(--warning)';
    } else if (length <= 12 || score <= 5) {
        strength = 'Good';
        width = '60%';
        color = 'var(--success)';
    } else if (length <= 16 || score <= 7) {
        strength = 'Strong';
        width = '80%';
        color = 'var(--primary)';
    } else {
        strength = 'Excellent';
        width = '100%';
        color = 'var(--secondary)';
    }
    
    elements.strengthText.textContent = `Strength: ${strength}`;
    elements.strengthFill.style.width = width;
    elements.strengthFill.style.backgroundColor = color;
}

function updatePronunciation(password) {
    if (!password) {
        elements.pronunciationText.textContent = '';
        return;
    }
    
    const pronunciationMap = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '!': 'exclamation', '@': 'at', '#': 'hash', '$': 'dollar',
        '%': 'percent', '^': 'caret', '&': 'and', '*': 'asterisk'
    };
    
    let pronunciation = '';
    for (const char of password) {
        if (pronunciationMap[char]) {
            pronunciation += pronunciationMap[char] + ' ';
        } else {
            pronunciation += char + ' ';
        }
    }
    
    elements.pronunciationText.textContent = pronunciation.trim();
}

// Vault Management
function updateVaultList() {
    elements.vaultList.innerHTML = '';
    
    if (passwordHistory.length === 0) {
        elements.vaultStatus.textContent = 'No passwords saved in vault';
        return;
    }
    
    elements.vaultStatus.textContent = `${passwordHistory.length} password${passwordHistory.length !== 1 ? 's' : ''} in vault`;
    
    passwordHistory.forEach(entry => {
        const li = document.createElement('li');
        li.dataset.id = entry.id;
        
        const entryDiv = document.createElement('div');
        entryDiv.className = 'vault-entry';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'vault-entry-name';
        nameSpan.textContent = entry.name;
        
        const passSpan = document.createElement('span');
        passSpan.className = 'vault-entry-password';
        passSpan.textContent = '••••••••';
        passSpan.addEventListener('click', () => {
            passSpan.textContent = passSpan.textContent === '••••••••' 
                ? entry.password 
                : '••••••••';
        });
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'vault-entry-date';
        dateSpan.textContent = entry.date;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'vault-entry-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy password';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(entry.password);
            showToast(`Copied: ${entry.name}`);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete from vault';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFromVault(entry.id);
        });
        
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(deleteBtn);
        
        entryDiv.appendChild(nameSpan);
        entryDiv.appendChild(passSpan);
        entryDiv.appendChild(dateSpan);
        
        li.appendChild(entryDiv);
        li.appendChild(actionsDiv);
        
        elements.vaultList.appendChild(li);
    });
}

function deleteFromVault(id) {
    if (!confirm('Delete this password from vault?')) return;
    
    passwordHistory = passwordHistory.filter(entry => entry.id !== id);
    localStorage.setItem('passwordHistory', JSON.stringify(passwordHistory));
    updateVaultList();
    showToast('Password removed from vault');
}

function clearVault() {
    if (!confirm('Clear all passwords from vault? This cannot be undone.')) return;
    
    passwordHistory = [];
    localStorage.removeItem('passwordHistory');
    updateVaultList();
    showToast('Vault cleared');
}

// Helper Functions
function updateLength() {
    const length = elements.lengthSlider.value;
    elements.lengthValue.textContent = length;
    
    if (length < 8) {
        elements.lengthWarning.style.display = 'flex';
    } else {
        elements.lengthWarning.style.display = 'none';
    }
    
    generatePassword();
}

function adaptLayout() {
    const isMobile = window.innerWidth <= 600;
    const isShortScreen = window.innerHeight <= 700;
    
    elements.vaultList.style.maxHeight = isShortScreen ? '25vh' : '200px';
    
    if (isMobile) {
        document.body.style.padding = '8px';
        document.querySelector('.container').style.padding = '12px';
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Initialize
init();