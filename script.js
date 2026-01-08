// Variables globales
let courses = JSON.parse(localStorage.getItem('courses')) || [];
let visibilityState = JSON.parse(localStorage.getItem('visibilityState')) || {};
let editingCourseId = null;
let highlightedConflicts = [];

// Elementos DOM
const modalBackdrop = document.getElementById('modalBackdrop');
const openModalBtn = document.getElementById('openModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelModalBtn = document.getElementById('cancelModal');
const form = document.getElementById('courseForm');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');
const deleteCourseBtn = document.getElementById('deleteCourse');
const courseIdInput = document.getElementById('courseId');
const theoryGroupsContainer = document.getElementById('theoryGroupsContainer');
const addGroupBtn = document.getElementById('addGroupBtn');
const coursesList = document.getElementById('coursesList');
const emptyState = document.getElementById('emptyState');
const visibleSessionsCount = document.getElementById('visibleSessionsCount');
const totalSessionsCount = document.getElementById('totalSessionsCount');
const conflictAlert = document.getElementById('conflictAlert');
const conflictCount = document.getElementById('conflictCount');
const showAllBtn = document.getElementById('showAllBtn');
const hideAllBtn = document.getElementById('hideAllBtn');

// Helper functions
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatTimeRange(start, end) {
  return `${start} - ${end}`;
}

function getGroupKey(courseId, groupType, groupCode, isLab = false) {
  return `${courseId}_${isLab ? 'lab_' : ''}${groupCode}`;
}

// Funciones de visibilidad
function isGroupVisible(courseId, groupType, groupCode, isLab = false) {
  const key = getGroupKey(courseId, groupType, groupCode, isLab);
  return visibilityState[key] !== false; // Por defecto visible
}

function setGroupVisibility(courseId, groupType, groupCode, isLab, visible) {
  const key = getGroupKey(courseId, groupType, groupCode, isLab);
  visibilityState[key] = visible;
  localStorage.setItem('visibilityState', JSON.stringify(visibilityState));
}

function showAllGroups() {
  courses.forEach(course => {
    course.theoryGroups.forEach(group => {
      setGroupVisibility(course.id, 'theory', group.code, false, true);
      
      if (group.labGroups) {
        group.labGroups.forEach(lab => {
          setGroupVisibility(course.id, 'lab', lab.code, true, true);
        });
      }
    });
  });
  renderSidebar();
  renderCourses();
}

function hideAllGroups() {
  courses.forEach(course => {
    course.theoryGroups.forEach(group => {
      setGroupVisibility(course.id, 'theory', group.code, false, false);
      
      if (group.labGroups) {
        group.labGroups.forEach(lab => {
          setGroupVisibility(course.id, 'lab', lab.code, true, false);
        });
      }
    });
  });
  renderSidebar();
  renderCourses();
}

// Funciones de interfaz
function openModal(course = null) {
  if (course) {
    // Modo edición
    modalTitle.textContent = 'Editar curso';
    submitBtn.textContent = 'Guardar';
    deleteCourseBtn.style.display = 'block';
    editingCourseId = course.id;
    courseIdInput.value = course.id;
    
    // Llenar datos básicos
    qs('#courseName').value = course.name;
    qs('#courseColor').value = course.color;
    
    // Limpiar grupos existentes
    theoryGroupsContainer.innerHTML = '';
    
    // Crear grupos
    course.theoryGroups.forEach((group, index) => {
      addGroupContainer(group, index);
    });
    
  } else {
    // Modo nuevo
    modalTitle.textContent = 'Añadir curso';
    submitBtn.textContent = 'Guardar curso';
    deleteCourseBtn.style.display = 'none';
    editingCourseId = null;
    courseIdInput.value = '';
    
    // Limpiar formulario
    form.reset();
    qs('#courseColor').value = '#4f46e5';
    
    // Limpiar grupos y añadir uno por defecto
    theoryGroupsContainer.innerHTML = '';
    addGroupContainer();
  }
  
  modalBackdrop.style.display = 'flex';
}

function closeModal() {
  modalBackdrop.style.display = 'none';
}

// Funciones para manejar grupos
function addGroupContainer(groupData = null, index = 0) {
  const groupCode = groupData ? groupData.code : '01Q';
  const professor = groupData ? groupData.professor : '';
  
  const groupHTML = `
    <div class="group-container" data-group-index="${index}">
      <div class="group-header">
        <div class="group-title">Grupo Horario <span class="group-code-display">${groupCode}</span></div>
      </div>
      
      <div class="field">
        <label class="label">Grupo de teoría</label>
        <select class="select group-select" data-group-type="theory">
          <option value="01Q" ${groupCode === '01Q' ? 'selected' : ''}>01Q</option>
          <option value="02Q" ${groupCode === '02Q' ? 'selected' : ''}>02Q</option>
          <option value="03Q" ${groupCode === '03Q' ? 'selected' : ''}>03Q</option>
          <option value="04Q" ${groupCode === '04Q' ? 'selected' : ''}>04Q</option>
        </select>
      </div>

      <div class="field">
        <label class="label">Profesor de teoría (opcional)</label>
        <input class="input professor-input" type="text" placeholder="Ej. Lic. Huamanizzz" value="${professor || ''}" />
      </div>

      <div class="sessions-section">
        <div class="section-label">Horarios de teoría</div>
        <div class="theory-sessions">
          ${groupData && groupData.theorySessions && groupData.theorySessions.length > 0 
            ? groupData.theorySessions.map(session => createSessionHTML(session)).join('')
            : createEmptySessionHTML()
          }
        </div>
        <button type="button" class="btn-add" data-type="theory-session">
          + Añadir horario de teoría
        </button>
      </div>

      <div class="labs-section">
        <div class="section-label">Laboratorios (opcional)</div>
        <button type="button" class="btn-add" data-type="toggle-labs">
          + Añadir laboratorios
        </button>
        
        <div class="labs-container" style="display: ${groupData && groupData.labGroups && groupData.labGroups.length > 0 ? 'block' : 'none'}">
          ${groupData && groupData.labGroups && groupData.labGroups.length > 0
            ? groupData.labGroups.map(labGroup => createLabGroupHTML(labGroup)).join('')
            : ''
          }
        </div>
      </div>
    </div>
  `;
  
  theoryGroupsContainer.insertAdjacentHTML('beforeend', groupHTML);
  
  // Event listeners para este grupo
  const groupElement = theoryGroupsContainer.lastElementChild;
  
  // Actualizar título cuando cambia el select
  const groupSelect = groupElement.querySelector('.group-select');
  const groupCodeDisplay = groupElement.querySelector('.group-code-display');
  groupSelect.addEventListener('change', (e) => {
    groupCodeDisplay.textContent = e.target.value;
  });
  
  // Botones añadir
  setupGroupEventListeners(groupElement);
  
  // Event listeners para sesiones existentes
  attachSessionEventListeners(groupElement);
  
  // Si estamos editando y hay laboratorios, cambiar texto del botón
  if (groupData && groupData.labGroups && groupData.labGroups.length > 0) {
    const toggleLabsBtn = groupElement.querySelector('.btn-add[data-type="toggle-labs"]');
    toggleLabsBtn.textContent = '- Ocultar laboratorios';
  }
}

function createEmptySessionHTML() {
  return `
    <div class="session-row">
      <select class="select day-select">
        <option value="">Seleccionar día...</option>
        <option value="Lunes">Lunes</option>
        <option value="Martes">Martes</option>
        <option value="Miércoles">Miércoles</option>
        <option value="Jueves">Jueves</option>
        <option value="Viernes">Viernes</option>
        <option value="Sábado">Sábado</option>
        <option value="Domingo">Domingo</option>
      </select>
      <div class="time-inputs">
        <input type="time" class="input time-input" value="" min="08:00" max="22:00" step="300">
        <span class="time-separator">-</span>
        <input type="time" class="input time-input" value="" min="08:30" max="22:00" step="300">
      </div>
      <button type="button" class="btn-remove" title="Eliminar">×</button>
    </div>
  `;
}

function createSessionHTML(session = null) {
  const day = session ? session.day : '';
  const start = session ? session.start : '';
  const end = session ? session.end : '';
  
  return `
    <div class="session-row">
      <select class="select day-select">
        <option value="" ${!day ? 'selected' : ''}>Seleccionar día...</option>
        <option value="Lunes" ${day === 'Lunes' ? 'selected' : ''}>Lunes</option>
        <option value="Martes" ${day === 'Martes' ? 'selected' : ''}>Martes</option>
        <option value="Miércoles" ${day === 'Miércoles' ? 'selected' : ''}>Miércoles</option>
        <option value="Jueves" ${day === 'Jueves' ? 'selected' : ''}>Jueves</option>
        <option value="Viernes" ${day === 'Viernes' ? 'selected' : ''}>Viernes</option>
        <option value="Sábado" ${day === 'Sábado' ? 'selected' : ''}>Sábado</option>
        <option value="Domingo" ${day === 'Domingo' ? 'selected' : ''}>Domingo</option>
      </select>
      <div class="time-inputs">
        <input type="time" class="input time-input" value="${start}" min="08:00" max="22:00" step="300">
        <span class="time-separator">-</span>
        <input type="time" class="input time-input" value="${end}" min="08:30" max="22:00" step="300">
      </div>
      <button type="button" class="btn-remove" title="Eliminar">×</button>
    </div>
  `;
}

function createLabGroupHTML(labGroup = null) {
  const labCode = labGroup ? labGroup.code : '90G';
  const labProfessor = labGroup ? labGroup.professor : '';
  const sessions = labGroup ? labGroup.sessions : [null];
  
  return `
    <div class="lab-group">
      <div class="field">
        <label class="label">Grupo de laboratorio</label>
        <select class="select lab-group-select">
          <option value="90G" ${labCode === '90G' ? 'selected' : ''}>90G</option>
          <option value="91G" ${labCode === '91G' ? 'selected' : ''}>91G</option>
          <option value="92G" ${labCode === '92G' ? 'selected' : ''}>92G</option>
          <option value="93G" ${labCode === '93G' ? 'selected' : ''}>93G</option>
          <option value="94G" ${labCode === '94G' ? 'selected' : ''}>94G</option>
          <option value="95G" ${labCode === '95G' ? 'selected' : ''}>95G</option>
        </select>
      </div>

      <div class="field">
        <label class="label">Profesor de laboratorio (opcional)</label>
        <input class="input lab-professor-input" type="text" placeholder="Ej. Prof. Bellidozzz" value="${labProfessor || ''}" />
      </div>

      <div class="lab-sessions">
        ${sessions.map(session => createSessionHTML(session)).join('')}
      </div>
      
      <button type="button" class="btn-add" data-type="lab-session">
        + Añadir horario para este lab
      </button>
      
      <div class="lab-group-actions">
        <button type="button" class="btn-add" data-type="lab-group">
          + Añadir otro grupo de laboratorio
        </button>
      </div>
    </div>
  `;
}

function setupGroupEventListeners(groupElement) {
  // Añadir sesión de teoría
  const addTheoryBtn = groupElement.querySelector('.btn-add[data-type="theory-session"]');
  addTheoryBtn.addEventListener('click', () => {
    const theorySessions = groupElement.querySelector('.theory-sessions');
    theorySessions.insertAdjacentHTML('beforeend', createEmptySessionHTML());
    attachSessionEventListeners(groupElement);
  });
  
  // Toggle laboratorios
  const toggleLabsBtn = groupElement.querySelector('.btn-add[data-type="toggle-labs"]');
  const labsContainer = groupElement.querySelector('.labs-container');
  toggleLabsBtn.addEventListener('click', () => {
    if (labsContainer.style.display === 'none') {
      labsContainer.style.display = 'block';
      toggleLabsBtn.textContent = '- Ocultar laboratorios';
      
      // Si no hay laboratorios, crear uno vacío
      if (labsContainer.children.length === 0) {
        labsContainer.insertAdjacentHTML('beforeend', createLabGroupHTML());
        const newLabGroup = labsContainer.lastElementChild;
        setupLabEventListeners(newLabGroup, groupElement);
      }
    } else {
      labsContainer.style.display = 'none';
      toggleLabsBtn.textContent = '+ Añadir laboratorios';
    }
  });
  
  // Event listeners para laboratorios existentes
  const labGroup = groupElement.querySelector('.lab-group');
  if (labGroup) {
    setupLabEventListeners(labGroup, groupElement);
  }
}

function setupLabEventListeners(labGroupElement, parentGroupElement) {
  // Añadir sesión de lab
  const addLabSessionBtn = labGroupElement.querySelector('.btn-add[data-type="lab-session"]');
  addLabSessionBtn.addEventListener('click', () => {
    const labSessions = labGroupElement.querySelector('.lab-sessions');
    labSessions.insertAdjacentHTML('beforeend', createEmptySessionHTML());
    attachSessionEventListeners(parentGroupElement);
  });
  
  // Añadir otro grupo de lab
  const addLabGroupBtn = labGroupElement.querySelector('.btn-add[data-type="lab-group"]');
  addLabGroupBtn.addEventListener('click', () => {
    const labsContainer = parentGroupElement.querySelector('.labs-container');
    labsContainer.insertAdjacentHTML('beforeend', createLabGroupHTML());
    
    // Setup listeners para el nuevo grupo de lab
    const newLabGroup = labsContainer.lastElementChild;
    setupLabEventListeners(newLabGroup, parentGroupElement);
  });
}

function attachSessionEventListeners(groupElement) {
  // Eliminar sesión
  groupElement.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sessionRow = e.target.closest('.session-row');
      const sessionsContainer = sessionRow.parentElement;
      
      // Solo eliminar si hay más de una sesión
      if (sessionsContainer.children.length > 1) {
        sessionRow.remove();
      }
    });
  });
}

