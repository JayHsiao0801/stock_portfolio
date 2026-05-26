# 建置紀錄

記錄專案建置過程中遇到的問題與解法，供部署時參考。

---

## 環境資訊

- 平台：macOS 25.5.0
- Node.js：（執行 `node -v` 查看）
- npm：（執行 `npm -v` 查看）

---

## 建置流程

### Step 1：Next.js 專案初始化

**指令：**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-git --import-alias "@/*"
```

**問題：npm cache 權限錯誤**

錯誤訊息：
```
npm error errno EEXIST
npm error EACCES: permission denied, mkdir '/Users/xxx/.npm/_cacache/...'
```

**原因：** npm 快取目錄的擁有者不是當前使用者（通常是之前用 sudo 執行過 npm 導致）。

**解法：**
```bash
# 修復 npm cache 目錄權限
sudo chown -R $(whoami) ~/.npm
```

**Windows 上的對應解法：**
通常 Windows 不會遇到此問題。若出現權限錯誤，以「系統管理員身分」開啟命令提示字元後重試。

---

### Step 2：Prisma 版本相容問題

**問題：** Prisma 7 要求 Node.js 20.19+，但當時環境為 v20.16。

```
npm error Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+.
```

**解法：** 安裝 Prisma 6（相容 Node.js 20.x 任何版本）：
```bash
npm install prisma@^6 @prisma/client@^6
```

**換機建議：** 安裝 Node.js 20.19 以上的 LTS 版本可直接使用最新 Prisma。

---

### Step 3：Prisma 6 環境變數載入方式改變

**問題：** Prisma 6 預設不自動讀取 `.env` 檔（改用 `prisma.config.ts`）。執行 seed 腳本時出現：

```
error: Environment variable not found: DATABASE_URL.
```

**解法：** 在 seed 腳本頂端加入：
```typescript
import "dotenv/config";
```

---

### Step 4：shadcn/ui 改用 @base-ui/react（無 asChild prop）

**問題：** 新版 shadcn/ui 使用 `@base-ui/react` 而非 `@radix-ui`。`DropdownMenuTrigger` 不支援 `asChild` prop，必須改用 `render` prop 或直接傳入 children。

**舊寫法（會報錯）：**
```tsx
<DropdownMenuTrigger asChild>
  <Button>...</Button>
</DropdownMenuTrigger>
```

**新寫法：**
```tsx
<DropdownMenuTrigger render={<Button>...</Button>} />
```

---

### Step 5：Vercel AI SDK v6 改版 - streamText 方法名稱

**問題：** `streamText().toDataStreamResponse()` 在 AI SDK v6 中不存在。

**解法：** 改用 `toTextStreamResponse()`：
```typescript
const result = streamText({ model, system, messages });
return result.toTextStreamResponse();
```

---

### Step 6：AI SDK v6 - useChat 從 @ai-sdk/react 移出且 API 大幅改變

**問題：** `useChat` 在 AI SDK v6 (`@ai-sdk/react` v3) 的 API 完全重寫：
- 舊 API：返回 `{ messages, input, handleInputChange, handleSubmit, isLoading }`
- 新 API：返回 `{ messages, sendMessage, status }` 且 `messages` 為 `UIMessage[]`（有 `parts` 陣列，無直接 `content` 字串）

**解法：** 不依賴 `useChat` hook，改用自建的 streaming hook，直接用 `fetch` 呼叫 `/api/chat` 並解析 Server-Sent Events 或純文字串流。

---

### Step 7：@hookform/resolvers v5 不再內建 zodResolver

**問題：** `@hookform/resolvers` v5 移除了 `zodResolver`，改採 Standard Schema 規範。

**解法：** 使用 `standardSchemaResolver`（Zod v4 已實作 Standard Schema）：
```typescript
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
// ...
resolver: standardSchemaResolver(schema),
```

**額外注意：** `z.coerce.number()` 在 Zod v4 中 input type 為 `unknown`，會造成型別錯誤。
改用 `z.number()` 並在 register 時加 `{ valueAsNumber: true }`：
```tsx
<Input {...register("shares", { valueAsNumber: true })} type="number" />
```

---

### Step 8：Zod v4 schema 的 `.default()` 造成型別不符

**問題：** `z.string().default("TWD")` 在 Zod v4 中，input type 為 `string | undefined`，output 為 `string`，導致 react-hook-form 型別錯誤。

**解法：** 移除 schema 中的 `.default()`，改在 `useForm` 的 `defaultValues` 或 `values` 中提供預設值：
```typescript
// schema
currency: z.string(),  // 非 z.string().default("TWD")

// form
defaultValues: { currency: "TWD", ... }
```

---

### Step 9：Next.js 無法開啟 SQLite 資料庫（Error code 14）

**問題：** Prisma 6 的相對路徑 `file:./prisma/dev.db` 在 Next.js runtime 無法正確解析，導致：
```
Error querying the database: Error code 14: Unable to open the database file
```

**原因：** Prisma client 在 Next.js 中解析相對路徑的 base 不一定是 `process.cwd()`。

**解法：** 在 `src/lib/prisma.ts` 中用 `path.resolve` 將相對路徑轉成絕對路徑：
```typescript
import path from "path";
const dbUrl = process.env.DATABASE_URL?.startsWith("file:./")
  ? `file:${path.resolve(process.cwd(), process.env.DATABASE_URL.slice(5))}`
  : process.env.DATABASE_URL;
new PrismaClient({ datasources: { db: { url: dbUrl } } })
```

---

（後續遇到問題時會持續更新此紀錄）
