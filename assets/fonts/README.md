# PDF 中文字体

- `NotoSansSC-Regular.woff` — [Fontsource Noto Sans SC](https://fontsource.org/fonts/noto-sans-sc)（OFL-1.1，见 `NOTO-LICENSE`）
- 使用 WOFF 而非 WOFF2：pdfkit 对 WOFF2 中文渲染不可靠，会导致 PDF 正文空白
- 服务端首次导出时会将 WOFF 转为 TTF 并缓存在内存中；pdfkit 直接使用 WOFF 极慢（数秒），TTF 通常只需几十毫秒
- 可选：预置同目录下的 `NotoSansSC-Regular.ttf` 可跳过转换步骤
- 若服务器已安装系统中文字体（如 Windows 黑体、Linux Noto TTF），会优先使用系统字体
- 用于服务端 PDF 报告生成，生产环境无需再安装系统中文字体