// Funciones para el sidebar
function renderSidebar() {
  if (courses.length === 0) {
    emptyState.style.display = 'block';
    coursesList.innerHTML = '';
    return;
  }
  
  emptyState.style.display = 'none';
  
  let totalSessions = 0;
  let visibleSessions = 0;
  
  const coursesHTML = courses.map(course => {
    const courseGroupsHTML = course.theoryGroups.map(group => {
      // Calcular sesiones del grupo teórico
      const theorySessions = group.theorySessions || [];
      const theoryVisible = isGroupVisible(course.id, 'theory', group.code, false);
      
      // Calcular sesiones de laboratorios
      let labSessions = 0;
      let visibleLabSessions = 0;
      let labGroupsHTML = '';
      
      if (group.labGroups && group.labGroups.length > 0) {
        labGroupsHTML = group.labGroups.map(lab => {
          const labSessionCount = lab.sessions ? lab.sessions.length : 0;
          const labVisible = isGroupVisible(course.id, 'lab', lab.code, true);
          
          labSessions += labSessionCount;
          if (labVisible) visibleLabSessions += labSessionCount;
          
          return renderLabGroupHTML(course, group, lab, labVisible);
        }).join('');
      }
      
      const groupSessionCount = theorySessions.length + labSessions;
      const groupVisibleSessions = (theoryVisible ? theorySessions.length : 0) + visibleLabSessions;
      
      totalSessions += groupSessionCount;
      visibleSessions += groupVisibleSessions;
      
      return renderTheoryGroupHTML(course, group, theoryVisible, groupVisibleSessions, groupSessionCount, labGroupsHTML);
    }).join('');
    
    return `
      <div class="course-item" data-course-id="${course.id}">
        <div class="course-item-header" data-course-id="${course.id}">
          <div class="course-color-dot" style="background-color: ${course.color}"></div>
          <div class="course-item-title">${escapeHTML(course.name)}</div>
          <div class="course-item-arrow">▸</div>
        </div>
        <div class="course-item-content">
          ${courseGroupsHTML}
        </div>
      </div>
    `;
  }).join('');
  
  coursesList.innerHTML = coursesHTML;
  
  // Actualizar contadores
  totalSessionsCount.textContent = totalSessions;
  visibleSessionsCount.textContent = visibleSessions;
  
  // Añadir event listeners
  setupSidebarEventListeners();
  
  // Verificar conflictos
  checkForConflicts();
}

