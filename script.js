let tasks = [];
let schedules = [];
let expenses = [];
let notes = [];
let currentEditingNote = null;
let deferredPrompt; // For PWA install prompt
let isInstallable = false;

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    isInstallable = true;
    // Show install button
    showInstallButton();
});

// Check if app is already installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallButton();
    showNotificationMessage('✅ App berhasil di-install!', 'success');
});

function showInstallButton() {
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
}

function hideInstallButton() {
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                showNotificationMessage('✅ App sedang di-install...', 'success');
            } else {
                console.log('User dismissed the install prompt');
                showNotificationMessage('ℹ️ Install dibatalkan', 'info');
            }
            deferredPrompt = null;
            isInstallable = false;
            hideInstallButton();
        });
    } else {
        // Fallback for browsers that don't support beforeinstallprompt
        showInstallInstructions();
    }
}

function showInstallInstructions() {
    const instructions = `
📱 Cara Install Manual:

🔸 Chrome Android:
Menu (⋮) → "Add to Home screen"

🔸 Safari iOS:
Share button → "Add to Home Screen"

🔸 Chrome Desktop:
Address bar → Install icon

🔸 Edge:
Menu (⋯) → "Apps" → "Install this site as an app"
    `;
    
    alert(instructions);
}

// Check if running as PWA
function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

