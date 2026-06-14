import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { uploadWorkspaceFile } from "../../lib/api";
import { cardVariants } from "../../lib/animations";

export default function StageUploadCard({
  title,
  fields,
  uploadedFiles = {},
  onUploadChange,
  subjectId,
  subjectCode,
  user,
  onGenerate,
  generateLabel,
  isGenerating,
  canGenerate,
  isCompleted,
  children,
}) {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingKey, setUploadingKey] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const handleUpload = async (key, file) => {
    if (!file) {
      setUploadMessage("Please choose a file before uploading.");
      return;
    }
    if (!subjectId || !subjectCode || !user?.email) {
      setUploadMessage("Subject context is not ready. Please refresh and try again.");
      return;
    }

    setUploadingKey(key);
    setUploadMessage("");

    try {
      const response = await uploadWorkspaceFile(subjectId, subjectCode, key, file);
      const nextFiles = { ...uploadedFiles, [key]: true };
      onUploadChange?.(nextFiles);
      setUploadMessage(response.message || `${key} uploaded.`);
    } catch (error) {
      setUploadMessage(error.message || "Upload failed.");
    } finally {
      setUploadingKey("");
    }
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-red-100/80 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.65)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-red-950">
              <Upload size={18} />
              {title}
              <AnimatePresence>
                {isCompleted && (
                  <motion.span
                    className="ml-2 flex items-center gap-1 text-xs text-emerald-700"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Completed
                  </motion.span>
                )}
              </AnimatePresence>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-4">
            {fields.map((item, idx) => {
              const isDone = !!uploadedFiles[item.key];
              const isUploading = uploadingKey === item.key;

              return (
                <motion.div
                  key={item.key}
                  className={`upload-row grid gap-3 rounded-xl border p-4 shadow-sm md:grid-cols-[1.4fr_2fr_auto] md:items-center ${
                    isDone ? "uploaded border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"
                  }`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  <p className="text-sm font-medium text-slate-700">
                    Upload {item.label}
                  </p>

                  <Input
                    type="file"
                    className="input-focus-motion bg-slate-50 text-sm"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSelectedFiles((prev) => ({ ...prev, [item.key]: file }));
                      if (file) {
                        handleUpload(item.key, file);
                      }
                    }}
                  />

                  <AnimatePresence mode="wait">
                    {isUploading ? (
                      <motion.span
                        key="uploading"
                        className="flex items-center gap-2 text-xs font-semibold text-blue-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 size={13} className="spinner" />
                        Uploading...
                      </motion.span>
                    ) : isDone ? (
                      <motion.span
                        key="done"
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <CheckCircle2 size={13} />
                        Uploaded
                      </motion.span>
                    ) : (
                      <motion.span
                        key="pending"
                        className="text-xs font-medium text-slate-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        Not Uploaded
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {children}

          {generateLabel && onGenerate && (
            <div className="flex items-center gap-3 pt-3 pb-1 border-t border-slate-100">
              <Button
                className="btn-press min-w-[220px]"
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating}
                isLoading={isGenerating}
              >
                {isGenerating ? "Generating..." : generateLabel}
              </Button>
            </div>
          )}

          {uploadMessage ? <p className="text-xs text-slate-600">{uploadMessage}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