function renderTheoryGroupHTML(course, group, isVisible, visibleSessions, totalSessions, labGroupsHTML) {
  const sessionsHTML = (group.theorySessions || []).map(session => `
    <div class="session-item">
      <div class="session-day">${session.day}</div>
      <div class="session-time">${formatTimeRange(session.start, session.end)}</div>
    </div>
    ${group.professor ? `<div class="session-professor">${escapeHTML(group.professor)}</div>` : ''}
  `).join('');
  
  return `
    <div class="course-group" data-course-id="${course.id}" data-group-code="${group.code}" data-is-lab="false">
      <div class="course-group-header">
        <div class="course-group-type">Teoría</div>
        <div class="course-group-code">${group.code}</div>
        <div class="course-group-visibility ${isVisible ? 'visible' : ''}" 
             data-course-id="${course.id}" 
             data-group-code="${group.code}" 
             data-is-lab="false">
        </div>
      </div>
      <div class="course-group-sessions">
        ${sessionsHTML}
      </div>
      ${labGroupsHTML}
    </div>
  `;
}

function renderLabGroupHTML(course, parentGroup, lab, isVisible) {
  const sessionsHTML = (lab.sessions || []).map(session => `
    <div class="session-item">
      <div class="session-day">${session.day}</div>
      <div class="session-time">${formatTimeRange(session.start, session.end)}</div>
    </div>
    ${lab.professor ? `<div class="session-professor">${escapeHTML(lab.professor)}</div>` : ''}
  `).join('');
  
  return `
    <div class="course-group" data-course-id="${course.id}" data-group-code="${lab.code}" data-is-lab="true">
      <div class="course-group-header">
        <div class="course-group-type lab">Lab</div>
        <div class="course-group-code">${lab.code}</div>
        <div class="course-group-visibility ${isVisible ? 'visible' : ''}" 
             data-course-id="${course.id}" 
             data-group-code="${lab.code}" 
             data-is-lab="true">
        </div>
      </div>
      <div class="course-group-sessions">
        ${sessionsHTML}
      </div>
    </div>
  `;
}

