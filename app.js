import { state } from './state.js';
import * as ViewEligibility from './views/01_Eligibility.js';
import * as ViewTripDetails from './views/02_TripDetails.js';
import * as ViewValueReveal from './views/03_ValueReveal.js';
import * as ViewMedical from './views/04_MedicalScreening.js';
import * as ViewPurchase from './views/05_PolicyPurchase.js';
import * as ViewExits from './views/06_ExitPaths.js';

// Elements
const appContainer = document.getElementById('app-container');
const mainHeader = document.getElementById('main-header');
const progressWrapper = document.getElementById('progress-wrapper');
const progressContainer = document.getElementById('progress-container');
const stickyBanner = document.getElementById('sticky-price-banner');
const persistentPrice = document.getElementById('persistent-price');

// Route Map
const routes = {
  'ELIGIBILITY_CHECK': ViewEligibility.renderGate,
  'DISQUALIFIED': ViewExits.renderPathA,
  'TRAVEL_COVER_TYPE': ViewTripDetails.renderCoverType,
  'TRAVEL_DESTINATION': ViewTripDetails.renderDestination,
  'TRAVEL_DATES': ViewTripDetails.renderDates,
  'TRAVEL_TRAVELLERS': ViewTripDetails.renderTravellers,
  'TRAVEL_EXTRAS': ViewTripDetails.renderExtras,
  'VALUE_REVEAL': ViewValueReveal.renderReveal,
  'MEDICAL_PRECHECK': ViewMedical.renderPreCheck,
  'MEDICAL_SELECT_TRAVELLERS': ViewMedical.renderSelectTravellers,
  'MEDICAL_CONDITION_CATEGORY': ViewMedical.renderConditionCategory,
  'MEDICAL_CONDITION_QUESTIONS': ViewMedical.renderConditionQuestions,
  'MEDICAL_EXCLUSION_OFFER': ViewExits.renderPathB1,
  'MEDICAL_REJECTED': ViewExits.renderPathB2,
  'POLICY_HOLDER_DETAILS': ViewPurchase.renderPolicyholder,
  'COVER_SUMMARY': ViewPurchase.renderSummary,
  'CHECKOUT': ViewPurchase.renderCheckout,
  'COMPLETE': ViewPurchase.renderComplete
};

// History Stack for Back navigation
const history = [];

// Main Navigation Function
export function navigateTo(newState, saveHistory = true) {
  if (saveHistory && state.current_state) {
    history.push(state.current_state);
    showToast('✓ Auto-saved'); // Trigger auto-save toast on forward progress
  }
  state.current_state = newState;
  renderRoute();
  updateChrome();
  window.scrollTo(0,0);
}

export function navigateBack() {
  if (history.length > 0) {
    const prev = history.pop();
    state.current_state = prev;
    renderRoute();
    updateChrome();
  }
}

function renderRoute() {
  appContainer.innerHTML = '';
  // Force reflow for fade-in animation
  appContainer.classList.remove('fade-in');
  void appContainer.offsetWidth;
  appContainer.classList.add('fade-enter-active');
  setTimeout(() => {
     appContainer.classList.remove('fade-enter-active');
  }, 400);
  
  const renderFn = routes[state.current_state];
  if (renderFn) {
    const node = renderFn();
    if(node) appContainer.appendChild(node);
  } else {
    appContainer.innerHTML = '<h2>404 - State Not Found</h2>';
  }
}

