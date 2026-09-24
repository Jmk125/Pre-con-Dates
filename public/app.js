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
    const pastWindowMonthsInput = document.getElementById('past-window-months');
    const futureBufferMonthsInput = document.getElementById('future-buffer-months');
    const applyTimeWindowBtn = document.getElementById('apply-time-window');
    const shiftWindowBackBtn = document.getElementById('shift-window-back');
    const shiftWindowForwardBtn = document.getElementById('shift-window-forward');
    const deleteProjectBtn = document.getElementById('delete-project');
    const currentUser = document.getElementById('current-user');
    const currentDateTime = document.getElementById('current-datetime');
    const projectPotentialCheckbox = document.getElementById('project-potential');
    const tooltip = document.getElementById('tooltip');
    const addCustomActivityBtn = document.getElementById('add-custom-activity');
    const colorModeToggleBtn = document.getElementById('color-mode-toggle');
    const staffSettingsBtn = document.getElementById('staff-settings');
    const staffModal = document.getElementById('staff-modal');
    const staffModalClose = document.getElementById('staff-modal-close');
    const staffList = document.getElementById('staff-list');
    const staffAddForm = document.getElementById('staff-add-form');
    const staffNameInput = document.getElementById('staff-name-input');
    const staffColorInput = document.getElementById('staff-color-input');
    const projectEstimatorsContainer = document.getElementById('project-estimators');
    
    // Initialize datetime display (username will be set on publish or load)
    const currentTimeFormatted = '2025-04-22 20:56:31'; // Using the provided timestamp
    currentDateTime.textContent = currentTimeFormatted;
    currentUser.textContent = 'Jmk125'; // Using the provided login
    
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
    let staff = []; // Estimators: { id, name, color }
    let colorMode = 'activity'; // 'activity' or 'estimator'
    
    // Remember the color mode per browser (a viewing preference, not project data)
    try {
        if (localStorage.getItem('colorMode') === 'estimator') colorMode = 'estimator';
    } catch (e) { /* storage unavailable - use default */ }
    
    const UNASSIGNED_COLOR = '#9ca3af';
    const defaultStaffColors = ['#4e73df', '#1cc88a', '#e74a3b', '#f6c23e', '#8e44ad', '#fd7e14', '#20c9a6', '#e83e8c', '#6f42c1', '#5a5c69'];
    
    // Current date (can be updated by user)
    let currentDate = dayjs();
    const realToday = dayjs().startOf('day');
    let pastWindowMonths = 3;
    let futureBufferMonths = 3;
    currentDateInput.value = currentDate.format('YYYY-MM-DD');
    pastWindowMonthsInput.value = pastWindowMonths;
    futureBufferMonthsInput.value = futureBufferMonths;
    
    // Activity types with shorter display labels
    const activityTypes = [
        { id: 'sd', name: 'Schematic Design', shortName: 'SD', color: '#1cc88a' }, // Green
        { id: 'dd', name: 'Design Development', shortName: 'DD', color: '#4e73df' }, // Blue
        { id: 'gmp', name: 'GMP', shortName: 'GMP', color: '#e74a3b' }, // Red
        { id: 'bidding', name: 'Bidding', shortName: 'BID', color: '#f6c23e' } // Yellow
    ];
    
    // Custom activities container div - reference to store custom activities in form
    let customActivitiesContainer = null;
    
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
    
    // Add Custom Activity event listener
    if (addCustomActivityBtn) {
        addCustomActivityBtn.addEventListener('click', addCustomActivityToForm);
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

    function parseWindowMonths(value, fallback, min) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed < min) {
            return fallback;
        }
        return parsed;
    }

    applyTimeWindowBtn.addEventListener('click', () => {
        pastWindowMonths = parseWindowMonths(pastWindowMonthsInput.value, pastWindowMonths, 0);
        futureBufferMonths = parseWindowMonths(futureBufferMonthsInput.value, futureBufferMonths, 1);

        pastWindowMonthsInput.value = pastWindowMonths;
        futureBufferMonthsInput.value = futureBufferMonths;

        renderTimeline();
    });
    function shiftTimelineWindow(monthDelta) {
        currentDate = currentDate.add(monthDelta, 'month');
        currentDateInput.value = currentDate.format('YYYY-MM-DD');
        renderTimeline();
    }

    shiftWindowBackBtn.addEventListener('click', () => {
        shiftTimelineWindow(-1);
    });

    shiftWindowForwardBtn.addEventListener('click', () => {
        shiftTimelineWindow(1);
    });
    
    // Calculate date range based on all projects
    function calculateDateRange() {
        const windowStart = currentDate.subtract(pastWindowMonths, 'month').startOf('month');

        if (projects.length === 0) {
            startDate = windowStart;
            endDate = currentDate.add(futureBufferMonths, 'month').endOf('month');
            return;
        }

        let latestDate = null;

        projects.forEach(project => {
            // Check standard activities
            activityTypes.forEach(type => {
                if (project[`${type.id}End`]) {
                    const date = dayjs(project[`${type.id}End`]).startOf('day');
                    if (!latestDate || date.isAfter(latestDate)) {
                        latestDate = date;
                    }
                }
            });

            // Check custom activities
            if (project.customActivities && Array.isArray(project.customActivities)) {
                project.customActivities.forEach(activity => {
                    if (activity.endDate) {
                        const date = dayjs(activity.endDate).startOf('day');
                        if (!latestDate || date.isAfter(latestDate)) {
                            latestDate = date;
                        }
                    }
                });
            }
        });

        startDate = windowStart;

        const baseEndDate = latestDate && latestDate.isAfter(currentDate)
            ? latestDate
            : currentDate.startOf('day');

        endDate = baseEndDate.add(futureBufferMonths, 'month').endOf('month');

        // Ensure a minimum timeline span of 6 months
        if (endDate.diff(startDate, 'month') < 6) {
            endDate = startDate.add(6, 'month').endOf('month');
        }
    }

    function hasVisibleProjectActivity(project) {
        const timelineStart = startDate.startOf('day');
        const timelineEnd = endDate.endOf('day');

        const overlapsTimeline = (activityStart, activityEnd) => {
            const start = dayjs(activityStart).startOf('day');
            const end = dayjs(activityEnd).startOf('day');
            return !end.isBefore(timelineStart) && !start.isAfter(timelineEnd);
        };

        for (const type of activityTypes) {
            if (project[`${type.id}Start`] && project[`${type.id}End`] && overlapsTimeline(project[`${type.id}Start`], project[`${type.id}End`])) {
                return true;
            }
        }

        if (project.customActivities && Array.isArray(project.customActivities)) {
            for (const activity of project.customActivities) {
                if (activity.startDate && activity.endDate && overlapsTimeline(activity.startDate, activity.endDate)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Update zoom level
    function updateZoom(newZoomLevel, options = {}) {
        const minZoom = options.allowLowerMin ? 1 : 20;

        // Limit zoom between min and 400%
        zoomLevel = Math.max(minZoom, Math.min(400, newZoomLevel));

        // Use decimal precision for smoother and more accurate fit calculations
        pixelsPerDay = (4 * zoomLevel) / 100;

        // Ensure a small but non-zero rendering width
        if (pixelsPerDay < 0.25) pixelsPerDay = 0.25;

        zoomLevelDisplay.textContent = `${Math.round(zoomLevel)}%`;

        // Redraw the timeline with new zoom
        renderTimeline();
    }

    // Fit timeline width to the current date window as accurately as possible
    function zoomToFit() {
        if (projects.length === 0) return;

        // Ensure range values are current before fitting
        calculateDateRange();

        const timelineWrapper = document.querySelector('.timeline-dates-wrapper');
        const availableWidth = timelineWrapper.clientWidth;
        const totalDays = endDate.diff(startDate, 'day') + 1;

        if (availableWidth <= 0 || totalDays <= 0) return;

        // Match timeline width to container width with slight padding for labels/borders
        const usableWidth = Math.max(1, availableWidth - 6);
        const idealPixelsPerDay = usableWidth / totalDays;
        const idealZoomLevel = (idealPixelsPerDay * 100) / 4;

        updateZoom(idealZoomLevel, { allowLowerMin: true });
    }
    
    // Render the entire timeline
    function renderTimeline() {
        initTimelineDates();
        renderProjects();
        createLegend();
        
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
        
        // Add today marker (fixed to the real date so it moves as the window shifts)
        const todayDays = realToday.diff(timelineStartDay, 'day');
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
    
    // Position and size a bar from its (inclusive) start and end dates
    function positionBar(bar, startDateStr, endDateStr) {
        const barStart = dayjs(startDateStr).startOf('day');
        const barEnd = dayjs(endDateStr).startOf('day');
        const width = (barEnd.diff(barStart, 'day') + 1) * pixelsPerDay;
        const minWidth = Math.max(20, pixelsPerDay);

        bar.style.left = `${getPositionFromDate(barStart)}px`;
        bar.style.width = `${Math.max(width, minWidth)}px`;
    }
    
    // Create legend (once)
    function createLegend() {
        legendContainer.innerHTML = '';
        
        if (colorMode === 'estimator') {
            createEstimatorLegend();
        } else {
            createActivityLegend();
        }
        
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
    
    function addLegendItem(label, color) {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const legendColor = document.createElement('div');
        legendColor.className = 'legend-color';
        legendColor.style.backgroundColor = color;
        
        const legendLabel = document.createElement('div');
        legendLabel.textContent = label;
        
        legendItem.appendChild(legendColor);
        legendItem.appendChild(legendLabel);
        legendContainer.appendChild(legendItem);
    }
    
    function createEstimatorLegend() {
        staff.forEach(member => addLegendItem(member.name, member.color));
        
        if (projects.some(project => getProjectEstimators(project).length === 0)) {
            addLegendItem('Unassigned', UNASSIGNED_COLOR);
        }
    }
    
    function createActivityLegend() {
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
        const visibleProjects = projects
            .map((project, index) => ({ project, index }))
            .filter(({ project }) => hasVisibleProjectActivity(project));

        if (visibleProjects.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No projects in the selected time window.';
            projectsContainer.appendChild(emptyMessage);
            return;
        }

        visibleProjects.forEach(({ project, index }) => {
            const projectRow = document.createElement('div');
            projectRow.className = 'project-row';
            
            // Add potential class if project is marked as potential
            if (project.potential) {
                projectRow.classList.add('potential');
            }

            const hasBelowCustomActivity = Array.isArray(project.customActivities)
                && project.customActivities.some(customActivity => customActivity && customActivity.showBelow === true);

            if (hasBelowCustomActivity) {
                projectRow.classList.add('has-below-row');
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
            
            // Add standard activities
            activityTypes.forEach(type => {
                if (project[`${type.id}Start`] && project[`${type.id}End`]) {
                    // Get date strings from the project
                    const startDateStr = project[`${type.id}Start`];
                    const endDateStr = project[`${type.id}End`];
                    
                    const activityBar = document.createElement('div');
                    activityBar.className = `activity-bar ${type.id}`;
                    activityBar.dataset.project = index;
                    activityBar.dataset.activity = type.id;
                    activityBar.dataset.start = startDateStr;
                    activityBar.dataset.end = endDateStr;
                    positionBar(activityBar, startDateStr, endDateStr);
                    applyBarColor(activityBar, project);
                    activityBar.style.top = '10px';
                    
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
            
            // Add custom activities
            if (project.customActivities && Array.isArray(project.customActivities)) {
                project.customActivities.forEach((customActivity, customIndex) => {
                    if (customActivity.startDate && customActivity.endDate && customActivity.name && customActivity.type) {
                        // Find the activity type to get the color
                        const activityType = activityTypes.find(type => type.id === customActivity.type);
                        if (!activityType) return;

                        const activityBar = document.createElement('div');
                        activityBar.className = `activity-bar ${activityType.id} custom-activity`;
                        activityBar.dataset.project = index;
                        activityBar.dataset.customActivity = customIndex;
                        activityBar.dataset.start = customActivity.startDate;
                        activityBar.dataset.end = customActivity.endDate;
                        activityBar.dataset.activityName = customActivity.name;
                        activityBar.dataset.activityType = customActivity.type;
                        positionBar(activityBar, customActivity.startDate, customActivity.endDate);
                        applyBarColor(activityBar, project);
                        activityBar.style.top = customActivity.showBelow ? '50px' : '10px';

                        const activityLabel = document.createElement('div');
                        activityLabel.className = 'activity-label';
                        activityLabel.textContent = customActivity.name; // Use the custom name

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
            }
            
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
        // Get activity type and name
        let activityType, activityName;
        
        if (bar.dataset.customActivity !== undefined) {
            // Custom activity
            activityType = bar.dataset.activityType;
            activityName = bar.dataset.activityName;
        } else {
            // Standard activity
            activityType = bar.dataset.activity;
            const activity = activityTypes.find(type => type.id === activityType);
            activityName = activity.name;
        }
        
        // Dates come from the bar's data (updated live while dragging), not from pixels
        const project = projects[parseInt(bar.dataset.project)];
        const estimators = project ? getProjectEstimators(project) : [];

        tooltip.innerHTML = `
            <strong>${escapeHtml(activityName)}</strong><br>
            Start: ${formatDate(bar.dataset.start)}<br>
            End: ${formatDate(bar.dataset.end)}<br>
            ${estimators.length > 1 ? 'Estimators' : 'Estimator'}: ${estimators.length > 0 ? estimators.map(m => escapeHtml(m.name)).join(', ') : 'Unassigned'}
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
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
    
    // ---- Staff / estimator coloring ----
    
    function getStaffMember(id) {
        if (!id) return null;
        return staff.find(member => member.id === id) || null;
    }
    
    // Estimator ids for a project (also reads the older single-estimator field)
    function getProjectEstimatorIds(project) {
        if (Array.isArray(project.estimatorIds)) return project.estimatorIds;
        return project.estimatorId ? [project.estimatorId] : [];
    }
    
    // Assigned staff members that still exist, in staff-list order
    function getProjectEstimators(project) {
        const ids = getProjectEstimatorIds(project);
        return staff.filter(member => ids.includes(member.id));
    }
    
    function isAssignedTo(project, staffId) {
        return getProjectEstimatorIds(project).includes(staffId);
    }
    
    // In estimator mode, override the activity color with the estimators' colors.
    // Several estimators are shown as diagonal stripes, one stripe per person.
    function applyBarColor(bar, project) {
        if (colorMode !== 'estimator') return;
        const estimators = getProjectEstimators(project);
        
        if (estimators.length === 0) {
            bar.style.background = UNASSIGNED_COLOR;
        } else if (estimators.length === 1) {
            bar.style.background = estimators[0].color;
        } else {
            const stripeWidth = 8;
            const stops = estimators.map((member, i) =>
                `${member.color} ${i * stripeWidth}px ${(i + 1) * stripeWidth}px`);
            bar.style.background = `repeating-linear-gradient(45deg, ${stops.join(', ')})`;
        }
    }
    
    function updateColorModeButton() {
        colorModeToggleBtn.textContent = colorMode === 'estimator' ? 'Color by: Estimator' : 'Color by: Activity';
        colorModeToggleBtn.classList.toggle('estimator-mode', colorMode === 'estimator');
    }
    
    function toggleColorMode() {
        colorMode = colorMode === 'estimator' ? 'activity' : 'estimator';
        try {
            localStorage.setItem('colorMode', colorMode);
        } catch (e) { /* storage unavailable - mode just won't persist */ }
        updateColorModeButton();
        renderTimeline();
    }
    
    function normalizeStaff(list) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(member => member && member.id && member.name)
            .map(member => ({
                id: String(member.id),
                name: String(member.name),
                color: /^#[0-9a-fA-F]{6}$/.test(member.color) ? member.color : UNASSIGNED_COLOR
            }));
    }
    
    function nextDefaultStaffColor() {
        const used = new Set(staff.map(member => member.color.toLowerCase()));
        return defaultStaffColors.find(color => !used.has(color)) || defaultStaffColors[staff.length % defaultStaffColors.length];
    }
    
    function renderStaffList() {
        staffList.innerHTML = '';
        
        if (staff.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'staff-empty';
            empty.textContent = 'No staff yet.';
            staffList.appendChild(empty);
            return;
        }
        
        staff.forEach(member => {
            const row = document.createElement('div');
            row.className = 'staff-row';
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = member.color;
            colorInput.title = 'Change color';
            colorInput.addEventListener('input', () => {
                member.color = colorInput.value;
                markAsUnsaved();
                renderTimeline();
            });
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = member.name;
            nameInput.className = 'staff-name';
            nameInput.addEventListener('change', () => {
                const newName = nameInput.value.trim();
                if (!newName) {
                    nameInput.value = member.name;
                    return;
                }
                member.name = newName;
                markAsUnsaved();
                renderTimeline();
            });
            
            const assignedCount = projects.filter(project => isAssignedTo(project, member.id)).length;
            const count = document.createElement('span');
            count.className = 'staff-count';
            count.textContent = `${assignedCount} project${assignedCount === 1 ? '' : 's'}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-danger staff-remove';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeStaffMember(member.id));
            
            row.appendChild(colorInput);
            row.appendChild(nameInput);
            row.appendChild(count);
            row.appendChild(removeBtn);
            staffList.appendChild(row);
        });
    }
    
    function addStaffMember(e) {
        e.preventDefault();
        const name = staffNameInput.value.trim();
        if (!name) return;
        
        staff.push({
            id: 'staff-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: name,
            color: staffColorInput.value
        });
        
        staffNameInput.value = '';
        staffColorInput.value = nextDefaultStaffColor();
        markAsUnsaved();
        renderStaffList();
        renderTimeline();
        staffNameInput.focus();
    }
    
    function removeStaffMember(id) {
        const member = getStaffMember(id);
        if (!member) return;
        
        const assigned = projects.filter(project => isAssignedTo(project, id));
        const message = assigned.length > 0
            ? `Remove "${member.name}"? They will be unassigned from ${assigned.length} project(s).`
            : `Remove "${member.name}"?`;
        if (!confirm(message)) return;
        
        staff = staff.filter(m => m.id !== id);
        assigned.forEach(project => {
            project.estimatorIds = getProjectEstimatorIds(project).filter(staffId => staffId !== id);
            delete project.estimatorId;
        });
        markAsUnsaved();
        renderStaffList();
        renderTimeline();
    }
    
    function showStaffModal() {
        renderStaffList();
        staffColorInput.value = nextDefaultStaffColor();
        staffModal.style.display = 'block';
        staffNameInput.focus();
    }
    
    // Fill the estimator checkboxes in the project form
    function populateEstimatorChoices(selectedIds) {
        projectEstimatorsContainer.innerHTML = '';
        
        if (staff.length === 0) {
            const hint = document.createElement('span');
            hint.className = 'checkbox-hint';
            hint.textContent = 'No staff yet - add people with the ⚙ button.';
            projectEstimatorsContainer.appendChild(hint);
            return;
        }
        
        staff.forEach(member => {
            const option = document.createElement('label');
            option.className = 'estimator-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member.id;
            checkbox.checked = selectedIds.includes(member.id);
            
            const swatch = document.createElement('span');
            swatch.className = 'estimator-swatch';
            swatch.style.backgroundColor = member.color;
            
            const name = document.createElement('span');
            name.textContent = member.name;
            
            option.appendChild(checkbox);
            option.appendChild(swatch);
            option.appendChild(name);
            projectEstimatorsContainer.appendChild(option);
        });
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
        activeBar.dataset.startX = e.clientX;
        
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
        
        // Convert mouse movement into whole days so bars snap to exact dates
        const startX = parseFloat(activeBar.dataset.startX) || 0;
        const dayDelta = Math.round((e.clientX - startX) / pixelsPerDay);
        const originalStart = dayjs(activeBar.dataset.originalStart);
        const originalEnd = dayjs(activeBar.dataset.originalEnd);
        let newStart = originalStart;
        let newEnd = originalEnd;
        
        if (isDragging) {
            newStart = originalStart.add(dayDelta, 'day');
            newEnd = originalEnd.add(dayDelta, 'day');
        } else if (isResizingLeft) {
            // Start can move up to (but not past) the end date
            newStart = originalStart.add(dayDelta, 'day');
            if (newStart.isAfter(originalEnd)) newStart = originalEnd;
        } else if (isResizingRight) {
            // End can move back to (but not before) the start date
            newEnd = originalEnd.add(dayDelta, 'day');
            if (newEnd.isBefore(originalStart)) newEnd = originalStart;
        }
        
        activeBar.dataset.start = newStart.format('YYYY-MM-DD');
        activeBar.dataset.end = newEnd.format('YYYY-MM-DD');
        positionBar(activeBar, activeBar.dataset.start, activeBar.dataset.end);
        
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
            
            // Dates were already snapped to whole days during the drag
            const newStartDate = activeBar.dataset.start;
            const newEndDate = activeBar.dataset.end;
            const changed = newStartDate !== activeBar.dataset.originalStart
                || newEndDate !== activeBar.dataset.originalEnd;
            
            // A plain click (no movement) must not touch the stored dates
            if (changed) {
                if (activeBar.dataset.customActivity !== undefined) {
                    // Update custom activity
                    const customIndex = parseInt(activeBar.dataset.customActivity);
                    projects[projectIndex].customActivities[customIndex].startDate = newStartDate;
                    projects[projectIndex].customActivities[customIndex].endDate = newEndDate;
                } else {
                    // Update standard activity
                    const activityType = activeBar.dataset.activity;
                    projects[projectIndex][`${activityType}Start`] = newStartDate;
                    projects[projectIndex][`${activityType}End`] = newEndDate;
                }
                
                // Mark as having unsaved changes instead of auto-saving
                markAsUnsaved();
                
                // Check if we need to redraw the timeline
                if (dayjs(newStartDate).isBefore(startDate) || dayjs(newEndDate).isAfter(endDate)) {
                    renderTimeline();
                }
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
    
    // Add custom activity to form
    function addCustomActivityToForm() {
        // Get the container for custom activities
        const customActivitiesContainer = document.getElementById('custom-activities-container');
        if (!customActivitiesContainer) return;
        
        // Create a unique ID for this custom activity
        const customId = 'custom-' + Date.now();
        
        // Create container for this custom activity
        const customActivityRow = document.createElement('div');
        customActivityRow.className = 'custom-activity-row';
        customActivityRow.dataset.id = customId;
        
        // Activity name
        const nameContainer = document.createElement('div');
        nameContainer.className = 'form-group custom-activity-name';
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Activity Name:';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control custom-name';
        nameInput.required = true;
        nameInput.placeholder = 'e.g., Sitework Bid';
        
        nameContainer.appendChild(nameLabel);
        nameContainer.appendChild(nameInput);
        
        // Activity type (for color)
        const typeContainer = document.createElement('div');
        typeContainer.className = 'form-group custom-activity-type';
        
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Activity Type (for color):';
        
        const typeSelect = document.createElement('select');
        typeSelect.className = 'form-control custom-type';
        typeSelect.required = true;
        
        // Add options for each activity type
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });
        
        typeContainer.appendChild(typeLabel);
        typeContainer.appendChild(typeSelect);
        
        // Date range
        const dateContainer = document.createElement('div');
        dateContainer.className = 'date-range-container';
        
        // Start date
        const startContainer = document.createElement('div');
        startContainer.className = 'form-group start-date';
        
        const startLabel = document.createElement('label');
        startLabel.textContent = 'Start Date:';
        
        const startInput = document.createElement('input');
        startInput.type = 'date';
        startInput.className = 'form-control custom-start';
        startInput.required = true;
        
        startContainer.appendChild(startLabel);
        startContainer.appendChild(startInput);
        
        // End date
        const endContainer = document.createElement('div');
        endContainer.className = 'form-group end-date';
        
        const endLabel = document.createElement('label');
        endLabel.textContent = 'End Date:';
        
        const endInput = document.createElement('input');
        endInput.type = 'date';
        endInput.className = 'form-control custom-end';
        endInput.required = true;
        
        endContainer.appendChild(endLabel);
        endContainer.appendChild(endInput);
        
        dateContainer.appendChild(startContainer);
        dateContainer.appendChild(endContainer);

        // Optional below-lane toggle
        const belowContainer = document.createElement('div');
        belowContainer.className = 'form-group custom-below-option';

        const belowLabel = document.createElement('label');
        belowLabel.className = 'custom-below-label';

        const belowInput = document.createElement('input');
        belowInput.type = 'checkbox';
        belowInput.className = 'custom-show-below';

        const belowLabelText = document.createElement('span');
        belowLabelText.textContent = 'Below (show on second activity lane)';

        belowLabel.appendChild(belowInput);
        belowLabel.appendChild(belowLabelText);
        belowContainer.appendChild(belowLabel);
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger remove-custom-activity';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', function() {
            customActivityRow.remove();
        });
        
        // Add all elements to the row
        customActivityRow.appendChild(nameContainer);
        customActivityRow.appendChild(typeContainer);
        customActivityRow.appendChild(dateContainer);
        customActivityRow.appendChild(belowContainer);
        customActivityRow.appendChild(removeBtn);
        
        // Add the row to the container
        customActivitiesContainer.appendChild(customActivityRow);
    }
    
    // Initialize custom activities section in form
    function initCustomActivitiesSection() {
        // Reference the container from the DOM
        customActivitiesContainer = document.getElementById('custom-activities-container');
        
        // Clear existing custom activities when opening a new form
        if (customActivitiesContainer) {
            customActivitiesContainer.innerHTML = '';
        }
    }
    
    // Show add project modal
    function showAddProjectModal() {
        modalTitle.textContent = 'Add Project';
        projectForm.reset();
        editingIndex = null;
        populateEstimatorChoices([]);
        
        // Initialize custom activities section
        initCustomActivitiesSection();
        
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
        populateEstimatorChoices(getProjectEstimatorIds(project));
        
        // Initialize custom activities section
        initCustomActivitiesSection();
        
        // Fill in standard activities
        activityTypes.forEach(type => {
            if (project[`${type.id}Start`]) {
                document.getElementById(`${type.id}-start`).value = project[`${type.id}Start`];
            }
            if (project[`${type.id}End`]) {
                document.getElementById(`${type.id}-end`).value = project[`${type.id}End`];
            }
        });
        
        // Fill in custom activities if they exist
        if (project.customActivities && Array.isArray(project.customActivities)) {
            project.customActivities.forEach(customActivity => {
                // Create a new custom activity row
                addCustomActivityToForm();
                
                // Get the row we just added (last one in container)
                const rows = customActivitiesContainer.querySelectorAll('.custom-activity-row');
                const lastRow = rows[rows.length - 1];
                
                // Fill in values
                lastRow.querySelector('.custom-name').value = customActivity.name;
                lastRow.querySelector('.custom-type').value = customActivity.type;
                lastRow.querySelector('.custom-start').value = customActivity.startDate;
                lastRow.querySelector('.custom-end').value = customActivity.endDate;
                lastRow.querySelector('.custom-show-below').checked = customActivity.showBelow === true;
            });
        }
        
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
        
        projectData.estimatorIds = [...projectEstimatorsContainer.querySelectorAll('input[type="checkbox"]:checked')]
            .map(checkbox => checkbox.value);
        
        // Save standard activities
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
        
        // Save custom activities
        projectData.customActivities = [];
        
        // Get all custom activity rows
        const customRows = document.getElementById('custom-activities-container').querySelectorAll('.custom-activity-row');
        customRows.forEach(row => {
            const name = row.querySelector('.custom-name').value;
            const type = row.querySelector('.custom-type').value;
            const startDate = row.querySelector('.custom-start').value;
            const endDate = row.querySelector('.custom-end').value;
            const showBelow = row.querySelector('.custom-show-below').checked;
            
            if (name && type && startDate && endDate) {
                projectData.customActivities.push({
                    name: name,
                    type: type,
                    startDate: startDate,
                    endDate: endDate,
                    showBelow: showBelow
                });
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
    
    // Prompt for user initials before publishing
    function promptForInitials() {
        let userInitials = prompt("Enter your initials for publishing:");
        
        // Validate input
        if (!userInitials) {
            alert("Initials are required to publish changes.");
            return null;
        }
        
        // Limit length if needed (optional)
        if (userInitials.length > 10) {
            userInitials = userInitials.substring(0, 10);
        }
        
        return userInitials;
    }
    
    // Publish changes to the server with metadata
    function publishChanges() {
        if (!hasUnsavedChanges) {
            alert('No changes to publish');
            return;
        }
        
        // Prompt for user initials
        const userInitials = promptForInitials();
        if (!userInitials) return; // Exit if no initials provided
        
        // Update current timestamp (will be overridden by server)
        const publishDateTime = getCurrentDateTime();
        
        // Create data structure with metadata
        const saveData = {
            projects: projects,
            staff: staff,
            metadata: {
                publishedBy: userInitials,
                publishedAt: publishDateTime
            }
        };
        
        // Show publishing indicator
        const publishBtn = document.getElementById('publish-data');
        if (publishBtn) {
            publishBtn.textContent = 'Publishing...';
            publishBtn.disabled = true;
        }
        
        // Send data to server
        fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saveData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(result => {
            // Reset button
            if (publishBtn) {
                publishBtn.textContent = 'Publish';
                publishBtn.disabled = false;
            }
            
            // Update display of current user and datetime in the UI
            currentUser.textContent = userInitials;
            if (result.timestamp) {
                currentDateTime.textContent = result.timestamp;
            } else {
                currentDateTime.textContent = publishDateTime;
            }
            
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
            alert(`Changes published successfully!\nPublished by: ${userInitials}\nDate: ${result.timestamp || publishDateTime}`);
        })
        .catch(error => {
            console.error('Error publishing projects:', error);
            alert('Error publishing projects: ' + error.message);
            
            // Reset button
            if (publishBtn) {
                publishBtn.textContent = 'Publish';
                publishBtn.disabled = false;
            }
        });
    }
    
    // Load projects from the server
    function loadFromServer() {
        // Show loading indicator
        const projectsContainer = document.getElementById('projects-container');
        if (projectsContainer) {
            projectsContainer.innerHTML = '<div class="loading">Loading projects...</div>';
        }
        
        // Fetch projects from the server
        fetch('/api/projects')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                // Handle the data format
                if (data.projects && Array.isArray(data.projects)) {
                    projects = data.projects;
                    staff = normalizeStaff(data.staff);
                    
                    // Update user info display if metadata is available
                    if (data.metadata) {
                        if (data.metadata.publishedBy) {
                            currentUser.textContent = data.metadata.publishedBy;
                        }
                        if (data.metadata.publishedAt) {
                            currentDateTime.textContent = data.metadata.publishedAt;
                        }
                    }
                } else if (Array.isArray(data)) {
                    // Legacy format - just an array of projects
                    projects = data;
                } else {
                    console.error('Unexpected data format:', data);
                    projects = [];
                }
                
                renderTimeline();
                
                // Create the legend once
                createLegend();
                
                // If we have projects, zoom to fit them
                if (projects.length > 0) {
                    setTimeout(zoomToFit, 100);
                }
                
                // No unsaved changes after loading
                hasUnsavedChanges = false;
                updateUnsavedChangesIndicator();
            })
            .catch(error => {
                console.error('Error loading projects:', error);
                
                // Remove loading indicator
                if (projectsContainer) {
                    projectsContainer.innerHTML = '<div class="error">Error loading projects. Please try again later.</div>';
                }
                
                // Start with empty projects
                projects = [];
                renderTimeline();
                createLegend();
                
                // No unsaved changes after failed load
                hasUnsavedChanges = false;
                updateUnsavedChangesIndicator();
            });
    }
    
    // Export data to file
    function exportDataToFile() {
        const dataStr = JSON.stringify({ projects: projects, staff: staff }, null, 2);
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
                        // Keep the current staff list if the file doesn't include one
                        if (Array.isArray(loadedProjects.staff)) {
                            staff = normalizeStaff(loadedProjects.staff);
                        }
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
    
    // Staff and color mode
    colorModeToggleBtn.addEventListener('click', toggleColorMode);
    staffSettingsBtn.addEventListener('click', showStaffModal);
    staffAddForm.addEventListener('submit', addStaffMember);
    staffModalClose.addEventListener('click', () => {
        staffModal.style.display = 'none';
    });
    updateColorModeButton();
    
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === staffModal) {
            staffModal.style.display = 'none';
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', handleWindowResize);
    
    // Initialize app
    loadFromServer();
});
