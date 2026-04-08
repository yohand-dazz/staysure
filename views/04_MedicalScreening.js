import { state } from '../state.js';
import { navigateTo, navigateBack } from '../app.js';

export function renderPreCheck() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>Help us cover you properly</h2>
    
    <div class="info-banner" style="background:#f0fdf4; border-color:var(--success-color); color:#166534!important;">
      <p style="color:#166534;">Over 90% of medical conditions are covered by Staysure. Declaring yours ensures your claim is protected.</p>
    </div>

    <p style="font-size:1.1rem; margin-top:24px; font-weight:600; color:var(--primary-color);">Do any travellers have pre-existing medical conditions?</p>
    
    <div class="card-grid">
      <div class="selectable-card" id="opt-yes">
        <span class="card-title">Yes</span>
      </div>
      <div class="selectable-card" id="opt-no">
        <span class="card-title">No, we're all fit and healthy</span>
        <span class="card-desc">Most conditions are covered. Being honest here protects your claim.</span>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', navigateBack);

  container.querySelector('#opt-yes').addEventListener('click', () => {
    state.medical.has_conditions = true;
    navigateTo('MEDICAL_SELECT_TRAVELLERS');
  });

  container.querySelector('#opt-no').addEventListener('click', () => {
    state.medical.has_conditions = false;
    navigateTo('POLICY_HOLDER_DETAILS'); // Skip medical entirely
  });

  return container;
}

export function renderSelectTravellers() {
  const container = document.createElement('div');
  
  let html = `
    <h2>Which travellers have medical conditions?</h2>
    <div class="radio-group">
  `;

  state.trip.travellers.forEach((tr, i) => {
    const isChecked = state.medical.travellers_with_conditions.includes(tr.id);
    html += `
      <label class="radio-label">
        <input type="checkbox" value="${tr.id}" class="tr-select" ${isChecked ? 'checked' : ''}>
        <span>Traveller ${i+1} (Age ${tr.age})</span>
      </label>
    `;
  });

  html += `
    </div>
    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next" disabled>Continue</button>
    </div>
  `;

  container.innerHTML = html;

  const checkboxes = container.querySelectorAll('.tr-select');
  const btnNext = container.querySelector('#btn-next');

  function checkValid() {
    let any = false;
    checkboxes.forEach(c => { if(c.checked) any = true; });
    btnNext.disabled = !any;
  }
  container.addEventListener('change', checkValid);
  checkValid();

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  btnNext.addEventListener('click', () => {
    state.medical.travellers_with_conditions = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
    
    // Initialize screening queue
    state.medical.screening_queue = [];
    state.medical.travellers_with_conditions.forEach(tId => {
      // For each traveller identified, they need to pick categories
      state.medical.screening_queue.push({ type: 'category_select', traveller_id: tId });
    });
    
    state.medical.current_queue_index = 0;
    processQueue();
  });

  return container;
}

// Medical Loop Queue Processor
function processQueue() {
  if (state.medical.current_queue_index >= state.medical.screening_queue.length) {
    // Done with screening
    assessOverallOutcome();
    return;
  }

  const task = state.medical.screening_queue[state.medical.current_queue_index];
  
  if (task.type === 'category_select') {
    navigateTo('MEDICAL_CONDITION_CATEGORY', false); // Render category selection
  } else if (task.type === 'questions') {
    navigateTo('MEDICAL_CONDITION_QUESTIONS', false); // Render questions for a specific condition
  }
}

