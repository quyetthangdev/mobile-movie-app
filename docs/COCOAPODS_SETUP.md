# Cài đặt CocoaPods cho Expo iOS

## Các lỗi thường gặp

- **Homebrew lock:** Không tạo được lock → `sudo chown -R $(whoami) /opt/homebrew/var/homebrew`
- **Homebrew SSL:** `curl: (60) SSL certificate problem: unable to get local issuer certificate` → dùng **Cách 2 (Gem)** thay vì Homebrew
- **Gem:** Không ghi được vào `~/.gem` → `sudo chown -R $(whoami) ~/.gem`

---

## Cách 1: Cài qua Gem (dùng khi Homebrew lỗi SSL)

```bash
# 1. Sửa quyền thư mục gem
sudo chown -R $(whoami) ~/.gem

# 2. Cài CocoaPods
gem install cocoapods --user-install --no-document

# 3. Thêm PATH (thêm vào ~/.zshrc để dùng lâu dài)
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"

# 4. Kiểm tra
pod --version
```

---

## Cách 2: Cài qua Homebrew

Chỉ dùng khi Homebrew không lỗi SSL:

```bash
brew install cocoapods
pod --version
```

---

## Sửa lỗi SSL (nếu muốn dùng Homebrew)

```bash
# Cập nhật CA certificates
brew install ca-certificates

# Hoặc tạm thời bỏ qua SSL (chỉ dùng khi biết rõ rủi ro)
export HOMEBREW_CURL_RETRIES=3
export HOMEBREW_NO_SSL_VERIFY=1
brew install cocoapods
```

---

## Sau khi cài xong

```bash
npx expo run:ios
```
