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
  Shuffle,
  Loader2,
  AlertCircle,
  Coins,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { STYLE_PRESETS, type StyleCategory } from "@/config/styles";
import {
  THEME_PACKS,
  THEME_POSE_VARIANT_COUNT,
  buildCustomCaptionPose,
  buildDefaultSlots,
  isDefaultSlotCaption,
  normalizePoseVariant,
} from "@/config/themes";
import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";
import { useSession } from "@/lib/auth-client";
import { PackExporter } from "../exporter/PackExporter";

interface UploadedReference {
  id: string;
  previewUrl: string;
  url: string;
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

interface SavedDraftReference {
  url: string;
  previewUrl: string;
  mimeType: string;
  role: "character" | "pet" | "outfit" | "prop";
}

interface StudioDraft {
  userPrompt: string;
  styleId: string;
  themeId: string;
  gridSize: GridSize;
  captionMode: CaptionMode;
  poseVariant?: number;
  slots: StickerSlotSnapshot[];
  editedIndices?: number[];
  references?: SavedDraftReference[];
}

const DRAFT_STORAGE_KEY = "stickerjam_studio_draft_v1";

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

const INSPIRATION_PROMPTS = [
  {
    labelZh: "🍊 橘白胖猫",
    labelEn: "🍊 Chubby Tabby Cat",
    promptZh: "一只圆滚滚的橘白胖猫，戴着红色针织小围巾和圆框眼镜，呆萌可爱",
    promptEn: "A chubby orange-and-white tabby cat wearing a cozy red knit scarf and round glasses",
  },
  {
    labelZh: "🐕 柴犬打工人",
    labelEn: "🐕 Office Shiba",
    promptZh: "穿蓝色条纹衬衫、戴黑框眼镜和小领带的黄色柴犬，怀里抱着冰美式咖啡",
    promptEn: "A cute Shiba Inu wearing a blue striped shirt, tie, and glasses holding iced coffee",
  },
  {
    labelZh: "👧 软萌短发女孩",
    labelEn: "👧 Bob-Hair Girl",
    promptZh: "齐刘海棕色波波头少女，戴黄色蝴蝶结发夹，穿奶白色毛衣，灵动元气",
    promptEn: "A cheerful girl with a brown bob haircut, yellow bow clip, and cozy cream sweater",
  },
  {
    labelZh: "🐾 奶油小柯基",
    labelEn: "🐾 Cream Corgi",
    promptZh: "大耳朵奶油色短腿小柯基，戴着草莓图案小领结，笑容灿烂治愈",
    promptEn: "A fluffy cream-colored Corgi puppy with big ears wearing a tiny strawberry bowtie",
  },
];

const STYLE_CATEGORY_FILTERS: Array<{
  id: "all" | StyleCategory;
  zh: string;
  en: string;
}> = [
  { id: "all", zh: `全部 (${STYLE_PRESETS.length})`, en: `All (${STYLE_PRESETS.length})` },
  { id: "illustration", zh: "手绘插画", en: "Illustration" },
  { id: "3d-craft", zh: "3D 潮玩质感", en: "3D & Craft" },
  { id: "pop-fun", zh: "潮流趣味", en: "Pop & Meme" },
];

async function compressImageToJpeg(file: File, maxDim = 1536): Promise<Blob> {
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
  return blob;
}

export function StudioWorkspace({
  initialStyleId,
  initialThemeId,
  isRemix = false,
  cost3x3,
  cost4x4,
}: {
  initialStyleId?: string;
  initialThemeId?: string;
  isRemix?: boolean;
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
  const [styleCategory, setStyleCategory] = useState<"all" | StyleCategory>("all");
  const [themeId, setThemeId] = useState(validInitialTheme);
  const [gridSize, setGridSize] = useState<GridSize>("3x3");
  const [captionMode, setCaptionMode] = useState<CaptionMode>(isZh ? "zh" : "en");
  const [poseVariant, setPoseVariant] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [slots, setSlots] = useState<StickerSlotSnapshot[]>(() =>
    buildDefaultSlots(validInitialTheme, "3x3", isZh ? "zh" : "en")
  );
  const [editedIndices, setEditedIndices] = useState<number[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [showRemixBanner, setShowRemixBanner] = useState(isRemix);

  const [references, setReferences] = useState<UploadedReference[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [guestUploadNotice, setGuestUploadNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ActivePackJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  function revokePreviewUrl(url: string) {
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  // Restore saved draft from sessionStorage on mount (respecting explicit URL query presets)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StudioDraft>;
        if (typeof parsed.userPrompt === "string") setUserPrompt(parsed.userPrompt);
        if (!initialStyleId && parsed.styleId && STYLE_PRESETS.some((s) => s.id === parsed.styleId)) {
          setStyleId(parsed.styleId);
        }
        const nextGrid: GridSize = parsed.gridSize === "4x4" ? "4x4" : "3x3";
        if (parsed.gridSize === "3x3" || parsed.gridSize === "4x4") {
          setGridSize(nextGrid);
        }
        const nextMode: CaptionMode =
          parsed.captionMode === "none" || parsed.captionMode === "zh" || parsed.captionMode === "en"
            ? parsed.captionMode
            : isZh
              ? "zh"
              : "en";
        setCaptionMode(nextMode);

        const nextVariant =
          typeof parsed.poseVariant === "number"
            ? normalizePoseVariant(parsed.poseVariant)
            : 0;
        const canReuseDraftTheme =
          !initialThemeId || isRemix || parsed.themeId === validInitialTheme;

        if (canReuseDraftTheme && parsed.themeId && THEME_PACKS.some((t) => t.id === parsed.themeId)) {
          const effectiveThemeId = initialThemeId ? validInitialTheme : parsed.themeId;
          setThemeId(effectiveThemeId);
          setPoseVariant(nextVariant);
          if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
            setSlots(parsed.slots);
          } else {
            setSlots(buildDefaultSlots(effectiveThemeId, nextGrid, nextMode, nextVariant));
          }
          if (Array.isArray(parsed.editedIndices)) {
            setEditedIndices(parsed.editedIndices);
          }
        } else if (initialThemeId) {
          setPoseVariant(isRemix ? nextVariant : 0);
          setSlots(buildDefaultSlots(validInitialTheme, nextGrid, nextMode, isRemix ? nextVariant : 0));
        }

        if (isRemix && Array.isArray(parsed.references) && parsed.references.length > 0) {
          const restoredRefs: UploadedReference[] = parsed.references
            .filter(
              (ref): ref is SavedDraftReference =>
                Boolean(ref && typeof ref.url === "string" && typeof ref.previewUrl === "string")
            )
            .slice(0, 4)
            .map((ref) => ({
              id: crypto.randomUUID(),
              url: ref.url,
              previewUrl: ref.previewUrl,
              mimeType: ref.mimeType || "image/jpeg",
              role: ref.role,
              uploading: false,
            }));
          if (restoredRefs.length > 0) {
            setReferences(restoredRefs);
          }
        }
      }
    } catch {
      // Ignore storage access or malformed JSON errors
    } finally {
      setDraftHydrated(true);
    }
  }, [initialStyleId, initialThemeId, validInitialTheme, isRemix, isZh]);

  // Persist draft in sessionStorage so language switching or auth redirects never lose work
  useEffect(() => {
    if (!draftHydrated) return;
    try {
      const persistableReferences: SavedDraftReference[] = references
        .filter((ref) => !ref.uploading && Boolean(ref.url) && !ref.previewUrl.startsWith("blob:"))
        .map((ref) => ({
          url: ref.url,
          previewUrl: ref.previewUrl,
          mimeType: ref.mimeType,
          role: ref.role,
        }));
      const payload: StudioDraft = {
        userPrompt,
        styleId,
        themeId,
        gridSize,
        captionMode,
        poseVariant,
        slots,
        editedIndices,
        references: persistableReferences.length > 0 ? persistableReferences : undefined,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota / private browsing errors
    }
  }, [draftHydrated, userPrompt, styleId, themeId, gridSize, captionMode, poseVariant, slots, editedIndices, references]);

  const currentCost = gridSize === "4x4" ? cost4x4 : cost3x3;
  const isGenerating =
    submitting || activeJob?.status === "PENDING" || activeJob?.status === "PROCESSING";
  const hasInsufficientCredits =
    Boolean(session?.user) && balance !== null && balance < currentCost;

  // Warn before accidentally closing/refreshing tab while AI generation is active
  useEffect(() => {
    if (!isGenerating) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Fetch credit balance when logged in
  useEffect(() => {
    if (!session?.user) {
      setBalance(null);
      return;
    }
    setGuestUploadNotice(false);
    fetch("/api/credits")
      .then((res) => (res.ok ? (res.json() as Promise<{ balance?: number }>) : null))
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
          fetch("/api/credits")
            .then((r) => (r.ok ? (r.json() as Promise<{ balance?: number }>) : null))
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
    setPoseVariant(0);
    setEditedIndices([]);
    setSlots(buildDefaultSlots(nextThemeId, gridSize, captionMode, 0));
  }

  function handleSelectGridSize(nextGrid: GridSize) {
    setGridSize(nextGrid);
    const nextDefaults = buildDefaultSlots(themeId, nextGrid, captionMode, poseVariant);
    const editedSet = new Set(editedIndices);
    setSlots((prev) =>
      nextDefaults.map((def, idx) => {
        if (editedSet.has(idx) && prev[idx]) {
          const prevCaption = prev[idx].caption;
          if (
            captionMode !== "none" &&
            prevCaption.trim().length > 0 &&
            !isDefaultSlotCaption(themeId, idx, captionMode, prevCaption)
          ) {
            const custom = buildCustomCaptionPose(prevCaption, poseVariant);
            return { ...def, pose: custom.pose, poseZh: custom.poseZh, caption: prevCaption };
          }
          return { ...def, caption: prevCaption };
        }
        return def;
      })
    );
  }

  function handleSelectCaptionMode(nextMode: CaptionMode) {
    setCaptionMode(nextMode);
    setEditedIndices([]);
    setSlots(buildDefaultSlots(themeId, gridSize, nextMode, poseVariant));
  }

  function handleResetSlots() {
    setPoseVariant(0);
    setEditedIndices([]);
    setSlots(buildDefaultSlots(themeId, gridSize, captionMode, 0));
  }

  function handleShufflePoses() {
    const nextVariant = normalizePoseVariant(poseVariant + 1);
    setPoseVariant(nextVariant);
    const nextDefaults = buildDefaultSlots(themeId, gridSize, captionMode, nextVariant);
    setSlots((prev) =>
      nextDefaults.map((def, idx) => {
        const currentCaption = captionMode === "none" ? "" : (prev[idx]?.caption ?? def.caption);
        if (
          captionMode !== "none" &&
          currentCaption.trim().length > 0 &&
          !isDefaultSlotCaption(themeId, idx, captionMode, currentCaption)
        ) {
          const custom = buildCustomCaptionPose(currentCaption, nextVariant);
          return {
            index: idx,
            pose: custom.pose,
            poseZh: custom.poseZh,
            caption: currentCaption,
          };
        }
        return {
          ...def,
          caption: currentCaption,
        };
      })
    );
  }

  function updateSlotCaption(index: number, caption: string) {
    const trimmed = caption.trim();
    const isCustom =
      captionMode !== "none" &&
      trimmed.length > 0 &&
      !isDefaultSlotCaption(themeId, index, captionMode, trimmed);

    setEditedIndices((prev) => {
      if (isCustom) {
        return prev.includes(index) ? prev : [...prev, index];
      }
      return prev.filter((i) => i !== index);
    });

    const presetDefault = buildDefaultSlots(themeId, gridSize, captionMode, poseVariant)[index];
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.index !== index) return slot;
        if (isCustom) {
          const custom = buildCustomCaptionPose(trimmed, poseVariant);
          return { ...slot, caption, pose: custom.pose, poseZh: custom.poseZh };
        }
        return {
          ...slot,
          caption,
          pose: presetDefault?.pose ?? slot.pose,
          poseZh: presetDefault?.poseZh ?? slot.poseZh,
        };
      })
    );
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    if (!session?.user) {
      setGuestUploadNotice(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setGuestUploadNotice(false);
    const remaining = 4 - references.length;
    const selected = Array.from(files).slice(0, remaining);

    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      const tempId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);

      setReferences((prev) => [
        ...prev,
        {
          id: tempId,
          previewUrl,
          url: "",
          mimeType: "image/jpeg",
          role: prev.length === 0 ? "character" : "outfit",
          uploading: true,
        },
      ]);

      try {
        const blob = await compressImageToJpeg(file);
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "image/jpeg",
            fileSize: blob.size,
          }),
        });

