import { NextRequest, NextResponse } from 'next/server';
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

// Fast primary model for ultra-low latency; reliable fallback model
const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.5-flash';

/** Promise timeout helper */
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise) as Promise<T>,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Helper to execute Gemini vision call for a specific model name */
async function callGeminiVision(
  modelName: string,
  apiKey: string,
  mimeType: string,
  base64Data: string
): Promise<string> {
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
  if (!response.text) {
    throw new Error(`Empty response returned from ${modelName}`);
  }
  return response.text;
}

/** Helper: extract a field's text from the formatted fields array */
function getFieldText(fields: FieldResult[], id: string): string | null {
  const field = fields.find((f) => f.id === id);
  return field?.extractedText || null;
}

export async function POST(req: NextRequest) {
  let imageUrl = '';
  let filename = 'Uploaded Product';

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid or oversized JSON body' }, { status: 400 });
    }

    imageUrl = body.imageUrl || '';
    filename = body.filename || 'Uploaded Product';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl parameter' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[scan] GEMINI_API_KEY not configured — returning fallback scan.');
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

    // Fast primary execution with 6s timeout; on error or timeout, switch to fallback model
    try {
      console.log(`[scan] Attempting primary model: ${PRIMARY_MODEL}`);
      rawJsonResponseText = await withTimeout(
        callGeminiVision(PRIMARY_MODEL, apiKey, mimeType, base64Data),
        6000,
        `Primary model (${PRIMARY_MODEL})`
      );
    } catch (primaryError: any) {
      console.warn(`[scan] Primary model (${PRIMARY_MODEL}) failed or timed out:`, primaryError?.message);
      console.log(`[scan] Retrying with fallback model (${FALLBACK_MODEL})...`);

      try {
        usedModel = FALLBACK_MODEL;
        console.log(`[scan] Attempting fallback model: ${FALLBACK_MODEL}`);
        rawJsonResponseText = await withTimeout(
          callGeminiVision(FALLBACK_MODEL, apiKey, mimeType, base64Data),
          6000,
          `Fallback model (${FALLBACK_MODEL})`
        );
      } catch (fallbackError: any) {
        console.error(
          `[scan] Both models failed. Primary (${PRIMARY_MODEL}):`,
          primaryError?.message,
          `| Fallback (${FALLBACK_MODEL}):`,
          fallbackError?.message
        );
        throw new Error(
          `Gemini API call failed.\nPrimary (${PRIMARY_MODEL}): ${primaryError?.message || primaryError}\nFallback (${FALLBACK_MODEL}): ${fallbackError?.message || fallbackError}`
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

    // --- Fast Supabase Persistence (with non-blocking storage fallback) ---
    let publicImageUrl = imageUrl;
    const timestampId = `scan-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const ext = mimeType.split('/')[1]?.replace('+xml', '') || 'jpg';
      const storagePath = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

      const uploadPromise = supabase.storage
        .from('packet-images')
        .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: false });

      const { data: uploadData, error: uploadError } = await withTimeout<any>(uploadPromise, 2500, 'Storage upload');
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('packet-images').getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          publicImageUrl = urlData.publicUrl;
        }
      }
    } catch (storageErr: any) {
      console.warn('[scan] Storage upload skipped/timed out:', storageErr?.message);
    }

    let scanId = timestampId;
    try {
      const insertPromise = supabase
        .from('scans')
        .insert({
          image_url: publicImageUrl.startsWith('data:') ? 'uploaded_image' : publicImageUrl,
          manufacturer: getFieldText(formattedFields, 'manufacturer'),
          net_quantity: getFieldText(formattedFields, 'netQuantity'),
          mrp: getFieldText(formattedFields, 'mrp'),
          mfg_date: getFieldText(formattedFields, 'manufactureDate'),
          consumer_care: getFieldText(formattedFields, 'consumerCare'),
          score: compliantCount,
        })
        .select('id')
        .single();

      const { data: insertedRow, error: insertError } = await withTimeout<any>(insertPromise, 2000, 'DB insert');
      if (insertedRow?.id && !insertError) {
        scanId = insertedRow.id;
      }
    } catch (dbErr: any) {
      console.warn('[scan] Supabase DB insert fallback to local id:', dbErr?.message);
    }

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
