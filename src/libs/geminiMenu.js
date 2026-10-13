import sharp from "sharp";
import { setTimeout as delay } from "node:timers/promises";

const MENU_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          category: { type: "STRING" },
          variants: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                size: { type: "STRING" },
                price: { type: "NUMBER" },
              },
              required: ["size", "price"],
            },
          },
        },
        required: ["name", "variants"],
      },
    },
  },
  required: ["items"],
};

const normalizeVariant = (variant) => ({
  size: String(variant?.size || "Mặc định").trim() || "Mặc định",
  price: Math.max(0, Number(variant?.price) || 0),
});

export const normalizeMenuItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: String(item?.id || `menu_item_${Date.now()}_${index}`),
      name: String(item?.name || "").trim(),
      category: String(item?.category || "").trim(),
      variants: (Array.isArray(item?.variants) && item.variants.length
        ? item.variants
        : [{ size: "Mặc định", price: 0 }]
      ).map(normalizeVariant),
    }))
    .filter((item) => item.name);

export async function optimizeMenuImageForGemini({ buffer, mimeType }) {
  try {
    const optimized = await sharp(buffer)
      .rotate()
      .resize({
        width: 2500,
        height: 2500,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    return { buffer: optimized, mimeType: "image/webp" };
  } catch (error) {
    console.warn("[AfternoonTea] Không tối ưu được ảnh menu:", error.message);
    return { buffer, mimeType };
  }
}

export async function extractMenuItemsWithGemini({ buffer, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash";
  const models = [...new Set([primaryModel, fallbackModel].filter(Boolean))];
  const retryCount = Math.max(0, Number(process.env.GEMINI_RETRY_COUNT || 2));
  // One deadline covers all models, retries and response bodies.
  const signal = AbortSignal.timeout(95_000);
  let lastError;

  for (const model of models) {
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: MENU_SCHEMA,
    };
    if (model.startsWith("gemini-3")) {
      generationConfig.thinkingConfig = {
        thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low",
      };
    }

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Bạn là hệ thống trích xuất menu đồ uống từ ảnh cho dữ liệu đặt hàng.

Đọc TOÀN BỘ ảnh cẩn thận, theo từng khu vực/cột/hàng của thiết kế; không chỉ đọc chữ lớn. Menu có thể là bảng, poster, nhiều cột, nền màu, chữ nhỏ, chữ cong, ảnh minh họa hoặc có nhãn tiếng Anh bên dưới tên tiếng Việt.

Mục tiêu: trích xuất từng món đọc được vào items. Mỗi item gồm name, category (nếu thấy tiêu đề nhóm) và variants [{ size, price }].

Quy tắc nhận diện size và giá:
- Tìm size ở mọi vị trí: trước/sau giá, ngay dưới giá, trong cột riêng, trong vòng tròn/huy hiệu/icon nhỏ, hoặc dạng S/M/L/XL/XXL; có thể là chữ "Size M", "Ly L", "Cỡ L", "Big size".
- Ghép size với đúng giá CÙNG món gần nhất. Nếu một món có nhiều giá và các cột size tương ứng, tạo một variant cho từng cặp size–giá.
- Với poster nhiều cột, xử lý từng ô món riêng, không lấy size/giá của ô bên cạnh.
- Giá có thể viết 22k, 22K, 22.000, 22 000, 22000đ hoặc 22.000đ. Luôn trả price là số VND nguyên (ví dụ 22k => 22000).
- Nếu thấy một giá và một biểu tượng size cạnh nó (ví dụ icon L/M/S nhỏ), vẫn phải ghi size đó.
- Nếu menu thật sự không hề ghi size, dùng một variant { size: "Mặc định", price: giá }. Không tự bịa size hoặc giá.

Quy tắc tên món:
- Ưu tiên tên tiếng Việt; bỏ mô tả/translation tiếng Anh nếu chỉ là phụ đề.
- Không biến topping, tiêu đề chương, slogan, số điện thoại hoặc ghi chú thành món.
- Nếu chữ tên món hoặc giá không đọc đủ chắc chắn, bỏ món đó thay vì suy đoán.

Chỉ trả dữ liệu đúng JSON theo schema đã cho; không thêm diễn giải hay markdown.`,
                  },
                  { inlineData: { mimeType, data: buffer.toString("base64") } },
                ],
              },
            ],
            generationConfig,
          }),
        },
      );
      const result = await response.json().catch((error) => {
        signal.throwIfAborted();
        return {};
      });
      if (response.ok) {
        const text = result?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("");
        if (!text) throw new Error("Gemini không trả về dữ liệu món ăn");
        return normalizeMenuItems(JSON.parse(text).items);
      }

      lastError = new Error(
        result?.error?.message || "Gemini không thể đọc menu",
      );
      const retryable = response.status === 429 || response.status === 503;
      if (!retryable || attempt === retryCount) break;
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter =
        retryAfterHeader === null ? NaN : Number(retryAfterHeader);
      const retryDelay =
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1000
          : 1000 * 2 ** attempt;
      await delay(retryDelay, undefined, { signal });
    }
  }
  throw lastError || new Error("Gemini không thể đọc menu");
}
