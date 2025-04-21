document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const addProjectBtn = document.getElementById('add-project');
    const exportDataBtn = document.getElementById('export-data'); // Changed from save-data to export-data
    const publishDataBtn = document.getElementById('publish-data'); // Added new button
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
    const currentDateInput = document.getElementById('current-date-input');
    const updateTodayBtn = document.getElementById('update-today');
    const deleteProjectBtn = document.getElementById('delete-project');
    const currentUser = document.getElementById('current-user');
    const currentDateTime = document.getElementById('current-datetime');
    const projectPotentialCheckbox = document.getElementById('project-potential');
    const tooltip = document.getElementById('tooltip');
    
    // Initialize user info and date display
    const username = 'Jmk125';
    const currentTimeFormatted = '2025-04-21 20:12:39'; // Using the provided timestamp
    currentUser.textContent = username;
    currentDateTime.textContent = currentTimeFormatted;
    
    // App state
    let projects = [];
    let editingIndex = null;
    let pixelsPerDay = 4; // Starting zoom level
    let zoomLevel = 100; // Percentage
    let startDate = null;
    let endDate = null;
    let activeBar = null; // Track active bar for drag operations
    let isDragging = false;
    let isResizingLeft = false;
    let isResizingRight = false;
    let hasUnsavedChanges = false; // Track whether there are unsaved changes
    
    // Current date (can be updated by user)
    let currentDate = dayjs('2025-04-21');
    currentDateInput.value = currentDate.format('YYYY-MM-DD');
    
    // Activity types with shorter display labels
    const activityTypes = [
        { id: 'sd', name: 'Schematic Design', shortName: 'SD', color: '#1cc88a' }, // Green
        { id: 'dd', name: 'Design Development', shortName: 'DD', color: '#4e73df' }, // Blue
        { id: 'gmp', name: 'GMP', shortName: 'GMP', color: '#e74a3b' }, // Red
        { id: 'bidding', name: 'Bidding', shortName: 'BID', color: '#f6c23e' } // Yellow
    ];
    
    // Helper function to get current date and time in the required format
    function getCurrentDateTime() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    // Update current date when user changes it
    updateTodayBtn.addEventListener('click', () => {
        const newDate = dayjs(currentDateInput.value);
        if (newDate.isValid()) {
            currentDate = newDate;
            renderTimeline();
        } else {
            alert('Please enter a valid date in the format YYYY-MM-DD');
        }
    });
    
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
                    const date = dayjs(project[`${type.id}Start`]).startOf('day');
                    if (!earliestDate || date.isBefore(earliestDate)) {
                        earliestDate = date;
                    }
                }
                
                if (project[`${type.id}End`]) {
                    const date = dayjs(project[`${type.id}End`]).startOf('day');
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
        pixelsPerDay = Math.floor((4 * zoomLevel) / 100);
        
        // Ensure minimum 1 pixel per day
        if (pixelsPerDay < 1) pixelsPerDay = 1;
        
        zoomLevelDisplay.textContent = `${zoomLevel}%`;
        
        // Redraw the timeline with new zoom
        renderTimeline();
    }
    
    // Zoom to fit all activities - FIXED to properly fill the screen width
    function zoomToFit() {
        if (projects.length === 0) return;
        
        // Calculate the container width, accounting for the project name width
        const timelineContainer = document.querySelector('.timeline-dates-wrapper');
        const containerWidth = timelineContainer.clientWidth;
        
        // Calculate the total days in the timeline
        const totalDays = endDate.diff(startDate, 'day') + 1; // Include end day
        
        // Calculate the ideal pixels per day to fill exactly the container width
        const idealPixelsPerDay = containerWidth / totalDays;
        
        // Calculate the zoom level that would give us this pixels per day
        const idealZoomLevel = Math.floor((idealPixelsPerDay * 100) / 4);
        
        // Apply zoom - use exact calculation to fill the width
        updateZoom(idealZoomLevel);
        
        // Force a re-render to ensure everything is properly sized
        setTimeout(() => {
            // Set the timeline width explicitly to match container
            const timelineDateDisplay = document.getElementById('timeline-dates');
            timelineDateDisplay.style.width = `${containerWidth}px`;
            
            // Update all project timelines to match
            const projectTimelines = document.querySelectorAll('.project-timeline');
            projectTimelines.forEach(timeline => {
                timeline.style.width = `${containerWidth}px`;
            });
        }, 50);
    }
    
    // Render the entire timeline
    function renderTimeline() {
        initTimelineDates();
        renderProjects();
        
        // Update visual indicator for unsaved changes
        updateUnsavedChangesIndicator();
    }
    
    // Initialize timeline dates
    function initTimelineDates() {
        timelineDates.innerHTML = '';
        
        // Calculate date range
        calculateDateRange();
        
        // Calculate the available width
        const containerWidth = document.querySelector('.timeline-dates-wrapper').clientWidth;
        
        // Generate month markers
        let currentMonth = startDate.clone().startOf('month');
        const timelineStartDay = startDate.startOf('day');
        
        while (currentMonth.isBefore(endDate) || currentMonth.isSame(endDate, 'month')) {
            // Calculate position for this month marker
            const days = currentMonth.diff(timelineStartDay, 'day');
            const position = days * pixelsPerDay;
            
            const monthMarker = document.createElement('div');
            monthMarker.className = 'month-marker';
            monthMarker.style.left = `${position}px`;
            
            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = currentMonth.format('MMM YYYY');
            monthLabel.style.left = `${position + 5}px`;
            
            timelineDates.appendChild(monthMarker);
            timelineDates.appendChild(monthLabel);
            
            // Move to next month
            currentMonth = currentMonth.add(1, 'month');
        }
        
        // Add today marker
        const todayDays = currentDate.diff(timelineStartDay, 'day');
        const todayPosition = todayDays * pixelsPerDay;
        
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
        const totalDays = endDate.diff(startDate, 'day') + 1;
        const timelineWidth = totalDays * pixelsPerDay;
        
        timelineDates.style.width = `${Math.max(containerWidth, timelineWidth)}px`;
    }
    
    // Calculate position from date
    function getPositionFromDate(date) {
        const timelineStartDay = startDate.startOf('day');
        const targetDay = dayjs(date).startOf('day');
        
        // Calculate exact days from start
        const days = targetDay.diff(timelineStartDay, 'day');
        
        // Return precise position
        return days * pixelsPerDay;
    }
    
    // Calculate date from position
    function getDateFromPosition(position) {
        // Calculate days from position
        const days = Math.round(position / pixelsPerDay);
        
        // Calculate exact date
        return startDate.clone().add(days, 'day').format('YYYY-MM-DD');
    }
    
    // Create legend (once)
    function createLegend() {
        legendContainer.innerHTML = '';
        
        // Add activity type legend items
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
        
        // Add potential project legend item
        const potentialLegendItem = document.createElement('div');
        potentialLegendItem.className = 'legend-item';
        
        const potentialLegendColor = document.createElement('div');
        potentialLegendColor.className = 'legend-color potential';
        
        const potentialLegendLabel = document.createElement('div');
        potentialLegendLabel.textContent = 'Potential Project';
        
        potentialLegendItem.appendChild(potentialLegendColor);
        potentialLegendItem.appendChild(potentialLegendLabel);
        legendContainer.appendChild(potentialLegendItem);
    }
    
    // Render projects with correct bar positioning
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
            
            // Add potential class if project is marked as potential
            if (project.potential) {
                projectRow.classList.add('potential');
            }
            
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
                    // Get date strings from the project
                    const startDateStr = project[`${type.id}Start`];
                    const endDateStr = project[`${type.id}End`];
                    
                    // Get date objects for calculations
                    const startDate = dayjs(startDateStr).startOf('day');
                    const endDate = dayjs(endDateStr).startOf('day');
                    
                    // Calculate positions using our consistent function
                    const startPosition = getPositionFromDate(startDate);
                    
                    // Calculate width based on inclusive date range (include end date)
                    const daysDiff = endDate.diff(startDate, 'day');
                    const width = (daysDiff + 1) * pixelsPerDay;
                    
                    // Minimum visual width
                    const minWidth = Math.max(20, pixelsPerDay);
                    
                    const activityBar = document.createElement('div');
                    activityBar.className = `activity-bar ${type.id}`;
                    activityBar.dataset.project = index;
                    activityBar.dataset.activity = type.id;
                    activityBar.dataset.start = startDateStr;
                    activityBar.dataset.end = endDateStr;
                    activityBar.style.left = `${startPosition}px`;
                    activityBar.style.width = `${Math.max(width, minWidth)}px`;
                    
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
                    
                    // Add tooltip event listeners
                    activityBar.addEventListener('mouseenter', showTooltip);
                    activityBar.addEventListener('mousemove', moveTooltip);
                    activityBar.addEventListener('mouseleave', hideTooltip);
                }
            });
            
            projectRow.appendChild(projectName);
            projectRow.appendChild(projectTimeline);
            projectsContainer.appendChild(projectRow);
        });
        
        // Initialize draggable activities
        initDraggable();
    }
    
    // Show tooltip with date information
    function showTooltip(event) {
        if (!isDragging && !isResizingLeft && !isResizingRight) {
            const bar = event.currentTarget;
            updateTooltipContent(bar);
            tooltip.style.display = 'block';
            moveTooltip(event);
        }
    }
    
    // Update tooltip content based on bar's current position
    function updateTooltipContent(bar) {
        // Get activity type
        const activityType = bar.dataset.activity;
        const activity = activityTypes.find(type => type.id === activityType);
        
        // Calculate current dates based on position
        const left = parseInt(bar.style.left) || 0;
        const width = parseInt(bar.style.width) || 0;
        
        // For tooltips, get start date from left position
        const startDate = getDateFromPosition(left);
        
        // For end date, calculate from the right edge minus one pixel
        // This ensures we're showing the actual end date, not the next day
        const endDate = getDateFromPosition(left + width - 1);
        
        // Update tooltip content
        tooltip.innerHTML = `
            <strong>${activity.name}</strong><br>
            Start: ${formatDate(startDate)}<br>
            End: ${formatDate(endDate)}
        `;
    }
    
    // Move tooltip with mouse - position above cursor
    function moveTooltip(event) {
        // Position the tooltip above the cursor
        tooltip.style.left = event.pageX + 'px';
        tooltip.style.top = (event.pageY - 75) + 'px'; // Position 75px above the cursor
    }
    
    // Hide tooltip
    function hideTooltip() {
        if (!isDragging && !isResizingLeft && !isResizingRight) {
            tooltip.style.display = 'none';
        }
    }
    
    // Format date for display
    function formatDate(dateStr) {
        const date = dayjs(dateStr);
        return date.format('MMM D, YYYY');
    }
    
    // Initialize draggable activities with improved drag handling
    function initDraggable() {
        // Clear any existing document-level event listeners
        document.removeEventListener('mousemove', documentMouseMove);
        document.removeEventListener('mouseup', documentMouseUp);
        
        // Add document-level event listeners for drag operations
        document.addEventListener('mousemove', documentMouseMove);
        document.addEventListener('mouseup', documentMouseUp);
        
        // Set up drag handlers for each activity bar
        const activityBars = document.querySelectorAll('.activity-bar');
        
        activityBars.forEach(bar => {
            // Remove existing listeners to prevent duplicates
            bar.removeEventListener('mousedown', barMouseDown);
            
            // Add mousedown event listener
            bar.addEventListener('mousedown', barMouseDown);
        });
    }
    
    // Mouse down event handler for activity bars
    function barMouseDown(e) {
        // Store reference to the clicked bar
        activeBar = this;
        
        // Determine what type of action we're performing
        if (e.target.classList.contains('resize-handle')) {
            if (e.target.classList.contains('left')) {
                isResizingLeft = true;
            } else if (e.target.classList.contains('right')) {
                isResizingRight = true;
            }
        } else {
            isDragging = true;
        }
        
        // Store initial state
        const rect = activeBar.getBoundingClientRect();
        activeBar.dataset.startX = e.clientX;
        activeBar.dataset.initialLeft = parseInt(activeBar.style.left) || 0;
        activeBar.dataset.initialWidth = parseInt(activeBar.style.width) || rect.width;
        
        // Store original dates
        activeBar.dataset.originalStart = activeBar.dataset.start;
        activeBar.dataset.originalEnd = activeBar.dataset.end;
        
        // Show tooltip immediately
        updateTooltipContent(activeBar);
        tooltip.style.display = 'block';
        tooltip.classList.add('drag-active');
        moveTooltip(e);
        
        e.preventDefault(); // Prevent text selection
    }
    
    // Mouse move event handler (document level)
    function documentMouseMove(e) {
        if (!activeBar || (!isDragging && !isResizingLeft && !isResizingRight)) return;
        
        // Calculate movement
        const startX = parseInt(activeBar.dataset.startX) || 0;
        const initialLeft = parseInt(activeBar.dataset.initialLeft) || 0;
        const initialWidth = parseInt(activeBar.dataset.initialWidth) || 100;
        const dx = e.clientX - startX;
        
        if (isDragging) {
            // When dragging, update the left position
            activeBar.style.left = (initialLeft + dx) + 'px';
        } else if (isResizingLeft) {
            // When resizing from the left, update both left and width
            const newLeft = initialLeft + dx;
            const newWidth = initialWidth - dx;
            
            // Ensure minimum width
            if (newWidth >= pixelsPerDay) {
                activeBar.style.left = newLeft + 'px';
                activeBar.style.width = newWidth + 'px';
            }
        } else if (isResizingRight) {
            // When resizing from the right, update only the width
            const newWidth = initialWidth + dx;
            
            // Ensure minimum width
            if (newWidth >= pixelsPerDay) {
                activeBar.style.width = newWidth + 'px';
            }
        }
        
        // Update tooltip in real-time during drag/resize
        if (activeBar) {
            updateTooltipContent(activeBar);
            moveTooltip(e);
        }
        
        e.preventDefault();
    }
    
    // Mouse up event handler (document level)
    function documentMouseUp(e) {
        if (!activeBar) return;
        
        if (isDragging || isResizingLeft || isResizingRight) {
            // Update project data when dragging or resizing ends
            const projectIndex = parseInt(activeBar.dataset.project);
            const activityType = activeBar.dataset.activity;
            
            const left = parseInt(activeBar.style.left);
            const width = parseInt(activeBar.style.width);
            
            // Get the exact new dates based on position
            const newStartDate = getDateFromPosition(left);
            
            // Calculate the end date from right edge minus 1 pixel
            // This gives us the actual end date, not the day after
            const newEndDate = getDateFromPosition(left + width - 1);
            
            // Update project data
            projects[projectIndex][`${activityType}Start`] = newStartDate;
            projects[projectIndex][`${activityType}End`] = newEndDate;
            
            // Update the bar's data attributes
            activeBar.dataset.start = newStartDate;
            activeBar.dataset.end = newEndDate;
            
            // Mark as having unsaved changes instead of auto-saving
            markAsUnsaved();
            
            // Check if we need to redraw the timeline
            if (dayjs(newStartDate).isBefore(startDate) || dayjs(newEndDate).isAfter(endDate)) {
                renderTimeline();
            }
        }
        
        // Hide tooltip after operation completes
        tooltip.style.display = 'none';
        tooltip.classList.remove('drag-active');
        
        // Reset flags and active bar
        isDragging = false;
        isResizingLeft = false;
        isResizingRight = false;
        activeBar = null;
    }
    
    // Mark the document as having unsaved changes
    function markAsUnsaved() {
        hasUnsavedChanges = true;
        updateUnsavedChangesIndicator();
    }
    
    // Update visual indicator for unsaved changes
    function updateUnsavedChangesIndicator() {
        if (hasUnsavedChanges) {
            document.body.classList.add('unsaved-changes');
            publishDataBtn.classList.add('has-changes');
        } else {
            document.body.classList.remove('unsaved-changes');
            publishDataBtn.classList.remove('has-changes');
        }
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
        document.getElementById('project-potential').checked = project.potential || false;
        
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
                markAsUnsaved(); // Mark as having unsaved changes
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
            name: document.getElementById('project-name').value,
            potential: document.getElementById('project-potential').checked
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
        
        markAsUnsaved(); // Mark as having unsaved changes
        modal.style.display = 'none';
        
        // Update timeline with new project data
        renderTimeline();
        
        // Automatically fit to show all projects
        setTimeout(zoomToFit, 100);
    }
    
    // Publish changes to local storage with metadata
    function publishChanges() {
        if (!hasUnsavedChanges) {
            alert('No changes to publish');
            return;
        }
        
        // Update current timestamp
        const publishDateTime = getCurrentDateTime();
        
        // Create data structure with metadata
        const saveData = {
            projects: projects,
            metadata: {
                publishedBy: username,
                publishedAt: publishDateTime
            }
        };
        
        // Save to localStorage with metadata
        localStorage.setItem('preconstructionProjects', JSON.stringify(saveData));
        
        // Update display of current user and datetime in the UI
        currentUser.textContent = username;
        currentDateTime.textContent = publishDateTime;
        
        // Add visual indication of who published and when
        const userInfoElement = document.querySelector('.user-info');
        userInfoElement.classList.add('just-published');
        
        // Remove the highlight after 3 seconds
        setTimeout(() => {
            userInfoElement.classList.remove('just-published');
        }, 3000);
        
        // Clear unsaved changes flag
        hasUnsavedChanges = false;
        updateUnsavedChangesIndicator();
        
        // Show confirmation
        alert(`Changes published successfully!\nPublished by: ${username}\nDate: ${publishDateTime}`);
    }
    
    // Load from local storage
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('preconstructionProjects');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                
                // Handle both old format (just projects array) and new format (with metadata)
                if (Array.isArray(parsedData)) {
                    // Old format - just an array of projects
                    projects = parsedData;
                } else if (parsedData.projects && Array.isArray(parsedData.projects)) {
                    // New format with metadata
                    projects = parsedData.projects;
                    
                    // Update user info display if metadata is available
                    if (parsedData.metadata) {
                        if (parsedData.metadata.publishedBy) {
                            currentUser.textContent = parsedData.metadata.publishedBy;
                        }
                        if (parsedData.metadata.publishedAt) {
                            currentDateTime.textContent = parsedData.metadata.publishedAt;
                        }
                    }
                }
                
                renderTimeline();
                
                // Create the legend once
                createLegend();
                
                // If we have projects, zoom to fit them
                if (projects.length > 0) {
                    setTimeout(zoomToFit, 100);
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
                
                // Start with empty projects
                projects = [];
                renderTimeline();
                createLegend();
            }
        } else {
            renderTimeline();
            createLegend();
        }
        
        // No unsaved changes after loading
        hasUnsavedChanges = false;
        updateUnsavedChangesIndicator();
    }
    
    // Export data to file
    function exportDataToFile() {
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
                    
                    // Handle both formats - simple array or object with metadata
                    if (Array.isArray(loadedProjects)) {
                        projects = loadedProjects;
                    } else if (loadedProjects.projects && Array.isArray(loadedProjects.projects)) {
                        projects = loadedProjects.projects;
                    } else {
                        throw new Error('Invalid file format');
                    }
                    
                    markAsUnsaved(); // Mark as having unsaved changes after import
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
    exportDataBtn.addEventListener('click', exportDataToFile);
    publishDataBtn.addEventListener('click', publishChanges);
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
