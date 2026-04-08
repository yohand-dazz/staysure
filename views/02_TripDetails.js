import { state } from '../state.js';
import { navigateTo, navigateBack } from '../app.js';

export function renderCoverType() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>Trip Details</h2>
    <p>What kind of cover do you need?</p>
    <div class="card-grid">
      <div class="selectable-card" data-val="single">
        <span class="card-title">Single Trip</span>
        <span class="card-desc">Cover for one trip</span>
      </div>
      <div class="selectable-card" data-val="annual">
        <span class="card-title">Annual Multi-trip</span>
        <span class="card-desc">Cover for multiple trips in a year</span>
      </div>
      <div class="selectable-card" data-val="backpacker">
        <span class="card-title">Backpacker</span>
        <span class="card-desc">Long-term travel cover</span>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next" disabled>Next</button>
    </div>
  `;

  const btnNext = container.querySelector('#btn-next');
  let selected = state.trip.cover_type;

  container.querySelectorAll('.selectable-card').forEach(card => {
    if(card.dataset.val === selected) {
      card.classList.add('selected');
      btnNext.disabled = false;
    }
    card.addEventListener('click', () => {
      container.querySelectorAll('.selectable-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selected = card.dataset.val;
      btnNext.disabled = false;
    });
  });

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  btnNext.addEventListener('click', () => {
    state.trip.cover_type = selected;
    navigateTo('TRAVEL_DESTINATION');
  });

  return container;
}

export function renderDestination() {
  const container = document.createElement('div');
  const destinations = [
    { name: "Spain", region: "europe", display: "Spain (Europe)" },
    { name: "Tenerife", region: "europe", display: "Tenerife, Spain (Europe)" },
    { name: "France", region: "europe", display: "France (Europe)" },
    { name: "United States", region: "wwnsa", display: "USA (Worldwide exc. USA/CAN/CAR)" },
    { name: "Australia", region: "wwnsa", display: "Australia (Worldwide exc. USA/CAN/CAR)" },
    { name: "Thailand", region: "ww", display: "Thailand (Worldwide)" },
    { name: "Europe (General)", region: "europe", display: "Europe Region" }
  ];

  container.innerHTML = `
    <h2>Where are you going?</h2>
    <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 24px;">Search for your primary country or region.</p>
    
    <div class="form-group autocomplete-wrapper">
      <label>Search Destination</label>
      <input type="text" id="dest-search" placeholder="e.g. Tenerife" value="${state.trip.destination_countries.join(', ') || state.trip.destination_region || ''}" autocomplete="off">
      <div id="dest-dropdown" class="autocomplete-dropdown"></div>
    </div>
    <div id="selected-region-text" style="font-size: 0.85rem; color: var(--accent-color); font-weight: 600; margin-top:-16px; margin-bottom: 24px;">
      ${state.trip.destination_region ? 'Region matched: ' + state.trip.destination_region.toUpperCase() : ''}
    </div>

    <div id="error-msg" class="error-msg hidden">Please select a destination from the list.</div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next</button>
    </div>
  `;

  const searchInput = container.querySelector('#dest-search');
  const dropdown = container.querySelector('#dest-dropdown');
  const regionText = container.querySelector('#selected-region-text');
  const btnNext = container.querySelector('#btn-next');
  const errMsg = container.querySelector('#error-msg');

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    dropdown.innerHTML = '';
    if (!val) {
      dropdown.classList.remove('active');
      return;
    }
    const matches = destinations.filter(d => d.display.toLowerCase().includes(val) || d.name.toLowerCase().includes(val));
    if (matches.length > 0) {
      dropdown.classList.add('active');
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = m.display;
        item.addEventListener('click', () => {
          searchInput.value = m.name;
          state.trip.destination_countries = [m.name];
          state.trip.destination_region = m.region;
          regionText.textContent = 'Region matched: ' + m.region.toUpperCase();
          dropdown.classList.remove('active');
          btnNext.disabled = false;
        });
        dropdown.appendChild(item);
      });
    } else {
      dropdown.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  if(!state.trip.destination_region) btnNext.disabled = true;

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  btnNext.addEventListener('click', () => {
    if(!state.trip.destination_region) {
       errMsg.classList.remove('hidden');
       return;
    }
    navigateTo('TRAVEL_DATES');
  });

  return container;
}

export function renderDates() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>When are you travelling?</h2>
    <div class="form-group">
      <label>Departure Date</label>
      <input type="date" id="depart" value="${state.trip.depart_date || ''}">
    </div>
    <div class="form-group">
      <label>Return Date</label>
      <input type="date" id="return" value="${state.trip.return_date || ''}">
    </div>
    <div id="error-msg" class="error-msg hidden"></div>
    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next</button>
    </div>
  `;

  const btnNext = container.querySelector('#btn-next');
  const departInput = container.querySelector('#depart');
  const returnInput = container.querySelector('#return');
  const errMsg = container.querySelector('#error-msg');

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  btnNext.addEventListener('click', () => {
    errMsg.classList.add('hidden');
    const dept = new Date(departInput.value);
    const ret = new Date(returnInput.value);

    if(!departInput.value || !returnInput.value) {
      errMsg.textContent = "Please provide both dates.";
      errMsg.classList.remove('hidden');
      return;
    }

    if (ret <= dept) {
      errMsg.textContent = "Return date must be after departure date.";
      errMsg.classList.remove('hidden');
      return;
    }

    state.trip.depart_date = departInput.value;
    state.trip.return_date = returnInput.value;
    navigateTo('TRAVEL_TRAVELLERS');
  });

  return container;
}