function updateChrome() {
  // Update progress bar
  const sectionMap = {
    'ELIGIBILITY_CHECK': 0, 'DISQUALIFIED': -1,
    'TRAVEL_COVER_TYPE': 1, 'TRAVEL_DESTINATION': 1, 'TRAVEL_DATES': 1, 'TRAVEL_TRAVELLERS': 1, 'TRAVEL_EXTRAS': 1,
    'VALUE_REVEAL': 2,
    'MEDICAL_PRECHECK': 3, 'MEDICAL_SELECT_TRAVELLERS': 3, 'MEDICAL_CONDITION_CATEGORY': 3, 'MEDICAL_CONDITION_QUESTIONS': 3,
    'MEDICAL_EXCLUSION_OFFER': -1, 'MEDICAL_REJECTED': -1,
    'POLICY_HOLDER_DETAILS': 4, 'COVER_SUMMARY': 4, 'CHECKOUT': 4, 'COMPLETE': 5
  };
  
  const currentSec = sectionMap[state.current_state] || 0;
  state.current_section = currentSec;

  if (currentSec <= 0 || currentSec === 5) {
    progressWrapper.classList.add('hidden');
  } else {
    progressWrapper.classList.remove('hidden');
    renderProgress(currentSec);
  }

  // Update sticky banner
  if (currentSec >= 2 || state.current_state === 'TRAVEL_EXTRAS') {
    stickyBanner.classList.remove('hidden');
    if (window.updateStickyPriceDisplay) {
       // Call global method to refresh smoothly
       if(state.current_state === 'TRAVEL_EXTRAS') window.updateStickyPriceDisplay();
       else persistentPrice.textContent = `€${state.pricing.base_price + state.pricing.medical_loading} - €${state.pricing.base_price + state.pricing.medical_loading + 35}`;
    } else {
       persistentPrice.textContent = `€${state.pricing.base_price + state.pricing.medical_loading} - €${state.pricing.base_price + state.pricing.medical_loading + 35}`;
    }
  } else {
    stickyBanner.classList.add('hidden');
  }
}

function renderProgress(currentSec) {
  progressContainer.innerHTML = '';
  const sections = ['Trip Details', 'Your Price', 'Health Details', 'Purchase'];
  
  sections.forEach((name, i) => {
    const stepNum = i + 1;
    const isDone = currentSec > stepNum;
    const isActive = currentSec === stepNum;
    
    let cls = 'progress-item';
    if(isActive) cls += ' active';
    if(isDone) cls += ' done';

    const item = document.createElement('div');
    item.className = cls;
    
    const icon = isDone 
      ? '<span class="icon-check">✓</span>' 
      : `<span class="step-num">${stepNum}</span>`;

    item.innerHTML = `
      <div class="step-indicator">${icon}</div>
      <span class="label">${name}</span>
    `;
    progressContainer.appendChild(item);

    // Add connector line if not the last item
    if (i < sections.length - 1) {
      const line = document.createElement('div');
      line.className = 'progress-line' + (isDone ? ' done' : '');
      progressContainer.appendChild(line);
    }
  });
}

// Modal Handlers
const btnWhatsIncluded = document.getElementById('btn-whats-included');
const whatsIncludedModal = document.getElementById('whats-included-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

if (btnWhatsIncluded && whatsIncludedModal && closeModalBtn) {
  btnWhatsIncluded.addEventListener('click', () => whatsIncludedModal.classList.remove('hidden'));
  closeModalBtn.addEventListener('click', () => whatsIncludedModal.classList.add('hidden'));
  whatsIncludedModal.addEventListener('click', (e) => {
    if(e.target === whatsIncludedModal) whatsIncludedModal.classList.add('hidden');
  });
}

// Global Toast System
export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Global scope export for testing/dev
window.updateStickyPriceDisplay = function() {
  if (!state) return;
  // Make sure base price is updated
  import('./state.js').then(module => {
     module.updateBasePrice();
     const persistentPrice = document.getElementById('persistent-price');
     const p = state.pricing.base_price + state.pricing.medical_loading;
     
     // add little pop animation
     persistentPrice.style.transform = 'scale(1.1)';
     persistentPrice.style.color = 'var(--success-color)';
     setTimeout(() => {
        persistentPrice.style.transform = 'scale(1)';
        persistentPrice.style.color = '';
     }, 300);

     persistentPrice.textContent = `€${p} - €${p + 35}`;
  });
};

window.app = { state, navigateTo, navigateBack, showToast, updateStickyPriceDisplay };

// Init
navigateTo('ELIGIBILITY_CHECK', false);
