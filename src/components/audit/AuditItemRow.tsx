import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, History, MinusCircle, Trash2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { OR_ROLE_LABELS } from "../../constants";
import { AuditItem, AuditItemPriority, OrResponsibleRole } from "../../types";

interface AuditItemRowProps {
  rowId?: string;
  question: string;
  index: number;
  item?: AuditItem;
  required?: boolean;
  block?: string;
  description?: string;
  responsibleRoles?: OrResponsibleRole[];
  allowsNa?: boolean;
  priority?: AuditItemPriority;
  guidance?: string;
  requiresCommentOnFail?: boolean;
  emphasized?: boolean;
  showStructuredQuestion?: boolean;
  onStatusToggle: (status: "pass" | "fail" | "na") => void;
  onCommentUpdate: (comment: string) => void;
  onPhotoUpdate: (photoUrl?: string) => void;
}

async function compressImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));
    img.src = dataUrl;
  });

  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function AuditItemRow({
  rowId,
  question,
  index,
  item,
  required = false,
  block,
  description,
  responsibleRoles = [],
  allowsNa = true,
  priority = "medium",
  guidance,
  requiresCommentOnFail = false,
  emphasized = false,
  showStructuredQuestion = false,
  onStatusToggle,
  onCommentUpdate,
  onPhotoUpdate,
}: AuditItemRowProps) {
  const [showComment, setShowComment] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const separatorIndex = question.indexOf(":");
  const hasStructuredCopy = showStructuredQuestion && separatorIndex > -1;
  const questionTitle = hasStructuredCopy ? question.slice(0, separatorIndex).trim() : question;
  const questionHint = hasStructuredCopy ? question.slice(separatorIndex + 1).trim() : "";
  const questionOrderMatch = questionTitle.match(/^(\d+)[.)\-\s]+(.+)$/);
  const questionOrder = questionOrderMatch?.[1] ?? String(index + 1).padStart(2, "0");
  const questionMainCopy = questionOrderMatch?.[2] ?? questionTitle;
  const isOrdersStyle = showStructuredQuestion;
  const normalizedBlock = block?.trim() || "General";
  const normalizedDescription = description?.trim() || "";
  const normalizedGuidance = guidance?.trim() || "";
  const priorityLabel = priority === "high" ? "Crítico" : priority === "medium" ? "Medio" : "Bajo";
  const currentStatusLabel =
    item?.status === "pass" ? "Cumple" :
    item?.status === "fail" ? "No cumple" :
    item?.status === "na" ? "N/A" : "Pendiente";

  useEffect(() => {
    if (item?.status === "fail" && requiresCommentOnFail) {
      setShowComment(true);
    }
  }, [item?.status, requiresCommentOnFail]);

  const handlePhotoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const compressedImage = await compressImage(file);
      onPhotoUpdate(compressedImage);
      setShowComment(true);
    } catch {
      alert("No se pudo adjuntar la foto seleccionada.");
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  return (
    <motion.div
      id={rowId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "border transition-all duration-300 space-y-3 scroll-mt-32",
        isOrdersStyle
          ? "bg-white rounded-[1.5rem] p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] border-slate-200/80"
          : "bg-white rounded-[1.7rem] p-4 shadow-sm",
        emphasized && (isOrdersStyle
          ? "ring-2 ring-offset-2 ring-blue-500 shadow-[0_18px_50px_rgba(59,130,246,0.16)]"
          : "ring-2 ring-offset-2 ring-blue-300"),
        item?.status
          ? (isOrdersStyle ? "border-slate-300" : "border-gray-200")
          : (isOrdersStyle ? "border-slate-200 ring-1 ring-slate-100" : "border-gray-100 ring-1 ring-gray-50")
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.18em]",
              isOrdersStyle ? "bg-slate-900 text-white" : "text-gray-400 bg-gray-100"
            )}>
              Punto {questionOrder}
            </span>
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border",
              item?.status === "pass" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              item?.status === "fail" && "border-red-200 bg-red-50 text-red-700",
              item?.status === "na" && "border-slate-200 bg-slate-100 text-slate-600",
              !item?.status && "border-amber-200 bg-amber-50 text-amber-700"
            )}>
              {currentStatusLabel}
            </span>
            {required && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border border-blue-200 bg-blue-50 text-blue-700">
                Obligatorio
              </span>
            )}
            <span className="hidden sm:inline-flex text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border border-slate-200 bg-white text-slate-600">
              {normalizedBlock}
            </span>
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border",
              priority === "high" ? "border-red-200 bg-red-50 text-red-700" :
              priority === "medium" ? "border-amber-200 bg-amber-50 text-amber-700" :
              "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}>
              {priorityLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className={cn(
              "leading-snug",
              isOrdersStyle ? "font-black text-slate-900 text-[0.96rem] md:text-[1rem] tracking-[-0.02em]" : "font-bold text-gray-800 text-sm md:text-base"
            )}>
              {questionMainCopy}
            </p>
            <div className="sm:hidden flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border border-slate-200 bg-white text-slate-600">
                {normalizedBlock}
              </span>
            </div>
            {questionHint && (
              <p className={cn(
                "text-[11px] leading-snug rounded-xl px-3 py-2 border",
                isOrdersStyle
                  ? "text-slate-600 bg-slate-50 border-slate-200"
                  : "text-gray-500 bg-slate-50 border-slate-100"
              )}>
                {questionHint}
              </p>
            )}
            {normalizedDescription && !questionHint && (
              <p className={cn(
                "text-[11px] leading-snug rounded-xl px-3 py-2 border",
                isOrdersStyle
                  ? "text-slate-600 bg-slate-50 border-slate-200"
                  : "text-gray-500 bg-slate-50 border-slate-100"
              )}>
                {normalizedDescription}
              </p>
            )}
            {responsibleRoles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {responsibleRoles.map((role) => (
                  <span key={role} className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">
                    {OR_ROLE_LABELS[role] ?? role}
                  </span>
                ))}
              </div>
            )}
            {normalizedGuidance && (
              <div className={cn(
                "rounded-xl border px-3 py-2.5",
                isOrdersStyle
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Guía del auditor</p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed">{normalizedGuidance}</p>
              </div>
            )}
            {requiresCommentOnFail && (
              <p className="text-[11px] font-bold text-amber-700">Si marcás desvío, la observación pasa a ser obligatoria.</p>
            )}
          </div>
        </div>
      </div>

      <div className={cn(isOrdersStyle ? "grid grid-cols-3 gap-2" : "grid grid-cols-3 gap-2")}>
        <button
          onClick={() => onStatusToggle("pass")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 transition-all active:scale-95 px-2 py-3 min-h-[74px] sm:min-h-[64px]",
            item?.status === "pass"
              ? (isOrdersStyle ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-green-500 border-green-500 text-white shadow-lg shadow-green-100")
              : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" : "bg-white border-gray-100 text-gray-400 hover:border-green-200 hover:text-green-500")
          )}
        >
          <CheckCircle2 className={cn("h-5 w-5", item?.status === "pass" && "text-white")} />
          <span className="text-sm font-black uppercase tracking-[0.16em]">Si</span>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", item?.status === "pass" ? "text-white/80" : "text-inherit opacity-80")}>Cumple</span>
        </button>

        <button
          onClick={() => onStatusToggle("fail")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 transition-all active:scale-95 px-2 py-3 min-h-[74px] sm:min-h-[64px]",
            item?.status === "fail"
              ? (isOrdersStyle ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" : "bg-red-500 border-red-500 text-white shadow-lg shadow-red-100")
              : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-700" : "bg-white border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-500")
          )}
        >
          <XCircle className={cn("h-5 w-5", item?.status === "fail" && "text-white")} />
          <span className="text-sm font-black uppercase tracking-[0.16em]">No</span>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", item?.status === "fail" ? "text-white/80" : "text-inherit opacity-80")}>Desvío</span>
        </button>

        {allowsNa ? (
          <button
            onClick={() => onStatusToggle("na")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 transition-all active:scale-95 px-2 py-3 min-h-[74px] sm:min-h-[64px]",
              item?.status === "na"
                ? (isOrdersStyle ? "bg-slate-700 border-slate-700 text-white shadow-lg shadow-slate-200" : "bg-gray-800 border-gray-800 text-white shadow-lg shadow-gray-200")
                : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600")
            )}
          >
            <MinusCircle className={cn("h-5 w-5", item?.status === "na" && "text-white")} />
            <span className="text-sm font-black uppercase tracking-[0.16em]">N/A</span>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", item?.status === "na" ? "text-white/80" : "text-inherit opacity-80")}>No aplica</span>
          </button>
        ) : (
          <div className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 px-2 py-3 min-h-[74px] sm:min-h-[64px] opacity-60",
            isOrdersStyle ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-gray-50 border-gray-200 text-gray-400"
          )}>
            <MinusCircle className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-[0.16em]">N/A</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Bloqueado</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelection}
      />

      <div className={cn("flex gap-2 pt-1", isOrdersStyle && "border-t border-slate-100 pt-3")}>
        <button
          onClick={() => setShowComment(!showComment)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-wider transition-all",
            item?.comment || showComment
              ? (isOrdersStyle ? "bg-slate-900 text-white ring-1 ring-slate-900" : "bg-blue-50 text-blue-600 ring-1 ring-blue-100")
              : (isOrdersStyle ? "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100")
          )}
        >
          <History className="w-3.5 h-3.5" />
          {item?.comment ? "Ver Observación" : requiresCommentOnFail ? "Agregar Evidencia" : "Agregar Nota"}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingPhoto}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-wider transition-all",
            isOrdersStyle
              ? "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
          )}
        >
          <Camera className="w-3.5 h-3.5" />
          {isProcessingPhoto ? "Procesando..." : item?.photoUrl ? "Cambiar Foto" : "Adjuntar Foto"}
        </button>
      </div>

      {item?.photoUrl && (
        <div className="space-y-2 rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
          <img src={item.photoUrl} alt="Evidencia del desvío" className="h-40 w-full rounded-xl object-cover" />
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 transition-all hover:border-slate-300"
            >
              Reemplazar
            </button>
            <button
              onClick={() => onPhotoUpdate(undefined)}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-600 transition-all hover:border-red-300"
              aria-label="Quitar foto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {(showComment || item?.comment) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <textarea
                value={item?.comment || ""}
                onChange={(e) => onCommentUpdate(e.target.value)}
                placeholder="Escribe aquí las observaciones para este ítem..."
                className={cn(
                  "w-full bg-gray-50 border-2 border-gray-100 rounded-[1.2rem] text-xs focus:ring-0 focus:border-blue-200 resize-none transition-all",
                  isOrdersStyle ? "p-3 h-20" : "p-3.5 h-22"
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}