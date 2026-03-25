// Global variables
let allIssues = [];
let filteredIssues = [];
let allUsers = [];
let filteredUsers = [];

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
}

// Custom popup function
function showPopup(title, message, type = 'info') {
    const popupOverlay = document.getElementById('popup-overlay');
    const popupIcon = document.getElementById('popup-icon');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupButton = document.getElementById('popup-button');

    popupIcon.className = 'popup-icon';
    if (type === 'success') {
        popupIcon.textContent = '✓';
        popupIcon.classList.add('success');
        popupButton.className = 'popup-button success';
    } else if (type === 'error') {
        popupIcon.textContent = '✕';
        popupIcon.classList.add('error');
        popupButton.className = 'popup-button error';
    } else if (type === 'warning') {
        popupIcon.textContent = '⚠';
        popupIcon.classList.add('warning');
        popupButton.className = 'popup-button';
    } else {
        popupIcon.textContent = 'ℹ';
        popupButton.className = 'popup-button';
    }

    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popupOverlay.classList.add('show');

    const closePopup = () => {
        popupOverlay.classList.remove('show');
        popupButton.removeEventListener('click', closePopup);
    };

    popupButton.addEventListener('click', closePopup);
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Check admin authentication
async function checkAdminAuth() {
    try {
        const { response, data } = await apiRequest('/api/auth/me', { method: 'GET' });
        if (!response.ok || !data.authenticated) {
            showPopup('Access Denied', 'Please log in to access the admin dashboard.', 'error');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1200);
            return false;
        }

        if (data.user?.role !== 'admin') {
            showPopup('Access Denied', 'You are not authorized to access the admin dashboard.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
            return false;
        }

        document.getElementById('admin-name').textContent = `👤 ${data.user.email}`;
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        showPopup('Network Error', 'Could not validate your session.', 'error');
        return false;
    }
}

// Load all issues from API
async function loadIssues() {
    try {
        const { response, data } = await apiRequest('/api/issues', { method: 'GET' });
        if (!response.ok) {
            showPopup('Error', data.error || 'Failed to load issues.', 'error');
            return;
        }

        allIssues = Array.isArray(data) ? data : [];
        allIssues.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        updateStatistics();
        filterIssues();
    } catch (error) {
        console.error('Error loading issues:', error);
        showPopup('Network Error', 'Failed to load issues from server.', 'error');
    }
}

// Load all users for admin view
async function loadUsers() {
    const usersList = document.getElementById('users-list');
    if (!usersList) {
        return;
    }

    try {
        const { response, data } = await apiRequest('/api/auth/users', { method: 'GET' });
        if (!response.ok) {
            showPopup('Error', data.error || 'Failed to load users.', 'error');
            return;
        }

        allUsers = Array.isArray(data) ? data : [];
        allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        filterUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showPopup('Network Error', 'Failed to load users from server.', 'error');
    }
}

async function exportUsers() {
    try {
        const formatEl = document.getElementById('user-export-format');
        const format = formatEl?.value || 'csv';

        const url = `/api/auth/users/export?format=${encodeURIComponent(format)}`;
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            showPopup('Error', data.error || 'Failed to export users.', 'error');
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition') || '';
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        const filename = filenameMatch ? filenameMatch[1] : `users.${format}`;

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        showPopup('Export Ready', 'Users export download has started.', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showPopup('Network Error', 'Could not export users.', 'error');
    }
}

// Update statistics
function updateStatistics() {
    const totalIssues = allIssues.length;
    const pendingIssues = allIssues.filter(issue => issue.status === 'pending').length;
    const solvedIssues = allIssues.filter(issue => issue.status === 'solved').length;

    document.getElementById('total-issues').textContent = totalIssues;
    document.getElementById('pending-issues').textContent = pendingIssues;
    document.getElementById('solved-issues').textContent = solvedIssues;
}

// Filter issues based on selected criteria
function filterIssues() {
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    filteredIssues = allIssues.filter(issue => {
        if (statusFilter !== 'all' && issue.status !== statusFilter) {
            return false;
        }

        if (typeFilter !== 'all' && issue.type !== typeFilter) {
            return false;
        }

        if (searchTerm) {
            const searchText = `${issue.type} ${issue.description} ${issue.location.address} ${issue.reporter}`.toLowerCase();
            if (!searchText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    displayIssues();
}

function filterUsers() {
    const userSearchInput = document.getElementById('user-search-input');
    const searchTerm = userSearchInput ? userSearchInput.value.toLowerCase() : '';

    filteredUsers = allUsers.filter(user => {
        if (!searchTerm) {
            return true;
        }

        const searchText = `${user.email} ${user.role}`.toLowerCase();
        return searchText.includes(searchTerm);
    });

    displayUsers();
}

// Display filtered issues
function displayIssues() {
    const issuesList = document.getElementById('issues-list');

    if (filteredIssues.length === 0) {
        issuesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 3em; margin-bottom: 20px;">📭</div>
                <h3>No Issues Found</h3>
                <p>No issues match your current filters.</p>
            </div>
        `;
        return;
    }

    issuesList.innerHTML = '';
    filteredIssues.forEach(issue => {
        const issueElement = createIssueElement(issue);
        issuesList.appendChild(issueElement);
    });
}

function displayUsers() {
    const usersList = document.getElementById('users-list');
    if (!usersList) {
        return;
    }

    if (filteredUsers.length === 0) {
        usersList.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #666;">
                <div style="font-size: 2.2em; margin-bottom: 12px;">👥</div>
                <h3 style="margin-bottom: 6px;">No Users Found</h3>
                <p>No users match your search.</p>
            </div>
        `;
        return;
    }

    usersList.innerHTML = '';
    filteredUsers.forEach(user => {
        usersList.appendChild(createUserElement(user));
    });
}

function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';

    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown';
    const roleClass = user.role === 'admin' ? 'admin' : 'user';
    const issueWord = user.issues_count === 1 ? 'issue' : 'issues';

    userDiv.innerHTML = `
        <div class="user-main">
            <span class="user-email">📧 ${user.email}</span>
            <span class="role-badge ${roleClass}">${user.role}</span>
        </div>
        <div class="user-meta">
            <span>📝 Reports: ${user.issues_count} ${issueWord}</span>
            <span>🗓️ Joined: ${createdAt}</span>
        </div>
    `;

    return userDiv;
}

// Create issue element for admin view
function createIssueElement(issue) {
    const issueDiv = document.createElement('div');
    issueDiv.className = 'issue-item';

    const issueTypeIcon = getIssueTypeIcon(issue.type);
    const formattedDate = new Date(issue.timestamp).toLocaleString();
    const reporterEmail = issue.reporter || 'unknown';
    const imageHtml = issue.image
        ? `
            <div class="issue-image">
                <img src="${issue.image}" alt="Issue Image">
            </div>
        `
        : '';

    issueDiv.innerHTML = `
        <div class="issue-header">
            <div class="issue-title">
                <span class="issue-icon">${issueTypeIcon}</span>
                <span class="issue-type">${issue.type.replace('-', ' ')}</span>
            </div>
            <span class="status-badge ${issue.status}">${issue.status}</span>
        </div>

        <div class="issue-description">${issue.description}</div>

        <div class="issue-location">
            📍 ${issue.location.address}
        </div>

        <div class="issue-meta">
            <span>👤 Reported by: ${reporterEmail}</span>
            <span>🕒 ${formattedDate}</span>
        </div>

        ${imageHtml}

        <div class="status-update">
            <h4>Update Status:</h4>
            <div class="status-buttons">
                <button class="status-btn pending ${issue.status === 'pending' ? 'active' : ''}"
                        onclick="updateIssueStatus('${issue.id}', 'pending')"
                        ${issue.status === 'pending' ? 'disabled' : ''}>
                    Mark as Pending
                </button>
                <button class="status-btn solved ${issue.status === 'solved' ? 'active' : ''}"
                        onclick="updateIssueStatus('${issue.id}', 'solved')"
                        ${issue.status === 'solved' ? 'disabled' : ''}>
                    Mark as Solved
                </button>
                <button class="status-btn delete-btn" style="background:linear-gradient(90deg,#ff5252,#ff9800);color:white;margin-left:10px;" onclick="deleteIssue('${issue.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;

    return issueDiv;
}

// Delete issue by id
async function deleteIssue(issueId) {
    if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
        return;
    }

    try {
        const { response, data } = await apiRequest(`/api/issues/${issueId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            showPopup('Error', data.error || 'Failed to delete issue.', 'error');
            return;
        }
        await loadIssues();
        showPopup('Deleted', 'Issue has been deleted.', 'success');
    } catch (error) {
        console.error('Delete failed:', error);
        showPopup('Network Error', 'Could not delete the issue.', 'error');
    }
}

// Get issue type icon
function getIssueTypeIcon(type) {
    const icons = {
        'traffic-jam': '🚗',
        'accident': '🚨',
        'road-closure': '🚧',
        'construction': '🏗️',
        'pothole': '🕳️',
        'flooding': '🌊',
        'broken-traffic-light': '🚦',
        'other': '⚠️'
    };
    return icons[type] || '⚠️';
}

// Update issue status
async function updateIssueStatus(issueId, newStatus) {
    try {
        const { response, data } = await apiRequest(`/api/issues/${issueId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
            showPopup('Error', data.error || 'Failed to update issue status.', 'error');
            return;
        }
        await loadIssues();
        showPopup('Status Updated', `Issue has been marked as ${newStatus}.`, 'success');
    } catch (error) {
        console.error('Status update failed:', error);
        showPopup('Network Error', 'Could not update issue status.', 'error');
    }
}

// Logout function
async function logout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch (error) {
        console.error('Logout request failed:', error);
    }
    showPopup('Logged Out', 'You have been successfully logged out.', 'success');
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 900);
}

// Go to home function
function goToHome() {
    window.location.href = 'index.html';
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) {
        return;
    }

    await loadIssues();
    await loadUsers();

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            loadIssues();
        }

        if (e.key === 'Escape') {
            const popupOverlay = document.getElementById('popup-overlay');
            if (popupOverlay.classList.contains('show')) {
                popupOverlay.classList.remove('show');
            }
        }
    });
});