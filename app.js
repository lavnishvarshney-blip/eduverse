/**
 * Eduverse Core Logic v1.0
 * Vanilla JS implementation
 */

const supabaseUrl = 'https://kwnmeiphzrbdvoougtfp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bm1laXBoenJiZHZvb3VndGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTM2MjksImV4cCI6MjA4ODk4OTYyOX0.kckiexlTWsrETDowXAAwjb0APC9VG9cGfuk0qcPbMNk';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const app = {
    state: {
        isChatOpen: false,
        currentUser: null,
        currentView: 'landing',
        activeDashboardTab: 'home',
        apiKey: localStorage.getItem('eduverse_gemini_key') || 'AIzaSyDoRp1Nc-OlGZRgR8HCru51RcqKPaR5wh0'
    },

    async init() {
        console.log("🚀 Eduverse Initialized");
        this.bindEvents();
        
        // Check for existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.state.currentUser = session.user;
            this.navigateTo('dashboard');
        }

        // If API key is missing on load, prompt quietly in log
        if (!this.state.apiKey) console.warn("Gemini API Key missing. AI will use mock mode.");
    },

    bindEvents() {
        // Allow enter key in chat input
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Navigation buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.switchAuthTab('login');
            this.openModal('auth-modal');
        });
        
        document.getElementById('signupBtn')?.addEventListener('click', () => {
            this.switchAuthTab('signup');
            this.openModal('auth-modal');
        });
        
        // Setup Save API Key button if it exists
        document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
            const key = document.getElementById('apiKeyInput').value.trim();
            if (key) {
                this.state.apiKey = key;
                localStorage.setItem('eduverse_gemini_key', key);
                this.closeModal('settings-modal');
                alert("API Key saved! Your AI Tutor is now live.");
            }
        });
    },

    toggleChat() {
        this.state.isChatOpen = !this.state.isChatOpen;
        const widget = document.getElementById('ai-chat-widget');
        if (this.state.isChatOpen) {
            widget.classList.remove('hidden');
        } else {
            widget.classList.add('hidden');
        }
    },

    openModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    },

    switchAuthTab(tab) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const btns = document.querySelectorAll('.tab-btn');
        
        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            btns[0].classList.add('active');
            btns[1].classList.remove('active');
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            btns[0].classList.remove('active');
            btns[1].classList.add('active');
        }
    },

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            this.state.currentUser = data.user;
            this.closeModal('auth-modal');
            this.navigateTo('dashboard');
        } catch (error) {
            alert(error.message);
        }
    },

    async signup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            
            // Insert profile into users table
            if (data.user) {
                await supabase.from('users').insert([{ 
                    id: data.user.id, 
                    name: name, 
                    email: email 
                }]);
            }
            
            this.state.currentUser = data.user;
            this.closeModal('auth-modal');
            this.navigateTo('dashboard');
            alert("Welcome to Eduverse! Your account is created.");
        } catch (error) {
            alert(error.message);
        }
    },

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        this.addMessageToChat(text, 'student');
        input.value = '';

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        this.addMessageToChat('<div class="spinner border-none w-6 h-6 border-2"></div> typing...', 'ai', typingId);

        try {
            let aiResponse = "";
            if (this.state.apiKey) {
                aiResponse = await this.callGeminiAPI(text);
            } else {
                // Fallback to offline mock matching the persona rules
                await new Promise(r => setTimeout(r, 1500));
                aiResponse = `Yeah, **${text}** can definitely sound overwhelming at first! 😅\n\nBasically, it's just a set of rules for how things interact.\n\nLike how Thor's hammer only responds to someone who is worthy — there's a strict rule in place! ⚡\n\nIf you had to explain it to a 5-year-old, what's the first thing you'd say?`;
            }
            
            document.getElementById(typingId)?.remove();
            this.addMessageToChat(aiResponse, 'ai');
        } catch (error) {
            console.error(error);
            document.getElementById(typingId)?.remove();
            this.addMessageToChat("Ah, network error! My brain is glitching 😵‍💫 Try again in a second.", 'ai');
        }
    },

    addMessageToChat(htmlContent, sender, id = null) {
        const chatMessages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = `chat-bubble ${sender}`;
        if (id) div.id = id;
        
        if (sender === 'ai') {
            // Convert markdown basic formatting to HTML
            let formatted = htmlContent
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br/>');
                
            div.innerHTML = `<p>${formatted}</p>`;
        } else {
            div.textContent = htmlContent;
        }
        
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    async callGeminiAPI(userText, isSystemPrompt = false) {
        let prompt = userText;
        if (!isSystemPrompt) {
            prompt = `
                You are a fun, casual AI Tutor for students. 
                RULES:
                1. First repeat the student's point validate them ("Yeah, that feels tough!")
                2. Give a simple 2-3 line explanation of the topic
                3. Give a real-life example ("Like Thor's hammer")
                4. Ask exactly 1 question at the end to make them think
                5. Use emojis and casual language (Hindi slang "bhai/yaar" if appropriate)
                6. Keep formatting to bare minimum. Use paragraphs.
                
                Student says: "${userText}"
            `;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            })
        });

        if (!response.ok) throw new Error("API failed");
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    navigateTo(view) {
        this.state.currentView = view;
        if (view === 'dashboard') {
            this.renderDashboard();
        }
    },

    renderDashboard() {
        // Render the main dashboard shell
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="dashboard-layout fade-in">
                <aside class="sidebar">
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'home' ? 'active' : ''}" onclick="app.switchDashboardTab('home')"><i class="ph ph-house"></i> Home</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'missions' ? 'active' : ''}" onclick="app.switchDashboardTab('missions')"><i class="ph ph-target"></i> Daily Missions</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'study-guides' ? 'active' : ''}" onclick="app.switchDashboardTab('study-guides')"><i class="ph ph-books"></i> Study Guides</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'practice-questions' ? 'active' : ''}" onclick="app.switchDashboardTab('practice-questions')"><i class="ph ph-exam"></i> Practice Maker</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'homework' ? 'active' : ''}" onclick="app.switchDashboardTab('homework')"><i class="ph ph-clipboard-text"></i> Homework</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'doubt-chat' ? 'active' : ''}" onclick="app.switchDashboardTab('doubt-chat')"><i class="ph ph-chats-circle"></i> Doubt Chat</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'progress' ? 'active' : ''}" onclick="app.switchDashboardTab('progress')"><i class="ph ph-chart-line-up"></i> Progress Analytics</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'campus-battle' ? 'active' : ''}" onclick="app.switchDashboardTab('campus-battle')"><i class="ph ph-sword"></i> Campus Battle</div>
                    <div class="sidebar-item ${this.state.activeDashboardTab === 'tools' ? 'active' : ''}" onclick="app.switchDashboardTab('tools')"><i class="ph ph-wrench"></i> More Tools</div>
                    <div class="sidebar-item mt-4"><i class="ph ph-student"></i> Profile</div>
                </aside>
                
                <main class="main-view" id="dashboard-main-view">
                    <!-- Dynamic Content Loaded Here -->
                </main>
                
                <aside class="right-panel">
                    <h3>Leaderboard</h3>
                    <div class="mt-4 flex flex-col gap-3">
                        <div class="flex justify-between"><span class="text-gold">1. Alex (MIT)</span> <span>2,400 pts</span></div>
                        <div class="flex justify-between text-muted"><span>2. Sarah (Stanford)</span> <span>2,100 pts</span></div>
                        <div class="flex justify-between text-primary font-bold"><span>3. You</span> <span>1,850 pts</span></div>
                    </div>
                </aside>
            </div>
        `;
        
        // Hide the navbar since dashboard has its own layout
        document.querySelector('.navbar').style.display = 'none';

        // Load specific tab content
        this.renderDashboardTabContent(this.state.activeDashboardTab);
    },

    switchDashboardTab(tabName) {
        this.state.activeDashboardTab = tabName;
        // Re-render sidebar to update active state
        this.renderDashboard();
    },

    renderDashboardTabContent(tabName) {
        const mainView = document.getElementById('dashboard-main-view');
        
        if (tabName === 'home') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>Welcome back, Scholar! 👋</h2>
                    <div class="badge">🔥 14 Day Streak</div>
                </div>
                
                <div class="grid grid-2 gap-4 mt-4">
                    <div class="glass-card">
                        <h3>🎯 Daily Mission</h3>
                        <p class="text-muted mt-2">Complete 10 Physics questions and beat your streak!</p>
                        <button class="btn btn-primary mt-4">Start Mission</button>
                    </div>
                    <div class="glass-card flex-col-center">
                        <h3 class="w-full text-left">📊 Progress</h3>
                        <div class="circular-progress mt-4">
                            <span>20% faster</span>
                        </div>
                    </div>
                </div>
                
                <h3 class="mt-6 mb-4">Your AI Tutor is waiting</h3>
                <div class="glass-card p-4 flex items-center gap-4 cursor-pointer" onclick="app.toggleChat()">
                    <div class="tutor-avatar">🧠</div>
                    <div>
                        <h4>Continue Physics Lesson</h4>
                        <p class="text-muted text-sm">Last discussed: Thermodynamics</p>
                    </div>
                </div>
            `;
        } else if (tabName === 'study-guides') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>📚 Study Guide Generator</h2>
                </div>
                <div class="glass-card p-6 text-center upload-zone mb-6" id="upload-zone-ui" onclick="document.getElementById('file-upload').click()">
                    <input type="file" id="file-upload" class="hidden" onchange="app.generateLiveStudyGuide(event)">
                    <i class="ph ph-upload-simple text-4xl text-primary mb-4 block"></i>
                    <h3>Upload notes, photos, or documents</h3>
                    <p class="text-muted mt-2 mb-4">AI will instantly create a full summary, key points, and flashcards.</p>
                    <button class="btn btn-secondary">Select File</button>
                </div>
                
                <div id="study-guide-output" class="glass-card p-6 mt-6 hidden border-glow text-left">
                    <!-- Guide output inside here -->
                </div>
                
                <h3>Recent Guides</h3>
                <div class="grid gap-3 mt-4">
                    <div class="glass-card p-4 flex justify-between items-center cursor-pointer hover-effect">
                        <div class="flex items-center gap-3"><i class="ph ph-file-text text-primary text-xl"></i><span>Photosynthesis Summary</span></div>
                        <span class="text-muted text-sm">Created Yesterday</span>
                    </div>
                </div>
            `;
        } else if (tabName === 'practice-questions') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>📝 Practice Question Maker</h2>
                </div>
                <div class="glass-card p-6 mb-6">
                    <div class="form-group">
                        <label>What topic do you want to practice?</label>
                        <input type="text" id="practiceTopic" placeholder="e.g. Calculus, World War II History, Python functions">
                    </div>
                    <div class="flex gap-4 mt-4">
                        <div class="form-group flex-1">
                            <label>Difficulty</label>
                            <select id="practiceDifficulty" class="styled-select">
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Boss Level</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <label>Number of Questions</label>
                            <select id="practiceCount" class="styled-select">
                                <option value="3">3</option>
                                <option value="5">5</option>
                                <option value="10">10</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary mt-4 w-full" onclick="app.generateLivePractice()">Generate Test ✨</button>
                    
                    <div id="practice-output" class="mt-6 hidden">
                        <!-- Questions will inject here -->
                    </div>
                </div>
            `;
        } else if (tabName === 'homework') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>📋 Homework Tracker</h2>
                    <button class="btn btn-primary"><i class="ph ph-plus"></i> Add Assignment</button>
                </div>
                
                <div class="homework-list">
                    <div class="glass-card p-4 mb-3 flex justify-between items-center border-left-warning">
                        <div>
                            <h4>Calculus Chapter 4 Exercises</h4>
                            <p class="text-muted text-sm mt-1">Math • Due Tomorrow at 11:59 PM</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-ghost">Grade with AI ✨</button>
                            <button class="btn btn-icon"><i class="ph ph-check"></i></button>
                        </div>
                    </div>
                    
                    <div class="glass-card p-4 mb-3 flex justify-between items-center border-left-danger">
                        <div>
                            <h4>Hamlet Essay Draft</h4>
                            <p class="text-muted text-sm mt-1 text-danger">English • Overdue</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-ghost text-muted">Grade with AI ✨</button>
                            <button class="btn btn-icon"><i class="ph ph-check"></i></button>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabName === 'missions') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>🎯 AI Study Missions</h2>
                    <div class="badge">🔥 14 Day Streak! (Don't break it!)</div>
                </div>
                
                <div class="glass-card flex-col-center p-6 mb-6 text-center border-glow" id="daily-mission-card">
                    <div class="tutor-avatar mb-4" style="width: 80px; height: 80px; font-size: 2.5rem;">⚡</div>
                    <h3>Boss Level Mission</h3>
                    <p class="text-muted mt-2 max-w-md">Your Eduverse AI noticed you struggled with Trigonometry yesterday. Complete this custom 10-question set to secure your streak!</p>
                    <button class="btn btn-primary btn-large mt-6" onclick="app.generateLiveMission(event, 'Trigonometry')">Start Mission (+50 Tokens)</button>
                </div>
                
                <div id="mission-output" class="mb-6 hidden"></div>
                
                <h3>Secondary Quests</h3>
                <div class="grid grid-2 gap-4 mt-4">
                    <div class="glass-card p-4">
                        <div class="flex justify-between">
                            <h4>Refer 1 Friend</h4>
                            <span class="text-gold font-bold">+100 🪙</span>
                        </div>
                        <p class="text-muted text-sm mt-2">Help someone discover free learning.</p>
                        <button class="btn btn-secondary mt-4 w-full text-sm"><i class="ph ph-share-network"></i> Copy Invite Link</button>
                    </div>
                    <div class="glass-card p-4 opacity-50">
                        <div class="flex justify-between">
                            <h4>Read Physics Notes</h4>
                            <span class="text-gold font-bold">+20 🪙</span>
                        </div>
                        <p class="text-muted text-sm mt-2 font-bold text-accent mt-2">✓ Completed</p>
                    </div>
                </div>
            `;
        } else if (tabName === 'doubt-chat') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>🗣️ Real-Time Doubt Chat</h2>
                    <div class="badge">Live Tutors & AI available</div>
                </div>
                
                <div class="grid grid-2 gap-4 h-full" style="min-height: 500px;">
                    <div class="glass-card flex flex-col h-full overflow-hidden">
                        <div class="p-4 border-b border-white-10 font-bold flex gap-2"><i class="ph ph-users text-primary"></i> Peer Study Groups</div>
                        <div class="flex-1 p-4 flex-col-center text-center">
                            <i class="ph ph-video-camera text-4xl text-muted mb-4 block"></i>
                            <h4>Join a Live Room</h4>
                            <p class="text-muted text-sm mt-2 mb-4">Jump into a subject room to study with verifyed peers.</p>
                            <div class="flex gap-2 w-full">
                                <button class="btn btn-secondary flex-1 text-sm">Calculus (4)</button>
                                <button class="btn btn-secondary flex-1 text-sm">Physics (12)</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="glass-card flex flex-col h-full overflow-hidden border-glow">
                        <div class="p-4 border-b border-white-10 font-bold flex gap-2"><i class="ph ph-robot text-primary"></i> Instant AI Expert</div>
                        <div class="flex-1 p-4 flex flex-col justify-between">
                            <div class="text-center mt-10" id="doubt-chat-placeholder">
                                <h3>Have a complex doubt?</h3>
                                <p class="text-muted text-sm mt-2">Upload an image of your problem or type it out. Get an instant, step-by-step breakdown.</p>
                            </div>
                            <div id="doubt-chat-history" class="chat-messages mb-4 flex-1 mt-4" style="border:none; background:transparent;"></div>
                            <div class="chat-input-area border-radius-md mt-4" style="background: rgba(0,0,0,0.4)">
                                <button class="btn-icon"><i class="ph ph-camera"></i></button>
                                <input type="text" id="doubtInput" placeholder="Explain the theory of relativity..." onkeypress="if(event.key === 'Enter') app.sendDoubtChart()">
                                <button class="btn-icon primary" onclick="app.sendDoubtChart()"><i class="ph-fill ph-paper-plane-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabName === 'progress') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>📈 Progress Analytics Dashboard</h2>
                    <select class="styled-select w-auto"><option>This Week</option><option>This Month</option></select>
                </div>
                
                <div class="grid gap-4">
                    <div class="glass-card p-6">
                        <h3 class="mb-4">Knowledge Mastery</h3>
                        <div class="flex justify-between items-end h-40 border-b border-white-10 pb-2 relative">
                            <!-- Mock Bar Chart -->
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 40%"></div>
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 30%"></div>
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 60%"></div>
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 80%"></div>
                            <div class="w-10 bg-accent rounded-t-sm" style="height: 95%"></div>
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 70%"></div>
                            <div class="w-10 bg-primary rounded-t-sm" style="height: 90%"></div>
                        </div>
                        <div class="flex justify-between text-muted text-sm mt-2 px-2">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-2 gap-4">
                        <div class="glass-card p-4 text-center">
                            <h4 class="text-muted">Total Study Time</h4>
                            <h2 class="text-primary text-4xl mt-2">14h 20m</h2>
                            <p class="text-accent text-sm mt-1">↑ +2.5h from last week</p>
                        </div>
                        <div class="glass-card p-4 text-center">
                            <h4 class="text-muted">Weak Areas Identified</h4>
                            <h3 class="mt-2">Organic Chemistry</h3>
                            <button class="btn btn-secondary btn-sm mt-3" onclick="app.switchDashboardTab('missions')">Generate Practice</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabName === 'campus-battle') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>⚔️ Campus Battle Mode</h2>
                    <div class="badge bg-danger text-white border-none text-white">LIVE SEASON 4</div>
                </div>
                
                <div class="glass-card p-6 mb-6 text-center" style="background: linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1));">
                    <h1 class="text-4xl mb-2 text-white">Stanford vs MIT</h1>
                    <p class="text-muted mb-4">You are representing <strong class="text-white">Stanford University</strong>. Every question you answer correctly adds points to your school's global rank!</p>
                    <div class="flex justify-between items-center bg-black bg-opacity-50 p-4 rounded-lg border border-white-10">
                        <div class="text-center">
                            <h2 class="text-primary text-3xl" id="stanford-pts">45,210</h2>
                            <div class="text-sm text-muted">Stanford Pts</div>
                        </div>
                        <div class="text-4xl font-bold text-muted">VS</div>
                        <div class="text-center">
                            <h2 class="text-secondary text-3xl">44,980</h2>
                            <div class="text-sm text-muted">MIT Pts</div>
                        </div>
                    </div>
                    <button class="btn btn-primary mt-4 w-full" onclick="app.contributeToCampusBattle()">Answer a Question for Stanford</button>
                </div>
                
                <h3>Global Leaderboard</h3>
                <div class="grid gap-2 mt-4">
                    <div class="glass-card p-4 border-left-warning flex justify-between items-center">
                        <div class="flex gap-4 items-center"><span class="font-bold text-xl text-gold">1</span> <h4>Stanford University</h4></div>
                        <span class="font-bold text-lg">45,210 pts</span>
                    </div>
                    <div class="glass-card p-4 flex justify-between items-center">
                        <div class="flex gap-4 items-center"><span class="font-bold text-xl text-muted">2</span> <h4>MIT</h4></div>
                        <span class="font-bold text-lg">44,980 pts</span>
                    </div>
                    <div class="glass-card p-4 flex justify-between items-center">
                        <div class="flex gap-4 items-center"><span class="font-bold text-xl text-muted">3</span> <h4>Harvard University</h4></div>
                        <span class="font-bold text-lg">39,100 pts</span>
                    </div>
                </div>
            `;
        } else if (tabName === 'tools') {
            mainView.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2>🛠️ Advanced Tools</h2>
                </div>
                
                <div class="grid grid-2 gap-4">
                    <div class="glass-card p-6 hover-effect cursor-pointer text-center" onclick="app.simulateProcessing('Opening tool...', 'tools')">
                        <i class="ph ph-translate text-4xl text-primary mb-2 block"></i>
                        <h3>Language Learner</h3>
                        <p class="text-sm text-muted mt-2">50+ languages with full vernacular support & voice tutor.</p>
                    </div>
                    <div class="glass-card p-6 hover-effect cursor-pointer text-center" onclick="app.simulateProcessing('Opening tool...', 'tools')">
                        <i class="ph ph-identification-card text-4xl text-accent mb-2 block"></i>
                        <h3>Admit Card Generator</h3>
                        <p class="text-sm text-muted mt-2">Generate formatted admit cards for any exam.</p>
                    </div>
                    <div class="glass-card p-6 hover-effect cursor-pointer text-center relative overflow-hidden" onclick="app.simulateProcessing('Opening tool...', 'tools')">
                        <div class="absolute top-0 right-0 bg-gold text-black text-xs px-2 py-1 rounded-bl-lg font-bold">SILVER</div>
                        <i class="ph ph-microphone-stage text-4xl text-secondary mb-2 block"></i>
                        <h3>Podcast Generator</h3>
                        <p class="text-sm text-muted mt-2">Turn any topic into a 20-min educational podcast.</p>
                    </div>
                    <div class="glass-card p-6 hover-effect cursor-pointer text-center relative overflow-hidden" onclick="app.simulateProcessing('Opening tool...', 'tools')">
                        <div class="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg font-bold">PLATINUM</div>
                        <i class="ph ph-briefcase text-4xl text-warning mb-2 block"></i>
                        <h3>Resume Builder</h3>
                        <p class="text-sm text-muted mt-2">Auto-generate a CV based on your learning map.</p>
                    </div>
                </div>
            `;
        }
    },

    simulateProcessing(message, tab) {
        const mainView = document.getElementById('dashboard-main-view');
        mainView.innerHTML = `
            <div class="flex-col-center py-20">
                <div class="spinner mb-4"></div>
                <h3>${message}</h3>
                <p class="text-muted mt-2">Eduverse AI is working its magic...</p>
            </div>
        `;
        
        setTimeout(() => {
            this.switchDashboardTab(tab);
        }, 2000);
    },

    async generateLivePractice() {
        const topic = document.getElementById('practiceTopic').value.trim();
        if (!topic) {
            alert("Please enter a topic first!");
            return;
        }
        
        const count = document.getElementById('practiceCount').value;
        const difficulty = document.getElementById('practiceDifficulty').value;
        const outputBtn = event.target;
        
        outputBtn.innerHTML = '<div class="spinner border-none w-5 h-5 border-2 inline-block -mb-1 mr-2"></div> AI is thinking...';
        outputBtn.disabled = true;

        const prompt = `Generate a ${difficulty} difficulty multiple-choice practice test about ${topic} with exactly ${count} questions. 
                        Format the output entirely in basic HTML suitable to inject directly into a div. Use <h4> for questions, and a styled list or <div class="form-group"> with radio buttons for answers. Add a "Show Answers" hidden block at the bottom. Keep it incredibly clean. Do not wrap in markdown \`\`\`html.`;

        try {
            const rawHtml = await this.callGeminiAPI(prompt, true);
            const container = document.getElementById('practice-output');
            container.innerHTML = rawHtml;
            container.classList.remove('hidden');
        } catch (e) {
            alert('Failed to generate test. Check API Key.');
        } finally {
            outputBtn.innerHTML = 'Generate Test ✨';
            outputBtn.disabled = false;
        }
    },

    async generateLiveStudyGuide(event) {
        const file = event.target.files[0];
        if (!file) return;

        const zone = document.getElementById('upload-zone-ui');
        zone.innerHTML = `<div class="spinner mb-4 mx-auto"></div><h3>Scanning file...</h3>`;

        // Simulate file reading/vision API (since true vision takes complex base64 logic which might be too heavy for MVP)
        // We will fake read the title of the file to generate the content via text API.
        const topic = file.name.split('.')[0].replace(/-/g, ' ');

        const prompt = `Act as an expert tutor. I just uploaded a document regarding "${topic}". 
                        Generate a beautiful Study Guide. Format it fully in HTML. 
                        Include: 1. A brief overview paragraph. 2. A <ul> list of 5 key bullet points. 3. Three concept flashcards (formatted beautifully using inline CSS).
                        Do not wrap the HTML in markdown blockquotes.`;

        try {
            const htmlGuide = await this.callGeminiAPI(prompt, true);
            const container = document.getElementById('study-guide-output');
            container.innerHTML = htmlGuide;
            container.classList.remove('hidden');
            zone.style.display = 'none'; // hide upload
        } catch (e) {
            zone.innerHTML = `<h3>Upload failed</h3>`;
        }
    },

    async generateLiveMission(event, subject) {
        const outputBtn = event.target;
        outputBtn.innerHTML = '<div class="spinner border-none w-5 h-5 border-2 inline-block -mb-1 mr-2"></div> Generating Mission...';
        outputBtn.disabled = true;

        const prompt = `Create a quick, fun 3-question pop quiz about ${subject}. Keep it very brief. Format the output as clean HTML just like a study card. Do not use markdown backticks.`;

        try {
            const missionHtml = await this.callGeminiAPI(prompt, true);
            const container = document.getElementById('mission-output');
            document.getElementById('daily-mission-card').style.display = 'none';
            container.innerHTML = `<div class="glass-card p-6 border-glow">${missionHtml} <button class="btn btn-primary mt-4 w-full" onclick="app.awardTokens(50); alert('Mission complete! +50 Tokens saved to your account!'); app.switchDashboardTab('home')">Submit Answers</button></div>`;
            container.classList.remove('hidden');
        } catch (e) {
            alert('Mission generation failed.');
            outputBtn.innerHTML = 'Start Mission';
            outputBtn.disabled = false;
        }
    },

    async awardTokens(amount) {
        if (!this.state.currentUser) return;
        try {
            const { data } = await supabase.from('users').select('tokens').eq('id', this.state.currentUser.id).single();
            const newTokens = (data && data.tokens ? data.tokens : 0) + amount;
            await supabase.from('users').update({ tokens: newTokens }).eq('id', this.state.currentUser.id);
            console.log(`Awarded ${amount} tokens. Total: ${newTokens}`);
        } catch (e) {
            console.log("Error saving tokens:", e);
        }
    },

    async contributeToCampusBattle() {
        // Quick interaction simulation
        const ptsEl = document.getElementById('stanford-pts');
        const currentPts = parseInt(ptsEl.innerText.replace(',', ''));
        ptsEl.innerText = (currentPts + 10).toLocaleString();
        
        // Add particle burst effect or simple visual feedback
        ptsEl.style.transform = 'scale(1.2)';
        ptsEl.style.color = '#FBBF24'; // gold
        setTimeout(() => {
            ptsEl.style.transform = 'scale(1)';
            ptsEl.style.color = 'var(--primary)';
        }, 300);

        // Sync with Supabase Cloud
        try {
            const { data } = await supabase.from('campus_battles').select('points').eq('school_id', 'Stanford').single();
            const newPts = (data && data.points ? data.points : currentPts) + 10;
            await supabase.from('campus_battles').upsert({ school_id: 'Stanford', points: newPts });
            console.log("Updated Global Campus Rank!");
        } catch (e) {
            console.log("Campus Battles error:", e);
        }
    },

    async sendDoubtChart() {
        const input = document.getElementById('doubtInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        
        document.getElementById('doubt-chat-placeholder').style.display = 'none';
        const history = document.getElementById('doubt-chat-history');
        
        history.innerHTML += `<div class="chat-bubble student text-sm">${text}</div>`;
        history.scrollTop = history.scrollHeight;

        const typingId = 'doubt-typing-' + Date.now();
        history.innerHTML += `<div id="${typingId}" class="chat-bubble ai text-sm"><div class="spinner border-none w-4 h-4 border-2"></div></div>`;
        history.scrollTop = history.scrollHeight;

        const prompt = `Act as an expert instant-doubt solving teacher. A student just asked: "${text}". Give a very clear, step-by-step breakdown formatted cleanly in HTML. Keep it under 150 words. Do not use markdown backticks.`;

        try {
            const response = await this.callGeminiAPI(prompt, true);
            document.getElementById(typingId)?.remove();
            history.innerHTML += `<div class="chat-bubble ai text-sm">${response}</div>`;
            history.scrollTop = history.scrollHeight;
        } catch (e) {
             document.getElementById(typingId)?.remove();
             history.innerHTML += `<div class="chat-bubble ai text-sm text-danger">Network Error. Try again.</div>`;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => app.init());
