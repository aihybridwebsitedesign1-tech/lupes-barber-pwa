import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, and SMS_ENABLED=true in Supabase Edge Functions secrets." 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { phoneNumber, message } = await req.json();

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
      console.error("[Test SMS] Twilio error:", errorData);

      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: "Failed to send SMS",
          details: errorData 
        }),
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
    console.log(`[Test SMS] Sent to ${phoneNumber.substring(0, 5)}...`);

    return new Response(
      JSON.stringify({ 
        status: "sent", 
        sid: twilioData.sid,
        message: "SMS sent successfully!" 
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Test SMS] Error:", error);
    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      }),
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