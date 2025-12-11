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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const smsEnabled = Deno.env.get("SMS_ENABLED");

    const isSmsConfigured = !!(
      twilioAccountSid &&
      twilioAuthToken &&
      twilioFromNumber &&
      smsEnabled === "true"
    );

    if (!isSmsConfigured) {
      console.log("[Reminders] SMS not configured - will mark due reminders as skipped");
    }

    const { data: config } = await supabase
      .from("shop_config")
      .select("enable_reminders, shop_name, phone, test_mode_enabled")
      .single();

    if (!config || !config.enable_reminders) {
      console.log("[Reminders] Reminders disabled in shop configuration");
      return new Response(
        JSON.stringify({ status: "disabled", message: "Reminders are disabled in shop settings" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopName = config.shop_name || "Lupe's Barber Shop";
    const shopPhone = config.phone;

    // TEST MODE: Check if test mode is enabled
    const isTestMode = config.test_mode_enabled ?? false;
    if (isTestMode) {
      console.log("[Reminders] TEST MODE ENABLED - will mark reminders as sent_test without sending SMS");
    }

    const now = new Date();
    const { data: dueReminders, error: remindersError } = await supabase
      .from("booking_reminders")
      .select("id, appointment_id, reminder_type, reminder_offset_hours")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString())
      .limit(100);

    if (remindersError) {
      console.error("[Reminders] Error fetching due reminders:", remindersError);
      return new Response(
        JSON.stringify({ status: "error", message: "Failed to fetch reminders" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log("[Reminders] No due reminders found");
      return new Response(
        JSON.stringify({ status: "success", sent: 0, skipped: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Reminders] Found ${dueReminders.length} due reminders to process`);

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders) {
      try {
        const { data: appointment, error: apptError } = await supabase
          .from("appointments")
          .select(`
            id,
            scheduled_start,
            status,
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
          .eq("id", reminder.appointment_id)
          .maybeSingle();

        if (apptError || !appointment) {
          console.warn(`[Reminders] Appointment ${reminder.appointment_id} not found or error:`, apptError);
          await supabase
            .from("booking_reminders")
            .update({
              status: "failed",
              error_message: "Appointment not found",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          failedCount++;
          continue;
        }

        if (appointment.status !== "booked") {
          console.log(`[Reminders] Appointment ${reminder.appointment_id} is ${appointment.status}, skipping`);
          await supabase
            .from("booking_reminders")
            .update({
              status: "cancelled",
              error_message: `Appointment status is ${appointment.status}`,
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          skippedCount++;
          continue;
        }

        const client = appointment.clients;
        if (!client || !client.phone) {
          console.warn(`[Reminders] No phone number for appointment ${reminder.appointment_id}`);
          await supabase
            .from("booking_reminders")
            .update({
              status: "skipped",
              error_message: "Client has no phone number",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          skippedCount++;
          continue;
        }

        if (!isSmsConfigured) {
          console.log(`[Reminders] SMS not configured, marking reminder ${reminder.id} as skipped`);
          await supabase
            .from("booking_reminders")
            .update({
              status: "skipped",
              error_message: "SMS not configured (Twilio credentials missing)",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          skippedCount++;
          continue;
        }

        const language = client.language || 'en';
        const barberName = appointment.users?.name || 'our barber';
        const serviceName = language === 'es' ? appointment.services.name_es : appointment.services.name_en;
        const date = formatDate(appointment.scheduled_start, language);
        const time = formatTime(appointment.scheduled_start);

        // TEST MODE: Skip actual SMS sending, mark as sent_test
        if (isTestMode) {
          const maskedPhone = client.phone.substring(0, 5) + "...";
          console.log(`[Reminders TEST MODE] Would send reminder to ${maskedPhone} for appointment ${appointment.id}`);

          await supabase
            .from("booking_reminders")
            .update({
              status: "sent_test",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);

          await supabase
            .from("appointment_reminders_sent")
            .insert({
              appointment_id: appointment.id,
              reminder_type: "reminder",
              reminder_offset_hours: reminder.reminder_offset_hours,
            })
            .onConflict("appointment_id,reminder_offset_hours")
            .ignoreDuplicates();

          sentCount++;
          continue;
        }

        const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
        const notificationResponse = await fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
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

        if (result.status === "sent") {
          await supabase
            .from("booking_reminders")
            .update({
              status: "sent",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);

          await supabase
            .from("appointment_reminders_sent")
            .insert({
              appointment_id: appointment.id,
              reminder_type: "reminder",
              reminder_offset_hours: reminder.reminder_offset_hours,
            })
            .onConflict("appointment_id,reminder_offset_hours")
            .ignoreDuplicates();

          sentCount++;
          console.log(`[Reminders] Sent ${reminder.reminder_type} reminder for appointment ${appointment.id}`);
        } else if (result.status === "disabled") {
          await supabase
            .from("booking_reminders")
            .update({
              status: "skipped",
              error_message: "SMS disabled in edge function",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          skippedCount++;
          console.log(`[Reminders] SMS disabled, skipped reminder ${reminder.id}`);
        } else {
          await supabase
            .from("booking_reminders")
            .update({
              status: "failed",
              error_message: result.message || "Unknown error",
              sent_at: now.toISOString()
            })
            .eq("id", reminder.id);
          failedCount++;
          errors.push(`Reminder ${reminder.id}: ${result.message || "Unknown error"}`);
          console.error(`[Reminders] Failed to send reminder ${reminder.id}:`, result.message);
        }
      } catch (error) {
        console.error(`[Reminders] Error processing reminder ${reminder.id}:`, error);
        await supabase
          .from("booking_reminders")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            sent_at: now.toISOString()
          })
          .eq("id", reminder.id);
        failedCount++;
        errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log(`[Reminders] Batch complete - Sent: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        status: "success",
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Reminders] Fatal error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
