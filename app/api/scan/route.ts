import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { ComplianceScan, FieldResult } from '@/lib/types';
import { analyzePackageImage } from '@/lib/scanner';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STRICT_PROMPT_INSTRUCTION = `You are an official Legal Metrology Compliance Inspector for packaged commodities in India under the Legal Metrology (Packaged Commodities) Rules, 2011.

CRITICAL INSTRUCTION:
Only report text that is literally, clearly visible and legible in this specific image. Do not guess, infer, complete, or fill in typical values based on what similar product labels usually contain. If you cannot clearly read a field's value in this exact image, you MUST return NOT_FOUND for it, even if it seems likely the packaging would normally have that information. Base your answer only on what is visibly printed in this photograph, not on prior knowledge of packaging conventions.

STRICT NUMERICAL ACCURACY:
- Price (MRP): Read the exact digits printed on the package (e.g. if the image shows "Rs.120.00" or "Rs 120", return "Rs. 120.00"). NEVER alter, substitute, or guess price numbers from memory or training data.
- Date of Packing/Mfg: Read the exact numbers (e.g. "PKD:03/10/2020" or "03/10/2020").
- If Manufacturer details, Net Quantity, or Consumer Care details are NOT visible in this photo view, you MUST set extractedText to "NOT_FOUND" and status to "fail".

Analyze this photograph for the 5 mandatory Legal Metrology fields:
1. Manufacturer/Packer Details: Name & complete address.
2. Net Quantity: Net weight or volume in standard units (e.g., g, kg, ml, L).
3. Maximum Retail Price (MRP): Tax-inclusive price declaration.
4. Date of Manufacture/Pre-packing: Month & Year (or MM/YYYY / DD/MM/YYYY).
5. Consumer Care Details: Helpline, email, or contact address.

Respond ONLY with a valid raw JSON object strictly matching this format (no markdown codeblocks):
{
  "productName": "Literal printed product name or short descriptor",
  "category": "Packaged Goods",
  "fields": [
    {
      "id": "manufacturer",
      "name": "Manufacturer/Packer Details",
      "ruleReference": "Rule 6(1)(a) - Name & complete address of manufacturer/packer/importer",
      "status": "pass OR fail",
      "extractedText": "Literal text found in image OR NOT_FOUND",
      "description": "Explanation of literal text found or missing details."
    },
    {
      "id": "netQuantity",
      "name": "Net Quantity",
      "ruleReference": "Rule 6(1)(b) - Net quantity in standard units of weight, measure or number",
      "status": "pass OR fail",
      "extractedText": "Literal text found in image OR NOT_FOUND",
      "description": "Explanation of literal text found or missing details."
    },
    {
      "id": "mrp",
      "name": "MRP (Maximum Retail Price)",
      "ruleReference": "Rule 6(1)(e) - Price declaration format: MRP ₹ xx.xx (incl. of all taxes)",
      "status": "pass OR fail",
      "extractedText": "Literal text found in image OR NOT_FOUND",
      "description": "Explanation of literal text found or missing details."
    },
    {
      "id": "manufactureDate",
      "name": "Manufacture Date",
      "ruleReference": "Rule 6(1)(d) - Month and Year of manufacture or pre-packing",
      "status": "pass OR fail",
      "extractedText": "Literal text found in image OR NOT_FOUND",
      "description": "Explanation of literal text found or missing details."
    },
    {
      "id": "consumerCare",
      "name": "Consumer Care Details",
      "ruleReference": "Rule 6(1)(8) - Name, address, telephone & email of grievance officer",
      "status": "pass OR fail",
      "extractedText": "Literal text found in image OR NOT_FOUND",
      "description": "Explanation of literal text found or missing details."
    }
  ]
}`;

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash';

/** Helper to execute Gemini vision call for a specific model name */
async function callGeminiVision(
  modelName: string,
  apiKey: string,
  mimeType: string,
  base64Data: string
): Promise<string> {
  // First try with @google/genai
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: STRICT_PROMPT_INSTRUCTION },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });
    if (response.text) {
      return response.text;
    }
  } catch (genAiError: any) {
    console.warn(`[scan] @google/genai attempt with ${modelName} failed:`, genAiError?.message);
  }

  // Fallback SDK attempt with @google/generative-ai
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });
  const result = await model.generateContent([
    STRICT_PROMPT_INSTRUCTION,
    { inlineData: { mimeType, data: base64Data } },
  ]);
  const res = await result.response;
  return res.text();
}

/** Helper: extract a field's text from the formatted fields array */
function getFieldText(fields: FieldResult[], id: string): string | null {
  const field = fields.find((f) => f.id === id);
  return field?.extractedText || null;
}