// Show PWA status
function checkPWAStatus() {
    if (isPWA()) {
        console.log('Running as PWA');
        hideInstallButton();
        showNotificationMessage('🎉 Berjalan sebagai aplikasi!', 'success');
    } else {
        console.log('Running in browser');
        // Show install button if installable
        if (isInstallable) {
            showInstallButton();
        } else {
            // For browsers that don't support beforeinstallprompt, show button anyway
            setTimeout(() => {
                if (!isPWA()) {
                    showInstallButton();
                }
            }, 2000);
        }
    }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export/Import functionality
function exportData() {
    const allData = {
        tasks: tasks,
        schedules: schedules,
        expenses: expenses,
        notes: notes,
        exportDate: new Date().toISOString(),
        version: "1.0"
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `widhi-productivity-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    // Show success message
    showNotificationMessage('✅ Data berhasil di-export!', 'success');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!importedData.tasks || !importedData.schedules || !importedData.expenses || !importedData.notes) {
                throw new Error('Invalid backup file format');
            }
            
            // Ask user for import method
            const importMethod = confirm(
                'Pilih metode import:\n\n' +
                'OK = REPLACE (hapus data lama, ganti dengan data baru)\n' +
                'Cancel = MERGE (gabung dengan data yang ada)'
            );
            
            if (importMethod) {
                // Replace mode
                tasks = importedData.tasks || [];
                schedules = importedData.schedules || [];
                expenses = importedData.expenses || [];
                notes = importedData.notes || [];
            } else {
                // Merge mode - add unique IDs to avoid conflicts
                const timeOffset = Date.now();
                
                importedData.tasks.forEach(task => {
                    task.id = task.id + timeOffset;
                    tasks.push(task);
                });
                
                importedData.schedules.forEach(schedule => {
                    schedule.id = schedule.id + timeOffset;
                    schedules.push(schedule);
                });
                
                importedData.expenses.forEach(expense => {
                    expense.id = expense.id + timeOffset;
                    expenses.push(expense);
                });
                
                importedData.notes.forEach(note => {
                    note.id = note.id + timeOffset;
                    notes.push(note);
                });
            }
            
            // Save to localStorage
            saveTasks();
            saveSchedules();
            saveExpenses();
            saveNotes();
            
            // Re-render all components
            updateMatkulOptions();
            renderTasks();
            renderSchedules();
            updateCategoryFilters();
            renderExpenses();
            updateBudgetSummary();
            updateNoteCategoryFilters();
            renderNotes();
            
            showNotificationMessage('✅ Data berhasil di-import!', 'success');
            
        } catch (error) {
            console.error('Import error:', error);
            showNotificationMessage('❌ File backup tidak valid!', 'error');
        }
    };
    reader.readAsText(file);
}

function showNotificationMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: #10b981;' : ''}
        ${type === 'error' ? 'background: #ef4444;' : ''}
        ${type === 'info' ? 'background: #3b82f6;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const notificationCSS = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });
    
    // Set default date to today for budget form
    const budgetTanggal = document.getElementById('budget-tanggal');
    if (budgetTanggal) {
        budgetTanggal.value = new Date().toISOString().split('T')[0];
    }
    
    // Load daily quote
    loadDailyQuote();
    
    // Check PWA status
    checkPWAStatus();
});

function saveTasks() {
    // Simpan data penting termasuk lampiran dan file hasil (karena URL-nya permanen dari server)
    const plainTasks = tasks.map(function (t) {
        return {
            id: t.id,
            judul: t.judul,
            matkul: t.matkul,
            deadline: t.deadline,
            status: t.status,
            files: t.files || []
        };
    });
    localStorage.setItem("tasks", JSON.stringify(plainTasks));
} 

function loadTasks() {
    const storedTasks = localStorage.getItem("tasks");
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
} 

function saveSchedules() {
    localStorage.setItem("schedules", JSON.stringify(schedules));
}

function loadSchedules() {
    const storedSchedules = localStorage.getItem("schedules");
    if (storedSchedules) {
        schedules = JSON.parse(storedSchedules);
    }
}

function saveExpenses() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

function loadExpenses() {
    const storedExpenses = localStorage.getItem("expenses");
    if (storedExpenses) {
        expenses = JSON.parse(storedExpenses);
    }
}

function saveNotes() {
    localStorage.setItem("notes", JSON.stringify(notes));
}

function loadNotes() {
    const storedNotes = localStorage.getItem("notes");
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
    }
} 

function getDaysLeft(deadline) {
    const today = new Date();
    const due = new Date(deadline);

    // samakan jam ke 00:00 biar hanya beda di hari
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffMs = due - today;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return `${diffDays} hari lagi`;
    } else if (diffDays === 0) {
        return "Hari ini terakhir woy!";
    } else {
        return `${Math.abs(diffDays)} hari sudah lewat`;
    }
}

// Quotes functionality
async function loadDailyQuote() {
    try {
        // Try to get quote from API first
        const response = await fetch('https://api.quotable.io/random?tags=motivational,success,wisdom,inspirational');
        const data = await response.json();
        
        document.getElementById('daily-quote').textContent = data.content;
        document.getElementById('quote-author').textContent = `- ${data.author}`;
    } catch (error) {
        // Fallback to mixed Indonesian and English quotes
        const mixedQuotes = [
            // Indonesian quotes
            { content: "Kesuksesan adalah kemampuan untuk bangkit dari kegagalan tanpa kehilangan semangat.", author: "Winston Churchill" },
            { content: "Jangan menunggu kesempatan, tapi ciptakanlah kesempatan itu.", author: "George Bernard Shaw" },
            { content: "Mimpi tanpa tindakan hanyalah angan-angan. Tindakan tanpa mimpi hanyalah kegiatan sia-sia.", author: "Joel A. Barker" },
            { content: "Kegagalan adalah kesempatan untuk memulai lagi dengan lebih cerdas.", author: "Henry Ford" },
            { content: "Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia.", author: "Nelson Mandela" },
            { content: "Jangan takut gagal, takutlah tidak mencoba sama sekali.", author: "Anonim" },
            { content: "Kesabaran adalah kunci dari segala kesulitan.", author: "Ali bin Abi Thalib" },
            { content: "Ilmu itu lebih baik daripada harta. Ilmu menjaga engkau, sedangkan harta engkau yang menjaganya.", author: "Ali bin Abi Thalib" },
            { content: "Barang siapa yang menginginkan kebahagiaan dunia maka dengan ilmu, barang siapa menginginkan kebahagiaan akhirat maka dengan ilmu.", author: "Imam Syafi'i" },
            { content: "Belajarlah dari kemarin, hiduplah untuk hari ini, berharaplah untuk esok hari.", author: "Albert Einstein" },
            { content: "Tidak ada yang tidak mungkin, yang ada hanya kemauan yang tidak ada.", author: "Anonim" },
            { content: "Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.", author: "Tim Notke" },
            { content: "Jika kamu tidak dapat melakukan hal-hal besar, lakukanlah hal-hal kecil dengan cara yang besar.", author: "Napoleon Hill" },
            { content: "Masa depan milik mereka yang percaya pada keindahan mimpi mereka.", author: "Eleanor Roosevelt" },
            { content: "Sukses bukanlah kunci kebahagiaan. Kebahagiaan adalah kunci sukses.", author: "Albert Schweitzer" },
            { content: "Jangan biarkan apa yang tidak bisa kamu lakukan menghalangi apa yang bisa kamu lakukan.", author: "John Wooden" },
            { content: "Perubahan adalah hasil akhir dari semua pembelajaran sejati.", author: "Leo Buscaglia" },
            { content: "Investasi terbaik adalah investasi pada diri sendiri.", author: "Warren Buffett" },
            { content: "Waktu adalah sumber daya yang paling berharga, gunakan dengan bijak.", author: "Anonim" },
            { content: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
            
            // English quotes
            { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { content: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
            { content: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
            { content: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
            { content: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { content: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
            { content: "The world changes by your example, not by your opinion.", author: "Paulo Coelho" },
            { content: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
            { content: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
            { content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
            { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
            { content: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
            { content: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
            { content: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
            { content: "Your limitation—it's only your imagination.", author: "Unknown" },
            { content: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
            { content: "Great things never come from comfort zones.", author: "Unknown" },
            { content: "Dream it. Wish it. Do it.", author: "Unknown" },
            { content: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
            { content: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
            { content: "Dream bigger. Do bigger.", author: "Unknown" },
            { content: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
            { content: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
            { content: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
            { content: "Little things make big days.", author: "Unknown" },
            { content: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
            { content: "Don't wait for opportunity. Create it.", author: "Unknown" },
            { content: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
            { content: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
            { content: "Dream it. Believe it. Build it.", author: "Unknown" }
        ];
        
        const randomQuote = mixedQuotes[Math.floor(Math.random() * mixedQuotes.length)];
        document.getElementById('daily-quote').textContent = randomQuote.content;
        document.getElementById('quote-author').textContent = `- ${randomQuote.author}`;
    }
}

function getCategoryIconNote(category) {
    const icons = {
        'pribadi': '👤',
        'kuliah': '🎓',
        'project': '💼',
        'ide': '💡',
        'reminder': '⏰',
        'lainnya': '📦'
    };
    return icons[category] || '📦';
}

function getFilteredNotes() {
    const filterKategori = document.getElementById('filter-note-kategori').value;
    const searchTerm = document.getElementById('search-notes').value.toLowerCase();
    
    let filtered = notes.slice();
    
    // Filter by category
    if (filterKategori !== 'semua') {
        filtered = filtered.filter(note => note.kategori === filterKategori);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(note => 
            note.judul.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

function updateNoteCategoryFilters() {
    const categories = [...new Set(notes.map(n => n.kategori))];
    const filterSelect = document.getElementById('filter-note-kategori');
    
    filterSelect.innerHTML = '<option value="semua">Semua Kategori</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${getCategoryIconNote(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        filterSelect.appendChild(option);
    });
}

function renderNotes() {
    const notesGrid = document.getElementById('daftar-notes');
    const filteredNotes = getFilteredNotes();
    
    notesGrid.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.innerHTML = `
            <div style="text-align: center; color: #9ca3af; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">📝</div>
                <div>Belum ada notes. Mulai tulis catatan pertama kamu!</div>
            </div>
        `;
        emptyState.style.gridColumn = '1 / -1';
        notesGrid.appendChild(emptyState);
        return;
    }
    
    // Sort by date (newest first)
    const sortedNotes = filteredNotes.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    sortedNotes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        
        const tanggalFormat = new Date(note.tanggal).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        noteCard.innerHTML = `
            <div class="note-header">
                <div>
                    <div class="note-title">${note.judul}</div>
                    <div class="note-category">${getCategoryIconNote(note.kategori)} ${note.kategori.charAt(0).toUpperCase() + note.kategori.slice(1)}</div>
                </div>
            </div>
            <div class="note-content">${note.content.replace(/\n/g, '<br>')}</div>
            <div class="note-footer">
                <div class="note-date">${tanggalFormat}</div>
                <div class="note-actions">
                    <button class="edit-note-btn" onclick="editNote(${note.id})">✏️</button>
                    <button class="delete-note-btn" onclick="deleteNote(${note.id})">🗑️</button>
                </div>
            </div>
        `;
        
        notesGrid.appendChild(noteCard);
    });
}

function editNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentEditingNote = noteId;
    
    // Fill form with note data
    document.getElementById('note-judul').value = note.judul;
    document.getElementById('note-kategori').value = note.kategori;
    document.getElementById('note-content').value = note.content;
    
    // Change button text
    document.getElementById('note-submit-btn').textContent = 'Update Note';
    
    // Scroll to form
    document.getElementById('formulir-notes').scrollIntoView({ behavior: 'smooth' });
}

function deleteNote(noteId) {
    if (confirm('Hapus note ini?')) {
        notes = notes.filter(n => n.id !== noteId);
        saveNotes();
        renderNotes();
        updateNoteCategoryFilters();
    }
}

function resetNoteForm() {
    document.getElementById('formulir-notes').reset();
    document.getElementById('note-submit-btn').textContent = 'Tambah Note';
    currentEditingNote = null;
    
    // Hide custom category input
    const customInput = document.getElementById('custom-note-kategori');
    if (customInput) {
        customInput.style.display = 'none';
        customInput.required = false;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function getCategoryIcon(category) {
    const icons = {
        'makanan': '🍔',
        'transport': '🚗',
        'pendidikan': '📚',
        'hiburan': '🎮',
        'kesehatan': '🏥',
        'belanja': '🛒',
        'lainnya': '📦'
    };
    return icons[category] || '📦';
}

function getFilteredExpenses() {
    const filterPeriode = document.getElementById('filter-periode').value;
    const filterKategori = document.getElementById('filter-kategori-budget').value;
    
    let filtered = expenses.slice();
    
    // Filter by period
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.tanggal);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        switch (filterPeriode) {
            case 'hari-ini':
                return expenseDate.toDateString() === todayDate.toDateString();
            case 'minggu-ini':
                return expenseDate >= startOfWeek;
            case 'bulan-ini':
                return expenseDate >= startOfMonth;
            case 'bulan-lalu':
                return expenseDate >= startOfLastMonth && expenseDate <= endOfLastMonth;
            default:
                return true;
        }
    });
    
    // Filter by category
    if (filterKategori !== 'semua') {
        filtered = filtered.filter(expense => expense.kategori === filterKategori);
    }
    
    return filtered;
}

function updateBudgetSummary() {
    const filteredExpenses = getFilteredExpenses();
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.jumlah, 0);
    
    // Update total
    document.getElementById('total-pengeluaran').textContent = formatCurrency(total);
    
    // Find biggest category
    const categoryTotals = {};
    filteredExpenses.forEach(expense => {
        categoryTotals[expense.kategori] = (categoryTotals[expense.kategori] || 0) + expense.jumlah;
    });
    
    const biggestCategory = Object.keys(categoryTotals).reduce((a, b) => 
        categoryTotals[a] > categoryTotals[b] ? a : b, '');
    
    if (biggestCategory) {
        const icon = getCategoryIcon(biggestCategory);
        document.getElementById('kategori-terbesar').textContent = 
            `${icon} ${biggestCategory.charAt(0).toUpperCase() + biggestCategory.slice(1)} (${formatCurrency(categoryTotals[biggestCategory])})`;
    } else {
        document.getElementById('kategori-terbesar').textContent = '-';
    }
    
    // Calculate daily average
    const filterPeriode = document.getElementById('filter-periode').value;
    let days = 1;
    
    switch (filterPeriode) {
        case 'minggu-ini':
            days = 7;
            break;
        case 'bulan-ini':
            days = new Date().getDate();
            break;
        case 'bulan-lalu':
            days = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate();
            break;
    }
    
    const average = total / days;
    document.getElementById('rata-rata-harian').textContent = formatCurrency(average);
}

function updateCategoryFilters() {
    const categories = [...new Set(expenses.map(e => e.kategori))];
    const categoryButtons = document.getElementById('category-buttons');
    const filterSelect = document.getElementById('filter-kategori-budget');
    
    // Update quick filter buttons
    categoryButtons.innerHTML = '<button class="category-filter-btn active" data-category="semua">Semua</button>';
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-filter-btn';
        btn.setAttribute('data-category', category);
        btn.textContent = `${getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const selectedCategory = this.getAttribute('data-category');
            document.getElementById('filter-kategori-budget').value = selectedCategory;
            renderExpenses();
            updateBudgetSummary();
        });
        categoryButtons.appendChild(btn);
    });
    
    // Update dropdown filter
    filterSelect.innerHTML = '<option value="semua">Semua Kategori</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        filterSelect.appendChild(option);
    });
}