        if (presignRes.status === 401) {
          setGuestUploadNotice(true);
          throw new Error(isZh ? "请先登录后再上传参考图" : "Please sign in before uploading photos");
        }

        if (!presignRes.ok) {
          const failure = await presignRes.json().catch(() => null) as { error?: string } | null;
          throw new Error(failure?.error || (isZh ? "获取上传地址失败" : "Failed to initialize upload"));
        }

        const presign = (await presignRes.json()) as {
          mode: "r2";
          uploadUrl?: string;
          url?: string;
        };

        if (presign.mode === "r2" && presign.uploadUrl && presign.url) {
          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (!putRes.ok) {
            throw new Error(isZh ? "上传参考图到 R2 失败" : "Failed to upload reference image");
          }
        } else {
          throw new Error(isZh ? "图片存储未正确配置" : "Image storage is not configured");
        }

        setReferences((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...item, url: presign.url!, uploading: false } : item
          )
        );
      } catch (err) {
        revokePreviewUrl(previewUrl);
        setError(err instanceof Error ? err.message : "Upload failed");
        setReferences((prev) => prev.filter((item) => item.id !== tempId));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeReference(id: string) {
    const removed = references.find((r) => r.id === id);
    if (removed) revokePreviewUrl(removed.previewUrl);
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  function updateReferenceRole(id: string, role: UploadedReference["role"]) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
  }

  const anyUploading = useMemo(() => references.some((r) => r.uploading), [references]);

  const visibleStyles = useMemo(() => {
    if (styleCategory === "all") return STYLE_PRESETS;
    return STYLE_PRESETS.filter((s) => s.category === styleCategory);
  }, [styleCategory]);

  async function handleGenerate() {
    setError(null);

    if (!session?.user) {
      setError(isZh ? "请先登录后再生成表情包（当前配置已为您自动暂存）" : "Please sign in to generate (your draft is saved)");
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
    setActiveJob(null);
    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gridSize,
          styleId,
          themeId,
          captionMode,
          poseVariant,
          userPrompt: userPrompt.trim(),
          slots,
          references: references.map((r) => ({
            url: r.url,
            role: r.role,
            mimeType: r.mimeType,
          })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        pack?: ActivePackJob;
        packId?: string;
        remainingBalance?: number;
        error?: string;
        code?: string;
      };

      if (typeof data.remainingBalance === "number") setBalance(data.remainingBalance);
      if (data.pack) setActiveJob(data.pack);

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          setError(
            isZh
              ? `积分不足（需要 ${currentCost} 积分），请先前往积分页面充值`
              : `Not enough credits (needs ${currentCost}). Please top up on Pricing.`
          );
        } else {
          if (!data.pack) setError(data.error || (isZh ? "创建生成任务失败" : "Failed to start generation"));
        }
        return;
      }

      if (data.packId && !data.pack) {
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

  if (activeJob?.status === "COMPLETED") {
    return (
      <PackExporter
        packId={activeJob.id}
        justCompleted
        onStartNew={() => {
          setActiveJob(null);
          handleShufflePoses();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {isZh ? "表情包创作工作台" : "Sticker Pack Studio"}
          </h1>
          <p className="text-sm font-medium text-[#645E78]">
            {isZh
              ? "上传参考图或描述角色 → 选定锁定画风与主题套组 → 一键生成高清 1:1 整套贴纸"
              : "Upload reference photos or describe your character → Pick a curated style & theme → Generate an HD 1:1 sticker sheet"}
          </p>
        </div>

        {session?.user ? (
          <Link
            href="/pricing"
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
            href="/auth"
            className="sticker-btn bg-[#E04848] px-5 py-2 text-sm font-extrabold text-white"
          >
            {isZh ? "登录开始创作" : "Sign In to Create"}
          </Link>
        )}
      </div>

      {/* Remix Banner */}
      {showRemixBanner && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#0F766E]/40 bg-[#E8FAF8] px-4 py-3 text-xs sm:text-sm font-bold text-[#0F766E]">
          <span>
            {isZh
              ? `✨ 已保留原作品的角色、文案与格子顺序，并自动切换为第 ${poseVariant + 1}/${THEME_POSE_VARIANT_COUNT} 套动作演法！`
              : `✨ Kept your character, captions & slot order, and switched to pose take ${poseVariant + 1}/${THEME_POSE_VARIANT_COUNT}!`}
          </span>
          <button
            type="button"
            onClick={() => setShowRemixBanner(false)}
            className="shrink-0 rounded-full p-1 hover:bg-[#0F766E]/10 cursor-pointer"
            aria-label={isZh ? "关闭提示" : "Dismiss"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          <div
            className={`space-y-3 rounded-2xl border-2 border-dashed p-3 transition-colors ${
              isDragging
                ? "border-[#E04848] bg-[#FFF3C4]/50"
                : "border-transparent p-0"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (references.length < 4) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (references.length < 4 && e.dataTransfer.files?.length) {
                handleFileSelect(e.dataTransfer.files);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#1E1B2E]">
                {isZh ? "参考照片（可选，支持点击或拖拽上传）" : "Reference Photos (Click or drag & drop)"}
              </label>
              <span className="text-xs font-bold text-[#645E78]">{references.length} / 4</span>
            </div>

            {guestUploadNotice && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0F766E]/30 bg-[#E8FAF8] px-3.5 py-2.5 text-xs font-bold text-[#0F766E]">
                <span>
                  {isZh
                    ? "已保存你的创作草稿，请先登录后上传参考照片并生成"
                    : "Draft saved. Please sign in to upload reference photos and generate."}
                </span>
                <Link
                  href="/auth"
                  className="rounded-full bg-[#E04848] px-3 py-1 text-[11px] font-black text-white"
                >
                  {isZh ? "立即登录" : "Sign In"}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="sticker-panel relative bg-[#FFFDF7] p-1.5 space-y-1.5"
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
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#1E1B2E] bg-white text-[#1E1B2E] hover:bg-[#E04848] hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <select
                    value={ref.role}
                    onChange={(e) =>
                      updateReferenceRole(ref.id, e.target.value as UploadedReference["role"])
                    }
                    className="w-full rounded-lg border border-[#1E1B2E]/30 bg-white px-1.5 py-1 text-[11px] font-bold outline-none"
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
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#1E1B2E]/35 bg-[#FFFDF7] text-[#645E78] hover:border-[#1E1B2E] hover:bg-[#FFF3C4]/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[11px] font-bold">
                    {isZh ? "上传照片" : "Add Photo"}
                  </span>
                </button>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isZh
                  ? "🔒 上传照片仅用于本次生成，绝不公开展示或用于模型训练"
                  : "🔒 Photos are private and only used for your generation"}
              </span>
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Character Description + Quick Inspiration Chips */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="studio-prompt" className="text-xs font-extrabold text-[#1E1B2E]">
                {isZh
                  ? "角色 / 宠物描述（可写发型、穿搭、配饰、毛色等）"
                  : "Character / Pet Description (hair, outfit, accessories, colors)"}
              </label>
              <span
                className={`text-[11px] font-bold ${
                  userPrompt.length >= 550 ? "text-[#C93636]" : "text-[#645E78]"
                }`}
              >
                {userPrompt.length} / 600
              </span>
            </div>
            <textarea
              id="studio-prompt"
              rows={4}
              maxLength={600}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={
                isZh
                  ? "例如：一只圆滚滚的橘白胖猫，戴着红色针织小围巾和圆框眼镜，呆萌可爱..."
                  : "e.g., A chubby orange-and-white tabby cat wearing a cozy red knit scarf and round glasses..."
              }
              className="w-full rounded-xl border-2 border-[#1E1B2E]/25 bg-[#FFFDF7] p-3 text-sm font-medium outline-none focus:border-[#1E1B2E] focus:bg-white transition-colors"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#645E78]">
                {isZh ? "一键试写示例：" : "Try an example:"}
              </span>
              {INSPIRATION_PROMPTS.map((item) => (
                <button
                  key={item.labelEn}
                  type="button"
                  onClick={() => setUserPrompt(isZh ? item.promptZh : item.promptEn)}
                  className="rounded-full bg-[#F4EFE6] px-2.5 py-1 text-[11px] font-bold text-[#1E1B2E] hover:bg-[#FFF3C4] transition-colors cursor-pointer"
                >
                  {isZh ? item.labelZh : item.labelEn}
                </button>
              ))}
            </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] text-xs font-black">
              2
            </span>
            <h2 className="text-lg font-black">
              {isZh ? "选择精选锁定画风" : "Choose Curated Art Style"}
            </h2>
            <span className="text-xs font-medium text-[#645E78]">
              {isZh
                ? "预览仅展示画风质感，主角以你的照片或描述为准"
                : "Previews show art style only—your subject comes from Step 1"}
            </span>
          </div>

          {/* Style Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={isZh ? "画风分类筛选" : "Style category filter"}>
            {STYLE_CATEGORY_FILTERS.map((cat) => {
              const active = styleCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStyleCategory(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#1E1B2E] text-white"
                      : "bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                  }`}
                >
                  {isZh ? cat.zh : cat.en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleStyles.map((style) => {
            const active = style.id === styleId;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setStyleId(style.id)}
                className={`sticker-panel group overflow-hidden text-left cursor-pointer ${
                  active
                    ? "sticker-panel-active -translate-y-0.5"
                    : "bg-[#FFFDF7] hover:bg-white hover:-translate-y-0.5"
                }`}
              >
                <div className="relative aspect-square w-full overflow-hidden border-b border-[#1E1B2E]/15 bg-[#FFFDF7]">
                  <img
                    src={style.previewImage}
                    alt={isZh ? `${style.nameZh}画风示例` : `${style.nameEn} style preview`}
                    width={480}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {active && (
                    <span className="absolute right-2.5 top-2.5 rounded-full border-2 border-[#1E1B2E] bg-[#E04848] px-2.5 py-0.5 text-[10px] font-black text-white shadow-[2px_2px_0px_#1E1B2E]">
                      {isZh ? "已选" : "Selected"}
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="font-black text-sm text-[#1E1B2E]">
                    {isZh ? style.nameZh : style.nameEn}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#645E78] line-clamp-2">
                    {isZh ? style.taglineZh : style.taglineEn}
                  </div>
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
              {isZh ? "高清 1:1 宫格规格" : "HD 1:1 Grid Size"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectGridSize("3x3")}
                className={`sticker-panel flex items-center justify-between p-3.5 text-left cursor-pointer ${
                  gridSize === "3x3" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Grid3x3 className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-black">3 × 3 (9 {isZh ? "张" : "pcs"})</div>
                    <div className="text-[11px] font-bold text-[#645E78]">
                      {cost3x3} {isZh ? "积分" : "credits"}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGridSize("4x4")}
                className={`sticker-panel flex items-center justify-between p-3.5 text-left cursor-pointer ${
                  gridSize === "4x4" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-black">4 × 4 (16 {isZh ? "张" : "pcs"})</div>
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
                  className={`sticker-panel py-3.5 text-center text-xs font-black cursor-pointer ${
                    captionMode === mode.id
                      ? "!border-[#1E1B2E] !bg-[#0F766E] text-white shadow-[3px_3px_0px_#1E1B2E]"
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShufflePoses}
              className="flex items-center gap-1.5 rounded-full border-2 border-[#0F766E]/50 bg-[#E8FAF8] px-3 py-1 text-xs font-extrabold text-[#0F766E] hover:border-[#0F766E] hover:bg-[#D1F5EF] cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>
                {isZh
                  ? `换一批动作 (${poseVariant + 1}/${THEME_POSE_VARIANT_COUNT})`
                  : `Shuffle Poses (${poseVariant + 1}/${THEME_POSE_VARIANT_COUNT})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleResetSlots}
              className="flex items-center gap-1.5 rounded-full border border-[#1E1B2E]/25 bg-white px-3 py-1 text-xs font-bold hover:border-[#1E1B2E] hover:bg-[#FFF3C4] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isZh ? "恢复默认文案" : "Reset Defaults"}</span>
            </button>
          </div>
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
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
                  active
                    ? "border-2 border-[#1E1B2E] bg-[#1E1B2E] text-white"
                    : "border border-[#1E1B2E]/20 bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
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
              className="sticker-panel bg-[#FFFDF7] p-3 space-y-2"
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
                {isZh ? slot.poseZh || slot.pose : slot.pose}
              </p>
              {captionMode !== "none" && (
                <input
                  type="text"
                  maxLength={12}
                  value={slot.caption}
                  onChange={(e) => updateSlotCaption(slot.index, e.target.value)}
                  placeholder={isZh ? "输入短文案" : "Short text"}
                  className="w-full rounded-lg border border-[#1E1B2E]/30 bg-white px-2.5 py-1 text-xs font-extrabold text-[#1E1B2E] outline-none focus:border-[#1E1B2E] focus:bg-[#FFF3C4]/40"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#C93636] bg-[#FFF0F0] px-4 py-3 text-sm font-bold text-[#C93636]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Generation Result / Progress Card */}
      {submitting && (
        <section className="sticker-card flex items-center justify-between gap-4 bg-[#FFFDF7] p-6" aria-live="polite">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 shrink-0 animate-spin text-[#E04848]" />
            <div>
              <h3 className="text-lg font-black">
                {elapsedSec < 8
                  ? isZh
                    ? "正在校验参考图并组装高清提示词..."
                    : "Preparing references and HD prompt..."
                  : elapsedSec < 35
                    ? isZh
                      ? "AI 正在绘制表情包宫格大图..."
                      : "Generating your HD sticker sheet..."
                    : isZh
                      ? "正在精修细节并保存高清原图..."
                      : "Refining details and saving full-resolution sheet..."}
              </h3>
              <p className="text-sm text-[#645E78]">
                {isZh ? "生成期间请保持此页面打开，通常需要 20–60 秒。" : "Keep this page open while generation completes (typically 20–60s)."}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3 py-1 text-xs font-black text-[#1E1B2E] tabular-nums">
            {isZh ? `已用 ${elapsedSec}s` : `${elapsedSec}s`}
          </span>
        </section>
      )}
      {activeJob && (
        <section className="sticker-card bg-[#FFFDF7] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {activeJob.status === "FAILED" ? (
                <AlertCircle className="h-6 w-6 text-[#C93636]" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-[#E04848]" />
              )}
              <h3 className="text-lg font-black">
                {activeJob.status === "PENDING" &&
                  (isZh ? "任务排队中，正在组装提示词..." : "Queued, preparing prompt...")}
                {activeJob.status === "PROCESSING" &&
                  (isZh ? "AI 正在绘制高清 1:1 表情包宫格大图..." : "Generating your HD 1:1 sticker sheet...")}
                {activeJob.status === "FAILED" &&
                  (isZh ? "生成失败（积分已自动全额退还）" : "Generation Failed (Credits Auto-Refunded)")}
              </h3>
            </div>
          </div>

          {activeJob.status === "FAILED" && activeJob.errorMessage && (
            <p className="text-xs font-bold text-[#C93636]">{activeJob.errorMessage}</p>
          )}
        </section>
      )}

      {/* Sticky Bottom Generate Bar */}
      <div className="fixed bottom-4 left-0 right-0 z-30 px-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-full border-2 border-[#1E1B2E] bg-white px-5 py-3 shadow-[4px_4px_0px_#1E1B2E]">
          <div className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-[#1E1B2E]">
            <ImageIcon className="h-4 w-4 text-[#E04848]" />
            <span>
              {isZh ? "高清 1:1" : "HD 1:1"} · {gridSize} ·{" "}
              {isZh ? `消耗 ${currentCost} 积分` : `${currentCost} credits`}
            </span>
          </div>

          {hasInsufficientCredits && !isGenerating ? (
            <Link
              href="/pricing"
              className="sticker-btn ml-auto flex items-center gap-2 bg-[#FFF3C4] px-6 py-2.5 text-sm font-black text-[#1E1B2E]"
            >
              <Coins className="h-4 w-4 text-[#FB5607]" />
              <span>
                {isZh
                  ? `积分不足（余额 ${balance} / 需 ${currentCost}）· 去充值`
                  : `Low Credits (${balance}/${currentCost}) · Top Up`}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || anyUploading}
              className="sticker-btn ml-auto flex items-center gap-2 bg-[#E04848] px-7 py-2.5 text-sm font-black text-white cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isZh ? `生成中 (${elapsedSec}s)...` : `Generating (${elapsedSec}s)...`}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isZh
                      ? `一键生成高清表情包（${currentCost} 积分）`
                      : `Generate HD Pack (${currentCost} Credits)`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
