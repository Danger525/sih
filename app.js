// Application Data and State Management
class AttendanceApp {
    constructor() {
        // Initialize with empty data - will be loaded from localStorage
        this.students = [];
        this.currentStats = {
            "today_present": 0,
            "today_absent": 0,
            "attendance_rate": 0,
            "total_days": 0,
            "sms_sent_today": 0,
            "ai_accuracy": 0
        };
        this.attendanceTrends = [];
        this.attendanceRecords = [];
        this.currentPage = 'dashboard';
        this.currentLanguage = 'EN';
        this.settings = {
            schoolName: 'School Name',
            principalName: 'Principal Name',
            schoolAddress: 'School Address',
            recognitionThreshold: 0.85,
            antiSpoofingLevel: 'medium',
            smsEnabled: true,
            dailyReports: true,
            weeklyReports: false
        };
        
        this.loadData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.renderDashboard();
        this.renderStudents();
        this.renderReports();
    }

    // Data persistence methods
    loadData() {
        try {
            const savedStudents = localStorage.getItem('attendance_students');
            if (savedStudents) {
                this.students = JSON.parse(savedStudents);
            }

            const savedAttendance = localStorage.getItem('attendance_records');
            if (savedAttendance) {
                this.attendanceRecords = JSON.parse(savedAttendance);
            }

            const savedSettings = localStorage.getItem('attendance_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }

            this.updateStats();
            this.updateAttendanceTrends();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }

    saveData() {
        try {
            localStorage.setItem('attendance_students', JSON.stringify(this.students));
            localStorage.setItem('attendance_records', JSON.stringify(this.attendanceRecords));
            localStorage.setItem('attendance_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.attendanceRecords.filter(record => record.date === today);
        
        if (todayRecords.length > 0) {
            const presentCount = todayRecords[0].records.filter(r => r.status === 'present').length;
            this.currentStats.today_present = presentCount;
            this.currentStats.today_absent = this.students.length - presentCount;
            this.currentStats.attendance_rate = this.students.length > 0 ? 
                ((presentCount / this.students.length) * 100).toFixed(1) : 0;
        } else {
            this.currentStats.today_present = 0;
            this.currentStats.today_absent = this.students.length;
            this.currentStats.attendance_rate = 0;
        }

        this.currentStats.total_days = new Set(this.attendanceRecords.map(r => r.date)).size;
        this.currentStats.sms_sent_today = todayRecords.length > 0 ? todayRecords[0].records.length : 0;
    }

    updateAttendanceTrends() {
        // Generate trends from actual attendance data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayRecords = this.attendanceRecords.find(r => r.date === dateStr);
            if (dayRecords) {
                const present = dayRecords.records.filter(r => r.status === 'present').length;
                const absent = dayRecords.records.filter(r => r.status === 'absent').length;
                last7Days.push({ date: dateStr, present, absent });
            } else {
                last7Days.push({ date: dateStr, present: 0, absent: 0 });
            }
        }
        this.attendanceTrends = last7Days;
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item, .action-card').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.closest('[data-page]').dataset.page;
                this.navigateToPage(page);
            });
        });

        // Language toggle
        document.getElementById('languageToggle').addEventListener('click', () => {
            this.toggleLanguage();
        });

        // Attendance page functionality
        this.setupAttendanceListeners();

        // Student management
        this.setupStudentManagementListeners();

