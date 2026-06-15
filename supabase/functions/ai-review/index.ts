import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

interface FileForReview {
  path: string;
  content: string;
  language: string;
}

interface ReviewIssue {
  fileName: string | null;
  lineNumber: number | null;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestion: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { reviewId, providerConfig, files, reviewType } = await req.json();

    if (!providerConfig || !files || !reviewId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config: ProviderConfig = providerConfig;

    // Build the review prompt
    const fileListSummary = files.map((f: FileForReview) => `- ${f.path} (${f.language})`).join("\n");

    const filesContent = files.map((f: FileForReview) =>
      `=== FILE: ${f.path} ===\n\`\`\`${f.language}\n${f.content}\n\`\`\``
    ).join("\n\n");

    const systemPrompt = `You are an expert code reviewer. Analyze the provided code files and produce a structured review. Be thorough and specific.

Your response MUST be valid JSON with this exact structure:
{
  "summary": "Overall explanation of the code quality and architecture",
  "strengths": "Good practices, clean architecture, readability observations",
  "issues": [
    {
      "fileName": "relative/path/to/file.ext",
      "lineNumber": 42,
      "severity": "high|medium|low",
      "title": "Short issue title",
      "description": "Detailed explanation of the problem",
      "suggestion": "Actionable fix recommendation"
    }
  ]
}

Rules:
- Include file names and specific line numbers whenever possible
- severity must be "high", "medium", or "low"
- High: bugs, security vulnerabilities, critical performance issues
- Medium: code smells, suboptimal patterns, missing error handling
- Low: style issues, minor improvements, naming suggestions
- Be specific and actionable in suggestions
- Only report real issues, not hypothetical ones
- Respond with ONLY the JSON object, no markdown wrapping`;

    const userPrompt = `Review type: ${reviewType}\n\nFiles in review:\n${fileListSummary}\n\n${filesContent}`;

    // Call the OpenAI-compatible API
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const apiUrl = `${baseUrl}/chat/completions`;

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error (${aiResponse.status}): ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI provider");
    }

    // Parse the AI response - handle potential markdown wrapping
    let reviewResult;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      reviewResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse AI response as JSON");
    }

    // Update review record in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/reviews?id=eq.${reviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        summary: reviewResult.summary || "",
        strengths: reviewResult.strengths || "",
        status: "completed",
      }),
    });

    if (!updateRes.ok) {
      throw new Error("Failed to update review record");
    }

    // Insert review issues
    if (reviewResult.issues && reviewResult.issues.length > 0) {
      const issues = reviewResult.issues.map((issue: ReviewIssue) => ({
        review_id: reviewId,
        file_name: issue.fileName,
        line_number: issue.lineNumber,
        severity: issue.severity || "medium",
        title: issue.title,
        description: issue.description,
        suggestion: issue.suggestion,
      }));

      const issuesRes = await fetch(`${supabaseUrl}/rest/v1/review_issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(issues),
      });

      if (!issuesRes.ok) {
        const errText = await issuesRes.text();
        console.error("Failed to insert issues:", errText);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reviewId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Review error:", err);

    // Try to mark review as failed
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.reviewId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        await fetch(`${supabaseUrl}/rest/v1/reviews?id=eq.${body.reviewId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ status: "failed" }),
        });
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