function renderExpenses() {
    const expenseList = document.getElementById('daftar-pengeluaran');
    const filteredExpenses = getFilteredExpenses();
    
    expenseList.innerHTML = '';
    
    // Sort by date (newest first)
    const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (sortedExpenses.length === 0) {
        const li = document.createElement('li');
        li.innerHTML = '<div class="expense-info"><div class="expense-title">Belum ada pengeluaran</div></div>';
        li.style.textAlign = 'center';
        li.style.color = '#9ca3af';
        expenseList.appendChild(li);
        return;
    }
    
    sortedExpenses.forEach(expense => {
        const li = document.createElement('li');
        
        const expenseInfo = document.createElement('div');
        expenseInfo.className = 'expense-info';
        
        const title = document.createElement('div');
        title.className = 'expense-title';
        title.textContent = expense.deskripsi || 'Pengeluaran';
        
        const details = document.createElement('div');
        details.className = 'expense-details';
        const tanggalFormat = new Date(expense.tanggal).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        details.textContent = `${getCategoryIcon(expense.kategori)} ${expense.kategori.charAt(0).toUpperCase() + expense.kategori.slice(1)} • ${tanggalFormat}`;
        
        expenseInfo.appendChild(title);
        expenseInfo.appendChild(details);
        
        const amount = document.createElement('div');
        amount.className = 'expense-amount';
        amount.textContent = formatCurrency(expense.jumlah);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', function() {
            if (confirm('Hapus pengeluaran ini?')) {
                expenses = expenses.filter(e => e.id !== expense.id);
                saveExpenses();
                renderExpenses();
                updateBudgetSummary();
                updateCategoryFilters();
            }
        });
        
        li.appendChild(expenseInfo);
        li.appendChild(amount);
        li.appendChild(deleteBtn);
        expenseList.appendChild(li);
    });
}

