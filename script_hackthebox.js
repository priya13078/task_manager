class HackTheBoxTaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.taskIdCounter = this.getHighestId() + 1;
        this.subtaskIdCounter = this.getHighestSubtaskId() + 1;
        this.streak = JSON.parse(localStorage.getItem('streak')) || { count: 0, lastDate: null, longest: 0 };
        this.activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
        this.dailyActivity = JSON.parse(localStorage.getItem('dailyActivity')) || {}; // Track tasks completed per day
        this.initializeDailyActivityFromTasks(); // Initialize from existing tasks if needed
        
        this.initializeElements();
        this.attachEventListeners();
        this.updateStreak();
        this.render();
        this.renderHackTheBoxCalendar();
    }
    
    // Initialize daily activity data from existing tasks if needed
    initializeDailyActivityFromTasks() {
        // If dailyActivity is empty but we have completed tasks, try to initialize from existing data
        if (Object.keys(this.dailyActivity).length === 0 && this.tasks.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            
            // Look for any completed tasks and add them to today's activity
            // (This is a fallback - in a real scenario, you'd want to track historical data)
            const completedTasks = this.tasks.filter(task => task.completed);
            const completedSubtasks = [];
            
            this.tasks.forEach(task => {
                if (task.subtasks) {
                    task.subtasks.forEach(subtask => {
                        if (subtask.completed) {
                            completedSubtasks.push(subtask);
                        }
                    });
                }
            });
            
            if (completedTasks.length > 0 || completedSubtasks.length > 0) {
                this.dailyActivity[today] = {
                    tasksCompleted: completedTasks.map(t => t.id),
                    subtasksCompleted: completedSubtasks.map(st => st.id)
                };
                
                // Add today to activity log if there was activity
                if (!this.activityLog.includes(today)) {
                    this.activityLog.push(today);
                    this.activityLog.sort();
                }
                
                // Save the updated data
                localStorage.setItem('dailyActivity', JSON.stringify(this.dailyActivity));
                localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
            }
        }
    }
    
    getHighestId() {
        let highestId = 0;
        this.tasks.forEach(task => {
            if (task.id > highestId) {
                highestId = task.id;
            }
        });
        return highestId;
    }
    
    getHighestSubtaskId() {
        let highestId = 0;
        this.tasks.forEach(task => {
            if (task.subtasks) {
                task.subtasks.forEach(subtask => {
                    if (subtask.id > highestId) {
                        highestId = subtask.id;
                    }
                });
            }
        });
        return highestId;
    }
    
    initializeElements() {
        this.taskForm = document.getElementById('task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskList = document.getElementById('task-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.clearCompletedBtn = document.getElementById('clear-completed-btn');
        this.taskCount = document.getElementById('task-count');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.streakCount = document.getElementById('streak-count');
        this.currentStreak = document.getElementById('current-streak');
        this.longestStreak = document.getElementById('longest-streak');
        this.overallCompletion = document.getElementById('overall-completion');
        this.streakCalendar = document.getElementById('streak-calendar');
        this.calendarHeader = document.getElementById('calendar-header');
        this.calendarToggle = document.getElementById('calendar-toggle');
        this.calendarSection = document.getElementById('calendar-section');
        this.hacktheboxCalendar = document.getElementById('hackthebox-calendar');
        
        // Modal elements
        this.modal = document.getElementById('daily-activity-modal');
        this.modalDate = document.getElementById('modal-date');
        this.tasksCompleted = document.getElementById('tasks-completed');
        this.tasksTotal = document.getElementById('tasks-total');
        this.completionRate = document.getElementById('completion-rate');
        this.activityList = document.getElementById('activity-list');
        this.closeModal = document.querySelector('.close');
    }
    
    attachEventListeners() {
        this.taskForm.addEventListener('submit', (e) => this.addTask(e));
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompletedTasks());
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        this.calendarToggle.addEventListener('click', () => this.toggleCalendar());
        
        // Modal event listeners
        if (this.closeModal) {
            this.closeModal.addEventListener('click', () => this.closeDailyActivityModal());
        }
        
        // Close modal when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeDailyActivityModal();
                }
            });
        }
        
        // Add ESC key support for closing modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
                this.closeDailyActivityModal();
            }
        });
        
        this.filterButtons.forEach(button => {
            button.addEventListener('click', (e) => this.setFilter(e));
        });
        
        // Set initial dark mode based on system preference or saved preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.body.setAttribute('data-theme', 'dark');
            this.darkModeToggle.textContent = '☀️';
        }
    }
    
    // Modal methods for daily activity details
    openDailyActivityModal(date) {
        this.modalDate.textContent = `Activity for ${date}`;
        this.modal.classList.add('show');
        this.renderDailyActivityDetails(date);
    }
    
    closeDailyActivityModal() {
        this.modal.classList.remove('show');
    }
    
    renderDailyActivityDetails(dateString) {
        // Get activity data for this date
        const activity = this.dailyActivity[dateString] || { tasksCompleted: [], subtasksCompleted: [] };
        
        // Calculate statistics
        const completedTasks = activity.tasksCompleted.length;
        const completedSubtasks = activity.subtasksCompleted.length;
        const totalActivities = completedTasks + completedSubtasks;
        
        // Update statistics display
        this.tasksCompleted.textContent = completedTasks;
        this.tasksTotal.textContent = this.tasks.length;
        const completionPercentage = this.tasks.length > 0 ? Math.round((completedTasks / this.tasks.length) * 100) : 0;
        this.completionRate.textContent = `${completionPercentage}%`;
        
        // Render task list
        this.activityList.innerHTML = '';
        
        if (totalActivities === 0) {
            const noActivity = document.createElement('div');
            noActivity.className = 'activity-item';
            noActivity.innerHTML = '<em>No tasks or subtasks completed on this date</em>';
            this.activityList.appendChild(noActivity);
            
            return;
        }
        
        // Display tasks that were completed on this date
        const completedTaskObjects = this.tasks.filter(task => activity.tasksCompleted.includes(task.id));
        
        completedTaskObjects.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `activity-item completed`;
            
            // Count completed subtasks for this task that were completed on this date
            const taskSubtasksCompletedToday = task.subtasks ? 
                task.subtasks.filter(st => activity.subtasksCompleted.includes(st.id)) : [];
            
            const subtasksInfo = taskSubtasksCompletedToday.length > 0 ? 
                `<div style="margin-left: 20px; margin-top: 5px; font-size: 0.9rem;">
                    ${taskSubtasksCompletedToday.length} subtask(s) completed today
                </div>` : 
                '';
            
            taskElement.innerHTML = `
                <div>
                    <strong>${task.text}</strong>
                    ${subtasksInfo}
                </div>
                <span>✓ Completed</span>
            `;
            this.activityList.appendChild(taskElement);
        });
        
        // Display subtasks that were completed on this date but not as part of task completion
        const completedSubtaskObjects = [];
        activity.subtasksCompleted.forEach(subtaskId => {
            // Find the subtask object by looking through all tasks
            for (const task of this.tasks) {
                if (task.subtasks) {
                    const subtask = task.subtasks.find(st => st.id === subtaskId);
                    if (subtask && !activity.tasksCompleted.includes(task.id)) {
                        // This subtask was completed on this date but not as part of task completion
                        completedSubtaskObjects.push({task, subtask});
                    }
                }
            }
        });
        
        completedSubtaskObjects.forEach(({task, subtask}) => {
            const subtaskElement = document.createElement('div');
            subtaskElement.className = `activity-item completed`;
            subtaskElement.innerHTML = `
                <div>
                    <strong>${subtask.text}</strong>
                    <div style="margin-left: 20px; font-size: 0.9rem;">from: ${task.text}</div>
                </div>
                <span>✓ Subtask completed</span>
            `;
            this.activityList.appendChild(subtaskElement);
        });
    }
    
    
    
    // Enhanced streak tracking with longest streak
    updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Check if we've already updated the streak today
        if (this.streak.lastDate === today) {
            this.saveStreak();
            this.updateCompletionStats();
            return;
        }
        
        // Check if we completed any tasks today by checking today's activity
        const hasCompletedTasksToday = this.dailyActivity[today] && 
                                      (this.dailyActivity[today].tasksCompleted.length > 0 || 
                                       this.dailyActivity[today].subtasksCompleted.length > 0);
        
        if (hasCompletedTasksToday) {
            // Log activity for today if not already logged
            if (!this.activityLog.includes(today)) {
                this.activityLog.push(today);
                this.activityLog.sort();
                localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
            }
            
            // If last activity was yesterday or today, increment streak
            if (this.streak.lastDate === yesterday || this.streak.lastDate === today) {
                this.streak.count++;
            } else {
                // If last activity was before yesterday, reset to 1
                this.streak.count = 1;
            }
            
            // Update longest streak if current streak is longer
            if (this.streak.count > (this.streak.longest || 0)) {
                this.streak.longest = this.streak.count;
            }
            
            this.streak.lastDate = today;
        } else if (this.streak.lastDate !== today && this.streak.lastDate !== yesterday) {
            // If no activity for more than a day, reset current streak but keep longest streak
            this.streak.count = 0;
        }
        
        this.saveStreak();
        this.updateCompletionStats();
    }
    
    saveStreak() {
        localStorage.setItem('streak', JSON.stringify(this.streak));
        this.streakCount.textContent = `${this.streak.count} day streak`;
        if (this.currentStreak) {
            this.currentStreak.textContent = this.streak.count;
        }
        if (this.longestStreak) {
            this.longestStreak.textContent = this.streak.longest || this.streak.count;
        }
    }
    
    toggleDarkMode() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.darkModeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    addTask(e) {
        e.preventDefault();
        
        const taskText = this.taskInput.value.trim();
        if (taskText === '') return;
        
        const newTask = {
            id: this.taskIdCounter++,
            text: taskText,
            completed: false,
            subtasks: [],
            timestamp: new Date().toISOString(),
            completionDate: null  // Track when the task was completed
        };
        
        this.tasks.push(newTask);
        this.saveTasks();
        this.render();
        this.taskInput.value = '';
        this.taskInput.focus();
    }
    
    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.render();
        if (!this.calendarSection.classList.contains('hidden')) {
            this.renderCalendar();
        }
    }
    
    // Enhanced task completion with date tracking
    toggleTaskStatus(id) {
        const today = new Date().toISOString().split('T')[0];
        
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                const wasCompleted = task.completed;
                const nowCompleted = !wasCompleted;
                
                // If completing a task, also complete all subtasks
                if (nowCompleted) {
                    task.subtasks = task.subtasks.map(subtask => ({
                        ...subtask,
                        completed: true,
                        completionDate: today  // Update subtask completion date
                    }));
                }
                
                const newTask = { 
                    ...task, 
                    completed: nowCompleted,
                    completionDate: nowCompleted ? today : null  // Track task completion date
                };
                
                // Track task completion date
                if (nowCompleted) {
                    // Initialize daily activity for today if it doesn't exist
                    if (!this.dailyActivity[today]) {
                        this.dailyActivity[today] = {
                            tasksCompleted: [],
                            subtasksCompleted: []
                        };
                    }
                    
                    // Add task to today's completed tasks
                    if (!this.dailyActivity[today].tasksCompleted.includes(id)) {
                        this.dailyActivity[today].tasksCompleted.push(id);
                    }
                    
                    // Add all subtasks to today's completed subtasks
                    task.subtasks.forEach(subtask => {
                        if (subtask.completed && !this.dailyActivity[today].subtasksCompleted.includes(subtask.id)) {
                            this.dailyActivity[today].subtasksCompleted.push(subtask.id);
                        }
                    });
                    
                    // Save daily activity
                    localStorage.setItem('dailyActivity', JSON.stringify(this.dailyActivity));
                    
                    // Also add to activity log
                    if (!this.activityLog.includes(today)) {
                        this.activityLog.push(today);
                        this.activityLog.sort();
                        localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
                    }
                } else {
                    // If uncompleting a task, remove it from today's completed tasks
                    if (this.dailyActivity[today]) {
                        this.dailyActivity[today].tasksCompleted = 
                            this.dailyActivity[today].tasksCompleted.filter(taskId => taskId !== id);
                        
                        // Also remove subtasks from today's completed subtasks
                        task.subtasks.forEach(subtask => {
                            this.dailyActivity[today].subtasksCompleted = 
                                this.dailyActivity[today].subtasksCompleted.filter(subtaskId => subtaskId !== subtask.id);
                        });
                        
                        // Save daily activity
                        localStorage.setItem('dailyActivity', JSON.stringify(this.dailyActivity));
                    }
                }
                
                return newTask;
            }
            return task;
        });
        this.updateStreak();
        this.saveTasks();
        this.render();
        if (!this.calendarSection.classList.contains('hidden')) {
            this.renderCalendar();
            this.renderHackTheBoxCalendar();
        }
    }
    
    editTask(id, newText) {
        if (newText.trim() === '') {
            this.deleteTask(id);
            return;
        }
        
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                return { ...task, text: newText.trim() };
            }
            return task;
        });
        this.saveTasks();
        this.render();
    }
    
    addSubtask(parentId, text) {
        if (text.trim() === '') return;
        
        this.tasks = this.tasks.map(task => {
            if (task.id === parentId) {
                const newSubtask = {
                    id: this.subtaskIdCounter++,
                    text: text.trim(),
                    completed: false,
                    completionDate: null  // Track when the subtask was completed
                };
                return {
                    ...task,
                    subtasks: [...task.subtasks, newSubtask]
                };
            }
            return task;
        });
        this.saveTasks();
        this.render();
    }
    
    deleteSubtask(parentId, subtaskId) {
        this.tasks = this.tasks.map(task => {
            if (task.id === parentId) {
                return {
                    ...task,
                    subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId)
                };
            }
            return task;
        });
        this.saveTasks();
        this.render();
    }
    
    toggleSubtaskStatus(parentId, subtaskId) {
        const today = new Date().toISOString().split('T')[0];
        
        this.tasks = this.tasks.map(task => {
            if (task.id === parentId) {
                return {
                    ...task,
                    subtasks: task.subtasks.map(subtask => {
                        if (subtask.id === subtaskId) {
                            const wasCompleted = subtask.completed;
                            const nowCompleted = !wasCompleted;
                            
                            // Track subtask completion date
                            if (nowCompleted) {
                                // Initialize daily activity for today if it doesn't exist
                                if (!this.dailyActivity[today]) {
                                    this.dailyActivity[today] = {
                                        tasksCompleted: [],
                                        subtasksCompleted: []
                                    };
                                }
                                
                                // Add subtask to today's completed subtasks
                                if (!this.dailyActivity[today].subtasksCompleted.includes(subtaskId)) {
                                    this.dailyActivity[today].subtasksCompleted.push(subtaskId);
                                }
                                
                                // Save daily activity
                                localStorage.setItem('dailyActivity', JSON.stringify(this.dailyActivity));
                                
                                // Also add to activity log
                                if (!this.activityLog.includes(today)) {
                                    this.activityLog.push(today);
                                    this.activityLog.sort();
                                    localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
                                }
                            } else {
                                // If uncompleting a subtask, remove it from today's completed subtasks
                                if (this.dailyActivity[today]) {
                                    this.dailyActivity[today].subtasksCompleted = 
                                        this.dailyActivity[today].subtasksCompleted.filter(id => id !== subtaskId);
                                    
                                    // Save daily activity
                                    localStorage.setItem('dailyActivity', JSON.stringify(this.dailyActivity));
                                }
                            }
                            
                            return { 
                                ...subtask, 
                                completed: nowCompleted,
                                completionDate: nowCompleted ? today : null  // Track subtask completion date
                            };
                        }
                        return subtask;
                    })
                };
            }
            return task;
        });
        this.updateStreak();
        this.saveTasks();
        this.render();
        if (!this.calendarSection.classList.contains('hidden')) {
            this.renderCalendar();
            this.renderHackTheBoxCalendar();
        }
    }
    
    editSubtask(parentId, subtaskId, newText) {
        if (newText.trim() === '') {
            this.deleteSubtask(parentId, subtaskId);
            return;
        }
        
        this.tasks = this.tasks.map(task => {
            if (task.id === parentId) {
                return {
                    ...task,
                    subtasks: task.subtasks.map(subtask => {
                        if (subtask.id === subtaskId) {
                            return { ...subtask, text: newText.trim() };
                        }
                        return subtask;
                    })
                };
            }
            return task;
        });
        this.saveTasks();
        this.render();
    }
    
    clearCompletedTasks() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.render();
        if (!this.calendarSection.classList.contains('hidden')) {
            this.renderCalendar();
        }
    }
    
    setFilter(e) {
        this.currentFilter = e.target.dataset.filter;
        
        this.filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        this.render();
    }
    // Render HackTheBox-style activity calendar for the recent year only
    renderHackTheBoxCalendar() {
        if (!this.hacktheboxCalendar) return;
        
        // Clear previous calendar
        this.hacktheboxCalendar.innerHTML = '';
        
        // Get month-year labels container
        const monthYearLabels = document.getElementById('month-year-labels');
        if (monthYearLabels) monthYearLabels.innerHTML = '';
        
        // Create calendar for exactly one year - from today back to same date last year
        const today = new Date();
        const endDate = new Date(today);
        const startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        
        // Adjust start date to align with the grid - start from the Sunday of the week containing the start date
        const daysFromSunday = startDate.getDay();
        const alignedStartDate = new Date(startDate);
        alignedStartDate.setDate(startDate.getDate() - daysFromSunday);
        
        // Generate all dates from aligned start date to today
        const allDates = [];
        const currentDate = new Date(alignedStartDate);
        while (currentDate <= endDate) {
            const date = new Date(currentDate);
            allDates.push({
                date: date,
                dateString: date.toISOString().split('T')[0],
                day: date.getDate(),
                month: date.getMonth(), // 0-11 where 9 is October
                year: date.getFullYear(),
                weekday: date.getDay() // 0 = Sunday, 1 = Monday, etc.
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Calculate how many weeks we need (ceil of total days / 7)
        const totalWeeks = Math.ceil(allDates.length / 7);
        
        // Responsive design - but ensure we show enough weeks to cover a full year
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;
        // Make sure October and all other months appear by showing up to 53 weeks (max possible in a year)
        const maxWeeks = isMobile ? Math.min(26, totalWeeks) : (isTablet ? Math.min(39, totalWeeks) : Math.min(53, totalWeeks));
        const weeksToShow = maxWeeks;
        
        // Initialize month labels container
        if (monthYearLabels) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Create empty labels for each week column
            const labelElements = [];
            for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
                const labelElement = document.createElement('span');
                labelElement.textContent = '';
                labelElement.title = '';
                monthYearLabels.appendChild(labelElement);
                labelElements.push(labelElement);
            }
            
            // Find where months begin and place labels correctly - ensuring all months are captured
            for (let dateIndex = 0; dateIndex < allDates.length; dateIndex++) {
                const dateObj = allDates[dateIndex];
                
                // When we find the first day of a month
                if (dateObj.day === 1) {
                    // Calculate which week column this date belongs to
                    const weekIndex = Math.floor(dateIndex / 7);
                    
                    // Only if within our display range
                    if (weekIndex < weeksToShow) {
                        // Place the month label in the correct week column
                        // Only update if it's empty or prioritize months that are closer to today 
                        // to ensure October and other months appear in the right place
                        if (labelElements[weekIndex].textContent === '') {
                            labelElements[weekIndex].textContent = `${monthNames[dateObj.month]}'${dateObj.year.toString().substr(-2)}`;
                            labelElements[weekIndex].title = `${monthNames[dateObj.month]} ${dateObj.year}`;
                        }
                    }
                }
            }
        }
        
        // Create the calendar grid: 7 rows (Sun-Sat), weeksToShow columns (weeks)
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) { // 7 rows (Sun-Sat)
            for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) { // Multiple columns (weeks)
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                
                // Calculate which date this cell represents
                const dateIndex = weekIndex * 7 + dayOfWeek;
                
                if (dateIndex < allDates.length) {
                    const dateObj = allDates[dateIndex];
                    
                    dayElement.dataset.date = dateObj.dateString;
                    dayElement.title = `${dateObj.date.toDateString()}`;
                    
                    // Determine activity level (0-4) based on completion data
                    const activityLevel = this.getActivityLevel(dateObj.dateString);
                    dayElement.classList.add(`level-${activityLevel}`);
                    
                    // Add click event for details
                    dayElement.addEventListener('click', () => {
                        this.openDailyActivityModal(dateObj.dateString);
                    });
                } else {
                    // Empty day cell
                    dayElement.classList.add('level-0');
                }
                
                this.hacktheboxCalendar.appendChild(dayElement);
            }
        }
        
        // Set the grid structure
        this.hacktheboxCalendar.style.gridTemplateColumns = `repeat(${weeksToShow}, 1fr)`;
    }
    
    // Determine activity level for a specific date (0-4) based on actual work done
    getActivityLevel(dateString) {
        // Check if we have activity data for this date
        if (this.dailyActivity[dateString]) {
            const activity = this.dailyActivity[dateString];
            const totalCompleted = activity.tasksCompleted.length + activity.subtasksCompleted.length;
            
            // Assign levels based on amount of work done
            if (totalCompleted >= 15) return 4;  // High activity - darkest green
            if (totalCompleted >= 8) return 3;   // Medium-high activity - dark green
            if (totalCompleted >= 3) return 2;   // Medium activity - medium green
            if (totalCompleted >= 1) return 1;   // Low activity - light green
        }
        
        // Check if date is in the future or too far in the past
        const today = new Date();
        const checkDate = new Date(dateString);
        const diffTime = Math.abs(today - checkDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // If date is in the future or too far in the past, return 0
        if (checkDate > today || diffDays > 365) {
            return 0;
        }
        
        // No activity or no data
        return 0;
    }
    
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }
    
    // Calculate overall completion percentage correctly
    calculateCompletionStats() {
        if (this.tasks.length === 0) {
            return { overallPercentage: 0 };
        }
        
        let totalTaskPercentage = 0;
        
        this.tasks.forEach(task => {
            if (task.completed) {
                // If task is completed, it contributes 100% to the overall
                totalTaskPercentage += 100;
            } else {
                // If task is not completed, calculate subtask completion
                if (task.subtasks && task.subtasks.length > 0) {
                    const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
                    const subtaskPercentage = (completedSubtasks / task.subtasks.length) * 100;
                    totalTaskPercentage += subtaskPercentage;
                }
                // If no subtasks, task contributes 0% (already handled by default)
            }
        });
        
        // Calculate average percentage across all tasks
        const overallPercentage = Math.round(totalTaskPercentage / this.tasks.length);
        
        return { overallPercentage };
    }
    
    // Calculate individual task completion percentage
    getTaskCompletionPercentage(task) {
        // If task is completed, return 100%
        if (task.completed) {
            return 100;
        }
        
        // Otherwise, calculate subtask completion percentage
        if (task.subtasks && task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
            return Math.round((completedSubtasks / task.subtasks.length) * 100);
        }
        
        // If no subtasks, return 0%
        return 0;
    }
    
    updateCompletionStats() {
        const stats = this.calculateCompletionStats();
        this.overallCompletion.textContent = `${stats.overallPercentage}%`;
    }
    
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            default:
                return this.tasks;
        }
    }
    
    toggleCalendar() {
        this.calendarSection.classList.toggle('hidden');
        if (!this.calendarSection.classList.contains('hidden')) {
            this.renderCalendar();
            this.renderHackTheBoxCalendar();
        }
    }
    
    // Open daily activity modal with pie chart
    renderCalendar() {
        // Only render if calendar section exists and is visible
        if (!this.calendarSection || this.calendarSection.classList.contains('hidden')) {
            return;
        }
        
        // Create calendar header
        const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        this.calendarHeader.innerHTML = '';
        
        daysOfWeek.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-header-day';
            dayElement.textContent = day;
            this.calendarHeader.appendChild(dayElement);
        });
        
        // Create calendar grid for the last 30 days
        this.streakCalendar.innerHTML = '';
        
        // Get the last 30 days
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            dates.push({
                date: date,
                dateString: dateString,
                day: date.getDate()
            });
        }
        
        // Create calendar days
        dates.forEach(dateObj => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = dateObj.day;
            dayElement.dataset.date = dateObj.dateString;
            
            // Add click event listener
            dayElement.addEventListener('click', () => {
                // Currently no action for this calendar view - only the HackTheBox calendar has click actions
            });
            
            // Check if this date has activity
            if (this.activityLog.includes(dateObj.dateString)) {
                dayElement.classList.add('active');
            } else {
                dayElement.classList.add('inactive');
            }
            
            this.streakCalendar.appendChild(dayElement);
        });
    }
    
    render() {
        // Render tasks
        const filteredTasks = this.getFilteredTasks();
        this.taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-task-list';
            emptyMessage.textContent = this.currentFilter === 'all' 
                ? 'No tasks yet. Add a new task to get started!' 
                : `No ${this.currentFilter} tasks.`;
            this.taskList.appendChild(emptyMessage);
        } else {
            filteredTasks.forEach(task => {
                const taskItem = this.createTaskElement(task);
                this.taskList.appendChild(taskItem);
            });
        }
        
        // Update task count
        const activeTasks = this.tasks.filter(task => !task.completed).length;
        this.taskCount.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} remaining`;
        
        // Update completion stats
        this.updateCompletionStats();
    }
    
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.id;
        
        // Main task
        const taskMain = document.createElement('div');
        taskMain.className = 'task-main';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => this.toggleTaskStatus(task.id));
        
        const taskText = document.createElement('span');
        taskText.className = `task-text ${task.completed ? 'completed' : ''}`;
        taskText.textContent = task.text;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';
        
        const toggleSubtasksBtn = document.createElement('button');
        toggleSubtasksBtn.className = 'toggle-subtasks-btn';
        toggleSubtasksBtn.innerHTML = '📋';
        toggleSubtasksBtn.title = 'Toggle subtasks';
        toggleSubtasksBtn.addEventListener('click', (e) => {
            const subtasksContainer = li.querySelector('.subtasks-container');
            const addSubtaskForm = li.querySelector('.add-subtask-form');
            if (subtasksContainer.classList.contains('hidden') || addSubtaskForm.classList.contains('hidden')) {
                subtasksContainer.classList.remove('hidden');
                addSubtaskForm.classList.remove('hidden');
                toggleSubtasksBtn.innerHTML = '📋';
            } else {
                subtasksContainer.classList.add('hidden');
                addSubtaskForm.classList.add('hidden');
                toggleSubtasksBtn.innerHTML = '📋';
            }
        });
        
        const addSubtaskBtn = document.createElement('button');
        addSubtaskBtn.className = 'add-subtask-btn';
        addSubtaskBtn.innerHTML = '➕';
        addSubtaskBtn.title = 'Add subtask';
        addSubtaskBtn.addEventListener('click', (e) => {
            const addSubtaskForm = li.querySelector('.add-subtask-form');
            const subtaskInput = addSubtaskForm.querySelector('.add-subtask-input');
            addSubtaskForm.classList.remove('hidden');
            subtaskInput.focus();
        });
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit task';
        editBtn.addEventListener('click', () => this.startEditing(task, taskText, actionsDiv));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
        
        actionsDiv.appendChild(toggleSubtasksBtn);
        actionsDiv.appendChild(addSubtaskBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        taskMain.appendChild(checkbox);
        taskMain.appendChild(taskText);
        taskMain.appendChild(actionsDiv);
        
        // Subtask stats
        const subtaskStats = document.createElement('div');
        subtaskStats.className = 'subtask-stats';
        const taskCompletionPercentage = this.getTaskCompletionPercentage(task);
        if (task.subtasks && task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
            subtaskStats.textContent = `${completedSubtasks}/${task.subtasks.length} subtasks completed (${taskCompletionPercentage}%)`;
        } else {
            subtaskStats.textContent = `No subtasks (${taskCompletionPercentage}%)`;
        }
        
        // Subtasks container
        const subtasksContainer = document.createElement('div');
        subtasksContainer.className = 'subtasks-container hidden';
        
        const subtasksList = document.createElement('ul');
        subtasksList.className = 'subtasks-list';
        
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                const subtaskItem = this.createSubtaskElement(task.id, subtask);
                subtasksList.appendChild(subtaskItem);
            });
        }
        
        subtasksContainer.appendChild(subtasksList);
        
        // Add subtask form
        const addSubtaskForm = document.createElement('form');
        addSubtaskForm.className = 'add-subtask-form hidden';
        
        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.className = 'add-subtask-input';
        subtaskInput.placeholder = 'Add a subtask...';
        
        const addSubtaskButton = document.createElement('button');
        addSubtaskButton.type = 'submit';
        addSubtaskButton.className = 'add-subtask-btn-form';
        addSubtaskButton.textContent = 'Add';
        
        const cancelSubtaskButton = document.createElement('button');
        cancelSubtaskButton.type = 'button';
        cancelSubtaskButton.className = 'cancel-subtask-btn';
        cancelSubtaskButton.textContent = 'Cancel';
        cancelSubtaskButton.addEventListener('click', () => {
            addSubtaskForm.classList.add('hidden');
            subtaskInput.value = '';
        });
        
        addSubtaskForm.appendChild(subtaskInput);
        addSubtaskForm.appendChild(addSubtaskButton);
        addSubtaskForm.appendChild(cancelSubtaskButton);
        
        addSubtaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubtask(task.id, subtaskInput.value);
            subtaskInput.value = '';
            addSubtaskForm.classList.add('hidden');
        });
        
        li.appendChild(taskMain);
        li.appendChild(subtaskStats);
        li.appendChild(subtasksContainer);
        li.appendChild(addSubtaskForm);
        
        return li;
    }
    
    createSubtaskElement(parentId, subtask) {
        const li = document.createElement('li');
        li.className = 'subtask-item';
        li.dataset.id = subtask.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'subtask-checkbox';
        checkbox.checked = subtask.completed;
        checkbox.addEventListener('change', () => this.toggleSubtaskStatus(parentId, subtask.id));
        
        const subtaskText = document.createElement('span');
        subtaskText.className = `subtask-text ${subtask.completed ? 'completed' : ''}`;
        subtaskText.textContent = subtask.text;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'subtask-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'subtask-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.addEventListener('click', () => this.startEditingSubtask(parentId, subtask, subtaskText, actionsDiv));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'subtask-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.addEventListener('click', () => this.deleteSubtask(parentId, subtask.id));
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        li.appendChild(checkbox);
        li.appendChild(subtaskText);
        li.appendChild(actionsDiv);
        
        return li;
    }
    
    startEditing(task, taskTextElement, actionsContainer) {
        // Replace task text with input field
        const editForm = document.createElement('form');
        editForm.className = 'edit-form';
        
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = task.text;
        
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'edit-save-btn';
        saveBtn.textContent = 'Save';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'edit-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        
        editForm.appendChild(editInput);
        editForm.appendChild(saveBtn);
        editForm.appendChild(cancelBtn);
        
        // Replace the task text element with the edit form
        taskTextElement.replaceWith(editForm);
        actionsContainer.classList.add('hidden');
        
        // Focus the input and select all text
        editInput.focus();
        editInput.select();
        
        // Handle form submission
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.editTask(task.id, editInput.value);
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            editForm.replaceWith(taskTextElement);
            actionsContainer.classList.remove('hidden');
        });
    }
    
    startEditingSubtask(parentId, subtask, subtaskTextElement, actionsContainer) {
        // Replace subtask text with input field
        const editForm = document.createElement('form');
        editForm.className = 'edit-form';
        
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = subtask.text;
        
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'edit-save-btn';
        saveBtn.textContent = 'Save';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'edit-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        
        editForm.appendChild(editInput);
        editForm.appendChild(saveBtn);
        editForm.appendChild(cancelBtn);
        
        // Replace the subtask text element with the edit form
        subtaskTextElement.replaceWith(editForm);
        actionsContainer.classList.add('hidden');
        
        // Focus the input and select all text
        editInput.focus();
        editInput.select();
        
        // Handle form submission
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.editSubtask(parentId, subtask.id, editInput.value);
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            editForm.replaceWith(subtaskTextElement);
            actionsContainer.classList.remove('hidden');
        });
    }
}

// Initialize the HackTheBox style task manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HackTheBoxTaskManager();
});