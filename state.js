// Central State Store
export const state = {
  quote_id: "QT-" + Math.random().toString(36).substr(2, 9),
  current_state: "ELIGIBILITY_CHECK", // Tracks architecture state name
  current_section: 0, // 0: Pre, 1: Trip, 2: Price, 3: Health, 4: Purch
  
  eligibility: {
    advised_not_to_travel: null,
    terminal_illness: null,
    awaiting_surgery: null
  },
  
  trip: {
    cover_type: null, // 'single', 'annual', 'backpacker'
    destination_region: null,
    destination_countries: [],
    depart_date: null,
    return_date: null,
    traveller_type: null,
    num_travellers: 1,
    travellers: [ { id: 't1', name: '', age: null, relationship: 'self' } ],
    quote_email: '',
    add_ons: { cruise: false, winter_sports: false, high_value_items: false }
  },

  pricing: {
    indicative_min: 0,
    indicative_max: 0,
    final_price: 0
  },

  medical: {
    has_conditions: null,
    travellers_with_conditions: [],
    condition_records: [], // list of ConditionRecord
    screening_queue: [], // runtime queue for 9b questions
    current_queue_index: 0
  },

  policyholder: {
    first_name: '', last_name: '', dob: null, email: '', phone: '',
    address: { line1: '', city: '', county: '', eircode: '' }
  },

  consents: { t_and_c: false, accuracy: false }
};

// Utilities to validate state
export function isEligible() {
  const e = state.eligibility;
  if(e.advised_not_to_travel || e.terminal_illness || e.awaiting_surgery) return false;
  return true;
}

export function getDisqualificationReason() {
  const e = state.eligibility;
  if(e.advised_not_to_travel) return "One of your travellers has been advised not to travel by their doctor.";
  if(e.terminal_illness) return "One of your travellers is currently receiving terminal care.";
  if(e.awaiting_surgery) return "One of your travellers is awaiting a medical procedure.";
  return "Unable to provide cover.";
}

export function getNextTravellerId() {
  return 't' + (state.trip.travellers.length + 1);
}

export function generateIndicativePrice() {
  // Simple heuristic for mock
  let base = 75;
  if (state.trip.cover_type === 'annual') base += 50;
  if (state.trip.num_travellers > 1) base += 35 * (state.trip.num_travellers - 1);
  if (state.trip.add_ons.cruise) base += 40;
  if (state.trip.add_ons.winter_sports) base += 30;
  
  state.pricing.indicative_min = base;
  state.pricing.indicative_max = base + 35;
}
