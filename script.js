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
    customSymbols: document.getElementById('custom-symbols'),
    qtyLetters: document.getElementById('qty-letters'),
    qtyUppercase: document.getElementById('qty-uppercase'),
    qtyNumbers: document.getElementById('qty-numbers'),
    qtySymbols: document.getElementById('qty-symbols')
};

let passwordHistory = JSON.parse(localStorage.getItem('passwordHistory')) || [];
let currentTheme = localStorage.getItem('theme') || 'light';
let currentUtterance = null;
let isSpeaking = false;
let debounceTimer;

function init() {
    updateTheme();
    updateVaultList();
    addEventListeners();
    updateLength();
    generatePassword();
    adaptLayout();
    
    const showPronunciation = localStorage.getItem('showPronunciation') === 'true';
    elements.pronunciationGuide.style.display = showPronunciation ? 'flex' : 'none';
    elements.showPronunciation.checked = showPronunciation;
    
    document.querySelectorAll('.collapsible').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
        });
    });
}

function addEventListeners() {
    elements.generateButton.addEventListener('click', generatePassword);
    elements.copyButton.addEventListener('click', copyPassword);
    elements.saveButton.addEventListener('click', savePassword);
    elements.speakButton.addEventListener('click', toggleSpeech);
    elements.clearVault.addEventListener('click', clearVault);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.lengthSlider.addEventListener('input', updateLength);
    
    document.getElementById('export-csv')?.addEventListener('click', () => exportVault('csv'));
    document.getElementById('export-txt')?.addEventListener('click', () => exportVault('txt'));
    document.getElementById('export-pdf')?.addEventListener('click', () => exportVault('pdf'));
    
    elements.showPronunciation.addEventListener('change', (e) => {
        const show = e.target.checked;
        localStorage.setItem('showPronunciation', show);
        elements.pronunciationGuide.style.display = show ? 'flex' : 'none';
    });
    
    const options = [
        elements.includeLetters,
        elements.includeMixedCase,
        elements.includeNumbers,
        elements.includePunctuation,
        elements.noRepeating,
        elements.noSequential,
        elements.noAmbiguous,
        elements.customSymbols,
        elements.qtyLetters,
        elements.qtyUppercase,
        elements.qtyNumbers,
        elements.qtySymbols
    ];
    
    options.forEach(option => {
        option?.addEventListener('change', generatePassword);
        option?.addEventListener('input', generatePassword);
    });
    
    window.addEventListener('resize', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            adaptLayout();
        }, 100);
    });
}

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
    if (icon) {
        icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleSpeech() {
    const text = elements.pronunciationText.textContent;
    
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        currentUtterance = null;
        updateSpeakButtonIcon();
        return;
    }
    
    if (!text || text === 'Pronunciation guide will appear here') {
        showToast('Generate a password first');
        return;
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 0.8;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    currentUtterance.onstart = () => {
        isSpeaking = true;
        updateSpeakButtonIcon();
    };
    
    currentUtterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        updateSpeakButtonIcon();
    };
    
    currentUtterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        isSpeaking = false;
        currentUtterance = null;
        updateSpeakButtonIcon();
        showToast('Speech synthesis error: ' + event.error);
    };
    
    window.speechSynthesis.speak(currentUtterance);
}

function updateSpeakButtonIcon() {
    const icon = elements.speakButton.querySelector('i');
    if (icon) {
        icon.className = isSpeaking ? 'fas fa-stop' : 'fas fa-volume-up';
    }
}

function generatePassword() {
    const length = parseInt(elements.lengthSlider.value);
    const options = getOptions();
    
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
    
    if (!password) {
        showToast('Failed to generate password. Adjust your constraints.');
        return;
    }
    
    elements.passwordDisplay.value = password;
    updatePasswordDetails(password);
    updatePasswordStrength(password);
    updatePronunciation(password);
    
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
        customSymbols: elements.customSymbols.value || '!@#$%^&*',
        fixedLetters: Math.max(0, parseInt(elements.qtyLetters.value) || 0),
        fixedUppercase: Math.max(0, parseInt(elements.qtyUppercase.value) || 0),
        fixedNumbers: Math.max(0, parseInt(elements.qtyNumbers.value) || 0),
        fixedSymbols: Math.max(0, parseInt(elements.qtySymbols.value) || 0)
    };
}

