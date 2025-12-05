import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatDate(dateStr: string, language: 'en' | 'es'): string {
  const date = new Date(dateStr);
  const days = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = language === 'es'
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  
  return `${dayName}, ${monthName} ${dayNum}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if reminders are enabled
    const { data: config } = await supabase
      .from("shop_config")
      .select("enable_reminders, reminder_hours_before, shop_name, phone")
      .single();

    if (!config || !config.enable_reminders) {
      console.log("[Reminders] Disabled in configuration");
      return new Response(
        JSON.stringify({ status: "disabled", message: "Reminders are disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reminderHours = config.reminder_hours_before || 24;
    const shopName = config.shop_name || "Lupe's Barber";
    const shopPhone = config.phone;

    // Calculate the time window for reminders
    const now = new Date();
    const targetTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 min before
    const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000); // 30 min after

    // Find appointments that need reminders
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        scheduled_start,
        status,
        notes,
        clients!inner (
          id,
          first_name,
          last_name,
          phone,
          language
        ),
        users!appointments_barber_id_fkey (
          name
        ),
        services!inner (
          name_en,
          name_es
        )
      `)
      .eq("status", "booked")
      .gte("scheduled_start", windowStart.toISOString())
      .lte("scheduled_start", windowEnd.toISOString());

    if (apptError) {
      console.error("[Reminders] Query error:", apptError);
      return new Response(
        JSON.stringify({ status: "error", message: "Failed to fetch appointments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appointments || appointments.length === 0) {
      console.log("[Reminders] No appointments found in window");
      return new Response(
        JSON.stringify({ status: "success", sent: 0, message: "No appointments to remind" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each appointment
    for (const apt of appointments) {
      // Check if reminder already sent
      const { data: reminderSent } = await supabase
        .from("appointment_reminders_sent")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("reminder_type", "24h")
        .single();

      if (reminderSent) {
        console.log(`[Reminders] Already sent for appointment ${apt.id}`);
        skippedCount++;
        continue;
      }

      const client = apt.clients;
      if (!client || !client.phone) {
        console.warn(`[Reminders] No phone for appointment ${apt.id}`);
        skippedCount++;
        continue;
      }

      const language = client.language || 'en';
      const barberName = apt.users?.name || 'our barber';
      const serviceName = language === 'es' ? apt.services.name_es : apt.services.name_en;
      const date = formatDate(apt.scheduled_start, language);
      const time = formatTime(apt.scheduled_start);

      // Call send-notification edge function
      const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
      const notificationResponse = await fetch(notificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          appointmentId: apt.id,
          clientId: client.id,
          phoneNumber: client.phone,
          notificationType: "reminder",
          appointmentDetails: {
            shopName,
            date,
            time,
            barberName,
            serviceName,
            shopPhone,
          },
          language,
        }),
      });

      const result = await notificationResponse.json();

      if (result.status === "sent" || result.status === "disabled") {
        // Mark reminder as sent
        await supabase.from("appointment_reminders_sent").insert({
          appointment_id: apt.id,
          reminder_type: "24h",
        });
        sentCount++;
        console.log(`[Reminders] Sent for appointment ${apt.id}`);
      } else {
        errors.push(`Appointment ${apt.id}: ${result.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        sent: sentCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Reminders] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
