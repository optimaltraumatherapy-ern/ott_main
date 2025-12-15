import { Router } from "express";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(5000)
});

/**
 * HIPAA NOTE:
 * Do NOT encourage users to send PHI in a contact form.
 * Also do NOT log message contents in production.
 */
export const contactRouter = Router();

contactRouter.post("/", (req, res) => {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  // Intentionally do NOT log the message content
  console.log("[contact] received", {
    name: parsed.data.name,
    email: parsed.data.email,
    messageLength: parsed.data.message.length
  });

  res.json({ ok: true });
});