function getDayName(dayIndex) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[dayIndex];
}

function renderSchedules() {
    // Clear all day columns
    document.querySelectorAll('.week-list').forEach(list => {
        list.innerHTML = '';
    });
    
    // Sort schedules by time
    const sortedSchedules = schedules.slice().sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.start.localeCompare(b.start);
    });
    
    sortedSchedules.forEach(schedule => {
        const dayList = document.querySelector(`.week-list[data-day="${schedule.day}"]`);
        if (!dayList) return;
        
        const li = document.createElement('li');
        
        const scheduleInfo = document.createElement('div');
        scheduleInfo.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 3px; color: #f1f5f9;">${schedule.matkul}</div>
            <div style="color: #cbd5e1; margin-bottom: 2px;">${formatTime(schedule.start)} - ${formatTime(schedule.end)}</div>
            ${schedule.ruang ? `<div style="color: #94a3b8; font-size: 0.7rem;">📍 ${schedule.ruang}</div>` : ''}
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.title = `Hapus ${schedule.matkul}`;
        deleteBtn.addEventListener('click', function() {
            if (confirm(`Hapus jadwal ${schedule.matkul}?`)) {
                schedules = schedules.filter(s => s.id !== schedule.id);
                saveSchedules();
                renderSchedules();
            }
        });
        
        li.appendChild(scheduleInfo);
        li.appendChild(deleteBtn);
        dayList.appendChild(li);
    });
}

