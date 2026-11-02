const { z } = require("zod");

const createUrlSchema = z.object({
    body: z.object({
        originalUrl: z
            .string()
            .trim()
            .min(1, "Original URL is required")
            .max(2048, "URL cannot exceed 2048 characters")
            .url("Please provide a valid URL")
            .refine((value) => {
                try {
                    const parsedUrl = new URL(value);

                    return ["http:", "https:"].includes(parsedUrl.protocol);
                } catch {
                    return false;
                }
            }, "Only HTTP and HTTPS URLs are allowed"),
    }).strict(),
    params: z.object({}),
    query: z.object({}),
});

module.exports = {
    createUrlSchema,
};