function setupSidebarEventListeners() {
  // Expansión/colapso de cursos
  qsa('.course-item-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('expanded');
    });
  });
  
  // Checkboxes de visibilidad
  qsa('.course-group-visibility').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = checkbox.dataset.courseId;
      const groupCode = checkbox.dataset.groupCode;
      const isLab = checkbox.dataset.isLab === 'true';
      
      const currentlyVisible = checkbox.classList.contains('visible');
      const newVisibility = !currentlyVisible;
      
      // Actualizar estado
      setGroupVisibility(courseId, isLab ? 'lab' : 'theory', groupCode, isLab, newVisibility);
      
      // Actualizar UI
      checkbox.classList.toggle('visible', newVisibility);
      
      // Re-renderizar horario
      renderCourses();
      
      // Actualizar contadores
      updateSessionCounters();
      
      // Verificar conflictos
      checkForConflicts();
    });
  });
  
  // Alerta de conflictos
  conflictAlert.addEventListener('click', () => {
    highlightConflicts();
  });
}

function updateSessionCounters() {
  let totalSessions = 0;
  let visibleSessions = 0;
  
  courses.forEach(course => {
    course.theoryGroups.forEach(group => {
      // Sesiones de teoría
      const theorySessions = group.theorySessions || [];
      const theoryVisible = isGroupVisible(course.id, 'theory', group.code, false);
      
      // Sesiones de laboratorio
      let labSessions = 0;
      let visibleLabSessions = 0;
      
      if (group.labGroups && group.labGroups.length > 0) {
        group.labGroups.forEach(lab => {
          const labSessionCount = lab.sessions ? lab.sessions.length : 0;
          const labVisible = isGroupVisible(course.id, 'lab', lab.code, true);
          
          labSessions += labSessionCount;
          if (labVisible) visibleLabSessions += labSessionCount;
        });
      }
      
      totalSessions += theorySessions.length + labSessions;
      visibleSessions += (theoryVisible ? theorySessions.length : 0) + visibleLabSessions;
    });
  });
  
  totalSessionsCount.textContent = totalSessions;
  visibleSessionsCount.textContent = visibleSessions;
}

