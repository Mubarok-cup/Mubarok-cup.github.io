let player;
const channelGrid = document.getElementById('channelGrid');
const currentServerDisplay = document.getElementById('currentServerDisplay');
const searchInput = document.getElementById('searchInput');

let channels = [];
let categories = new Set();
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
let currentServer = 'https://shz.al/6C2A';

const servers = [
    'https://shz.al/6C2A',
    'https://shz.al/zCAG',
    'https://linkchur.top/playlist.m3u',
    'https://byte-capsule.vercel.app/api/aynaott/hybrid.m3u',
    'https://raw.githubusercontent.com/FunctionError/PiratesTv/main/combined_playlist.m3u'
];

// Channel Card Creation
function createChannelCard(channel) {
    const isFavorite = favorites.has(channel.url);
    return `
        <div class="channel-card" onclick="playChannel('${channel.url}')">
            <div class="channel-image">
                <img src="${channel.logo}" alt="${channel.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/250x250'">
            </div>
            <div class="channel-info">
                <div class="channel-name">${channel.title}</div>
                <div class="channel-category">${channel.category}</div>
            </div>
            <div class="action-buttons">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="toggleFavorite(event, '${channel.url}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
}

// Player Functions
function playChannel(url) {
    // Destroy previous JW Player instance if it exists
    if (window.jwplayerInstance) {
        window.jwplayerInstance.remove();
    }

    // Initialize JW Player
    window.jwplayerInstance = jwplayer("videoPlayer").setup({
        file: url, // HLS Stream URL
        type: "hls",
        width: "100%",
        height: "100%",
        autostart: true,
        mute: false,
        playbackRateControls: true,
        allowfullscreen: true,
    });

    const videoContainer = document.querySelector('.video-container');

    if (window.matchMedia("(max-width: 768px)").matches) {
        videoContainer.addEventListener('click', async () => {
            try {
                // Request full screen
                if (!document.fullscreenElement) {
                    await videoContainer.requestFullscreen();
                    
                    // Rotate screen to landscape if supported
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape');
                    }
                } else {
                    // Exit fullscreen and unlock orientation
                    await document.exitFullscreen();
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                }
            } catch (error) {
                console.error('Error handling fullscreen or orientation:', error);
            }
        });
    }
}

// M3U Parser
async function parseM3U(url) {
    try {
        channelGrid.innerHTML = '<div class="loading"></div>';
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(url));
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const text = await response.text();
        const lines = text.split('\n');
        
        channels = [];
        categories.clear();
        
        let currentChannel = {};
        
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                const info = line.split(',')[1];
                const categoryMatch = line.match(/group-title="([^"]+)"/);
                const category = categoryMatch ? categoryMatch[1] : 'Others';
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                const logo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/250x250';
                
                currentChannel = {
                    title: info,
                    category: category,
                    logo: logo
                };
                categories.add(category);
            } else if (line.startsWith('http')) {
                currentChannel.url = line;
                channels.push(currentChannel);
                currentChannel = {};
            }
        });
        
        showAllChannels();
    } catch (error) {
        console.error('Error loading M3U:', error);
        channelGrid.innerHTML = '<div class="error-message">চ্যানেল লোড করার সময় ত্রুটি হয়েছে৷ পরে আবার চেষ্টা করুন।</div>';
    }
}

// Channel Display Functions
function showAllChannels() {
    channelGrid.innerHTML = channels.map(channel => createChannelCard(channel)).join('');
}

function showCategories() {
    channelGrid.innerHTML = Array.from(categories)
        .sort()
        .map(category => {
            const count = channels.filter(ch => ch.category === category).length;
            return `
                <div class="channel-card" onclick="showChannelsByCategory('${category}')">
                    <div class="channel-info">
                        <div class="channel-name">${category}</div>
                        <div class="channel-category">${count} Channels</div>
                    </div>
                </div>
            `;
        }).join('');
}

function showChannelsByCategory(category) {
    const filteredChannels = channels.filter(ch => ch.category === category);
    channelGrid.innerHTML = filteredChannels.map(channel => createChannelCard(channel)).join('');
}

function showFavorites() {
    const favoriteChannels = channels.filter(ch => favorites.has(ch.url));
    channelGrid.innerHTML = favoriteChannels.length > 0 
        ? favoriteChannels.map(channel => createChannelCard(channel)).join('')
        : '<div class="error-message">এখনো কোনো প্রিয় চ্যানেল নেই।</div>';
}

// Favorite Toggle Function
function toggleFavorite(event, url) {
    event.preventDefault();
    event.stopPropagation();
    
    if (favorites.has(url)) {
        favorites.delete(url);
    } else {
        favorites.add(url);
    }
    
    localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
    
    const currentTab = document.querySelector('.tab-btn.active');
    if (currentTab.id === 'favoritesTab') {
        showFavorites();
    } else {
        const btn = event.target.closest('.favorite-btn');
        btn.classList.toggle('active');
    }
}

// Search Function
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredChannels = channels.filter(channel => 
        channel.title.toLowerCase().includes(searchTerm) ||
        channel.category.toLowerCase().includes(searchTerm)
    );
    
    channelGrid.innerHTML = filteredChannels.map(channel => createChannelCard(channel)).join('');
});

// Server Change Function
document.getElementById('serverChangeTab').onclick = function() {
    const currentServerIndex = servers.indexOf(currentServer);
    const nextServerIndex = (currentServerIndex + 1) % servers.length;
    currentServer = servers[nextServerIndex];
    currentServerDisplay.textContent = nextServerIndex + 1;
    parseM3U(currentServer);
};

// Tab Switch Function
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        switch(btn.id) {
            case 'allChannelsTab':
                showAllChannels();
                break;
            case 'categoriesTab':
                showCategories();
                break;
            case 'favoritesTab':
                showFavorites();
                break;
        }
    });
});

// রাইট-ক্লিক নিষ্ক্রিয় করা
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    alert("Sorry! Right-click is disabled.");
});

// কীবোর্ড শর্টকাট নিষ্ক্রিয় করা
document.addEventListener('keydown', function(event) {
    if (event.key === 'F12' || 
        (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(event.key)) || 
        (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
        alert("Inspect element is disabled.");
    }
});

// iframe ব্লক করা
if (window.top !== window.self) {
    alert("This website cannot be loaded in iframe.");
    window.top.location = window.self.location;
}

// Security Features
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('keydown', (event) => {
    if (event.key === 'F12' || 
        (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(event.key)) || 
        (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    parseM3U(servers[0]);
});
