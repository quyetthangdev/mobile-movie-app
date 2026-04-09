export interface IQRGenerateResponse {
  /** rawToken 64 ký tự hex — nội dung của QR code */
  token: string
  /** Ảnh QR dạng base64: "data:image/png;base64,..." */
  qrCode: string
  /** ISO 8601 — thời điểm token hết hạn (TTL 30s) */
  expiresAt: string
}