// Detección de conflictos
function checkForConflicts() {
  const visibleSessions = [];
  const conflicts = [];
  
  // Recolectar todas las sesiones visibles
  courses.forEach(course => {
    course.theoryGroups.forEach(group => {
      // Verificar si el grupo teórico está visible
      if (isGroupVisible(course.id, 'theory', group.code, false)) {
        (group.theorySessions || []).forEach(session => {
          visibleSessions.push({
            courseId: course.id,
            groupCode: group.code,
            courseName: course.name,
            courseColor: course.color,
            isLab: false,
            ...session,
            startMin: toMinutes(session.start),
            endMin: toMinutes(session.end)
          });
        });
      }
      
      // Verificar laboratorios visibles
      if (group.labGroups) {
        group.labGroups.forEach(lab => {
          if (isGroupVisible(course.id, 'lab', lab.code, true)) {
            (lab.sessions || []).forEach(session => {
              visibleSessions.push({
                courseId: course.id,
                groupCode: lab.code,
                courseName: course.name,
                courseColor: course.color,
                isLab: true,
                ...session,
                startMin: toMinutes(session.start),
                endMin: toMinutes(session.end)
              });
            });
          }
        });
      }
    });
  });
  
  // Buscar conflictos
  for (let i = 0; i < visibleSessions.length; i++) {
    for (let j = i + 1; j < visibleSessions.length; j++) {
      const s1 = visibleSessions[i];
      const s2 = visibleSessions[j];
      
      // Mismo día y se superponen
      if (s1.day === s2.day && 
          s1.startMin < s2.endMin && 
          s2.startMin < s1.endMin) {
        
        conflicts.push({
          session1: s1,
          session2: s2,
          day: s1.day,
          overlapStart: Math.max(s1.startMin, s2.startMin),
          overlapEnd: Math.min(s1.endMin, s2.endMin)
        });
      }
    }
  }
  
  // Actualizar alerta de conflictos
  if (conflicts.length > 0) {
    conflictCount.textContent = conflicts.length;
    conflictAlert.style.display = 'flex';
  } else {
    conflictAlert.style.display = 'none';
  }
  
  highlightedConflicts = conflicts;
  
  return conflicts;
}