export function renderTravellers() {
  const container = document.createElement('div');
  
  // Base HTML
  container.innerHTML = `
    <h2>Who is travelling?</h2>
    
    <div class="card-grid card-grid-2" id="travel-type-cards">
      <div class="selectable-card ${state.trip.traveller_type === 'individual' ? 'selected' : ''}" data-val="individual"><span class="card-title">Individual</span></div>
      <div class="selectable-card ${state.trip.traveller_type === 'couple' ? 'selected' : ''}" data-val="couple"><span class="card-title">Couple</span></div>
      <div class="selectable-card ${state.trip.traveller_type === 'family' ? 'selected' : ''}" data-val="family"><span class="card-title">Family</span></div>
      <div class="selectable-card ${state.trip.traveller_type === 'group' ? 'selected' : ''}" data-val="group"><span class="card-title">Group</span></div>
    </div>

    <div class="form-group" style="margin-top:24px;">
      <label>Number of travellers</label>
      <div class="stepper-control">
        <button class="stepper-btn" id="btn-minus">-</button>
        <span id="num-travellers" style="font-weight:700;font-size:1.5rem;color:var(--primary-color)">${state.trip.num_travellers}</span>
        <button class="stepper-btn" id="btn-plus">+</button>
      </div>
    </div>

    <div id="travellers-list"></div>

    <div class="form-group" style="margin-top: 32px; border-top: 1px solid var(--border-color); padding-top:24px;">
      <label>Email address</label>
      <input type="email" id="email" placeholder="name@example.com" value="${state.trip.quote_email}">
      <p style="font-size: 0.85rem; margin-top:8px;">We'll save your progress so you can come back if needed.</p>
    </div>

    <div id="error-msg" class="error-msg hidden"></div>
    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next</button>
    </div>
  `;

  const list = container.querySelector('#travellers-list');
  const numSpan = container.querySelector('#num-travellers');
  const emailInput = container.querySelector('#email');
  const errMsg = container.querySelector('#error-msg');

  // Handle travel type cards
  const typeCards = container.querySelectorAll('.selectable-card');
  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.trip.traveller_type = card.dataset.val;

      // Smart defaults based on type
      if (state.trip.traveller_type === 'individual' && state.trip.num_travellers !== 1) {
        state.trip.num_travellers = 1;
        state.trip.travellers = [state.trip.travellers[0]];
      } else if (state.trip.traveller_type === 'couple' && state.trip.num_travellers !== 2) {
        state.trip.num_travellers = 2;
        while(state.trip.travellers.length < 2) state.trip.travellers.push({ id:'t'+(state.trip.travellers.length+1), name: '', age: null, relationship: 'partner' });
        state.trip.travellers = state.trip.travellers.slice(0, 2);
      }
      numSpan.textContent = state.trip.num_travellers;
      renderList();
    });
  });

  function renderList() {
    list.innerHTML = '';
    state.trip.travellers.forEach((tr, i) => {
      const trDiv = document.createElement('div');
      trDiv.className = 'form-group';
      trDiv.style.background = "var(--surface-solid)";
      trDiv.style.padding = "20px";
      trDiv.style.borderRadius = "var(--radius-lg)";
      trDiv.style.border = "1.5px solid var(--border-color)";
      trDiv.style.marginBottom = "24px";
      trDiv.style.boxShadow = "var(--shadow-sm)";

      trDiv.innerHTML = `
        <h3 style="margin-bottom:16px; font-size:1.1rem;">Traveller ${i + 1}</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
           <div style="grid-column: span 2;">
              <label style="font-size:0.85rem">Name (optional, for reference)</label>
              <input type="text" class="t-name" data-idx="${i}" value="${tr.name || ''}" placeholder="e.g. John">
           </div>
           <div>
              <label style="font-size:0.85rem">Age (Years)</label>
              <input type="number" class="t-age" data-idx="${i}" value="${tr.age || ''}" placeholder="0-89">
           </div>
           <div>
              <label style="font-size:0.85rem">Relationship</label>
              <select class="t-role" data-idx="${i}">
                 <option value="self" ${tr.relationship === 'self' ? 'selected' : ''}>Self (Policyholder)</option>
                 <option value="partner" ${tr.relationship === 'partner' ? 'selected' : ''}>Partner</option>
                 <option value="child" ${tr.relationship === 'child' ? 'selected' : ''}>Child</option>
                 <option value="other" ${tr.relationship === 'other' ? 'selected' : ''}>Other</option>
              </select>
           </div>
        </div>
      `;
      list.appendChild(trDiv);
    });
  }

  container.querySelector('#btn-minus').addEventListener('click', () => {
    if(state.trip.num_travellers > 1) {
      state.trip.num_travellers--;
      state.trip.travellers.pop();
      numSpan.textContent = state.trip.num_travellers;
      renderList();
    }
  });

  container.querySelector('#btn-plus').addEventListener('click', () => {
    if(state.trip.num_travellers < 10) {
      state.trip.num_travellers++;
      state.trip.travellers.push({ id:'t'+state.trip.num_travellers, name: '', age: null, relationship: 'other' });
      numSpan.textContent = state.trip.num_travellers;
      renderList();
    }
  });

  renderList();

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  container.querySelector('#btn-next').addEventListener('click', () => {
    errMsg.classList.add('hidden');
    let valid = true;
    
    // Check ages and save data
    const ageInputs = container.querySelectorAll('.t-age');
    const nameInputs = container.querySelectorAll('.t-name');
    const roleInputs = container.querySelectorAll('.t-role');

    ageInputs.forEach((input, i) => {
      const age = parseInt(input.value);
      if(isNaN(age) || age < 0 || age > 89) {
        valid = false;
        if(age > 89) {
           errMsg.textContent = "Unfortunately we can't provide cover online for travellers over 89. Please call us.";
        } else {
           errMsg.textContent = "Please enter valid ages for all travellers (0-89).";
        }
      } else {
        state.trip.travellers[i].age = age;
        state.trip.travellers[i].name = nameInputs[i].value.trim();
        state.trip.travellers[i].relationship = roleInputs[i].value;
      }
    });

    if(!valid) {
      errMsg.classList.remove('hidden');
      return;
    }

    if(!emailInput.value.includes('@')) {
      errMsg.textContent = "Please provide a valid email address.";
      errMsg.classList.remove('hidden');
      return;
    }
    
    state.trip.quote_email = emailInput.value;
    navigateTo('TRAVEL_EXTRAS');
  });

  return container;
}

