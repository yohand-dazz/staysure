import { state } from '../state.js';
import { navigateTo, navigateBack } from '../app.js';

export function renderReveal() {
  const container = document.createElement('div');
  container.className = "fade-in";
  
  container.innerHTML = `
    <div style="text-align:center; padding: 24px 0;">
      <h1 style="color: var(--primary-color);">Good news — here's your estimated price</h1>
      
      <div style="background:var(--surface-color); border:2px solid var(--accent-color); border-radius:var(--radius-lg); padding:40px; margin: 32px 0; box-shadow: var(--shadow-md);">
         <div style="font-size: 3rem; font-weight:800; color:var(--primary-color); line-height: 1;">
            €${state.pricing.indicative_min} – €${state.pricing.indicative_max}
         </div>
         <p style="margin-top:16px;">Based on your trip to ${state.trip.destination_countries.join(', ')} for ${state.trip.num_travellers} traveller(s)</p>
      </div>

      <div class="info-banner" style="text-align:left;">
        <p>This may adjust slightly after a few health questions — most people see little or no change.</p>
      </div>
      
      <div class="actions" style="justify-content:center;">
        <button class="btn btn-primary" id="btn-next" style="width: 100%; font-size:1.1rem; padding: 18px;">Continue to confirm your price →</button>
      </div>
    </div>
  `;

  container.querySelector('#btn-next').addEventListener('click', () => {
    navigateTo('MEDICAL_PRECHECK');
  });

  return container;
}