function checkReminders() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
    
    schedules.forEach(schedule => {
        if (schedule.day !== currentDay || !schedule.reminderMinutes) return;
        
        const [hours, minutes] = schedule.start.split(':').map(Number);
        const scheduleTime = hours * 60 + minutes;
        const reminderTime = scheduleTime - schedule.reminderMinutes;
        
        // Check if it's time for reminder (within 1 minute window)
        if (Math.abs(currentTime - reminderTime) <= 1) {
            const reminderKey = `reminder_${schedule.id}_${now.toDateString()}`;
            
            // Check if we already showed this reminder today
            if (!localStorage.getItem(reminderKey)) {
                showNotification(
                    `Reminder: ${schedule.matkul}`,
                    `Kelas dimulai dalam ${schedule.reminderMinutes} menit (${formatTime(schedule.start)})`
                );
                localStorage.setItem(reminderKey, 'shown');
            }
        }
    });
}

function showNotification(title, message) {
    // Try to use browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'Widhi.jpg'
        });
    } else {
        // Fallback to alert
        alert(`${title}\n\n${message}`);
    }
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
}

function formatTanggal(deadline) {
    if (!deadline) return "";
    const d = new Date(deadline);
    // Format: 20 Januari 2025 (bahasa Indonesia)
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// Request notification permission on page load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}


// Ambil element
const form = document.getElementById("formulir-tugas");
const inputJudul = document.getElementById("judul");
const inputMatkul = document.getElementById("matkul");
const inputDeadline = document.getElementById("deadline");
const daftarTugas = document.getElementById("daftar-tugas");
const filterMatkulSelect = document.getElementById("filter-matkul");

// Ambil element jadwal
const jadwalForm = document.getElementById("formulir-jadwal");
const jadwalMatkul = document.getElementById("jadwal-matkul");
const jadwalHari = document.getElementById("jadwal-hari");
const jadwalMulai = document.getElementById("jadwal-mulai");
const jadwalSelesai = document.getElementById("jadwal-selesai");
const jadwalRuang = document.getElementById("jadwal-ruang");
const jadwalReminder = document.getElementById("jadwal-reminder");

// Ambil element budget
const budgetForm = document.getElementById("formulir-budget");
const budgetJumlah = document.getElementById("budget-jumlah");
const budgetKategori = document.getElementById("budget-kategori");
const customKategori = document.getElementById("custom-kategori");
const budgetTanggal = document.getElementById("budget-tanggal");
const budgetDeskripsi = document.getElementById("budget-deskripsi");
const filterPeriode = document.getElementById("filter-periode");
const filterKategoriBudget = document.getElementById("filter-kategori-budget");

// Ambil element notes
const notesForm = document.getElementById("formulir-notes");
const noteJudul = document.getElementById("note-judul");
const noteKategori = document.getElementById("note-kategori");
const customNoteKategori = document.getElementById("custom-note-kategori");
const noteContent = document.getElementById("note-content");
const filterNoteKategori = document.getElementById("filter-note-kategori");
const searchNotes = document.getElementById("search-notes");

// Ambil element quotes
const refreshQuoteBtn = document.getElementById("refresh-quote");

// Ambil element export/import
const exportDataBtn = document.getElementById("export-data-btn");
const importDataBtn = document.getElementById("import-data-btn");
const importFileInput = document.getElementById("import-file-input");
const installPWABtn = document.getElementById("install-pwa-btn");

function getSortedAndFilteredTasks() {
    let filtered = tasks;

    // filter per matkul
    if (filterMatkulSelect && filterMatkulSelect.value !== "all") {
        filtered = filtered.filter(function (task) {
            return task.matkul === filterMatkulSelect.value;
        });
    }

    // urutkan berdasarkan status dulu (todo di atas done), lalu deadline (yang paling dekat dulu)
    return filtered.slice().sort(function (a, b) {
        const statusOrder = { todo: 0, done: 1 };
        const sa = statusOrder[a.status] ?? 0;
        const sb = statusOrder[b.status] ?? 0;

        if (sa !== sb) {
            return sa - sb;
        }

        const da = new Date(a.deadline);
        const db = new Date(b.deadline);
        return da - db;
    });
}

function updateMatkulOptions() {
    if (!filterMatkulSelect) return;

    const unikMatkul = Array.from(new Set(tasks.map(function (t) {
        return t.matkul;
    })));

    // reset options
    filterMatkulSelect.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Semua";
    filterMatkulSelect.appendChild(allOption);

    unikMatkul.forEach(function (mk) {
        const opt = document.createElement("option");
        opt.value = mk;
        opt.textContent = mk;
        filterMatkulSelect.appendChild(opt);
    });
}

function renderTasks() {
    daftarTugas.innerHTML = "";
    
    const dataUntukRender = getSortedAndFilteredTasks();

    dataUntukRender.forEach(function(task) {
        const li = document.createElement("li");

        const statusCheckbox = document.createElement("input");
        statusCheckbox.type = "checkbox";
        statusCheckbox.checked = task.status === "done";
        statusCheckbox.addEventListener("change", function () {
            task.status = statusCheckbox.checked ? "done" : "todo";
            saveTasks();
            renderTasks();
        });

        const text = document.createElement("span");
        const infoHari = getDaysLeft(task.deadline);
        // baris utama
        const tanggalFormat = formatTanggal(task.deadline);
        text.textContent = `${task.judul} - ${task.matkul} (Deadline: ${tanggalFormat} | ${infoHari})`;

        // Tampilkan file yang sudah diupload
        if (task.files && task.files.length > 0) {
            const fileContainer = document.createElement("div");
            fileContainer.style.marginTop = "8px";
            fileContainer.style.fontSize = "0.8rem";
            
            task.files.forEach(function(file, index) {
                const fileLink = document.createElement("a");
                fileLink.href = file.url;
                fileLink.target = "_blank";
                fileLink.textContent = file.name;
                fileLink.style.color = "#38bdf8";
                fileLink.style.marginRight = "10px";
                fileLink.style.textDecoration = "underline";
                
                const deleteFileBtn = document.createElement("button");
                deleteFileBtn.textContent = "×";
                deleteFileBtn.style.marginLeft = "5px";
                deleteFileBtn.style.marginRight = "15px";
                deleteFileBtn.style.background = "#ef4444";
                deleteFileBtn.style.color = "white";
                deleteFileBtn.style.border = "none";
                deleteFileBtn.style.borderRadius = "50%";
                deleteFileBtn.style.width = "20px";
                deleteFileBtn.style.height = "20px";
                deleteFileBtn.style.fontSize = "12px";
                deleteFileBtn.style.cursor = "pointer";
                
                deleteFileBtn.addEventListener("click", async function(e) {
                    e.preventDefault();
                    if (confirm(`Hapus file "${file.name}"?`)) {
                        try {
                            const response = await fetch(`/uploads/${file.filename}`, {
                                method: "DELETE"
                            });
                            
                            if (response.ok) {
                                task.files.splice(index, 1);
                                saveTasks();
                                renderTasks();
                            } else {
                                alert("Gagal menghapus file");
                            }
                        } catch (error) {
                            console.error("Delete error:", error);
                            alert("Gagal menghapus file: " + error.message);
                        }
                    }
                });
                
                fileContainer.appendChild(fileLink);
                fileContainer.appendChild(deleteFileBtn);
            });
            
            text.appendChild(fileContainer);
        }


        if (task.status === "done") {
            text.style.textDecoration = "line-through";
            text.style.opacity = "0.7";
            text.style.color = "green";
        } else {
            text.style.textDecoration = "none";
            text.style.opacity = "1";
            text.style.color = "red";
        }

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", function() {
            const newJudul = prompt("Edit judul:", task.judul);
            const newMatkul = prompt("Edit matkul:", task.matkul);
            const newDeadline = prompt("Edit deadline (YYYY-MM-DD):", task.deadline);
            if (!newJudul || !newMatkul || !newDeadline) return;

            task.judul = newJudul;
            task.matkul = newMatkul;
            task.deadline = newDeadline;

            // Lampiran/upload dinonaktifkan di versi ini
            saveTasks();
            updateMatkulOptions();
            renderTasks();
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Hapus";
        deleteBtn.addEventListener("click", function() {
            tasks = tasks.filter(function(t) {
                return t.id !== task.id;
            });
            saveTasks();
            updateMatkulOptions();
            renderTasks();
        });

        const hasilBtn = document.createElement("button");
        hasilBtn.textContent = "File Hasil";
        hasilBtn.addEventListener("click", function () {
            // Buat input file
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "*/*";
            fileInput.style.display = "none";
            
            fileInput.addEventListener("change", async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append("file", file);
                
                try {
                    const response = await fetch("/upload", {
                        method: "POST",
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Simpan info file ke task
                        if (!task.files) task.files = [];
                        task.files.push({
                            name: result.originalName,
                            url: result.url,
                            filename: result.filename,
                            size: result.size
                        });
                        
                        saveTasks();
                        renderTasks();
                        alert(`File "${result.originalName}" berhasil diupload!`);
                    } else {
                        alert("Upload gagal: " + result.error);
                    }
                } catch (error) {
                    console.error("Upload error:", error);
                    alert("Upload gagal: " + error.message);
                }
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });

        li.appendChild(statusCheckbox);
        li.appendChild(text);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        li.appendChild(hasilBtn);

        daftarTugas.appendChild(li);
    });


}



if (filterMatkulSelect) {
    filterMatkulSelect.addEventListener("change", function () {
        renderTasks();
    });
}

loadTasks();
loadSchedules();
loadExpenses();
loadNotes();
updateMatkulOptions();
renderTasks();
renderSchedules();
updateCategoryFilters();
renderExpenses();
updateBudgetSummary();
updateNoteCategoryFilters();
renderNotes();
console.log("Loaded tasks:", tasks);
console.log("Loaded schedules:", schedules);
console.log("Loaded expenses:", expenses);
console.log("Loaded notes:", notes);

// Check for reminders every minute
setInterval(checkReminders, 60000);

// Event listener for quote refresh
if (refreshQuoteBtn) {
    refreshQuoteBtn.addEventListener('click', function() {
        this.style.transform = 'rotate(180deg)';
        loadDailyQuote();
        setTimeout(() => {
            this.style.transform = 'rotate(0deg)';
        }, 300);
    });
}

// Event listeners for export/import
if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
}

if (importDataBtn && importFileInput) {
    importDataBtn.addEventListener('click', function() {
        importFileInput.click();
    });
    
    importFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/json') {
            importData(file);
        } else {
            showNotificationMessage('❌ Pilih file JSON yang valid!', 'error');
        }
        // Reset input
        this.value = '';
    });
}

