// Variables globales
let courses = JSON.parse(localStorage.getItem('courses')) || [];
let editingCourseId = null;

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
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
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
    qs('#professor').value = course.professor || '';
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
  
  const groupHTML = `
    <div class="group-container" data-group-index="${index}">
      <div class="group-header">
        <div class="group-title">Grupo <span class="group-code-display">${groupCode}</span></div>
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

      <div class="sessions-section">
        <div class="section-label">Horarios de teoría</div>
        <div class="theory-sessions">
          ${groupData && groupData.theorySessions && groupData.theorySessions.length > 0 
            ? groupData.theorySessions.map(session => createSessionHTML(session)).join('')
            : createSessionHTML()
          }
        </div>
        <button type="button" class="btn-add" data-type="theory-session">
          + Añadir otro horario de teoría
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
            : createLabGroupHTML()
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
}

function createSessionHTML(session = null) {
  const day = session ? session.day : 'Lunes';
  const start = session ? session.start : '08:00';
  const end = session ? session.end : '09:40';
  
  return `
    <div class="session-row">
      <select class="select day-select">
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

      <div class="lab-sessions">
        ${sessions.map(session => createSessionHTML(session)).join('')}
      </div>
      
      <button type="button" class="btn-add" data-type="lab-session">
        + Añadir otro horario para este lab
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
    theorySessions.insertAdjacentHTML('beforeend', createSessionHTML());
    attachSessionEventListeners(groupElement);
  });
  
  // Toggle laboratorios
  const toggleLabsBtn = groupElement.querySelector('.btn-add[data-type="toggle-labs"]');
  const labsContainer = groupElement.querySelector('.labs-container');
  toggleLabsBtn.addEventListener('click', () => {
    if (labsContainer.style.display === 'none') {
      labsContainer.style.display = 'block';
      toggleLabsBtn.textContent = '- Ocultar laboratorios';
    } else {
      labsContainer.style.display = 'none';
      toggleLabsBtn.textContent = '+ Añadir laboratorios';
    }
  });
  
  // Event listeners para laboratorios
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
    labSessions.insertAdjacentHTML('beforeend', createSessionHTML());
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
    // Horarios de teoría
    group.theorySessions.forEach(session => {
      const dayCol = qsa('.day-col').find(col => col.dataset.day === session.day);
      if (!dayCol) return;
      
      const block = document.createElement('div');
      block.className = 'course';
      block.style.background = course.color;
      block.dataset.courseId = course.id;
      
      const startMin = toMinutes(session.start);
      const endMin = toMinutes(session.end);
      const topOffset = ((startMin - BASE_HOUR * 60) / 60) * ROW_HEIGHT;
      const height = ((endMin - startMin) / 60) * ROW_HEIGHT;
      
      block.style.top = `${topOffset + 2}px`;
      block.style.height = `${Math.max(height - 4, 44)}px`;
      
      let content = `
        <div class="group">${group.code}</div>
        <div class="name">${escapeHTML(course.name)}</div>
        <div class="time">${session.start} - ${session.end}</div>
      `;
      
      if (course.professor) {
        content += `<div class="professor">${escapeHTML(course.professor)}</div>`;
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
      
      dayCol.appendChild(block);
    });
    
    // Laboratorios
    if (group.labGroups && group.labGroups.length > 0) {
      group.labGroups.forEach(labGroup => {
        labGroup.sessions.forEach(session => {
          const dayCol = qsa('.day-col').find(col => col.dataset.day === session.day);
          if (!dayCol) return;
          
          const block = document.createElement('div');
          block.className = 'course';
          block.style.background = course.color;
          block.dataset.courseId = course.id;
          
          const startMin = toMinutes(session.start);
          const endMin = toMinutes(session.end);
          const topOffset = ((startMin - BASE_HOUR * 60) / 60) * ROW_HEIGHT;
          const height = ((endMin - startMin) / 60) * ROW_HEIGHT;
          
          block.style.top = `${topOffset + 2}px`;
          block.style.height = `${Math.max(height - 4, 44)}px`;
          
          block.innerHTML = `
            <div class="group">${group.code} - ${labGroup.code}</div>
            <div class="name">${escapeHTML(course.name)} (Lab)</div>
            <div class="time">${session.start} - ${session.end}</div>
            ${course.professor ? `<div class="professor">${escapeHTML(course.professor)}</div>` : ''}
          `;
          
          // Click para editar
          block.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseToEdit = courses.find(c => c.id === course.id);
            if (courseToEdit) {
              openModal(courseToEdit);
            }
          });
          
          dayCol.appendChild(block);
        });
      });
    }
  });
}

function collectFormData() {
  const courseName = qs('#courseName').value.trim();
  const professor = qs('#professor').value.trim();
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
    
    // Recoger horarios de teoría
    const theorySessions = [];
    const theoryRows = container.querySelectorAll('.theory-sessions .session-row');
    
    for (const row of theoryRows) {
      const day = row.querySelector('.day-select').value;
      const start = row.querySelectorAll('.time-input')[0].value;
      const end = row.querySelectorAll('.time-input')[1].value;
      
      // Validar horario
      if (start && end && toMinutes(end) > toMinutes(start)) {
        theorySessions.push({ day, start, end });
      }
    }
    
    if (theorySessions.length === 0) {
      alert(`El grupo ${groupCode} debe tener al menos un horario de teoría válido.`);
      return null;
    }
    
    // Recoger laboratorios
    const labGroups = [];
    const labContainers = container.querySelectorAll('.lab-group');
    
    for (const labContainer of labContainers) {
      const labCode = labContainer.querySelector('.lab-group-select').value;
      
      const labSessions = [];
      const labRows = labContainer.querySelectorAll('.lab-sessions .session-row');
      
      for (const row of labRows) {
        const day = row.querySelector('.day-select').value;
        const start = row.querySelectorAll('.time-input')[0].value;
        const end = row.querySelectorAll('.time-input')[1].value;
        
        if (start && end && toMinutes(end) > toMinutes(start)) {
          labSessions.push({ day, start, end });
        }
      }
      
      if (labSessions.length > 0) {
        labGroups.push({
          code: labCode,
          sessions: labSessions
        });
      }
    }
    
    theoryGroups.push({
      code: groupCode,
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
    professor,
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
  }
  
  saveCourses();
  renderCourses();
}

function deleteCourse(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este curso?')) {
    courses = courses.filter(course => course.id !== id);
    saveCourses();
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

// Inicialización
function init() {
  // Renderizar cursos existentes
  renderCourses();
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', init);