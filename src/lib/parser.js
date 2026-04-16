/**
 * Smart Parser for Banking Alerts (SMS/Email)
 * Extracts Amount, Merchant, and Suggests Category.
 */

const MERCHANT_MAP = {
  // Food
  'swiggy': 'Food',
  'zomato': 'Food',
  'starbucks': 'Food',
  'blinkit': 'Food',
  'zepto': 'Food',
  'mcdonalds': 'Food',
  'kfc': 'Food',
  'domino': 'Food',
  'restaurant': 'Dining',
  'coffee': 'Food',
  'dineout': 'Dining',
  
  // Transport
  'uber': 'Transport',
  'ola': 'Transport',
  'rapido': 'Transport',
  'irctc': 'Transport',
  'indigo': 'Transport',
  'air india': 'Transport',
  'makemytrip': 'Transport',
  'cleartrip': 'Transport',
  'metro': 'Transport',
  'petrol': 'Transport',
  'shell': 'Transport',
  
  // Shopping
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'myntra': 'Shopping',
  'nykaa': 'Shopping',
  'ajio': 'Shopping',
  'reliance': 'Shopping',
  'decathlon': 'Shopping',
  
  // Utilities & Health
  'jio': 'Utilities',
  'airtel': 'Utilities',
  'bescom': 'Utilities',
  'tata sky': 'Utilities',
  'hospital': 'Health',
  'pharmacy': 'Health',
  'apollo': 'Health',
  'practo': 'Health',
  'netmeds': 'Health',
  
  // Entertainment
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'hotstar': 'Entertainment',
  'pvr': 'Entertainment',
  'inox': 'Entertainment',
  'bookmyshow': 'Entertainment'
};

export function parseAlert(text) {
  if (!text) return null;

  const result = {
    amount: null,
    description: '',
    category: 'Other',
    date: null, // YYYY-MM-DD
    confidence: 0
  };

  const lowerText = text.toLowerCase();

  // 1. Extract Amount
  // Matches: ₹ 450.00, Rs 500, INR 1,200.50, Rs. 100
  const amountRegex = /(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d{0,2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    result.confidence += 0.4;
  }

  // 2. Extract Merchant / Description
  // Look for patterns like "at [Merchant]", "to [Merchant]", "VPA [Merchant]", or "towards [Merchant]"
  const merchantRegex = /(?:at|to|vpa|towards|info:)\s+([A-Z0-9\s&*_\-]{3,20})/i;
  const merchantMatch = text.match(merchantRegex);
  if (merchantMatch) {
    result.description = merchantMatch[1].trim();
    result.confidence += 0.3;
  } else {
    // Fallback: Try to find any keyword from our map in the text
    for (const kw in MERCHANT_MAP) {
      if (lowerText.includes(kw)) {
        result.description = kw.charAt(0).toUpperCase() + kw.slice(1);
        result.confidence += 0.2;
        break;
      }
    }
  }

  // 3. Extract Date
  // Matches: 14-04-26, 14/04/2026, 14-Apr-26, 14 Apr 2026
  const dateRegex = /(?:on|dated|at)?\s?(\d{1,2})[-/\s]([a-z]{3}|\d{1,2})[-/\s](\d{2,4})/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    let [_, day, month, year] = dateMatch;
    
    // Normalize Year
    if (year.length === 2) year = '20' + year;
    
    // Normalize Month
    if (isNaN(month)) {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      month = months.indexOf(month.toLowerCase().substring(0, 3)) + 1;
    }
    
    // Format to YYYY-MM-DD
    const normalizedDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    result.date = normalizedDate;
    result.confidence += 0.2;
  }

  // 4. Suggest Category
  const descLower = result.description.toLowerCase();
  for (const kw in MERCHANT_MAP) {
    if (descLower.includes(kw) || lowerText.includes(kw)) {
      result.category = MERCHANT_MAP[kw];
      result.confidence += 0.3;
      break;
    }
  }

  // Minor adjustment: if we have a merchant but no category, tried to infer it.
  if (result.description && result.category === 'Other') {
    // Generic heuristics
    if (lowerText.includes('upi')) result.category = 'Other';
    if (lowerText.includes('card')) result.category = 'Other';
  }

  return result;
}

