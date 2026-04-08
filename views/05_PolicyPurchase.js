import { state } from '../state.js';
import { navigateTo, navigateBack } from '../app.js';

export function renderPolicyholder() {
  const container = document.createElement('div');
  
  // Pre-populate logic
  const selfTraveller = state.trip.travellers.find(t => t.relationship === 'self');
  let fNameInput = '';
  let lNameInput = '';
  let dobInput = '';
  let prefillBanner = '';

  if (selfTraveller && (selfTraveller.name || selfTraveller.age !== null)) {
    if (selfTraveller.name) {
      const parts = selfTraveller.name.trim().split(' ');
      fNameInput = parts[0];
      lNameInput = parts.slice(1).join(' ');
    }
    
    if (selfTraveller.age !== null) {
      // Create a dummy DOB based on age since we ONLY collected age earlier
      const birthYear = new Date().getFullYear() - selfTraveller.age;
      dobInput = `${birthYear}-01-01`; 
    }

    prefillBanner = `
      <div class="info-banner" style="padding: 16px; margin-bottom: 24px;">
        <p style="font-size:0.9rem;">We've pre-filled some of your details from your traveller information. Please confirm they are correct.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <h2>Who is buying the policy?</h2>
    ${prefillBanner}
    
    <div class="form-group">
      <label>First name</label>
      <input type="text" id="fname" value="${fNameInput}">
    </div>
    <div class="form-group">
      <label>Last name</label>
      <input type="text" id="lname" value="${lNameInput}">
    </div>
    <div class="form-group">
      <label>Date of birth</label>
      <input type="date" id="dob" value="${dobInput}">
    </div>
    <div class="form-group">
      <label>Email address</label>
      <input type="email" id="ph-email" value="${state.trip.quote_email}">
    </div>
    <div class="form-group">
      <label>Phone number</label>
      <input type="text" id="phone" value="+353891234567">
    </div>
    <h3 style="margin-top: 32px; margin-bottom: 16px;">Address</h3>
    <div style="display:flex; gap:16px; align-items:flex-end; margin-bottom: 24px;">
      <div class="form-group" style="margin-bottom:0; flex-grow:1;">
        <label>Eircode</label>
        <input type="text" id="eircode" placeholder="e.g. D01 AB12">
      </div>
      <button class="btn btn-secondary" id="btn-eircode" style="padding: 16px 24px; white-space: nowrap;">Find Address</button>
    </div>

    <div class="form-group">
      <label>Address line 1</label>
      <input type="text" id="addr1">
    </div>
    <div class="form-group">
      <label>Town / City</label>
      <input type="text" id="city">
    </div>
    <div class="form-group">
      <label>County</label>
      <select id="county">
        <option value="">Select County...</option>
        <option value="Dublin">Dublin</option>
        <option value="Cork">Cork</option>
        <option value="Galway">Galway</option>
      </select>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next</button>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', navigateBack);

  container.querySelector('#btn-eircode').addEventListener('click', () => {
    const code = container.querySelector('#eircode').value.trim();
    if(code) {
       container.querySelector('#addr1').value = "42 Mocking Lane";
       container.querySelector('#city').value = "Dublin";
       container.querySelector('#county').value = "Dublin";
       import('../app.js').then(m => {
          if (m.showToast) m.showToast("Address found");
       });
    }
  });

  container.querySelector('#btn-next').addEventListener('click', () => {
    // Basic validation mock
    state.policyholder.first_name = container.querySelector('#fname').value;
    state.policyholder.email = container.querySelector('#ph-email').value;
    navigateTo('COVER_SUMMARY');
  });

  return container;
}

export function renderSummary() {
  const container = document.createElement('div');
  
  // Calculate final
  let total = state.pricing.final_price || state.pricing.indicative_min;
  let basePrice = state.pricing.indicative_min;
  let loadings = state.medical.condition_records.reduce((acc, curr) => acc + curr.loading_amount, 0);

  // If price changed significantly from estimate
  let priceChangeWarn = '';
  if(total > state.pricing.indicative_max) {
      priceChangeWarn = `
        <div class="exclusion-card" style="background:#fffbeb; border-color:#fef08a; margin-top:24px;">
           <h3 style="color:#b45309">Your price has changed from the estimate</h3>
           <p style="color:#92400e">Based on your health details, an additional premium was applied.</p>
        </div>
      `;
  }

  container.innerHTML = `
    <h2>Your Cover Summary</h2>
    
    <div style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:24px; margin-bottom:24px; box-shadow:var(--shadow-sm);">
       <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span>Base price:</span> <span>€${basePrice.toFixed(2)}</span></div>
       <div style="display:flex; justify-content:space-between; margin-bottom:12px; color:var(--text-muted);"><span>Medical loading:</span> <span>+€${loadings.toFixed(2)}</span></div>
       <hr style="border:none; border-top:1px solid var(--border-color); margin:16px 0;">
       <div style="display:flex; justify-content:space-between; font-weight:700; font-size:1.2rem; color:var(--primary-color);"><span>Total:</span> <span>€${total.toFixed(2)}</span></div>
    </div>
    
    ${priceChangeWarn}

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Buy now — €${total.toFixed(2)}</button>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  container.querySelector('#btn-next').addEventListener('click', () => {
    navigateTo('CHECKOUT');
  });

  return container;
}

export function renderCheckout() {
  const container = document.createElement('div');
  const total = state.pricing.final_price || state.pricing.indicative_min;

  container.innerHTML = `
    <h2>Payment details</h2>
    
    <div style="background:var(--surface-color); padding: 24px; border:1px solid var(--border-color); border-radius:var(--radius-md); margin-bottom: 32px;">
      <div class="form-group">
        <label>Card number</label>
        <input type="text" placeholder="XXXX XXXX XXXX XXXX">
      </div>
      <div style="display:flex; gap:16px;">
         <div class="form-group" style="flex:1;">
           <label>Expiry</label>
           <input type="text" placeholder="MM/YY">
         </div>
         <div class="form-group" style="flex:1;">
           <label>CVV</label>
           <input type="text" placeholder="123">
         </div>
      </div>
      <div class="form-group">
        <label>Name on card</label>
        <input type="text" value="${state.policyholder.first_name} ${state.policyholder.last_name}">
      </div>
    </div>

    <div class="form-group">
      <label class="radio-label"><input type="checkbox" id="tc"> <span>I have read and agree to the Policy Terms & Conditions</span></label>
    </div>
    <div class="form-group">
      <label class="radio-label"><input type="checkbox" id="acc"> <span>I confirm the information I have provided is accurate and complete</span></label>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next" disabled>Complete purchase — €${total.toFixed(2)}</button>
    </div>
  `;

  const btnNext = container.querySelector('#btn-next');
  const tc = container.querySelector('#tc');
  const acc = container.querySelector('#acc');

  function checkValid() {
    btnNext.disabled = !(tc.checked && acc.checked);
  }
  container.addEventListener('change', checkValid);

  container.querySelector('#btn-back').addEventListener('click', navigateBack);
  btnNext.addEventListener('click', () => {
    // API mock success
    navigateTo('COMPLETE', false);
  });

  return container;
}

export function renderComplete() {
  const container = document.createElement('div');
  container.style.textAlign = 'center';
  container.style.padding = '40px 0';
  
  container.innerHTML = `
    <div style="font-size:4rem; margin-bottom:24px;">🎉</div>
    <h1 style="color:var(--success-color);">You're covered!</h1>
    <p>Your policy number is: <strong style="color:var(--primary-color);">SIE-2026-X8B9K2</strong></p>
    <p>A confirmation email has been sent to ${state.policyholder.email}</p>

    <div class="actions" style="justify-content:center; flex-direction:column; gap:16px; margin-top:40px;">
       <button class="btn btn-primary" style="width:100%;">Download policy documents</button>
       <button class="btn btn-secondary" style="width:100%;" onclick="location.reload()">Return to homepage</button>
    </div>
  `;

  return container;
}