// Event listener for PWA install
if (installPWABtn) {
    installPWABtn.addEventListener('click', installPWA);
}

// Event listeners for budget filters
if (filterPeriode) {
    filterPeriode.addEventListener('change', function() {
        renderExpenses();
        updateBudgetSummary();
    });
}

if (filterKategoriBudget) {
    filterKategoriBudget.addEventListener('change', function() {
        renderExpenses();
        updateBudgetSummary();
        
        // Update quick filter buttons
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-category') === this.value) {
                btn.classList.add('active');
            }
        });
    });
}

// Event listeners for notes filters
if (filterNoteKategori) {
    filterNoteKategori.addEventListener('change', function() {
        renderNotes();
    });
}

if (searchNotes) {
    searchNotes.addEventListener('input', function() {
        renderNotes();
    });
}

// Handle custom category input for budget
if (budgetKategori && customKategori) {
    budgetKategori.addEventListener('change', function() {
        if (this.value === 'custom') {
            customKategori.style.display = 'block';
            customKategori.required = true;
        } else {
            customKategori.style.display = 'none';
            customKategori.required = false;
            customKategori.value = '';
        }
    });
}

// Handle custom category input for notes
if (noteKategori && customNoteKategori) {
    noteKategori.addEventListener('change', function() {
        if (this.value === 'custom') {
            customNoteKategori.style.display = 'block';
            customNoteKategori.required = true;
        } else {
            customNoteKategori.style.display = 'none';
            customNoteKategori.required = false;
            customNoteKategori.value = '';
        }
    });
}

