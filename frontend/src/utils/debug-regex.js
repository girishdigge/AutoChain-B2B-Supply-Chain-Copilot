// Debug script to test regex patterns
const testString1 =
  'Model: BMW X5, Quantity: 1, Location: Los Angeles, CA, Total: $75,000';
const testString2 =
  'Order summary: Product: iPhone 14 Pro, Quantity: 2 units, Delivery Location: Seattle, WA, Total Cost: $2,400.00';

// Test model extraction
const modelPattern =
  /(?:model|product|item)[:\s]+([^,\n]+?)(?=\s*,\s*(?:quantity|qty|location|total|price|cost|delivery)|$)/i;
console.log('Model from string 1:', testString1.match(modelPattern)?.[1]);
console.log('Model from string 2:', testString2.match(modelPattern)?.[1]);

// Test location extraction
const locationPattern =
  /(?:delivery[_\s]*location|location)[:\s]+([^,\n]+?)(?=\s*,\s*(?:total|price|cost|quantity|qty|model|product)|$)/i;
console.log('Location from string 1:', testString1.match(locationPattern)?.[1]);
console.log('Location from string 2:', testString2.match(locationPattern)?.[1]);

// Test total extraction
const totalPattern =
  /(?:total[_\s]*(?:amount|cost)|total|price|cost)[:\s]+([^,\n]+?)(?=\s*,\s*(?:quantity|qty|location|model|product|delivery)|$)/i;
console.log('Total from string 1:', testString1.match(totalPattern)?.[1]);
console.log('Total from string 2:', testString2.match(totalPattern)?.[1]);
