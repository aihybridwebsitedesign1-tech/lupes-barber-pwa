import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Generate a 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ACTION: request - Generate and send OTP
    if (action === "request") {
      const { phoneNumber, language } = await req.json();

      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ status: "error", message: "Phone number required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting: Check recent attempts
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { data: recentAttempts } = await supabase
        .from("otp_verification")
        .select("id")
        .eq("phone_number", phoneNumber)
        .gte("created_at", fiveMinutesAgo.toISOString());

      if (recentAttempts && recentAttempts.length >= 3) {
        return new Response(
          JSON.stringify({ 
            status: "error", 
            message: language === 'es' 
              ? "Demasiados intentos. Intente de nuevo en 5 minutos." 
              : "Too many attempts. Please try again in 5 minutes." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      const { error: insertError } = await supabase
        .from("otp_verification")
        .insert({
          phone_number: phoneNumber,
          code: code,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
        });

      if (insertError) {
        console.error("[OTP] Insert error:", insertError);
        return new Response(
          JSON.stringify({ status: "error", message: "Failed to generate code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if SMS is configured
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
      const smsEnabled = Deno.env.get("SMS_ENABLED");

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber || smsEnabled !== "true") {
        console.warn("[OTP] SMS disabled, returning code in response (DEV MODE)");
        return new Response(
          JSON.stringify({ status: "disabled", code: code }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP via SMS
      const message = language === 'es'
        ? `Su código de verificación es: ${code}. Válido por 10 minutos.`
        : `Your verification code is: ${code}. Valid for 10 minutes.`;

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
        console.error("[OTP] Twilio error");
        // Still return success to client, but log error
        await supabase.from("client_messages").insert({
          client_id: null,
          phone_number: phoneNumber,
          message: message,
          channel: "sms",
          source: "otp_request",
          notification_type: "otp",
          status: "error",
          sent_by_user_id: null,
        });
      } else {
        const twilioData = await twilioResponse.json();
        await supabase.from("client_messages").insert({
          client_id: null,
          phone_number: phoneNumber,
          message: message,
          channel: "sms",
          source: "otp_request",
          notification_type: "otp",
          twilio_sid: twilioData.sid,
          status: "sent",
          sent_by_user_id: null,
        });
      }

      return new Response(
        JSON.stringify({ status: "sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: verify - Verify OTP code
    if (action === "verify") {
      const { phoneNumber, code } = await req.json();

      if (!phoneNumber || !code) {
        return new Response(
          JSON.stringify({ status: "error", message: "Phone number and code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: otpRecords } = await supabase
        .from("otp_verification")
        .select("*")
        .eq("phone_number", phoneNumber)
        .eq("code", code)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (!otpRecords || otpRecords.length === 0) {
        return new Response(
          JSON.stringify({ status: "error", message: "Invalid or expired code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otp = otpRecords[0];

      // Check attempts
      if (otp.attempts >= 5) {
        return new Response(
          JSON.stringify({ status: "error", message: "Too many verification attempts" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from("otp_verification")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", otp.id);

      if (updateError) {
        console.error("[OTP] Update error:", updateError);
        return new Response(
          JSON.stringify({ status: "error", message: "Verification failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a simple session token (phone number + timestamp + random)
      const sessionToken = btoa(`${phoneNumber}:${Date.now()}:${Math.random()}`);

      return new Response(
        JSON.stringify({ status: "verified", sessionToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OTP] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