// Event listener submit tugas
if (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const judul = inputJudul.value.trim();
        const matkul = inputMatkul.value.trim();
        const deadline = inputDeadline.value;

        if (!judul || !matkul || !deadline) {
            return;
        }

        const newTask = {
            id: Date.now(),
            judul: judul,
            matkul: matkul,
            deadline: deadline,
            status: "todo",
            files: []
        };
        tasks.push(newTask);
        saveTasks();
        updateMatkulOptions();
        renderTasks();

        form.reset();
        console.log("Tasks after submit:", tasks);
    });
}

// Event listener submit jadwal
if (jadwalForm) {
    jadwalForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const matkul = jadwalMatkul.value.trim();
        const hari = parseInt(jadwalHari.value);
        const mulai = jadwalMulai.value;
        const selesai = jadwalSelesai.value;
        const ruang = jadwalRuang.value.trim();
        const reminderMinutes = parseInt(jadwalReminder.value);

        if (!matkul || isNaN(hari) || !mulai || !selesai) {
            alert("Mohon isi semua field yang wajib!");
            return;
        }

        if (mulai >= selesai) {
            alert("Jam mulai harus lebih awal dari jam selesai!");
            return;
        }

        const newSchedule = {
            id: Date.now(),
            matkul: matkul,
            day: hari,
            start: mulai,
            end: selesai,
            ruang: ruang,
            reminderMinutes: reminderMinutes
        };

        schedules.push(newSchedule);
        saveSchedules();
        renderSchedules();

        jadwalForm.reset();
        console.log("Schedules after submit:", schedules);
    });
}