function highlightConflicts() {
  // Primero, quitar cualquier resaltado anterior
  qsa('.course.conflict').forEach(course => {
    course.classList.remove('conflict');
  });
  
  if (highlightedConflicts.length === 0) return;
  
  // Resaltar los bloques en conflicto
  highlightedConflicts.forEach(conflict => {
    const { session1, session2 } = conflict;
    
    // Encontrar y resaltar los bloques del horario
    qsa('.course').forEach(courseBlock => {
      const courseId = courseBlock.dataset.courseId;
      const blockText = courseBlock.textContent;
      
      if ((courseId === session1.courseId && blockText.includes(session1.groupCode)) ||
          (courseId === session2.courseId && blockText.includes(session2.groupCode))) {
        courseBlock.classList.add('conflict');
      }
    });
  });
  
  // Hacer scroll al primer conflicto
  const firstConflict = qs('.course.conflict');
  if (firstConflict) {
    firstConflict.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Funciones de cursos
function saveCourses() {
  localStorage.setItem('courses', JSON.stringify(courses));
}

function renderCourses() {
  // Limpiar cursos existentes
  qsa('.course').forEach(course => course.remove());
  
  // Renderizar cada curso
  courses.forEach(course => {
    renderCourse(course);
  });
}

function renderCourse(course) {
  const ROW_HEIGHT = 60;
  const BASE_HOUR = 8;
  
  // Renderizar grupos de teoría
  course.theoryGroups.forEach(group => {
    const groupProfessor = group.professor || '';
    const isTheoryVisible = isGroupVisible(course.id, 'theory', group.code, false);
    
    // Horarios de teoría (solo si está visible)
    if (isTheoryVisible) {
      group.theorySessions.forEach(session => {
        const dayCol = qsa('.day-col').find(col => col.dataset.day === session.day);
        if (!dayCol) return;
        
        const block = createCourseBlock(course, group, session, groupProfessor, false);
        positionCourseBlock(block, session, ROW_HEIGHT, BASE_HOUR);
        dayCol.appendChild(block);
      });
    }
    
    // Laboratorios
    if (group.labGroups && group.labGroups.length > 0) {
      group.labGroups.forEach(labGroup => {
        const labProfessor = labGroup.professor || '';
        const isLabVisible = isGroupVisible(course.id, 'lab', labGroup.code, true);
        
        if (isLabVisible) {
          labGroup.sessions.forEach(session => {
            const dayCol = qsa('.day-col').find(col => col.dataset.day === session.day);
            if (!dayCol) return;
            
            const block = createCourseBlock(course, labGroup, session, labProfessor || groupProfessor, true);
            positionCourseBlock(block, session, ROW_HEIGHT, BASE_HOUR);
            dayCol.appendChild(block);
          });
        }
      });
    }
  });
}

function createCourseBlock(course, group, session, professor, isLab) {
  const block = document.createElement('div');
  block.className = 'course';
  block.style.background = course.color;
  block.dataset.courseId = course.id;
  
  let content = `
    <div class="group">${group.code}${isLab ? ' (Lab)' : ''}</div>
    <div class="name">${escapeHTML(course.name)}</div>
    <div class="time">${session.start} - ${session.end}</div>
  `;
  
  if (professor) {
    content += `<div class="professor">${escapeHTML(professor)}</div>`;
  }
  
  block.innerHTML = content;
  
  // Click para editar
  block.addEventListener('click', (e) => {
    e.stopPropagation();
    const courseToEdit = courses.find(c => c.id === course.id);
    if (courseToEdit) {
      openModal(courseToEdit);
    }
  });
  
  return block;
}

function positionCourseBlock(block, session, ROW_HEIGHT, BASE_HOUR) {
  const startMin = toMinutes(session.start);
  const endMin = toMinutes(session.end);
  const topOffset = ((startMin - BASE_HOUR * 60) / 60) * ROW_HEIGHT;
  const height = ((endMin - startMin) / 60) * ROW_HEIGHT;
  
  block.style.top = `${topOffset + 2}px`;
  block.style.height = `${Math.max(height - 4, 44)}px`;
}

function collectFormData() {
  const courseName = qs('#courseName').value.trim();
  const color = qs('#courseColor').value;
  
  if (!courseName) {
    alert('Por favor, ingresa el nombre del curso.');
    return null;
  }
  
  // Recoger grupos
  const theoryGroups = [];
  const groupContainers = theoryGroupsContainer.querySelectorAll('.group-container');
  
  for (const container of groupContainers) {
    const groupCode = container.querySelector('.group-select').value;
    const professor = container.querySelector('.professor-input').value.trim();
    
    // Recoger horarios de teoría
    const theorySessions = [];
    const theoryRows = container.querySelectorAll('.theory-sessions .session-row');
    
    for (const row of theoryRows) {
      const day = row.querySelector('.day-select').value;
      const start = row.querySelectorAll('.time-input')[0].value;
      const end = row.querySelectorAll('.time-input')[1].value;
      
      // Validar que todos los campos estén completos
      if (day && start && end && toMinutes(end) > toMinutes(start)) {
        theorySessions.push({ day, start, end });
      } else if (day || start || end) {
        // Si algún campo está parcialmente lleno, mostrar error
        alert(`Por favor, completa todos los campos del horario de teoría para el grupo ${groupCode}.`);
        return null;
      }
    }
    
    if (theorySessions.length === 0) {
      alert(`El grupo ${groupCode} debe tener al menos un horario de teoría completo.`);
      return null;
    }
    
    // Recoger laboratorios
    const labGroups = [];
    const labContainers = container.querySelectorAll('.lab-group');
    
    for (const labContainer of labContainers) {
      const labCode = labContainer.querySelector('.lab-group-select').value;
      const labProfessor = labContainer.querySelector('.lab-professor-input').value.trim();
      
      const labSessions = [];
      const labRows = labContainer.querySelectorAll('.lab-sessions .session-row');
      
      for (const row of labRows) {
        const day = row.querySelector('.select').value;
        const start = row.querySelectorAll('.time-input')[0].value;
        const end = row.querySelectorAll('.time-input')[1].value;
        
        if (day && start && end && toMinutes(end) > toMinutes(start)) {
          labSessions.push({ day, start, end });
        } else if (day || start || end) {
          // Si algún campo está parcialmente lleno, mostrar error
          alert(`Por favor, completa todos los campos del horario de laboratorio ${labCode}.`);
          return null;
        }
      }
      
      if (labSessions.length > 0) {
        labGroups.push({
          code: labCode,
          professor: labProfessor,
          sessions: labSessions
        });
      }
    }
    
    theoryGroups.push({
      code: groupCode,
      professor: professor,
      theorySessions,
      labGroups
    });
  }
  
  if (theoryGroups.length === 0) {
    alert('Debe haber al menos un grupo horario.');
    return null;
  }
  
  return {
    name: courseName,
    color,
    theoryGroups
  };
}

function addOrUpdateCourse(courseData) {
  if (editingCourseId) {
    // Actualizar
    const index = courses.findIndex(c => c.id === editingCourseId);
    if (index !== -1) {
      courseData.id = editingCourseId;
      courses[index] = courseData;
    }
  } else {
    // Nuevo curso
    courseData.id = generateId();
    courses.push(courseData);
    
    // Por defecto, hacer visibles todos los grupos del nuevo curso
    courseData.theoryGroups.forEach(group => {
      setGroupVisibility(courseData.id, 'theory', group.code, false, true);
      
      if (group.labGroups) {
        group.labGroups.forEach(lab => {
          setGroupVisibility(courseData.id, 'lab', lab.code, true, true);
        });
      }
    });
  }
  
  saveCourses();
  renderSidebar();
  renderCourses();
}

function deleteCourse(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este curso?')) {
    // Eliminar estados de visibilidad relacionados
    Object.keys(visibilityState).forEach(key => {
      if (key.startsWith(id + '_')) {
        delete visibilityState[key];
      }
    });
    
    courses = courses.filter(course => course.id !== id);
    saveCourses();
    localStorage.setItem('visibilityState', JSON.stringify(visibilityState));
    renderSidebar();
    renderCourses();
    closeModal();
  }
}

// Event Listeners
openModalBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// Botón añadir otro grupo horario
addGroupBtn.addEventListener('click', () => {
  const groupCount = theoryGroupsContainer.querySelectorAll('.group-container').length;
  addGroupContainer(null, groupCount);
});

// Botón eliminar curso
deleteCourseBtn.addEventListener('click', () => {
  if (editingCourseId) {
    deleteCourse(editingCourseId);
  }
});

// Submit del formulario
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const courseData = collectFormData();
  if (courseData) {
    addOrUpdateCourse(courseData);
    closeModal();
  }
});

// Botones globales de visibilidad
showAllBtn.addEventListener('click', showAllGroups);
hideAllBtn.addEventListener('click', hideAllGroups);

// Inicialización
function init() {
  // Renderizar cursos existentes
  renderSidebar();
  renderCourses();
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', init);
