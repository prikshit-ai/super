import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

// --- Configuration for Optimum Nutrition ---
const OPTIMUM_NUTRITION_DOMAIN = 'https://www.optimumnutrition.co.in';

// This is the main category hub page where all product types are listed
const CATEGORY = `${OPTIMUM_NUTRITION_DOMAIN}/collections/shop-by-product`;

// Your Gemini API key from environment variables (unchanged)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface Nutrient {
  name: string;
  unit: string | null;
  quantity_per_100g: string | null;
  quantity_per_serving: string | null;
  percent_rda: number | null;
}

interface NutritionData {
  serving_size: string | null;
  servings_per_container: string | null;
  nutrients: Nutrient[];
}

interface ScrapedProduct {
  productUrl: string;
  productImageUrl: string | null;
  nutritionLabelImageUrl: string | null;
  nutritionData: NutritionData | null;
}

export async function GET() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in the environment variables.");
    return NextResponse.json({ error: "Server configuration error: Missing API Key" }, { status: 500 });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Navigating to category: ${CATEGORY}`);
    await page.goto(CATEGORY, { waitUntil: 'networkidle' });

    // Scroll to load all products
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });

    await page.waitForTimeout(2000);

    // Step 1: Extract subcategory collection links
    const subcategoryLinks: string[] = await page.$$eval(
      'a[href^="/collections/"]',
      (links) => [
        ...new Set(
          links
            .map(link => (link as HTMLAnchorElement).getAttribute('href'))
            .filter(Boolean)
            .map(href => new URL(href!, 'https://www.optimumnutrition.co.in').href)
        ),
      ]
    );

    // Optional: filter out protein/mass gainer/combo packs here based on URL
    const filteredCategoryLinks = subcategoryLinks.filter(
      url =>
        !url.toLowerCase().includes("protein") &&
        !url.toLowerCase().includes("mass") &&
        !url.toLowerCase().includes("combo")
    );

    // Now extract all product links from each filtered subcategory
    const productLinks: string[] = [];

    for (const subUrl of filteredCategoryLinks) {
      console.log(`Visiting subcategory: ${subUrl}`);
      await page.goto(subUrl, { waitUntil: 'networkidle' });

      const links = await page.$$eval(
        'a.full-unstyled-link[href^="/products/"]',
        (anchors, domain) =>
          anchors.map((a) => `${domain}${(a as HTMLAnchorElement).getAttribute('href')}`),
        OPTIMUM_NUTRITION_DOMAIN
      );

      productLinks.push(...links);
    }

    if (productLinks.length === 0) {
      console.warn("Could not find any product links. The ON website structure may have changed.");
    }

    const uniqueLinks = Array.from(new Set(productLinks));

    const scrapedProducts: ScrapedProduct[] = [];

    for (const url of uniqueLinks) {
      console.log(`Scraping product: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });

      const productImageUrl = await page.$$eval('img.image-magnify-none', (imgs) => {
        const firstImg = imgs[0] as HTMLImageElement;
        return firstImg?.src || null;
      }).catch(() => {
        console.warn(`Could not find main product image for ${url}`);
        return null;
      });

      const nutritionLabelImageUrl = await page
        .$eval('img[alt="nutritional-info"]', (el) => (el as HTMLImageElement).src)
        .catch(() => {
          console.warn(`Could not find nutrition label image for ${url}`);
          return null;
        });

      let nutritionData: NutritionData | null = null;
      if (nutritionLabelImageUrl) {
        console.log(`Found nutrition label: ${nutritionLabelImageUrl}`);
        nutritionData = await extractNutritionViaGemini(nutritionLabelImageUrl);
      }

      scrapedProducts.push({
        productUrl: url,
        productImageUrl,
        nutritionLabelImageUrl,
        nutritionData,
      });
    }

    for (const product of scrapedProducts) {
      if (product.nutritionData) {
        await prisma.supplement.upsert({
          where: { productUrl: product.productUrl },
          update: {
            productImageUrl: product.productImageUrl,
            nutritionLabelImageUrl: product.nutritionLabelImageUrl,
            nutritionData: product.nutritionData as unknown as Prisma.JsonObject,
          },
          create: {
            productUrl: product.productUrl,
            productImageUrl: product.productImageUrl,
            nutritionLabelImageUrl: product.nutritionLabelImageUrl,
            nutritionData: product.nutritionData as unknown as Prisma.JsonObject,
          },
        });
        console.log(`Saved/Updated: ${product.productUrl}`);
      } else {
        console.warn(`Skipping save for ${product.productUrl} due to missing nutrition data.`);
      }
    }

    return NextResponse.json({
      message: 'Scraping and data storage complete.',
      found: scrapedProducts.length,
      savedToDb: scrapedProducts.filter((p) => p.nutritionData !== null).length,
      results: scrapedProducts.map((p) => ({
        productUrl: p.productUrl,
        hasNutritionData: Boolean(p.nutritionData),
      })),
    });
  } catch (err) {
    console.error('An error occurred during the scraping process:', err);
    return NextResponse.json({ error: 'Scraping failed due to an unexpected error' }, { status: 500 });
  } finally {
    await browser.close();
  }
}

// --- Gemini and fetchBase64 functions remain intact ---
async function extractNutritionViaGemini(imageUrl: string): Promise<NutritionData | null> {
  const prompt = `
Analyze the provided image of a nutritional label.

1. From the 'NUTRITIONAL INFORMATION' section:
   - Extract the **serving size**
   - Extract the **servings per container**

2. From the main 'NUTRIENTS' table:
   - Extract all listed nutrients.
   - For each nutrient, provide:
     - name (e.g., Protein, Total Fat)
     - unit (e.g., g, mg)
     - quantity_per_100g
     - quantity_per_serving
     - percent_rda

3. Output strictly as JSON:
{
  "serving_size": "30g",
  "servings_per_container": "10",
  "nutrients": [
    {
      "name": "Protein",
      "unit": "g",
      "quantity_per_100g": "24",
      "quantity_per_serving": "7.2",
      "percent_rda": 12
    }
  ]
}
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: await fetchBase64(imageUrl),
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    console.error('Gemini API error:', await response.text());
    return null;
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonString) as NutritionData;
  } catch (err) {
    console.error('Failed to parse JSON from Gemini response:', content, err);
    return null;
  }
}

async function fetchBase64(imageUrl: string): Promise<string> {
  const url = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
