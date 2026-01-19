# Bulk Delivery Price Correction Script

## Overview

This script recalculates and updates delivery prices for all existing orders in the database to ensure they match the current route fee rules and thresholds.

## What It Does

1. Fetches all orders, customers, and delivery routes from the database
2. For each order, calculates the correct delivery price based on:
   - Customer's assigned delivery route
   - Customer type (home, gastro, wholesale)
   - Order subtotal
   - Route-specific fees and thresholds
   - Smižany rule (0€ threshold = automatic free delivery)
3. Compares the correct price with the stored price
4. Updates orders where the delivery price is incorrect

## How to Run

```bash
node fix-delivery-prices.js
```

## Requirements

- Node.js installed
- `.env` file with Supabase credentials:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Output

The script provides detailed output:
- Each order being corrected with before/after values
- Summary statistics:
  - Total orders processed
  - Number corrected
  - Number skipped (already correct)
  - Number of errors

## Example Output

```
🚀 Starting bulk delivery price correction...

📥 Fetching orders, customers, and routes...
✅ Loaded 150 orders, 45 customers, 5 routes

🔧 Order a1b2c3d4 - Test Testovic
   Current: 2.00€ → Correct: 3.00€
   Total: 8.00€ → 9.00€
   ✅ Updated successfully

============================================================
📊 SUMMARY
============================================================
Total orders processed: 150
✅ Corrected: 12
⏭️  Skipped (already correct): 136
❌ Errors: 2
============================================================

✅ Bulk correction completed successfully!
```

## Safety

- The script uses a 0.01€ tolerance for rounding differences
- Only updates orders where the difference exceeds this tolerance
- Does not modify orders that are already correct
- Provides detailed logs for verification

## When to Run

Run this script:
- After changing delivery route settings
- After fixing delivery calculation bugs
- To ensure data consistency across the system
