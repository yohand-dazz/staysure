import { state, isEligible, getDisqualificationReason } from '../state.js';
import { navigateTo } from '../app.js';

export function renderGate() {
  const container = document.createElement('div');
  
  container.innerHTML = `
    <h1>Before we get started...</h1>
    <p>Let us check we can help you — this takes about 30 seconds.</p>

    <div class="form-group">
      <label>Has any traveller been advised by a doctor not to travel for medical reasons?</label>
      <div class="radio-group" id="q1-group">
        <label class="radio-label"><input type="radio" name="q1" value="yes"> <span>Yes</span></label>
        <label class="radio-label"><input type="radio" name="q1" value="no"> <span>No</span></label>
      </div>
    </div>

    <div class="form-group">
      <label>Is any traveller currently receiving palliative or terminal care (life expectancy under 12 months)?</label>
      <div class="radio-group" id="q2-group">
        <label class="radio-label"><input type="radio" name="q2" value="yes"> <span>Yes</span></label>
        <label class="radio-label"><input type="radio" name="q2" value="no"> <span>No</span></label>
      </div>
    </div>

    <div class="form-group">
      <label>Is any traveller currently on a waiting list for surgery or a hospital investigation?</label>
      <div class="radio-group" id="q3-group">
        <label class="radio-label"><input type="radio" name="q3" value="yes"> <span>Yes</span></label>
        <label class="radio-label"><input type="radio" name="q3" value="no"> <span>No</span></label>
      </div>
    </div>

    <div class="actions">
      <div></div>
      <button class="btn btn-primary" id="btn-submit" disabled>Check my eligibility</button>
    </div>
  `;

  const q1 = container.querySelectorAll('input[name="q1"]');
  const q2 = container.querySelectorAll('input[name="q2"]');
  const q3 = container.querySelectorAll('input[name="q3"]');
  const btn = container.querySelector('#btn-submit');

  function checkForm() {
    let q1Val = container.querySelector('input[name="q1"]:checked');
    let q2Val = container.querySelector('input[name="q2"]:checked');
    let q3Val = container.querySelector('input[name="q3"]:checked');

    // Update style
    container.querySelectorAll('.radio-label').forEach(el => el.classList.remove('selected'));
    if(q1Val) q1Val.closest('.radio-label').classList.add('selected');
    if(q2Val) q2Val.closest('.radio-label').classList.add('selected');
    if(q3Val) q3Val.closest('.radio-label').classList.add('selected');

    if(q1Val && q2Val && q3Val) {
      btn.disabled = false;
    }
  }

  container.addEventListener('change', checkForm);

  btn.addEventListener('click', () => {
    state.eligibility.advised_not_to_travel = container.querySelector('input[name="q1"]:checked').value === 'yes';
    state.eligibility.terminal_illness = container.querySelector('input[name="q2"]:checked').value === 'yes';
    state.eligibility.awaiting_surgery = container.querySelector('input[name="q3"]:checked').value === 'yes';

    if (isEligible()) {
      navigateTo('TRAVEL_COVER_TYPE');
    } else {
      navigateTo('DISQUALIFIED');
    }
  });

  // Pre-fill if any
  if (state.eligibility.advised_not_to_travel !== null) {
    const valQ1 = state.eligibility.advised_not_to_travel ? 'yes' : 'no';
    container.querySelector(`input[name="q1"][value="${valQ1}"]`).checked = true;
    
    const valQ2 = state.eligibility.terminal_illness ? 'yes' : 'no';
    container.querySelector(`input[name="q2"][value="${valQ2}"]`).checked = true;
    
    const valQ3 = state.eligibility.awaiting_surgery ? 'yes' : 'no';
    container.querySelector(`input[name="q3"][value="${valQ3}"]`).checked = true;
    checkForm();
  }

  return container;
}