export function renderExtras() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>Trip Extras</h2>
    <p>Enhance your cover with add-ons.</p>
    
    <div class="form-group">
      <label class="radio-label" style="justify-content: space-between;">
        <div><strong>Cruise Cover</strong><br><span style="font-size:0.85rem">Travelling on a cruise?</span></div>
        <input type="checkbox" id="cruise" ${state.trip.add_ons.cruise ? 'checked' : ''}>
      </label>
    </div>
    
    <div class="form-group">
      <label class="radio-label" style="justify-content: space-between;">
        <div><strong>Winter Sports</strong><br><span style="font-size:0.85rem">Skiing, snowboarding or other winter activities?</span></div>
        <input type="checkbox" id="winter" ${state.trip.add_ons.winter_sports ? 'checked' : ''}>
      </label>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next: See My Price</button>
    </div>
  `;

  const chkCruise = container.querySelector('#cruise');
  const chkwinter = container.querySelector('#winter');

  const updatePrice = () => {
    state.trip.add_ons.cruise = chkCruise.checked;
    state.trip.add_ons.winter_sports = chkwinter.checked;
    if (window.updateStickyPriceDisplay) window.updateStickyPriceDisplay();
  };

  chkCruise.addEventListener('change', updatePrice);
  chkwinter.addEventListener('change', updatePrice);

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  container.querySelector('#btn-next').addEventListener('click', () => {
    state.trip.add_ons.cruise = chkCruise.checked;
    state.trip.add_ons.winter_sports = chkwinter.checked;
    
    // SIMULATING API CALL FOR INDICATIVE PRICE HERE!
    setTimeout(() => {
       import('../state.js').then(mod => {
           mod.generateIndicativePrice();
           navigateTo('VALUE_REVEAL');
       });
    }, 400); // simulate tiny network delay
  });

  return container;
}
