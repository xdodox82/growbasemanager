import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all orders with charge_delivery enabled
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_id, charge_delivery, delivery_price, total_price, order_items(quantity, price_per_unit)')
      .eq('charge_delivery', true);

    if (ordersError) throw ordersError;

    // Fetch all customers with their routes
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, customer_type, free_delivery, delivery_route_id');

    if (customersError) throw customersError;

    // Fetch all delivery routes
    const { data: routes, error: routesError } = await supabase
      .from('delivery_routes')
      .select('*');

    if (routesError) throw routesError;

    const updates: any[] = [];
    const logs: string[] = [];

    for (const order of orders || []) {
      try {
        const customer = customers?.find((c: any) => c.id === order.customer_id);
        if (!customer) {
          logs.push(`⚠️ Order ${order.id}: Customer not found`);
          continue;
        }

        if (customer.free_delivery) {
          logs.push(`⏭️ Order ${order.id}: Customer has free delivery exception`);
          continue;
        }

        const route = routes?.find((r: any) => r.id === customer.delivery_route_id);
        if (!route) {
          logs.push(`⚠️ Order ${order.id}: No route found for customer`);
          continue;
        }

        // Calculate subtotal from order items
        let subtotal = 0;
        if (order.order_items && Array.isArray(order.order_items)) {
          subtotal = order.order_items.reduce((sum: number, item: any) => {
            const qty = parseFloat(item.quantity?.toString() || '0');
            const price = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
            return sum + (qty * price);
          }, 0);
        }

        // Get correct fee and threshold based on customer type
        const customerType = customer.customer_type || 'home';
        let correctFee = 0;
        let minFreeThreshold = 0;

        if (customerType === 'home') {
          correctFee = parseFloat(route.delivery_fee_home?.toString() || '0');
          minFreeThreshold = parseFloat(route.home_min_free_delivery?.toString() || '0');
        } else if (customerType === 'gastro') {
          correctFee = parseFloat(route.delivery_fee_gastro?.toString() || '0');
          minFreeThreshold = parseFloat(route.gastro_min_free_delivery?.toString() || '0');
        } else if (customerType === 'wholesale') {
          correctFee = parseFloat(route.delivery_fee_wholesale?.toString() || '0');
          minFreeThreshold = parseFloat(route.wholesale_min_free_delivery?.toString() || '0');
        }

        // Apply threshold logic
        let finalDeliveryFee = correctFee;
        if (minFreeThreshold > 0 && subtotal >= minFreeThreshold) {
          finalDeliveryFee = 0;
        }

        // Check if update is needed
        const currentDeliveryPrice = parseFloat(order.delivery_price?.toString() || '0');
        if (Math.abs(currentDeliveryPrice - finalDeliveryFee) > 0.01) {
          const newTotalPrice = subtotal + finalDeliveryFee;

          updates.push({
            id: order.id,
            delivery_price: parseFloat(finalDeliveryFee.toFixed(2)),
            total_price: parseFloat(newTotalPrice.toFixed(2)),
          });

          logs.push(
            `✅ Order ${order.id}: ${currentDeliveryPrice.toFixed(2)}€ → ${finalDeliveryFee.toFixed(2)}€ (Route: ${route.name}, Subtotal: ${subtotal.toFixed(2)}€, Threshold: ${minFreeThreshold.toFixed(2)}€)`
          );
        } else {
          logs.push(`✓ Order ${order.id}: Already correct (${currentDeliveryPrice.toFixed(2)}€)`);
        }
      } catch (err) {
        logs.push(`❌ Order ${order.id}: Error - ${err.message}`);
      }
    }

    // Perform bulk update if needed
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            delivery_price: update.delivery_price,
            total_price: update.total_price,
          })
          .eq('id', update.id);

        if (updateError) {
          logs.push(`❌ Failed to update order ${update.id}: ${updateError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ordersChecked: orders?.length || 0,
        ordersUpdated: updates.length,
        logs,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fixing delivery fees:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