// Event listener submit budget
if (budgetForm) {
    budgetForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const jumlah = parseInt(budgetJumlah.value);
        const kategori = budgetKategori.value === 'custom' ? customKategori.value.trim().toLowerCase() : budgetKategori.value;
        const tanggal = budgetTanggal.value;
        const deskripsi = budgetDeskripsi.value.trim();

        if (!jumlah || !kategori || !tanggal) {
            alert("Mohon isi semua field yang wajib!");
            return;
        }

        if (jumlah <= 0) {
            alert("Jumlah harus lebih dari 0!");
            return;
        }

        const newExpense = {
            id: Date.now(),
            jumlah: jumlah,
            kategori: kategori,
            tanggal: tanggal,
            deskripsi: deskripsi || `Pengeluaran ${kategori}`
        };

        expenses.push(newExpense);
        saveExpenses();
        updateCategoryFilters();
        renderExpenses();
        updateBudgetSummary();

        budgetForm.reset();
        budgetTanggal.value = new Date().toISOString().split('T')[0]; // Reset to today
        console.log("Expenses after submit:", expenses);
    });
}

// Event listener submit notes
if (notesForm) {
    notesForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const judul = noteJudul.value.trim();
        const kategori = noteKategori.value === 'custom' ? customNoteKategori.value.trim().toLowerCase() : noteKategori.value;
        const content = noteContent.value.trim();

        if (!judul || !kategori || !content) {
            alert("Mohon isi semua field yang wajib!");
            return;
        }

        if (currentEditingNote) {
            // Update existing note
            const noteIndex = notes.findIndex(n => n.id === currentEditingNote);
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    judul: judul,
                    kategori: kategori,
                    content: content,
                    tanggal: new Date().toISOString().split('T')[0] // Update date
                };
            }
        } else {
            // Create new note
            const newNote = {
                id: Date.now(),
                judul: judul,
                kategori: kategori,
                content: content,
                tanggal: new Date().toISOString().split('T')[0]
            };
            notes.push(newNote);
        }

        saveNotes();
        updateNoteCategoryFilters();
        renderNotes();
        resetNoteForm();

        console.log("Notes after submit:", notes);
    });
}