function generatePasswordAttempt(length, options) {
    let password = '';
    const ambiguousChars = '1lI0Oo';
    
    let charSets = {
        letters: 'abcdefghijklmnopqrstuvwxyz',
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789',
        symbols: options.customSymbols
    };
    
    if (options.noAmbiguous) {
        Object.keys(charSets).forEach(key => {
            charSets[key] = charSets[key].split('').filter(c => !ambiguousChars.includes(c)).join('');
        });
    }
    
    if (options.letters && options.fixedLetters > 0) {
        for (let i = 0; i < options.fixedLetters && password.length < length; i++) {
            password += getRandomChar(charSets.letters);
        }
    }
    
    if (options.mixedCase && options.fixedUppercase > 0) {
        for (let i = 0; i < options.fixedUppercase && password.length < length; i++) {
            password += getRandomChar(charSets.uppercase);
        }
    }
    
    if (options.numbers && options.fixedNumbers > 0) {
        for (let i = 0; i < options.fixedNumbers && password.length < length; i++) {
            password += getRandomChar(charSets.numbers);
        }
    }
    
    if (options.symbols && options.fixedSymbols > 0) {
        for (let i = 0; i < options.fixedSymbols && password.length < length; i++) {
            password += getRandomChar(charSets.symbols);
        }
    }
    
    let pool = '';
    if (options.letters) pool += charSets.letters;
    if (options.mixedCase) pool += charSets.uppercase;
    if (options.numbers) pool += charSets.numbers;
    if (options.symbols) pool += charSets.symbols;
    
    if (!pool) return '';
    
    while (password.length < length) {
        let char;
        let attempts = 0;
        
        do {
            char = pool[Math.floor(Math.random() * pool.length)];
            attempts++;
            
            if (attempts > 50) {
                password += char;
                break;
            }
            
            if (options.noRepeating && password.length > 0 && char === password[password.length - 1]) {
                continue;
            }
            
            if (options.noSequential && password.length > 0) {
                if (isSequential(password[password.length - 1], char)) {
                    continue;
                }
            }
            
            password += char;
            break;
        } while (true);
    }
    
    return shuffleString(password);
}

function getRandomChar(charset) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
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
    
    if (options.symbols) {
        const symbolRegex = new RegExp(`[${escapeRegExp(options.customSymbols)}]`);
        if (!symbolRegex.test(password)) return false;
    }
    
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

function copyPassword() {
    const password = elements.passwordDisplay.value;
    if (!password) {
        showToast('No password to copy');
        return;
    }
    
    navigator.clipboard.writeText(password).then(() => {
        showToast('Password copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy password');
    });
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
        '%': 'percent', '^': 'caret', '&': 'and', '*': 'asterisk',
        '-': 'dash', '_': 'underscore', '=': 'equals', '+': 'plus',
        '(': 'open paren', ')': 'close paren', '[': 'open bracket', ']': 'close bracket',
        '{': 'open brace', '}': 'close brace', ':': 'colon', ';': 'semicolon',
        "'": 'apostrophe', '"': 'quote', '<': 'less than', '>': 'greater than',
        ',': 'comma', '.': 'period', '?': 'question', '/': 'slash', '\\': 'backslash',
        '|': 'pipe', '`': 'backtick', '~': 'tilde'
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

function exportVault(format) {
    if (passwordHistory.length === 0) {
        showToast('Vault is empty. Nothing to export.');
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    let content = '';
    let filename = '';

    if (format === 'csv') {
        content = '"Name","Password","Date","Strength"\n';
        content += passwordHistory.map(e => 
            `"${e.name.replace(/"/g, '""')}","${e.password.replace(/"/g, '""')}","${e.date}","${e.strength || 'N/A'}"`
        ).join('\n');
        filename = `Passtation_Vault_${dateStr}.csv`;
    } 
    else if (format === 'txt') {
        content = '═══════════════════════════════════════\n';
        content += '     PASSTATION PASSWORD VAULT EXPORT\n';
        content += '═══════════════════════════════════════\n';
        content += `Exported: ${new Date().toLocaleString()}\n`;
        content += `Total Passwords: ${passwordHistory.length}\n`;
        content += '═══════════════════════════════════════\n\n';
        
        passwordHistory.forEach((e, index) => {
            content += `[${index + 1}] ${e.name}\n`;
            content += `    Password: ${e.password}\n`;
            content += `    Date: ${e.date}\n`;
            content += `    Strength: ${e.strength || 'N/A'}\n`;
            content += '───────────────────────────────────────\n\n';
        });
        
        filename = `Passtation_Vault_${dateStr}.txt`;
    }
    else if (format === 'pdf') {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        
        element.innerHTML = `
            <h1>Passtation Password Vault Export</h1>
            <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Passwords:</strong> ${passwordHistory.length}</p>
            <hr>
            <table border="1" cellpadding="10" cellspacing="0" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th>Name</th>
                        <th>Password</th>
                        <th>Date</th>
                        <th>Strength</th>
                    </tr>
                </thead>
                <tbody>
                    ${passwordHistory.map(e => `
                        <tr>
                            <td>${e.name}</td>
                            <td style="font-family: monospace;">${e.password}</td>
                            <td>${e.date}</td>
                            <td>${e.strength || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        const opt = {
            margin: 10,
            filename: `Passtation_Vault_${dateStr}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        html2pdf().set(opt).from(element).save();
        showToast('PDF exported successfully!');
        return;
    }

    downloadFile(content, filename);
    showToast(`${format.toUpperCase()} exported successfully!`);
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

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
        const container = document.querySelector('.container');
        if (container) container.style.padding = '12px';
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
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

init();