import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate correct delivery fee for an order
 */
function calculateCorrectDeliveryFee(order, customers, routes) {
  try {
    // If charge_delivery is false or null, delivery should be 0
    if (!order.charge_delivery) {
      return 0;
    }

    const customer = customers.find(c => c.id === order.customer_id);
    if (!customer) {
      console.warn(`⚠️ No customer found for order ${order.id.substring(0, 8)}`);
      return 0;
    }

    // If customer has free delivery exception
    if (customer.free_delivery) {
      return 0;
    }

    const customerType = customer.customer_type || 'home';

    // Find customer's delivery route
    const customerRouteId = customer.delivery_route_id;
    if (!customerRouteId) {
      console.warn(`⚠️ No delivery route assigned to customer ${customer.name}`);
      return 0;
    }

    const deliveryRoute = routes.find(r => r.id === customerRouteId);
    if (!deliveryRoute) {
      console.warn(`⚠️ Delivery route ${customerRouteId} not found`);
      return 0;
    }

    // Calculate order subtotal from items
    let orderSubtotal = 0;
    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      orderSubtotal = order.order_items.reduce((sum, item) => {
        if (!item) return sum;
        const qty = parseFloat(item.quantity?.toString() || '0');
        const pricePerUnit = parseFloat((item.price_per_unit?.toString() || '0').replace(',', '.'));
        return sum + (qty * pricePerUnit);
      }, 0);
    } else {
      // Fallback: use total_price - delivery_price
      const totalPrice = parseFloat((order.total_price || 0).toString());
      const deliveryPrice = parseFloat((order.delivery_price || 0).toString());
      orderSubtotal = totalPrice - deliveryPrice;
    }

    // Get fee and threshold from route based on customer type
    let deliveryFee = 0;
    let minFreeThreshold = 0;

    if (customerType === 'home') {
      deliveryFee = parseFloat((deliveryRoute.delivery_fee_home || 0).toString());
      minFreeThreshold = parseFloat((deliveryRoute.home_min_free_delivery || 0).toString());
    } else if (customerType === 'gastro') {
      deliveryFee = parseFloat((deliveryRoute.delivery_fee_gastro || 0).toString());
      minFreeThreshold = parseFloat((deliveryRoute.gastro_min_free_delivery || 0).toString());
    } else if (customerType === 'wholesale') {
      deliveryFee = parseFloat((deliveryRoute.delivery_fee_wholesale || 0).toString());
      minFreeThreshold = parseFloat((deliveryRoute.wholesale_min_free_delivery || 0).toString());
    }

    // SMIŽANY RULE: If min_free_delivery is 0, delivery is automatically free
    if (minFreeThreshold === 0) {
      return 0;
    }

    // If subtotal meets threshold, free delivery
    if (orderSubtotal >= minFreeThreshold) {
      return 0;
    }

    // Otherwise, charge delivery fee
    return deliveryFee;
  } catch (error) {
    console.error(`❌ Error calculating delivery for order ${order.id?.substring(0, 8)}:`, error);
    return 0;
  }
}

async function fixDeliveryPrices() {
  console.log('🚀 Starting bulk delivery price correction...\n');

  try {
    // Fetch all necessary data
    console.log('📥 Fetching orders, customers, and routes...');
    const [ordersRes, customersRes, routesRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*'),
      supabase.from('delivery_routes').select('*')
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (customersRes.error) throw customersRes.error;
    if (routesRes.error) throw routesRes.error;

    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const routes = routesRes.data || [];

    console.log(`✅ Loaded ${orders.length} orders, ${customers.length} customers, ${routes.length} routes\n`);

    let correctedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each order
    for (const order of orders) {
      try {
        const correctDeliveryFee = calculateCorrectDeliveryFee(order, customers, routes);
        const currentDeliveryFee = parseFloat((order.delivery_price || 0).toString());

        // Check if correction is needed (allow 0.01 tolerance for rounding)
        if (Math.abs(correctDeliveryFee - currentDeliveryFee) > 0.01) {
          const newTotalPrice = parseFloat((order.total_price || 0).toString()) - currentDeliveryFee + correctDeliveryFee;

          console.log(`🔧 Order ${order.id.substring(0, 8)} - ${order.customer_name}`);
          console.log(`   Current: ${currentDeliveryFee.toFixed(2)}€ → Correct: ${correctDeliveryFee.toFixed(2)}€`);
          console.log(`   Total: ${parseFloat(order.total_price).toFixed(2)}€ → ${newTotalPrice.toFixed(2)}€`);

          // Update the order
          const { error } = await supabase
            .from('orders')
            .update({
              delivery_price: parseFloat(correctDeliveryFee.toFixed(2)),
              total_price: parseFloat(newTotalPrice.toFixed(2))
            })
            .eq('id', order.id);

          if (error) {
            console.error(`   ❌ Failed to update: ${error.message}`);
            errorCount++;
          } else {
            console.log(`   ✅ Updated successfully\n`);
            correctedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.id?.substring(0, 8)}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`✅ Corrected: ${correctedCount}`);
    console.log(`⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (correctedCount > 0) {
      console.log('✅ Bulk correction completed successfully!');
    } else {
      console.log('ℹ️ No orders needed correction.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixDeliveryPrices()
  .then(() => {
    console.log('\n✅ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
