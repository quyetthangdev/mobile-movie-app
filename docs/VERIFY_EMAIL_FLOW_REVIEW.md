# Review flow xác minh email

## Flow hiện tại (tóm tắt)

1. User nhập email → `POST /auth/initiate-verify-email` (Bearer token).
2. API trả `expiresAt` → UI hiển thị màn nhập OTP + countdown 10 phút.
3. User nhập OTP 6 ký tự → `POST /auth/confirm-email-verification/code` với `{ code }`.
4. Thành công → `setEmailVerificationStatus(null)` + `router.back()`.
5. Resend → `POST /auth/resend-verify-email` khi countdown = 0; success thì cập nhật `expiresAt` và reset countdown.

---

## Các vấn đề đã phát hiện

### 1. Thiếu xử lý lỗi (Error mapping) — **Sai logic**

- **Initiate (gửi email):** Không có `onError`. Nếu API trả lỗi (email đã xác minh, email không tồn tại, rate limit, v.v.) user không thấy toast, không biết lý do.
- **Confirm (nhập OTP):** Không có `onError`. OTP sai, OTP hết hạn, hoặc lỗi mạng → không có thông báo.
- **Resend:** Không có `onError`. Resend quá nhanh (429) hoặc lỗi khác → user không được báo.

**Đề xuất:** Thêm `onError` cho cả 3 mutation, lấy `error.response?.data?.code` (hoặc `statusCode`) và map sang toast qua `showErrorToast(code)` hoặc message từ API. Các mã đã có trong `utils/toast.ts`: `119020` (errorWhenConfirmEmailVerification), `119019` (emailTokenExpired), `429` (tooManyRequests).

---

### 2. Sau confirm success — Profile không được refresh — **Sai logic**

- Màn verify-email chỉ gọi `setEmailVerificationStatus(null)` và `router.back()`.
- `profile/info` lấy `userInfo` từ **Zustand** (useUserStore), không từ React Query.
- `useProfile()` có `enabled: false` và chỉ được refetch thủ công từ login/register; **invalidateQueries([QUERYKEY.profile])** từ verify-email không tự refetch (vì không component nào đang mount query đó với enabled: true).
- Hậu quả: User quay lại màn profile vẫn thấy "Chưa xác minh" cho đến khi vào lại app hoặc làm hành động khác cập nhật userInfo.

**Đề xuất:** Trong `onSuccess` của confirm, gọi thêm `getProfile()` (hoặc refetch profile), rồi `setUserInfo(result)` để store phản ánh `isVerifiedEmail: true` ngay sau khi xác minh thành công.

---

### 3. Validate frontend

- **Email:** Đã có schema Zod (format email), submit mới validate → ổn.
- **OTP:** Chỉ kiểm tra `length === 6`; không validate regex (chữ + số). Backend có thể từ chối format khác; nếu backend chấp nhận mọi chuỗi 6 ký tự thì không bắt buộc thêm.
- **Token:** Có kiểm tra `if (!token) return` trước khi initiate → ổn.

Không thiếu bước validate nghiêm trọng; có thể bổ sung trim/uppercase OTP trước khi gửi (đã có uppercase).

---

### 4. OTP hết hạn / OTP sai / Resend quá nhanh

- **OTP hết hạn:** UI có countdown; nút "Gửi lại OTP" chỉ bật khi `otpCountdown <= 0`. Nếu user vẫn gửi OTP cũ sau khi hết hạn, backend trả lỗi → hiện tại không có onError nên user không thấy thông báo. Cần onError + map mã lỗi (ví dụ 119019) sang toast "Mã OTP đã hết hạn".
- **OTP sai:** Backend trả lỗi (có thể 119020 hoặc mã khác) → cần onError để hiển thị "Mã OTP không đúng" hoặc tương đương.
- **Resend quá nhanh:** Backend có thể trả 429. Cần onError cho resend và có thể disable nút "Gửi lại" thêm vài giây sau khi bấm (hoặc hiển thị toast "Vui lòng đợi trước khi gửi lại").

Logic cho phép resend khi countdown = 0 là đúng; chỉ thiếu phản hồi khi API từ chối.

---

### 5. Race condition / Stale state

- **emailVerificationStatus** được persist (Zustand persist). Khi user đóng app sau bước 2 rồi mở lại, vẫn thấy màn OTP với expiresAt cũ → countdown tính từ expiresAt nên có thể đã 0 (đúng). Không race điển hình.
- **Resend success:** Cập nhật `setEmailVerificationStatus(res.result)` với `expiresAt` mới → useEffect phụ thuộc `emailVerificationStatus?.expiresAt` chạy lại, `otpExpireAtMs` được set lại → countdown mới. Ổn.
- **Double submit:** Nút "Xác minh" bị disable khi `isConfirming` → tránh gửi hai lần. Ổn.
- **Một rủi ro nhỏ:** Nếu user bấm "Gửi lại OTP" đúng lúc countdown vừa về 0 và mạng chậm, có thể bấm lần 2 trước khi response resend về; backend có thể trả 429. Xử lý onError + toast là đủ; có thể thêm `disabled={isResending || !canResend}` (đã có).

---

### 6. Initiate success: invalidate profile

- Hiện tại có `queryClient.invalidateQueries({ queryKey: [QUERYKEY.profile] })` khi initiate success. Query profile có `enabled: false` nên không tự refetch; tuy nhiên invalidate vẫn có ích nếu sau đó có màn nào refetch profile. Việc **sau confirm success** mới cần đảm bảo profile được cập nhật (refetch + setUserInfo) như mục 2.

---

## Tóm tắt đề xuất

| # | Vấn đề | Đề xuất |
|---|--------|--------|
| 1 | Không có toast khi API lỗi | Thêm onError cho verifyEmail, confirmOtp, resendOtp; dùng error.response?.data?.code (hoặc statusCode) + showErrorToast(code) hoặc message từ API. |
| 2 | Sau confirm success, profile vẫn "Chưa xác minh" | Trong onSuccess của confirm: gọi getProfile() (hoặc refetch), setUserInfo(result), rồi setEmailVerificationStatus(null) và router.back(). |
| 3 | (Tùy chọn) Toast khi initiate/resend success | Có thể thêm toast "Đã gửi mã đến email" khi initiate success và "Đã gửi lại mã" khi resend success để UX rõ ràng hơn. |

---

## Flow tối ưu đề xuất (sau khi sửa)

1. User nhập email → validate → POST initiate (Bearer). **onSuccess:** invalidate profile + setEmailVerificationStatus(res.result) (+ optional toast). **onError:** showErrorToast(code) hoặc message.
2. UI hiển thị OTP + countdown từ expiresAt (fallback 10 phút). Cho phép resend khi countdown = 0.
3. User nhập OTP → POST confirm. **onSuccess:** getProfile() → setUserInfo(profile.result) → setEmailVerificationStatus(null) → router.back() (+ optional toast "Xác minh thành công"). **onError:** showErrorToast(code) / message (OTP sai, hết hạn, v.v.).
4. Resend: **onSuccess:** setOtp(''), setEmailVerificationStatus(res.result) (+ optional toast). **onError:** showErrorToast(code) (ví dụ 429).

Như vậy flow vẫn giữ nguyên thứ tự bước; chỉ bổ sung xử lý lỗi và cập nhật profile sau khi xác minh thành công.
