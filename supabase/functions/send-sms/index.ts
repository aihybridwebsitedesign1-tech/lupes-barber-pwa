import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CLIENT_URL") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSmsRequest {
  clientId: string;
  phoneNumber: string;
  message: string;
  source: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const smsEnabled = Deno.env.get("SMS_ENABLED");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber || smsEnabled !== "true") {
      console.warn("[SMS] Disabled: missing configuration");
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ status: "error", message: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, can_send_sms")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.can_send_sms) {
      return new Response(
        JSON.stringify({ status: "error", message: "Permission denied" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body: SendSmsRequest = await req.json();
    const { clientId, phoneNumber, message, source } = body;

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ status: "error", message: "Phone number and message are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: shopConfig } = await supabase
      .from("shop_config")
      .select("test_mode_enabled")
      .single();

    if (shopConfig?.test_mode_enabled) {
      const maskedPhone = phoneNumber.substring(0, 5) + "...";
      console.log(`[SMS TEST MODE] Would send to ${maskedPhone}: "${message.substring(0, 50)}..."`);

      await supabase.from("client_messages").insert({
        client_id: clientId,
        phone_number: phoneNumber,
        message: message,
        channel: "sms",
        source: source || "engage_manual",
        status: "sent_test",
        sent_by_user_id: userData.id,
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
      console.error("[SMS] Twilio error:", errorData);

      await supabase.from("client_messages").insert({
        client_id: clientId,
        phone_number: phoneNumber,
        message: message,
        channel: "sms",
        source: source || "engage_manual",
        status: "error",
        error_message: errorData.message || "Unknown error",
        sent_by_user_id: userData.id,
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

    const maskedPhone = phoneNumber.substring(0, 5) + "...";
    console.log(`[SMS] Sent to ${maskedPhone} (source=${source || "engage_manual"}, clientId=${clientId})`);

    await supabase.from("client_messages").insert({
      client_id: clientId,
      phone_number: phoneNumber,
      message: message,
      channel: "sms",
      source: source || "engage_manual",
      twilio_sid: twilioSid,
      status: "sent",
      sent_by_user_id: userData.id,
    });

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
    console.error("[SMS] Error:", error);
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