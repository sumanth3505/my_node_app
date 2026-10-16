const $ = (id) => document.getElementById(id);

const authView = $("auth-view");
const dashboardView = $("dashboard-view");
const authForm = $("auth-form");
const authMessage = $("auth-message");
const studentForm = $("student-form");
const studentMessage = $("student-message");
const tableBody = $("student-table");
const toast = $("toast");

let authMode = "login";
let token = localStorage.getItem("studenthub_token") || "";
let currentUser = JSON.parse(localStorage.getItem("studenthub_user") || "null");
let students = [];
let editingId = null;
let toastTimer;

function setMessage(element, message = "", type = "") {
    element.textContent = message;
    element.className = `message ${type}`.trim();
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

async function api(url, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch {
        throw new Error("Cannot reach the server. Check your internet connection and try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && url.startsWith("/students")) logout(false);
        throw new Error(data.message || `Request failed (${response.status}).`);
    }
    return data;
}

function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === "register";
    $("login-tab").classList.toggle("active", !registering);
    $("register-tab").classList.toggle("active", registering);
    $("name-field").classList.toggle("hidden", !registering);
    $("name").required = registering;
    $("auth-title").textContent = registering ? "Create your account" : "Welcome back";
    $("auth-subtitle").textContent = registering ? "Register to start managing student records." : "Enter your details to access the dashboard.";
    $("auth-submit").innerHTML = registering ? 'Create account <span>→</span>' : 'Log in <span>→</span>';
    $("password").autocomplete = registering ? "new-password" : "current-password";
    setMessage(authMessage);
}

$("login-tab").addEventListener("click", () => setAuthMode("login"));
$("register-tab").addEventListener("click", () => setAuthMode("register"));

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("auth-submit");
    button.disabled = true;
    setMessage(authMessage);

    const payload = {
        email: $("email").value.trim(),
        password: $("password").value
    };
    if (authMode === "register") payload.name = $("name").value.trim();

    try {
        const result = await api(`/auth/${authMode === "register" ? "register" : "login"}`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (authMode === "register") {
            setMessage(authMessage, result.message, "success");
            authForm.reset();
            setAuthMode("login");
            setMessage(authMessage, result.message, "success");
        } else {
            token = result.token;
            currentUser = result.user;
            localStorage.setItem("studenthub_token", token);
            localStorage.setItem("studenthub_user", JSON.stringify(currentUser));
            showDashboard();
        }
    } catch (error) {
        setMessage(authMessage, error.message, "error");
    } finally {
        button.disabled = false;
    }
});

function showDashboard() {
    authView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loadStudents();
}

function logout(showNotice = true) {
    token = "";
    currentUser = null;
    students = [];
    localStorage.removeItem("studenthub_token");
    localStorage.removeItem("studenthub_user");
    dashboardView.classList.add("hidden");
    authView.classList.remove("hidden");
    resetStudentForm();
    if (showNotice) showToast("You have logged out.");
}

$("logout-button").addEventListener("click", () => logout());
$("refresh-button").addEventListener("click", loadStudents);

async function loadStudents() {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading student records…</td></tr>';
    try {
        students = await api("/students");
        renderStudents();
        updateStats();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(error.message)}</td></tr>`;
        updateStats();
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function renderStudents() {
    const query = $("search").value.trim().toLowerCase();
    const filtered = students.filter((student) =>
        [student.name, student.email, student.department].some((value) => String(value).toLowerCase().includes(query))
    );

    $("records-count").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}${query ? " found" : ""}`;

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${query ? "No matching students found." : "No students yet. Add your first student using the form."}</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map((student) => `
        <tr>
          <td><div class="student-name">${escapeHtml(student.name)}</div><div class="student-email">${escapeHtml(student.email)}</div></td>
          <td><span class="department-tag">${escapeHtml(student.department)}</span></td>
          <td><span class="marks-pill">${Number(student.marks).toFixed(2).replace(/\.00$/, "")}%</span></td>
          <td><div class="action-group">
            <button class="action-btn" data-action="edit" data-id="${Number(student.id)}" type="button">Edit</button>
            <button class="action-btn delete" data-action="delete" data-id="${Number(student.id)}" type="button">Delete</button>
          </div></td>
        </tr>`).join("");
}

function updateStats() {
    $("total-count").textContent = students.length;
    const average = students.length
        ? students.reduce((sum, student) => sum + Number(student.marks), 0) / students.length
        : null;
    $("average-marks").textContent = average === null ? "—" : `${average.toFixed(1)}%`;
}

$("search").addEventListener("input", renderStudents);

studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("save-student");
    button.disabled = true;
    setMessage(studentMessage);

    const payload = {
        name: $("student-name").value.trim(),
        email: $("student-email").value.trim(),
        department: $("student-department").value.trim(),
        marks: Number($("student-marks").value)
    };

    try {
        const result = await api(editingId ? `/students/${editingId}` : "/students", {
            method: editingId ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });
        showToast(result.message);
        resetStudentForm();
        await loadStudents();
    } catch (error) {
        setMessage(studentMessage, error.message, "error");
    } finally {
        button.disabled = false;
    }
});

tableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const student = students.find((item) => Number(item.id) === id);
    if (!student) return;

    if (button.dataset.action === "edit") {
        editingId = id;
        $("student-name").value = student.name;
        $("student-email").value = student.email;
        $("student-department").value = student.department;
        $("student-marks").value = Number(student.marks);
        $("student-form-title").textContent = "Edit student";
        $("save-student").textContent = "Save changes";
        $("cancel-edit").classList.remove("hidden");
        setMessage(studentMessage);
        $("student-name").focus();
        return;
    }

    if (button.dataset.action === "delete") {
        if (!confirm(`Delete ${student.name}'s record? This cannot be undone.`)) return;
        button.disabled = true;
        try {
            const result = await api(`/students/${id}`, { method: "DELETE" });
            showToast(result.message);
            if (editingId === id) resetStudentForm();
            await loadStudents();
        } catch (error) {
            showToast(error.message);
            button.disabled = false;
        }
    }
});

function resetStudentForm() {
    editingId = null;
    studentForm.reset();
    $("student-form-title").textContent = "Add a student";
    $("save-student").textContent = "Add student";
    $("cancel-edit").classList.add("hidden");
    setMessage(studentMessage);
}

$("cancel-edit").addEventListener("click", resetStudentForm);

if (token && currentUser) {
    showDashboard();
}
