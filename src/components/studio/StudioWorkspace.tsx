"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Upload,
  X,
  Sparkles,
  Grid3x3,
  LayoutGrid,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { STYLE_PRESETS } from "@/config/styles";
import { THEME_PACKS, buildDefaultSlots } from "@/config/themes";
import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";
import { useSession } from "@/lib/auth-client";

interface UploadedReference {
  id: string;
  previewUrl: string;
  key: string;
  mimeType: string;
  role: "character" | "pet" | "outfit" | "prop";
  uploading: boolean;
}

interface ActivePackJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  masterImageUrl: string | null;
  errorMessage: string | null;
  gridSize: GridSize;
}

const ROLE_OPTIONS: Array<{
  value: "character" | "pet" | "outfit" | "prop";
  zh: string;
  en: string;
}> = [
  { value: "character", zh: "主角人像", en: "Character" },
  { value: "pet", zh: "萌宠", en: "Pet" },
  { value: "outfit", zh: "服装穿搭", en: "Outfit" },
  { value: "prop", zh: "道具配饰", en: "Prop" },
];

async function compressImageToJpeg(file: File, maxDim = 1536): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image compression failed"))),
      "image/jpeg",
      0.88
    );
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  return { blob, dataUrl };
}

export function StudioWorkspace({
  initialStyleId,
  initialThemeId,
  cost3x3,
  cost4x4,
}: {
  initialStyleId?: string;
  initialThemeId?: string;
  cost3x3: number;
  cost4x4: number;
}) {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  const validInitialStyle =
    STYLE_PRESETS.find((s) => s.id === initialStyleId)?.id ?? STYLE_PRESETS[0].id;
  const validInitialTheme =
    THEME_PACKS.find((t) => t.id === initialThemeId)?.id ?? THEME_PACKS[0].id;

  const [styleId, setStyleId] = useState(validInitialStyle);
  const [themeId, setThemeId] = useState(validInitialTheme);
  const [gridSize, setGridSize] = useState<GridSize>("3x3");
  const [captionMode, setCaptionMode] = useState<CaptionMode>(isZh ? "zh" : "en");
  const [userPrompt, setUserPrompt] = useState("");
  const [slots, setSlots] = useState<StickerSlotSnapshot[]>(() =>
    buildDefaultSlots(validInitialTheme, "3x3", isZh ? "zh" : "en")
  );
  const [references, setReferences] = useState<UploadedReference[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ActivePackJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentCost = gridSize === "4x4" ? cost4x4 : cost3x3;

  // Fetch credit balance when logged in
  useEffect(() => {
    if (!session?.user) {
      setBalance(null);
      return;
    }
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { balance?: number } | null) => {
        if (typeof data?.balance === "number") {
          setBalance(data.balance);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  // Poll active generation job
  useEffect(() => {
    if (!activeJob || activeJob.status === "COMPLETED" || activeJob.status === "FAILED") {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/packs/${activeJob.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { pack: ActivePackJob };
        setActiveJob(data.pack);
        if (data.pack.status === "FAILED") {
          // Refresh balance to show auto-refund
          fetch("/api/credits")
            .then((r) => (r.ok ? r.json() : null))
            .then((c: { balance?: number } | null) => {
              if (typeof c?.balance === "number") setBalance(c.balance);
            })
            .catch(() => {});
        }
      } catch {
        // Ignore transient network errors while polling
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [activeJob]);

  function handleSelectTheme(nextThemeId: string) {
    setThemeId(nextThemeId);
    setSlots(buildDefaultSlots(nextThemeId, gridSize, captionMode));
  }

  function handleSelectGridSize(nextGrid: GridSize) {
    setGridSize(nextGrid);
    setSlots(buildDefaultSlots(themeId, nextGrid, captionMode));
  }

  function handleSelectCaptionMode(nextMode: CaptionMode) {
    setCaptionMode(nextMode);
    setSlots(buildDefaultSlots(themeId, gridSize, nextMode));
  }

  function handleResetSlots() {
    setSlots(buildDefaultSlots(themeId, gridSize, captionMode));
  }

  function updateSlotCaption(index: number, caption: string) {
    setSlots((prev) =>
      prev.map((slot) => (slot.index === index ? { ...slot, caption } : slot))
    );
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = 4 - references.length;
    const selected = Array.from(files).slice(0, remaining);

    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      const tempId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setReferences((prev) => [
        ...prev,
        {
          id: tempId,
          previewUrl,
          key: "",
          mimeType: "image/jpeg",
          role: prev.length === 0 ? "character" : "outfit",
          uploading: true,
        },
      ]);

      try {
        const { blob, dataUrl } = await compressImageToJpeg(file);
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "image/jpeg",
            fileSize: blob.size,
          }),
        });

        if (presignRes.status === 401) {
          throw new Error(isZh ? "请先登录后再上传参考图" : "Please sign in before uploading photos");
        }

        if (!presignRes.ok) {
          throw new Error(isZh ? "获取上传地址失败" : "Failed to initialize upload");
        }

        const presign = (await presignRes.json()) as {
          mode: "r2" | "inline";
          uploadUrl?: string;
          key?: string;
        };

        let finalKey = dataUrl;
        if (presign.mode === "r2" && presign.uploadUrl && presign.key) {
          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (!putRes.ok) {
            throw new Error(isZh ? "上传参考图到 R2 失败" : "Failed to upload reference image");
          }
          finalKey = presign.key;
        }

        setReferences((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...item, key: finalKey, uploading: false } : item
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setReferences((prev) => prev.filter((item) => item.id !== tempId));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeReference(id: string) {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  function updateReferenceRole(id: string, role: UploadedReference["role"]) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
  }

  const anyUploading = useMemo(() => references.some((r) => r.uploading), [references]);

  async function handleGenerate() {
    setError(null);

    if (!session?.user) {
      setError(isZh ? "请先登录后再生成表情包" : "Please sign in to generate a sticker pack");
      return;
    }

    if (!userPrompt.trim() && references.length === 0) {
      setError(
        isZh
          ? "请填写角色/内容描述，或至少上传 1 张参考照片"
          : "Please enter a character description or upload at least 1 reference photo"
      );
      return;
    }

    if (anyUploading) {
      setError(isZh ? "参考图正在上传，请稍候..." : "Reference photos are still uploading...");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gridSize,
          styleId,
          themeId,
          captionMode,
          userPrompt: userPrompt.trim(),
          slots,
          references: references.map((r) => ({
            key: r.key,
            role: r.role,
            mimeType: r.mimeType,
          })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        packId?: string;
        remainingBalance?: number;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          setError(
            isZh
              ? `积分不足（需要 ${currentCost} 积分），请先前往积分页面充值`
              : `Not enough credits (needs ${currentCost}). Please top up on Pricing.`
          );
        } else {
          setError(data.error || (isZh ? "创建生成任务失败" : "Failed to start generation"));
        }
        return;
      }

      if (typeof data.remainingBalance === "number") {
        setBalance(data.remainingBalance);
      }

      if (data.packId) {
        setActiveJob({
          id: data.packId,
          status: "PENDING",
          masterImageUrl: null,
          errorMessage: null,
          gridSize,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {isZh ? "4K 表情包创作工作台" : "4K Sticker Pack Studio"}
          </h1>
          <p className="text-sm font-medium text-[#645E78]">
            {isZh
              ? "上传参考图或描述角色 → 选定锁定画风与主题套组 → 一键生成 4K 1:1 整套贴纸"
              : "Upload reference photos or describe your character → Pick a curated style & theme → Generate 4K 1:1 sticker sheet"}
          </p>
        </div>

        {session?.user ? (
          <Link
            href={`/${locale}/pricing`}
            className="sticker-card flex items-center gap-2 bg-[#FFF3C4] px-4 py-2 text-sm font-extrabold"
          >
            <Coins className="h-4 w-4 text-[#FB5607]" />
            <span>
              {isZh ? "当前余额：" : "Credits: "}
              {balance === null ? "..." : balance}
            </span>
          </Link>
        ) : (
          <Link
            href={`/${locale}/auth`}
            className="sticker-btn bg-[#FF6B6B] px-5 py-2 text-sm font-extrabold text-white"
          >
            {isZh ? "登录领取 20 免费积分" : "Sign In for 20 Free Credits"}
          </Link>
        )}
      </div>

      {/* Step 1: Subject & Reference Photos */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#FF8FAB] text-xs font-black">
            1
          </span>
          <h2 className="text-lg font-black">
            {isZh ? "主体描述与参考照片（0~4 张）" : "Subject & Reference Photos (0–4)"}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Reference Photo Uploader */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#1E1B2E]">
                {isZh ? "参考照片（可选，支持人像/萌宠/穿搭）" : "Reference Photos (Optional)"}
              </label>
              <span className="text-xs font-bold text-[#645E78]">{references.length} / 4</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="relative rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] p-1.5 space-y-1.5"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                    <img
                      src={ref.previewUrl}
                      alt="Reference"
                      className="h-full w-full object-cover"
                    />
                    {ref.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeReference(ref.id)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#1E1B2E] bg-white text-[#1E1B2E] hover:bg-[#FF6B6B] hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <select
                    value={ref.role}
                    onChange={(e) =>
                      updateReferenceRole(ref.id, e.target.value as UploadedReference["role"])
                    }
                    className="w-full rounded-lg border border-[#1E1B2E] bg-white px-1.5 py-1 text-[11px] font-bold outline-none"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isZh ? opt.zh : opt.en}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {references.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#1E1B2E]/50 bg-[#FFFDF7] text-[#645E78] hover:border-[#1E1B2E] hover:bg-[#FFF3C4]/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[11px] font-bold">
                    {isZh ? "上传照片" : "Add Photo"}
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Character Description */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh
                ? "角色 / 宠物描述（可写发型、穿搭、配饰、毛色等）"
                : "Character / Pet Description (hair, outfit, accessories, colors)"}
            </label>
            <textarea
              rows={5}
              maxLength={600}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={
                isZh
                  ? "例如：一只圆滚滚的橘白胖猫，戴着红色针织小围巾和圆框眼镜，呆萌可爱..."
                  : "e.g., A chubby orange-and-white tabby cat wearing a cozy red knit scarf and round glasses..."
              }
              className="w-full rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] p-3 text-sm font-medium outline-none focus:bg-white"
            />
            <p className="text-[11px] font-medium text-[#645E78]">
              {isZh
                ? "提示：画风与纯白背景排版由下方预设自动锁定，这里只需专注描述主角长相和特征即可。"
                : "Tip: Art style and pure-white grid layout are locked by presets below—just describe your subject here."}
            </p>
          </div>
        </div>
      </section>

      {/* Step 2: Curated Art Style */}
      <section className="sticker-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] text-xs font-black">
            2
          </span>
          <h2 className="text-lg font-black">
            {isZh ? "选择精选锁定画风" : "Choose Curated Art Style"}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STYLE_PRESETS.map((style) => {
            const active = style.id === styleId;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setStyleId(style.id)}
                className={`rounded-2xl border-2 border-[#1E1B2E] p-4 text-left transition-all cursor-pointer ${
                  active
                    ? "bg-[#FFF3C4] shadow-[4px_4px_0px_#1E1B2E] -translate-y-0.5"
                    : "bg-[#FFFDF7] hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#1E1B2E] text-lg"
                    style={{ backgroundColor: style.accentColor }}
                  >
                    {style.badgeEmoji}
                  </span>
                  {active && (
                    <span className="rounded-full border border-[#1E1B2E] bg-[#FF6B6B] px-2 py-0.5 text-[10px] font-black text-white">
                      {isZh ? "已选" : "Selected"}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 font-black text-sm">
                  {isZh ? style.nameZh : style.nameEn}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-[#645E78]">
                  {isZh ? style.taglineZh : style.taglineEn}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Grid Size & Caption Language */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#8ECAE6] text-xs font-black">
            3
          </span>
          <h2 className="text-lg font-black">
            {isZh ? "宫格数量与配文模式" : "Grid Layout & Caption Mode"}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Grid Size */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "4K 1:1 宫格规格" : "4K 1:1 Grid Size"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectGridSize("3x3")}
                className={`flex items-center justify-between rounded-xl border-2 border-[#1E1B2E] p-3.5 text-left cursor-pointer ${
                  gridSize === "3x3"
                    ? "bg-[#FFF3C4] shadow-[3px_3px_0px_#1E1B2E]"
                    : "bg-[#FFFDF7]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Grid3x3 className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-black">3 × 3 (9 张)</div>
                    <div className="text-[11px] font-bold text-[#645E78]">
                      {cost3x3} {isZh ? "积分" : "credits"}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGridSize("4x4")}
                className={`flex items-center justify-between rounded-xl border-2 border-[#1E1B2E] p-3.5 text-left cursor-pointer ${
                  gridSize === "4x4"
                    ? "bg-[#FFF3C4] shadow-[3px_3px_0px_#1E1B2E]"
                    : "bg-[#FFFDF7]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-black">4 × 4 (16 张)</div>
                    <div className="text-[11px] font-bold text-[#645E78]">
                      {cost4x4} {isZh ? "积分" : "credits"}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Caption Mode */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "贴纸配文语言" : "Sticker Captions"}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: "none", zh: "纯表情无字", en: "No Text" },
                  { id: "zh", zh: "中文配文", en: "Chinese" },
                  { id: "en", zh: "英文配文", en: "English" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSelectCaptionMode(mode.id)}
                  className={`rounded-xl border-2 border-[#1E1B2E] py-3.5 text-center text-xs font-black cursor-pointer ${
                    captionMode === mode.id
                      ? "bg-[#2EC4B6] text-white shadow-[3px_3px_0px_#1E1B2E]"
                      : "bg-[#FFFDF7] text-[#1E1B2E]"
                  }`}
                >
                  {isZh ? mode.zh : mode.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Theme Pack & Per-Slot Caption Editor */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#B8F2E6] text-xs font-black">
              4
            </span>
            <h2 className="text-lg font-black">
              {isZh ? "主题套组与单格文案微调" : "Theme Pack & Slot Captions"}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetSlots}
            className="flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] bg-white px-3 py-1 text-xs font-bold hover:bg-[#FFF3C4] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isZh ? "恢复默认文案" : "Reset Defaults"}</span>
          </button>
        </div>

        {/* Theme Tabs */}
        <div className="flex flex-wrap gap-2">
          {THEME_PACKS.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] px-4 py-1.5 text-xs font-extrabold cursor-pointer ${
                  active
                    ? "bg-[#1E1B2E] text-white"
                    : "bg-[#FFFDF7] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                }`}
              >
                <span>{theme.emoji}</span>
                <span>{isZh ? theme.nameZh : theme.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* Editable Slot Grid */}
        <div
          className={`grid gap-3 ${
            gridSize === "4x4" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {slots.map((slot) => (
            <div
              key={slot.index}
              className="rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-black text-[#645E78]">
                <span>#{slot.index + 1}</span>
                {captionMode === "none" && (
                  <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px]">
                    {isZh ? "无文字" : "No text"}
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-[11px] font-medium text-[#645E78] min-h-[2rem]">
                {slot.pose}
              </p>
              {captionMode !== "none" && (
                <input
                  type="text"
                  maxLength={12}
                  value={slot.caption}
                  onChange={(e) => updateSlotCaption(slot.index, e.target.value)}
                  placeholder={isZh ? "输入短文案" : "Short text"}
                  className="w-full rounded-lg border-2 border-[#1E1B2E] bg-white px-2.5 py-1 text-xs font-extrabold text-[#1E1B2E] outline-none focus:bg-[#FFF3C4]/40"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#EE5253] bg-[#FFF0F0] px-4 py-3 text-sm font-bold text-[#EE5253]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Generation Result / Progress Card */}
      {activeJob && (
        <section className="sticker-card bg-[#FFFDF7] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {activeJob.status === "COMPLETED" ? (
                <CheckCircle2 className="h-6 w-6 text-[#2EC4B6]" />
              ) : activeJob.status === "FAILED" ? (
                <AlertCircle className="h-6 w-6 text-[#EE5253]" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6B6B]" />
              )}
              <h3 className="text-lg font-black">
                {activeJob.status === "PENDING" &&
                  (isZh ? "任务排队中，正在组装 4K Prompt..." : "Queued, preparing 4K prompt...")}
                {activeJob.status === "PROCESSING" &&
                  (isZh ? "AI 正在绘制 4K 1:1 表情包宫格大图..." : "Generating your 4K 1:1 sticker sheet...")}
                {activeJob.status === "COMPLETED" &&
                  (isZh ? "4K 表情包大图生成完成！" : "Your 4K Sticker Sheet is Ready!")}
                {activeJob.status === "FAILED" &&
                  (isZh ? "生成失败（积分已自动全额退还）" : "Generation Failed (Credits Auto-Refunded)")}
              </h3>
            </div>

            {activeJob.status === "COMPLETED" && (
              <Link
                href={`/${locale}/packs/${activeJob.id}`}
                className="sticker-btn inline-flex items-center gap-2 bg-[#2EC4B6] px-5 py-2 text-sm font-extrabold text-white"
              >
                <span>{isZh ? "进入实时切图 / 抠图 / 打包下载" : "Open Cutout & ZIP Exporter"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {activeJob.status === "FAILED" && activeJob.errorMessage && (
            <p className="text-xs font-bold text-[#EE5253]">{activeJob.errorMessage}</p>
          )}

          {activeJob.status === "COMPLETED" && activeJob.masterImageUrl && (
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-[#1E1B2E] bg-white p-2">
              <img
                src={activeJob.masterImageUrl}
                alt="Generated 4K Sticker Sheet"
                className="w-full rounded-xl"
              />
            </div>
          )}
        </section>
      )}

      {/* Sticky Bottom Generate Bar */}
      <div className="fixed bottom-4 left-0 right-0 z-30 px-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-full border-2 border-[#1E1B2E] bg-white px-5 py-3 shadow-[4px_4px_0px_#1E1B2E]">
          <div className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-[#1E1B2E]">
            <ImageIcon className="h-4 w-4 text-[#FF6B6B]" />
            <span>
              4K 1:1 · {gridSize} ·{" "}
              {isZh ? `消耗 ${currentCost} 积分` : `${currentCost} credits`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              submitting ||
              anyUploading ||
              activeJob?.status === "PENDING" ||
              activeJob?.status === "PROCESSING"
            }
            className="sticker-btn ml-auto flex items-center gap-2 bg-[#FF6B6B] px-7 py-2.5 text-sm font-black text-white cursor-pointer disabled:opacity-60"
          >
            {submitting ||
            activeJob?.status === "PENDING" ||
            activeJob?.status === "PROCESSING" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isZh ? "生成中..." : "Generating..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {isZh
                    ? `一键生成 4K 表情包（${currentCost} 积分）`
                    : `Generate 4K Pack (${currentCost} Credits)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
