import { getDisqualificationReason } from '../state.js';

export function renderPathA() {
  const container = document.createElement('div');
  const reason = getDisqualificationReason();

  container.innerHTML = `
    <div style="text-align:center; padding:40px 0;">
      <h1 style="font-size:1.8rem;">Unfortunately, we're not the right insurer for this trip</h1>
      <p style="margin-top:24px;">Based on your answers, we're unable to provide travel insurance cover for this trip. This is because <strong>${reason}</strong></p>
      <p>This doesn't mean you can't travel — specialist insurers may be able to help.</p>

      <div class="actions" style="flex-direction:column; gap:16px; margin-top:40px;">
        <button class="btn btn-primary">Find a specialist insurer →</button>
        <button class="btn btn-secondary" onclick="location.reload()">Return to start</button>
      </div>
      
      <p style="font-size:0.85rem; margin-top:32px;">If your circumstances change, we'd be happy to help you in the future.</p>
    </div>
  `;
  return container;
}

export function renderPathB1() {
  const container = document.createElement('div');
  // Mock partial offer
  container.innerHTML = `
    <div style="text-align:center; padding:40px 0;">
      <h1 style="font-size:1.8rem;">We can't cover one of your travellers, but here's what we can do</h1>
      <p style="margin-top:24px;">We're unable to include one traveller on this policy due to their condition. However, we can still cover the remaining travellers on your trip.</p>

      <div style="background:var(--surface-color); border:1px solid var(--border-color); padding:24px; border-radius:var(--radius-md); margin-bottom:32px;">
         <p style="margin:0; font-weight:600; color:var(--primary-color);">Adjusted New Price: €85.00</p>
      </div>

      <div class="actions" style="flex-direction:column; gap:16px;">
        <button class="btn btn-primary" id="btn-accept">Continue with adjusted policy →</button>
        <button class="btn btn-secondary" id="btn-decline">I don't want this — exit</button>
      </div>
    </div>
  `;

  container.querySelector('#btn-accept').addEventListener('click', () => {
    import('../app.js').then(mod => mod.navigateTo('POLICY_HOLDER_DETAILS'));
  });

  container.querySelector('#btn-decline').addEventListener('click', () => {
    import('../app.js').then(mod => mod.navigateTo('MEDICAL_REJECTED'));
  });

  return container;
}

export function renderPathB2() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="text-align:center; padding:40px 0;">
      <h1 style="font-size:1.8rem;">We're unable to provide cover for this trip</h1>
      <p style="margin-top:24px;">Unfortunately, we can't provide travel insurance cover for this trip based on the health information provided.</p>
      <p>Specialist travel insurers may be able to help — they work with people who have a wider range of medical conditions.</p>

      <div class="actions" style="flex-direction:column; gap:16px; margin-top:40px;">
        <button class="btn btn-primary">Find a specialist insurer →</button>
        <button class="btn btn-secondary" onclick="location.reload()">Return to homepage</button>
      </div>
    </div>
  `;
  return container;
}
