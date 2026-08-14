# PDF 中文字体

字体文件 **不提交到 Git**（约 1.5MB），以减小仓库体积、方便 `git pull`。

## 自动下载

`npm install` 时会执行 `scripts/ensure-pdf-font.cjs`，从 CDN 下载：

- 目标路径：`NotoSansSC-Regular.woff`
- 来源：[Fontsource Noto Sans SC](https://fontsource.org/fonts/noto-sans-sc)（OFL-1.1，见 `NOTO-LICENSE`）

手动下载：

```bash
npm run fonts:ensure
```

跳过下载（CI 等）：`SKIP_PDF_FONT_DOWNLOAD=1 npm install`

## 使用说明

- 使用 WOFF 而非 WOFF2：pdfkit 对 WOFF2 中文渲染不可靠
- 服务端首次导出时会将 WOFF 转为 TTF 并缓存在内存中
- 若服务器已安装系统中文字体（Windows 黑体、Linux Noto TTF/OTF），会优先使用系统字体
- **不支持 `.ttc` 字体集合**（如 Linux 的 NotoSansCJK-Regular.ttc），pdfkit 会报错；此时会自动改用 bundled WOFF
- 可选：手动放置同目录下的 `NotoSansSC-Regular.ttf` 可跳过 WOFF 转换
