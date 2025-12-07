import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendNotificationRequest {
  appointmentId: string;
  clientId: string;
  phoneNumber: string;
  notificationType: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule';
  appointmentDetails: {
    shopName: string;
    date: string;
    time: string;
    barberName: string;
    serviceName: string;
    shopPhone?: string;
  };
  language: 'en' | 'es';
}

function buildMessage(
  type: string,
  details: any,
  language: 'en' | 'es'
): string {
  const { shopName, date, time, barberName, serviceName, shopPhone } = details;

  if (type === 'confirmation') {
    if (language === 'es') {
      return `${shopName}: Su cita está reservada para ${date} a las ${time} con ${barberName}. Servicio: ${serviceName}.${shopPhone ? ` Llámenos: ${shopPhone}` : ''}`;
    }
    return `${shopName}: Your appointment is scheduled for ${date} at ${time} with ${barberName}. Service: ${serviceName}.${shopPhone ? ` Call us: ${shopPhone}` : ''}`;
  }

  if (type === 'reminder') {
    if (language === 'es') {
      return `${shopName}: Recordatorio - Su cita es mañana ${date} a las ${time} con ${barberName}. ¡Nos vemos pronto!${shopPhone ? ` ${shopPhone}` : ''}`;
    }
    return `${shopName}: Reminder - Your appointment is tomorrow ${date} at ${time} with ${barberName}. See you soon!${shopPhone ? ` ${shopPhone}` : ''}`;
  }

  if (type === 'cancellation') {
    if (language === 'es') {
      return `${shopName}: Su cita del ${date} a las ${time} ha sido cancelada. Llámenos para reprogramar.${shopPhone ? ` ${shopPhone}` : ''}`;
    }
    return `${shopName}: Your appointment on ${date} at ${time} has been cancelled. Call us to reschedule.${shopPhone ? ` ${shopPhone}` : ''}`;
  }

  if (type === 'reschedule') {
    if (language === 'es') {
      return `${shopName}: Su cita ha sido reprogramada para ${date} a las ${time} con ${barberName}.${shopPhone ? ` ${shopPhone}` : ''}`;
    }
    return `${shopName}: Your appointment has been rescheduled to ${date} at ${time} with ${barberName}.${shopPhone ? ` ${shopPhone}` : ''}`;
  }

  return '';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Check SMS configuration
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const smsEnabled = Deno.env.get("SMS_ENABLED");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber || smsEnabled !== "true") {
      console.warn("[Notification] SMS disabled: missing configuration");
      return new Response(
        JSON.stringify({ status: "disabled" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request
    const body: SendNotificationRequest = await req.json();
    const {
      appointmentId,
      clientId,
      phoneNumber,
      notificationType,
      appointmentDetails,
      language,
    } = body;

    if (!phoneNumber || !notificationType || !appointmentDetails) {
      return new Response(
        JSON.stringify({ status: "error", message: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build message
    const message = buildMessage(notificationType, appointmentDetails, language || 'en');

    if (!message) {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid notification type" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create Supabase client with service role (needed for test mode check)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TEST MODE: Check if test mode is enabled - if so, skip sending real SMS
    const { data: shopConfig } = await supabase
      .from("shop_config")
      .select("test_mode_enabled")
      .single();

    if (shopConfig?.test_mode_enabled) {
      const maskedPhone = phoneNumber.substring(0, 5) + "...";
      console.log(`[Notification TEST MODE] Would send ${notificationType} to ${maskedPhone}: "${message.substring(0, 50)}..."`);

      // Record the message as "sent_test" in client_messages
      await supabase.from("client_messages").insert({
        client_id: clientId,
        phone_number: phoneNumber,
        message: message,
        channel: "sms",
        source: `${notificationType}_auto`,
        notification_type: notificationType,
        appointment_id: appointmentId,
        status: "sent_test",
        sent_by_user_id: null,
      });

      return new Response(
        JSON.stringify({ status: "sent_test", message: "Test mode: SMS not actually sent" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append("To", phoneNumber);
    formData.append("From", twilioFromNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("[Notification] Twilio error:", errorData);

      // Log failure
      await supabase.from("client_messages").insert({
        client_id: clientId,
        phone_number: phoneNumber,
        message: message,
        channel: "sms",
        source: `${notificationType}_auto`,
        notification_type: notificationType,
        appointment_id: appointmentId,
        status: "error",
        error_message: errorData.message || "Unknown error",
        sent_by_user_id: null,
      });

      return new Response(
        JSON.stringify({ status: "error", message: "Failed to send SMS" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const twilioData = await twilioResponse.json();
    const twilioSid = twilioData.sid;

    // Log success
    await supabase.from("client_messages").insert({
      client_id: clientId,
      phone_number: phoneNumber,
      message: message,
      channel: "sms",
      source: `${notificationType}_auto`,
      notification_type: notificationType,
      appointment_id: appointmentId,
      twilio_sid: twilioSid,
      status: "sent",
      sent_by_user_id: null,
    });

    console.log(`[Notification] Sent ${notificationType} to ${phoneNumber.substring(0, 5)}...`);

    return new Response(
      JSON.stringify({ status: "sent", sid: twilioSid }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Notification] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