export async function POST(req: NextRequest) {
  // Read body once and store for potential fallback use
  let imageUrl = '';
  let filename = 'Uploaded Product';

  try {
    const body = await req.json();
    imageUrl = body.imageUrl || '';
    filename = body.filename || 'Uploaded Product';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl parameter' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[scan] GEMINI_API_KEY not configured — returning NOT_FOUND for all fields.');
      const scan = analyzePackageImage(imageUrl, filename);
      return NextResponse.json({ scan, source: 'no-api-key' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = imageUrl;

    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    let rawJsonResponseText = '';
    let usedModel = PRIMARY_MODEL;

    // Execute with Primary Model (gemini-3.6-flash); on error, wait 1.5s and retry with Fallback Model (gemini-3.5-flash)
    try {
      console.log(`[scan] Attempting primary model: ${PRIMARY_MODEL}`);
      rawJsonResponseText = await callGeminiVision(PRIMARY_MODEL, apiKey, mimeType, base64Data);
    } catch (primaryError: any) {
      console.warn(`[scan] Primary model (${PRIMARY_MODEL}) failed:`, primaryError?.message);
      console.log(`[scan] Waiting 1.5s before retrying with fallback model (${FALLBACK_MODEL})...`);

      // 1.5 second delay before fallback attempt
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        usedModel = FALLBACK_MODEL;
        console.log(`[scan] Attempting fallback model: ${FALLBACK_MODEL}`);
        rawJsonResponseText = await callGeminiVision(FALLBACK_MODEL, apiKey, mimeType, base64Data);
      } catch (fallbackError: any) {
        console.error(
          `[scan] Both models failed. Primary (${PRIMARY_MODEL}):`,
          primaryError?.message,
          `| Fallback (${FALLBACK_MODEL}):`,
          fallbackError?.message
        );
        throw new Error(
          `Gemini API call failed.\nPrimary (${PRIMARY_MODEL}): ${primaryError?.message || primaryError}\nFallback (${FALLBACK_MODEL}): ${fallbackError?.message || fallbackError}\n\nCheck that GEMINI_API_KEY in .env.local is a Google AI Studio key (starts with "AIza"), not a Vertex AI or service-account key.`
        );
      }
    }

    const cleanedJson = rawJsonResponseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanedJson);

    const formattedFields: FieldResult[] = (parsedData.fields || []).map((f: any) => {
      const extracted = f.extractedText && f.extractedText.toUpperCase() !== 'NOT_FOUND' ? f.extractedText : null;
      const status: 'pass' | 'fail' = extracted && f.status === 'pass' ? 'pass' : 'fail';

      return {
        id: f.id,
        name: f.name,
        ruleReference: f.ruleReference,
        status,
        extractedText: extracted,
        description: f.description || (status === 'pass' ? 'Literally verified in photograph.' : 'Not found or illegible in photo.'),
      };
    });

    const compliantCount = formattedFields.filter((f) => f.status === 'pass').length;
    let overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant' = 'compliant';
    if (compliantCount < 2) overallStatus = 'non_compliant';
    else if (compliantCount < 4) overallStatus = 'partially_compliant';

    // --- Supabase: Upload image and persist scan ---

    // 1. Upload the original image to the "packet-images" storage bucket
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1]?.replace('+xml', '') || 'jpg';
    const storagePath = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('packet-images')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[scan] Supabase storage upload error:', uploadError.message);
      throw new Error(`Failed to upload image to Supabase Storage: ${uploadError.message}`);
    }

    // 2. Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('packet-images')
      .getPublicUrl(storagePath);

    const publicImageUrl = publicUrlData.publicUrl;

    // 3. Insert a row into the "scans" table
    const { data: insertedRow, error: insertError } = await supabase
      .from('scans')
      .insert({
        image_url: publicImageUrl,
        manufacturer: getFieldText(formattedFields, 'manufacturer'),
        net_quantity: getFieldText(formattedFields, 'netQuantity'),
        mrp: getFieldText(formattedFields, 'mrp'),
        mfg_date: getFieldText(formattedFields, 'manufactureDate'),
        consumer_care: getFieldText(formattedFields, 'consumerCare'),
        score: compliantCount,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[scan] Supabase insert error:', insertError.message);
      throw new Error(`Failed to save scan to Supabase: ${insertError.message}`);
    }

    const scanId = insertedRow.id;
    const timestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const finalScan: ComplianceScan = {
      id: scanId,
      timestamp,
      productName: parsedData.productName || filename || 'Packaged Product',
      category: parsedData.category || 'General FMCG',
      imageUrl: publicImageUrl,
      fields: formattedFields,
      compliantCount,
      totalFields: 5,
      overallStatus,
      notes: 'Audited using strict Gemini Vision (Temperature: 0) under Legal Metrology Rules, 2011.',
    };

    return NextResponse.json({ scan: finalScan, id: scanId, source: 'gemini-vision', model: usedModel });
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('[scan] Fatal error in /api/scan:', message);
    return NextResponse.json(
      {
        error: 'Gemini API error',
        detail: message,
        hint: 'Ensure GEMINI_API_KEY in .env.local is a Google AI Studio key (starts with "AIza"). Get one free at https://aistudio.google.com/app/apikey',
      },
      { status: 502 }
    );
  }
}
