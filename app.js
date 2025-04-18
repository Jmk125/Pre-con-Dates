document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const addProjectBtn = document.getElementById('add-project');
    const saveDataBtn = document.getElementById('save-data');
    const loadDataBtn = document.getElementById('load-data');
    const fileInput = document.getElementById('file-input');
    const projectsContainer = document.getElementById('projects-container');
    const timelineDates = document.getElementById('timeline-dates');
    const modal = document.getElementById('project-modal');
    const modalClose = document.querySelector('.close');
    const projectForm = document.getElementById('project-form');
    const modalTitle = document.getElementById('modal-title');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    const legendContainer = document.getElementById('legend-container');
    const currentDateDisplay = document.getElementById('current-date-value');
    const deleteProjectBtn = document.getElementById('delete-project');
    const currentUser = document.getElementById('current-user');
    const currentDateTime = document.getElementById('current-datetime');
    
    // Initialize user info and date display
    currentUser.textContent = 'Jmk125';
    currentDateTime.textContent = '2025-04-18 17:53:45';
    currentDateDisplay.textContent = '2025-04-18';
    
    // App state
    let projects = [];
    let editingIndex = null;
    let pixelsPerDay = 4; // Starting zoom level
    let zoomLevel = 100; // Percentage
    let startDate = null;
    let endDate = null;
    
    // Activity types with shorter display labels
    const activityTypes = [
        { id: 'sd', name: 'Schematic Design', shortName: 'SD', color: '#1cc88a' }, // Green
        { id: 'dd', name: 'Design Development', shortName: 'DD', color: '#4e73df' }, // Blue
        { id: 'gmp', name: 'GMP', shortName: 'GMP', color: '#e74a3b' }, // Red
        { id: 'bidding', name: 'Bidding', shortName: 'BID', color: '#f6c23e' } // Yellow
    ];

    // Current date for reference
    const currentDate = dayjs('2025-04-18');
    
    // Calculate date range based on all projects
    function calculateDateRange() {
        if (projects.length === 0) {
            // Default date range if no projects exist
            startDate = currentDate.subtract(1, 'month').startOf('month');
            endDate = currentDate.add(12, 'month').endOf('month');
            return;
        }
        
        let earliestDate = null;
        let latestDate = null;
        
        projects.forEach(project => {
            activityTypes.forEach(type => {
                if (project[`${type.id}Start`]) {
                    const date = dayjs(project[`${type.id}Start`]);
                    if (!earliestDate || date.isBefore(earliestDate)) {
                        earliestDate = date;
                    }
                }
                
                if (project[`${type.id}End`]) {
                    const date = dayjs(project[`${type.id}End`]);
                    if (!latestDate || date.isAfter(latestDate)) {
                        latestDate = date;
                    }
                }
            });
        });
        
        if (earliestDate && latestDate) {
            // Add buffer space before and after
            startDate = earliestDate.subtract(1, 'month').startOf('month');
            endDate = latestDate.add(1, 'month').endOf('month');
            
            // Ensure a minimum timeline span of 6 months
            if (endDate.diff(startDate, 'month') < 6) {
                endDate = startDate.add(6, 'month').endOf('month');
            }
        } else {
            // Fallback to default
            startDate = currentDate.subtract(1, 'month').startOf('month');
            endDate = currentDate.add(12, 'month').endOf('month');
        }
    }
    
    // Update zoom level
    function updateZoom(newZoomLevel) {
        // Limit zoom between 20% and 400%
        zoomLevel = Math.max(20, Math.min(400, newZoomLevel));
        pixelsPerDay = (4 * zoomLevel) / 100;
        zoomLevelDisplay.textContent = `${zoomLevel}%`;
        
        // Redraw the timeline with new zoom
        renderTimeline();
    }
    
    // Zoom to fit all activities
    function zoomToFit() {
        if (projects.length === 0) return;
        
        // Calculate the container width
        const containerWidth = document.querySelector('.timeline-dates-wrapper').clientWidth;
        
        // Calculate the total days in the timeline
        const totalDays = endDate.diff(startDate, 'day');
        
        // Calculate the ideal pixels per day to fit everything
        const idealPixelsPerDay = containerWidth / totalDays;
        
        // Calculate the zoom level that would give us this pixels per day
        const idealZoomLevel = Math.floor((idealPixelsPerDay * 100) / 4);
        
        // Update zoom (with some buffer space)
        updateZoom(Math.max(20, idealZoomLevel * 0.95));
    }
    
    // Render the entire timeline
    function renderTimeline() {
        initTimelineDates();
        renderProjects();
    }
    
    // Initialize timeline dates
    function initTimelineDates() {
        timelineDates.innerHTML = '';
        
        // Calculate date range
        calculateDateRange();
        
        // Calculate the available width
        const containerWidth = document.querySelector('.timeline-dates-wrapper').clientWidth;
        
        // Generate month markers
        let currentMonth = startDate.clone();
        let position = 0;
        
        while (currentMonth.isBefore(endDate) || currentMonth.isSame(endDate, 'month')) {
            const monthMarker = document.createElement('div');
            monthMarker.className = 'month-marker';
            monthMarker.style.left = `${position}px`;
            
            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = currentMonth.format('MMM YYYY');
            monthLabel.style.left = `${position + 5}px`;
            
            timelineDates.appendChild(monthMarker);
            timelineDates.appendChild(monthLabel);
            
            const daysInMonth = currentMonth.daysInMonth();
            position += pixelsPerDay * daysInMonth;
            
            currentMonth = currentMonth.add(1, 'month');
        }
        
        // Add today marker
        const todayPosition = getPositionFromDate(currentDate);
        
        const todayMarker = document.createElement('div');
        todayMarker.className = 'today-marker';
        todayMarker.style.left = `${todayPosition}px`;
        
        const todayLabel = document.createElement('div');
        todayLabel.className = 'today-label';
        todayLabel.textContent = 'Today';
        todayLabel.style.left = `${todayPosition}px`;
        
        timelineDates.appendChild(todayMarker);
        timelineDates.appendChild(todayLabel);
        
        // Set the width to either the timeline width or the container width, whichever is larger
        const totalDays = endDate.diff(startDate, 'day');
        const timelineWidth = totalDays * pixelsPerDay;
        
        timelineDates.style.width = `${Math.max(containerWidth, timelineWidth)}px`;
    }
    
    // Calculate position based on date
    function getPositionFromDate(date) {
        const targetDate = dayjs(date);
        const daysDiff = targetDate.diff(startDate, 'day');
        return daysDiff * pixelsPerDay;
    }
    
    // Calculate date based on position
    function getDateFromPosition(position) {
        const days = Math.floor(position / pixelsPerDay);
        return startDate.add(days, 'day').format('YYYY-MM-DD');
    }
    
    // Create legend (once)
    function createLegend() {
        legendContainer.innerHTML = '';
        
        activityTypes.forEach(type => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const legendColor = document.createElement('div');
            legendColor.className = `legend-color ${type.id}`;
            
            const legendLabel = document.createElement('div');
            legendLabel.textContent = type.name;
            
            legendItem.appendChild(legendColor);
            legendItem.appendChild(legendLabel);
            legendContainer.appendChild(legendItem);
        });
    }
    
    // Render projects
    function renderProjects() {
        projectsContainer.innerHTML = '';
        
        // Handle empty state
        if (projects.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No projects yet. Click "Add Project" to create your first project.';
            projectsContainer.appendChild(emptyMessage);
            return;
        }
        
        // Get the same width as timeline
        const timelineWidth = timelineDates.style.width;
        
        projects.forEach((project, index) => {
            const projectRow = document.createElement('div');
            projectRow.className = 'project-row';
            
            // Add project name
            const projectName = document.createElement('div');
            projectName.className = 'project-name';
            projectName.textContent = project.name;
            projectName.addEventListener('click', () => editProject(index));
            
            const projectTimeline = document.createElement('div');
            projectTimeline.className = 'project-timeline';
            
            // Set the width to match the timeline dates
            projectTimeline.style.width = timelineWidth;
            
            // Add activities
            activityTypes.forEach(type => {
                if (project[`${type.id}Start`] && project[`${type.id}End`]) {
                    const startPosition = getPositionFromDate(project[`${type.id}Start`]);
                    const endPosition = getPositionFromDate(project[`${type.id}End`]);
                    const width = endPosition - startPosition;
                    
                    const activityBar = document.createElement('div');
                    activityBar.className = `activity-bar ${type.id}`;
                    activityBar.dataset.project = index;
                    activityBar.dataset.activity = type.id;
                    activityBar.style.left = `${startPosition}px`;
                    activityBar.style.width = `${width}px`;
                    
                    const activityLabel = document.createElement('div');
                    activityLabel.className = 'activity-label';
                    activityLabel.textContent = type.shortName; // Use short name
                    
                    const leftHandle = document.createElement('div');
                    leftHandle.className = 'resize-handle left';
                    
                    const rightHandle = document.createElement('div');
                    rightHandle.className = 'resize-handle right';
                    
                    activityBar.appendChild(leftHandle);
                    activityBar.appendChild(rightHandle);
                    activityBar.appendChild(activityLabel);
                    projectTimeline.appendChild(activityBar);
                }
            });
            
            projectRow.appendChild(projectName);
            projectRow.appendChild(projectTimeline);
            projectsContainer.appendChild(projectRow);
        });
        
        // Initialize draggable activities
        initDraggable();
    }
    
    // Initialize draggable activities
    function initDraggable() {
        // Make activity bars draggable
        interact('.activity-bar')
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                autoScroll: false, // No auto-scroll
                onmove: dragMoveListener,
                onend: function (event) {
                    const target = event.target;
                    const projectIndex = parseInt(target.dataset.project);
                    const activityType = target.dataset.activity;
                    
                    // Update project dates based on new position
                    const left = parseInt(target.style.left);
                    const width = parseInt(target.style.width);
                    
                    projects[projectIndex][`${activityType}Start`] = getDateFromPosition(left);
                    projects[projectIndex][`${activityType}End`] = getDateFromPosition(left + width);
                    
                    // Save to local storage
                    saveToLocalStorage();
                    
                    // Check if we need to update date range and re-render
                    const newStartDate = dayjs(projects[projectIndex][`${activityType}Start`]);
                    const newEndDate = dayjs(projects[projectIndex][`${activityType}End`]);
                    
                    if (newStartDate.isBefore(startDate) || newEndDate.isAfter(endDate)) {
                        renderTimeline();
                    }
                }
            });
        
        // Make activity bars resizable
        interact('.activity-bar')
            .resizable({
                edges: { left: '.resize-handle.left', right: '.resize-handle.right', bottom: false, top: false },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 10 }
                    })
                ],
                inertia: true
            })
            .on('resizemove', resizeMoveListener)
            .on('resizeend', function (event) {
                const target = event.target;
                const projectIndex = parseInt(target.dataset.project);
                const activityType = target.dataset.activity;
                
                // Update project dates based on new size
                const left = parseInt(target.style.left);
                const width = parseInt(target.style.width);
                
                projects[projectIndex][`${activityType}Start`] = getDateFromPosition(left);
                projects[projectIndex][`${activityType}End`] = getDateFromPosition(left + width);
                
                // Save to local storage
                saveToLocalStorage();
                
                // Check if we need to update date range and re-render
                const newStartDate = dayjs(projects[projectIndex][`${activityType}Start`]);
                const newEndDate = dayjs(projects[projectIndex][`${activityType}End`]);
                
                if (newStartDate.isBefore(startDate) || newEndDate.isAfter(endDate)) {
                    renderTimeline();
                }
            });
    }
    
    function dragMoveListener(event) {
        const target = event.target;
        
        // Update element position
        target.style.left = (parseFloat(target.style.left) || 0) + event.dx + 'px';
    }
    
    function resizeMoveListener(event) {
        const target = event.target;
        
        // Get current size and position
        let x = parseFloat(target.style.left) || 0;
        let width = parseFloat(target.style.width) || 0;
        
        // Update the element's position and size
        if (event.edges.left) {
            x += event.deltaRect.left;
            width -= event.deltaRect.left;
            target.style.left = x + 'px';
        } else {
            width += event.deltaRect.right;
        }
        
        target.style.width = width + 'px';
    }
    
    // Show add project modal
    function showAddProjectModal() {
        modalTitle.textContent = 'Add Project';
        projectForm.reset();
        editingIndex = null;
        
        // Hide delete button for new projects
        deleteProjectBtn.style.display = 'none';
        
        modal.style.display = 'block';
    }
    
    // Edit existing project
    function editProject(index) {
        modalTitle.textContent = 'Edit Project';
        const project = projects[index];
        
        document.getElementById('project-name').value = project.name;
        
        activityTypes.forEach(type => {
            if (project[`${type.id}Start`]) {
                document.getElementById(`${type.id}-start`).value = project[`${type.id}Start`];
            }
            if (project[`${type.id}End`]) {
                document.getElementById(`${type.id}-end`).value = project[`${type.id}End`];
            }
        });
        
        editingIndex = index;
        
        // Show delete button for existing projects
        deleteProjectBtn.style.display = 'block';
        
        modal.style.display = 'block';
    }
    
    // Delete current project
    function deleteProject() {
        if (editingIndex !== null) {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete the project "${projects[editingIndex].name}"?`)) {
                projects.splice(editingIndex, 1);
                saveToLocalStorage();
                modal.style.display = 'none';
                
                // Update timeline
                renderTimeline();
                
                // Adjust zoom if projects remain
                if (projects.length > 0) {
                    setTimeout(zoomToFit, 100);
                }
            }
        }
    }
    
    // Save project from form
    function saveProject(e) {
        e.preventDefault();
        
        const projectData = {
            name: document.getElementById('project-name').value
        };
        
        activityTypes.forEach(type => {
            const startValue = document.getElementById(`${type.id}-start`).value;
            const endValue = document.getElementById(`${type.id}-end`).value;
            
            if (startValue) {
                projectData[`${type.id}Start`] = startValue;
            }
            
            if (endValue) {
                projectData[`${type.id}End`] = endValue;
            }
        });
        
        if (editingIndex !== null) {
            projects[editingIndex] = projectData;
        } else {
            projects.push(projectData);
        }
        
        saveToLocalStorage();
        modal.style.display = 'none';
        
        // Update timeline with new project data
        renderTimeline();
        
        // Automatically fit to show all projects
        setTimeout(zoomToFit, 100);
    }
    
    // Save to local storage
    function saveToLocalStorage() {
        localStorage.setItem('preconstructionProjects', JSON.stringify(projects));
    }
    
    // Load from local storage
    function loadFromLocalStorage() {
        const savedProjects = localStorage.getItem('preconstructionProjects');
        if (savedProjects) {
            projects = JSON.parse(savedProjects);
            renderTimeline();
            
            // Create the legend once
            createLegend();
            
            // If we have projects, zoom to fit them
            if (projects.length > 0) {
                setTimeout(zoomToFit, 100);
            }
        } else {
            renderTimeline();
            createLegend();
        }
    }
    
    // Save data to file
    function saveDataToFile() {
        const dataStr = JSON.stringify(projects, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'preconstruction-projects.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Load data from file
    function handleFileUpload(event) {
        const file = event.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const loadedProjects = JSON.parse(e.target.result);
                    projects = loadedProjects;
                    saveToLocalStorage();
                    renderTimeline();
                    
                    // Zoom to fit after loading
                    setTimeout(zoomToFit, 100);
                } catch (error) {
                    alert('Error loading file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    }
    
    // Window resize handler - re-fit timeline when window size changes
    function handleWindowResize() {
        renderTimeline();
        if (projects.length > 0) {
            setTimeout(zoomToFit, 100);
        }
    }
    
    // Event listeners
    addProjectBtn.addEventListener('click', showAddProjectModal);
    saveDataBtn.addEventListener('click', saveDataToFile);
    loadDataBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    projectForm.addEventListener('submit', saveProject);
    deleteProjectBtn.addEventListener('click', deleteProject);
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => updateZoom(zoomLevel + 20));
    zoomOutBtn.addEventListener('click', () => updateZoom(zoomLevel - 20));
    zoomFitBtn.addEventListener('click', zoomToFit);
    
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', handleWindowResize);
    
    // Initialize app
    loadFromLocalStorage();
});