export function renderConditionCategory() {
  const task = state.medical.screening_queue[state.medical.current_queue_index];
  const trIndex = state.trip.travellers.findIndex(t => t.id === task.traveller_id);
  
  const container = document.createElement('div');
  const tName = state.trip.travellers[trIndex].name || `Traveller ${trIndex+1}`;

  // Common condition mock data
  const conditionDB = [
    { name: "Asthma", category: "respiratory" },
    { name: "High Blood Pressure", category: "heart_circulation" },
    { name: "Heart Attack", category: "heart_circulation" },
    { name: "Type 1 Diabetes", category: "diabetes" },
    { name: "Type 2 Diabetes", category: "diabetes" },
    { name: "Arthritis", category: "musculoskeletal" },
    { name: "Cancer", category: "cancer" },
    { name: "Other unlisted condition", category: "other" }
  ];

  let selectedConditions = [];

  container.innerHTML = `
    <p style="font-weight:600; font-size:0.9rem; color:var(--text-muted); text-transform:uppercase;">Medical Details — Traveller ${trIndex+1}</p>
    <h2>What condition does ${tName} have?</h2>
    <p>Search and select conditions:</p>

    <div class="form-group autocomplete-wrapper">
      <input type="text" id="cond-search" placeholder="e.g. Asthma..." autocomplete="off">
      <div id="cond-dropdown" class="autocomplete-dropdown"></div>
    </div>
    
    <div id="selected-tags" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;"></div>

    <div id="error-msg" class="error-msg hidden">Please select at least one condition.</div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next" disabled>Next</button>
    </div>
  `;

  const searchInput = container.querySelector('#cond-search');
  const dropdown = container.querySelector('#cond-dropdown');
  const tagsContainer = container.querySelector('#selected-tags');
  const btnNext = container.querySelector('#btn-next');
  const errMsg = container.querySelector('#error-msg');

  function renderTags() {
    tagsContainer.innerHTML = '';
    selectedConditions.forEach(c => {
      const tag = document.createElement('div');
      tag.style.background = 'var(--primary-color)';
      tag.style.color = 'white';
      tag.style.padding = '8px 14px';
      tag.style.borderRadius = '20px';
      tag.style.fontSize = '0.9rem';
      tag.style.display = 'flex';
      tag.style.gap = '8px';
      tag.style.alignItems = 'center';
      
      tag.innerHTML = `<span>${c.name}</span> <span style="cursor:pointer; font-weight:bold;">&times;</span>`;
      tag.querySelector('span:last-child').addEventListener('click', () => {
         selectedConditions = selectedConditions.filter(x => x.name !== c.name);
         renderTags();
         btnNext.disabled = selectedConditions.length === 0;
      });
      tagsContainer.appendChild(tag);
    });
  }

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    dropdown.innerHTML = '';
    if (!val) {
      dropdown.classList.remove('active');
      return;
    }
    const matches = conditionDB.filter(d => d.name.toLowerCase().includes(val) && !selectedConditions.some(s => s.name === d.name));
    if (matches.length > 0) {
      dropdown.classList.add('active');
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = m.name;
        item.addEventListener('click', () => {
          selectedConditions.push(m);
          searchInput.value = '';
          dropdown.classList.remove('active');
          renderTags();
          btnNext.disabled = false;
        });
        dropdown.appendChild(item);
      });
    } else {
      dropdown.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active');
  });

  container.querySelector('#btn-back').addEventListener('click', navigateBack);

  btnNext.addEventListener('click', () => {
    if (selectedConditions.length === 0) {
       errMsg.classList.remove('hidden');
       return;
    }
    // We get unique categories
    const selectedCats = [...new Set(selectedConditions.map(c => c.category))];
    
    // Remove the 'category_select' task from this index, and insert 'questions' tasks for each category
    state.medical.screening_queue.splice(state.medical.current_queue_index, 1);
    
    const newTasks = selectedCats.map(cat => ({
      type: 'questions',
      traveller_id: task.traveller_id,
      category: cat,
      currentQuestion: 0
    }));
    
    state.medical.screening_queue.splice(state.medical.current_queue_index, 0, ...newTasks);
    
    import('../app.js').then(mod => {
       if (mod.showToast) mod.showToast('Conditions recorded');
    });

    processQueue(); // Re-evaluate queue
  });

  return container;
}

export function renderConditionQuestions() {
  const task = state.medical.screening_queue[state.medical.current_queue_index];
  const trIndex = state.trip.travellers.findIndex(t => t.id === task.traveller_id);

  // MOCK API data
  const mockQuestions = {
    'heart_circulation': [
      { text: "Have they ever had a heart attack?", type: "boolean" },
      { text: "When were they last seen by a cardiologist?", type: "date" }
    ],
    'default': [
      { text: `Are they taking medication for this ${task.category} condition?`, type: "boolean" },
      { text: "How many hospital admissions in the last 12 months?", type: "number" }
    ]
  };

  const qSet = mockQuestions[task.category] || mockQuestions['default'];
  const qObj = qSet[task.currentQuestion];

  const container = document.createElement('div');
  
  let inputHtml = '';
  if (qObj.type === 'boolean') {
    inputHtml = `
      <div class="radio-group">
        <label class="radio-label"><input type="radio" name="answer" value="yes"> <span>Yes</span></label>
        <label class="radio-label"><input type="radio" name="answer" value="no"> <span>No</span></label>
      </div>
    `;
  } else if (qObj.type === 'date') {
    inputHtml = `<div class="form-group"><input type="date" id="date-answer"></div>`;
  } else if (qObj.type === 'number') {
    inputHtml = `<div class="form-group"><input type="number" id="num-answer" min="0"></div>`;
  }

  container.innerHTML = `
    <p style="font-weight:600; font-size:0.9rem; color:var(--text-muted); text-transform:uppercase;">
      Question ${task.currentQuestion + 1} of ${qSet.length} — ${task.category.replace('_',' ')}
    </p>
    <h2>${qObj.text}</h2>
    ${inputHtml}

    <div class="actions">
      <button class="btn btn-primary" id="btn-next" style="width:100%;">Next</button>
    </div>
  `;

  // Validation logic
  const validateAndProceed = () => {
     let val = null;
     if(qObj.type === 'boolean') {
       const checked = container.querySelector('input[name="answer"]:checked');
       if(!checked) return alert("Please answer the question");
       val = checked.value;
     } else if (qObj.type === 'date') {
       val = container.querySelector('#date-answer').value;
       if(!val) return alert("Please select a date");
     } else if (qObj.type === 'number') {
       val = container.querySelector('#num-answer').value;
       if(val==="") return alert("Please enter a number");
     }

     // Store response mock (simulating API assessment)
     // Move to next question or complete category
     if (task.currentQuestion + 1 < qSet.length) {
       task.currentQuestion++;
       navigateTo('MEDICAL_CONDITION_QUESTIONS', false);
     } else {
       // Completed category, generate outcome
       generateMockOutcome(task.traveller_id, task.category, val);
       state.medical.current_queue_index++;
       processQueue();
     }
  };

  container.querySelector('#btn-next').addEventListener('click', validateAndProceed);
  
  if(qObj.type === 'boolean') {
    container.addEventListener('change', () => {
      container.querySelectorAll('.radio-label').forEach(el=>el.classList.remove('selected'));
      const active = container.querySelector('input[name="answer"]:checked');
      if(active) active.parentElement.classList.add('selected');
    });
  }

  return container;
}

