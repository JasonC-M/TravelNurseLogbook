// Travel Nurse Logbook Application
class TravelNurseLogbook {
    constructor() {
        this.currentUser = null;
        this.contracts = [];
        this.editingContractId = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
    }

    // Data Management
    loadUserData() {
        const savedUser = localStorage.getItem('tnl_currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.loadContracts();
        }
    }

    saveUserData() {
        if (this.currentUser) {
            localStorage.setItem('tnl_currentUser', JSON.stringify(this.currentUser));
            this.saveContracts();
        }
    }

    loadContracts() {
        if (this.currentUser) {
            const savedContracts = localStorage.getItem(`tnl_contracts_${this.currentUser.email}`);
            this.contracts = savedContracts ? JSON.parse(savedContracts) : [];
        }
    }

    saveContracts() {
        if (this.currentUser) {
            localStorage.setItem(`tnl_contracts_${this.currentUser.email}`, JSON.stringify(this.contracts));
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('login-btn').addEventListener('click', () => this.showLogin());
        document.getElementById('register-btn').addEventListener('click', () => this.showRegister());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Form toggles
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('contractForm').addEventListener('submit', (e) => this.handleContractSubmit(e));

        // Contract management
        document.getElementById('add-contract-btn').addEventListener('click', () => this.showAddContractForm());
        document.getElementById('cancel-contract').addEventListener('click', () => this.hideAddContractForm());
    }

    // UI Management
    updateUI() {
        const authSection = document.getElementById('auth-section');
        const dashboardSection = document.getElementById('dashboard-section');
        const authNav = document.getElementById('auth-nav');
        const userNav = document.getElementById('user-nav');
        const welcomeUser = document.getElementById('welcome-user');

        if (this.currentUser) {
            // Show dashboard, hide auth
            authSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            authNav.classList.add('hidden');
            userNav.classList.remove('hidden');
            welcomeUser.textContent = `Welcome, ${this.currentUser.name}`;
            this.renderContracts();
        } else {
            // Show auth, hide dashboard
            authSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            authNav.classList.remove('hidden');
            userNav.classList.add('hidden');
        }
    }

    showLogin() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }

    showRegister() {
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
    }

    showAddContractForm() {
        document.getElementById('add-contract-form').classList.remove('hidden');
        document.getElementById('add-contract-btn').style.display = 'none';
        this.editingContractId = null;
        this.clearContractForm();
    }

    hideAddContractForm() {
        document.getElementById('add-contract-form').classList.add('hidden');
        document.getElementById('add-contract-btn').style.display = 'block';
        this.editingContractId = null;
        this.clearContractForm();
    }

