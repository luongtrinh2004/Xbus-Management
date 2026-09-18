import "server-only";

import crypto from "node:crypto";

const key = () =>
  crypto
    .createHash("sha256")
    .update(process.env.NEXTAUTH_SECRET || "")
    .digest();

export function encryptPayosSecret(value) {
  if (!process.env.NEXTAUTH_SECRET)
    throw new Error("NEXTAUTH_SECRET chưa được cấu hình");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptPayosSecret(value) {
  if (!value?.iv || !value?.tag || !value?.data) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function payosCredentials(settings, channelId) {
  const channels = settings.payosPaymentChannels || [];
  const selectedId = channelId || settings.activePayosChannelId;
  const channel = channels.find((item) => item.id === selectedId);
  if (channel)
    return {
      id: channel.id,
      name: channel.name,
      clientId: decryptPayosSecret(channel.clientId),
      apiKey: decryptPayosSecret(channel.apiKey),
      checksumKey: decryptPayosSecret(channel.checksumKey),
    };
  if (selectedId && selectedId !== "legacy-env") return null;
  const clientId = process.env.PAYOS_CLIENT_ID || process.env.CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY || process.env.API_KEY;
  const checksumKey =
    process.env.PAYOS_CHECKSUM_KEY || process.env.CHECKSUM_KEY;
  return clientId && apiKey && checksumKey
    ? {
        id: "legacy-env",
        name: "PayOS mặc định",
        clientId,
        apiKey,
        checksumKey,
      }
    : null;
}

export const publicPayosChannel = (channel, activeId) => ({
  id: channel.id,
  name: channel.name,
  active: channel.id === activeId,
  configured: Boolean(
    channel.clientId && channel.apiKey && channel.checksumKey,
  ),
  updatedAt: channel.updatedAt,
});