function generateMockOutcome(tId, category, lastAnswer) {
  // Mock logic: randomly assign coverable, exclusion, or reject based on generic logic to simulate branching
  // If last answer is "yes" for something severe, exclude it.
  let outcome = 'coverable';
  let loading = 25.50;
  let text = '';
  
  if (category === 'heart_circulation' && lastAnswer === 'yes') {
    outcome = 'exclusion_only';
    text = "Any claims related to this cardiovascular condition will not be covered.";
  } else if (category === 'cancer') {
    outcome = 'not_coverable'; 
  }

  state.medical.condition_records.push({
    traveller_id: tId,
    category: category,
    outcome: outcome,
    loading_amount: outcome === 'coverable' ? loading : 0,
    exclusion_text: text
  });
}

function assessOverallOutcome() {
  // Check condition records for exclusions or rejections
  const exclusions = state.medical.condition_records.filter(r => r.outcome === 'exclusion_only' && !r.user_accepted_exclusion);
  const rejections = state.medical.condition_records.filter(r => r.outcome === 'not_coverable');

  if (rejections.length > 0) {
    // If ANY rejection exists, see if other travellers are ok
    const rejectedTravellerIds = new Set(rejections.map(r => r.traveller_id));
    
    // If it's a single traveller policy and they are rejected
    if (state.trip.num_travellers === 1 || rejectedTravellerIds.size === state.trip.num_travellers) {
      navigateTo('MEDICAL_REJECTED');
    } else {
      navigateTo('MEDICAL_EXCLUSION_OFFER'); // Offer to drop this traveller
    }
    return;
  }

  if (exclusions.length > 0) {
    // Need to show exclusion acceptance UI for the first unaccepted exclusion (simplified mock: we'll show just one generic for prototype)
    const ex = exclusions[0];
    const trIndex = state.trip.travellers.findIndex(t => t.id === ex.traveller_id);
    
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="exclusion-card">
        <h3>We can cover Traveller ${trIndex+1}, but not this condition.</h3>
        <p>${ex.exclusion_text}</p>
      </div>
      <div class="radio-group">
        <label class="radio-label"><input type="radio" name="accept" value="yes"> <span>I understand and accept this exclusion</span></label>
        <label class="radio-label"><input type="radio" name="accept" value="no"> <span>I do not accept — I don't want this policy</span></label>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="btn-next" disabled>Continue</button>
      </div>
    `;

    app.navigateTo('MEDICAL_CONDITION_QUESTIONS', false); // Dummy state reuse to show exclusion
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = ''; appContainer.appendChild(container);
    
    container.addEventListener('change', () => {
      container.querySelector('#btn-next').disabled = false;
    });

    container.querySelector('#btn-next').addEventListener('click', () => {
      if (container.querySelector('input[name="accept"]:checked').value === 'yes') {
        ex.user_accepted_exclusion = true;
        assessOverallOutcome(); // Check next exclusion or proceed
      } else {
        navigateTo('MEDICAL_REJECTED');
      }
    });
    return;
  }

  // All good, calculate final price and go to policyholder details
  let addedLoadings = state.medical.condition_records.reduce((acc, curr) => acc + curr.loading_amount, 0);
  state.pricing.final_price = state.pricing.indicative_min + addedLoadings;

  navigateTo('POLICY_HOLDER_DETAILS');
}