    // Authentication
    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // Get all users from localStorage
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = user;
            this.saveUserData();
            this.updateUI();
            this.showMessage('Login successful!', 'success');
        } else {
            this.showMessage('Invalid email or password', 'error');
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const license = document.getElementById('register-license').value;

        // Check if user already exists
        const users = this.getAllUsers();
        if (users.find(u => u.email === email)) {
            this.showMessage('User with this email already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password,
            license,
            createdAt: new Date().toISOString()
        };

        // Save user
        users.push(newUser);
        localStorage.setItem('tnl_users', JSON.stringify(users));

        // Auto-login
        this.currentUser = newUser;
        this.contracts = [];
        this.saveUserData();
        this.updateUI();
        this.showMessage('Registration successful! Welcome to Travel Nurse Logbook!', 'success');
    }

    logout() {
        this.currentUser = null;
        this.contracts = [];
        localStorage.removeItem('tnl_currentUser');
        this.updateUI();
        this.showMessage('Logged out successfully', 'info');
    }

    getAllUsers() {
        const users = localStorage.getItem('tnl_users');
        return users ? JSON.parse(users) : [];
    }

    // Contract Management
    handleContractSubmit(e) {
        e.preventDefault();
        
        const contractData = {
            hospitalName: document.getElementById('hospital-name').value,
            location: document.getElementById('location').value,
            specialty: document.getElementById('specialty').value,
            shift: document.getElementById('shift').value,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            hourlyRate: parseFloat(document.getElementById('hourly-rate').value) || 0,
            housingStipend: parseFloat(document.getElementById('housing-stipend').value) || 0,
            agency: document.getElementById('agency').value,
            notes: document.getElementById('notes').value
        };

        if (this.editingContractId) {
            // Update existing contract
            const contractIndex = this.contracts.findIndex(c => c.id === this.editingContractId);
            this.contracts[contractIndex] = {
                ...this.contracts[contractIndex],
                ...contractData,
                updatedAt: new Date().toISOString()
            };
            this.showMessage('Contract updated successfully!', 'success');
        } else {
            // Add new contract
            const newContract = {
                id: Date.now().toString(),
                ...contractData,
                createdAt: new Date().toISOString()
            };
            this.contracts.push(newContract);
            this.showMessage('Contract added successfully!', 'success');
        }

        this.saveContracts();
        this.hideAddContractForm();
        this.renderContracts();
    }

    editContract(contractId) {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract) return;

        this.editingContractId = contractId;
        this.showAddContractForm();

        // Populate form with contract data
        document.getElementById('hospital-name').value = contract.hospitalName;
        document.getElementById('location').value = contract.location;
        document.getElementById('specialty').value = contract.specialty;
        document.getElementById('shift').value = contract.shift;
        document.getElementById('start-date').value = contract.startDate;
        document.getElementById('end-date').value = contract.endDate;
        document.getElementById('hourly-rate').value = contract.hourlyRate;
        document.getElementById('housing-stipend').value = contract.housingStipend;
        document.getElementById('agency').value = contract.agency;
        document.getElementById('notes').value = contract.notes;

        // Update form title
        document.querySelector('#add-contract-form h3').textContent = 'Edit Contract';
    }

    deleteContract(contractId) {
        if (confirm('Are you sure you want to delete this contract?')) {
            this.contracts = this.contracts.filter(c => c.id !== contractId);
            this.saveContracts();
            this.renderContracts();
            this.showMessage('Contract deleted successfully!', 'info');
        }
    }

    clearContractForm() {
        document.getElementById('contractForm').reset();
        document.querySelector('#add-contract-form h3').textContent = 'Add New Contract';
    }

    // UI Rendering
    renderContracts() {
        const noContracts = document.getElementById('no-contracts');
        const contractsGrid = document.getElementById('contracts-grid');

        if (this.contracts.length === 0) {
            noContracts.classList.remove('hidden');
            contractsGrid.classList.add('hidden');
        } else {
            noContracts.classList.add('hidden');
            contractsGrid.classList.remove('hidden');
            
            contractsGrid.innerHTML = this.contracts.map(contract => this.createContractCard(contract)).join('');
            
            // Add event listeners for edit/delete buttons
            contractsGrid.querySelectorAll('[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.editContract(e.target.dataset.contractId);
                });
            });
            
            contractsGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.deleteContract(e.target.dataset.contractId);
                });
            });
        }
    }

    createContractCard(contract) {
        const startDate = new Date(contract.startDate).toLocaleDateString();
        const endDate = new Date(contract.endDate).toLocaleDateString();
        const duration = this.calculateDuration(contract.startDate, contract.endDate);
        
        return `
            <div class="contract-card">
                <div class="contract-header">
                    <div>
                        <h3>${contract.hospitalName}</h3>
                        <div class="contract-location">${contract.location}</div>
                    </div>
                    <div class="contract-actions">
                        <button class="btn-small btn-edit" data-action="edit" data-contract-id="${contract.id}">Edit</button>
                        <button class="btn-small btn-delete" data-action="delete" data-contract-id="${contract.id}">Delete</button>
                    </div>
                </div>
                
                <div class="contract-details">
                    <div class="detail-item">
                        <span class="detail-label">Specialty</span>
                        <span class="detail-value">${contract.specialty}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Shift</span>
                        <span class="detail-value">${contract.shift}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Start Date</span>
                        <span class="detail-value">${startDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">End Date</span>
                        <span class="detail-value">${endDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${duration}</span>
                    </div>
                    ${contract.agency ? `
                    <div class="detail-item">
                        <span class="detail-label">Agency</span>
                        <span class="detail-value">${contract.agency}</span>
                    </div>
                    ` : ''}
                    ${contract.hourlyRate > 0 ? `
                    <div class="detail-item">
                        <span class="detail-label">Hourly Rate</span>
                        <span class="detail-value">$${contract.hourlyRate.toFixed(2)}/hr</span>
                    </div>
                    ` : ''}
                    ${contract.housingStipend > 0 ? `
                    <div class="detail-item">
                        <span class="detail-label">Housing Stipend</span>
                        <span class="detail-value">$${contract.housingStipend.toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${contract.notes ? `
                <div class="contract-notes">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${contract.notes}</div>
                </div>
                ` : ''}
            </div>
        `;
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        
        if (weeks > 0) {
            return `${weeks} week${weeks > 1 ? 's' : ''}${days > 0 ? ` ${days} day${days > 1 ? 's' : ''}` : ''}`;
        } else {
            return `${days} day${days > 1 ? 's' : ''}`;
        }
    }

    // Utility Methods
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('message-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        messageContainer.appendChild(messageElement);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TravelNurseLogbook();
});