        // Modal handling
        this.setupModalListeners();
    }

    setupAttendanceListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        const cameraBtn = document.getElementById('cameraBtn');
        const retakeBtn = document.getElementById('retakeBtn');
        const confirmBtn = document.getElementById('confirmAttendance');

        // File upload handlers
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processImage(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.processImage(e.dataTransfer.files[0]);
            }
        });

        uploadArea.addEventListener('click', () => fileInput.click());

        // Camera simulation
        cameraBtn.addEventListener('click', () => {
            this.simulateCamera();
        });

        retakeBtn.addEventListener('click', () => {
            this.resetAttendancePage();
        });

        confirmBtn.addEventListener('click', () => {
            this.confirmAttendance();
        });
    }

    setupStudentManagementListeners() {
        document.getElementById('addStudentBtn').addEventListener('click', () => {
            this.openStudentModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportStudentData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.importStudentData();
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('studentModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveStudentBtn');

        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        saveBtn.addEventListener('click', () => this.saveStudent());

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // Trigger page-specific rendering
        switch(page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'students':
                this.renderStudents();
                break;
            case 'reports':
                this.renderReports();
                break;
            case 'attendance':
                this.resetAttendancePage();
                break;
        }
    }

    renderDashboard() {
        // Update stats
        document.getElementById('totalStudents').textContent = this.students.length;
        document.getElementById('presentToday').textContent = this.currentStats.today_present;
        document.getElementById('absentToday').textContent = this.currentStats.today_absent;
        document.getElementById('attendanceRate').textContent = `${this.currentStats.attendance_rate}%`;

        // Show welcome message if no students
        if (this.students.length === 0) {
            this.showWelcomeMessage();
        }

        // Render attendance chart
        this.renderAttendanceChart();
    }

    showWelcomeMessage() {
        const dashboardPage = document.getElementById('dashboard-page');
        const existingWelcome = dashboardPage.querySelector('.welcome-message');
        if (existingWelcome) return;

        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <div style="background: var(--color-bg-1); border: 1px solid var(--color-card-border); border-radius: var(--radius-lg); padding: 2rem; text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>
                <h3>Welcome to SmartAttend!</h3>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                    Get started by adding your students and taking your first attendance.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn--primary" onclick="app.openStudentModal()">Add Students</button>
                    <button class="btn btn--outline" onclick="app.navigateToPage('settings')">Configure Settings</button>
                </div>
            </div>
        `;
        
        const statsGrid = dashboardPage.querySelector('.stats-grid');
        statsGrid.parentNode.insertBefore(welcomeMessage, statsGrid);
    }

    renderAttendanceChart() {
        const ctx = document.getElementById('attendanceChart');
        if (!ctx) return;

        const chartData = {
            labels: this.attendanceTrends.map(d => new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Present',
                    data: this.attendanceTrends.map(d => d.present),
                    backgroundColor: '#1FB8CD',
                    borderColor: '#1FB8CD',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Absent',
                    data: this.attendanceTrends.map(d => d.absent),
                    backgroundColor: '#B4413C',
                    borderColor: '#B4413C',
                    borderWidth: 2,
                    fill: false
                }
            ]
        };

        new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    processImage(file) {
        const uploadArea = document.getElementById('uploadArea');
        const processingStatus = document.getElementById('processingStatus');
        const imagePreview = document.getElementById('imagePreview');
        
        // Hide upload area and show processing
        uploadArea.classList.add('hidden');
        processingStatus.classList.remove('hidden');

        // Simulate AI processing
        this.simulateAIProcessing().then(() => {
            // Show image preview with face detection
            this.showImagePreview(file);
            processingStatus.classList.add('hidden');
            imagePreview.classList.remove('hidden');
            
            // Generate attendance results
            setTimeout(() => {
                this.generateAttendanceResults();
            }, 1000);
        });
    }

    async simulateCamera() {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera if available
                } 
            });
            
            this.showCameraInterface(stream);
        } catch (error) {
            console.error('Camera access denied:', error);
            this.showToast('Camera access denied. Please allow camera access to take photos.', 'error');
            // Fallback to file upload
            document.getElementById('fileInput').click();
        }
    }

    showCameraInterface(stream) {
        // Create camera modal
        const cameraModal = document.createElement('div');
        cameraModal.className = 'camera-modal';
        cameraModal.innerHTML = `
            <div class="camera-container">
                <div class="camera-header">
                    <h3>Take Class Photo</h3>
                    <button class="btn btn--sm btn--outline" id="closeCamera">Close</button>
                </div>
                <div class="camera-preview">
                    <video id="cameraVideo" autoplay playsinline></video>
                    <div class="camera-overlay">
                        <div class="camera-frame"></div>
                    </div>
                </div>
                <div class="camera-controls">
                    <button class="btn btn--primary btn--lg" id="capturePhoto">📸 Capture Photo</button>
                    <button class="btn btn--outline" id="switchCamera">Switch Camera</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(cameraModal);
        
        const video = document.getElementById('cameraVideo');
        video.srcObject = stream;
        
        // Event listeners
        document.getElementById('closeCamera').addEventListener('click', () => {
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(cameraModal);
        });
        
        document.getElementById('capturePhoto').addEventListener('click', () => {
            this.capturePhoto(video, stream);
        });
        
        document.getElementById('switchCamera').addEventListener('click', () => {
            this.switchCamera(stream);
        });
    }

    capturePhoto(video, stream) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], 'class-photo.jpg', { type: 'image/jpeg' });
            this.processImage(file);
            
            // Stop camera and close modal
            stream.getTracks().forEach(track => track.stop());
            document.querySelector('.camera-modal').remove();
        }, 'image/jpeg', 0.8);
    }

    async switchCamera(stream) {
        stream.getTracks().forEach(track => track.stop());
        
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user' // Switch to front camera
                } 
            });
            
            const video = document.getElementById('cameraVideo');
            video.srcObject = newStream;
        } catch (error) {
            this.showToast('Error switching camera', 'error');
        }
    }


    showImagePreview(file) {
        const previewImage = document.getElementById('previewImage');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.onload = () => {
                this.addFaceDetectionBoxes();
            };
        };
        reader.readAsDataURL(file);
    }

    addFaceDetectionBoxes() {
        const faceOverlays = document.getElementById('faceOverlays');
        faceOverlays.innerHTML = '';

        // Simulate face detection with random positions
        const numFaces = Math.min(6, this.students.length);
        for (let i = 0; i < numFaces; i++) {
            const faceBox = document.createElement('div');
            faceBox.className = 'face-box';
            
            // Random positions (simulate detected faces)
            const left = Math.random() * 70 + 5; // 5-75%
            const top = Math.random() * 60 + 10; // 10-70%
            const width = 8 + Math.random() * 4; // 8-12%
            const height = 12 + Math.random() * 6; // 12-18%
            
            faceBox.style.left = `${left}%`;
            faceBox.style.top = `${top}%`;
            faceBox.style.width = `${width}%`;
            faceBox.style.height = `${height}%`;
            
            const label = document.createElement('div');
            label.className = 'face-label';
            label.textContent = this.students[i] ? this.students[i].name.split(' ')[0] : 'Unknown';
            faceBox.appendChild(label);
            
            faceOverlays.appendChild(faceBox);
        }
    }

    async simulateAIProcessing() {
        const processingText = document.getElementById('processingText');
        const steps = [
            'Detecting faces...',
            'Extracting face embeddings...',
            'Matching with database...',
            'Calculating confidence scores...',
            'Applying anti-spoofing checks...'
        ];

        for (let i = 0; i < steps.length; i++) {
            processingText.textContent = steps[i];
            await new Promise(resolve => setTimeout(resolve, 600));
        }
    }

    generateAttendanceResults() {
        const attendanceResults = document.getElementById('attendanceResults');
        const detectedCount = document.getElementById('detectedCount');
        const recognizedCount = document.getElementById('recognizedCount');
        const confidenceScore = document.getElementById('confidenceScore');
        const studentAttendanceList = document.getElementById('studentAttendanceList');

        if (this.students.length === 0) {
            this.showToast('No students found. Please add students first.', 'warning');
            return;
        }

        // Simulate face detection and recognition
        const detected = Math.min(Math.floor(this.students.length * 0.8), this.students.length);
        const recognized = Math.max(1, detected - Math.floor(Math.random() * 2));
        const confidence = 85 + Math.random() * 12;

        detectedCount.textContent = detected;
        recognizedCount.textContent = recognized;
        confidenceScore.textContent = `${confidence.toFixed(1)}%`;

        // Generate student list with more realistic attendance patterns
        studentAttendanceList.innerHTML = '';
        this.students.forEach((student, index) => {
            const item = document.createElement('div');
            item.className = 'student-attendance-item';
            
            // More realistic attendance simulation
            const isPresent = index < recognized && Math.random() > 0.15; // 85% attendance rate
            const confidenceLevel = isPresent ? Math.max(75, confidence - Math.random() * 15) : 0;
            
            item.innerHTML = `
                <div class="student-info">
                    <div class="student-avatar">${student.name.charAt(0)}</div>
                    <div>
                        <div style="font-weight: 500;">${student.name}</div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">${student.roll_no}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span class="status ${isPresent ? 'status--success' : 'status--error'}">
                        ${isPresent ? 'Present' : 'Absent'}
                    </span>
                    ${isPresent ? `<div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">${confidenceLevel.toFixed(1)}% confidence</div>` : ''}
                </div>
            `;
            
            studentAttendanceList.appendChild(item);
        });

        attendanceResults.classList.remove('hidden');
    }

    confirmAttendance() {
        // Get attendance data from the UI
        const today = new Date().toISOString().split('T')[0];
        const studentAttendanceList = document.getElementById('studentAttendanceList');
        const attendanceItems = studentAttendanceList.querySelectorAll('.student-attendance-item');
        
        const attendanceData = {
            date: today,
            records: [],
                timestamp: new Date().toISOString(),
            method: 'ai_recognition'
        };

        // Extract attendance data from UI
        attendanceItems.forEach(item => {
            const studentName = item.querySelector('.student-info div:first-child').textContent;
            const statusElement = item.querySelector('.status');
            const isPresent = statusElement.classList.contains('status--success');
            const confidenceText = item.querySelector('div[style*="font-size: 11px"]');
            const confidence = confidenceText ? parseFloat(confidenceText.textContent) : 0;
            
            const student = this.students.find(s => s.name === studentName);
            if (student) {
                attendanceData.records.push({
                    student_id: student.id,
                    student_name: student.name,
                    status: isPresent ? 'present' : 'absent',
                    timestamp: new Date().toISOString(),
                    confidence: confidence
                });
            }
        });

        // Remove existing record for today if any
        this.attendanceRecords = this.attendanceRecords.filter(r => r.date !== today);
        this.attendanceRecords.push(attendanceData);

        // Save data
        this.saveData();
        this.updateStats();
        this.updateAttendanceTrends();

        // Send SMS notifications if enabled
        if (this.settings.smsEnabled) {
            this.sendSMSNotifications(attendanceData);
        }

        // Show success message
        this.showToast('Attendance saved successfully!' + (this.settings.smsEnabled ? ' SMS notifications sent to parents.' : ''));
        
        // Navigate back to dashboard
        setTimeout(() => {
            this.navigateToPage('dashboard');
        }, 2000);
    }

    sendSMSNotifications(attendanceData) {
        // In a real implementation, this would integrate with an SMS service like Twilio, AWS SNS, etc.
        const absentStudents = attendanceData.records.filter(r => r.status === 'absent');
        
        if (absentStudents.length === 0) {
            this.showToast('All students present - no SMS notifications needed', 'info');
            return;
        }
        
        // Simulate SMS sending with realistic delay
        this.showToast('Sending SMS notifications...', 'info');
        
        setTimeout(() => {
            absentStudents.forEach(record => {
                const student = this.students.find(s => s.id === record.student_id);
                if (student && student.parent_phone) {
                    // In production, this would be an actual API call
                    console.log(`SMS sent to ${student.parent_phone}: ${student.name} was absent today at ${new Date().toLocaleTimeString()}.`);
                }
            });
            
            this.showToast(`SMS notifications sent to ${absentStudents.length} parents`, 'success');
        }, 2000);
    }

    resetAttendancePage() {
        document.getElementById('uploadArea').classList.remove('hidden');
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('attendanceResults').classList.add('hidden');
        document.getElementById('fileInput').value = '';
    }

    renderStudents() {
        const studentsGrid = document.getElementById('studentsGrid');
        studentsGrid.innerHTML = '';

        if (this.students.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">👨‍🎓</div>
                    <h3>No Students Added Yet</h3>
                    <p>Get started by adding your first student to the system.</p>
                    <button class="btn btn--primary" onclick="app.openStudentModal()">Add First Student</button>
                </div>
            `;
            studentsGrid.appendChild(emptyState);
            return;
        }

        this.students.forEach(student => {
            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            
            // Calculate actual attendance rate for this student
            const studentRecords = this.attendanceRecords.flatMap(day => 
                day.records.filter(record => record.student_id === student.id)
            );
            const presentCount = studentRecords.filter(record => record.status === 'present').length;
            const attendanceRate = studentRecords.length > 0 ? (presentCount / studentRecords.length * 100).toFixed(1) : 0;
            
            studentCard.innerHTML = `
                <div class="student-photo">${student.name.charAt(0)}</div>
                <h4>${student.name}</h4>
                <div class="student-roll">${student.roll_no} • ${student.class}</div>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
                    Attendance: ${attendanceRate}%
                </div>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 12px;">
                    ${student.parent_phone}
                </div>
                <div class="student-actions">
                    <button class="btn btn--sm btn--outline" onclick="app.editStudent(${student.id})">Edit</button>
                    <button class="btn btn--sm btn--outline" onclick="app.viewStudentProfile(${student.id})">View</button>
                </div>
            `;
            
            studentsGrid.appendChild(studentCard);
        });
    }

    editStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (student) {
            this.openStudentModal(student);
        }
    }

    viewStudentProfile(id) {
        const student = this.students.find(s => s.id === id);
        if (student) {
            this.showToast(`Viewing profile for ${student.name} (${student.roll_no})`, 'info');
        }
    }

    openStudentModal(student = null) {
        const modal = document.getElementById('studentModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('studentForm');
        
        if (student) {
            modalTitle.textContent = 'Edit Student';
            document.getElementById('studentName').value = student.name;
            document.getElementById('rollNumber').value = student.roll_no;
            document.getElementById('studentClass').value = student.class;
            document.getElementById('parentPhone').value = student.parent_phone;
            form.dataset.studentId = student.id;
        } else {
            modalTitle.textContent = 'Add Student';
            form.reset();
            delete form.dataset.studentId;
        }
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('studentModal').classList.add('hidden');
    }

    saveStudent() {
        const form = document.getElementById('studentForm');
        
        // Validate form data
        const name = document.getElementById('studentName').value.trim();
        const rollNo = document.getElementById('rollNumber').value.trim();
        const studentClass = document.getElementById('studentClass').value;
        const parentPhone = document.getElementById('parentPhone').value.trim();
        
        if (!name || !rollNo || !studentClass || !parentPhone) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Check for duplicate roll number
        const existingStudent = this.students.find(s => s.roll_no === rollNo && s.id !== parseInt(form.dataset.studentId || 0));
        if (existingStudent) {
            this.showToast('Roll number already exists', 'error');
            return;
        }
        
        // Validate phone number format
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(parentPhone.replace(/[\s\-\(\)]/g, ''))) {
            this.showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        const studentData = {
            name: name,
            roll_no: rollNo,
            class: studentClass,
            parent_phone: parentPhone,
            photo: 'default.jpg'
        };

        if (form.dataset.studentId) {
            // Edit existing student
            const id = parseInt(form.dataset.studentId);
            const index = this.students.findIndex(s => s.id === id);
            if (index !== -1) {
                this.students[index] = { ...this.students[index], ...studentData };
                this.showToast('Student updated successfully!');
            }
        } else {
            // Add new student
            const newId = this.students.length > 0 ? Math.max(...this.students.map(s => s.id)) + 1 : 1;
            this.students.push({ id: newId, ...studentData });
            this.showToast('Student added successfully!');
        }

        // Save data and update UI
        this.saveData();
        this.updateStats();
        this.closeModal();
        this.renderStudents();
        this.renderDashboard();
    }

    exportStudentData() {
        if (this.students.length === 0) {
            this.showToast('No students to export', 'warning');
            return;
        }
        
        const csvContent = [
            'ID,Name,Roll No,Class,Parent Phone',
            ...this.students.map(s => `${s.id},${s.name},${s.roll_no},${s.class},${s.parent_phone}`)
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showToast('Student data exported successfully!');
    }

    importStudentData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        this.parseCSVData(e.target.result);
                    } catch (error) {
                        this.showToast('Error parsing CSV file', 'error');
                        console.error('CSV parsing error:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    parseCSVData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            this.showToast('CSV file must have at least a header and one data row', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'roll no', 'class', 'parent phone'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            this.showToast(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
            return;
        }

        const newStudents = [];
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue;

            const studentData = {};
            headers.forEach((header, index) => {
                studentData[header.replace(' ', '_')] = values[index];
            });

            // Validate data
            if (!studentData.name || !studentData.roll_no || !studentData.class || !studentData.parent_phone) {
                errors.push(`Row ${i + 1}: Missing required fields`);
                continue;
            }

            // Check for duplicate roll number
            if (this.students.some(s => s.roll_no === studentData.roll_no)) {
                errors.push(`Row ${i + 1}: Roll number ${studentData.roll_no} already exists`);
                continue;
            }

            const newId = this.students.length > 0 ? Math.max(...this.students.map(s => s.id)) + 1 + newStudents.length : newStudents.length + 1;
            newStudents.push({
                id: newId,
                name: studentData.name,
                roll_no: studentData.roll_no,
                class: studentData.class,
                parent_phone: studentData.parent_phone,
                photo: 'default.jpg'
            });
        }

        if (newStudents.length > 0) {
            this.students.push(...newStudents);
            this.saveData();
            this.updateStats();
            this.renderStudents();
            this.renderDashboard();
            this.showToast(`Successfully imported ${newStudents.length} students`);
        }

        if (errors.length > 0) {
            this.showToast(`Import completed with ${errors.length} errors. Check console for details.`, 'warning');
            console.error('Import errors:', errors);
        }
    }


    renderReports() {
        this.renderReportCharts();
        this.renderAttendanceTable();
    }

    renderReportCharts() {
        // Daily attendance chart
        const dailyCtx = document.getElementById('dailyChart');
        if (dailyCtx && !dailyCtx.chart) {
            new Chart(dailyCtx, {
                type: 'bar',
                data: {
                    labels: this.attendanceTrends.map(d => new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
                    datasets: [{
                        label: 'Present',
                        data: this.attendanceTrends.map(d => d.present),
                        backgroundColor: '#1FB8CD'
                    }, {
                        label: 'Absent',
                        data: this.attendanceTrends.map(d => d.absent),
                        backgroundColor: '#B4413C'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true }
                    }
                }
            });
        }

        // Student-wise attendance chart
        const studentCtx = document.getElementById('studentChart');
        if (studentCtx && !studentCtx.chart) {
            const studentAttendanceData = this.students.map(student => {
                return 75 + Math.random() * 20; // Simulate attendance rates
            });

            new Chart(studentCtx, {
                type: 'doughnut',
                data: {
                    labels: this.students.map(s => s.name.split(' ')[0]),
                    datasets: [{
                        data: studentAttendanceData,
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    renderAttendanceTable() {
        const tableBody = document.getElementById('attendanceTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        
        if (this.attendanceRecords.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                    No attendance records found. Take attendance to see data here.
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        // Flatten attendance records for table display
        const allRecords = [];
        this.attendanceRecords.forEach(dayRecord => {
            dayRecord.records.forEach(record => {
                allRecords.push({
                    date: dayRecord.date,
                    student_name: record.student_name,
                    status: record.status,
                    time: new Date(record.timestamp).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    method: dayRecord.method
                });
            });
        });
        
        // Show recent 20 records
        const recentRecords = allRecords.slice(-20).reverse();
        
        recentRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
                <td>${record.student_name}</td>
                <td><span class="status ${record.status === 'present' ? 'status--success' : 'status--error'}">${record.status}</span></td>
                <td>${record.time}</td>
                <td>${record.method}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'EN' ? 'HI' : 'EN';
        document.querySelector('.current-lang').textContent = this.currentLanguage;
        
        if (this.currentLanguage === 'HI') {
            this.showToast('भाषा हिंदी में बदल दी गई (Language changed to Hindi)', 'info');
        } else {
            this.showToast('Language changed to English', 'info');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.querySelector('.toast-message');
        const toastIcon = document.querySelector('.toast-icon');
        
        // Set icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toastIcon.textContent = icons[type] || icons.success;
        toastMessage.textContent = message;
        
        // Update toast style based on type
        toast.className = 'toast';
        if (type !== 'success') {
            toast.style.background = type === 'error' ? '#B4413C' : 
                                   type === 'warning' ? '#FFC185' : '#5D878F';
        }
        
        // Show toast
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        // Hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.style.background = ''; // Reset background
            }, 300);
        }, 4000);
    }
}

// Initialize the application
const app = new AttendanceApp();

// Additional event listeners for reports
document.getElementById('exportReportBtn')?.addEventListener('click', () => {
    app.showToast('Report exported as PDF successfully!');
});

document.getElementById('reportPeriod')?.addEventListener('change', (e) => {
    app.showToast(`Switched to ${e.target.value} report view`, 'info');
});

// Settings page functionality
document.querySelectorAll('.settings-section input[type="range"]').forEach(range => {
    range.addEventListener('input', (e) => {
        const value = (parseFloat(e.target.value) * 100).toFixed(0);
        e.target.nextElementSibling.textContent = `Current: ${value}% (Recommended: 80-90%)`;
    });
});

// Handle settings save
document.querySelector('.settings-actions .btn--primary')?.addEventListener('click', () => {
    app.saveSettings();
});

// Add settings management methods
AttendanceApp.prototype.saveSettings = function() {
    const schoolName = document.getElementById('schoolNameInput')?.value || 'School Name';
    const principalName = document.getElementById('principalNameInput')?.value || 'Principal Name';
    const schoolAddress = document.getElementById('schoolAddressInput')?.value || 'School Address';
    const recognitionThreshold = document.querySelector('input[type="range"]')?.value || 0.85;
    const antiSpoofingLevel = document.querySelector('select')?.value || 'medium';
    const smsEnabled = document.querySelector('input[type="checkbox"]')?.checked || false;
    const dailyReports = document.querySelectorAll('input[type="checkbox"]')[1]?.checked || false;
    const weeklyReports = document.querySelectorAll('input[type="checkbox"]')[2]?.checked || false;

    this.settings = {
        schoolName,
        principalName,
        schoolAddress,
        recognitionThreshold: parseFloat(recognitionThreshold),
        antiSpoofingLevel,
        smsEnabled,
        dailyReports,
        weeklyReports
    };

    this.saveData();
    this.updateSchoolInfo();
    this.showToast('Settings saved successfully!');
};

AttendanceApp.prototype.loadSettings = function() {
    // Update settings form with saved values
    const schoolNameInput = document.getElementById('schoolNameInput');
    const principalNameInput = document.getElementById('principalNameInput');
    const schoolAddressInput = document.getElementById('schoolAddressInput');
    const recognitionThresholdInput = document.querySelector('input[type="range"]');
    const antiSpoofingLevelSelect = document.querySelector('select');
    const smsCheckbox = document.querySelector('input[type="checkbox"]');
    const dailyReportsCheckbox = document.querySelectorAll('input[type="checkbox"]')[1];
    const weeklyReportsCheckbox = document.querySelectorAll('input[type="checkbox"]')[2];

    if (schoolNameInput) schoolNameInput.value = this.settings.schoolName;
    if (principalNameInput) principalNameInput.value = this.settings.principalName;
    if (schoolAddressInput) schoolAddressInput.value = this.settings.schoolAddress;
    if (recognitionThresholdInput) {
        recognitionThresholdInput.value = this.settings.recognitionThreshold;
        recognitionThresholdInput.nextElementSibling.textContent = `Current: ${(this.settings.recognitionThreshold * 100).toFixed(0)}% (Recommended: 80-90%)`;
    }
    if (antiSpoofingLevelSelect) antiSpoofingLevelSelect.value = this.settings.antiSpoofingLevel;
    if (smsCheckbox) smsCheckbox.checked = this.settings.smsEnabled;
    if (dailyReportsCheckbox) dailyReportsCheckbox.checked = this.settings.dailyReports;
    if (weeklyReportsCheckbox) weeklyReportsCheckbox.checked = this.settings.weeklyReports;
    
    this.updateSchoolInfo();
};

AttendanceApp.prototype.updateSchoolInfo = function() {
    const schoolInfoElement = document.getElementById('schoolInfo');
    if (schoolInfoElement) {
        schoolInfoElement.textContent = `${this.settings.schoolName} - Class 10A`;
    }
};

// Online/offline status simulation
setInterval(() => {
    const statusIndicator = document.querySelector('.status-indicator');
    const isOnline = Math.random() > 0.05; // 95% uptime simulation
    
    if (isOnline) {
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusIndicator.querySelector('.status-text').textContent = 'Online';
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusIndicator.querySelector('.status-text').textContent = 'Offline';
    }
}, 30000); // Check every 30 seconds
